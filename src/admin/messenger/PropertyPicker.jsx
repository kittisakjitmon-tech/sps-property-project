import { useId, useMemo, useState } from 'react'
import { searchPropertyOptions } from './propertySearch'

// Search box for a database property: by code, name, project, area or a nearby place. Picking a
// result (click, or arrow keys and Enter) calls onPick with its code.
export default function PropertyPicker({ options, value, onChange, onPick, disabled }) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const results = useMemo(() => searchPropertyOptions(options, value), [options, value])
  const showList = open && value.trim() && results.length > 0

  function pick(option) {
    onPick(option.code)
    setOpen(false)
  }

  function onKeyDown(event) {
    if (!results.length) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive(index => Math.min(index + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(index => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && showList) {
      event.preventDefault()
      pick(results[Math.min(active, results.length - 1)].option)
    } else if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="relative min-w-[200px] flex-1">
      <label className="sr-only" htmlFor={`${listId}-input`}>ค้นหาทรัพย์ในฐานข้อมูล</label>
      <input
        id={`${listId}-input`}
        role="combobox"
        aria-expanded={Boolean(showList)}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList ? `${listId}-${active}` : undefined}
        value={value}
        onChange={event => { onChange(event.target.value); setOpen(true); setActive(0) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        placeholder="ค้นหาทรัพย์: รหัส ชื่อ โครงการ ทำเล หรือสถานที่ใกล้เคียง"
        autoComplete="off"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-100"
      />
      {showList && (
        <ul id={listId} role="listbox" className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {results.map(({ option, matched }, index) => (
            <li
              key={option.code}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              // Pick before the input's blur closes the list.
              onMouseDown={event => { event.preventDefault(); pick(option) }}
              onMouseEnter={() => setActive(index)}
              className={`cursor-pointer px-3 py-1.5 ${index === active ? 'bg-blue-50' : ''}`}
            >
              <p className="truncate text-slate-800">
                <span className="font-semibold">{option.code}</span>
                {option.title ? ` · ${option.title}` : ''}
              </p>
              <p className="truncate text-slate-500">
                {matched ? <span className="text-blue-700">{matched.label}: {matched.text}</span> : [option.project, option.location].filter(Boolean).join(' · ')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
