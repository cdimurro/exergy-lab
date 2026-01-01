/**
 * Generating Phase Component
 *
 * Displays progress while AI generates the experiment protocol.
 */

'use client'

import type { StreamProgress } from '@/types/experiment-workflow'
import { Card } from '@/components/ui'
import { Loader2, Sparkles } from 'lucide-react'

interface GeneratingPhaseProps {
  progress: StreamProgress
}

export function GeneratingPhase({ progress }: GeneratingPhaseProps) {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Generating Protocol</h2>
        </div>
        <p className="text-muted">
          AI is analyzing your requirements and creating a detailed experiment plan...
        </p>
      </div>

      {/* Progress Card */}
      <Card className="p-8 bg-card-dark border-border">
        <div className="space-y-6">
          {/* Spinner */}
          <div className="flex justify-center">
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
          </div>

          {/* Status */}
          <div className="text-center space-y-2">
            <p className="text-lg font-medium text-foreground">{progress.status}</p>
            {progress.currentPhase && (
              <p className="text-sm text-muted">{progress.currentPhase}</p>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="w-full bg-background rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted">
              <span>Progress</span>
              <span>{progress.percentage}%</span>
            </div>
          </div>

          {/* Stages */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
            <StageItem
              label="Materials"
              isActive={progress.percentage >= 25}
              isComplete={progress.percentage > 35}
            />
            <StageItem
              label="Steps"
              isActive={progress.percentage >= 50}
              isComplete={progress.percentage > 60}
            />
            <StageItem
              label="Safety"
              isActive={progress.percentage >= 70}
              isComplete={progress.percentage > 80}
            />
            <StageItem
              label="Finalize"
              isActive={progress.percentage >= 90}
              isComplete={progress.percentage >= 100}
            />
          </div>
        </div>
      </Card>

      {/* Info Note */}
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
        <p className="text-xs text-muted text-center">
          This usually takes 10-30 seconds depending on complexity. You'll be able to review
          and edit the protocol before validation.
        </p>
      </div>
    </div>
  )
}

interface StageItemProps {
  label: string
  isActive: boolean
  isComplete: boolean
}

function StageItem({ label, isActive, isComplete }: StageItemProps) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`
          w-2 h-2 rounded-full transition-colors
          ${isComplete ? 'bg-primary' : isActive ? 'bg-primary/50 animate-pulse' : 'bg-muted'}
        `}
      />
      <span
        className={`
          text-sm transition-colors
          ${isComplete || isActive ? 'text-foreground' : 'text-muted'}
        `}
      >
        {label}
      </span>
    </div>
  )
}
