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
  Lightbulb,
  ClipboardCheck,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Card, Badge, Input, Textarea, Select } from '@/components/ui'
import type { PlanCardProps } from '@/types/chat'
import type {
  PlanPhase,
  PhaseType,
  ResearchPlanDetails,
  HypothesisPlanDetails,
  ExperimentPlanDetails,
  SimulationPlanDetails,
  TEAPlanDetails,
  ValidationPlanDetails,
  QualityGatesPlanDetails,
} from '@/types/workflow'

const PHASE_ICONS: Record<PhaseType, React.ReactNode> = {
  research: <Search className="h-4 w-4" />,
  hypothesis: <Lightbulb className="h-4 w-4" />,
  experiment_design: <FlaskConical className="h-4 w-4" />,
  simulation: <Cpu className="h-4 w-4" />,
  tea_analysis: <Calculator className="h-4 w-4" />,
  validation: <ClipboardCheck className="h-4 w-4" />,
  quality_gates: <ShieldCheck className="h-4 w-4" />,
}

const PHASE_LABELS: Record<PhaseType, string> = {
  research: 'Research',
  hypothesis: 'Hypothesis Generation',
  experiment_design: 'Experiment Design',
  simulation: 'Simulation',
  tea_analysis: 'TEA Analysis',
  validation: 'Validation',
  quality_gates: 'Quality Gates',
}

// Dropdown options for enum parameters
const DROPDOWN_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  difficultyLevel: [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ],
  simulationType: [
    { value: 'DFT', label: 'Density Functional Theory (DFT)' },
    { value: 'MD', label: 'Molecular Dynamics (MD)' },
    { value: 'GCMC', label: 'Monte Carlo (GCMC)' },
    { value: 'CFD', label: 'Computational Fluid Dynamics (CFD)' },
    { value: 'FEA', label: 'Finite Element Analysis (FEA)' },
    { value: 'KMC', label: 'Kinetic Monte Carlo (KMC)' },
    { value: 'PV', label: 'Photovoltaic Simulation' },
    { value: 'battery', label: 'Battery Electrochemistry' },
    { value: 'process', label: 'Process Simulation' },
    { value: 'other', label: 'Other / Custom' },
  ],
  simulationTier: [
    { value: 'browser', label: 'Browser (Quick, ~1 min)' },
    { value: 'local', label: 'Local GPU (5-15 min)' },
    { value: 'cloud', label: 'Cloud GPU (15-60 min)' },
  ],
}

// ============================================================================
// Detail Rendering Components
// ============================================================================

