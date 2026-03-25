// Base UI Components
export { Button } from './Button'
export { Input } from './Input'
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card'

// Badge Component
import { forwardRef } from 'react'

const badgeVariants = {
  default: 'bg-slate-100 text-slate-700',
  primary: 'bg-brand-100 text-brand-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
  accent: 'bg-accent-100 text-accent-700',
}

const badgeSizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1 text-sm',
}

export const Badge = forwardRef(function Badge(
  {
    children,
    variant = 'default',
    size = 'md',
    icon,
    className = '',
    ...props
  },
  ref
) {
  return (
    <span
      ref={ref}
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        ${badgeVariants[variant]}
        ${badgeSizes[size]}
        ${className}
      `}
      {...props}
    >
      {icon}
      {children}
    </span>
  )
})

export default Badge