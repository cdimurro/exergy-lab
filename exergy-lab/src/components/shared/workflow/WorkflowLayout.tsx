/**
 * WorkflowLayout Component
 *
 * Full-width page layout wrapper with optional sidebar (3/4 + 1/4 pattern).
 */

'use client'

import { cn } from '@/lib/utils'

export interface WorkflowLayoutProps {
  children: React.ReactNode
  sidebar?: React.ReactNode
  sidebarPosition?: 'left' | 'right'
  className?: string
}

export function WorkflowLayout({
  children,
  sidebar,
  sidebarPosition = 'right',
  className,
}: WorkflowLayoutProps) {
  // Without sidebar - full width content
  if (!sidebar) {
    return (
      <div className={cn('w-full space-y-6', className)}>
        {children}
      </div>
    )
  }

  // With sidebar - grid layout (3/4 main + 1/4 sidebar for better use of space)
  return (
    <div className={cn('w-full', className)}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {sidebarPosition === 'left' && (
          <div className="space-y-4 order-2 lg:order-1">
            {sidebar}
          </div>
        )}

        <div className={cn(
          'lg:col-span-3 space-y-6',
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
