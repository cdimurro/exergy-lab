'use client'

import * as React from 'react'
import {
  ChevronDown,
  ChevronRight,
  Search,
  FlaskConical,
  Cpu,
  Calculator,
  Clock,
  CheckCircle2,
  Edit2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Card, Badge, Input } from '@/components/ui'
import type { PlanCardProps } from '@/types/chat'
import type { PlanPhase, PhaseType } from '@/types/workflow'

const PHASE_ICONS: Record<PhaseType, React.ReactNode> = {
  research: <Search className="h-4 w-4" />,
  experiment_design: <FlaskConical className="h-4 w-4" />,
  simulation: <Cpu className="h-4 w-4" />,
  tea_analysis: <Calculator className="h-4 w-4" />,
}

const PHASE_LABELS: Record<PhaseType, string> = {
  research: 'Research',
  experiment_design: 'Experiment Design',
  simulation: 'Simulation',
  tea_analysis: 'TEA Analysis',
}

interface PhaseItemProps {
  phase: PlanPhase
  index: number
  isExpanded: boolean
  onToggle: () => void
  onModify?: (phaseId: string, parameter: string, value: any) => void
  modification?: { parameter: string; newValue: any }
}

function PhaseItem({
  phase,
  index,
  isExpanded,
  onToggle,
  onModify,
  modification,
}: PhaseItemProps) {
  const [editingParam, setEditingParam] = React.useState<string | null>(null)
  const [editValue, setEditValue] = React.useState<string>('')

  const handleEditStart = (key: string, value: any) => {
    setEditingParam(key)
    setEditValue(String(value))
  }

  const handleEditSave = () => {
    if (editingParam && onModify) {
      // Parse value based on original type
      const originalValue = phase.parameters[editingParam]
      let parsedValue: any = editValue
      if (typeof originalValue === 'number') {
        parsedValue = parseFloat(editValue) || 0
      } else if (typeof originalValue === 'boolean') {
        parsedValue = editValue === 'true'
      }
      onModify(phase.id, editingParam, parsedValue)
    }
    setEditingParam(null)
  }

  const handleEditCancel = () => {
    setEditingParam(null)
    setEditValue('')
  }

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${Math.round(ms / 1000)}s`
    return `${Math.round(ms / 60000)}min`
  }

  const hasModifications = modification !== undefined

  return (
    <div
      className={cn(
        'border rounded-lg transition-colors',
        hasModifications ? 'border-primary/30 bg-primary/5' : 'border-border'
      )}
    >
      {/* Phase header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-background-elevated/50 transition-colors"
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-medium">
          {index + 1}
        </span>
        <div className="flex items-center gap-2 text-muted-foreground">
          {PHASE_ICONS[phase.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{phase.title}</span>
            {phase.optional && (
              <Badge variant="secondary" className="text-xs">
                Optional
              </Badge>
            )}
            {hasModifications && (
              <Badge variant="default" className="text-xs">
                Modified
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(phase.estimatedDuration)}
          </span>
          {phase.estimatedCost > 0 && (
            <span>${phase.estimatedCost.toFixed(2)}</span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-border">
          {/* Description */}
          <p className="text-sm text-muted-foreground pt-3">{phase.description}</p>

          {/* Expected outputs */}
          {phase.expectedOutputs.length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-2">
                Expected Outputs
              </h5>
              <ul className="space-y-1">
                {phase.expectedOutputs.map((output, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <CheckCircle2 className="h-3 w-3 text-primary" />
                    {output}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Editable parameters */}
          {phase.canModify && Object.keys(phase.parameters).length > 0 && (
            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-2">
                Parameters
              </h5>
              <div className="space-y-2">
                {Object.entries(phase.parameters).map(([key, value]) => {
                  if (value === undefined || value === null) return null

                  const isEditing = editingParam === key
                  const displayValue =
                    modification?.parameter === key
                      ? modification.newValue
                      : value

                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type={typeof value === 'number' ? 'number' : 'text'}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-7 w-24 text-xs"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleEditSave()
                              if (e.key === 'Escape') handleEditCancel()
                            }}
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleEditSave}
                            className="h-7 w-7 p-0"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={handleEditCancel}
                            className="h-7 w-7 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{String(displayValue)}</span>
                          {onModify && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditStart(key, displayValue)}
                              className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function PlanCard({
  plan,
  onApprove,
  onReject,
  onModify,
  modifications = [],
  isLoading = false,
}: PlanCardProps) {
  const [expandedPhases, setExpandedPhases] = React.useState<Set<string>>(
    new Set()
  )

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev)
      if (next.has(phaseId)) {
        next.delete(phaseId)
      } else {
        next.add(phaseId)
      }
      return next
    })
  }

  const getPhaseModification = (phaseId: string) => {
    return modifications.find((m) => m.phaseId === phaseId)
  }

  const formatDuration = (ms: number): string => {
    if (ms < 60000) return `${Math.round(ms / 1000)} seconds`
    if (ms < 3600000) return `${Math.round(ms / 60000)} minutes`
    return `${(ms / 3600000).toFixed(1)} hours`
  }

  const totalCost = plan.phases.reduce((sum, p) => sum + p.estimatedCost, 0)

  return (
    <Card className="p-4 border-border">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h4 className="font-medium text-foreground">Execution Plan</h4>
            <p className="text-sm text-muted-foreground mt-1">{plan.overview}</p>
          </div>
          <div className="text-right text-xs text-muted-foreground space-y-0.5">
            <div className="flex items-center gap-1 justify-end">
              <Clock className="h-3 w-3" />
              ~{formatDuration(plan.estimatedDuration)}
            </div>
            {totalCost > 0 && (
              <div className="font-medium">${totalCost.toFixed(2)}</div>
            )}
          </div>
        </div>

        {/* Phases */}
        <div className="space-y-2">
          {plan.phases.map((phase, index) => (
            <PhaseItem
              key={phase.id}
              phase={phase}
              index={index}
              isExpanded={expandedPhases.has(phase.id)}
              onToggle={() => togglePhase(phase.id)}
              onModify={onModify}
              modification={getPhaseModification(phase.id)}
            />
          ))}
        </div>

        {/* Modifications summary */}
        {modifications.length > 0 && (
          <div className="text-xs text-muted-foreground pt-2 border-t border-border">
            {modifications.length} parameter{modifications.length !== 1 ? 's' : ''}{' '}
            modified
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-border">
          <Button
            onClick={() => onApprove(modifications)}
            disabled={isLoading}
            className="flex-1"
          >
            {modifications.length > 0 ? 'Approve with Changes' : 'Approve & Execute'}
          </Button>
          <Button
            variant="secondary"
            onClick={() => onReject()}
            disabled={isLoading}
          >
            Start Over
          </Button>
        </div>
      </div>
    </Card>
  )
}
