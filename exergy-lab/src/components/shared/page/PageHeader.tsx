'use client'

/**
 * PageHeader Component
 *
 * Standardized page header for all dashboard pages.
 * Provides consistent layout with icon, title, description, and optional actions.
 */

import React from 'react'

interface PageHeaderProps {
  /** Lucide icon component to display */
  icon: React.ComponentType<{ className?: string }>
  /** Page title */
  title: string
  /** Page description/subtitle */
  description: string
  /** Optional right-aligned action buttons */
  actions?: React.ReactNode
  /** Optional className for the container */
  className?: string
}

export function PageHeader({
  icon: Icon,
  title,
  description,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`border-b border-border bg-background-elevated px-6 py-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            <p className="text-sm text-foreground-muted">{description}</p>
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

export default PageHeader
