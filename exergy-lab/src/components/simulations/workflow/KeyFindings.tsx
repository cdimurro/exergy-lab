'use client'

/**
 * KeyFindings Component
 *
 * Displays simulation results with key metrics and AI insights.
 */

import { TrendingUp, TrendingDown, Minus, Info, AlertTriangle, CheckCircle, ArrowRight, Zap, Activity, BarChart3, GitCompare, Target, FlaskConical, Microscope } from 'lucide-react'
import { Card, Badge } from '@/components/ui'
import type { SimulationResult } from '@/types/simulation'
import type { SimulationPlan, RecommendationAction } from '@/types/simulation-workflow'
import { parseRecommendations } from '@/lib/recommendation-parser'

export interface KeyFindingsProps {
  results: SimulationResult
  plan: SimulationPlan | null
  onActionClick?: (action: RecommendationAction) => void
}

// Icon mapping for recommendation types
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap,
  TrendingUp,
  Activity,
  BarChart3,
  GitCompare,
  Target,
  FlaskConical,
  Microscope,
  ArrowRight,
}

// Metric interpretation for common outputs
const METRIC_INTERPRETATIONS: Record<string, { good: [number, number]; unit: string; description: string }> = {
  efficiency: {
    good: [15, 100],
    unit: '%',
    description: 'Ratio of useful output to total input energy',
  },
  'thermal efficiency': {
    good: [10, 50],
    unit: '%',
    description: 'Fraction of thermal energy converted to work',
  },
  'power output': {
    good: [0, Infinity],
    unit: 'MW',
    description: 'Electrical power generated',
  },
  lcoe: {
    good: [0, 100],
    unit: '$/MWh',
    description: 'Levelized cost of energy over plant lifetime',
  },
  'capacity factor': {
    good: [50, 100],
    unit: '%',
    description: 'Actual output as percentage of maximum possible',
  },
  'exergy efficiency': {
    good: [30, 100],
    unit: '%',
    description: 'Second-law efficiency accounting for entropy generation',
  },
}

