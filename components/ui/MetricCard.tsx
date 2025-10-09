/**
 * MetricCard Component
 * Display metric cards with icons for dashboard analytics
 */

import React from 'react'
import { cn } from '@/lib/design-system'
import { Card } from './Card'

export interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  iconColor?: 'blue' | 'green' | 'yellow' | 'teal' | 'purple' | 'red'
  className?: string
}

const iconColorClasses = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  teal: 'bg-teal-500',
  purple: 'bg-purple-500',
  red: 'bg-red-500',
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  iconColor = 'blue',
  className,
}: MetricCardProps) {
  return (
    <Card padding="md" className={cn('transition-all duration-200 hover:shadow-md', className)}>
      <div className="flex items-center">
        <div className={cn('flex-shrink-0 rounded-lg p-3', iconColorClasses[iconColor])}>
          <div className="h-6 w-6 text-white">
            {icon}
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
              {title}
            </dt>
            <dd className="text-2xl font-semibold text-slate-900 dark:text-white mt-1">
              {value}
            </dd>
            {subtitle && (
              <dd className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {subtitle}
              </dd>
            )}
          </dl>
        </div>
      </div>
    </Card>
  )
}

export default MetricCard
