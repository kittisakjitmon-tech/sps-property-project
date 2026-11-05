import { useRef, useState } from 'react'
import { ImagePlus, Loader2 } from 'lucide-react'

// Drag pictures in, click to choose, or paste (click the box, then Ctrl/Cmd+V).
// Several pictures at once are handed to onFiles as an array.
export default function ImageDropZone({ onFiles, busy = false, disabled = false, label = 'ลากรูปมาวางที่นี่ หรือคลิกเพื่อเลือก' }) {
  const [over, setOver] = useState(false)
  const inputRef = useRef(null)
  const blocked = busy || disabled

  function accept(fileList) {
    const images = [...(fileList || [])].filter(file => file.type.startsWith('image/'))
    if (images.length && !blocked) onFiles(images)
  }

  return (
    <div
      role="button"
      tabIndex={blocked ? -1 : 0}
      aria-disabled={blocked}
      aria-label={label}
      onClick={() => { if (!blocked) inputRef.current?.click() }}
      onKeyDown={event => {
        if (blocked || (event.key !== 'Enter' && event.key !== ' ')) return
        event.preventDefault()
        inputRef.current?.click()
      }}
      onDragOver={event => { event.preventDefault(); if (!blocked) setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={event => { event.preventDefault(); setOver(false); accept(event.dataTransfer?.files) }}
      onPaste={event => {
        const files = event.clipboardData?.files
        if (files?.length) { event.preventDefault(); accept(files) }
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-3 py-4 text-center text-xs transition ${
        blocked ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
          : over ? 'border-blue-500 bg-blue-50 text-blue-800'
            : 'border-slate-300 bg-white text-slate-600 hover:border-blue-400 hover:bg-blue-50/40'
      } focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={event => { accept(event.target.files); event.target.value = '' }}
      />
      {busy
        ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        : <ImagePlus className="h-5 w-5" aria-hidden="true" />}
      <span className="font-medium">{busy ? 'กำลังอัปโหลด…' : label}</span>
      {!busy && <span className="text-[11px] text-slate-500">รองรับหลายรูปพร้อมกัน · คลิกกล่องแล้วกด Ctrl+V เพื่อวางรูปที่คัดลอกมาได้</span>}
    </div>
  )
}
