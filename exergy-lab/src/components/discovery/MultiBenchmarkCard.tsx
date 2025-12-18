'use client'

/**
 * MultiBenchmarkCard Component
 *
 * Displays multi-benchmark validation results including:
 * - Overall aggregated score
 * - Agreement level indicator
 * - Individual benchmark rows with expandable details
 * - Discrepancy warnings
 * - Confidence breakdown
 * - Prioritized recommendations
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type {
  AggregatedValidation,
  BenchmarkResult,
  BenchmarkType,
  Discrepancy,
  ValidationRecommendation,
  ConfidenceBreakdown,
} from '@/lib/ai/validation/types'
import {
  Check,
  X,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Info,
  Lightbulb,
  Scale,
  TrendingUp,
  TrendingDown,
  Activity,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface MultiBenchmarkCardProps {
  validation: AggregatedValidation
  onFeedback?: (benchmarkType: BenchmarkType, itemId: string, helpful: boolean) => void
  className?: string
}

// ============================================================================
// Benchmark Metadata
// ============================================================================

const BENCHMARK_META: Record<BenchmarkType, {
  name: string
  icon: React.ComponentType<{ className?: string; size?: number }>
  description: string
  color: string
}> = {
  frontierscience: {
    name: 'FrontierScience',
    icon: Activity,
    description: 'Scientific rigor and methodology',
    color: 'text-blue-500',
  },
  domain_specific: {
    name: 'Domain',
    icon: Scale,
    description: 'Physical and engineering constraints',
    color: 'text-purple-500',
  },
  practicality: {
    name: 'Practicality',
    icon: TrendingUp,
    description: 'Real-world feasibility',
    color: 'text-green-500',
  },
  literature: {
    name: 'Literature',
    icon: Info,
    description: 'Published research consistency',
    color: 'text-amber-500',
  },
  simulation_convergence: {
    name: 'Convergence',
    icon: Activity,
    description: 'Numerical validation',
    color: 'text-cyan-500',
  },
}

// ============================================================================
// Main Component
// ============================================================================

export function MultiBenchmarkCard({
  validation,
  onFeedback,
  className,
}: MultiBenchmarkCardProps) {
  const [expandedBenchmarks, setExpandedBenchmarks] = useState<Set<BenchmarkType>>(new Set())
  const [showConfidence, setShowConfidence] = useState(false)

  const toggleBenchmark = (benchmarkType: BenchmarkType) => {
    setExpandedBenchmarks(prev => {
      const next = new Set(prev)
      if (next.has(benchmarkType)) {
        next.delete(benchmarkType)
      } else {
        next.add(benchmarkType)
      }
      return next
    })
  }

  return (
    <div className={cn('border rounded-xl overflow-hidden bg-card', className)}>
      {/* Header with overall score */}
      <div className="p-5 border-b bg-gradient-to-br from-background to-muted/30">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Multi-Benchmark Validation
            </h3>
            <p className="text-sm text-muted-foreground">
              {validation.benchmarks.length} benchmarks evaluated
            </p>
          </div>
          <AgreementBadge level={validation.agreementLevel} />
        </div>

        {/* Overall Score */}
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-2">
            <span className={cn(
              'text-4xl font-bold',
              validation.overallPassed ? 'text-emerald-500' : 'text-red-500'
            )}>
              {validation.overallScore.toFixed(1)}
            </span>
            <span className="text-lg text-muted-foreground">/10</span>
          </div>
          <div className={cn(
            'px-3 py-1 rounded-full text-sm font-medium',
            validation.overallPassed
              ? 'bg-emerald-500/10 text-emerald-600'
              : 'bg-red-500/10 text-red-600'
          )}>
            {validation.overallPassed ? 'PASSED' : 'FAILED'}
          </div>
        </div>

        {/* Confidence toggle */}
        <button
          onClick={() => setShowConfidence(!showConfidence)}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          {showConfidence ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {showConfidence ? 'Hide' : 'Show'} confidence breakdown
        </button>

        {showConfidence && (
          <ConfidenceBreakdownDisplay breakdown={validation.confidenceBreakdown} />
        )}
      </div>

      {/* Discrepancies warning */}
      {validation.discrepancies.length > 0 && (
        <DiscrepanciesSection discrepancies={validation.discrepancies} />
      )}

      {/* Benchmark rows */}
      <div className="divide-y">
        {validation.benchmarks.map(benchmark => (
          <BenchmarkRow
            key={benchmark.benchmarkType}
            benchmark={benchmark}
            isExpanded={expandedBenchmarks.has(benchmark.benchmarkType)}
            onToggle={() => toggleBenchmark(benchmark.benchmarkType)}
            onFeedback={onFeedback}
          />
        ))}
      </div>

      {/* Recommendations */}
      {validation.recommendations.length > 0 && (
        <RecommendationsSection recommendations={validation.recommendations} />
      )}
    </div>
  )
}

