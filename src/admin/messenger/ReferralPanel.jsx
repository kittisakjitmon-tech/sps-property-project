import { useEffect, useId, useState } from 'react'
import { ChevronDown, Link2, Loader2, Trash2 } from 'lucide-react'
import PropertyPicker from './PropertyPicker'
import { useMessengerApi } from './useMessengerData'

const labels = { ad: 'รหัสโฆษณา', post: 'รหัสโพสต์', ref: 'รหัสลิงก์' }

export default function ReferralPanel({ conversation, options }) {
  const callApi = useMessengerApi()
  const formId = useId()
  const source = conversation.facebookReferral
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState(source?.adId ? 'ad' : source?.postId ? 'post' : source?.ref ? 'ref' : 'ad')
  const [value, setValue] = useState(source?.adId || source?.postId || source?.ref || '')
  const [code, setCode] = useState(conversation.currentPropertyCode || '')
  const [sources, setSources] = useState([])
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const chosen = options.find(option => option.code === code)
  const unresolved = source && ['unmapped', 'unavailable'].includes(source.status)
  const currentPage = Math.min(page, Math.floor(Math.max(0, sources.length - 1) / 20))
  const backfillPending = sources.some(item => ['queued', 'running'].includes(item.backfill?.status))

  useEffect(() => {
    if (!open) return undefined
    let active = true
    setLoading(true)
    callApi({ action: 'listPropertySources', pageId: conversation.pageId })
      .then(result => { if (active) { setSources(result.sources); setError('') } })
      .catch(failure => { if (active) setError(failure.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [open, callApi, conversation.pageId])

  useEffect(() => {
    if (!open || !backfillPending) return undefined
    let active = true
    const timer = setInterval(() => {
      callApi({ action: 'listPropertySources', pageId: conversation.pageId })
        .then(result => { if (active) setSources(result.sources) })
        .catch(failure => { if (active) setError(failure.message) })
    }, 5000)
    return () => { active = false; clearInterval(timer) }
  }, [open, backfillPending, callApi, conversation.pageId])

  async function run(operation) {
    setBusy(true)
    setError('')
    setNotice('')
    try { await operation() } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }

  async function save(event) {
    event.preventDefault()
    if (!chosen || !value.trim()) return
    await run(async () => {
      await callApi({ action: 'savePropertySource', pageId: conversation.pageId, kind, value: value.trim(), propertyCode: chosen.code })
      const result = await callApi({ action: 'listPropertySources', pageId: conversation.pageId })
      setSources(result.sources)
      setNotice('บันทึกแล้ว กำลังผูกบ้านให้แชทเก่าที่มีต้นทางตรงกัน รวมถึงแชทนี้หากเข้าเงื่อนไข โดยไม่ส่งข้อความย้อนหลังหาลูกค้า')
    })
  }

  return (
    <section className="border-t border-slate-100 px-4 py-2" aria-label="ต้นทางโฆษณาและบ้าน">
      <div className="flex flex-wrap items-center gap-2">
        <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className={`min-w-0 flex-1 break-words ${unresolved ? 'font-medium text-amber-800' : 'text-slate-600'}`}>
          {source
            ? `${source.adId || source.source === 'ADS' ? 'ทักจากโฆษณา' : 'ทักจากลิงก์ / โพสต์'}${source.title ? ` · ${source.title}` : ''} · ${source.status === 'matched' ? `ตั้งทรัพย์อัตโนมัติ ${source.propertyCode}` : source.status === 'manual' ? 'ทีมงานยืนยันบ้านแล้ว' : source.status === 'unavailable' ? 'บ้านไม่ว่างหรือไม่พบในระบบ บอทรอเลือกบ้าน' : 'ยังไม่ผูกกับบ้าน บอทรอเลือกบ้าน'}`
            : 'ยังไม่มีข้อมูลต้นทางจาก Facebook'}
        </span>
        <button type="button" onClick={() => setOpen(previous => !previous)} aria-expanded={open} className="inline-flex min-h-11 touch-manipulation items-center gap-1 rounded-lg px-2 py-1 font-medium text-blue-700 hover:bg-blue-50">
          ผูกโฆษณากับบ้าน <ChevronDown className={`h-3.5 w-3.5 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </div>
      {source && (
        <p className="mt-1 break-all text-slate-500">
          {[source.adId ? `โฆษณา: ${source.adId}` : '', source.postId ? `โพสต์: ${source.postId}` : '', source.ref ? `ลิงก์: ${source.ref}` : ''].filter(Boolean).join(' · ')}
        </p>
      )}
      {open && (
        <div className="mt-3 max-h-[50vh] space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-slate-600">ผูกครั้งเดียว ใช้กับแชทใหม่และแชทเก่าที่เก็บต้นทางเดียวกันไว้ รหัสโฆษณาดูได้ในตัวจัดการโฆษณา Facebook</p>
          <p className="text-slate-500">ข้ามแชทที่ทีมงานเลือกบ้านหรือกรอกรายละเอียดไว้แล้ว และแชทที่ไม่มีข้อมูลต้นทาง ไม่เปิดบอทที่พักไว้และไม่ส่งข้อความหาลูกค้าย้อนหลัง</p>
          <button type="button" disabled={busy} onClick={() => run(async () => {
            await callApi({ action: 'enableReferralTracking', pageId: conversation.pageId })
            setNotice('เปิดรับต้นทางจาก Facebook ให้เพจนี้แล้ว')
          })} className="min-h-11 touch-manipulation rounded-lg border border-blue-300 bg-white px-3 py-1.5 font-medium text-blue-800 disabled:opacity-50">
            เปิดรับต้นทางจาก Facebook ให้เพจนี้
          </button>
          <p className="text-slate-500">กดเปิดรับครั้งแรกสำหรับเพจที่เชื่อมไว้เดิม หากลูกค้าเห็นโพสต์แล้วเข้าเพจมาทักเอง อาจไม่มีข้อมูลระบุบ้าน</p>
          <form onSubmit={save} className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <label className="space-y-1" htmlFor={`${formId}-kind`}><span className="block">ประเภทต้นทาง</span>
                <select id={`${formId}-kind`} value={kind} onChange={event => { setKind(event.target.value); setValue('') }} disabled={busy} className="min-h-11 rounded-lg border border-slate-300 bg-white px-2 py-1.5">
                  {Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </label>
              <label className="min-w-0 flex-1 space-y-1" htmlFor={`${formId}-value`}><span className="block">{labels[kind]}</span>
                <input id={`${formId}-value`} required value={value} onChange={event => setValue(event.target.value)} maxLength={200} disabled={busy} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5" />
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <PropertyPicker options={options} value={code} onChange={setCode} onPick={setCode} disabled={busy} />
              <button type="submit" disabled={busy || !chosen || !value.trim()} className="inline-flex min-h-11 touch-manipulation items-center gap-1 rounded-lg bg-blue-700 px-3 py-1.5 font-medium text-white hover:bg-blue-800 disabled:opacity-50">
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />} บันทึกการจับคู่
              </button>
            </div>
          </form>
          <p className="break-all text-slate-500">ลิงก์แยกตามบ้าน: {`https://m.me/${conversation.pageId}?ref=property_${chosen?.code || 'รหัสทรัพย์'}`}</p>
          {error && <p role="alert" className="text-red-700">{error}</p>}
          {notice && <p role="status" className="text-emerald-700">{notice}</p>}
          {loading ? <p role="status">กำลังโหลดรายการจับคู่…</p> : sources.length > 0 && (
            <ul className="max-h-48 divide-y divide-slate-200 overflow-y-auto" aria-label="ต้นทางที่ผูกกับบ้านแล้ว">
              {sources.slice(currentPage * 20, (currentPage + 1) * 20).map(item => (
                <li key={item.id} className="flex items-center gap-2 py-2">
                  <button type="button" disabled={busy} onClick={() => { setKind(item.kind); setValue(item.value); setCode(item.propertyCode) }} className="min-h-11 min-w-0 flex-1 touch-manipulation break-words text-left text-blue-800 hover:underline disabled:opacity-50">
                    {labels[item.kind]} {item.value} → {item.propertyCode}{item.propertyTitle ? ` · ${item.propertyTitle}` : ''}
                    {item.backfill && <span className="mt-1 block text-slate-500">{item.backfill.status === 'completed'
                      ? `ผูกแชทเก่าแล้ว ${item.backfill.updated || 0} แชท · ข้าม ${item.backfill.skipped || 0} แชท`
                      : `กำลังผูกแชทเก่า… ผูกแล้ว ${item.backfill.updated || 0} แชท`}</span>}
                  </button>
                  <button type="button" disabled={busy} aria-label={`ลบการจับคู่ ${item.value}`} onClick={() => run(async () => {
                    await callApi({ action: 'savePropertySource', pageId: conversation.pageId, kind: item.kind, value: item.value, propertyCode: '' })
                    setSources(previous => previous.filter(entry => entry.id !== item.id))
                    setNotice('ลบการจับคู่แล้ว การเลือกบ้านในแชทเดิมยังคงอยู่')
                  })} className="min-h-11 min-w-11 shrink-0 touch-manipulation rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button>
                </li>
              ))}
            </ul>
          )}
          {sources.length > 20 && (
            <nav aria-label="หน้ารายการจับคู่" className="flex items-center justify-between gap-2">
              <button type="button" disabled={currentPage === 0 || busy} onClick={() => setPage(currentPage - 1)} className="min-h-11 rounded-lg px-2 text-blue-700 disabled:opacity-50">ก่อนหน้า</button>
              <span>หน้า {currentPage + 1} / {Math.ceil(sources.length / 20)}</span>
              <button type="button" disabled={(currentPage + 1) * 20 >= sources.length || busy} onClick={() => setPage(currentPage + 1)} className="min-h-11 rounded-lg px-2 text-blue-700 disabled:opacity-50">ถัดไป</button>
            </nav>
          )}
        </div>
      )}
    </section>
  )
}
