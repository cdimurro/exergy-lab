'use client'

/**
 * FrontierScienceChatInterface Component
 *
 * A specialized chat interface for FrontierScience discovery workflows.
 * Integrates the new 12-phase discovery pipeline with real-time progress visualization.
 * Now includes pre-discovery configuration with tier selection and interaction modes.
 */

import * as React from 'react'
import { ArrowLeft, Send, Loader2, Settings2, X, Pencil, Save, RotateCcw, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useFrontierScienceWorkflow } from '@/hooks/use-frontierscience-workflow'
import {
  FrontierScienceProgressCard,
  FrontierScienceResultsCard,
  QualityBadge,
  PulsingBrain,
  DiscoveryConfigPanel,
  ExportPanel,
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
  const [showPromptWindow, setShowPromptWindow] = React.useState(false)
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

  // Handle rollback to last checkpoint
  const handleRollbackToCheckpoint = (checkpointIndex: number) => {
    const checkpoint = checkpoints[checkpointIndex]
    if (checkpoint) {
      console.log(`Rolling back to checkpoint: ${checkpoint.phase}`, checkpoint.data)
      // Note: Full rollback implementation would require additional backend support
      // For now, we just show the checkpoint data and allow retry from that point
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!inputValue.trim() || status === 'running' || status === 'starting') return

    // If config panel is enabled and we have a query, show the config panel
    if (showConfigPanel && !showConfig) {
      setShowConfig(true)
      return
    }

    // Start discovery with config or initial options
    const options: DiscoveryOptions | undefined = discoveryConfig
      ? {
          domain: discoveryConfig.domain,
          targetQuality: discoveryConfig.targetQuality === 'exploratory'
            ? 'validated'
            : discoveryConfig.targetQuality === 'publication'
            ? 'breakthrough'
            : 'significant',
          maxIterationsPerPhase: discoveryConfig.budget.maxIterations,
          enableExergyAnalysis: discoveryConfig.enabledPhases.has('exergy'),
          enableTEAAnalysis: discoveryConfig.enabledPhases.has('tea'),
          enablePatentAnalysis: discoveryConfig.enabledPhases.has('patent'),
        }
      : initialOptions

    await startDiscovery(inputValue.trim(), options ?? {})
    setInputValue('')
    setShowConfig(false)
  }

  // Handle config panel start
  const handleConfigStart = async (config: DiscoveryConfiguration) => {
    setDiscoveryConfig(config)
    const options: DiscoveryOptions = {
      domain: config.domain,
      targetQuality: config.targetQuality === 'exploratory'
        ? 'validated'
        : config.targetQuality === 'publication'
        ? 'breakthrough'
        : 'significant',
      maxIterationsPerPhase: config.budget.maxIterations,
      enableExergyAnalysis: config.enabledPhases.has('exergy'),
      enableTEAAnalysis: config.enabledPhases.has('tea'),
      enablePatentAnalysis: config.enabledPhases.has('patent'),
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

          {/* Action Buttons - Right side */}
          <div className="flex items-center gap-2">
            {/* Auto-Save Indicator */}
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

            {/* Make Changes Button - Only show when running or completed */}
            {(status === 'running' || status === 'completed') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPromptWindow(!showPromptWindow)}
                className="gap-1.5"
              >
                <Pencil className="h-4 w-4" />
                Make Changes
              </Button>
            )}

            {/* Close/Cancel Button */}
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
        ) : status === 'running' ? (
          <div className="h-full overflow-y-auto px-4 py-6">
            {/* Full-screen progress card when running */}
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
          </div>
        ) : (
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

            {/* Error State */}
            {status === 'failed' && (
              <ErrorState
                error={error}
                onRetry={() => {
                  if (inputValue || initialQuery) {
                    startDiscovery(inputValue || initialQuery!, initialOptions)
                  }
                }}
                checkpoints={checkpoints}
                onRollback={handleRollbackToCheckpoint}
              />
            )}
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

      {/* Make Changes Prompt Window - Floating overlay */}
      {showPromptWindow && (status === 'running' || status === 'completed') && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-2xl px-4">
          <div className="bg-background border border-border rounded-xl shadow-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-foreground">Make Changes</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPromptWindow(false)}
                className="h-7 w-7 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Describe the changes you want to make to the current discovery..."
                className={cn(
                  'w-full min-h-[80px] max-h-[150px] p-3 pr-12',
                  'rounded-lg border border-border bg-muted/30',
                  'text-foreground placeholder:text-muted-foreground',
                  'resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50'
                )}
              />
              <Button
                type="button"
                size="sm"
                disabled={!inputValue.trim()}
                onClick={() => {
                  // TODO: Implement change request handling
                  console.log('Change request:', inputValue)
                  setShowPromptWindow(false)
                  setInputValue('')
                }}
                className="absolute bottom-2 right-2"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Idle state placeholder with improved UX
 */
function IdleState({
  onConfigureClick,
  onExampleClick,
}: {
  onConfigureClick?: () => void
  onExampleClick?: (query: string, domain: string) => void
}) {
  const examples = [
    {
      domain: 'fuel-cells',
      title: 'Clean Energy',
      query: 'Develop novel catalyst materials for solid oxide electrolysis cells (SOEC) that can achieve >85% efficiency at operating temperatures below 700°C, focusing on mixed ionic-electronic conductors with enhanced oxygen vacancy formation',
    },
    {
      domain: 'solar-photovoltaics',
      title: 'Materials Science',
      query: 'Design thermally stable perovskite solar cell compositions using A-site cation engineering (Cs/FA/MA ratios) and 2D/3D heterojunction architectures to maintain >90% of initial efficiency after 1000 hours at 85°C',
    },
    {
      domain: 'battery-storage',
      title: 'Energy Storage',
      query: 'Identify sulfide-based solid electrolyte compositions (Li₆PS₅X family) with ionic conductivity >10 mS/cm at room temperature and electrochemical stability window >5V for next-generation solid-state batteries',
    },
    {
      domain: 'electrolyzers',
      title: 'Hydrogen Production',
      query: 'Evaluate low-cost, earth-abundant electrocatalysts (Ni-Mo, Co-P, Fe-Ni-S systems) for alkaline water electrolysis that can achieve <$2/kg H₂ production cost at industrial scale (>100 MW)',
    },
  ]

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      {/* Icon */}
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center mb-6">
        <PulsingBrain className="w-8 h-8" />
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-foreground mb-3">
        Start Your Discovery
      </h2>

      {/* Subtitle */}
      <p className="text-muted-foreground max-w-lg mb-8">
        Enter a scientific research query to begin
      </p>

      {/* Instructions */}
      <div className="bg-muted/30 rounded-xl p-6 max-w-2xl mb-8 text-left border border-border">
        <h3 className="text-sm font-semibold text-foreground mb-3 uppercase tracking-wide">
          How to write an effective query
        </h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">1.</span>
            <span><strong className="text-foreground">Be specific</strong> — Include target metrics, materials, or performance thresholds</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">2.</span>
            <span><strong className="text-foreground">Define constraints</strong> — Mention cost, temperature, scalability, or availability requirements</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold">3.</span>
            <span><strong className="text-foreground">State the goal</strong> — Describe what problem you&apos;re trying to solve or what you want to discover</span>
          </li>
        </ul>
      </div>

      {/* Example Queries */}
      <div className="w-full max-w-3xl">
        <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">
          Example Queries — Click to use
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {examples.map((example) => (
            <ExampleCard
              key={example.domain}
              title={example.title}
              example={example.query}
              onClick={() => onExampleClick?.(example.query, example.domain)}
            />
          ))}
        </div>
      </div>

      {/* Configure Button */}
      {onConfigureClick && (
        <Button
          variant="outline"
          onClick={onConfigureClick}
          className="mt-8 gap-2"
        >
          <Settings2 className="w-4 h-4" />
          Configure Discovery Options
        </Button>
      )}
    </div>
  )
}

