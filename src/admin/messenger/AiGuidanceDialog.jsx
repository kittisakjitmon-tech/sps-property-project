import { useId, useState } from 'react'
import { Check, Loader2, X } from 'lucide-react'
import { DEFAULT_CREDIT_CHECKLIST } from './defaultCreditChecklist'
import { FINANCE_KNOWLEDGE_TEMPLATE, OPENING_GUIDE_TEMPLATE } from './financeKnowledgeTemplate'

const MAX_FINANCE = 6000 // same limit as the server

// The figures the AI's loan estimate uses. Defaults and ranges are the server's (loanSettings).
const LOAN_FIELDS = [
  { key: 'bankRate', field: 'loanBankRate', label: 'ดอกเบี้ยกู้ธนาคาร (% ต่อปี)', min: 0, max: 20, step: 0.01, fallback: 3.5 },
  { key: 'directRate', field: 'loanDirectRate', label: 'ดอกเบี้ยผ่อนตรง (% ต่อปี)', min: 0, max: 20, step: 0.01, fallback: 2.5 },
  { key: 'maxDsrPercent', field: 'loanMaxDsrPercent', label: 'ค่างวดรวมหนี้อื่นได้ไม่เกิน (% ของรายได้)', min: 10, max: 80, step: 1, fallback: 40 },
  { key: 'defaultDownPercent', field: 'loanDefaultDownPercent', label: 'เงินดาวน์ตั้งต้น (% ของราคา)', min: 0, max: 90, step: 1, fallback: 20 },
  { key: 'defaultYears', field: 'loanDefaultYears', label: 'ผ่อนกี่ปี (ตั้งต้น)', min: 1, max: 40, step: 1, fallback: 30 },
  { key: 'maxYears', field: 'loanMaxYears', label: 'ผ่อนได้นานสุดกี่ปี', min: 1, max: 40, step: 1, fallback: 30 },
]

function initialLoan(settings) {
  return Object.fromEntries(LOAN_FIELDS.map(({ key, field, min, max, fallback }) => {
    const value = Number(settings[field])
    return [key, String(Number.isFinite(value) && value >= min && value <= max ? value : fallback)]
  }))
}

