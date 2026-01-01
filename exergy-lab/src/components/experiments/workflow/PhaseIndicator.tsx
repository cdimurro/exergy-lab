/**
 * Phase Indicator Component
 *
 * Visual indicator of the current workflow phase with progress steps.
 */

'use client'

import type { ExperimentWorkflowPhase } from '@/types/experiment-workflow'
import { CheckCircle, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PhaseIndicatorProps {
  currentPhase: ExperimentWorkflowPhase
}

const PHASES = [
  { id: 'setup', label: 'Setup', description: 'Define experiment goal' },
  { id: 'generating', label: 'Generating', description: 'AI creates protocol' },
  { id: 'review', label: 'Review', description: 'Edit and approve' },
  { id: 'validating', label: 'Validating', description: 'Check accuracy' },
  { id: 'complete', label: 'Complete', description: 'View results' },
] as const

export function PhaseIndicator({ currentPhase }: PhaseIndicatorProps) {
  const currentIndex = PHASES.findIndex((p) => p.id === currentPhase)

  return (
    <div className="bg-card-dark border border-border rounded-lg p-6">
      <div className="flex items-center justify-between">
        {PHASES.map((phase, index) => {
          const isActive = index === currentIndex
          const isCompleted = index < currentIndex
          const isUpcoming = index > currentIndex

          return (
            <div key={phase.id} className="flex items-center flex-1">
              {/* Phase Step */}
              <div className="flex flex-col items-center">
                {/* Icon */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                    isCompleted && 'bg-primary/20 border-primary',
                    isActive && 'bg-primary/10 border-primary',
                    isUpcoming && 'bg-background border-border'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-primary" />
                  ) : (
                    <Circle
                      className={cn(
                        'w-5 h-5',
                        isActive && 'text-primary',
                        isUpcoming && 'text-muted'
                      )}
                    />
                  )}
                </div>

                {/* Label */}
                <div className="mt-2 text-center">
                  <div
                    className={cn(
                      'text-sm font-medium',
                      (isActive || isCompleted) && 'text-foreground',
                      isUpcoming && 'text-muted'
                    )}
                  >
                    {phase.label}
                  </div>
                  <div className="text-xs text-muted mt-0.5">{phase.description}</div>
                </div>
              </div>

              {/* Connector Line */}
              {index < PHASES.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-2 transition-all',
                    isCompleted ? 'bg-primary' : 'bg-border'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
