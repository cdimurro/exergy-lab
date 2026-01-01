'use client'

/**
 * WorkflowStepper Component
 *
 * Enhanced step indicator with navigation controls for the simulation workflow
 */

import { Check, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { WorkflowPhase } from '@/types/simulation-workflow'

const STEPS = [
  { phase: 'setup' as WorkflowPhase, label: 'Setup', description: 'Configure simulation' },
  { phase: 'generating' as WorkflowPhase, label: 'Generate', description: 'AI creates plan' },
  { phase: 'review' as WorkflowPhase, label: 'Review', description: 'Review & adjust' },
  { phase: 'executing' as WorkflowPhase, label: 'Execute', description: 'Running simulation' },
  { phase: 'complete' as WorkflowPhase, label: 'Results', description: 'View results' },
]

export interface WorkflowStepperProps {
  currentPhase: WorkflowPhase
  canNavigateBack: boolean
  canNavigateNext: boolean
  onNavigateBack: () => void
  onNavigateNext: () => void
  onNavigateToPhase: (phase: WorkflowPhase) => void
}

export function WorkflowStepper({
  currentPhase,
  canNavigateBack,
  canNavigateNext,
  onNavigateBack,
  onNavigateNext,
  onNavigateToPhase,
}: WorkflowStepperProps) {
  const currentIndex = STEPS.findIndex(s => s.phase === currentPhase)

  return (
    <div className="space-y-4">
      {/* Stepper */}
      <div className="relative">
        {/* Progress Bar Background */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />

        {/* Active Progress Bar */}
        <div
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
          style={{ width: `${(currentIndex / (STEPS.length - 1)) * 100}%` }}
        />

        {/* Steps */}
        <div className="relative flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isActive = step.phase === currentPhase
            const isCompleted = index < currentIndex
            const isClickable = (step.phase === 'setup' || step.phase === 'review' || step.phase === 'complete')
                              && index <= currentIndex
                              && currentPhase !== 'generating'
                              && currentPhase !== 'executing'

            return (
              <button
                key={step.phase}
                onClick={() => isClickable && onNavigateToPhase(step.phase)}
                disabled={!isClickable}
                className={`
                  flex flex-col items-center gap-2 group
                  ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}
                `}
              >
                {/* Circle */}
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                    transition-all duration-200 border-2
                    ${isActive
                      ? 'bg-primary border-primary text-white scale-110'
                      : isCompleted
                      ? 'bg-primary/20 border-primary text-primary'
                      : 'bg-elevated border-border text-muted'
                    }
                    ${isClickable && !isActive ? 'group-hover:border-primary/50 group-hover:bg-primary/10' : ''}
                  `}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>

                {/* Label */}
                <div className="text-center">
                  <div className={`
                    text-sm font-medium transition-colors
                    ${isActive ? 'text-foreground' : isCompleted ? 'text-foreground' : 'text-muted'}
                  `}>
                    {step.label}
                  </div>
                  <div className="text-xs text-muted mt-0.5 max-w-[80px]">
                    {step.description}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button
          variant="ghost"
          onClick={onNavigateBack}
          disabled={!canNavigateBack}
          className="gap-2"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          Previous
        </Button>

        <div className="text-sm text-muted">
          Step {currentIndex + 1} of {STEPS.length}
        </div>

        <Button
          variant="ghost"
          onClick={onNavigateNext}
          disabled={!canNavigateNext}
          className="gap-2"
        >
          Next
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  )
}
