'use client'

import * as React from 'react'
import { User, Bot, AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Card } from '@/components/ui'
import { TypingIndicator } from './TypingIndicator'
import { PlanCard } from './PlanCard'
import type { ChatMessageProps } from '@/types/chat'

export function ChatMessage({
  message,
  onPlanApprove,
  onPlanReject,
  onPlanModify,
  onMakeChanges,
  onRetry,
  onCancel,
  isLastMessage = false,
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
            />
          )}

          {/* Execution status - placeholder for ExecutionCard */}
          {message.contentType === 'execution' && message.execution && (
            <Card className="p-4 border-border">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-base">Executing</h4>
                  <span className="text-sm text-muted-foreground">
                    {message.execution.progress}%
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-full rounded-full bg-foreground/10 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${message.execution.progress}%` }}
                    />
                  </div>
                  <p className="text-base text-muted-foreground">
                    {message.execution.currentStep}
                  </p>
                </div>
                {onCancel && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={onCancel}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </Card>
          )}

          {/* Results - shows workflow results with comprehensive analysis */}
          {message.contentType === 'results' && message.results && (
            <Card className="p-4 border-border">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-lg">Research Results</h4>
                  <span className="text-sm text-primary font-medium">Complete</span>
                </div>

                {/* AI Synthesis - the main comprehensive summary */}
                {(message.results.analysis?.synthesis || message.results.summary) && (
                  <div className="prose prose-sm max-w-none">
                    <p className="text-base text-foreground whitespace-pre-wrap">
                      {message.results.analysis?.synthesis || message.results.summary}
                    </p>
                  </div>
                )}

                {/* Confidence score */}
                {message.results.analysis?.confidence && message.results.analysis.confidence > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Confidence:</span>
                    <span className="font-medium text-foreground">
                      {message.results.analysis.confidence}%
                    </span>
                  </div>
                )}

                {/* Key Findings from AI analysis */}
                {message.results.analysis?.keyFindings && message.results.analysis.keyFindings.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-muted-foreground">Key Findings</h5>
                    <ul className="space-y-1.5">
                      {message.results.analysis.keyFindings.map((finding: string, idx: number) => (
                        <li key={idx} className="flex gap-2 text-base">
                          <span className="text-primary shrink-0">•</span>
                          <span>{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations from AI analysis */}
                {message.results.analysis?.recommendations && message.results.analysis.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-muted-foreground">Recommendations</h5>
                    <ul className="space-y-1.5">
                      {message.results.analysis.recommendations.map((rec: string, idx: number) => (
                        <li key={idx} className="flex gap-2 text-base">
                          <span className="text-primary shrink-0">{idx + 1}.</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Research stats */}
                {message.results.research && (
                  <div className="flex flex-wrap gap-4 text-base border-t border-border pt-3">
                    <span className="text-muted-foreground">
                      <strong className="text-foreground">{message.results.research.totalSources || 0}</strong> sources
                    </span>
                    {message.results.research.papers?.length > 0 && (
                      <span className="text-muted-foreground">
                        <strong className="text-foreground">{message.results.research.papers.length}</strong> papers
                      </span>
                    )}
                    {message.results.research.patents?.length > 0 && (
                      <span className="text-muted-foreground">
                        <strong className="text-foreground">{message.results.research.patents.length}</strong> patents
                      </span>
                    )}
                  </div>
                )}

                {/* Top papers preview */}
                {message.results.research?.papers && message.results.research.papers.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-muted-foreground">Top Papers</h5>
                    <div className="space-y-2">
                      {message.results.research.papers.slice(0, 3).map((paper: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-lg bg-background-elevated border border-border">
                          <a
                            href={paper.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-base font-medium text-primary hover:underline"
                          >
                            {paper.title}
                          </a>
                          {paper.authors?.length > 0 && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {paper.authors.slice(0, 3).join(', ')}{paper.authors.length > 3 ? ' et al.' : ''}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
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
