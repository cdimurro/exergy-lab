/**
 * WorkflowStepper Component
 *
 * Unified stepper with numbered circles for multi-phase workflows.
 * Shows progress through steps with visual indicators for completed, active, and upcoming steps.
 */

'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface WorkflowStep {
  id: string
  label: string
  description?: string
}

export interface WorkflowStepperProps {
  steps: WorkflowStep[]
  currentStepIndex: number
  onNavigate?: (stepIndex: number) => void
  disabledSteps?: string[]
  className?: string
}

export function WorkflowStepper({
  steps,
  currentStepIndex,
  onNavigate,
  disabledSteps = [],
  className,
}: WorkflowStepperProps) {
  const handleStepClick = (index: number, stepId: string) => {
    if (!onNavigate) return
    if (disabledSteps.includes(stepId)) return
    if (index > currentStepIndex) return // Cannot skip ahead
    onNavigate(index)
  }

  return (
    <div className={cn('bg-card-dark border border-border rounded-lg p-6', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = index === currentStepIndex
          const isCompleted = index < currentStepIndex
          const isUpcoming = index > currentStepIndex
          const isDisabled = disabledSteps.includes(step.id)
          const isClickable = onNavigate && !isDisabled && !isUpcoming

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle and Label */}
              <div className="flex flex-col items-center">
                {/* Numbered Circle */}
                <button
                  type="button"
                  onClick={() => handleStepClick(index, step.id)}
                  disabled={!isClickable}
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all font-semibold text-sm',
                    isCompleted && 'bg-primary/20 border-primary text-primary',
                    isActive && 'bg-primary border-primary text-white scale-110',
                    isUpcoming && 'bg-background border-border text-muted',
                    isClickable && 'cursor-pointer hover:scale-105',
                    !isClickable && 'cursor-default'
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </button>

                {/* Label and Description */}
                <div className="mt-2 text-center">
                  <div
                    className={cn(
                      'text-sm font-medium',
                      (isActive || isCompleted) && 'text-foreground',
                      isUpcoming && 'text-muted'
                    )}
                  >
                    {step.label}
                  </div>
                  {step.description && (
                    <div className="text-xs text-muted mt-0.5 max-w-[100px]">
                      {step.description}
                    </div>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
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
