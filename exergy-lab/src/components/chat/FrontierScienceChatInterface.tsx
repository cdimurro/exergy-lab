'use client'

/**
 * FrontierScienceChatInterface Component
 *
 * A specialized chat interface for FrontierScience discovery workflows.
 * Integrates the consolidated 4-step discovery pipeline with real-time progress visualization.
 * Now includes pre-discovery configuration with tier selection and interaction modes.
 */

import * as React from 'react'
import { ArrowLeft, Send, Loader2, Settings2, X, Save, CheckCircle, Cpu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useFrontierScienceWorkflow } from '@/hooks/use-frontierscience-workflow'
import {
  FrontierScienceProgressCard,
  FrontierScienceResultsCard,
  QualityBadge,
  DiscoveryConfigPanel,
  ExportPanel,
  PartialResultsCard,
} from '@/components/discovery'
import type { DiscoveryOptions } from '@/types/frontierscience'
import type { DiscoveryConfiguration, Domain } from '@/types/intervention'

interface FrontierScienceChatInterfaceProps {
  pageTitle?: string
  pageSubtitle?: string
  onBack?: () => void
  onComplete?: (result: any) => void
  initialQuery?: string
  initialOptions?: DiscoveryOptions
  autoStart?: boolean
  showConfigPanel?: boolean
}

export function FrontierScienceChatInterface({
  pageTitle = 'Discovery Engine',
  pageSubtitle = 'AI-powered scientific discovery with rubric validation',
  onBack,
  onComplete,
  initialQuery,
  initialOptions,
  autoStart = false,
  showConfigPanel = true,
}: FrontierScienceChatInterfaceProps) {
  const [inputValue, setInputValue] = React.useState(initialQuery || '')
  const [hasAutoStarted, setHasAutoStarted] = React.useState(false)
  const [showConfig, setShowConfig] = React.useState(false)
  const [showExportPanel, setShowExportPanel] = React.useState(false)
  const [isAutoSaving, setIsAutoSaving] = React.useState(false)
  const [lastSavedTime, setLastSavedTime] = React.useState<Date | null>(null)
  const [checkpoints, setCheckpoints] = React.useState<Array<{phase: string; timestamp: Date; data: any}>>([])
  const [discoveryConfig, setDiscoveryConfig] = React.useState<DiscoveryConfiguration | null>(null)
  const [suggestedDomain, setSuggestedDomain] = React.useState<Domain | undefined>(undefined)
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

    // If config panel is enabled and we have a query, show the config panel
    if (showConfigPanel && !showConfig) {
      setShowConfig(true)
      return
    }

    // Start discovery with config or initial options
    // In consolidated 4-phase model, exergy/TEA/patent are part of 'validation' phase
    const validationEnabled = discoveryConfig?.enabledPhases?.has('validation') ?? true
    const options: DiscoveryOptions | undefined = discoveryConfig
      ? {
          domain: discoveryConfig.domain,
          targetQuality: discoveryConfig.targetQuality === 'exploratory'
            ? 'validated'
            : discoveryConfig.targetQuality === 'publication'
            ? 'breakthrough'
            : 'significant',
          maxIterationsPerPhase: discoveryConfig.budget.maxIterations,
          enableExergyAnalysis: validationEnabled, // Part of validation in consolidated model
          enableTEAAnalysis: validationEnabled, // Part of validation in consolidated model
          enablePatentAnalysis: validationEnabled, // Part of validation in consolidated model
        }
      : initialOptions

    await startDiscovery(inputValue.trim(), options ?? {})
    setInputValue('')
    setShowConfig(false)
  }

  // Handle config panel start
  const handleConfigStart = async (config: DiscoveryConfiguration) => {
    setDiscoveryConfig(config)
    // In consolidated 4-phase model, exergy/TEA/patent are part of 'validation' phase
    const validationEnabled = config.enabledPhases.has('validation')
    const options: DiscoveryOptions = {
      domain: config.domain,
      targetQuality: config.targetQuality === 'exploratory'
        ? 'validated'
        : config.targetQuality === 'publication'
        ? 'breakthrough'
        : 'significant',
      maxIterationsPerPhase: config.budget.maxIterations,
      enableExergyAnalysis: validationEnabled, // Part of validation in consolidated model
      enableTEAAnalysis: validationEnabled, // Part of validation in consolidated model
      enablePatentAnalysis: validationEnabled, // Part of validation in consolidated model
    }
    await startDiscovery(inputValue.trim(), options)
    setShowConfig(false)
  }

  // Handle config cancel
  const handleConfigCancel = () => {
    setShowConfig(false)
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

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {/* Configuration Panel */}
        {showConfig && status === 'idle' ? (
          <DiscoveryConfigPanel
            initialConfig={{
              query: inputValue,
              domain: suggestedDomain,
            }}
            onConfigChange={setDiscoveryConfig}
            onStart={handleConfigStart}
            onCancel={handleConfigCancel}
            isLoading={false}
          />
        ) : (status === 'running' || status === 'failed') ? (
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
                  setShowConfig(false)
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
        ) : (
          <div className="h-full overflow-y-auto px-4 py-6">
            <div className="max-w-4xl mx-auto">
              {/* Idle State - Show Input Prompt */}
              {status === 'idle' && !result && !showConfig && (
                <IdleState
                  onConfigureClick={showConfigPanel ? () => setShowConfig(true) : undefined}
                  onExampleClick={(query, domain) => {
                    setInputValue(query)
                    setSuggestedDomain(domain as Domain)
                    // Auto-navigate to config panel when example is clicked
                    if (showConfigPanel) {
                      setShowConfig(true)
                    }
                  }}
                />
              )}

              {/* Starting State */}
              {status === 'starting' && (
                <StartingState query={inputValue} />
              )}

              {/* Completed State - Show Results */}
              {status === 'completed' && result && (
                <>
                  <FrontierScienceResultsCard
                    result={result}
                    onExport={() => setShowExportPanel(true)}
                  />

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
              )}

              {/* Note: Failed state is now handled inline in FrontierScienceProgressCard */}
            </div>
          </div>
        )}
      </div>

      {/* Input Area - Show at bottom when idle OR when Make Changes is clicked */}
      {(status === 'idle' && !showConfig) && (
        <div className="shrink-0 border-t border-border p-4">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="relative">
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isInputDisabled}
                placeholder="Describe your scientific discovery query (e.g., 'Novel approaches to high-temperature SOEC efficiency')"
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
            </div>
          </form>
        </div>
      )}

    </div>
  )
}

