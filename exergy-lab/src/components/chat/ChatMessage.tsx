'use client'

import * as React from 'react'
import { User, Bot, AlertCircle, RefreshCw, ChevronDown, ChevronRight, ExternalLink, FileText, Beaker, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Card, Badge } from '@/components/ui'
import { TypingIndicator } from './TypingIndicator'
import { PlanCard } from './PlanCard'
import type { ChatMessageProps } from '@/types/chat'

// ============================================================================
// ResultsCard Component - Displays workflow results with collapsible sections
// ============================================================================

interface ResultsCardProps {
  results: any
}

function ResultsCard({ results }: ResultsCardProps) {
  const [showAllPapers, setShowAllPapers] = React.useState(false)
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(
    new Set(['synthesis', 'findings'])
  )

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  // Deduplicate papers by DOI or URL
  const papers = React.useMemo(() => {
    const rawPapers = results.research?.papers || []
    const seen = new Set<string>()
    return rawPapers.filter((paper: any) => {
      const key = paper.doi || paper.url || paper.title
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [results.research?.papers])

  const patents = results.research?.patents || []
  const confidence = results.analysis?.confidence || 0
  const synthesis = results.analysis?.synthesis || results.summary
  const keyFindings = results.analysis?.keyFindings || []
  const recommendations = results.analysis?.recommendations || []

  // Determine confidence color
  const getConfidenceColor = (conf: number) => {
    if (conf >= 80) return 'text-green-500'
    if (conf >= 60) return 'text-yellow-500'
    if (conf >= 40) return 'text-orange-500'
    return 'text-red-500'
  }

  return (
    <Card className="p-5 border-border">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/20">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <h4 className="font-medium text-lg">Research Complete</h4>
          </div>
          {confidence > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Confidence:</span>
              <Badge variant="secondary" className={cn("text-sm font-medium", getConfidenceColor(confidence))}>
                {confidence}%
              </Badge>
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap gap-3 py-2 px-3 rounded-lg bg-foreground/5">
          {results.research?.totalSources > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{results.research.totalSources}</span>
              <span className="text-muted-foreground">sources searched</span>
            </div>
          )}
          {papers.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-medium text-primary">{papers.length}</span>
              <span className="text-muted-foreground">papers found</span>
            </div>
          )}
          {patents.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-medium text-primary">{patents.length}</span>
              <span className="text-muted-foreground">patents</span>
            </div>
          )}
        </div>

        {/* Synthesis Section */}
        {synthesis && (
          <CollapsibleSection
            title="AI Synthesis"
            isExpanded={expandedSections.has('synthesis')}
            onToggle={() => toggleSection('synthesis')}
          >
            <p className="text-base text-foreground whitespace-pre-wrap leading-relaxed">
              {synthesis}
            </p>
          </CollapsibleSection>
        )}

        {/* Key Findings Section */}
        {keyFindings.length > 0 && (
          <CollapsibleSection
            title={`Key Findings (${keyFindings.length})`}
            isExpanded={expandedSections.has('findings')}
            onToggle={() => toggleSection('findings')}
          >
            <ul className="space-y-2">
              {keyFindings.map((finding: string, idx: number) => (
                <li key={idx} className="flex gap-2 text-base">
                  <span className="text-primary shrink-0 mt-0.5">•</span>
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* Recommendations Section */}
        {recommendations.length > 0 && (
          <CollapsibleSection
            title={`Recommendations (${recommendations.length})`}
            isExpanded={expandedSections.has('recommendations')}
            onToggle={() => toggleSection('recommendations')}
          >
            <ul className="space-y-2">
              {recommendations.map((rec: string, idx: number) => (
                <li key={idx} className="flex gap-2 text-base">
                  <span className="text-primary shrink-0 font-medium">{idx + 1}.</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* Papers Section */}
        {papers.length > 0 && (
          <CollapsibleSection
            title={`Research Papers (${papers.length})`}
            isExpanded={expandedSections.has('papers')}
            onToggle={() => toggleSection('papers')}
          >
            <div className="space-y-2">
              {(showAllPapers ? papers : papers.slice(0, 5)).map((paper: any, idx: number) => (
                <div key={idx} className="p-3 rounded-lg bg-background border border-border hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <a
                        href={paper.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        <span className="line-clamp-2">{paper.title}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                      {paper.authors?.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {paper.authors.slice(0, 3).join(', ')}{paper.authors.length > 3 ? ' et al.' : ''}
                        </p>
                      )}
                      {(paper.year || paper.source) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {paper.year && <span>{paper.year}</span>}
                          {paper.year && paper.source && <span> • </span>}
                          {paper.source && <span>{paper.source}</span>}
                        </p>
                      )}
                    </div>
                    {paper.citationCount && (
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {paper.citationCount} citations
                      </Badge>
                    )}
                  </div>
                </div>
              ))}

              {/* Show more/less button */}
              {papers.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllPapers(!showAllPapers)}
                  className="w-full text-sm"
                >
                  {showAllPapers ? 'Show Less' : `Show ${papers.length - 5} More Papers`}
                </Button>
              )}
            </div>
          </CollapsibleSection>
        )}
      </div>
    </Card>
  )
}

// Collapsible section helper component
interface CollapsibleSectionProps {
  title: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

function CollapsibleSection({ title, isExpanded, onToggle, children }: CollapsibleSectionProps) {
  return (
    <div className="border-t border-border pt-3">
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left hover:bg-foreground/5 rounded px-2 py-1 -mx-2 transition-colors"
      >
        <h5 className="text-sm font-medium text-muted-foreground">{title}</h5>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isExpanded && (
        <div className="mt-3 px-2">
          {children}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// ChatMessage Component
// ============================================================================

export function ChatMessage({
  message,
  onPlanApprove,
  onPlanReject,
  onPlanModify,
  onMakeChanges,
  onRetry,
  onCancel,
  isLastMessage = false,
  modifications,
}: ChatMessageProps) {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const isSystem = message.role === 'system'

  // Format timestamp
  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })

  // Render streaming indicator
  if (message.isStreaming && message.contentType === 'text') {
    return (
      <div className={cn('flex gap-3 py-4', isUser ? 'justify-end' : 'justify-start')}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 max-w-[80%]">
          <TypingIndicator message={message.content || 'AI is thinking'} />
        </div>
      </div>
    )
  }

  // Render user message
  if (isUser) {
    return (
      <div className="flex gap-3 py-4 justify-end">
        <div className="flex flex-col items-end gap-1 max-w-[80%]">
          <div className="rounded-2xl rounded-tr-sm bg-primary px-4 py-2.5 text-primary-foreground">
            <p className="text-base whitespace-pre-wrap">{message.content}</p>
          </div>
          <span className="text-xs text-muted-foreground px-2">{formattedTime}</span>
        </div>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground/10">
          <User className="h-4 w-4 text-foreground" />
        </div>
      </div>
    )
  }

  // Render system message
  if (isSystem) {
    return (
      <div className="flex justify-center py-2">
        <div className="rounded-full bg-background-elevated border border-border px-4 py-1.5">
          <p className="text-xs text-muted-foreground">{message.content}</p>
        </div>
      </div>
    )
  }

  // Render assistant message
  return (
    <div className="flex gap-3 py-4 justify-start">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 max-w-[85%]">
        <div className="flex flex-col gap-3">
          {/* Text content */}
          {message.content && message.contentType !== 'error' && (
            <div className="rounded-2xl rounded-tl-sm bg-background-elevated border border-border px-4 py-2.5">
              <p className="text-base text-foreground whitespace-pre-wrap">{message.content}</p>
            </div>
          )}

          {/* Plan content - using PlanCard component */}
          {message.contentType === 'plan' && message.plan && isLastMessage && onPlanApprove && onPlanReject && (
            <PlanCard
              plan={message.plan}
              onApprove={onPlanApprove}
              onReject={onPlanReject}
              onModify={onPlanModify}
              onMakeChanges={onMakeChanges}
              modifications={modifications}
            />
          )}

          {/* Execution status - Enhanced with phase information */}
          {message.contentType === 'execution' && message.execution && (
            <Card className="p-5 border-border bg-background-elevated/50">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                      <Beaker className="h-4 w-4 text-primary animate-pulse" />
                    </div>
                    <div>
                      <h4 className="font-medium text-base">
                        {message.execution.phase || 'Executing Research'}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {message.execution.currentStep}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-sm">
                    {message.execution.progress}%
                  </Badge>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="h-2 w-full rounded-full bg-foreground/10 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 ease-out"
                      style={{ width: `${message.execution.progress}%` }}
                    />
                  </div>
                </div>

                {/* Tool calls in progress */}
                {message.execution.toolCalls && message.execution.toolCalls.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                    {message.execution.toolCalls.slice(-3).map((tool, idx) => (
                      <Badge key={tool.id || idx} variant="secondary" className="text-xs">
                        {tool.name}
                      </Badge>
                    ))}
                  </div>
                )}

                {onCancel && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onCancel}
                    className="w-full mt-2"
                  >
                    Cancel Execution
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Results - Enhanced with collapsible sections */}
          {message.contentType === 'results' && message.results && (
            <ResultsCard results={message.results} />
          )}

          {/* Error content */}
          {message.contentType === 'error' && message.error && (
            <Card className="p-4 border-destructive/50 bg-destructive/5">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <h4 className="font-medium text-base">Error</h4>
                </div>
                <p className="text-base text-muted-foreground">
                  {message.error.message}
                </p>
                {message.error.retryable && onRetry && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onRetry}
                    className="w-full"
                  >
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Retry
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Timestamp */}
          <span className="text-xs text-muted-foreground px-2">{formattedTime}</span>
        </div>
      </div>
    </div>
  )
}