// What the AI is told to ask for a credit check, and extra tone notes. Super admins only.
// Changes apply to the next message; no deploy needed.
export default function AiGuidanceDialog({ settings, callApi, onClose }) {
  const id = useId()
  const [checklist, setChecklist] = useState(settings.creditChecklist || '')
  const [extra, setExtra] = useState(settings.extraInstructions || '')
  const [finance, setFinance] = useState(settings.financeKnowledge || '')
  const [opening, setOpening] = useState(settings.openingGuide || '')
  const [loan, setLoan] = useState(() => initialLoan(settings))
  const loanError = LOAN_FIELDS.find(({ key, min, max }) => {
    const value = Number(loan[key])
    return loan[key] === '' || !Number.isFinite(value) || value < min || value > max
  })
  const [particle, setParticle] = useState(settings.particle === 'ค่ะ' ? 'ค่ะ' : 'ครับ')
  const savedDelay = Number(settings.replyDelaySeconds)
  const [delay, setDelay] = useState(Number.isInteger(savedDelay) && savedDelay >= 0 && savedDelay <= 30 ? savedDelay : 15)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })

  const usingDefault = !checklist.trim()

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setStatus({ type: '', message: '' })
    try {
      await callApi({ action: 'setAiGuidance', creditChecklist: checklist, extraInstructions: extra, financeKnowledge: finance, openingGuide: opening, particle, loan: Object.fromEntries(LOAN_FIELDS.map(({ key }) => [key, Number(loan[key])])), replyDelaySeconds: delay })
      setStatus({ type: 'success', message: 'บันทึกแล้ว AI จะใช้ในข้อความถัดไป' })
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'บันทึกไม่สำเร็จ' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`}>
      <form onSubmit={save} className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 id={`${id}-title`} className="text-base font-semibold text-slate-900">คำแนะนำ AI</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="ปิด">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 text-sm">
          <fieldset className="space-y-2">
            <legend className="font-medium text-slate-800">คำลงท้ายของแอดมิน</legend>
            <div className="flex flex-wrap gap-2">
              {[['ครับ', 'ครับ (เรียกตัวเองว่า ผม / แอดมิน)'], ['ค่ะ', 'ค่ะ (เรียกตัวเองว่า แอดมิน / เรา)']].map(([value, label]) => (
                <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 ${particle === value ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-300 text-slate-700'}`}>
                  <input type="radio" name={`${id}-particle`} value={value} checked={particle === value} onChange={() => setParticle(value)} />
                  {label}
                </label>
              ))}
            </div>
            <p className="text-xs text-slate-500">AI ตอบเหมือนแอดมินเพจ ไม่แนะนำตัวว่าเป็น AI แต่ถ้าลูกค้าถามตรงๆ ว่าเป็นบอทไหม จะตอบตามจริง</p>
          </fieldset>

          <label className="block space-y-2">
            <span className="font-medium text-slate-800">รอให้ลูกค้าพิมพ์จบก่อนตอบ: {delay === 0 ? 'ตอบทันที' : `${delay} วินาที`}</span>
            <input type="range" min={0} max={30} step={1} value={delay} onChange={event => setDelay(Number(event.target.value))} className="w-full" />
            <span className="block text-xs text-slate-500">ลูกค้ามักพิมพ์หลายข้อความติดกัน AI จะรอจนลูกค้าหยุดพิมพ์ตามเวลานี้ แล้วตอบทุกคำถามรวมในข้อความเดียว ยิ่งนานยิ่งรวมได้ครบ แต่ลูกค้าที่ถามข้อเดียวจะรอนานขึ้น (แนะนำ 10-20 วินาที)</span>
          </label>

          <div className="space-y-2">
            <label htmlFor={`${id}-opening`} className="font-medium text-slate-800">เมื่อลูกค้ายังไม่ได้บอกว่าสนใจบ้านหลังไหน</label>
            <p className="text-xs text-slate-500">
              เช่น ลูกค้าทักมาจากโพสต์รวมช่วงราคา ใส่เนื้อหาโพสต์และโซนที่มีบ้าน AI จะถามโซนที่สนใจก่อน แล้วถามงบ
              ตอบช่วงราคาตามนี้ได้ และยังไม่ส่งบ้านจนกว่าจะรู้โซนหรืองบ ใช้เฉพาะแชทที่ยังไม่มีบ้าน
              (ถ้าอยากให้ AI ตอบแชทแบบนี้ ต้องปิด &quot;ต้องมีข้อมูลบ้านก่อน&quot;)
            </p>
            <textarea
              id={`${id}-opening`}
              value={opening}
              onChange={event => { setOpening(event.target.value); setStatus({ type: '', message: '' }) }}
              rows={8}
              maxLength={2000}
              placeholder="ว่างไว้ = AI ถามทำเลและงบแบบทั่วไป"
              className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-xs leading-relaxed focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-100"
            />
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => { setOpening(OPENING_GUIDE_TEMPLATE); setStatus({ type: '', message: '' }) }}
                className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                ใส่ตัวอย่างจากโพสต์ช่วงราคา
              </button>
              <span className="ml-auto text-slate-500">{opening.length}/2000</span>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor={`${id}-checklist`} className="font-medium text-slate-800">
              เช็กเครดิตเบื้องต้น: ต้องถามอะไรลูกค้า และเอกสารที่ต้องเตรียม
            </label>
            <p className="text-xs text-slate-500">
              AI จะถามลูกค้าทีละข้อตามรายการนี้ และบอกเอกสารที่ต้องเตรียมเมื่อลูกค้าถาม
              {usingDefault ? ' ตอนนี้ว่างอยู่ จึงใช้รายการมาตรฐานของบริษัท' : ''}
            </p>
            <textarea
              id={`${id}-checklist`}
              value={checklist}
              onChange={event => { setChecklist(event.target.value); setStatus({ type: '', message: '' }) }}
              rows={14}
              maxLength={4000}
              placeholder="ว่างไว้ = ใช้รายการมาตรฐานของบริษัท (กดปุ่มด้านล่างเพื่อคัดลอกมาแก้ไข)"
              className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-xs leading-relaxed focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-100"
            />
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => { setChecklist(DEFAULT_CREDIT_CHECKLIST); setStatus({ type: '', message: '' }) }}
                className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                ใส่รายการมาตรฐานเพื่อแก้ไข
              </button>
              <button
                type="button"
                onClick={() => setChecklist('')}
                disabled={usingDefault}
                className="rounded-lg px-3 py-1.5 font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                ล้าง (กลับไปใช้มาตรฐาน)
              </button>
              <span className="ml-auto text-slate-500">{checklist.length}/4000</span>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor={`${id}-finance`} className="font-medium text-slate-800">ความรู้การเงินและสินเชื่อ</label>
            <p className="text-xs text-slate-500">
              สิ่งที่ทีมสินเชื่อรู้และอยากให้ AI ใช้อธิบายลูกค้า เช่น MOU กับธนาคาร รายได้ไม่ถึงทำอย่างไร ค่าใช้จ่ายวันโอน
              เขียนเป็นข้อๆ ตัวเลขและเงื่อนไขต้องตรงความจริง AI จะบอกตามนี้ตรงตัว และยังไม่รับปากว่ากู้ผ่าน
              บรรทัดที่ยังมี [ใส่ ...] จะถูกข้าม จึงกรอกทีละหัวข้อได้
            </p>
            <textarea
              id={`${id}-finance`}
              value={finance}
              onChange={event => { setFinance(event.target.value); setStatus({ type: '', message: '' }) }}
              rows={14}
              maxLength={MAX_FINANCE}
              placeholder="ว่างไว้ = AI ใช้แค่หลักทั่วไป (กดปุ่มด้านล่างเพื่อใส่หัวข้อให้กรอก)"
              className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-xs leading-relaxed focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-100"
            />
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => { setFinance(current => (current.trim() ? `${current.trim()}\n\n${FINANCE_KNOWLEDGE_TEMPLATE}` : FINANCE_KNOWLEDGE_TEMPLATE)); setStatus({ type: '', message: '' }) }}
                className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                ใส่หัวข้อให้กรอก
              </button>
              <span className="ml-auto text-slate-500">{finance.length}/{MAX_FINANCE}</span>
            </div>
          </div>

          <fieldset className="space-y-2">
            <legend className="font-medium text-slate-800">ตัวเลขที่ AI ใช้ประเมินค่างวดและโอกาสกู้</legend>
            <p className="text-xs text-slate-500">ใส่ให้ตรงกับธนาคารหรือโปรที่ใช้จริง AI บอกลูกค้าว่าเป็นประมาณการเสมอ ไม่ใช่ผลอนุมัติ</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {LOAN_FIELDS.map(({ key, label, min, max, step }) => (
                <label key={key} className="flex flex-col gap-1 text-xs">
                  <span className="text-slate-600">{label}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={min}
                    max={max}
                    step={step}
                    value={loan[key]}
                    onChange={event => { setLoan(current => ({ ...current, [key]: event.target.value })); setStatus({ type: '', message: '' }) }}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-100"
                  />
                </label>
              ))}
            </div>
            {loanError && <p className="text-xs text-red-600">{loanError.label} ต้องอยู่ระหว่าง {loanError.min}-{loanError.max}</p>}
          </fieldset>

          <div className="space-y-2">
            <label htmlFor={`${id}-extra`} className="font-medium text-slate-800">คำแนะนำเพิ่มเติมเรื่องน้ำเสียงและวิธีตอบ</label>
            <textarea
              id={`${id}-extra`}
              value={extra}
              onChange={event => { setExtra(event.target.value); setStatus({ type: '', message: '' }) }}
              rows={4}
              maxLength={2000}
              placeholder="เช่น เรียกลูกค้าว่าพี่ ตอบไม่เกิน 1 ประโยค"
              className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-xs leading-relaxed focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-100"
            />
          </div>

          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            อย่าให้ AI รับเอกสารหรือเลขบัตรในแชท: รายการมาตรฐานสั่งให้ลูกค้าส่งเอกสารให้ทีมงานโดยตรง
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 px-5 py-3">
          {status.message && (
            <p className={`text-xs ${status.type === 'error' ? 'text-red-600' : 'text-emerald-700'}`} role="status">
              {status.type === 'success' && <Check className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />}
              {status.message}
            </p>
          )}
          <button type="button" onClick={onClose} className="ml-auto rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">ปิด</button>
          <button
            type="submit"
            disabled={saving || Boolean(loanError)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            บันทึก
          </button>
        </div>
      </form>
    </div>
  )
}
