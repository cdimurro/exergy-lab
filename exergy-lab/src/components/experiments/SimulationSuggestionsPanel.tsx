'use client'

import * as React from 'react'
import {
  Cpu,
  Zap,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  AlertCircle,
  Gauge,
  FlaskConical,
  Settings2,
  Info,
} from 'lucide-react'
import { Card, Badge, Button, Progress } from '@/components/ui'
import type { SimulationSuggestion, SimulationParameter, ExpectedOutput } from '@/types/exergy-experiment'
import type { BoundaryCondition, SimulationType, SimulationTier } from '@/lib/simulation/types'

interface SimulationSuggestionsPanelProps {
  suggestion: SimulationSuggestion
  onParameterOverride?: (params: SimulationParameter[]) => void
  compact?: boolean
}

const SIMULATION_TYPE_INFO: Record<
  SimulationType,
  { label: string; description: string; icon: React.ReactNode }
> = {
  thermodynamic: {
    label: 'Thermodynamic',
    description: 'Energy balance and heat flow analysis',
    icon: <Gauge className="w-4 h-4" />,
  },
  electrochemical: {
    label: 'Electrochemical',
    description: 'Battery, fuel cell, and electrolyzer modeling',
    icon: <Zap className="w-4 h-4" />,
  },
  cfd: {
    label: 'CFD',
    description: 'Computational fluid dynamics simulation',
    icon: <Cpu className="w-4 h-4" />,
  },
  kinetics: {
    label: 'Reaction Kinetics',
    description: 'Chemical reaction rate modeling',
    icon: <FlaskConical className="w-4 h-4" />,
  },
  'heat-transfer': {
    label: 'Heat Transfer',
    description: 'Conduction, convection, and radiation',
    icon: <Gauge className="w-4 h-4" />,
  },
  'mass-transfer': {
    label: 'Mass Transfer',
    description: 'Diffusion and transport phenomena',
    icon: <Settings2 className="w-4 h-4" />,
  },
  materials: {
    label: 'Materials',
    description: 'Materials property and structure analysis',
    icon: <Cpu className="w-4 h-4" />,
  },
  optimization: {
    label: 'Optimization',
    description: 'Multi-objective optimization and sensitivity',
    icon: <Settings2 className="w-4 h-4" />,
  },
}

const TIER_INFO: Record<SimulationTier, { label: string; color: string; description: string }> = {
  tier1: {
    label: 'Browser',
    color: 'bg-green-100 text-green-700 border-green-300',
    description: 'Fast analytical calculations (free)',
  },
  tier2: {
    label: 'Local',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    description: 'GPU-accelerated on Modal T4',
  },
  tier3: {
    label: 'Cloud',
    color: 'bg-purple-100 text-purple-700 border-purple-300',
    description: 'High-fidelity PhysX/MuJoCo',
  },
}

