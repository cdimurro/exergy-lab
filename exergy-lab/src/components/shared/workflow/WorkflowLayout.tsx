/**
 * WorkflowLayout Component
 *
 * Page layout wrapper with optional sidebar (2/3 + 1/3 pattern).
 */

'use client'

import { cn } from '@/lib/utils'

export interface WorkflowLayoutProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  sidebarPosition?: 'left' | 'right'
  maxWidth?: 'lg' | 'xl' | '2xl' | '4xl' | '7xl' | 'full'
  className?: string
}

export function WorkflowLayout({
  children,
  sidebar,
  sidebarPosition = 'right',
  maxWidth = '7xl',
  className,
}: WorkflowLayoutProps) {
  const maxWidthClass = {
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '4xl': 'max-w-4xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
  }[maxWidth]

  // Without sidebar - centered content
  if (!sidebar) {
    return (
      <div className={cn('mx-auto', maxWidthClass, className)}>
        {children}
      </div>
    )
  }

  // With sidebar - grid layout
  return (
    <div className={cn('mx-auto', maxWidthClass, className)}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {sidebarPosition === 'left' && (
          <div className="space-y-4 order-2 lg:order-1">
            {sidebar}
          </div>
        )}

        <div className={cn(
          'lg:col-span-2 space-y-6',
          sidebarPosition === 'left' ? 'order-1 lg:order-2' : ''
        )}>
          {children}
        </div>

        {sidebarPosition === 'right' && (
          <div className="space-y-4">
            {sidebar}
          </div>
        )}
      </div>
    </div>
  )
}