/**
 * Idle state placeholder with clean, centered design
 * Removed example queries section for cleaner UX
 */
function IdleState({
  onConfigureClick,
}: {
  onConfigureClick?: () => void
  onExampleClick?: (query: string, domain: string) => void
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Main Content - Centered */}
      <div className="flex-1 flex flex-col items-center justify-center py-8 px-4">
        {/* Large Cpu Icon - Simple green */}
        <div className="mb-4 flex justify-center">
          <Cpu size={96} className="text-emerald-600" />
        </div>

        {/* Title - Green accent color */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6 text-center px-4 text-emerald-600">
          Discovery Engine
        </h1>

        {/* Subtitle - Bigger */}
        <p className="text-xl text-muted-foreground mb-12 text-center max-w-2xl">
          AI-powered scientific hypothesis validation and research synthesis
        </p>

        {/* Instructions Card - Bigger */}
        <div className="bg-card rounded-xl p-8 max-w-2xl w-full border border-border shadow-lg">
          <h3 className="text-lg font-semibold text-foreground mb-6">
            Enter your research query or hypothesis
          </h3>
          <ul className="space-y-4 text-base text-muted-foreground">
            <li className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-semibold text-emerald-600">1</span>
              </div>
              <span><strong className="text-foreground">Be specific</strong> — Include target metrics, materials, or performance thresholds</span>
            </li>
            <li className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-semibold text-emerald-600">2</span>
              </div>
              <span><strong className="text-foreground">Define constraints</strong> — Mention cost, temperature, scalability requirements</span>
            </li>
            <li className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <span className="text-sm font-semibold text-emerald-600">3</span>
              </div>
              <span><strong className="text-foreground">State the goal</strong> — What problem are you trying to solve?</span>
            </li>
          </ul>
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
