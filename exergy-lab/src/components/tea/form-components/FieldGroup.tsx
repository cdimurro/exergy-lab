'use client'

import * as React from 'react'

export interface FieldGroupProps {
  label?: string
  subtitle?: string
  children: React.ReactNode
  columns?: 1 | 2 | 3
  className?: string
}

export function FieldGroup({
  label,
  subtitle,
  children,
  columns = 1,
  className = '',
}: FieldGroupProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {label && (
        <div className="space-y-1">
          <h4 className="text-base font-medium text-foreground">{label}</h4>
          {subtitle && (
            <p className="text-sm text-muted">{subtitle}</p>
          )}
        </div>
      )}

      <div className={`grid gap-4 ${gridCols[columns]}`}>
        {children}
      </div>
    </div>
  )
}
