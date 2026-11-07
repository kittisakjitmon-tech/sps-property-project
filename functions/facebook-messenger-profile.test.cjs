const { test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const Module = require('node:module')
const DELETE = Symbol('delete')
let rows, requests, respond
const doc = path => ({
  async get() { const value=rows.get(path);return {exists:!!value,data:()=>value,get:key=>value?.[key]} },
  async set(value) { const data={...rows.get(path)};for(const [key,item]of Object.entries(value)){if(item===DELETE)delete data[key];else data[key]=item}rows.set(path,data) },
})
const firestore = () => ({collection:name=>({doc:id=>doc(`${name}/${id}`)})})
firestore.FieldValue={serverTimestamp:()=>({toMillis:()=>Date.now()}),delete:()=>DELETE}
const get = async (url,config) => {requests.push({url,params:config?.params});return respond(url,config)}
const original=Module._load
Module._load=function(name){
  if(name==='firebase-admin')return {firestore,storage:()=>({bucket:()=>({name:'test',file:()=>({save:async()=>{}})})})}
  if(name==='axios')return {get}
  return original.apply(this,arguments)
}
const {_private:{adminActions}}=require('./facebook-messenger')
Module._load=original
const conv=()=>rows.get('messenger_conversations/c1')
const inaccessible=()=>Object.assign(new Error('Profile not accessible'),{response:{status:400,data:{error:{code:100,error_subcode:33,message:'Profile unavailable'}}}})
beforeEach(()=>{
 rows=new Map([['messenger_conversations/c1',{pageId:'P1',participantId:'U1',displayName:'ผู้ใช้ Facebook · U1'}],['messenger_page_tokens/P1',{accessToken:'PAGE_TOKEN'}]])
 requests=[]
 respond=async url=>{
  if(url.endsWith('/debug_token'))return {data:{data:{is_valid:true,type:'PAGE',profile_id:'P1',scopes:['pages_messaging']}}}
  if(url.endsWith('/conversations'))return {data:{data:[{participants:{data:[{id:'P1',name:'Page name'},{id:'U1',name:'สมชาย ทดสอบ'}]}}]}}
  throw inaccessible()
 }
})

test('recovers the exact customer name from conversation participants when the profile API fails',async()=>{
 const result=await adminActions.refreshProfile({conversationId:'c1'})
 assert.equal(conv().displayName,'สมชาย ทดสอบ')
 assert.equal(conv().profileNameSource,'conversation-participants')
 assert.equal(result.partial,true)
 assert.match(conv().profileError,/รูป/)
 assert.equal(requests.find(r=>r.url.endsWith('/conversations')).params.user_id,'U1')
})

test('does not use the Page or another participant name when the customer is absent',async()=>{
 const base=respond;respond=async(url,config)=>url.endsWith('/conversations')?{data:{data:[{participants:{data:[{id:'P1',name:'Page name'},{id:'OTHER',name:'Other person'}]}}]}}:base(url,config)
 await assert.rejects(adminActions.refreshProfile({conversationId:'c1'}))
 assert.equal(conv().displayName,'ผู้ใช้ Facebook · U1')
})

test('a complete primary profile saves its name and avatar and needs no fallback',async()=>{
 respond=async url=>url.endsWith('/U1')?{data:{first_name:'สมชาย',last_name:'จริง',profile_pic:'https://cdn.example/avatar.jpg'}}:{data:Buffer.from('image'),headers:{'content-type':'image/jpeg'}}
 const result=await adminActions.refreshProfile({conversationId:'c1'})
 assert.equal(conv().displayName,'สมชาย จริง')
 assert.match(conv().profilePicUrl,/firebasestorage.googleapis.com/)
 assert.equal(conv().profileError,undefined)
 assert.equal(result.partial,false)
 assert.equal(requests.some(r=>r.url.endsWith('/conversations')),false)
})

test('a name-only fallback preserves an existing avatar',async()=>{
 rows.set('messenger_conversations/c1',{...conv(),profilePicUrl:'https://existing.example/avatar.jpg'})
 await adminActions.refreshProfile({conversationId:'c1'})
 assert.equal(conv().profilePicUrl,'https://existing.example/avatar.jpg')
})

test('a primary name with no photo is reported as partial rather than a full profile success',async()=>{
 respond=async()=>({data:{first_name:'สมชาย',last_name:'จริง'}})
 const result=await adminActions.refreshProfile({conversationId:'c1'})
 assert.equal(result.partial,true)
 assert.match(conv().profileError,/รูป/)
})

test('a previously failed profile is retried after five minutes instead of being hidden for a full day',async()=>{
 rows.set('messenger_conversations/c1',{...conv(),profileError:'No photo yet',profileFetchedAt:{toMillis:()=>Date.now()-10*60*1000}})
 const {refreshCustomerProfile}=require('./facebook-messenger')._private
 await refreshCustomerProfile('c1')
 assert.equal(conv().displayName,'สมชาย ทดสอบ')
 assert.ok(requests.length>0)
})
