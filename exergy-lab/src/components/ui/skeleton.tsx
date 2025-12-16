import * as React from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('skeleton', className)}
        {...props}
      />
    )
  }
)

Skeleton.displayName = 'Skeleton'

// Preset skeleton patterns
export function SkeletonCard() {
  return (
    <div className="space-y-4 p-6 border border-border rounded-lg bg-background-elevated">
      <Skeleton className="h-5 w-3/4 rounded" />
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-5/6 rounded" />
      <Skeleton className="h-4 w-4/6 rounded" />
    </div>
  )
}

export function SkeletonPaper() {
  return (
    <div className="space-y-3 p-4 border border-border rounded-lg bg-background-elevated">
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4 rounded" />
          <Skeleton className="h-3 w-1/2 rounded" />
        </div>
      </div>
      <Skeleton className="h-3 w-full rounded" />
      <Skeleton className="h-3 w-5/6 rounded" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-4 pb-3 border-b border-border">
        <Skeleton className="h-4 w-1/4 rounded" />
        <Skeleton className="h-4 w-1/4 rounded" />
        <Skeleton className="h-4 w-1/4 rounded" />
        <Skeleton className="h-4 w-1/4 rounded" />
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <Skeleton className="h-3 w-1/4 rounded" />
          <Skeleton className="h-3 w-1/4 rounded" />
          <Skeleton className="h-3 w-1/4 rounded" />
          <Skeleton className="h-3 w-1/4 rounded" />
        </div>
      ))}
    </div>
  )
}

export function SkeletonChart({ height = 300 }: { height?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-1/3 rounded" />
        <Skeleton className="h-8 w-24 rounded" />
      </div>
      <Skeleton className="w-full rounded" style={{ height: `${height}px` }} />
      <div className="flex items-center justify-center gap-4">
        <Skeleton className="h-4 w-20 rounded" />
        <Skeleton className="h-4 w-20 rounded" />
        <Skeleton className="h-4 w-20 rounded" />
      </div>
    </div>
  )
}

export { Skeleton }
