'use client'

import * as React from 'react'
import { AlertOctagon, TrendingUp, Shield, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, Badge, Progress } from '@/components/ui'
import type { FailureAnalysis, FailureMode } from '@/types/experiment'

export interface FailureAnalysisProps {
  analysis: FailureAnalysis
}

export function FailureAnalysisComponent({ analysis }: FailureAnalysisProps) {
  const [expandedModes, setExpandedModes] = React.useState<Set<number>>(new Set([0]))

  const toggleMode = (index: number) => {
    setExpandedModes((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const getRiskColor = (score: number) => {
    if (score >= 75) return { bg: 'bg-red-100', text: 'text-red-700', progress: 'error' as const }
    if (score >= 50) return { bg: 'bg-amber-100', text: 'text-amber-700', progress: 'warning' as const }
    if (score >= 25) return { bg: 'bg-primary/10', text: 'text-primary', progress: 'default' as const }
    return { bg: 'bg-green-100', text: 'text-green-700', progress: 'success' as const }
  }

  const getFrequencyBadge = (frequency: string) => {
    switch (frequency) {
      case 'common':
        return <Badge variant="error" size="sm">Common</Badge>
      case 'occasional':
        return <Badge variant="warning" size="sm">Occasional</Badge>
      case 'rare':
        return <Badge variant="success" size="sm">Rare</Badge>
      default:
        return <Badge variant="secondary" size="sm">{frequency}</Badge>
    }
  }

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'critical':
        return <Badge variant="error" size="sm">Critical</Badge>
      case 'high':
        return <Badge variant="warning" size="sm">High</Badge>
      case 'medium':
        return <Badge variant="primary" size="sm">Medium</Badge>
      case 'low':
        return <Badge variant="success" size="sm">Low</Badge>
      default:
        return <Badge variant="secondary" size="sm">{impact}</Badge>
    }
  }

  const riskColor = getRiskColor(analysis.riskScore)

  return (
    <div className="space-y-6">
      {/* Risk Score Overview */}
      <Card className={`${riskColor.bg} border-2`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-background-elevated">
              <AlertOctagon className={`w-6 h-6 ${riskColor.text}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Overall Risk Score</h3>
              <p className="text-sm text-foreground-muted">Based on failure mode analysis</p>
            </div>
          </div>
          <div className={`text-4xl font-bold ${riskColor.text}`}>
            {analysis.riskScore}
            <span className="text-xl">/100</span>
          </div>
        </div>

        <Progress
          value={analysis.riskScore}
          variant={riskColor.progress}
          showPercentage={false}
          size="lg"
        />

        <p className="mt-3 text-sm text-foreground-muted">
          {analysis.riskScore >= 75 && 'High risk - extensive mitigation required'}
          {analysis.riskScore >= 50 && analysis.riskScore < 75 && 'Moderate risk - implement preventions carefully'}
          {analysis.riskScore >= 25 && analysis.riskScore < 50 && 'Low-moderate risk - follow standard protocols'}
          {analysis.riskScore < 25 && 'Low risk - maintain standard safety practices'}
        </p>
      </Card>

      {/* Potential Failure Modes */}
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Potential Failure Modes ({analysis.potentialFailures.length})
        </h3>

        <div className="space-y-3">
          {analysis.potentialFailures.map((failure, index) => (
            <div
              key={index}
              className="border border-border rounded-lg overflow-hidden bg-background-elevated"
            >
              {/* Header */}
              <button
                onClick={() => toggleMode(index)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-background-surface transition-colors"
              >
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-foreground">{failure.description}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getFrequencyBadge(failure.frequency)}
                    {getImpactBadge(failure.impact)}
                  </div>
                </div>
                {expandedModes.has(index) ? (
                  <ChevronUp className="w-5 h-5 text-foreground-muted shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-foreground-muted shrink-0" />
                )}
              </button>

              {/* Expanded Content */}
              {expandedModes.has(index) && (
                <div className="px-4 pb-4 space-y-4 border-t border-border">
                  {/* Causes */}
                  <div className="pt-4">
                    <p className="text-sm font-medium text-foreground mb-2">Root Causes:</p>
                    <ul className="space-y-1">
                      {failure.causes.map((cause, i) => (
                        <li key={i} className="text-sm text-foreground-muted flex items-start gap-2">
                          <span className="text-red-500 shrink-0">•</span>
                          <span>{cause}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Preventions */}
                  <div>
                    <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-600" />
                      Prevention Strategies:
                    </p>
                    <ul className="space-y-1">
                      {failure.preventions.map((prevention, i) => (
                        <li key={i} className="text-sm text-foreground-muted flex items-start gap-2">
                          <span className="text-green-600 shrink-0">✓</span>
                          <span>{prevention}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Similar Experiments */}
                  {failure.similarExperiments && failure.similarExperiments.length > 0 && (
                    <div className="p-3 rounded-lg bg-background-surface border border-border">
                      <p className="text-xs font-medium text-foreground mb-2">
                        Historical Context:
                      </p>
                      <ul className="space-y-1">
                        {failure.similarExperiments.map((exp, i) => (
                          <li key={i} className="text-xs text-foreground-muted flex items-start gap-2">
                            <span className="shrink-0">📚</span>
                            <span>{exp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Recommendations */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent-purple/5 border-primary/20">
        <h3 className="text-lg font-semibold text-foreground mb-4">Expert Recommendations</h3>
        <ul className="space-y-3">
          {analysis.recommendations.map((rec, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold shrink-0">
                {index + 1}
              </div>
              <p className="text-sm text-foreground pt-0.5">{rec}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
