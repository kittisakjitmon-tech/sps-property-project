import { useId, useState } from 'react'
import { Check, Loader2, Mail, Phone, RefreshCw, X } from 'lucide-react'
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

const CREDIT_ISSUE = { none: 'ไม่เคยค้างชำระ', some: 'เคยมีประวัติค้างชำระ', unknown: 'ไม่แน่ใจ' }
const baht = value => (typeof value === 'number' ? `${value.toLocaleString('th-TH')} บาท` : '')

// What the customer told the AI about their finances, for the loan team. Read-only.
function CreditProfile({ profile, loan }) {
  const rows = [
    ['อายุ', profile?.age ? `${profile.age} ปี` : ''],
    ['อาชีพ', profile?.occupation || ''],
    ['อายุงาน', profile?.employmentYears != null ? `${profile.employmentYears} ปี` : ''],
    ['รายได้ต่อเดือน', baht(profile?.monthlyIncome)],
    ['ภาระผ่อนหนี้ต่อเดือน', baht(profile?.monthlyDebt)],
    ['เงินดาวน์', baht(profile?.downPayment)],
    ['วงเงินที่ต้องการ', baht(profile?.wantedLoan)],
    ['ประวัติค้างชำระ', CREDIT_ISSUE[profile?.creditIssue] || ''],
    ['ผู้กู้ร่วม', profile?.coBorrower === true ? 'มี' : profile?.coBorrower === false ? 'กู้คนเดียว' : ''],
    ['หมายเหตุ', profile?.note || ''],
  ].filter(([, value]) => value)
  if (!rows.length && !loan?.monthlyPayment) return null
  return (
    <section className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs" aria-label="ข้อมูลเช็กเครดิตเบื้องต้น">
      <h3 className="font-semibold text-indigo-900">ข้อมูลเช็กเครดิตเบื้องต้น (ลูกค้าบอกใน AI)</h3>
      {loan?.monthlyPayment ? (
        <p className="mt-1 text-indigo-800">
          ประเมินค่างวดเบื้องต้น ≈ {baht(loan.monthlyPayment)}/เดือน
          {loan.verdict === 'likely' ? ' · น่าจะพอเป็นไปได้' : loan.needsTeam ? ' · รอทีมงานตรวจต่อ' : ''}
        </p>
      ) : null}
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-medium text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[11px] text-slate-500">เป็นข้อมูลที่ลูกค้าบอกเอง ยังไม่ได้ตรวจสอบกับเอกสารหรือเครดิตบูโร</p>
    </section>
  )
}

// What the AI noticed in the documents the customer sent, for the loan team. Read-only; numbers
// that identify a person are already masked. The files themselves are in the chat.
function DocumentReview({ review }) {
  const documents = Array.isArray(review?.documents) ? review.documents : []
  const missing = Array.isArray(review?.missing) ? review.missing : []
  if (!documents.length && !missing.length && !review?.note) return null
  return (
    <section className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-xs" aria-label="เอกสารที่ลูกค้าส่ง">
      <h3 className="font-semibold text-amber-900">เอกสารที่ลูกค้าส่ง (AI อ่านเบื้องต้น)</h3>
      {documents.length > 0 && (
        <ul className="mt-2 space-y-2">
          {documents.map(item => (
            <li key={item.type} className="rounded-lg bg-white/70 p-2">
              <p className="font-medium text-slate-800">
                {item.type}
                {item.readable === false && <span className="ml-1 font-normal text-red-700">· อ่านไม่ออก</span>}
              </p>
              {item.summary && <p className="text-slate-600">{item.summary}</p>}
              {(item.issues || []).map(issue => (
                <p key={issue} className="text-amber-800">⚠ {issue}</p>
              ))}
            </li>
          ))}
        </ul>
      )}
      {missing.length > 0 && (
        <p className="mt-2 text-slate-700"><span className="font-medium">ยังขาด:</span> {missing.join(', ')}</p>
      )}
      {review?.note && <p className="mt-1 text-slate-600">{review.note}</p>}
      <p className="mt-2 text-[11px] text-slate-500">AI อ่านจากไฟล์ที่ส่งมา ไม่ได้ยืนยันว่าเอกสารจริง ทีมงานต้องตรวจเอกสารต้นฉบับอีกครั้ง</p>
    </section>
  )
}

export default function ContactPanel({ conversation, onClose, callApi }) {
  const formId = useId()
  const [form, setForm] = useState(() => emptyForm(conversation.contact))
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
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
              <p className="font-medium">ข้อมูลโปรไฟล์ Facebook ยังไม่ครบ</p>
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

        <CreditProfile profile={conversation.creditProfile} loan={conversation.loanEstimate} />
        <DocumentReview review={conversation.documentReview} />

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
      </div>
    </div>
  )
}
