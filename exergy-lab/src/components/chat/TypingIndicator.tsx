'use client'

import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
  className?: string
  message?: string
}

export function TypingIndicator({ className, message = 'AI is thinking' }: TypingIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2 text-muted-foreground', className)}>
      <div className="flex gap-1">
        <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.3s]" />
        <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce [animation-delay:-0.15s]" />
        <span className="h-2 w-2 rounded-full bg-foreground/40 animate-bounce" />
      </div>
      <span className="text-sm">{message}</span>
    </div>
  )
}
