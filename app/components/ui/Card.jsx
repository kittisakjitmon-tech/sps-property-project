/**
 * Card Component - Standardized card styles
 * Usage: <Card hover>Content</Card>
 */
import { forwardRef } from 'react'

export const Card = forwardRef(function Card(
  {
    children,
    className = '',
    hover = false,
    padding = 'default',
    ...props
  },
  ref
) {
  const paddingStyles = {
    none: '',
    sm: 'p-3',
    default: 'p-4',
    lg: 'p-6',
  }

  return (
    <div
      ref={ref}
      className={`
        bg-white rounded-2xl shadow-card
        ${hover ? 'hover:shadow-card-hover hover:-translate-y-0.5' : ''}
        ${paddingStyles[padding]}
        transition-all duration-300
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
})

export const CardHeader = ({ children, className = '' }) => (
  <div className={`mb-4 ${className}`}>
    {children}
  </div>
)

export const CardTitle = ({ children, className = '' }) => (
  <h3 className={`text-lg font-semibold text-slate-800 ${className}`}>
    {children}
  </h3>
)

export const CardDescription = ({ children, className = '' }) => (
  <p className={`text-sm text-slate-500 mt-1 ${className}`}>
    {children}
  </p>
)

export const CardContent = ({ children, className = '' }) => (
  <div className={className}>
    {children}
  </div>
)

export const CardFooter = ({ children, className = '' }) => (
  <div className={`mt-4 pt-4 border-t border-slate-100 ${className}`}>
    {children}
  </div>
)

export default Card