'use client'

/**
 * ThinkingIndicator Component
 *
 * Shows the current AI activity with animated indicators.
 * Displays what the AI is working on during discovery.
 */

import { cn } from '@/lib/utils'
import { Brain, Sparkles, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ThinkingIndicatorProps {
  message?: string | null
  phase?: string
  isActive?: boolean
  variant?: 'default' | 'compact' | 'expanded'
  className?: string
}

export function ThinkingIndicator({
  message,
  phase,
  isActive = true,
  variant = 'default',
  className,
}: ThinkingIndicatorProps) {
  const [dots, setDots] = useState('')

  // Animate dots
  useEffect(() => {
    if (!isActive) {
      setDots('')
      return
    }

    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'))
    }, 400)

    return () => clearInterval(interval)
  }, [isActive])

  if (!isActive) return null

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="relative">
          <Brain size={16} className="text-blue-500" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
        </div>
        <span className="text-sm text-muted-foreground">
          {message || 'Thinking'}{dots}
        </span>
      </div>
    )
  }

  if (variant === 'expanded') {
    return (
      <div
        className={cn(
          'flex flex-col gap-3 p-4 rounded-lg',
          'bg-gradient-to-br from-blue-500/5 to-purple-500/5',
          'border border-blue-200/50',
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Brain size={20} className="text-blue-500" />
            </div>
            <span className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-full animate-ping" />
            <span className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-full" />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground flex items-center gap-2">
              <span>AI Processing</span>
              {phase && (
                <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 text-xs">
                  {phase}
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {message || 'Analyzing and reasoning'}{dots}
            </div>
          </div>
        </div>
        <ThinkingProgress />
      </div>
    )
  }

  // Default variant
  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-lg',
        'bg-blue-500/5 border border-blue-200/50',
        className
      )}
    >
      <div className="relative">
        <Brain size={18} className="text-blue-500" />
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping" />
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-foreground truncate">
          {message || 'Processing'}{dots}
        </div>
      </div>
      {phase && (
        <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 text-xs shrink-0">
          {phase}
        </span>
      )}
    </div>
  )
}

/**
 * Animated thinking progress bar
 */
function ThinkingProgress() {
  return (
    <div className="h-1 bg-blue-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 rounded-full animate-thinking-progress"
        style={{
          width: '40%',
          animation: 'thinking-progress 1.5s ease-in-out infinite',
        }}
      />
      <style jsx>{`
        @keyframes thinking-progress {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(350%);
          }
        }
      `}</style>
    </div>
  )
}

/**
 * Activity indicator with icon animation
 */
interface ActivityIndicatorProps {
  type?: 'thinking' | 'generating' | 'validating'
  className?: string
}

export function ActivityIndicator({
  type = 'thinking',
  className,
}: ActivityIndicatorProps) {
  const icons = {
    thinking: Brain,
    generating: Sparkles,
    validating: Zap,
  }

  const colors = {
    thinking: 'text-blue-500 bg-blue-500/10',
    generating: 'text-purple-500 bg-purple-500/10',
    validating: 'text-amber-500 bg-amber-500/10',
  }

  const Icon = icons[type]

  return (
    <div className={cn('relative inline-flex', className)}>
      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', colors[type])}>
        <Icon size={16} className="animate-pulse" />
      </div>
      <span
        className={cn(
          'absolute top-0 right-0 w-2 h-2 rounded-full',
          type === 'thinking' && 'bg-blue-500',
          type === 'generating' && 'bg-purple-500',
          type === 'validating' && 'bg-amber-500'
        )}
      />
    </div>
  )
}

/**
 * Pulsing brain icon for headers
 */
export function PulsingBrain({ className }: { className?: string }) {
  return (
    <div className={cn('relative inline-flex', className)}>
      <Brain size={20} className="text-blue-500 animate-pulse" />
      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
    </div>
  )
}

export default ThinkingIndicator
