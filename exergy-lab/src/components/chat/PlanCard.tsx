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
import type {
  PlanPhase,
  PhaseType,
  ResearchPlanDetails,
  ExperimentPlanDetails,
  SimulationPlanDetails,
  TEAPlanDetails,
} from '@/types/workflow'

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

// ============================================================================
// Detail Rendering Components
// ============================================================================

function ResearchDetails({ details }: { details: ResearchPlanDetails }) {
  return (
    <div className="space-y-4 pt-3 border-t border-border/50">
      {/* Search Terms */}
      {details.searchTerms.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
            <Search className="h-3 w-3" />
            Search Terms
          </h5>
          <div className="flex flex-wrap gap-1.5">
            {details.searchTerms.map((term, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs font-normal">
                {term}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Databases */}
      {details.databases.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-muted-foreground mb-2">
            Databases to Search
          </h5>
          <div className="flex flex-wrap gap-2">
            {details.databases.map((db, idx) => (
              <span
                key={idx}
                className="text-xs bg-foreground/5 px-2 py-1 rounded"
              >
                {db}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Key Research Areas */}
      {details.keyAreas.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-muted-foreground mb-2">
            Key Research Areas
          </h5>
          <ul className="space-y-1">
            {details.keyAreas.map((area, idx) => (
              <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                {area}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Expected Results */}
      <div className="flex gap-6 text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground">{details.expectedPapers}</strong> papers expected
        </span>
        <span>
          <strong className="text-foreground">{details.expectedPatents}</strong> patents expected
        </span>
      </div>
    </div>
  )
}

function ExperimentDetails({ details }: { details: ExperimentPlanDetails }) {
  const [expandedProtocol, setExpandedProtocol] = React.useState<number | null>(null)

  return (
    <div className="space-y-3 pt-3 border-t border-border/50">
      <h5 className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <FlaskConical className="h-3 w-3" />
        Planned Protocols ({details.protocols.length})
      </h5>

      <div className="space-y-2">
        {details.protocols.map((protocol, idx) => (
          <div
            key={idx}
            className="border border-border/50 rounded-md overflow-hidden"
          >
            {/* Protocol header */}
            <button
              type="button"
              onClick={() => setExpandedProtocol(expandedProtocol === idx ? null : idx)}
              className="w-full flex items-center gap-2 p-2 text-left hover:bg-background-elevated/30 transition-colors"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-medium">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium truncate block">{protocol.name}</span>
                <span className="text-xs text-muted-foreground truncate block">
                  {protocol.objective}
                </span>
              </div>
              {protocol.estimatedDuration && (
                <span className="text-xs text-muted-foreground">{protocol.estimatedDuration}</span>
              )}
              {expandedProtocol === idx ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {/* Protocol details */}
            {expandedProtocol === idx && (
              <div className="px-2 pb-2 space-y-3 border-t border-border/50">
                {/* Materials */}
                {protocol.materials.length > 0 && (
                  <div className="pt-2">
                    <h6 className="text-xs font-medium text-muted-foreground mb-1">Materials</h6>
                    <div className="flex flex-wrap gap-1">
                      {protocol.materials.map((mat, midx) => (
                        <span
                          key={midx}
                          className="text-xs bg-foreground/5 px-2 py-0.5 rounded"
                        >
                          {mat}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Equipment */}
                {protocol.equipment.length > 0 && (
                  <div>
                    <h6 className="text-xs font-medium text-muted-foreground mb-1">Equipment</h6>
                    <div className="flex flex-wrap gap-1">
                      {protocol.equipment.map((equip, eidx) => (
                        <span
                          key={eidx}
                          className="text-xs bg-foreground/5 px-2 py-0.5 rounded"
                        >
                          {equip}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Procedure */}
                {protocol.procedure.length > 0 && (
                  <div>
                    <h6 className="text-xs font-medium text-muted-foreground mb-1">Procedure</h6>
                    <ol className="space-y-1 text-xs">
                      {protocol.procedure.map((step, sidx) => (
                        <li key={sidx} className="flex gap-2">
                          <span className="text-muted-foreground shrink-0">{sidx + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Metrics */}
                {protocol.metrics.length > 0 && (
                  <div>
                    <h6 className="text-xs font-medium text-muted-foreground mb-1">Success Metrics</h6>
                    <ul className="space-y-0.5 text-xs">
                      {protocol.metrics.map((metric, midx) => (
                        <li key={midx} className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3 text-primary" />
                          {metric}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Safety Notes */}
                {protocol.safetyNotes && protocol.safetyNotes.length > 0 && (
                  <div className="bg-yellow-500/5 border border-yellow-500/20 rounded p-2">
                    <h6 className="text-xs font-medium text-yellow-600 mb-1">⚠️ Safety Notes</h6>
                    <ul className="space-y-0.5 text-xs text-yellow-700">
                      {protocol.safetyNotes.map((note, nidx) => (
                        <li key={nidx}>• {note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function SimulationDetails({ details }: { details: SimulationPlanDetails }) {
  const simTypeLabels: Record<string, string> = {
    DFT: 'Density Functional Theory',
    MD: 'Molecular Dynamics',
    GCMC: 'Grand Canonical Monte Carlo',
    CFD: 'Computational Fluid Dynamics',
    FEA: 'Finite Element Analysis',
    KMC: 'Kinetic Monte Carlo',
    PV: 'Photovoltaic Performance',
    battery: 'Battery Electrochemistry',
    process: 'Process Simulation',
    other: 'Custom Simulation',
  }

  return (
    <div className="space-y-3 pt-3 border-t border-border/50">
      {/* Simulation Type */}
      <div className="flex items-center gap-2">
        <Cpu className="h-3 w-3 text-muted-foreground" />
        <h5 className="text-xs font-medium text-muted-foreground">Simulation Method</h5>
        <Badge variant="secondary" className="text-xs">
          {simTypeLabels[details.simulationType] || details.simulationType}
        </Badge>
      </div>

      {/* System Description */}
      <div>
        <h5 className="text-xs font-medium text-muted-foreground mb-1">System</h5>
        <p className="text-sm">{details.system}</p>
      </div>

      {/* Parameters */}
      {Object.keys(details.parameters).length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-muted-foreground mb-2">Parameters</h5>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {Object.entries(details.parameters).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <span className="font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expected Outputs */}
      {details.expectedOutputs.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-muted-foreground mb-1">Expected Outputs</h5>
          <ul className="space-y-0.5 text-xs">
            {details.expectedOutputs.map((output, idx) => (
              <li key={idx} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-primary" />
                {output}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function TEADetails({ details }: { details: TEAPlanDetails }) {
  return (
    <div className="space-y-3 pt-3 border-t border-border/50">
      {/* Analysis Scope */}
      <div>
        <h5 className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
          <Calculator className="h-3 w-3" />
          Analysis Scope
        </h5>
        <p className="text-sm">{details.analysisScope}</p>
      </div>

      {/* Key Assumptions */}
      {details.keyAssumptions.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-muted-foreground mb-1">Key Assumptions</h5>
          <ul className="space-y-0.5 text-xs">
            {details.keyAssumptions.map((assumption, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-muted-foreground">•</span>
                {assumption}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Data Requirements */}
      {details.dataRequirements.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-muted-foreground mb-1">Data Requirements</h5>
          <div className="flex flex-wrap gap-1.5">
            {details.dataRequirements.map((req, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs font-normal">
                {req}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Output Metrics */}
      {details.outputMetrics.length > 0 && (
        <div>
          <h5 className="text-xs font-medium text-muted-foreground mb-1">Financial Metrics</h5>
          <div className="flex flex-wrap gap-2">
            {details.outputMetrics.map((metric, idx) => (
              <span
                key={idx}
                className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-medium"
              >
                {metric}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Helper to render phase details based on type
function PhaseDetails({ phase }: { phase: PlanPhase }) {
  if (!phase.details) return null

  switch (phase.details.type) {
    case 'research':
      return <ResearchDetails details={phase.details as ResearchPlanDetails} />
    case 'experiment_design':
      return <ExperimentDetails details={phase.details as ExperimentPlanDetails} />
    case 'simulation':
      return <SimulationDetails details={phase.details as SimulationPlanDetails} />
    case 'tea_analysis':
      return <TEADetails details={phase.details as TEAPlanDetails} />
    default:
      return null
  }
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

          {/* AI-Generated Details - Rich content based on phase type */}
          <PhaseDetails phase={phase} />

          {/* Expected outputs (only show if no details, as details include outputs) */}
          {!phase.details && phase.expectedOutputs.length > 0 && (
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

          {/* Editable parameters - collapsed by default since details show most info */}
          {phase.canModify && Object.keys(phase.parameters).length > 0 && (
            <details className="group">
              <summary className="text-xs font-medium text-muted-foreground mb-2 cursor-pointer list-none flex items-center gap-1 hover:text-foreground transition-colors">
                <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                Advanced Parameters
              </summary>
              <div className="space-y-2 pt-2">
                {Object.entries(phase.parameters).map(([key, value]) => {
                  if (value === undefined || value === null) return null
                  // Skip array/object parameters in the editable section
                  if (typeof value === 'object') return null

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
            </details>
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
