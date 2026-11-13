import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Copy, Link2, Loader2, Megaphone, Pencil, Search, Trash2, X } from 'lucide-react'
import PropertyPicker from './messenger/PropertyPicker'
import { useConversations, useMessengerApi, useMessengerPages, usePropertyOptions } from './messenger/useMessengerData'
import { SOURCE_LABELS, facebookSourceLink, parseFacebookSource } from './messenger/facebookSource'

const BADGE = {
  ad: 'bg-violet-50 text-violet-800 ring-violet-200',
  post: 'bg-sky-50 text-sky-800 ring-sky-200',
  ref: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
}

function backfillText(backfill) {
  if (!backfill) return ''
  if (backfill.status === 'completed') return `ผูกแชทเก่า ${backfill.updated || 0} · ข้าม ${backfill.skipped || 0}`
  if (backfill.status === 'failed') return 'ผูกแชทเก่าไม่สำเร็จ'
  return `กำลังผูกแชทเก่า… ${backfill.updated || 0}`
}

function SourceBadge({ kind }) {
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${BADGE[kind] || ''}`}>{SOURCE_LABELS[kind] || kind}</span>
}

export default function AdMappingsPage() {
  const callApi = useMessengerApi()
  const { items: pages, loading: pagesLoading } = useMessengerPages()
  const { items: conversations } = useConversations()
  const options = usePropertyOptions()

  const [pageId, setPageId] = useState('')
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [filter, setFilter] = useState('')
  const [confirmDelete, setConfirmDelete] = useState('')
  const [copied, setCopied] = useState(false)

  // Form
  const [input, setInput] = useState('')
  const [kindHint, setKindHint] = useState('ad')
  const [code, setCode] = useState('')
  const [editingId, setEditingId] = useState('')

  const activePageId = pageId || pages[0]?.id || ''
  const parsed = useMemo(() => parseFacebookSource(input, { pageId: activePageId, kindHint }), [input, activePageId, kindHint])
  const chosen = options.find(option => option.code === code)
  const optionByCode = useMemo(() => new Map(options.map(option => [option.code, option])), [options])
  const bareNumber = /^\d+$/.test(input.trim())
  const otherPage = parsed?.linkPageId && parsed.linkPageId !== activePageId ? pages.find(page => page.id === parsed.linkPageId) : null
  // A page on the new Pages experience shows a different (profile) ID in facebook.com links than
  // the page ID the system connected with. A link ID that matches no connected page is treated
  // as the selected page; the server stores it under the selected page and matches both IDs.
  const profileId = parsed?.linkPageId && parsed.linkPageId !== activePageId && !otherPage ? parsed.linkPageId : ''
  const activePageName = pages.find(page => page.id === activePageId)?.name || activePageId

  const load = useCallback(async (id, { quiet } = {}) => {
    if (!id) return
    if (!quiet) setLoading(true)
    try {
      const result = await callApi({ action: 'listPropertySources', pageId: id })
      setSources(result.sources || [])
      if (!quiet) setError('')
    } catch (failure) {
      setError(failure.message)
    } finally {
      if (!quiet) setLoading(false)
    }
  }, [callApi])

  useEffect(() => { setSources([]); load(activePageId) }, [activePageId, load])

  const backfillPending = sources.some(item => ['queued', 'running'].includes(item.backfill?.status))
  useEffect(() => {
    if (!backfillPending) return undefined
    const timer = setInterval(() => load(activePageId, { quiet: true }), 5000)
    return () => clearInterval(timer)
  }, [backfillPending, activePageId, load])

  // Ad clicks that reached a chat but have no house yet, grouped by ad (or post).
  const sourceId = (kind, value) => `${kind}:${kind === 'post' ? String(value).split('_').pop() : value}`
  const mappedValues = useMemo(() => new Set(sources.flatMap(item => [item.value, ...(item.aliases || [])].map(value => sourceId(item.kind, value)))), [sources])
  const unmapped = useMemo(() => {
    const groups = new Map()
    for (const conversation of conversations) {
      const referral = conversation.facebookReferral
      if (conversation.pageId !== activePageId || !referral) continue
      if (!['unmapped', 'unavailable'].includes(referral.status)) continue
      const kind = referral.adId ? 'ad' : referral.postId ? 'post' : referral.ref ? 'ref' : ''
      const value = referral.adId || referral.postId || referral.ref
      if (!kind || mappedValues.has(sourceId(kind, value))) continue
      const key = `${kind}:${value}`
      const group = groups.get(key) || { key, kind, value, title: referral.title, postId: referral.postId, status: referral.status, propertyCode: referral.propertyCode, count: 0 }
      group.count += 1
      if (!group.title && referral.title) group.title = referral.title
      if (!group.postId && referral.postId) group.postId = referral.postId
      groups.set(key, group)
    }
    return [...groups.values()].sort((a, b) => b.count - a.count)
  }, [conversations, activePageId, mappedValues])

  const visible = useMemo(() => {
    const query = filter.trim().toLowerCase()
    const list = [...sources].sort((a, b) => (b.updatedAt?.seconds || b.updatedAt?._seconds || 0) - (a.updatedAt?.seconds || a.updatedAt?._seconds || 0))
    if (!query) return list
    return list.filter(item => [item.value, item.propertyCode, item.propertyTitle, SOURCE_LABELS[item.kind]]
      .some(field => String(field || '').toLowerCase().includes(query)))
  }, [sources, filter])

  function resetForm() {
    setInput('')
    setCode('')
    setEditingId('')
    setKindHint('ad')
  }

  async function run(operation) {
    setBusy(true)
    setError('')
    setNotice('')
    try { await operation() } catch (failure) { setError(failure.message) } finally { setBusy(false) }
  }

  async function save(event) {
    event.preventDefault()
    if (!parsed || parsed.error || !chosen || otherPage) return
    await run(async () => {
      const editing = sources.find(item => item.id === editingId)
      // Editing to a different ad/post moves the mapping: drop the old one.
      if (editing && (editing.kind !== parsed.kind || editing.value !== parsed.value)) {
        await callApi({ action: 'savePropertySource', pageId: activePageId, kind: editing.kind, value: editing.value, propertyCode: '' })
      }
      await callApi({ action: 'savePropertySource', pageId: activePageId, kind: parsed.kind, value: parsed.value, propertyCode: chosen.code })
      await load(activePageId, { quiet: true })
      setNotice(`ผูก${SOURCE_LABELS[parsed.kind]} ${parsed.kind === 'post' && parsed.postId ? parsed.postId : parsed.value} กับ ${chosen.code} แล้ว กำลังผูกบ้านให้แชทเก่าที่มาจากต้นทางนี้ (ไม่ส่งข้อความหาลูกค้า)`)
      resetForm()
    })
  }

  async function remove(item) {
    await run(async () => {
      await callApi({ action: 'savePropertySource', pageId: activePageId, kind: item.kind, value: item.value, propertyCode: '' })
      setSources(previous => previous.filter(entry => entry.id !== item.id))
      setConfirmDelete('')
      if (editingId === item.id) resetForm()
      setNotice('ลบการจับคู่แล้ว บ้านที่ตั้งไว้ในแชทเดิมยังอยู่')
    })
  }

  function edit(item) {
    setEditingId(item.id)
    setInput(item.value)
    setKindHint(item.kind === 'post' ? 'post' : 'ad')
    setCode(item.propertyCode)
    setNotice('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function prefill(group) {
    resetForm()
    setInput(group.value)
    setKindHint(group.kind === 'post' ? 'post' : 'ad')
    if (group.propertyCode && optionByCode.has(group.propertyCode)) setCode(group.propertyCode)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const mmeLink = chosen && activePageId ? `https://m.me/${activePageId}?ref=property_${chosen.code}` : ''
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(mmeLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard blocked; the link is visible to select */ }
  }

  const canSave = parsed && !parsed.error && chosen && !otherPage && !busy

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 text-sm sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <Megaphone className="h-5 w-5 text-blue-700" aria-hidden="true" /> ผูกโฆษณากับบ้าน
          </h1>
          <p className="mt-1 text-slate-500">ลูกค้าที่กดโฆษณาหรือโพสต์ที่ผูกไว้แล้วทักแชท จะขึ้นบ้านหลังนั้นในแชทอัตโนมัติ</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2">
            <span className="text-slate-600">เพจ</span>
            <select value={activePageId} onChange={event => { setPageId(event.target.value); resetForm() }} disabled={busy || pagesLoading}
              className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-1.5">
              {pages.length === 0 && <option value="">{pagesLoading ? 'กำลังโหลด…' : 'ยังไม่เชื่อมเพจ'}</option>}
              {pages.map(page => <option key={page.id} value={page.id}>{page.name || page.id}</option>)}
            </select>
          </label>
          <button type="button" disabled={busy || !activePageId} onClick={() => run(async () => {
            await callApi({ action: 'enableReferralTracking', pageId: activePageId })
            setNotice('เปิดรับต้นทางจาก Facebook ให้เพจนี้แล้ว')
          })} title="กดครั้งเดียวสำหรับเพจที่เชื่อมไว้ก่อนมีระบบนี้"
            className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            เปิดรับต้นทางให้เพจนี้
          </button>
        </div>
      </header>

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">{notice}</p>}

      <form onSubmit={save} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900">{editingId ? 'แก้ไขการจับคู่' : 'เพิ่มการจับคู่'}</h2>
          {editingId && <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800"><X className="h-4 w-4" /> ยกเลิก</button>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="source-input" className="block font-medium text-slate-700">1. วางรหัสโฆษณา หรือลิงก์โพสต์</label>
          <input id="source-input" value={input} onChange={event => setInput(event.target.value)} disabled={busy} autoComplete="off"
            placeholder="เช่น 120211234567890 หรือลิงก์จากหน้า ข้อมูลเชิงลึกของโพสต์"
            className="min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-100" />
          {bareNumber && (
            <div className="flex flex-wrap items-center gap-3 text-slate-600" role="radiogroup" aria-label="ตัวเลขนี้คือ">
              <span>ตัวเลขนี้คือ</span>
              {[['ad', 'รหัสโฆษณา (Ad ID)'], ['post', 'รหัสโพสต์']].map(([value, label]) => (
                <label key={value} className="inline-flex items-center gap-1.5">
                  <input type="radio" name="kind-hint" value={value} checked={kindHint === value} onChange={() => setKindHint(value)} /> {label}
                </label>
              ))}
            </div>
          )}
          {parsed && (parsed.error
            ? <p className="text-amber-800">{parsed.error}</p>
            : (
              <p className="flex flex-wrap items-center gap-2 text-slate-700">
                <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                <SourceBadge kind={parsed.kind} />
                <code className="break-all rounded bg-slate-100 px-1.5 py-0.5 text-xs">{parsed.value}</code>
              </p>
            ))}
          {otherPage && (
            <p className="text-amber-800">
              โพสต์นี้เป็นของเพจ “{otherPage.name}”{' '}
              <button type="button" onClick={() => setPageId(otherPage.id)} className="font-medium text-blue-700 underline">สลับไปเพจนั้น</button>
            </p>
          )}
          {profileId && (
            <p className="text-slate-500">
              ลิงก์ใช้รหัสโปรไฟล์ของเพจ ({profileId}) ระบบจะผูกโพสต์นี้กับเพจ “{activePageName}” ที่เลือกอยู่ ถ้าโพสต์นี้ไม่ใช่ของเพจนี้ ให้เปลี่ยนเพจด้านบนก่อน
            </p>
          )}
          {!input && (
            <details className="text-slate-500">
              <summary className="cursor-pointer select-none">หารหัสได้จากไหน</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li><b>รหัสโฆษณา</b> (แนะนำ): ตัวจัดการโฆษณา › แท็บโฆษณา › เปิดคอลัมน์ “รหัสโฆษณา” หรือคัดลอกลิงก์ตอนเลือกโฆษณาไว้ตัวเดียว</li>
                <li><b>โพสต์</b>: เปิดโพสต์ › “ดูข้อมูลเชิงลึก” › คัดลอกลิงก์จากแถบที่อยู่ทั้งเส้น (ลิงก์แชร์และลิงก์ pfbid ใช้ไม่ได้)</li>
                <li>ถ้าโพสต์เดียวใช้ในหลายโฆษณาแต่ต้องแยกบ้าน ให้ผูกด้วยรหัสโฆษณา ระบบเช็กโฆษณาก่อนโพสต์</li>
              </ul>
            </details>
          )}
        </div>

        <div className="space-y-1.5">
          <span className="block font-medium text-slate-700">2. เลือกบ้าน</span>
          <PropertyPicker options={options} value={code} onChange={setCode} onPick={setCode} disabled={busy} />
          {chosen && <p className="text-slate-600"><b>{chosen.code}</b>{chosen.title ? ` · ${chosen.title}` : ''}</p>}
          {code && !chosen && <p className="text-slate-500">พิมพ์แล้วเลือกจากรายการ (แสดงเฉพาะบ้านที่ยังว่าง)</p>}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={!canSave}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} {editingId ? 'บันทึกการแก้ไข' : 'บันทึกการจับคู่'}
          </button>
          {mmeLink && (
            <span className="flex min-w-0 flex-1 items-center gap-2 text-slate-500">
              <Link2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="shrink-0">ลิงก์ทักแชทของบ้านนี้:</span>
              <code className="min-w-0 truncate text-xs">{mmeLink}</code>
              <button type="button" onClick={copyLink} className="shrink-0 rounded p-1 hover:bg-slate-100" aria-label="คัดลอกลิงก์">
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              </button>
            </span>
          )}
        </div>
      </form>

      {unmapped.length > 0 && (
        <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="font-semibold text-amber-900">ลูกค้าทักจากโฆษณาที่ยังไม่ผูกบ้าน</h2>
          <p className="text-amber-800">ผูกครั้งเดียว แชททั้งหมดจากโฆษณานั้นจะได้บ้านทันที</p>
          <ul className="divide-y divide-amber-200">
            {unmapped.map(group => {
              const link = facebookSourceLink(group, activePageId)
              return (
                <li key={group.key} className="flex flex-wrap items-center gap-2 py-2">
                  <SourceBadge kind={group.kind} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900">{group.title || 'ไม่มีชื่อโฆษณา'}</span>
                    <span className="block break-all font-mono text-xs text-slate-500">{group.value}</span>
                    {group.status === 'unavailable' && <span className="block text-xs text-amber-800">บ้านที่ผูกไว้ ({group.propertyCode}) ขายแล้วหรือไม่พบ</span>}
                  </span>
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs text-slate-700 ring-1 ring-amber-200">{group.count} แชท</span>
                  {link && (
                    <a href={link.href} target="_blank" rel="noopener noreferrer"
                      className="inline-flex min-h-10 shrink-0 items-center rounded-lg px-3 py-1.5 font-medium text-blue-700 underline hover:bg-white">
                      {link.label}
                    </a>
                  )}
                  <button type="button" onClick={() => prefill(group)} className="min-h-10 shrink-0 rounded-lg bg-white px-3 py-1.5 font-medium text-blue-700 ring-1 ring-blue-200 hover:bg-blue-50">ผูกบ้าน</button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900">
            ที่ผูกไว้แล้ว <span className="font-normal text-slate-500">{sources.length} / 200</span>
          </h2>
          <label className="relative block w-full sm:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <span className="sr-only">ค้นหา</span>
            <input value={filter} onChange={event => setFilter(event.target.value)} placeholder="ค้นหารหัสทรัพย์ ชื่อบ้าน หรือรหัสโฆษณา"
              className="min-h-10 w-full rounded-lg border border-slate-300 py-1.5 pl-8 pr-3" />
          </label>
        </div>

        {loading ? (
          <p role="status" className="flex items-center gap-2 py-6 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลด…</p>
        ) : visible.length === 0 ? (
          <p className="py-6 text-center text-slate-500">{sources.length ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีการจับคู่สำหรับเพจนี้'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead className="border-b border-slate-200 text-xs text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">ต้นทาง</th>
                  <th className="py-2 pr-3 font-medium">บ้าน</th>
                  <th className="py-2 pr-3 font-medium">แชทเก่า</th>
                  <th className="py-2 font-medium"><span className="sr-only">จัดการ</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map(item => {
                  const stillAvailable = optionByCode.has(item.propertyCode)
                  return (
                    <tr key={item.id} className={editingId === item.id ? 'bg-blue-50' : ''}>
                      <td className="py-2.5 pr-3 align-top">
                        <div className="flex items-center gap-2"><SourceBadge kind={item.kind} /></div>
                        <code className="mt-1 block break-all text-xs text-slate-600">{item.value}</code>
                      </td>
                      <td className="py-2.5 pr-3 align-top">
                        <span className="font-semibold text-slate-900">{item.propertyCode}</span>
                        {item.propertyTitle && <span className="block text-slate-600">{item.propertyTitle}</span>}
                        {!stillAvailable && <span className="mt-0.5 block text-xs font-medium text-amber-700">บ้านนี้ไม่ว่างแล้ว ลูกค้าใหม่จะรอทีมเลือกบ้าน</span>}
                      </td>
                      <td className="py-2.5 pr-3 align-top text-xs text-slate-500">{backfillText(item.backfill)}</td>
                      <td className="py-2.5 align-top">
                        <div className="flex justify-end gap-1">
                          {confirmDelete === item.id ? (
                            <>
                              <button type="button" disabled={busy} onClick={() => remove(item)} className="min-h-9 rounded-lg bg-red-600 px-3 text-white hover:bg-red-700 disabled:opacity-50">ยืนยันลบ</button>
                              <button type="button" onClick={() => setConfirmDelete('')} className="min-h-9 rounded-lg px-3 text-slate-600 hover:bg-slate-100">ยกเลิก</button>
                            </>
                          ) : (
                            <>
                              <button type="button" disabled={busy} onClick={() => edit(item)} aria-label={`แก้ไข ${item.value}`} className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50"><Pencil className="h-4 w-4" /></button>
                              <button type="button" disabled={busy} onClick={() => setConfirmDelete(item.id)} aria-label={`ลบ ${item.value}`} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