export function KeyFindings({ results, plan, onActionClick }: KeyFindingsProps) {
  // Get key metrics (high significance)
  const keyMetrics = results.metrics.filter((m) => {
    const name = m.name.toLowerCase()
    return (
      name.includes('efficiency') ||
      name.includes('power') ||
      name.includes('lcoe') ||
      name.includes('capacity')
    )
  })

  // Get other metrics
  const otherMetrics = results.metrics.filter(
    (m) => !keyMetrics.includes(m)
  )

  // Parse structured insights if available
  const insights = results.structuredInsights

  // Parse recommendations into actionable items
  const parsedRecommendations =
    insights?.recommendations && plan
      ? parseRecommendations(insights.recommendations, {
          currentTier: plan.tier,
          simulationType: plan.simulationType,
          currentGoal: plan.methodology || '',
        })
      : { actions: [], unmapped: [] }

  const getMetricStatus = (name: string, value: number): 'good' | 'neutral' | 'warning' => {
    const lowerName = name.toLowerCase()
    const interpretation = Object.entries(METRIC_INTERPRETATIONS).find(([key]) =>
      lowerName.includes(key)
    )?.[1]

    if (!interpretation) return 'neutral'

    const [min, max] = interpretation.good
    if (value >= min && value <= max) return 'good'
    return 'warning'
  }

  const StatusIcon = ({ status }: { status: 'good' | 'neutral' | 'warning' }) => {
    switch (status) {
      case 'good':
        return <TrendingUp className="w-4 h-4 text-green-400" />
      case 'warning':
        return <TrendingDown className="w-4 h-4 text-amber-400" />
      default:
        return <Minus className="w-4 h-4 text-muted" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {keyMetrics.map((metric, i) => {
          const status = getMetricStatus(metric.name, metric.value)
          const lowerName = metric.name.toLowerCase()
          const interpretation = Object.entries(METRIC_INTERPRETATIONS).find(
            ([key]) => lowerName.includes(key)
          )?.[1]

          return (
            <Card
              key={i}
              className={`p-4 bg-card-dark border-border ${
                status === 'good'
                  ? 'border-l-2 border-l-green-500'
                  : status === 'warning'
                  ? 'border-l-2 border-l-amber-500'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted">{metric.name}</span>
                {interpretation && (
                  <span title={interpretation.description}>
                    <Info className="w-4 h-4 text-muted cursor-help" />
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {metric.value.toFixed(2)}
                </span>
                <span className="text-sm text-muted">{metric.unit}</span>
              </div>
              {metric.uncertainty && (
                <p className="text-xs text-muted mt-1">
                  +/- {metric.uncertainty.toFixed(1)}% (95% CI)
                </p>
              )}
              <div className="flex items-center gap-1 mt-2">
                <StatusIcon status={status} />
                <span className="text-xs text-muted">
                  {status === 'good'
                    ? 'Within expected range'
                    : status === 'warning'
                    ? 'Outside typical range'
                    : 'Nominal value'}
                </span>
              </div>
            </Card>
          )
        })}
      </div>

      {/* AI Insights */}
      {insights && (
        <Card className="p-4 bg-card-dark border-border">
          <h4 className="text-sm font-medium text-foreground mb-3">AI Analysis</h4>

          {/* Summary */}
          {insights.summary && (
            <p className="text-sm text-muted mb-4">{insights.summary}</p>
          )}

          {/* Observations */}
          {insights.observations.length > 0 && (
            <div className="mb-4">
              <h5 className="text-xs font-medium text-muted mb-2">
                Key Observations
              </h5>
              <ul className="space-y-2">
                {insights.observations.map((obs, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted">{obs}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {insights.warnings.length > 0 && (
            <div className="mb-4">
              <h5 className="text-xs font-medium text-amber-400 mb-2">Warnings</h5>
              <ul className="space-y-2">
                {insights.warnings.map((warn, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <span className="text-muted">{warn}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommended Next Steps - Interactive Actions */}
          {(parsedRecommendations.actions.length > 0 || parsedRecommendations.unmapped.length > 0) && (
            <div>
              <h5 className="text-xs font-medium text-muted mb-3">
                Recommended Next Steps
              </h5>

              {/* Interactive Action Cards */}
              {parsedRecommendations.actions.length > 0 && (
                <div className="space-y-2 mb-3">
                  {parsedRecommendations.actions.map((action) => {
                    const IconComponent = ICON_MAP[action.icon] || ArrowRight

                    return (
                      <button
                        key={action.id}
                        onClick={() => onActionClick?.(action)}
                        className="w-full text-left p-3 rounded-lg bg-primary/5 hover:bg-primary/10 border border-primary/20 hover:border-primary/30 transition-all group"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <IconComponent className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium text-foreground">
                                {action.title}
                              </span>
                              {action.targetTier && (
                                <Badge variant="secondary" className="text-xs">
                                  {action.targetTier.toUpperCase()}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted">
                              {action.description}
                            </p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Unmapped Recommendations (fallback) */}
              {parsedRecommendations.unmapped.length > 0 && (
                <ul className="space-y-2">
                  {parsedRecommendations.unmapped.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <TrendingUp className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-muted">{rec}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      )}

      {/* All Metrics Table */}
      {otherMetrics.length > 0 && (
        <Card className="p-4 bg-card-dark border-border">
          <h4 className="text-sm font-medium text-foreground mb-3">All Metrics</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="pb-2 font-medium">Metric</th>
                  <th className="pb-2 font-medium text-right">Value</th>
                  <th className="pb-2 font-medium text-right">Unit</th>
                  <th className="pb-2 font-medium text-right">Uncertainty</th>
                </tr>
              </thead>
              <tbody>
                {otherMetrics.map((metric, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 text-foreground">{metric.name}</td>
                    <td className="py-2 text-right font-mono text-foreground">
                      {metric.value.toFixed(4)}
                    </td>
                    <td className="py-2 text-right text-muted">{metric.unit}</td>
                    <td className="py-2 text-right text-muted">
                      {metric.uncertainty ? `+/- ${metric.uncertainty.toFixed(1)}%` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Confidence Interval Explanation */}
      <div className="p-3 rounded-lg bg-card-dark border border-border">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-muted mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted">
            Values shown with +/- X% represent the 95% confidence interval from Monte Carlo simulation.
            This means we are 95% confident the true value falls within this range.
          </p>
        </div>
      </div>
    </div>
  )
}

export default KeyFindings
