'use client'

/**
 * PhaseResultsDropdown Component
 *
 * Displays expandable key findings after each discovery phase completes.
 * Shows summary, key findings, what worked, challenges, and refinements.
 */

import * as React from 'react'
import { useState } from 'react'
import { ChevronDown, CheckCircle2, AlertCircle, Info, Lightbulb } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getCriterionName } from '@/lib/ai/rubrics/criterion-names'
import { Badge } from '@/components/ui/badge'

// ============================================================================
// Types
// ============================================================================

export interface PhaseKeyFindings {
  summary: string
  keyFindings: string[]
  score?: number
  iterations?: number
  highlights?: {
    whatWorked: string[]
    challenges: string[]
    refinements: string[]
  }
}

export interface PhaseResultsDropdownProps {
  phase: string
  phaseName: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  results: PhaseKeyFindings | null
  className?: string
}

// ============================================================================
// Phase Names Map
// ============================================================================

const PHASE_DISPLAY_NAMES: Record<string, string> = {
  research: 'Research',
  synthesis: 'Synthesis',
  hypothesis: 'Hypothesis Generation',
  screening: 'Screening',
  experiment: 'Experiment Design',
  simulation: 'Simulation',
  exergy: 'Exergy Analysis',
  tea: 'TEA Analysis',
  patent: 'Patent Analysis',
  validation: 'Validation',
  rubric_eval: 'Rubric Evaluation',
  publication: 'Publication',
}

// ============================================================================
// Main Component
// ============================================================================

