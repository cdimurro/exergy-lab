'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import { AlertTriangle, Shield, ChevronDown, ChevronUp, Info } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export type Severity = 1 | 2 | 3 | 4 | 5
export type Likelihood = 1 | 2 | 3 | 4 | 5

export interface Risk {
  id: string
  name: string
  description: string
  category: 'chemical' | 'physical' | 'equipment' | 'process' | 'environmental'
  severity: Severity
  likelihood: Likelihood
  mitigations: string[]
  residualSeverity?: Severity
  residualLikelihood?: Likelihood
}

export interface RiskMatrixData {
  risks: Risk[]
  overallScore: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

interface RiskMatrixProps {
  data: RiskMatrixData
  showDetails?: boolean
  onRiskClick?: (risk: Risk) => void
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const SEVERITY_LABELS: Record<Severity, string> = {
  1: 'Negligible',
  2: 'Minor',
  3: 'Moderate',
  4: 'Major',
  5: 'Catastrophic',
}

const LIKELIHOOD_LABELS: Record<Likelihood, string> = {
  1: 'Rare',
  2: 'Unlikely',
  3: 'Possible',
  4: 'Likely',
  5: 'Almost Certain',
}

const CATEGORY_COLORS: Record<Risk['category'], { bg: string; text: string }> = {
  chemical: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  physical: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
  equipment: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  process: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
  environmental: { bg: 'bg-green-500/20', text: 'text-green-400' },
}

// ============================================================================
// Component
// ============================================================================

export function RiskMatrix({
  data,
  showDetails = true,
  onRiskClick,
  className = '',
}: RiskMatrixProps) {
  const [expandedRiskId, setExpandedRiskId] = useState<string | null>(null)

  // Calculate risk score (severity × likelihood)
  const getRiskScore = (severity: Severity, likelihood: Likelihood): number => {
    return severity * likelihood
  }

  // Get color for risk score
  const getRiskColor = (score: number): string => {
    if (score >= 20) return 'bg-red-500 text-white'
    if (score >= 12) return 'bg-orange-500 text-white'
    if (score >= 6) return 'bg-yellow-500 text-black'
    return 'bg-green-500 text-white'
  }

  // Get cell color for matrix
  const getCellColor = (severity: Severity, likelihood: Likelihood): string => {
    const score = getRiskScore(severity, likelihood)
    if (score >= 20) return 'bg-red-500/80'
    if (score >= 12) return 'bg-orange-500/60'
    if (score >= 6) return 'bg-yellow-500/40'
    return 'bg-green-500/30'
  }

  // Map risks to matrix cells
  const riskMatrix = useMemo(() => {
    const matrix: Record<string, Risk[]> = {}

    for (let s = 1; s <= 5; s++) {
      for (let l = 1; l <= 5; l++) {
        const key = `${s}-${l}`
        matrix[key] = data.risks.filter(
          (r) => r.severity === s && r.likelihood === l
        )
      }
    }

    return matrix
  }, [data.risks])

  // Sort risks by score (highest first)
  const sortedRisks = useMemo(() => {
    return [...data.risks].sort((a, b) => {
      const scoreA = getRiskScore(a.severity, a.likelihood)
      const scoreB = getRiskScore(b.severity, b.likelihood)
      return scoreB - scoreA
    })
  }, [data.risks])

  // Count risks by level
  const riskCounts = useMemo(() => {
    return {
      critical: data.risks.filter((r) => getRiskScore(r.severity, r.likelihood) >= 20).length,
      high: data.risks.filter(
        (r) =>
          getRiskScore(r.severity, r.likelihood) >= 12 &&
          getRiskScore(r.severity, r.likelihood) < 20
      ).length,
      medium: data.risks.filter(
        (r) =>
          getRiskScore(r.severity, r.likelihood) >= 6 &&
          getRiskScore(r.severity, r.likelihood) < 12
      ).length,
      low: data.risks.filter((r) => getRiskScore(r.severity, r.likelihood) < 6).length,
    }
  }, [data.risks])

  const toggleRisk = (riskId: string) => {
    setExpandedRiskId(expandedRiskId === riskId ? null : riskId)
  }

  return (
    <div className={`bg-zinc-800 rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="text-sm font-medium text-white">Risk Assessment</h3>
          </div>
          <span
            className={`px-2 py-1 text-xs rounded ${
              data.riskLevel === 'critical'
                ? 'bg-red-500/20 text-red-400'
                : data.riskLevel === 'high'
                  ? 'bg-orange-500/20 text-orange-400'
                  : data.riskLevel === 'medium'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-green-500/20 text-green-400'
            }`}
          >
            {data.riskLevel.charAt(0).toUpperCase() + data.riskLevel.slice(1)} Risk
          </span>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Overall Score */}
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <div className="text-4xl font-bold text-white">{data.overallScore}</div>
            <div className="text-sm text-zinc-400">Risk Score</div>
          </div>
          <div className="w-px h-12 bg-zinc-700" />
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{data.risks.length}</div>
            <div className="text-sm text-zinc-400">Identified Risks</div>
          </div>
        </div>

        {/* Risk Level Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="p-2 bg-red-500/10 rounded text-center">
            <div className="text-lg font-bold text-red-400">{riskCounts.critical}</div>
            <div className="text-xs text-red-400">Critical</div>
          </div>
          <div className="p-2 bg-orange-500/10 rounded text-center">
            <div className="text-lg font-bold text-orange-400">{riskCounts.high}</div>
            <div className="text-xs text-orange-400">High</div>
          </div>
          <div className="p-2 bg-yellow-500/10 rounded text-center">
            <div className="text-lg font-bold text-yellow-400">{riskCounts.medium}</div>
            <div className="text-xs text-yellow-400">Medium</div>
          </div>
          <div className="p-2 bg-green-500/10 rounded text-center">
            <div className="text-lg font-bold text-green-400">{riskCounts.low}</div>
            <div className="text-xs text-green-400">Low</div>
          </div>
        </div>

        {/* Risk Matrix Grid */}
        <div>
          <h4 className="text-xs font-medium text-zinc-400 uppercase mb-3">
            Risk Matrix (Severity x Likelihood)
          </h4>
          <div className="relative">
            {/* Y-axis label */}
            <div className="absolute -left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-zinc-500 whitespace-nowrap">
              Severity
            </div>

            <div className="ml-8 overflow-x-auto">
              <div className="min-w-[280px]">
              {/* Matrix header */}
              <div className="grid grid-cols-6 gap-1 mb-1">
                <div />
                {([1, 2, 3, 4, 5] as Likelihood[]).map((l) => (
                  <div
                    key={l}
                    className="text-center text-xs text-zinc-500"
                    title={LIKELIHOOD_LABELS[l]}
                  >
                    L{l}
                  </div>
                ))}
              </div>

              {/* Matrix rows */}
              {([5, 4, 3, 2, 1] as Severity[]).map((s) => (
                <div key={s} className="grid grid-cols-6 gap-1 mb-1">
                  <div
                    className="text-right text-xs text-zinc-500 pr-2"
                    title={SEVERITY_LABELS[s]}
                  >
                    S{s}
                  </div>
                  {([1, 2, 3, 4, 5] as Likelihood[]).map((l) => {
                    const cellRisks = riskMatrix[`${s}-${l}`]
                    const hasRisks = cellRisks.length > 0

                    return (
                      <div
                        key={l}
                        className={`h-8 rounded flex items-center justify-center text-xs font-medium
                                  ${getCellColor(s, l)} ${hasRisks ? 'ring-2 ring-white/50' : ''}`}
                        title={`S${s}/L${l}: ${hasRisks ? cellRisks.map((r) => r.name).join(', ') : 'No risks'}`}
                      >
                        {hasRisks && cellRisks.length}
                      </div>
                    )
                  })}
                </div>
              ))}

              {/* X-axis label */}
              <div className="text-center text-xs text-zinc-500 mt-2">Likelihood</div>
              </div>
            </div>
          </div>
        </div>

        {/* Risk List */}
        {showDetails && sortedRisks.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-zinc-400 uppercase mb-3">
              Identified Risks
            </h4>
            <div className="space-y-2">
              {sortedRisks.map((risk) => {
                const score = getRiskScore(risk.severity, risk.likelihood)
                const isExpanded = expandedRiskId === risk.id
                const colors = CATEGORY_COLORS[risk.category]

                return (
                  <div
                    key={risk.id}
                    className="bg-zinc-900 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleRisk(risk.id)}
                      className="w-full p-3 flex items-center justify-between hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${getRiskColor(score)}`}
                        >
                          {score}
                        </div>
                        <div className="text-left">
                          <div className="text-sm text-zinc-200">{risk.name}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                              {risk.category}
                            </span>
                            <span className="text-xs text-zinc-500">
                              S{risk.severity}/L{risk.likelihood}
                            </span>
                          </div>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-zinc-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-zinc-400" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="px-3 pb-3 pt-0 border-t border-zinc-800">
                        <p className="text-sm text-zinc-400 mt-2">{risk.description}</p>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="p-2 bg-zinc-800 rounded">
                            <div className="text-zinc-500">Severity</div>
                            <div className="text-zinc-300">
                              {risk.severity} - {SEVERITY_LABELS[risk.severity]}
                            </div>
                          </div>
                          <div className="p-2 bg-zinc-800 rounded">
                            <div className="text-zinc-500">Likelihood</div>
                            <div className="text-zinc-300">
                              {risk.likelihood} - {LIKELIHOOD_LABELS[risk.likelihood]}
                            </div>
                          </div>
                        </div>

                        {risk.mitigations.length > 0 && (
                          <div className="mt-3">
                            <div className="flex items-center gap-1 text-xs text-emerald-400 mb-1">
                              <Shield className="w-3 h-3" />
                              Mitigations
                            </div>
                            <ul className="space-y-1">
                              {risk.mitigations.map((mit, idx) => (
                                <li
                                  key={idx}
                                  className="text-xs text-zinc-400 flex items-start gap-2"
                                >
                                  <span className="text-emerald-500 mt-0.5">•</span>
                                  {mit}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {risk.residualSeverity && risk.residualLikelihood && (
                          <div className="mt-3 p-2 bg-emerald-900/20 border border-emerald-800 rounded">
                            <div className="text-xs text-emerald-400">
                              Residual Risk: {getRiskScore(risk.residualSeverity, risk.residualLikelihood)}
                              {' '}(from {score})
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="p-3 bg-zinc-900 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
            <Info className="w-3 h-3" />
            Risk Score Legend
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-zinc-400">20-25 Critical</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-orange-500" />
              <span className="text-zinc-400">12-19 High</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-yellow-500" />
              <span className="text-zinc-400">6-11 Medium</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-zinc-400">1-5 Low</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
