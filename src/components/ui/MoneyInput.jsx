import { useId, useLayoutEffect, useRef } from 'react'
import './MoneyInput.css'
import { formatMoneyInput, moneyCaretPosition, parseMoneyInput } from '../../lib/inputFormatting'

/** Format on every edit while preserving the cursor when editing in the middle. */
export default function MoneyInput({ id, label, value, onValueChange, placeholder = '0', required = false, helpText, error, ...props }) {
  const generatedId = useId()
  const inputId = id || generatedId
  const inputRef = useRef(null)
  const caret = useRef(null)
  const descriptionId = `${inputId}-hint`
  const formatted = formatMoneyInput(value)

  useLayoutEffect(() => {
    if (caret.current == null || !inputRef.current) return
    const next = moneyCaretPosition(formatted, caret.current)
    inputRef.current.setSelectionRange(next, next)
    caret.current = null
  })

  function handleChange(event) {
    const raw = parseMoneyInput(event.target.value)
    if (raw == null) return
    const beforeCaret = event.target.value.slice(0, event.target.selectionStart)
    caret.current = beforeCaret.replace(/[^\d.๐-๙]/g, '').length
    onValueChange(raw)
  }

  return <div className="min-w-0">
    {label && <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-slate-700">{label}{required && <span className="ml-1 text-rose-600">*</span>}</label>}
    <div className="relative">
      <input {...props} ref={inputRef} id={inputId} type="text" inputMode="decimal" autoComplete="off" value={formatted} onChange={handleChange} required={required}
        aria-invalid={error ? true : undefined} aria-describedby={helpText || error ? descriptionId : undefined}
        placeholder={placeholder} className={`money-input w-full min-h-12 rounded-xl border bg-white py-3 pl-4 pr-14 text-base font-medium tabular-nums text-slate-900 shadow-sm transition placeholder:font-normal placeholder:text-slate-400 hover:border-slate-400 focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100 ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : 'border-slate-300 focus:border-blue-600 focus:ring-blue-100'}`} />
      <span aria-hidden="true" className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">บาท</span>
    </div>
    {(helpText || error) && <p id={descriptionId} className={`mt-1.5 text-xs ${error ? 'text-rose-700' : 'text-slate-500'}`}>{error || helpText}</p>}
  </div>
}
