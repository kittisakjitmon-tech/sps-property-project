/**
 * Button Component - Standardized button styles
 * Usage: <Button variant="primary">Click me</Button>
 */
import { forwardRef } from 'react'

const variants = {
  primary: 'bg-blue-900 text-white hover:bg-blue-800 focus:ring-blue-500',
  secondary: 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-400',
  outline: 'border-2 border-blue-900 text-blue-900 hover:bg-blue-50 focus:ring-blue-500',
  ghost: 'text-slate-600 hover:bg-slate-100 focus:ring-slate-400',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
}

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    className = '',
    disabled = false,
    loading = false,
    icon,
    iconPosition = 'left',
    ...props
  },
  ref
) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {icon && iconPosition === 'left' && icon}
      {children}
      {icon && iconPosition === 'right' && icon}
    </button>
  )
})

export default Button