function ExampleCard({
  title,
  example,
  onClick,
}: {
  title: string
  example: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-4 rounded-lg border border-border bg-muted/20 text-left transition-all',
        'hover:bg-muted/40 hover:border-primary/40 hover:shadow-md',
        'focus:outline-none focus:ring-2 focus:ring-primary/50',
        'cursor-pointer group'
      )}
    >
      <div className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide group-hover:text-primary/80">
        {title}
      </div>
      <div className="text-sm text-foreground line-clamp-3 leading-relaxed">
        {example}
      </div>
    </button>
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
 * Error state with checkpoint rollback options
 */
function ErrorState({
  error,
  onRetry,
  checkpoints,
  onRollback,
}: {
  error: string | null
  onRetry: () => void
  checkpoints?: Array<{phase: string; timestamp: Date; data: any}>
  onRollback?: (index: number) => void
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

      <div className="flex flex-col gap-3 items-center">
        <Button onClick={onRetry} variant="outline">
          Try Again
        </Button>

        {/* Checkpoint Rollback Options */}
        {checkpoints && checkpoints.length > 0 && onRollback && (
          <div className="mt-4 w-full max-w-sm">
            <p className="text-xs text-muted-foreground text-center mb-3">
              Or rollback to a previous checkpoint:
            </p>
            <div className="flex flex-col gap-2">
              {checkpoints.map((checkpoint, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={() => onRollback(index)}
                  className="justify-start gap-2 text-left"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="capitalize">{checkpoint.phase}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {checkpoint.timestamp.toLocaleTimeString()}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default FrontierScienceChatInterface
