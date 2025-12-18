'use client'

/**
 * FrontierScienceChatInterface Component
 *
 * A specialized chat interface for FrontierScience discovery workflows.
 * Integrates the new 12-phase discovery pipeline with real-time progress visualization.
 */

import * as React from 'react'
import { ArrowLeft, Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useFrontierScienceWorkflow } from '@/hooks/use-frontierscience-workflow'
import {
  FrontierScienceProgressCard,
  FrontierScienceResultsCard,
  QualityBadge,
  PulsingBrain,
} from '@/components/discovery'
import type { DiscoveryOptions } from '@/types/frontierscience'
import type { Domain } from '@/types/discovery'

interface FrontierScienceChatInterfaceProps {
  pageTitle?: string
  pageSubtitle?: string
  onBack?: () => void
  onComplete?: (result: any) => void
  initialQuery?: string
  initialOptions?: DiscoveryOptions
  autoStart?: boolean
}

export function FrontierScienceChatInterface({
  pageTitle = 'Discovery Engine',
  pageSubtitle = 'AI-powered scientific discovery with rubric validation',
  onBack,
  onComplete,
  initialQuery,
  initialOptions,
  autoStart = false,
}: FrontierScienceChatInterfaceProps) {
  const [inputValue, setInputValue] = React.useState(initialQuery || '')
  const [hasAutoStarted, setHasAutoStarted] = React.useState(false)
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  const {
    discoveryId,
    status,
    currentPhase,
    phaseProgress,
    overallProgress,
    elapsedTime,
    result,
    error,
    thinkingMessage,
    startDiscovery,
    cancelDiscovery,
    qualityTier,
    completedPhasesCount,
    totalPhasesCount,
  } = useFrontierScienceWorkflow()

  // Auto-start if configured
  React.useEffect(() => {
    if (autoStart && initialQuery && !hasAutoStarted && status === 'idle') {
      setHasAutoStarted(true)
      startDiscovery(initialQuery, initialOptions)
    }
  }, [autoStart, initialQuery, initialOptions, hasAutoStarted, status, startDiscovery])

  // Notify on completion
  React.useEffect(() => {
    if (status === 'completed' && result && onComplete) {
      onComplete(result)
    }
  }, [status, result, onComplete])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!inputValue.trim() || status === 'running' || status === 'starting') return

    await startDiscovery(inputValue.trim(), initialOptions)
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const isInputDisabled = status === 'running' || status === 'starting'

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-10 w-10 p-0 mr-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 text-blue-600">
            <PulsingBrain />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold text-foreground">{pageTitle}</h1>
            <p className="text-base text-muted-foreground">{pageSubtitle}</p>
          </div>
          {qualityTier && status === 'running' && (
            <QualityBadge quality={qualityTier} size="sm" />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {/* Full-screen progress card when running */}
        {status === 'running' ? (
          <FrontierScienceProgressCard
            query={inputValue || initialQuery || 'Discovery in progress...'}
            currentPhase={currentPhase}
            phaseProgress={phaseProgress}
            overallProgress={overallProgress}
            elapsedTime={elapsedTime}
            thinkingMessage={thinkingMessage}
            onCancel={cancelDiscovery}
            className="h-full"
          />
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Idle State - Show Input Prompt */}
            {status === 'idle' && !result && (
              <IdleState />
            )}

            {/* Starting State */}
            {status === 'starting' && (
              <StartingState query={inputValue} />
            )}

            {/* Completed State - Show Results */}
            {status === 'completed' && result && (
              <FrontierScienceResultsCard
                result={result}
                onExport={() => {
                  // Export functionality
                  console.log('Exporting results...')
                }}
              />
            )}

            {/* Error State */}
            {status === 'failed' && (
              <ErrorState
                error={error}
                onRetry={() => {
                  if (inputValue || initialQuery) {
                    startDiscovery(inputValue || initialQuery!, initialOptions)
                  }
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="shrink-0 border-t border-border p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isInputDisabled}
              placeholder={
                isInputDisabled
                  ? 'Discovery in progress...'
                  : 'Describe your scientific discovery query (e.g., "Novel approaches to high-temperature SOEC efficiency")'
              }
              className={cn(
                'w-full min-h-[100px] max-h-[200px] p-4 pr-14',
                'rounded-xl border border-border bg-background',
                'text-foreground placeholder:text-muted-foreground',
                'resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            />
            <Button
              type="submit"
              size="sm"
              disabled={isInputDisabled || !inputValue.trim()}
              className="absolute bottom-3 right-3"
            >
              {isInputDisabled ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>Press Enter to send, Shift+Enter for new line</span>
            {status === 'running' && (
              <span>
                {completedPhasesCount}/{totalPhasesCount} phases completed
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * Idle state placeholder
 */
function IdleState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center mb-4">
        <PulsingBrain className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">
        Start Your Discovery
      </h2>
      <p className="text-muted-foreground max-w-md mb-6">
        Enter a scientific research query to begin the 12-phase discovery pipeline.
        The AI will iteratively refine each phase until it reaches the 7/10 quality threshold.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
        <ExampleCard
          title="Clean Energy"
          example="Novel approaches to improve SOEC efficiency above 85%"
        />
        <ExampleCard
          title="Materials Science"
          example="Perovskite solar cells with improved thermal stability"
        />
        <ExampleCard
          title="Energy Storage"
          example="Solid-state battery electrolytes with high ionic conductivity"
        />
        <ExampleCard
          title="Hydrogen Production"
          example="Cost-effective green hydrogen from renewable sources"
        />
      </div>
    </div>
  )
}

function ExampleCard({ title, example }: { title: string; example: string }) {
  return (
    <div className="p-3 rounded-lg border border-border bg-muted/30 text-left">
      <div className="text-xs font-medium text-muted-foreground mb-1">{title}</div>
      <div className="text-sm text-foreground">{example}</div>
    </div>
  )
}

/**
 * Starting state
 */
function StartingState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
        <div className="absolute inset-0 rounded-full border-2 border-blue-500/30 animate-ping" />
      </div>
      <h2 className="text-lg font-medium text-foreground mb-2">
        Initializing Discovery
      </h2>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        Setting up the 12-phase discovery pipeline...
      </p>
    </div>
  )
}

/**
 * Error state
 */
function ErrorState({
  error,
  onRetry,
}: {
  error: string | null
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <svg
          className="w-8 h-8 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-medium text-foreground mb-2">
        Discovery Failed
      </h2>
      <p className="text-sm text-red-600 text-center max-w-md mb-4">
        {error || 'An unexpected error occurred'}
      </p>
      <Button onClick={onRetry} variant="outline">
        Try Again
      </Button>
    </div>
  )
}

export default FrontierScienceChatInterface
