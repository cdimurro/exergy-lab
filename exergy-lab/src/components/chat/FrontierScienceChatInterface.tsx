'use client'

/**
 * FrontierScienceChatInterface Component
 *
 * A specialized chat interface for FrontierScience discovery workflows.
 * Integrates the consolidated 4-step discovery pipeline with real-time progress visualization.
 * Now includes pre-discovery configuration with tier selection and interaction modes.
 */

import * as React from 'react'
import { ArrowLeft, Send, Loader2, X, Save, CheckCircle, Cpu, BookOpen, FlaskConical, Target, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useFrontierScienceWorkflow } from '@/hooks/use-frontierscience-workflow'
import {
  FrontierScienceProgressCard,
  FrontierScienceResultsCard,
  QualityBadge,
  ExportPanel,
  PartialResultsCard,
} from '@/components/discovery'
import type { DiscoveryOptions } from '@/types/frontierscience'

interface FrontierScienceChatInterfaceProps {
  pageTitle?: string
  pageSubtitle?: string
  onBack?: () => void
  onComplete?: (result: any) => void
  initialQuery?: string
  initialOptions?: DiscoveryOptions
  autoStart?: boolean
}

// Default discovery options
const DEFAULT_OPTIONS: Partial<DiscoveryOptions> = {
  domain: 'solar-photovoltaics',
  enablePatentAnalysis: true,
  enableExergyAnalysis: true,
  enableTEAAnalysis: true,
  discoveryMode: 'synthesis',
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
  const [showExportPanel, setShowExportPanel] = React.useState(false)
  const [isAutoSaving, setIsAutoSaving] = React.useState(false)
  const [lastSavedTime, setLastSavedTime] = React.useState<Date | null>(null)
  const [checkpoints, setCheckpoints] = React.useState<Array<{phase: string; timestamp: Date; data: any}>>([])
  const inputRef = React.useRef<HTMLTextAreaElement>(null)

  const {
    discoveryId,
    status,
    currentPhase,
    phaseProgress,
    overallProgress,
    elapsedTime,
    result,
    partialResult,
    recoveryRecommendations,
    error,
    thinkingMessage,
    activities,
    startDiscovery,
    cancelDiscovery,
    resetDiscovery,
    qualityTier,
    passedPhases,
    failedPhases,
  } = useFrontierScienceWorkflow()

  // Auto-start if configured
  React.useEffect(() => {
    if (autoStart && initialQuery && !hasAutoStarted && status === 'idle') {
      setHasAutoStarted(true)
      startDiscovery(initialQuery, initialOptions)
    }
  }, [autoStart, initialQuery, initialOptions, hasAutoStarted, status, startDiscovery])

  // Notify on completion (including partial completion)
  React.useEffect(() => {
    if ((status === 'completed' || status === 'completed_partial') && (result || partialResult) && onComplete) {
      onComplete(result || partialResult)
    }
  }, [status, result, partialResult, onComplete])

  // Auto-save checkpoints when phases complete
  React.useEffect(() => {
    if (currentPhase && phaseProgress.size > 0) {
      const completedPhases = Array.from(phaseProgress.entries())
        .filter(([_, p]) => p.status === 'completed')

      // Check if we have a new completed phase
      const lastCompleted = completedPhases[completedPhases.length - 1]
      if (lastCompleted && !checkpoints.some(c => c.phase === lastCompleted[0])) {
        // Trigger auto-save animation
        setIsAutoSaving(true)

        // Create checkpoint
        const newCheckpoint = {
          phase: lastCompleted[0],
          timestamp: new Date(),
          data: {
            phaseProgress: Object.fromEntries(phaseProgress),
            overallProgress,
            elapsedTime,
          }
        }
        setCheckpoints(prev => [...prev, newCheckpoint])
        setLastSavedTime(new Date())

        // Stop animation after 2 seconds
        setTimeout(() => setIsAutoSaving(false), 2000)
      }
    }
  }, [currentPhase, phaseProgress, overallProgress, elapsedTime, checkpoints])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!inputValue.trim() || status === 'running' || status === 'starting') return

    // Build discovery options with defaults
    const options: DiscoveryOptions = {
      ...DEFAULT_OPTIONS,
      ...initialOptions,
    } as DiscoveryOptions

    await startDiscovery(inputValue.trim(), options)
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
      {/* Header - Hidden when idle to maximize space */}
      {status !== 'idle' && (
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-600">
              <Cpu className="w-5 h-5 animate-pulse" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-foreground">{pageTitle}</h1>
              <p className="text-base text-muted-foreground">{pageSubtitle}</p>
            </div>
            {qualityTier && status === 'running' && (
              <QualityBadge quality={qualityTier} size="sm" />
            )}

            {/* Action Buttons - Right side */}
            <div className="flex items-center gap-2">
              {/* Auto-Save Indicator - Only show when running */}
              {status === 'running' && (
                <div className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300',
                  isAutoSaving
                    ? 'bg-emerald-500/10 text-emerald-600 animate-pulse'
                    : lastSavedTime
                    ? 'bg-muted text-muted-foreground'
                    : 'bg-muted/50 text-muted-foreground/50'
                )}>
                  {isAutoSaving ? (
                    <>
                      <Save className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : lastSavedTime ? (
                    <>
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Auto-Saved</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Auto-Save</span>
                    </>
                  )}
                </div>
              )}

              {/* Close/Cancel Button - Only show when running */}
              {status === 'running' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelDiscovery}
                  className="h-9 w-9 p-0"
                  title="Cancel discovery"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {(status === 'running' || status === 'failed') ? (
          <div className="h-full overflow-y-auto px-4 py-6">
            {/* Full-screen progress card when running OR failed */}
            <FrontierScienceProgressCard
              query={inputValue || initialQuery || 'Discovery in progress...'}
              status={status}
              currentPhase={currentPhase}
              phaseProgress={phaseProgress}
              overallProgress={overallProgress}
              elapsedTime={elapsedTime}
              thinkingMessage={thinkingMessage}
              activities={activities}
              error={error}
              passedPhases={passedPhases}
              failedPhases={failedPhases}
              recoveryRecommendations={recoveryRecommendations}
              failedCriteria={(() => {
                // Extract failed criteria from the last failed phase
                const lastFailedPhase = failedPhases[failedPhases.length - 1]
                if (!lastFailedPhase) return []
                const progress = phaseProgress.get(lastFailedPhase)
                if (!progress?.judgeResult?.itemScores) return []
                return progress.judgeResult.itemScores
                  .filter(s => !s.passed)
                  .map(s => ({
                    id: s.itemId,
                    issue: s.reasoning || `Failed criterion: ${s.itemId}`,
                    suggestion: `Improve ${s.itemId} to score higher`,
                  }))
              })()}
              onCancel={status === 'running' ? cancelDiscovery : undefined}
              onRetryWithQuery={(query: string, fromCheckpoint?: boolean) => {
                // Update the input value with the new query
                setInputValue(query)
                // Start discovery with the new/modified query
                if (fromCheckpoint && passedPhases.length > 0) {
                  // TODO: Implement checkpoint resume - for now, restart
                  console.log('Checkpoint resume requested from:', passedPhases[passedPhases.length - 1])
                }
                startDiscovery(query, initialOptions)
              }}
              onExportResults={() => setShowExportPanel(true)}
              onViewResults={() => {
                // If we have partial results, show them
                if (passedPhases.length > 0) {
                  // Construct a partial result view from the completed phases
                  console.log('Viewing partial results for phases:', passedPhases)
                  // For now, open export panel which shows all available data
                  setShowExportPanel(true)
                }
              }}
              className="h-full"
            />
          </div>
        ) : status === 'completed_partial' && partialResult ? (
          <>
            {/* Full-width Partial Results - same layout as progress card */}
            <div className="h-full overflow-y-auto px-4 py-6">
              <PartialResultsCard
                result={partialResult}
                onExport={() => setShowExportPanel(true)}
                onModifyQuery={() => {
                  // Reset workflow state and show input
                  resetDiscovery()
                  setInputValue(partialResult?.query || inputValue || initialQuery || '')
                }}
                onRetryWithPrompt={(prompt: string) => {
                  // Start a new discovery with the improved/edited prompt
                  setInputValue(prompt)
                  startDiscovery(prompt, initialOptions)
                }}
              />
            </div>

            {/* Export Panel Modal for Partial Results */}
            {showExportPanel && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-background rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-auto m-4 relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowExportPanel(false)}
                    className="absolute top-3 right-3 z-10 h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <ExportPanel
                    result={partialResult as any}
                    query={inputValue || initialQuery || ''}
                    discoveryId={discoveryId || 'unknown'}
                    onExport={() => {
                      // Optionally close after export
                    }}
                  />
                </div>
              </div>
            )}
          </>
        ) : status === 'completed' && result ? (
          <>
            {/* Full-width Results Card - same layout as progress card */}
            <div className="h-full overflow-y-auto px-4 py-6">
              <FrontierScienceResultsCard
                result={result}
                onExport={() => setShowExportPanel(true)}
                className="h-full"
              />
            </div>

            {/* Export Panel Modal */}
            {showExportPanel && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <div className="bg-background rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-auto m-4 relative">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowExportPanel(false)}
                    className="absolute top-3 right-3 z-10 h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <ExportPanel
                    result={result}
                    query={inputValue || initialQuery || ''}
                    discoveryId={discoveryId || 'unknown'}
                    onExport={() => {
                      // Optionally close after export
                    }}
                  />
                </div>
              </div>
            )}
          </>
        ) : status === 'idle' ? (
          /* Idle State - Full height flex layout with input at bottom */
          <div className="h-full flex flex-col">
            {/* Header - Fixed at top */}
            <div className="shrink-0 text-center pt-8 pb-6 px-6">
              <div className="mb-4 flex justify-center">
                <Cpu size={72} className="text-emerald-600" />
              </div>
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-3 text-emerald-600">
                Discovery Engine
              </h1>
              <p className="text-lg text-muted-foreground max-w-xl mx-auto">
                AI-powered scientific hypothesis validation and research synthesis
              </p>
            </div>

            {/* Instructions Card - Positioned slightly higher */}
            <div className="flex-1 overflow-y-auto px-6 flex items-start justify-center pt-2">
              <div className="max-w-4xl w-full">
                <IdleStateCard
                  onExampleClick={(query) => {
                    setInputValue(query)
                    // Auto-submit after a brief delay to show the query
                    setTimeout(() => {
                      const options: DiscoveryOptions = {
                        ...DEFAULT_OPTIONS,
                        ...initialOptions,
                      } as DiscoveryOptions
                      startDiscovery(query, options)
                    }, 100)
                  }}
                />
              </div>
            </div>

            {/* Input Area - Fixed at bottom, full width */}
            <div className="shrink-0 border-t border-border px-6 py-4 bg-background">
              <form onSubmit={handleSubmit} className="w-full">
                <div className="flex gap-3 items-end">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isInputDisabled}
                    placeholder="Describe your scientific discovery query (e.g., 'Novel approaches to high-temperature SOEC efficiency')"
                    className={cn(
                      'flex-1 min-h-[120px] max-h-[200px] p-4',
                      'rounded-xl border border-border bg-background',
                      'text-foreground placeholder:text-muted-foreground',
                      'resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/50',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={isInputDisabled || !inputValue.trim()}
                    className="h-[56px] px-8 shrink-0 bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isInputDisabled ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-2" />
                        Submit Query
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto px-4 py-6">
            <div className="max-w-4xl mx-auto">
              {/* Starting State */}
              {status === 'starting' && (
                <StartingState query={inputValue} />
              )}

              {/* Note: Failed state is now handled inline in FrontierScienceProgressCard */}
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

/**
 * Instructions card component (shown in the middle of the page)
 */
function IdleStateCard({ onExampleClick }: { onExampleClick: (query: string) => void }) {
  const examples = [
    "Novel approaches to improve perovskite solar cell stability above 1000 hours",
    "Methods to increase solid oxide electrolyzer efficiency at temperatures below 700°C",
    "Strategies for reducing lithium-ion battery degradation in grid-scale storage",
  ]

  return (
    <div className="w-full rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Instructions
        </h2>

        {/* Steps - Compact inline layout */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-600 text-sm font-semibold">
              1
            </div>
            <div>
              <p className="text-sm text-foreground font-medium">Enter a research question</p>
              <p className="text-xs text-muted-foreground mt-0.5">Be specific about your domain.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-600 text-sm font-semibold">
              2
            </div>
            <div>
              <p className="text-sm text-foreground font-medium">AI Analysis</p>
              <p className="text-xs text-muted-foreground mt-0.5">Sophisticated 4-phase pipeline.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-600 text-sm font-semibold">
              3
            </div>
            <div>
              <p className="text-sm text-foreground font-medium">Review your results</p>
              <p className="text-xs text-muted-foreground mt-0.5">Get a comprehensive report.</p>
            </div>
          </div>
        </div>

        {/* Examples - Compact */}
        <div className="mb-5">
          <h3 className="text-sm font-medium text-foreground mb-2">Example Queries <span className="text-xs text-muted-foreground font-normal">(click to run)</span></h3>
          <div className="space-y-2">
            {examples.map((example, index) => (
              <button
                key={index}
                onClick={() => onExampleClick(example)}
                className="w-full text-left p-2.5 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground italic hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-foreground transition-all duration-200 cursor-pointer group"
              >
                <span className="group-hover:text-emerald-600">"{example}"</span>
              </button>
            ))}
          </div>
        </div>

        {/* Discovery Pipeline - Horizontal */}
        <div className="pt-4 border-t">
          <h3 className="text-sm font-medium text-foreground mb-2">Discovery Pipeline</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen size={16} className="text-blue-600 shrink-0" />
              <span className="text-foreground font-medium">Conduct Research</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FlaskConical size={16} className="text-purple-600 shrink-0" />
              <span className="text-foreground font-medium">Generate Hypotheses</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target size={16} className="text-teal-600 shrink-0" />
              <span className="text-foreground font-medium">Validate Findings</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText size={16} className="text-emerald-600 shrink-0" />
              <span className="text-foreground font-medium">Export Reports</span>
            </div>
          </div>
        </div>
      </div>
  )
}

/**
 * Starting state
 */
function StartingState({ query: _query }: { query: string }) {
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
        Setting up the 4-step discovery pipeline...
      </p>
    </div>
  )
}

export default FrontierScienceChatInterface
