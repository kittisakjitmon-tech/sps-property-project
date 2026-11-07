import { useState } from 'react'
import { Copy, Link2, ShieldCheck } from 'lucide-react'
import { readCompletion, revokeCompletionLink } from './completionApi'
import { COMPLETION_LABELS, completionUrl } from './completionForm'

const BUTTON = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:opacity-50'

export default function PropertyCompletionLink({ onCreate, link, onLinkChange, disabled }) {
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [publishedId, setPublishedId] = useState('')
  const url = link ? completionUrl(window.location.origin, link.token) : ''

  async function create() {
    setWorking(true)
    setError('')
    setPublishedId('')
    try { onLinkChange(await onCreate()) }
    catch (err) { setError(err.message || 'สร้างลิงก์ไม่สำเร็จ กรุณาลองใหม่') }
    finally { setWorking(false) }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(url); setCopied(true) }
    catch { setError('คัดลอกอัตโนมัติไม่สำเร็จ เลือกและคัดลอกจากช่องลิงก์ได้') }
  }

  async function revoke() {
    setWorking(true)
    setError('')
    try { await revokeCompletionLink(link.token); onLinkChange(null); setCopied(false) }
    catch (err) { setError(err.message || 'ปิดลิงก์ไม่สำเร็จ กรุณาลองใหม่') }
    finally { setWorking(false) }
  }

  async function checkStatus() {
    setWorking(true)
    setError('')
    try {
      const result = await readCompletion(link.token)
      if (result.state === 'completed') setPublishedId(result.propertyId)
      else setError('ลิงก์ยังเปิดรับข้อมูลอยู่ หัวหน้ายังไม่ได้บันทึกข้อมูลครบ')
    } catch (err) { setError(err.message || 'ตรวจสถานะไม่สำเร็จ กรุณาลองใหม่') }
    finally { setWorking(false) }
  }

  return <section aria-labelledby="completion-link-title" className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5 sm:p-6">
    <div className="flex items-start gap-3">
      <Link2 className="mt-1 shrink-0 text-blue-900" size={23} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h2 id="completion-link-title" className="text-lg font-semibold text-blue-950">ขอข้อมูลบ้านจากหัวหน้า</h2>
        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-700">ส่งรูปและข้อมูลที่มีให้หัวหน้าเติมช่องที่ขาดผ่านลิงก์ เมื่อกรอกครบและกดบันทึก บ้านจะเผยแพร่ทันที</p>
        {!link && <button type="button" onClick={create} disabled={disabled || working} className={`${BUTTON} mt-4 bg-blue-900 text-white hover:bg-blue-800`}>
          <Link2 size={17} aria-hidden="true" />{working ? 'กำลังเตรียมรูปและสร้างลิงก์…' : 'สร้างลิงก์เติมข้อมูลที่ขาด'}
        </button>}
        {link && !publishedId && <div className="mt-4 space-y-3">
          <label htmlFor="property-completion-url" className="block text-sm font-medium text-blue-950">ลิงก์สำหรับส่งให้หัวหน้า</label>
          <input id="property-completion-url" type="text" value={url} readOnly onFocus={event => event.target.select()} className="min-h-12 w-full rounded-xl border border-blue-200 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:ring-4 focus:ring-blue-100" />
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copy} disabled={working} className={`${BUTTON} bg-blue-900 text-white hover:bg-blue-800`}><Copy size={17} aria-hidden="true" />{copied ? 'คัดลอกลิงก์แล้ว' : 'คัดลอกลิงก์'}</button>
            <a href={url} target="_blank" rel="noopener noreferrer" className={`${BUTTON} border border-blue-200 bg-white text-blue-900 hover:bg-blue-100`}>เปิดดูหน้ากรอก</a>
            <button type="button" onClick={checkStatus} disabled={working} className={`${BUTTON} text-blue-900 hover:bg-blue-100`}>ตรวจสถานะ</button>
            <button type="button" onClick={revoke} disabled={working} className={`${BUTTON} text-rose-700 hover:bg-rose-50`}>ปิดลิงก์เพื่อแก้ไขร่าง</button>
          </div>
          <p className="text-sm leading-7 text-slate-600">ลิงก์ใช้ข้อมูลและรูป ณ ตอนสร้าง เปิดได้ถึง {new Date(link.expiresAt).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', dateStyle: 'long' })} ผู้ที่มีลิงก์สามารถเติมข้อมูลและเผยแพร่บ้านได้</p>
          <p className="text-sm leading-7 text-slate-600">ช่องที่ส่งให้เติม ได้แก่ {(link.missingFields || []).map(field => COMPLETION_LABELS[field] || field).join(', ')}</p>
        </div>}
        {publishedId && <div role="status" className="mt-4 flex flex-wrap items-center gap-3 text-emerald-800"><ShieldCheck size={20} aria-hidden="true" /><p>หัวหน้าบันทึกและเผยแพร่บ้านแล้ว</p><a href={`/sps-internal-admin/properties/${publishedId}/edit`} className={`${BUTTON} bg-white text-blue-900 underline`}>เปิดรายการบ้าน</a></div>}
        {error && <p role="alert" className="mt-3 text-sm leading-7 text-rose-700">{error}</p>}
      </div>
    </div>
  </section>
}
