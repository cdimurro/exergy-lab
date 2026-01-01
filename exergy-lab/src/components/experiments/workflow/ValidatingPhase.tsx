/**
 * Validating Phase Component
 *
 * Displays progress through 4-stage validation pipeline:
 * Literature → Safety → Equipment → Cost
 */

'use client'

import type { ValidationProgress } from '@/types/experiment-workflow'
import { Card, Button } from '@/components/ui'
import { Loader2, Shield, BookOpen, Wrench, DollarSign, CheckCircle } from 'lucide-react'

interface ValidatingPhaseProps {
  progress: ValidationProgress
  onStart: () => void
  canStart: boolean
}

const VALIDATION_STAGES = [
  { id: 'literature', label: 'Literature Alignment', icon: BookOpen, range: [0, 30] },
  { id: 'safety', label: 'Materials Safety', icon: Shield, range: [30, 50] },
  { id: 'equipment', label: 'Equipment Feasibility', icon: Wrench, range: [50, 70] },
  { id: 'cost', label: 'Cost Accuracy', icon: DollarSign, range: [70, 100] },
] as const

export function ValidatingPhase({ progress, onStart, canStart }: ValidatingPhaseProps) {
  const currentStageIndex = VALIDATION_STAGES.findIndex((s) => s.id === progress.phase)

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Protocol Validation</h2>
        </div>
        <p className="text-muted">
          Running 4-stage accuracy validation to ensure real-world readiness
        </p>
      </div>

      {/* Progress Card */}
      <Card className="p-8 bg-card-dark border-border">
        <div className="space-y-6">
          {/* Status */}
          {progress.phase !== 'complete' && (
            <>
              {/* Spinner */}
              <div className="flex justify-center">
                <Loader2 className="w-16 h-16 text-primary animate-spin" />
              </div>

              {/* Message */}
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-foreground">{progress.message}</p>
                {VALIDATION_STAGES[currentStageIndex] && (
                  <p className="text-sm text-muted">
                    {VALIDATION_STAGES[currentStageIndex].label}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Complete State */}
          {progress.phase === 'complete' && (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle className="w-16 h-16 text-green-400" />
              <div className="text-center">
                <p className="text-lg font-medium text-foreground">Validation Complete</p>
                <p className="text-sm text-muted">Protocol has been fully validated</p>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="w-full bg-background rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted">
              <span>Validation Progress</span>
              <span>{progress.percentage}%</span>
            </div>
          </div>

          {/* Validation Stages */}
          <div className="space-y-3 pt-4 border-t border-border">
            {VALIDATION_STAGES.map((stage, index) => {
              const Icon = stage.icon
              const isActive = stage.id === progress.phase
              const isComplete =
                currentStageIndex > index || progress.phase === 'complete'
              const isPending = currentStageIndex < index && progress.phase !== 'complete'

              return (
                <div
                  key={stage.id}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg transition-all
                    ${isActive ? 'bg-primary/10 border border-primary/20' : ''}
                    ${isComplete ? 'bg-green-500/5 border border-green-500/10' : ''}
                    ${isPending ? 'opacity-50' : ''}
                  `}
                >
                  <div
                    className={`
                      w-8 h-8 rounded-lg flex items-center justify-center
                      ${isComplete ? 'bg-green-500/20' : isActive ? 'bg-primary/20' : 'bg-background'}
                    `}
                  >
                    {isComplete ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <Icon
                        className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted'}`}
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-foreground">
                      {stage.label}
                    </div>
                    <div className="text-xs text-muted">{stage.range[0]}-{stage.range[1]}%</div>
                  </div>
                  {isActive && (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Start Button (if not started) */}
          {canStart && progress.percentage === 0 && (
            <div className="pt-4 border-t border-border">
              <Button onClick={onStart} className="w-full">
                Start Validation
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Info Note */}
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
        <p className="text-xs text-muted text-center">
          Validation typically takes 15-30 seconds. Each stage verifies different aspects of
          protocol accuracy and real-world feasibility.
        </p>
      </div>
    </div>
  )
}