export function PhaseResultsDropdown({
  phase,
  phaseName,
  status,
  results,
  className,
}: PhaseResultsDropdownProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Only show for completed phases with results
  if (status !== 'completed' || !results) return null

  const displayName = PHASE_DISPLAY_NAMES[phase] || phaseName || phase

  return (
    <div className={cn('mt-2', className)}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'flex items-center gap-2 text-sm transition-colors',
          'text-muted-foreground hover:text-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary/50 rounded-md px-2 py-1 -ml-2'
        )}
      >
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )}
        />
        <span>See Results</span>
        {results.score !== undefined && (
          <Badge
            variant={results.score >= 7 ? 'success' : results.score >= 5 ? 'warning' : 'error'}
            className="text-xs"
          >
            {results.score.toFixed(1)}/10
          </Badge>
        )}
        {results.iterations !== undefined && results.iterations > 1 && (
          <span className="text-xs text-muted-foreground">
            ({results.iterations} iterations)
          </span>
        )}
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="mt-3 ml-2 pl-4 border-l-2 border-border space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Summary */}
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-sm text-foreground">{results.summary}</p>
          </div>

          {/* Key Findings */}
          {results.keyFindings.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Key Findings
                </span>
              </div>
              <ul className="space-y-1.5 ml-6">
                {results.keyFindings.map((finding, i) => (
                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Highlights Section */}
          {results.highlights && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* What Worked */}
              {results.highlights.whatWorked.length > 0 && (
                <div className="bg-emerald-500/5 rounded-lg p-3 border border-emerald-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                      What Worked
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {results.highlights.whatWorked.map((item, i) => (
                      <li key={i} className="text-sm text-foreground flex items-start gap-2">
                        <span className="text-emerald-500">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Challenges */}
              {results.highlights.challenges.length > 0 && (
                <div className="bg-amber-500/5 rounded-lg p-3 border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
                      Challenges
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {results.highlights.challenges.map((item, i) => (
                      <li key={i} className="text-sm text-foreground flex items-start gap-2">
                        <span className="text-amber-500">!</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Refinements Applied */}
              {results.highlights.refinements.length > 0 && (
                <div className="bg-blue-500/5 rounded-lg p-3 border border-blue-500/20 md:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
                      Refinements Applied
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {results.highlights.refinements.map((item, i) => (
                      <li key={i} className="text-sm text-foreground flex items-start gap-2">
                        <span className="text-blue-500">→</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Helper to generate phase key findings from raw results
// ============================================================================

export function generatePhaseKeyFindings(
  phase: string,
  result: any,
  judgeResult?: any
): PhaseKeyFindings | null {
  // Can generate from either result or judgeResult
  if (!result && !judgeResult) return null

  const passedCriteria = judgeResult?.itemScores?.filter((s: any) => s.passed) || []
  const failedCriteria = judgeResult?.itemScores?.filter((s: any) => !s.passed) || []

  // If we only have judgeResult (during progress), generate summary from that
  if (!result && judgeResult) {
    const score = judgeResult.totalScore
    const passed = judgeResult.passed
    const phaseName = PHASE_DISPLAY_NAMES[phase] || phase

    return {
      summary: judgeResult.reasoning ||
        `${phaseName} ${passed ? 'passed' : 'needs improvement'} with score ${score?.toFixed(1) || 'N/A'}/10. ${
          passed
            ? 'Met the quality threshold for this phase.'
            : 'Additional refinement may improve results.'
        }`,
      keyFindings: [
        ...(judgeResult.recommendations?.slice(0, 3) || []),
        ...(passedCriteria.length > 0 ? [`${passedCriteria.length} criteria passed`] : []),
        ...(failedCriteria.length > 0 ? [`${failedCriteria.length} criteria need attention`] : []),
      ].filter(Boolean),
      score: score,
      highlights: {
        whatWorked: passedCriteria.slice(0, 4).map((c: any) =>
          c.reasoning ? `${getCriterionName(c.itemId)}: ${c.reasoning}` : getCriterionName(c.itemId)
        ),
        challenges: failedCriteria.slice(0, 4).map((c: any) =>
          c.reasoning ? `${getCriterionName(c.itemId)}: ${c.reasoning}` : getCriterionName(c.itemId)
        ),
        refinements: judgeResult.recommendations?.slice(0, 3) || [],
      },
    }
  }

  switch (phase) {
    case 'research':
      return {
        summary: `Found ${result.keyFindings?.length || 0} research findings and ${result.materialsData?.length || 0} relevant materials from ${result.sources?.length || 0} sources.`,
        keyFindings: (result.keyFindings || []).slice(0, 5).map((f: any) =>
          typeof f === 'string' ? f : f.finding || f.summary || String(f)
        ),
        highlights: {
          whatWorked: result.sources?.length > 5 ? ['Retrieved comprehensive literature'] : [],
          challenges: result.gaps?.slice(0, 3) || [],
          refinements: [],
        },
      }

    case 'hypothesis':
      return {
        summary: `Generated ${result.hypotheses?.length || result.length || 0} hypotheses${judgeResult?.totalScore ? ` with score ${judgeResult.totalScore.toFixed(1)}/10` : ''}.`,
        keyFindings: ((result.hypotheses || result) as any[]).slice(0, 3).map((h: any) =>
          h.statement || h.title || String(h)
        ),
        score: judgeResult?.totalScore,
        iterations: result.iterations,
        highlights: {
          whatWorked: passedCriteria.slice(0, 3).map((c: any) => getCriterionName(c.itemId)),
          challenges: failedCriteria.slice(0, 3).map((c: any) => `${getCriterionName(c.itemId)}: ${c.reasoning || ''}`),
          refinements: result.refinementHints?.specificGuidance ? [result.refinementHints.specificGuidance] : [],
        },
      }

    case 'experiment':
      return {
        summary: `Designed ${result.experiments?.length || result.length || 0} experiments${judgeResult?.totalScore ? ` with score ${judgeResult.totalScore.toFixed(1)}/10` : ''}.`,
        keyFindings: ((result.experiments || result) as any[]).slice(0, 3).map((e: any) =>
          e.title || e.objective || String(e)
        ),
        score: judgeResult?.totalScore,
        iterations: result.iterations,
        highlights: {
          whatWorked: passedCriteria.slice(0, 3).map((c: any) => getCriterionName(c.itemId)),
          challenges: failedCriteria.slice(0, 3).map((c: any) => getCriterionName(c.itemId)),
          refinements: [],
        },
      }

    case 'simulation':
      return {
        summary: `Completed ${result.results?.length || 0} simulations with convergence analysis.`,
        keyFindings: (result.results || []).slice(0, 3).map((r: any) =>
          `${r.experimentId || 'Experiment'}: ${r.converged ? 'Converged' : 'Did not converge'}`
        ),
        score: judgeResult?.totalScore,
        highlights: {
          whatWorked: result.results?.filter((r: any) => r.converged).length > 0
            ? [`${result.results.filter((r: any) => r.converged).length} simulations converged`]
            : [],
          challenges: result.results?.filter((r: any) => !r.converged).length > 0
            ? [`${result.results.filter((r: any) => !r.converged).length} simulations did not converge`]
            : [],
          refinements: [],
        },
      }

    case 'exergy':
      return {
        summary: result.analysis?.summary || 'Exergy analysis completed.',
        keyFindings: [
          result.analysis?.efficiency ? `System efficiency: ${(result.analysis.efficiency * 100).toFixed(1)}%` : null,
          result.analysis?.exergyDestruction ? `Exergy destruction: ${result.analysis.exergyDestruction.toFixed(2)} kW` : null,
          result.analysis?.majorLosses?.[0] ? `Major loss: ${result.analysis.majorLosses[0]}` : null,
        ].filter(Boolean) as string[],
        score: judgeResult?.totalScore,
        highlights: {
          whatWorked: [],
          challenges: result.analysis?.majorLosses?.slice(0, 3) || [],
          refinements: result.analysis?.recommendations?.slice(0, 2) || [],
        },
      }

    case 'tea':
      return {
        summary: result.economics?.summary || 'Techno-economic analysis completed.',
        keyFindings: [
          result.economics?.npv ? `NPV: $${result.economics.npv.toLocaleString()}` : null,
          result.economics?.irr ? `IRR: ${(result.economics.irr * 100).toFixed(1)}%` : null,
          result.economics?.lcoe ? `LCOE: $${result.economics.lcoe.toFixed(4)}/kWh` : null,
          result.economics?.paybackPeriod ? `Payback: ${result.economics.paybackPeriod.toFixed(1)} years` : null,
        ].filter(Boolean) as string[],
        score: judgeResult?.totalScore,
        highlights: {
          whatWorked: result.economics?.strengths?.slice(0, 3) || [],
          challenges: result.economics?.risks?.slice(0, 3) || [],
          refinements: result.economics?.recommendations?.slice(0, 2) || [],
        },
      }

    default:
      return {
        summary: `${PHASE_DISPLAY_NAMES[phase] || phase} phase completed.`,
        keyFindings: [],
        score: judgeResult?.totalScore,
        highlights: {
          whatWorked: passedCriteria.slice(0, 3).map((c: any) => getCriterionName(c.itemId)),
          challenges: failedCriteria.slice(0, 3).map((c: any) => getCriterionName(c.itemId)),
          refinements: [],
        },
      }
  }
}

export default PhaseResultsDropdown