export function SimulationSuggestionsPanel({
  suggestion,
  onParameterOverride,
  compact = false,
}: SimulationSuggestionsPanelProps) {
  const [isExpanded, setIsExpanded] = React.useState(!compact)
  const [showAllParams, setShowAllParams] = React.useState(false)

  const typeInfo = SIMULATION_TYPE_INFO[suggestion.suggestedType]
  const tierInfo = TIER_INFO[suggestion.suggestedTier]

  const displayParams = showAllParams
    ? suggestion.parameters
    : suggestion.parameters.slice(0, 4)

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600'
    if (confidence >= 60) return 'text-amber-600'
    return 'text-red-600'
  }

  return (
    <Card className="bg-background-elevated border-primary/20">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              AI-Suggested Simulation Configuration
            </h3>
            <p className="text-sm text-foreground-muted">
              {typeInfo.label} simulation on {tierInfo.label} tier
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${getConfidenceColor(suggestion.confidence)}`}>
              {suggestion.confidence}% confidence
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-foreground-muted" />
          ) : (
            <ChevronDown className="h-5 w-5 text-foreground-muted" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="mt-6 space-y-6">
          {/* Simulation Type and Tier */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-background-surface border border-border">
              <div className="flex items-center gap-2 mb-2">
                {typeInfo.icon}
                <span className="text-sm font-medium text-foreground">Simulation Type</span>
              </div>
              <div className="text-lg font-semibold text-foreground">{typeInfo.label}</div>
              <p className="text-xs text-foreground-muted mt-1">{typeInfo.description}</p>

              {suggestion.alternativeTypes && suggestion.alternativeTypes.length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="text-xs text-foreground-muted mb-2">Alternatives:</div>
                  <div className="flex flex-wrap gap-1">
                    {suggestion.alternativeTypes.map((type) => (
                      <Badge key={type} variant="secondary" size="sm">
                        {SIMULATION_TYPE_INFO[type]?.label || type}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 rounded-lg bg-background-surface border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium text-foreground">Execution Tier</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={tierInfo.color}>{tierInfo.label}</Badge>
              </div>
              <p className="text-xs text-foreground-muted mt-2">{tierInfo.description}</p>

              <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1 text-xs text-foreground-muted mb-1">
                    <Clock className="w-3 h-3" />
                    Est. Duration
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    {suggestion.estimatedDuration
                      ? `~${Math.round(suggestion.estimatedDuration / 60)} min`
                      : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1 text-xs text-foreground-muted mb-1">
                    <DollarSign className="w-3 h-3" />
                    Est. Cost
                  </div>
                  <div className="text-sm font-medium text-foreground">
                    {suggestion.estimatedCost !== undefined
                      ? suggestion.estimatedCost === 0
                        ? 'Free'
                        : `$${suggestion.estimatedCost.toFixed(2)}`
                      : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Reasoning */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-foreground mb-1">AI Reasoning</div>
                <p className="text-sm text-foreground-muted">{suggestion.reasoning}</p>
              </div>
            </div>
          </div>

          {/* Confidence Indicator */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Suggestion Confidence</span>
              <span className={`text-sm font-semibold ${getConfidenceColor(suggestion.confidence)}`}>
                {suggestion.confidence}%
              </span>
            </div>
            <Progress
              value={suggestion.confidence}
              variant={
                suggestion.confidence >= 80
                  ? 'success'
                  : suggestion.confidence >= 60
                    ? 'warning'
                    : 'error'
              }
              size="sm"
            />
            {suggestion.confidence < 60 && (
              <div className="flex items-center gap-2 mt-2 text-xs text-amber-600">
                <AlertCircle className="w-3 h-3" />
                Low confidence - consider manual parameter review
              </div>
            )}
          </div>

          {/* Parameters */}
          {suggestion.parameters.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-foreground">Simulation Parameters</h4>
                {suggestion.parameters.length > 4 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAllParams(!showAllParams)}
                    className="text-xs"
                  >
                    {showAllParams
                      ? 'Show Less'
                      : `Show All (${suggestion.parameters.length})`}
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {displayParams.map((param, index) => (
                  <ParameterCard key={index} parameter={param} />
                ))}
              </div>
            </div>
          )}

          {/* Boundary Conditions */}
          {suggestion.boundaryConditions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Boundary Conditions</h4>
              <div className="space-y-2">
                {suggestion.boundaryConditions.map((bc, index) => (
                  <BoundaryConditionCard key={index} condition={bc} />
                ))}
              </div>
            </div>
          )}

          {/* Expected Outputs */}
          {suggestion.expectedOutputs.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Expected Outputs</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {suggestion.expectedOutputs.map((output, index) => (
                  <ExpectedOutputCard key={index} output={output} />
                ))}
              </div>
            </div>
          )}

          {/* Override Action */}
          {onParameterOverride && (
            <div className="pt-4 border-t border-border">
              <Button
                variant="secondary"
                onClick={() => onParameterOverride(suggestion.parameters)}
                className="w-full"
              >
                <Settings2 className="w-4 h-4 mr-2" />
                Customize Parameters
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// Sub-components

function ParameterCard({ parameter }: { parameter: SimulationParameter }) {
  return (
    <div className="p-3 rounded-lg bg-background-surface border border-border">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-foreground">{parameter.name}</span>
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold text-primary">{parameter.value}</span>
          <span className="text-xs text-foreground-muted">{parameter.unit}</span>
        </div>
      </div>
      {parameter.description && (
        <p className="text-xs text-foreground-muted">{parameter.description}</p>
      )}
      {parameter.uncertainty !== undefined && (
        <div className="flex items-center gap-1 mt-1 text-xs text-foreground-muted">
          <Info className="w-3 h-3" />
          Uncertainty: ±{parameter.uncertainty}%
        </div>
      )}
    </div>
  )
}

function BoundaryConditionCard({ condition }: { condition: BoundaryCondition }) {
  const typeColors: Record<string, string> = {
    dirichlet: 'bg-blue-100 text-blue-700',
    neumann: 'bg-green-100 text-green-700',
    robin: 'bg-purple-100 text-purple-700',
    periodic: 'bg-amber-100 text-amber-700',
  }

  return (
    <div className="p-3 rounded-lg bg-background-surface border border-border flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Badge size="sm" className={typeColors[condition.type] || 'bg-gray-100 text-gray-700'}>
          {condition.type}
        </Badge>
        <span className="text-sm text-foreground">{condition.name}</span>
      </div>
      <div className="text-sm">
        <span className="font-medium text-foreground">{condition.value}</span>
        <span className="text-foreground-muted ml-1">{condition.unit}</span>
      </div>
    </div>
  )
}

function ExpectedOutputCard({ output }: { output: ExpectedOutput }) {
  return (
    <div className="p-3 rounded-lg bg-background-surface border border-border">
      <div className="text-sm font-medium text-foreground mb-1">{output.name}</div>
      <div className="text-xs text-foreground-muted mb-2">
        Expected: {output.expectedRange[0]} - {output.expectedRange[1]} {output.unit}
      </div>
      {output.description && (
        <p className="text-xs text-foreground-muted">{output.description}</p>
      )}
    </div>
  )
}
