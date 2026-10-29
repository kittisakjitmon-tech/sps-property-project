import test from 'node:test'
import assert from 'node:assert/strict'
import { agentProperty, filterAgentProperties } from './agentProperties.js'
import { countPropertyStatuses } from '../../lib/propertyManagement.js'

test('agent catalogue excludes drafts, hidden and unpublished stock including conflicting legacy status',()=> {
 for(const source of [{status:'pending'}, {availability:'available',status:'รออนุมัติ'}, {status:'unavailable'}, {published:false}, {hidden:true}, {deleted:true}]) assert.equal(agentProperty(source),null)
 for(const status of ['available','reserved','sold']) assert.equal(agentProperty({status}).status,status)
})
test('public display object is an allowlist without customer, owner contacts, commission or project fields',()=> {
 const source={id:'home',displayId:'SPS-TH-2CLASS-411',status:'available',project:'ลิเบอร์ตัน',title:'บ้าน โครงการลิเบอร์ตัน บ้านเก่า',description:'ของแถมจากลิเบอร์ตัน',commissionRate:3,agentContact:{name:'internal',phone:'secret'},createdBy:'owner',customers:['private'],notes:'internal',images:['https://example.com/photo.jpg','javascript:alert(1)'],location:{province:'ชลบุรี',district:'พานทอง',subDistrict:'บ้านเก่า',private:'secret'},price:2050000,area:74}
 const property=agentProperty(source)
 for(const key of ['commissionRate','agentContact','createdBy','customers','notes','project']) assert.equal(property[key],undefined)
 assert.equal(property.location.private,undefined);assert.equal(property.title,'บ้าน บ้านเก่า');assert.ok(!property.description.includes('ลิเบอร์ตัน'))
 assert.deepEqual(property.images,['https://example.com/photo.jpg']);assert.equal(property.area,74)
})
test('search, budget, status and sorting affect results without changing catalogue counts',()=> {
 const properties=[agentProperty({title:'บ้าน A',displayId:'001',status:'available',price:100,type:'house'}),agentProperty({title:'บ้าน B',displayId:'002',status:'reserved',price:200,type:'house'})]
 const filters={search:'002',type:'',status:'reserved',deal:'',condition:'',min:'150',max:'250',sort:'price-asc'}
 assert.equal(filterAgentProperties(properties,filters,t=>t)[0].displayId,'002')
 assert.deepEqual(countPropertyStatuses(properties),{available:1,reserved:1})
})