// ============================================================================
// Sub-components
// ============================================================================

function AgreementBadge({ level }: { level: 'high' | 'moderate' | 'low' }) {
  const config = {
    high: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-600',
      label: 'High Agreement',
    },
    moderate: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-600',
      label: 'Moderate Agreement',
    },
    low: {
      bg: 'bg-red-500/10',
      text: 'text-red-600',
      label: 'Low Agreement',
    },
  }[level]

  return (
    <div className={cn('px-3 py-1 rounded-full text-xs font-medium', config.bg, config.text)}>
      {config.label}
    </div>
  )
}

function ConfidenceBreakdownDisplay({ breakdown }: { breakdown: ConfidenceBreakdown[] }) {
  return (
    <div className="mt-3 p-3 rounded-lg bg-muted/50">
      <div className="text-xs font-medium text-muted-foreground mb-2">
        Effective Weights (base × confidence)
      </div>
      <div className="space-y-1">
        {breakdown.map(item => {
          const meta = BENCHMARK_META[item.benchmark]
          return (
            <div key={item.benchmark} className="flex items-center justify-between text-xs">
              <span className={cn('font-medium', meta?.color || 'text-foreground')}>
                {meta?.name || item.benchmark}
              </span>
              <span className="text-muted-foreground">
                {(item.baseWeight * 100).toFixed(0)}% × {(item.confidence * 100).toFixed(0)}% = {' '}
                <span className="font-medium text-foreground">
                  {(item.effectiveWeight * 100).toFixed(1)}%
                </span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DiscrepanciesSection({ discrepancies }: { discrepancies: Discrepancy[] }) {
  return (
    <div className="p-4 bg-amber-500/5 border-b">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle size={16} className="text-amber-500" />
        <span className="text-sm font-semibold text-foreground">
          Validation Discrepancies
        </span>
      </div>
      <div className="space-y-2">
        {discrepancies.map((d, i) => (
          <div key={i} className="text-sm">
            <span className="text-muted-foreground">
              {BENCHMARK_META[d.benchmarks[0]]?.name} vs {BENCHMARK_META[d.benchmarks[1]]?.name}:
            </span>{' '}
            <span className="text-foreground">{d.possibleCause}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BenchmarkRow({
  benchmark,
  isExpanded,
  onToggle,
  onFeedback,
}: {
  benchmark: BenchmarkResult
  isExpanded: boolean
  onToggle: () => void
  onFeedback?: (benchmarkType: BenchmarkType, itemId: string, helpful: boolean) => void
}) {
  const meta = BENCHMARK_META[benchmark.benchmarkType]
  const Icon = meta?.icon || Activity
  const scorePercent = (benchmark.score / benchmark.maxScore) * 100

  return (
    <div className={cn(
      'transition-colors',
      isExpanded && 'bg-muted/30'
    )}>
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown size={16} className="text-muted-foreground" />
          ) : (
            <ChevronRight size={16} className="text-muted-foreground" />
          )}
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center',
            benchmark.passed ? 'bg-emerald-500/10' : 'bg-red-500/10'
          )}>
            <Icon size={16} className={meta?.color} />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">
              {meta?.name || benchmark.benchmarkType}
            </div>
            <div className="text-xs text-muted-foreground">
              {meta?.description}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Score bar */}
          <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                scorePercent >= 70 ? 'bg-emerald-500' :
                scorePercent >= 50 ? 'bg-amber-500' : 'bg-red-500'
              )}
              style={{ width: `${scorePercent}%` }}
            />
          </div>

          {/* Score text */}
          <div className="text-sm font-medium w-16 text-right">
            <span className={benchmark.passed ? 'text-emerald-600' : 'text-red-600'}>
              {benchmark.score.toFixed(1)}
            </span>
            <span className="text-muted-foreground">/{benchmark.maxScore}</span>
          </div>

          {/* Status icon */}
          {benchmark.passed ? (
            <Check size={16} className="text-emerald-500" />
          ) : (
            <X size={16} className="text-red-500" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="ml-10 space-y-2">
            {benchmark.items.map(item => (
              <div
                key={item.id}
                className={cn(
                  'p-3 rounded-lg border',
                  item.passed ? 'bg-background' : 'bg-red-500/5 border-red-200'
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground">
                        {item.id}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {item.name}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {item.reasoning}
                    </p>
                    {item.suggestions && item.suggestions.length > 0 && (
                      <div className="mt-2">
                        {item.suggestions.map((suggestion, i) => (
                          <div key={i} className="flex items-start gap-1 text-xs text-blue-600">
                            <Lightbulb size={12} className="mt-0.5 shrink-0" />
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="ml-4 flex flex-col items-end">
                    <div className="text-sm font-medium">
                      <span className={item.passed ? 'text-emerald-600' : 'text-red-600'}>
                        {item.score.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground">/{item.maxScore}</span>
                    </div>
                    {item.passed ? (
                      <Check size={14} className="text-emerald-500 mt-1" />
                    ) : (
                      <X size={14} className="text-red-500 mt-1" />
                    )}
                  </div>
                </div>

                {/* Feedback buttons */}
                {onFeedback && (
                  <div className="mt-2 flex items-center gap-2 pt-2 border-t">
                    <span className="text-xs text-muted-foreground">Accurate?</span>
                    <button
                      onClick={() => onFeedback(benchmark.benchmarkType, item.id, true)}
                      className="p-1 rounded hover:bg-emerald-500/10 text-emerald-600"
                    >
                      <TrendingUp size={14} />
                    </button>
                    <button
                      onClick={() => onFeedback(benchmark.benchmarkType, item.id, false)}
                      className="p-1 rounded hover:bg-red-500/10 text-red-600"
                    >
                      <TrendingDown size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}

            {/* Benchmark metadata */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
              <span>Confidence: {(benchmark.confidence * 100).toFixed(0)}%</span>
              <span>Weight: {(benchmark.weight * 100).toFixed(0)}%</span>
              {benchmark.metadata.evaluationTimeMs > 0 && (
                <span>{benchmark.metadata.evaluationTimeMs}ms</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RecommendationsSection({ recommendations }: { recommendations: ValidationRecommendation[] }) {
  const [showAll, setShowAll] = useState(false)
  const displayedRecs = showAll ? recommendations : recommendations.slice(0, 3)

  return (
    <div className="p-4 border-t">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb size={16} className="text-blue-500" />
        <span className="text-sm font-semibold text-foreground">
          Recommendations
        </span>
      </div>
      <div className="space-y-2">
        {displayedRecs.map((rec, i) => {
          const priorityConfig = {
            high: { bg: 'bg-red-500', text: 'text-red-600' },
            medium: { bg: 'bg-amber-500', text: 'text-amber-600' },
            low: { bg: 'bg-blue-500', text: 'text-blue-600' },
          }[rec.priority]

          return (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-background">
              <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', priorityConfig.bg)} />
              <div className="flex-1">
                <p className="text-sm text-foreground">{rec.issue}</p>
                <p className="text-sm text-muted-foreground mt-1">{rec.suggestion}</p>
                <div className="flex items-center gap-2 mt-2">
                  {rec.relatedBenchmarks.map(b => (
                    <span
                      key={b}
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        BENCHMARK_META[b]?.color || 'text-muted-foreground',
                        'bg-muted'
                      )}
                    >
                      {BENCHMARK_META[b]?.name || b}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {recommendations.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-3 text-sm text-blue-600 hover:underline"
        >
          {showAll ? 'Show less' : `Show ${recommendations.length - 3} more`}
        </button>
      )}
    </div>
  )
}

export default MultiBenchmarkCard
