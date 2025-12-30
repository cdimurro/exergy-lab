'use client'

import * as React from 'react'
import {
  FlaskConical,
  Cpu,
  Clock,
  DollarSign,
  Beaker,
  Settings2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Play,
} from 'lucide-react'
import { Card, Badge, Button } from '@/components/ui'
import { SimulationSuggestionsPanel } from '@/components/experiments/SimulationSuggestionsPanel'
import type { ExergyExperimentFile } from '@/types/exergy-experiment'
import type { SimulationTier } from '@/lib/simulation/types'

interface ImportPreviewProps {
  experimentFile: ExergyExperimentFile
  onRunSimulation: (tier: SimulationTier) => void
  onCancel: () => void
  isRunning?: boolean
}

const TIER_CONFIG: Record<
  SimulationTier,
  {
    label: string
    description: string
    accuracy: string
    costLabel: string
    color: string
  }
> = {
  tier1: {
    label: 'Browser',
    description: 'Fast analytical calculations',
    accuracy: '±20%',
    costLabel: 'Free',
    color: 'bg-green-100 text-green-700',
  },
  tier2: {
    label: 'Local',
    description: 'GPU-accelerated on Modal T4',
    accuracy: '±10%',
    costLabel: 'Free (rate limited)',
    color: 'bg-blue-100 text-blue-700',
  },
  tier3: {
    label: 'Cloud',
    description: 'High-fidelity PhysX/MuJoCo',
    accuracy: '±2%',
    costLabel: '$0.50-2.00',
    color: 'bg-purple-100 text-purple-700',
  },
}

