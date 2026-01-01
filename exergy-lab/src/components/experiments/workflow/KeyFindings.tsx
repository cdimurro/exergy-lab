/**
 * Key Findings Component
 *
 * Displays validation results, recommendations, and safety information
 * for a validated experiment protocol. Extracted from CompletePhase for reuse.
 */

'use client'

import type {
  ExperimentPlan,
  ProtocolValidation,
  KeyFinding,
} from '@/types/experiment-workflow'
import { Card, Badge } from '@/components/ui'
import {
  AlertTriangle,
  TrendingUp,
  BookOpen,
  Shield,
  Wrench,
  DollarSign,
} from 'lucide-react'
import { SendToSimulationsButton } from './SendToSimulationsButton'

// ============================================================================
// Types
// ============================================================================

interface KeyFindingsProps {
  plan: ExperimentPlan
  validation: ProtocolValidation
  keyFindings: KeyFinding[]
  showSimulationButton?: boolean
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  status: 'good' | 'warning' | 'neutral'
  subtitle?: string
}

// ============================================================================
// Sub-components
// ============================================================================

function MetricCard({ icon: Icon, label, value, status, subtitle }: MetricCardProps) {
  const borderColor =
    status === 'good'
      ? 'border-l-green-500'
      : status === 'warning'
      ? 'border-l-amber-500'
      : 'border-l-border'

  return (
    <Card className={`p-4 bg-card-dark border-border border-l-2 ${borderColor}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted">{label}</span>
        <Icon className="w-4 h-4 text-muted" />
      </div>
      <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
      {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
    </Card>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function KeyFindings({
  plan,
  validation,
  keyFindings,
  showSimulationButton = true,
}: KeyFindingsProps) {
  const hasHighHazards = validation.materialSafety.hazards.some(
    h => h.hazardClass === 'high' || h.hazardClass === 'critical'
  )

  const hasCriticalHazards = validation.materialSafety.hazards.some(
    h => h.hazardClass === 'critical'
  )

  const costVariance = Math.abs(
    ((validation.costAccuracy.confidenceInterval[1] - validation.costAccuracy.totalCost) /
      validation.costAccuracy.totalCost) *
      100
  ).toFixed(0)

  return (
    <div className="space-y-6">
      {/* Validation Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={BookOpen}
          label="Literature Alignment"
          value={`${validation.literatureAlignment.confidence}%`}
          status={validation.literatureAlignment.confidence >= 70 ? 'good' : 'warning'}
          subtitle={`${validation.literatureAlignment.matchedPapers} papers matched`}
        />
        <MetricCard
          icon={Shield}
          label="Safety Rating"
          value={validation.materialSafety.allChecked ? 'Pass' : 'Review'}
          status={hasCriticalHazards ? 'warning' : 'good'}
          subtitle={`${validation.materialSafety.hazards.length} hazards identified`}
        />
        <MetricCard
          icon={Wrench}
          label="Equipment Tier"
          value={validation.equipmentFeasibility.tier}
          status="good"
          subtitle={`${validation.equipmentFeasibility.available.length} available`}
        />
        <MetricCard
          icon={DollarSign}
          label="Cost Estimate"
          value={`$${validation.costAccuracy.totalCost.toFixed(0)}`}
          status="good"
          subtitle={`±${costVariance}%`}
        />
      </div>

      {/* Key Findings from AI Analysis */}
      {keyFindings.length > 0 && (
        <Card className="p-6 bg-card-dark border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">Key Findings</h3>
          <div className="space-y-3">
            {keyFindings.map((finding, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border ${
                  finding.type === 'recommendation'
                    ? 'bg-green-500/5 border-green-500/20'
                    : finding.type === 'warning'
                    ? 'bg-amber-500/5 border-amber-500/20'
                    : 'bg-background border-border'
                }`}
              >
                <div className="flex items-start gap-2">
                  {finding.type === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{finding.title}</p>
                    {finding.description && (
                      <p className="text-xs text-muted mt-1">{finding.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* High Hazard Warning */}
      {hasHighHazards && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-amber-400 mb-2">
                High Hazard Materials Detected
              </h4>
              <ul className="text-xs text-muted space-y-1 list-disc list-inside">
                {validation.materialSafety.hazards
                  .filter(h => h.hazardClass === 'high' || h.hazardClass === 'critical')
                  .map((h, i) => (
                    <li key={i}>
                      {h.material} - {h.handlingRequirements.join(', ')}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Recommendations */}
      <Card className="p-6 bg-card-dark border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recommended Next Steps</h3>

        <div className="space-y-3">
          {/* Simulation recommendation */}
          {showSimulationButton && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground mb-2">Run Simulation</p>
                  <p className="text-xs text-muted mb-3">
                    Validate experimental conditions and predict outcomes before lab work
                  </p>
                  <SendToSimulationsButton plan={plan} validation={validation} />
                </div>
              </div>
            </div>
          )}

          {/* Literature recommendations */}
          {validation.literatureAlignment.recommendations.map((rec, i) => (
            <div key={i} className="p-3 rounded-lg bg-background border border-border">
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted">{rec}</span>
              </div>
            </div>
          ))}

          {/* Equipment unavailable warning */}
          {validation.equipmentFeasibility.unavailable.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 text-sm text-muted">
                  <p className="font-medium text-amber-400 mb-1">Equipment Unavailable:</p>
                  <p>{validation.equipmentFeasibility.unavailable.join(', ')}</p>
                  <p className="mt-2 text-xs">
                    Consider alternatives or contact facility manager for access.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Required PPE */}
      {validation.materialSafety.requiredPPE.length > 0 && (
        <Card className="p-4 bg-card-dark border-border">
          <h4 className="text-sm font-medium text-foreground mb-3">
            Required Personal Protective Equipment
          </h4>
          <div className="flex flex-wrap gap-2">
            {validation.materialSafety.requiredPPE.map((ppe, i) => (
              <Badge key={i} variant="secondary">
                {ppe}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Literature Deviations */}
      {validation.literatureAlignment.deviations.length > 0 && (
        <Card className="p-4 bg-card-dark border-border">
          <h4 className="text-sm font-medium text-foreground mb-3">
            Protocol Deviations from Literature
          </h4>
          <ul className="text-sm text-muted space-y-2 list-disc list-inside">
            {validation.literatureAlignment.deviations.map((dev, i) => (
              <li key={i}>{dev}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

export default KeyFindings
