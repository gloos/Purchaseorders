/**
 * Select Component
 * Form select/dropdown wrapper with consistent styling matching Input component
 */

import React from 'react'
import { cn } from '@/lib/design-system'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  helperText?: string
  options?: Array<{ value: string; label: string; disabled?: boolean }>
  placeholder?: string
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      helperText,
      options,
      placeholder,
      className,
      id,
      name,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const selectId = id || name || `select-${Math.random().toString(36).substr(2, 9)}`

    // Base styles
    const baseStyles = 'w-full px-3 py-2 rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-slate-800 appearance-none'

    // State styles
    const stateStyles = error
      ? 'border-red-300 dark:border-red-600 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500'

    // Text color
    const textColor = 'text-slate-900 dark:text-white'

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block mb-2 text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            {label}
            {props.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            name={name}
            disabled={disabled}
            className={cn(
              baseStyles,
              stateStyles,
              textColor,
              'pr-10', // Extra padding for dropdown icon
              className
            )}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}

            {options
              ? options.map((option) => (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                  >
                    {option.label}
                  </option>
                ))
              : children}
          </select>

          {/* Dropdown icon */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {error && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

export default Select
