import { useId, useState } from 'react'
import { Loader2, Plus, Trash2, X } from 'lucide-react'
import Avatar from './Avatar'

export default function PageManager({ pages, onClose, callApi }) {
  const tokenId = useId()
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })

  async function handleAdd(event) {
    event.preventDefault()
    if (!token.trim()) return
    setBusy('add')
    setStatus({ type: '', message: '' })
    try {
      const result = await callApi({ action: 'addPage', pageAccessToken: token.trim() })
      setToken('')
      const warnings = result.warnings?.length ? `\n${result.warnings.map(item => `• ${item}`).join('\n')}` : ''
      setStatus({ type: warnings ? 'warning' : 'success', message: `เชื่อมเพจ "${result.page?.name}" แล้ว${warnings}` })
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    } finally {
      setBusy('')
    }
  }

  async function handleRemove(page) {
    if (!window.confirm(`เลิกเชื่อมเพจ "${page.name}"? ข้อความเก่าจะยังอยู่ แต่จะไม่มีข้อความใหม่เข้ามาและตอบกลับไม่ได้`)) return
    setBusy(page.id)
    setStatus({ type: '', message: '' })
    try {
      await callApi({ action: 'removePage', pageId: page.id })
      setStatus({ type: 'success', message: `เลิกเชื่อมเพจ "${page.name}" แล้ว` })
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby={`${tokenId}-title`}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id={`${tokenId}-title`} className="font-semibold text-slate-900">จัดการเพจ Facebook</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="ปิด">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-5">
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-slate-700">เพจที่เชื่อมอยู่ ({pages.length})</h3>
            {pages.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">ยังไม่มีเพจ ชื่อเพจจะขึ้นเองเมื่อมีข้อความแรกเข้ามา หรือเพิ่มด้วยโทเค็นด้านล่าง</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {pages.map(page => (
                  <li key={page.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar src={page.pictureUrl} name={page.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{page.name}</p>
                      <p className="font-mono text-xs text-slate-400">{page.id}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemove(page)}
                      disabled={Boolean(busy)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                      aria-label={`เลิกเชื่อมเพจ ${page.name}`}
                    >
                      {busy === page.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <form onSubmit={handleAdd} className="space-y-2">
            <label htmlFor={tokenId} className="text-sm font-medium text-slate-700">เพิ่มเพจใหม่</label>
            <ol className="list-decimal space-y-1 pl-5 text-xs leading-5 text-slate-500">
              <li>ที่ developers.facebook.com เปิดแอป &gt; Messenger from Meta &gt; การตั้งค่า Messenger API</li>
              <li>หัวข้อ “สร้างโทเค็นการเข้าถึง” กด “เพิ่มเพจ” เลือกเพจ แล้วกด “สร้างโทเค็น”</li>
              <li>คัดลอกโทเค็นมาวางด้านล่าง ระบบจะเชื่อม Webhook ของเพจให้อัตโนมัติ</li>
            </ol>
            <textarea
              id={tokenId}
              rows={3}
              value={token}
              onChange={event => setToken(event.target.value)}
              placeholder="EAA…"
              autoComplete="off"
              spellCheck={false}
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-100"
            />
            {status.message && (
              <p className={`whitespace-pre-line text-sm ${status.type === 'error' ? 'text-red-600' : status.type === 'warning' ? 'text-amber-700' : 'text-emerald-600'}`} role="status">{status.message}</p>
            )}
            <button
              type="submit"
              disabled={!token.trim() || Boolean(busy)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-40"
            >
              {busy === 'add' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {busy === 'add' ? 'กำลังเชื่อมเพจ…' : 'เชื่อมเพจ'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
