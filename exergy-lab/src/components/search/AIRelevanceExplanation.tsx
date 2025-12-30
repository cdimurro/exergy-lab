'use client'

import * as React from 'react'
import { Sparkles, ChevronDown, ChevronUp, Lightbulb, TrendingUp } from 'lucide-react'
import { Badge, Card, Button } from '@/components/ui'

interface RelevanceExplanation {
  score: number
  explanation: string
}

interface AIRelevanceExplanationProps {
  resultId: string
  explanation?: RelevanceExplanation
  expandedQuery?: string
  queryInterpretation?: string
  recommendations?: string[]
  variant?: 'inline' | 'tooltip' | 'panel'
}

/**
 * Inline relevance indicator (score badge + expandable explanation)
 */
function InlineRelevance({
  explanation,
}: {
  explanation: RelevanceExplanation
}) {
  const [expanded, setExpanded] = React.useState(false)

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'bg-green-100 text-green-700'
    if (score >= 70) return 'bg-blue-100 text-blue-700'
    if (score >= 50) return 'bg-amber-100 text-amber-700'
    return 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="space-y-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 hover:opacity-80 transition-opacity"
      >
        <Badge size="sm" className={getScoreColor(explanation.score)}>
          <Sparkles className="h-3 w-3 mr-1" />
          {explanation.score}% match
        </Badge>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5 text-foreground-muted" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-foreground-muted" />
        )}
      </button>
      {expanded && (
        <p className="text-xs text-foreground-muted pl-1 italic">
          {explanation.explanation}
        </p>
      )}
    </div>
  )
}

/**
 * Tooltip-style relevance popup
 */
function TooltipRelevance({
  explanation,
}: {
  explanation: RelevanceExplanation
}) {
  const [showTooltip, setShowTooltip] = React.useState(false)

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'bg-green-100 text-green-700'
    if (score >= 70) return 'bg-blue-100 text-blue-700'
    if (score >= 50) return 'bg-amber-100 text-amber-700'
    return 'bg-gray-100 text-gray-600'
  }

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className="hover:opacity-80 transition-opacity"
      >
        <Badge size="sm" className={getScoreColor(explanation.score)}>
          <Sparkles className="h-3 w-3 mr-1" />
          {explanation.score}%
        </Badge>
      </button>
      {showTooltip && (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-64 p-3 bg-background-elevated border border-border rounded-lg shadow-lg">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-medium text-foreground mb-1">Why this result?</div>
              <p className="text-xs text-foreground-muted">{explanation.explanation}</p>
            </div>
          </div>
          <div className="absolute bottom-0 left-4 transform translate-y-full">
            <div className="w-2.5 h-2.5 bg-background-elevated border-r border-b border-border rotate-45 -mt-1.5" />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Panel showing AI enhancements for search results
 */
function RelevancePanel({
  expandedQuery,
  queryInterpretation,
  recommendations,
}: {
  expandedQuery?: string
  queryInterpretation?: string
  recommendations?: string[]
}) {
  const [expanded, setExpanded] = React.useState(true)

  if (!expandedQuery && !queryInterpretation && (!recommendations || recommendations.length === 0)) {
    return null
  }

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-accent-purple/5 border-primary/20">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium text-foreground">AI Search Insights</span>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-foreground-muted" />
        ) : (
          <ChevronDown className="h-4 w-4 text-foreground-muted" />
        )}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4">
          {/* Query Interpretation */}
          {queryInterpretation && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground-muted mb-1">
                <Lightbulb className="h-3.5 w-3.5" />
                Understanding Your Search
              </div>
              <p className="text-sm text-foreground">{queryInterpretation}</p>
            </div>
          )}

          {/* Expanded Query */}
          {expandedQuery && (
            <div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-foreground-muted mb-1">
                <TrendingUp className="h-3.5 w-3.5" />
                Expanded Search Terms
              </div>
              <p className="text-sm text-foreground bg-background-surface px-3 py-2 rounded-md">
                {expandedQuery}
              </p>
            </div>
          )}

          {/* Recommendations */}
          {recommendations && recommendations.length > 0 && (
            <div>
              <div className="text-xs font-medium text-foreground-muted mb-2">
                Related Searches
              </div>
              <div className="flex flex-wrap gap-2">
                {recommendations.map((rec, i) => (
                  <Badge
                    key={i}
                    variant="secondary"
                    className="cursor-pointer hover:bg-primary/10 transition-colors"
                  >
                    {rec}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export function AIRelevanceExplanation({
  resultId,
  explanation,
  expandedQuery,
  queryInterpretation,
  recommendations,
  variant = 'inline',
}: AIRelevanceExplanationProps) {
  // Panel variant for search-level insights
  if (variant === 'panel') {
    return (
      <RelevancePanel
        expandedQuery={expandedQuery}
        queryInterpretation={queryInterpretation}
        recommendations={recommendations}
      />
    )
  }

  // No explanation available for this result
  if (!explanation) {
    return null
  }

  // Inline or tooltip variant for result-level relevance
  if (variant === 'tooltip') {
    return <TooltipRelevance explanation={explanation} />
  }

  return <InlineRelevance explanation={explanation} />
}

export type { RelevanceExplanation }
