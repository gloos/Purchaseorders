/**
 * Card Component
 * Base card wrapper with variants and optional sections
 */

import React from 'react'
import { cn } from '@/lib/design-system'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'hover'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  header?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
}

export function Card({
  variant = 'default',
  padding = 'md',
  header,
  footer,
  className,
  children,
  ...props
}: CardProps) {
  // Base styles
  const baseStyles = 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm'

  // Variant styles
  const variantStyles = {
    default: '',
    hover: 'transition-all duration-200 hover:shadow-md hover:border-gray-300 dark:hover:border-slate-600 cursor-pointer',
  }

  // Padding styles
  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {header && (
        <div className={cn(
          'border-b border-gray-200 dark:border-slate-700',
          padding !== 'none' && 'px-6 py-4'
        )}>
          {header}
        </div>
      )}

      <div className={cn(paddingStyles[padding])}>
        {children}
      </div>

      {footer && (
        <div className={cn(
          'border-t border-gray-200 dark:border-slate-700',
          padding !== 'none' && 'px-6 py-4'
        )}>
          {footer}
        </div>
      )}
    </div>
  )
}

/**
 * CardHeader Component
 * Optional header component for use within Card
 */
export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('space-y-1.5', className)}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * CardTitle Component
 * Title component for use within CardHeader
 */
export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-xl font-semibold text-slate-900 dark:text-white', className)}
      {...props}
    >
      {children}
    </h3>
  )
}

/**
 * CardDescription Component
 * Description component for use within CardHeader
 */
export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm text-slate-600 dark:text-slate-400', className)}
      {...props}
    >
      {children}
    </p>
  )
}

/**
 * CardContent Component
 * Content wrapper component for use within Card
 */
export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn(className)} {...props}>
      {children}
    </div>
  )
}

/**
 * CardFooter Component
 * Footer component for use within Card
 */
export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center gap-2', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card
