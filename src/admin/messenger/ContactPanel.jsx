import { useId, useState } from 'react'
import { Check, Loader2, Mail, Phone, RefreshCw, Trash2, X } from 'lucide-react'
import Avatar from './Avatar'
import { customerName, formatDateTime } from './messengerUtils'

const FIELDS = [
  { key: 'name', label: 'ชื่อลูกค้า (ที่ใช้เรียก)', type: 'text', autoComplete: 'off' },
  { key: 'phone', label: 'เบอร์โทร', type: 'tel', autoComplete: 'off' },
  { key: 'email', label: 'อีเมล', type: 'email', autoComplete: 'off' },
  { key: 'lineId', label: 'LINE ID', type: 'text', autoComplete: 'off' },
  { key: 'interest', label: 'ทรัพย์ที่สนใจ / งบประมาณ', type: 'text', autoComplete: 'off' },
]

function emptyForm(contact = {}) {
  return {
    name: contact.name || '',
    phone: contact.phone || '',
    email: contact.email || '',
    lineId: contact.lineId || '',
    interest: contact.interest || '',
    note: contact.note || '',
  }
}

function DetectedList({ icon, label, values, href, onUse }) {
  if (!values?.length) return null
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      {values.map(value => (
        <div key={value} className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm">
          {icon}
          <a href={href(value)} className="min-w-0 flex-1 truncate text-emerald-800 underline-offset-2 hover:underline">{value}</a>
          <button
            type="button"
            onClick={() => onUse(value)}
            className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
          >
            ใช้ค่านี้
          </button>
        </div>
      ))}
    </div>
  )
}

export default function ContactPanel({ conversation, onClose, onDeleted, callApi, canDelete }) {
  const formId = useId()
  const [form, setForm] = useState(() => emptyForm(conversation.contact))
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })

  function updateField(key, value) {
    setForm(current => ({ ...current, [key]: value }))
    setStatus({ type: '', message: '' })
  }

  async function handleSave(event) {
    event.preventDefault()
    setSaving(true)
    try {
      await callApi({ action: 'updateContact', conversationId: conversation.id, contact: form })
      setStatus({ type: 'success', message: 'บันทึกแล้ว' })
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    } finally {
      setSaving(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    try {
      await callApi({ action: 'refreshProfile', conversationId: conversation.id })
      setStatus({ type: 'success', message: 'อัปเดตโปรไฟล์จาก Facebook แล้ว' })
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
    } finally {
      setRefreshing(false)
    }
  }

  async function handleDelete() {
    const name = customerName(conversation)
    const confirmed = window.confirm(
      `ลบแชทของ "${name}" ถาวร?\n\nข้อความ รูปภาพ และข้อมูลลูกค้าทั้งหมดในระบบจะถูกลบและกู้คืนไม่ได้ ` +
      '(ใช้เมื่อลูกค้าขอลบข้อมูลตาม PDPA) แชทในกล่องข้อความ Facebook ของเพจจะไม่ถูกลบ',
    )
    if (!confirmed) return
    setDeleting(true)
    try {
      await callApi({ action: 'deleteConversation', conversationId: conversation.id })
      onDeleted()
    } catch (error) {
      setStatus({ type: 'error', message: error.message })
      setDeleting(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">ข้อมูลลูกค้า</h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="ปิดข้อมูลลูกค้า"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <Avatar src={conversation.profilePicUrl} name={customerName(conversation)} size="lg" />
          <div>
            <p className="font-semibold text-slate-900">{conversation.displayName || 'ผู้ใช้ Facebook'}</p>
            <p className="text-xs text-slate-500">ทักผ่านเพจ {conversation.pageName || conversation.pageId}</p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            {refreshing ? 'กำลังอัปเดต…' : 'ดึงชื่อและรูปจาก Facebook'}
          </button>
          {conversation.profileError && (
            <div className="w-full rounded-lg bg-amber-50 px-3 py-2 text-left text-xs text-amber-800">
              <p className="font-medium">ยังดึงชื่อจาก Facebook ไม่ได้</p>
              <p className="mt-1 break-words font-mono text-[11px] text-amber-700">{conversation.profileError}</p>
            </div>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs">
          <div>
            <dt className="text-slate-500">ทักครั้งแรก</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{formatDateTime(conversation.createdAt)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">ทักล่าสุด</dt>
            <dd className="mt-0.5 font-medium text-slate-800">{formatDateTime(conversation.lastInboundAt)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-slate-500">Facebook ID (เฉพาะเพจนี้)</dt>
            <dd className="mt-0.5 break-all font-mono text-slate-800">{conversation.participantId}</dd>
          </div>
        </dl>

        <DetectedList
          icon={<Phone className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />}
          label="เบอร์โทรที่ลูกค้าพิมพ์มาในแชท"
          values={conversation.detectedPhones}
          href={value => `tel:${value}`}
          onUse={value => updateField('phone', value)}
        />
        <DetectedList
          icon={<Mail className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />}
          label="อีเมลที่ลูกค้าพิมพ์มาในแชท"
          values={conversation.detectedEmails}
          href={value => `mailto:${value}`}
          onUse={value => updateField('email', value)}
        />

        <form onSubmit={handleSave} className="space-y-3">
          {FIELDS.map(field => (
            <div key={field.key} className="space-y-1">
              <label htmlFor={`${formId}-${field.key}`} className="text-xs font-medium text-slate-600">{field.label}</label>
              <input
                id={`${formId}-${field.key}`}
                type={field.type}
                autoComplete={field.autoComplete}
                value={form[field.key]}
                onChange={event => updateField(field.key, event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-100"
              />
            </div>
          ))}
          <div className="space-y-1">
            <label htmlFor={`${formId}-note`} className="text-xs font-medium text-slate-600">โน้ตภายใน</label>
            <textarea
              id={`${formId}-note`}
              rows={4}
              value={form.note}
              onChange={event => updateField('note', event.target.value)}
              className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-100"
            />
          </div>

          {status.message && (
            <p className={`text-xs ${status.type === 'error' ? 'text-red-600' : 'text-emerald-600'}`} role="status">
              {status.type === 'success' && <Check className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />}
              {status.message}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {saving ? 'กำลังบันทึก…' : 'บันทึกข้อมูลลูกค้า'}
          </button>
        </form>

        {canDelete && (
          <div className="space-y-2 border-t border-slate-200 pt-4">
            <p className="text-xs text-slate-500">ลูกค้าขอลบข้อมูล (PDPA): ลบแชท รูป และข้อมูลทั้งหมดของลูกค้าคนนี้ออกจากระบบ</p>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Trash2 className="h-4 w-4" aria-hidden="true" />}
              {deleting ? 'กำลังลบ…' : 'ลบแชทและข้อมูลลูกค้านี้'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
