/**
 * Badge Component
 * Status badges with centralized PO status configuration
 */

import React from 'react'
import { POStatus } from '@prisma/client'
import { cn, getStatusColors, getStatusLabel } from '@/lib/design-system'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

/**
 * Generic Badge component with manual variant selection
 */
export function Badge({
  variant = 'default',
  size = 'md',
  className,
  children,
  ...props
}: BadgeProps) {
  // Base styles
  const baseStyles = 'inline-flex items-center font-medium rounded-full border'

  // Variant styles
  const variantStyles = {
    default: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600',
    success: 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-600',
    danger: 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-600',
    warning: 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-600',
    info: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-600',
  }

  // Size styles
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base',
  }

  return (
    <span
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}

export interface StatusBadgeProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'> {
  status: POStatus
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

/**
 * StatusBadge component specifically for PO statuses
 * Uses centralized status configuration from design system
 */
export function StatusBadge({
  status,
  size = 'md',
  showIcon = false,
  className,
  ...props
}: StatusBadgeProps) {
  const colors = getStatusColors(status)
  const label = getStatusLabel(status)

  // Base styles
  const baseStyles = 'inline-flex items-center font-medium rounded-full border'

  // Size styles
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-base gap-2',
  }

  // Status icons
  const statusIcons: Record<POStatus, React.ReactNode> = {
    [POStatus.DRAFT]: (
      <svg className={cn('w-3 h-3', colors.icon)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    [POStatus.PENDING_APPROVAL]: (
      <svg className={cn('w-3 h-3', colors.icon)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    [POStatus.APPROVED]: (
      <svg className={cn('w-3 h-3', colors.icon)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    [POStatus.SENT]: (
      <svg className={cn('w-3 h-3', colors.icon)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
    [POStatus.RECEIVED]: (
      <svg className={cn('w-3 h-3', colors.icon)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    ),
    [POStatus.INVOICED]: (
      <svg className={cn('w-3 h-3', colors.icon)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    [POStatus.CANCELLED]: (
      <svg className={cn('w-3 h-3', colors.icon)} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  }

  return (
    <span
      className={cn(
        baseStyles,
        sizeStyles[size],
        colors.bg,
        colors.text,
        colors.border,
        className
      )}
      {...props}
    >
      {showIcon && statusIcons[status]}
      <span>{label}</span>
    </span>
  )
}

export default Badge
