/**
 * Design System Constants
 * Centralized design tokens for consistent UI across the application
 * Based on bolt repo design patterns with dark mode support
 */

import { POStatus } from '@prisma/client'

// ==================== Color Palette ====================

export const colors = {
  // Background Colors
  background: {
    primary: 'bg-white dark:bg-slate-900',
    secondary: 'bg-gray-50 dark:bg-slate-800',
    tertiary: 'bg-gray-100 dark:bg-slate-700',
  },

  // Accent Colors
  accent: {
    primary: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700',
    success: 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-500 dark:hover:bg-emerald-600',
    danger: 'bg-red-500 hover:bg-red-600 dark:bg-red-500 dark:hover:bg-red-600',
    warning: 'bg-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600',
    info: 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-600',
  },

  // Text Colors
  text: {
    primary: 'text-slate-900 dark:text-white',
    secondary: 'text-slate-600 dark:text-slate-400',
    tertiary: 'text-slate-400 dark:text-slate-500',
  },

  // Border Colors
  border: {
    default: 'border-gray-200 dark:border-slate-700',
    hover: 'border-gray-300 dark:border-slate-600',
  },
} as const

// ==================== Spacing Scale ====================

export const spacing = {
  xs: 'gap-0.5', // 2px
  sm: 'gap-1',   // 4px
  md: 'gap-2',   // 8px
  lg: 'gap-3',   // 12px
  xl: 'gap-4',   // 16px
  '2xl': 'gap-6', // 24px
  '3xl': 'gap-8', // 32px
} as const

export const padding = {
  xs: 'p-1',   // 4px
  sm: 'p-2',   // 8px
  md: 'p-4',   // 16px
  lg: 'p-6',   // 24px
  xl: 'p-8',   // 32px
  '2xl': 'p-12', // 48px
} as const

export const margin = {
  xs: 'm-1',   // 4px
  sm: 'm-2',   // 8px
  md: 'm-4',   // 16px
  lg: 'm-6',   // 24px
  xl: 'm-8',   // 32px
  '2xl': 'm-12', // 48px
} as const

// ==================== Component Standards ====================

export const components = {
  // Rounded corners
  rounded: {
    sm: 'rounded-sm',   // 2px
    default: 'rounded',    // 4px
    md: 'rounded-md',   // 6px
    lg: 'rounded-lg',   // 8px
    xl: 'rounded-xl',   // 12px
    '2xl': 'rounded-2xl', // 16px
    full: 'rounded-full',
  },

  // Shadows
  shadow: {
    sm: 'shadow-sm',
    default: 'shadow',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    none: 'shadow-none',
  },

  // Borders
  border: {
    default: 'border border-gray-200 dark:border-slate-700',
    hover: 'border border-gray-300 dark:border-slate-600',
    none: 'border-0',
  },
} as const

// ==================== Animation Constants ====================

export const animations = {
  transition: {
    fast: 'transition-all duration-150 ease-in-out',
    default: 'transition-all duration-200 ease-in-out',
    slow: 'transition-all duration-300 ease-in-out',
    colors: 'transition-colors duration-200',
  },

  hover: {
    opacity: 'hover:opacity-80',
    brightness: 'hover:brightness-95',
    scale: 'hover:scale-105',
  },
} as const

// ==================== Status Color Mapping ====================

export const statusColors = {
  [POStatus.DRAFT]: {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-700 dark:text-gray-300',
    border: 'border-gray-300 dark:border-gray-600',
    icon: 'text-gray-500 dark:text-gray-400',
  },
  [POStatus.PENDING_APPROVAL]: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-600',
    icon: 'text-amber-500 dark:text-amber-400',
  },
  [POStatus.APPROVED]: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-600',
    icon: 'text-emerald-500 dark:text-emerald-400',
  },
  [POStatus.SENT]: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-600',
    icon: 'text-blue-500 dark:text-blue-400',
  },
  [POStatus.RECEIVED]: {
    bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-300 dark:border-indigo-600',
    icon: 'text-indigo-500 dark:text-indigo-400',
  },
  [POStatus.INVOICED]: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-600',
    icon: 'text-purple-500 dark:text-purple-400',
  },
  [POStatus.CANCELLED]: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-300 dark:border-red-600',
    icon: 'text-red-500 dark:text-red-400',
  },
} as const

// ==================== Helper Functions ====================

/**
 * Get status color classes for a given PO status
 */
export function getStatusColors(status: POStatus) {
  return statusColors[status]
}

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: POStatus): string {
  const labels: Record<POStatus, string> = {
    [POStatus.DRAFT]: 'Draft',
    [POStatus.PENDING_APPROVAL]: 'Pending Approval',
    [POStatus.APPROVED]: 'Approved',
    [POStatus.SENT]: 'Sent',
    [POStatus.RECEIVED]: 'Received',
    [POStatus.INVOICED]: 'Invoiced',
    [POStatus.CANCELLED]: 'Cancelled',
  }
  return labels[status]
}

/**
 * Combine multiple Tailwind classes
 * Useful for building component class strings
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
