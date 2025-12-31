'use client'

import * as React from 'react'
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  BookOpen,
  Lightbulb,
  Quote,
  TrendingUp,
  Loader2,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  FileText,
} from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'

// ============================================================================
// Types
// ============================================================================

export interface CitedPaper {
  id: string
  title: string
  authors: string[]
  year: number
  url?: string
  citationCount?: number
  relevanceScore?: number
}

export interface KeyFinding {
  finding: string
  confidence: 'high' | 'medium' | 'low'
  paperIds: string[]
}

export interface AISearchSummary {
  query: string
  summary: string
  keyFindings: KeyFinding[]
  citedPapers: CitedPaper[]
  methodology?: string
  limitations?: string
  suggestedFollowUp?: string[]
  generatedAt: string
}

export interface AISearchInsightsProps {
  query: string
  results: Array<{
    id: string
    title: string
    authors: string[]
    abstract?: string
    year?: number
    url?: string
    citationCount?: number
  }>
  isLoading?: boolean
  onRegenerate?: () => void
  onCitationClick?: (paper: CitedPaper) => void
  onQuestionClick?: (question: string) => void
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function AISearchInsights({
  query,
  results,
  isLoading = false,
  onRegenerate,
  onCitationClick,
  onQuestionClick,
  className = '',
}: AISearchInsightsProps) {
  const [expanded, setExpanded] = React.useState(true)
  const [summary, setSummary] = React.useState<AISearchSummary | null>(null)
  const [generating, setGenerating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [feedback, setFeedback] = React.useState<'up' | 'down' | null>(null)

  // Generate summary when results change
  React.useEffect(() => {
    if (results.length > 0 && query && !summary && !generating) {
      generateSummary()
    }
  }, [results, query])

  const generateSummary = async () => {
    if (results.length === 0) return

    setGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/search/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          results: results.slice(0, 15).map(r => ({
            id: r.id,
            title: r.title,
            authors: r.authors,
            abstract: r.abstract,
            year: r.year,
            citationCount: r.citationCount,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate summary')
      }

      const data = await response.json()
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate summary')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!summary) return

    const text = `${summary.summary}\n\nKey Findings:\n${summary.keyFindings.map(f => `- ${f.finding}`).join('\n')}\n\nSources:\n${summary.citedPapers.map(p => `- ${p.title} (${p.year})`).join('\n')}`

    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleFeedback = (type: 'up' | 'down') => {
    setFeedback(type)
    // Could send feedback to analytics
  }

  // Find paper by ID
  const getPaperById = (id: string): CitedPaper | undefined => {
    return summary?.citedPapers.find(p => p.id === id)
  }

  // Handle citation click - opens paper viewer or external link
  const handleCitationClick = (paper: CitedPaper, e: React.MouseEvent) => {
    e.preventDefault()
    if (onCitationClick) {
      onCitationClick(paper)
    } else if (paper.url) {
      window.open(paper.url, '_blank', 'noopener,noreferrer')
    }
  }

  // Render inline citations
  const renderSummaryWithCitations = (text: string) => {
    // Match citation patterns like [1], [2,3], [1-3]
    const parts = text.split(/(\[\d+(?:[-,]\d+)*\])/g)

    return parts.map((part, idx) => {
      const citationMatch = part.match(/\[(\d+(?:[-,]\d+)*)\]/)
      if (citationMatch) {
        const indices = citationMatch[1].split(/[-,]/).map(n => parseInt(n) - 1)
        const papers = indices
          .map(i => summary?.citedPapers[i])
          .filter(Boolean)

        if (papers.length === 0) return part

        return (
          <span key={idx} className="inline-flex items-center">
            {papers.map((paper, pIdx) => (
              <button
                key={paper!.id}
                onClick={(e) => handleCitationClick(paper!, e)}
                className="inline-flex items-center justify-center w-5 h-5 mx-0.5 text-[10px] font-medium
                         bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors cursor-pointer"
                title={`View: ${paper!.title}`}
              >
                {indices[pIdx] + 1}
              </button>
            ))}
          </span>
        )
      }
      return part
    })
  }

  // Loading state
  if (isLoading || generating) {
    return (
      <Card className={`bg-gradient-to-br from-primary/5 via-background to-accent-purple/5 border-primary/20 ${className}`}>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
          </div>
          <div>
            <div className="font-medium text-foreground">Generating AI Summary</div>
            <div className="text-sm text-foreground-muted">
              Analyzing {results.length} papers to answer your question...
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-4 bg-background-surface rounded animate-pulse w-full" />
          <div className="h-4 bg-background-surface rounded animate-pulse w-5/6" />
          <div className="h-4 bg-background-surface rounded animate-pulse w-4/5" />
        </div>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={`bg-red-50 border-red-200 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-red-100 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <div className="font-medium text-red-800">Could not generate summary</div>
              <div className="text-sm text-red-600">{error}</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={generateSummary}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Retry
          </Button>
        </div>
      </Card>
    )
  }

  // No summary yet
  if (!summary) {
    return null
  }

  return (
    <Card className={`bg-gradient-to-br from-primary/5 via-background to-accent-purple/5 border-primary/20 overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div className="text-left">
            <div className="font-semibold text-foreground">AI Search Insights</div>
            <div className="text-xs text-foreground-muted">
              Based on {summary.citedPapers.length} sources
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            <BookOpen className="h-3 w-3 mr-1" />
            {summary.citedPapers.length} papers analyzed
          </Badge>
          {expanded ? (
            <ChevronUp className="h-5 w-5 text-foreground-muted" />
          ) : (
            <ChevronDown className="h-5 w-5 text-foreground-muted" />
          )}
        </div>
      </button>

      {/* Content */}
      {expanded && (
        <div className="mt-4 space-y-5">
          {/* Main Summary */}
          <div className="prose prose-sm max-w-none">
            <p className="text-foreground leading-relaxed">
              {renderSummaryWithCitations(summary.summary)}
            </p>
          </div>

          {/* Key Findings */}
          {summary.keyFindings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Key Findings
              </div>
              <div className="space-y-2">
                {summary.keyFindings.map((finding, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 bg-background-surface rounded-lg"
                  >
                    <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                      finding.confidence === 'high' ? 'bg-green-500' :
                      finding.confidence === 'medium' ? 'bg-amber-500' : 'bg-gray-400'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm text-foreground">{finding.finding}</p>
                      {finding.paperIds.length > 0 && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <span className="text-xs text-foreground-muted">Sources:</span>
                          {finding.paperIds.slice(0, 3).map(id => {
                            const paper = getPaperById(id)
                            const idx = summary.citedPapers.findIndex(p => p.id === id)
                            if (!paper) return null
                            return (
                              <button
                                key={id}
                                onClick={(e) => handleCitationClick(paper, e)}
                                className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-medium
                                         bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors cursor-pointer"
                                title={`View: ${paper.title}`}
                              >
                                {idx + 1}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cited Papers */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileText className="h-4 w-4 text-blue-500" />
              Sources Referenced
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {summary.citedPapers.slice(0, 6).map((paper, idx) => (
                <button
                  key={paper.id}
                  onClick={(e) => handleCitationClick(paper, e)}
                  className="flex items-start gap-2 p-2.5 bg-background-surface hover:bg-background-elevated
                           rounded-lg transition-colors group text-left w-full"
                >
                  <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center
                                 bg-primary/10 text-primary text-xs font-medium rounded">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {paper.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-foreground-muted">
                      <span>{paper.authors[0]}{paper.authors.length > 1 ? ' et al.' : ''}</span>
                      <span>-</span>
                      <span>{paper.year}</span>
                      {paper.citationCount !== undefined && paper.citationCount > 0 && (
                        <>
                          <span>-</span>
                          <span className="flex items-center gap-0.5">
                            <Quote className="h-3 w-3" />
                            {paper.citationCount}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-foreground-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1" />
                </button>
              ))}
            </div>
            {summary.citedPapers.length > 6 && (
              <p className="text-xs text-foreground-muted text-center">
                +{summary.citedPapers.length - 6} more sources cited
              </p>
            )}
          </div>

          {/* Suggested Follow-up */}
          {summary.suggestedFollowUp && summary.suggestedFollowUp.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Related Questions
              </div>
              <div className="flex flex-wrap gap-2">
                {summary.suggestedFollowUp.map((followUp, idx) => (
                  <button
                    key={idx}
                    onClick={() => onQuestionClick?.(followUp)}
                    className="inline-flex items-center px-3 py-1.5 text-sm bg-background-surface
                             hover:bg-primary/10 hover:text-primary text-foreground rounded-full
                             transition-colors cursor-pointer border border-transparent hover:border-primary/20"
                  >
                    {followUp}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions & Feedback */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground-muted">Was this helpful?</span>
              <button
                onClick={() => handleFeedback('up')}
                className={`p-1.5 rounded hover:bg-background-surface transition-colors ${
                  feedback === 'up' ? 'text-green-500 bg-green-50' : 'text-foreground-muted'
                }`}
              >
                <ThumbsUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleFeedback('down')}
                className={`p-1.5 rounded hover:bg-background-surface transition-colors ${
                  feedback === 'down' ? 'text-red-500 bg-red-50' : 'text-foreground-muted'
                }`}
              >
                <ThumbsDown className="h-4 w-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copy
                  </>
                )}
              </Button>
              {onRegenerate && (
                <Button variant="ghost" size="sm" onClick={() => { setSummary(null); generateSummary(); }}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  Regenerate
                </Button>
              )}
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-[10px] text-foreground-muted leading-relaxed">
            AI-generated summary based on search results. Always verify information with original sources.
            Generated {new Date(summary.generatedAt).toLocaleString()}.
          </p>
        </div>
      )}
    </Card>
  )
}