export function ImportPreview({
  experimentFile,
  onRunSimulation,
  onCancel,
  isRunning = false,
}: ImportPreviewProps) {
  const [selectedTier, setSelectedTier] = React.useState<SimulationTier>(
    experimentFile.simulation.suggestedTier
  )
  const [showProtocol, setShowProtocol] = React.useState(false)
  const [showSimParams, setShowSimParams] = React.useState(true)

  const { metadata, protocol, simulation, failureAnalysis } = experimentFile

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent-purple/5 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
            <FlaskConical className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground">{metadata.title}</h2>
            <p className="text-sm text-foreground-muted mt-1">{metadata.description}</p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <Badge variant="secondary">{metadata.domain}</Badge>
              <Badge variant="secondary">
                <Cpu className="w-3 h-3 mr-1" />
                {simulation.suggestedType}
              </Badge>
              <Badge
                variant="secondary"
                className={`${simulation.confidence >= 80 ? 'bg-green-100 text-green-700' : simulation.confidence >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}
              >
                {simulation.confidence}% confidence
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Tier Selection */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-3">Select Simulation Tier</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {(Object.keys(TIER_CONFIG) as SimulationTier[]).map((tier) => {
            const config = TIER_CONFIG[tier]
            const isSelected = selectedTier === tier
            const isSuggested = tier === simulation.suggestedTier

            return (
              <button
                key={tier}
                type="button"
                onClick={() => setSelectedTier(tier)}
                disabled={isRunning}
                className={`
                  p-4 rounded-lg border-2 text-left transition-all
                  ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-background-elevated hover:border-primary/50'}
                  ${isRunning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge className={config.color}>{config.label}</Badge>
                  {isSuggested && (
                    <Badge size="sm" variant="secondary">
                      Suggested
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-foreground-muted">{config.description}</p>
                <div className="flex items-center justify-between mt-3 text-xs">
                  <span className="text-foreground-muted">Accuracy: {config.accuracy}</span>
                  <span className="font-medium text-foreground">{config.costLabel}</span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Estimated Time/Cost */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="bg-background-elevated">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-foreground-muted" />
            <div>
              <div className="text-xs text-foreground-muted">Estimated Duration</div>
              <div className="text-sm font-medium text-foreground">
                {simulation.estimatedDuration
                  ? simulation.estimatedDuration >= 60
                    ? `~${Math.round(simulation.estimatedDuration / 60)} minutes`
                    : `~${simulation.estimatedDuration} seconds`
                  : 'N/A'}
              </div>
            </div>
          </div>
        </Card>
        <Card className="bg-background-elevated">
          <div className="flex items-center gap-3">
            <DollarSign className="h-5 w-5 text-foreground-muted" />
            <div>
              <div className="text-xs text-foreground-muted">Estimated Cost</div>
              <div className="text-sm font-medium text-foreground">
                {selectedTier === 'tier1'
                  ? 'Free'
                  : selectedTier === 'tier2'
                    ? 'Free (rate limited)'
                    : simulation.estimatedCost
                      ? `$${simulation.estimatedCost.toFixed(2)}`
                      : '$0.50-2.00'}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* AI Simulation Parameters */}
      <button
        type="button"
        onClick={() => setShowSimParams(!showSimParams)}
        className="w-full flex items-center justify-between p-4 rounded-lg bg-background-elevated border border-border hover:bg-background-surface transition-colors"
      >
        <div className="flex items-center gap-3">
          <Settings2 className="h-5 w-5 text-primary" />
          <span className="font-medium text-foreground">AI Simulation Parameters</span>
        </div>
        {showSimParams ? (
          <ChevronUp className="h-5 w-5 text-foreground-muted" />
        ) : (
          <ChevronDown className="h-5 w-5 text-foreground-muted" />
        )}
      </button>
      {showSimParams && (
        <SimulationSuggestionsPanel suggestion={simulation} compact={false} />
      )}

      {/* Experiment Protocol Summary */}
      <button
        type="button"
        onClick={() => setShowProtocol(!showProtocol)}
        className="w-full flex items-center justify-between p-4 rounded-lg bg-background-elevated border border-border hover:bg-background-surface transition-colors"
      >
        <div className="flex items-center gap-3">
          <Beaker className="h-5 w-5 text-foreground-muted" />
          <span className="font-medium text-foreground">Experiment Protocol</span>
          <Badge size="sm" variant="secondary">
            {protocol.steps.length} steps
          </Badge>
        </div>
        {showProtocol ? (
          <ChevronUp className="h-5 w-5 text-foreground-muted" />
        ) : (
          <ChevronDown className="h-5 w-5 text-foreground-muted" />
        )}
      </button>
      {showProtocol && (
        <Card className="bg-background-elevated">
          <div className="space-y-4">
            {/* Materials */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">Materials</h4>
              <div className="flex flex-wrap gap-2">
                {protocol.materials.map((m, i) => (
                  <Badge key={i} variant="secondary" size="sm">
                    {m.name}: {m.quantity} {m.unit}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Equipment */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">Equipment</h4>
              <div className="flex flex-wrap gap-2">
                {protocol.equipment.map((e, i) => (
                  <Badge key={i} variant="secondary" size="sm">
                    {e}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Steps Preview */}
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">Procedure</h4>
              <ol className="text-sm text-foreground-muted space-y-1 list-decimal list-inside">
                {protocol.steps.slice(0, 5).map((s) => (
                  <li key={s.step} className="truncate">
                    {s.title}
                  </li>
                ))}
                {protocol.steps.length > 5 && (
                  <li className="text-primary">+{protocol.steps.length - 5} more steps</li>
                )}
              </ol>
            </div>
          </div>
        </Card>
      )}

      {/* Risk Warning */}
      {failureAnalysis.riskScore >= 50 && (
        <Card className="bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800">Risk Assessment</h4>
              <p className="text-sm text-amber-700 mt-1">
                This experiment has a risk score of {failureAnalysis.riskScore}/100.
                Review the failure analysis before running physical experiments.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-4 pt-4 border-t border-border">
        <Button variant="secondary" onClick={onCancel} disabled={isRunning}>
          Cancel
        </Button>
        <Button
          onClick={() => onRunSimulation(selectedTier)}
          disabled={isRunning}
          className="min-w-[180px]"
        >
          {isRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Running Simulation...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 mr-2" />
              Run Simulation
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
