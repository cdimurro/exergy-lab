'use client'

import * as React from 'react'
import { User, Bot, AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Card } from '@/components/ui'
import { TypingIndicator } from './TypingIndicator'
import type { ChatMessageProps } from '@/types/chat'

export function ChatMessage({
  message,
  onPlanApprove,
  onPlanReject,
  onPlanModify,
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
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
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
              <p className="text-sm text-foreground whitespace-pre-wrap">{message.content}</p>
            </div>
          )}

          {/* Plan content - placeholder for PlanCard */}
          {message.contentType === 'plan' && message.plan && (
            <div className="plan-card-placeholder">
              {/* PlanCard will be rendered here */}
              <Card className="p-4 border-border">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Execution Plan</h4>
                    <span className="text-xs text-muted-foreground">
                      {message.plan.phases.length} phases
                    </span>
                  </div>
                  <div className="space-y-2">
                    {message.plan.phases.map((phase, idx) => (
                      <div
                        key={phase.id}
                        className="flex items-start gap-2 text-sm"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-medium">{phase.title}</span>
                          {phase.description && (
                            <p className="text-muted-foreground text-xs mt-0.5">
                              {phase.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Approval buttons */}
                  {isLastMessage && onPlanApprove && onPlanReject && (
                    <div className="flex gap-2 pt-3 border-t border-border">
                      <Button
                        size="sm"
                        onClick={() => onPlanApprove()}
                        className="flex-1"
                      >
                        Approve & Execute
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => onPlanReject()}
                      >
                        Start Over
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* Execution status - placeholder for ExecutionCard */}
          {message.contentType === 'execution' && message.execution && (
            <Card className="p-4 border-border">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Executing</h4>
                  <span className="text-xs text-muted-foreground">
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
                  <p className="text-sm text-muted-foreground">
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

          {/* Results - placeholder for ResultsCard */}
          {message.contentType === 'results' && message.results && (
            <Card className="p-4 border-border">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Results</h4>
                  <span className="text-xs text-primary">Complete</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>
                    Found {message.results.research?.totalSources || 0} sources
                  </p>
                  {message.results.crossFeatureInsights && message.results.crossFeatureInsights.length > 0 && (
                    <p>{message.results.crossFeatureInsights.length} key insights</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Error content */}
          {message.contentType === 'error' && message.error && (
            <Card className="p-4 border-destructive/50 bg-destructive/5">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  <h4 className="font-medium text-sm">Error</h4>
                </div>
                <p className="text-sm text-muted-foreground">
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
