import { useState } from 'react'

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-20 w-20 text-2xl',
}

export default function Avatar({ src, name, size = 'md' }) {
  const [failedSrc, setFailedSrc] = useState(null)
  const initial = (name || '?').trim().charAt(0).toUpperCase()
  const sizeClass = SIZES[size] || SIZES.md

  if (src && failedSrc !== src) {
    return (
      <img
        src={src}
        alt=""
        width={80}
        height={80}
        loading="lazy"
        onError={() => setFailedSrc(src)}
        className={`${sizeClass} shrink-0 rounded-full bg-slate-100 object-cover`}
      />
    )
  }

  return (
    <div className={`${sizeClass} flex shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700`} aria-hidden="true">
      {initial}
    </div>
  )
}