function ResearchDetails({ details }: { details: ResearchPlanDetails }) {
  return (
    <div className="space-y-5 pt-4 border-t border-border/50">
      {/* Search Terms */}
      {details.searchTerms.length > 0 && (
        <div>
          <h5 className="text-base font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search Terms
          </h5>
          <div className="flex flex-wrap gap-2.5">
            {details.searchTerms.map((term, idx) => (
              <Badge key={idx} variant="secondary" className="text-base font-normal py-1.5 px-3">
                {term}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Databases */}
      {details.databases.length > 0 && (
        <div>
          <h5 className="text-base font-medium text-muted-foreground mb-3">
            Databases to Search
          </h5>
          <div className="flex flex-wrap gap-2.5">
            {details.databases.map((db, idx) => (
              <span
                key={idx}
                className="text-base bg-foreground/5 px-3.5 py-2 rounded"
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
          <h5 className="text-base font-medium text-muted-foreground mb-3">
            Key Research Areas
          </h5>
          <ul className="space-y-2">
            {details.keyAreas.map((area, idx) => (
              <li key={idx} className="text-lg text-foreground flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                {area}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Expected Results */}
      <div className="flex gap-10 text-base text-muted-foreground">
        <span>
          <strong className="text-foreground text-lg">{details.expectedPapers}</strong> papers expected
        </span>
        <span>
          <strong className="text-foreground text-lg">{details.expectedPatents}</strong> patents expected
        </span>
      </div>
    </div>
  )
}

function ExperimentDetails({ details }: { details: ExperimentPlanDetails }) {
  // Show all protocols fully expanded by default (no collapse behavior)
  return (
    <div className="space-y-5 pt-4 border-t border-border/50">
      <h5 className="text-base font-medium text-muted-foreground flex items-center gap-2">
        <FlaskConical className="h-5 w-5" />
        Planned Protocols ({details.protocols.length})
      </h5>

      <div className="space-y-4">
        {details.protocols.map((protocol, idx) => (
          <div
            key={idx}
            className="border border-border/50 rounded-lg overflow-hidden"
          >
            {/* Protocol header */}
            <div className="flex items-center gap-3 p-4 bg-background-elevated/30">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-base font-medium">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-lg font-medium block">{protocol.name}</span>
                <span className="text-base text-muted-foreground block">
                  {protocol.objective}
                </span>
              </div>
              {protocol.estimatedDuration && (
                <span className="text-base text-muted-foreground">{protocol.estimatedDuration}</span>
              )}
            </div>

            {/* Protocol details - always visible */}
            <div className="px-4 pb-4 space-y-4 border-t border-border/50">
              {/* Materials */}
              {protocol.materials.length > 0 && (
                <div className="pt-4">
                  <h6 className="text-base font-medium text-muted-foreground mb-3">Materials</h6>
                  <div className="flex flex-wrap gap-2.5">
                    {protocol.materials.map((mat, midx) => (
                      <span
                        key={midx}
                        className="text-base bg-foreground/5 px-3 py-1.5 rounded"
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
                  <h6 className="text-base font-medium text-muted-foreground mb-3">Equipment</h6>
                  <div className="flex flex-wrap gap-2.5">
                    {protocol.equipment.map((equip, eidx) => (
                      <span
                        key={eidx}
                        className="text-base bg-foreground/5 px-3 py-1.5 rounded"
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
                  <h6 className="text-base font-medium text-muted-foreground mb-3">Procedure</h6>
                  <ol className="space-y-2 text-base">
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
                  <h6 className="text-base font-medium text-muted-foreground mb-3">Success Metrics</h6>
                  <ul className="space-y-2 text-base">
                    {protocol.metrics.map((metric, midx) => (
                      <li key={midx} className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                        {metric}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Safety Notes */}
              {protocol.safetyNotes && protocol.safetyNotes.length > 0 && (
                <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
                  <h6 className="text-base font-medium text-yellow-600 mb-3">⚠️ Safety Notes</h6>
                  <ul className="space-y-2 text-base text-yellow-700">
                    {protocol.safetyNotes.map((note, nidx) => (
                      <li key={nidx}>• {note}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
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
    <div className="space-y-5 pt-4 border-t border-border/50">
      {/* Simulation Type */}
      <div className="flex items-center gap-3">
        <Cpu className="h-5 w-5 text-muted-foreground" />
        <h5 className="text-base font-medium text-muted-foreground">Simulation Method</h5>
        <Badge variant="secondary" className="text-base py-1.5 px-3">
          {simTypeLabels[details.simulationType] || details.simulationType}
        </Badge>
      </div>

      {/* System Description */}
      <div>
        <h5 className="text-base font-medium text-muted-foreground mb-2">System</h5>
        <p className="text-lg">{details.system}</p>
      </div>

      {/* Parameters */}
      {Object.keys(details.parameters).length > 0 && (
        <div>
          <h5 className="text-base font-medium text-muted-foreground mb-3">Parameters</h5>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-base">
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
          <h5 className="text-base font-medium text-muted-foreground mb-3">Expected Outputs</h5>
          <ul className="space-y-2 text-base">
            {details.expectedOutputs.map((output, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
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
    <div className="space-y-5 pt-4 border-t border-border/50">
      {/* Analysis Scope */}
      <div>
        <h5 className="text-base font-medium text-muted-foreground mb-3 flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Analysis Scope
        </h5>
        <p className="text-lg">{details.analysisScope}</p>
      </div>

      {/* Key Assumptions */}
      {details.keyAssumptions.length > 0 && (
        <div>
          <h5 className="text-base font-medium text-muted-foreground mb-3">Key Assumptions</h5>
          <ul className="space-y-2 text-base">
            {details.keyAssumptions.map((assumption, idx) => (
              <li key={idx} className="flex items-start gap-2">
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
          <h5 className="text-base font-medium text-muted-foreground mb-3">Data Requirements</h5>
          <div className="flex flex-wrap gap-2.5">
            {details.dataRequirements.map((req, idx) => (
              <Badge key={idx} variant="secondary" className="text-base font-normal py-1.5 px-3">
                {req}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Output Metrics */}
      {details.outputMetrics.length > 0 && (
        <div>
          <h5 className="text-base font-medium text-muted-foreground mb-3">Financial Metrics</h5>
          <div className="flex flex-wrap gap-2.5">
            {details.outputMetrics.map((metric, idx) => (
              <span
                key={idx}
                className="text-base bg-primary/10 text-primary px-4 py-2 rounded font-medium"
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

function HypothesisDetails({ details }: { details: HypothesisPlanDetails }) {
  return (
    <div className="space-y-5 pt-4 border-t border-border/50">
      {/* Focus Areas */}
      {details.focusAreas.length > 0 && (
        <div>
          <h5 className="text-base font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Focus Areas
          </h5>
          <ul className="space-y-2">
            {details.focusAreas.map((area, idx) => (
              <li key={idx} className="text-lg text-foreground flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                {area}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Expected Output */}
      <div className="text-base text-muted-foreground">
        <strong className="text-foreground text-lg">{details.expectedHypotheses}</strong> hypotheses will be generated
      </div>

      {/* Evaluation Criteria */}
      {details.evaluationCriteria.length > 0 && (
        <div>
          <h5 className="text-base font-medium text-muted-foreground mb-3">Evaluation Criteria</h5>
          <div className="flex flex-wrap gap-2.5">
            {details.evaluationCriteria.map((criteria, idx) => (
              <Badge key={idx} variant="secondary" className="text-base font-normal py-1.5 px-3">
                {criteria}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ValidationDetails({ details }: { details: ValidationPlanDetails }) {
  return (
    <div className="space-y-5 pt-4 border-t border-border/50">
      {/* Validation Methods */}
      {details.validationMethods.length > 0 && (
        <div>
          <h5 className="text-base font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Validation Methods
          </h5>
          <ul className="space-y-2">
            {details.validationMethods.map((method, idx) => (
              <li key={idx} className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                {method}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Literature Comparison */}
      {details.literatureComparison.length > 0 && (
        <div>
          <h5 className="text-base font-medium text-muted-foreground mb-3">Compare Against</h5>
          <div className="flex flex-wrap gap-2.5">
            {details.literatureComparison.map((lit, idx) => (
              <Badge key={idx} variant="secondary" className="text-base font-normal py-1.5 px-3">
                {lit}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Acceptance Criteria */}
      {details.acceptanceCriteria.length > 0 && (
        <div>
          <h5 className="text-base font-medium text-muted-foreground mb-3">Acceptance Criteria</h5>
          <ul className="space-y-2 text-base">
            {details.acceptanceCriteria.map((criteria, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                {criteria}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function QualityGatesDetails({ details }: { details: QualityGatesPlanDetails }) {
  return (
    <div className="space-y-5 pt-4 border-t border-border/50">
      {/* Overall Threshold */}
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-muted-foreground" />
        <h5 className="text-base font-medium text-muted-foreground">Minimum Pass Score</h5>
        <Badge variant="secondary" className="text-base py-1.5 px-3">
          {details.overallThreshold}/100
        </Badge>
      </div>

      {/* Quality Checks */}
      {details.qualityChecks.length > 0 && (
        <div>
          <h5 className="text-base font-medium text-muted-foreground mb-3">Quality Checks</h5>
          <div className="space-y-3">
            {details.qualityChecks.map((check, idx) => (
              <div key={idx} className="flex items-center justify-between text-base border-b border-border/30 pb-2">
                <div>
                  <span className="font-medium">{check.name}</span>
                  <p className="text-muted-foreground text-sm">{check.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">Weight: {(check.weight * 100).toFixed(0)}%</span>
                  <Badge variant="secondary">{check.threshold}/100</Badge>
                </div>
              </div>
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
    case 'hypothesis':
      return <HypothesisDetails details={phase.details as HypothesisPlanDetails} />
    case 'experiment_design':
      return <ExperimentDetails details={phase.details as ExperimentPlanDetails} />
    case 'simulation':
      return <SimulationDetails details={phase.details as SimulationPlanDetails} />
    case 'tea_analysis':
      return <TEADetails details={phase.details as TEAPlanDetails} />
    case 'validation':
      return <ValidationDetails details={phase.details as ValidationPlanDetails} />
    case 'quality_gates':
      return <QualityGatesDetails details={phase.details as QualityGatesPlanDetails} />
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
  modifications?: Array<{ parameter: string; newValue: any }>
}

function PhaseItem({
  phase,
  index,
  isExpanded,
  onToggle,
  onModify,
  modifications = [],
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
        const parsed = parseFloat(editValue)
        // If parsing fails, keep original value
        if (isNaN(parsed)) {
          parsedValue = originalValue
        } else {
          // Enforce min/max for count parameters
          const isCountParam = editingParam.toLowerCase().includes('hypotheses') ||
            editingParam.toLowerCase().includes('experiments') ||
            editingParam.toLowerCase().includes('simulations') ||
            editingParam.toLowerCase().includes('protocols') ||
            editingParam.toLowerCase().includes('count') ||
            editingParam.toLowerCase().includes('max')

          if (isCountParam) {
            parsedValue = Math.max(1, Math.min(5, parsed))
          } else {
            parsedValue = parsed
          }
        }
      } else if (typeof originalValue === 'boolean') {
        parsedValue = editValue === 'true'
      }

      // Always call onModify to update the value
      onModify(phase.id, editingParam, parsedValue)
    }
    setEditingParam(null)
    setEditValue('')
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

  const hasModifications = modifications.length > 0

  // Helper to get modified value for a specific parameter
  const getModifiedValue = (key: string) => {
    const mod = modifications.find(m => m.parameter === key)
    return mod?.newValue
  }

  // Get the effective enabled state - check modifications first, then fall back to phase.enabled
  const enabledModification = modifications.find(m => m.parameter === 'enabled')
  const isPhaseEnabled = enabledModification !== undefined
    ? enabledModification.newValue === true
    : phase.enabled !== false

  return (
    <div
      className={cn(
        'border rounded-lg transition-colors',
        hasModifications ? 'border-primary/30 bg-primary/5' : 'border-border'
      )}
    >
      {/* Phase header */}
      <div
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-5 text-left hover:bg-background-elevated/50 transition-colors cursor-pointer"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-base font-medium">
          {index + 1}
        </span>
        <div className="flex items-center gap-2 text-muted-foreground">
          {PHASE_ICONS[phase.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <span className="font-medium text-lg truncate">{phase.title}</span>
            {phase.optional && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-base">
                  Optional
                </Badge>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onModify) {
                      // Toggle the enabled state
                      onModify(phase.id, 'enabled', !isPhaseEnabled)
                    }
                  }}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer",
                    isPhaseEnabled ? "bg-primary" : "bg-foreground/20"
                  )}
                  title={isPhaseEnabled ? "Click to disable this phase" : "Click to enable this phase"}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      isPhaseEnabled ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>
            )}
            {hasModifications && (
              <Badge variant="default" className="text-base">
                Modified
              </Badge>
            )}
          </div>
          {/* Preview text when collapsed */}
          {!isExpanded && phase.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2 max-w-full">
              {phase.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
          <span>{isExpanded ? 'Hide Details' : 'Show Details'}</span>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform",
            !isExpanded && "-rotate-90"
          )} />
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-border">
          {/* Estimated time and cost */}
          <div className="flex items-center gap-4 pt-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              Est. {formatDuration(phase.estimatedDuration)}
            </span>
            {phase.estimatedCost > 0 && (
              <span className="flex items-center gap-1">
                ${phase.estimatedCost.toFixed(2)}
              </span>
            )}
          </div>
          {/* Description */}
          <p className="text-lg text-muted-foreground">{phase.description}</p>

          {/* AI-Generated Details - Rich content based on phase type */}
          <PhaseDetails phase={phase} />

          {/* Expected outputs (only show if no details, as details include outputs) */}
          {!phase.details && phase.expectedOutputs.length > 0 && (
            <div>
              <h5 className="text-base font-medium text-muted-foreground mb-3">
                Expected Outputs
              </h5>
              <ul className="space-y-2">
                {phase.expectedOutputs.map((output, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 text-lg text-foreground"
                  >
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    {output}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Editable parameters - shown by default for user customization */}
          {phase.canModify && Object.keys(phase.parameters).length > 0 && (
            <div className="mt-4">
              <h4 className="text-base font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Edit2 className="h-4 w-4" />
                Parameters
              </h4>
              <div className="space-y-3">
                {Object.entries(phase.parameters).map(([key, value]) => {
                  if (value === undefined || value === null) return null
                  // Skip array/object parameters in the editable section
                  if (typeof value === 'object') return null

                  const isEditing = editingParam === key
                  const modifiedValue = getModifiedValue(key)
                  const displayValue = modifiedValue !== undefined ? modifiedValue : value

                  // Check if this parameter has dropdown options
                  const dropdownOptions = DROPDOWN_OPTIONS[key]

                  // Determine if this is a count/quantity parameter that should have max=5
                  // Exclude maxResults - users should be able to set higher values for search results
                  const isCountParam = (key.toLowerCase().includes('hypotheses') ||
                    key.toLowerCase().includes('experiments') ||
                    key.toLowerCase().includes('simulations') ||
                    key.toLowerCase().includes('protocols') ||
                    key.toLowerCase().includes('count')) &&
                    !key.toLowerCase().includes('maxresults')

                  // maxResults has different constraints (1-100)
                  const isMaxResults = key.toLowerCase() === 'maxresults'

                  // Get label for dropdown value
                  const getDropdownLabel = (val: any) => {
                    if (!dropdownOptions) return String(val)
                    const option = dropdownOptions.find(o => o.value === val)
                    return option?.label || String(val)
                  }

                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between gap-3 text-lg"
                    >
                      <span className="text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          {dropdownOptions ? (
                            // Render dropdown for enum parameters with save/cancel buttons
                            <>
                              <Select
                                value={editValue}
                                onChange={(val) => {
                                  // Only update local state, don't save yet
                                  setEditValue(val)
                                }}
                                options={dropdownOptions}
                                className="h-10 w-64"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleEditSave}
                                className="h-10 w-10 p-0"
                                title="Save"
                              >
                                <CheckCircle2 className="h-5 w-5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleEditCancel}
                                className="h-10 w-10 p-0"
                                title="Cancel"
                              >
                                <X className="h-5 w-5" />
                              </Button>
                            </>
                          ) : (
                            // Render input for text/number
                            <>
                              <Input
                                type={typeof value === 'number' ? 'number' : 'text'}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="h-10 w-32 text-base"
                                min={typeof value === 'number' && (isCountParam || isMaxResults) ? 1 : undefined}
                                max={typeof value === 'number' ? (isCountParam ? 5 : (isMaxResults ? 100 : undefined)) : undefined}
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
                                className="h-10 w-10 p-0"
                              >
                                <CheckCircle2 className="h-5 w-5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleEditCancel}
                                className="h-10 w-10 p-0"
                              >
                                <X className="h-5 w-5" />
                              </Button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{getDropdownLabel(displayValue)}</span>
                          {onModify && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditStart(key, displayValue)}
                              className="h-8 w-8 p-0 opacity-50 hover:opacity-100"
                            >
                              <Edit2 className="h-5 w-5" />
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
  onMakeChanges,
  modifications = [],
  isLoading = false,
}: PlanCardProps) {
  // Initialize with all phases COLLAPSED by default for cleaner view
  const [expandedPhases, setExpandedPhases] = React.useState<Set<string>>(
    () => new Set()
  )

  // Feedback state for "Make Changes" flow
  const [showFeedback, setShowFeedback] = React.useState(false)
  const [feedbackText, setFeedbackText] = React.useState('')

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

  // Get ALL modifications for a phase (not just the first one)
  const getPhaseModifications = (phaseId: string) => {
    return modifications.filter((m) => m.phaseId === phaseId)
  }

  const formatDuration = (ms: number): string => {
    if (ms < 60000) return `${Math.round(ms / 1000)} seconds`
    if (ms < 3600000) return `${Math.round(ms / 60000)} minutes`
    return `${(ms / 3600000).toFixed(1)} hours`
  }

  const totalCost = plan.phases.reduce((sum, p) => sum + p.estimatedCost, 0)

  return (
    <Card className="p-6 border-border">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h4 className="font-semibold text-xl text-foreground">Execution Plan</h4>
            <p className="text-lg text-muted-foreground mt-2">{plan.overview}</p>
          </div>
          <div className="text-right text-base text-muted-foreground space-y-1.5">
            <div className="flex items-center gap-2 justify-end">
              <Clock className="h-5 w-5" />
              ~{formatDuration(plan.estimatedDuration)}
            </div>
            {totalCost > 0 && (
              <div className="font-medium text-lg">${totalCost.toFixed(2)}</div>
            )}
          </div>
        </div>

        {/* Phases */}
        <div className="space-y-3">
          {plan.phases.map((phase, index) => (
            <PhaseItem
              key={phase.id}
              phase={phase}
              index={index}
              isExpanded={expandedPhases.has(phase.id)}
              onToggle={() => togglePhase(phase.id)}
              onModify={onModify}
              modifications={getPhaseModifications(phase.id)}
            />
          ))}
        </div>

        {/* Modifications summary */}
        {modifications.length > 0 && (
          <div className="text-base text-muted-foreground pt-4 border-t border-border">
            {modifications.length} parameter{modifications.length !== 1 ? 's' : ''}{' '}
            modified
          </div>
        )}

        {/* Actions */}
        <div className="pt-3 border-t border-border">
          {showFeedback ? (
            // Feedback mode - show textarea and submit/cancel
            <div className="space-y-4">
              <div>
                <label className="block text-base font-medium text-foreground mb-2">
                  What changes would you like?
                </label>
                <Textarea
                  placeholder="Describe what you'd like me to change about the plan..."
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  className="min-h-[100px] text-base resize-none"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    if (feedbackText.trim() && onMakeChanges) {
                      onMakeChanges(feedbackText.trim())
                      setShowFeedback(false)
                      setFeedbackText('')
                    }
                  }}
                  disabled={!feedbackText.trim() || isLoading}
                  className="flex-1 h-12 text-base"
                >
                  Regenerate Plan
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowFeedback(false)
                    setFeedbackText('')
                  }}
                  disabled={isLoading}
                  className="h-12 text-base"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            // Normal mode - show 3 action buttons
            <div className="flex gap-3">
              <Button
                onClick={() => onApprove(modifications)}
                disabled={isLoading}
                className="flex-1 h-12 text-base"
              >
                {modifications.length > 0 ? 'Accept with Changes' : 'Accept Plan'}
              </Button>
              {onMakeChanges && (
                <Button
                  variant="outline"
                  onClick={() => setShowFeedback(true)}
                  disabled={isLoading}
                  className="flex-1 h-12 text-base"
                >
                  Make Changes
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => onReject()}
                disabled={isLoading}
                className="h-12 text-base"
              >
                Start Over
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
