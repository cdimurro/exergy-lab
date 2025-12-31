'use client'

import * as React from 'react'
import { useState } from 'react'
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Activity,
  ChevronDown,
  ChevronRight,
  Lightbulb,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical'
export type RiskLikelihood = 'rare' | 'unlikely' | 'possible' | 'likely' | 'certain'

export interface FailureMode {
  id: string
  name: string
  description: string
  severity: RiskSeverity
  likelihood: RiskLikelihood
  riskScore: number
  causes: string[]
  effects: string[]
  mitigations: string[]
  detectionMethods?: string[]
}

export interface RiskAnalysis {
  overallRiskScore: number
  riskLevel: RiskSeverity
  failureModes: FailureMode[]
  recommendations: string[]
  successProbability?: number
}

export interface AnalysisTabProps {
  analysis: RiskAnalysis | null
  isLoading?: boolean
  onFailureModeClick?: (mode: FailureMode) => void
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const SEVERITY_CONFIG: Record<RiskSeverity, { color: string; bg: string; label: string }> = {
  low: { color: 'text-green-400', bg: 'bg-green-500/10', label: 'Low' },
  medium: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', label: 'Medium' },
  high: { color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'High' },
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', label: 'Critical' },
}

const LIKELIHOOD_VALUES: Record<RiskLikelihood, number> = {
  rare: 1,
  unlikely: 2,
  possible: 3,
  likely: 4,
  certain: 5,
}

const SEVERITY_VALUES: Record<RiskSeverity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

// ============================================================================
// Component
// ============================================================================

export function AnalysisTab({
  analysis,
  isLoading = false,
  onFailureModeClick,
  className = '',
}: AnalysisTabProps) {
  const [expandedModes, setExpandedModes] = useState<Set<string>>(new Set())
  const [showMatrix, setShowMatrix] = useState(false)

  const toggleMode = (modeId: string) => {
    setExpandedModes((prev) => {
      const next = new Set(prev)
      if (next.has(modeId)) {
        next.delete(modeId)
      } else {
        next.add(modeId)
      }
      return next
    })
  }

  // Group failure modes by risk level
  const groupedModes = analysis?.failureModes.reduce(
    (acc, mode) => {
      const level = mode.severity
      if (!acc[level]) acc[level] = []
      acc[level].push(mode)
      return acc
    },
    {} as Record<RiskSeverity, FailureMode[]>
  )

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-zinc-800 rounded" />
          <div className="h-8 bg-zinc-800 rounded w-1/3" />
          <div className="h-32 bg-zinc-800 rounded" />
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <Activity className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400">No analysis available</p>
        <p className="text-sm text-zinc-500 mt-1">Generate a protocol to see risk analysis</p>
      </div>
    )
  }

  const severityConfig = SEVERITY_CONFIG[analysis.riskLevel]

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Risk Score Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg ${severityConfig.bg} border border-${severityConfig.color.replace('text-', '')}/30`}>
          <div className="text-xs text-zinc-400 uppercase mb-1">Overall Risk</div>
          <div className={`text-3xl font-bold ${severityConfig.color}`}>
            {analysis.overallRiskScore}/100
          </div>
          <div className={`text-sm ${severityConfig.color} mt-1`}>
            {severityConfig.label} Risk
          </div>
        </div>

        <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
          <div className="text-xs text-zinc-400 uppercase mb-1">Failure Modes</div>
          <div className="text-3xl font-bold text-white">
            {analysis.failureModes.length}
          </div>
          <div className="text-sm text-zinc-500 mt-1">
            Identified risks
          </div>
        </div>

        {analysis.successProbability !== undefined && (
          <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800">
            <div className="text-xs text-zinc-400 uppercase mb-1">Success Rate</div>
            <div className={`text-3xl font-bold ${
              analysis.successProbability >= 80 ? 'text-green-400' :
              analysis.successProbability >= 60 ? 'text-yellow-400' : 'text-orange-400'
            }`}>
              {analysis.successProbability}%
            </div>
            <div className="text-sm text-zinc-500 mt-1">
              Estimated
            </div>
          </div>
        )}
      </div>

      {/* Risk Matrix Toggle */}
      <div>
        <button
          onClick={() => setShowMatrix(!showMatrix)}
          className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          {showMatrix ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          View Risk Matrix
        </button>

        {showMatrix && (
          <div className="mt-4 p-4 bg-zinc-900 rounded-lg border border-zinc-800">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="p-2 text-left text-zinc-500">Likelihood / Severity</th>
                    <th className="p-2 text-center text-green-400">Low</th>
                    <th className="p-2 text-center text-yellow-400">Medium</th>
                    <th className="p-2 text-center text-orange-400">High</th>
                    <th className="p-2 text-center text-red-400">Critical</th>
                  </tr>
                </thead>
                <tbody>
                  {(['certain', 'likely', 'possible', 'unlikely', 'rare'] as RiskLikelihood[]).map((likelihood) => (
                    <tr key={likelihood}>
                      <td className="p-2 text-zinc-400 capitalize">{likelihood}</td>
                      {(['low', 'medium', 'high', 'critical'] as RiskSeverity[]).map((severity) => {
                        const count = analysis.failureModes.filter(
                          (m) => m.likelihood === likelihood && m.severity === severity
                        ).length
                        const score = LIKELIHOOD_VALUES[likelihood] * SEVERITY_VALUES[severity]
                        const cellColor = score >= 12 ? 'bg-red-500/20' :
                                         score >= 8 ? 'bg-orange-500/20' :
                                         score >= 4 ? 'bg-yellow-500/20' : 'bg-green-500/20'
                        return (
                          <td key={severity} className={`p-2 text-center ${cellColor} border border-zinc-800`}>
                            {count > 0 && <span className="font-medium text-white">{count}</span>}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Failure Modes List */}
      <div>
        <h3 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Failure Modes
        </h3>

        <div className="space-y-2">
          {analysis.failureModes
            .sort((a, b) => b.riskScore - a.riskScore)
            .map((mode) => {
              const config = SEVERITY_CONFIG[mode.severity]
              const isExpanded = expandedModes.has(mode.id)

              return (
                <div
                  key={mode.id}
                  className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden"
                >
                  <button
                    onClick={() => toggleMode(mode.id)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-zinc-800/50 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-200">{mode.name}</span>
                        <span className={`px-2 py-0.5 text-xs rounded ${config.bg} ${config.color}`}>
                          {config.label}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">{mode.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-lg font-bold ${config.color}`}>
                        {mode.riskScore}
                      </div>
                      <div className="text-xs text-zinc-500">Score</div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 pl-10 space-y-3">
                      {/* Causes */}
                      <div>
                        <h4 className="text-xs font-medium text-zinc-400 mb-1 flex items-center gap-1">
                          <TrendingDown className="w-3 h-3 text-red-400" />
                          Potential Causes
                        </h4>
                        <ul className="text-xs text-zinc-500 space-y-0.5 list-disc list-inside">
                          {mode.causes.map((cause, idx) => (
                            <li key={idx}>{cause}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Effects */}
                      <div>
                        <h4 className="text-xs font-medium text-zinc-400 mb-1 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-orange-400" />
                          Potential Effects
                        </h4>
                        <ul className="text-xs text-zinc-500 space-y-0.5 list-disc list-inside">
                          {mode.effects.map((effect, idx) => (
                            <li key={idx}>{effect}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Mitigations */}
                      <div>
                        <h4 className="text-xs font-medium text-zinc-400 mb-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                          Mitigations
                        </h4>
                        <ul className="text-xs text-zinc-500 space-y-0.5">
                          {mode.mitigations.map((mitigation, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-emerald-400 mt-0.5">*</span>
                              {mitigation}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Detection Methods */}
                      {mode.detectionMethods && mode.detectionMethods.length > 0 && (
                        <div>
                          <h4 className="text-xs font-medium text-zinc-400 mb-1 flex items-center gap-1">
                            <Activity className="w-3 h-3 text-blue-400" />
                            Detection Methods
                          </h4>
                          <ul className="text-xs text-zinc-500 space-y-0.5 list-disc list-inside">
                            {mode.detectionMethods.map((method, idx) => (
                              <li key={idx}>{method}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      </div>

      {/* Recommendations */}
      {analysis.recommendations.length > 0 && (
        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <h4 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Recommendations
          </h4>
          <ul className="space-y-2">
            {analysis.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-zinc-300">
                <span className="text-blue-400 mt-0.5">{idx + 1}.</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
