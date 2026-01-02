'use client'

/**
 * BreakthroughEngineInterface Component
 *
 * A chat-style interface for the Breakthrough Engine v0.0.3
 * Matches the Discovery Engine's design language while featuring:
 * - 5-agent parallel hypothesis generation
 * - Real-time racing visualization
 * - 12-dimension breakthrough scoring (8 impact + 4 feasibility)
 * - Iterative refinement with feedback
 * - Feasibility confidence assessment
 *
 * @see lib/ai/agents/hypothesis-racer.ts - Racing logic
 * @see lib/ai/agents/breakthrough-evaluator.ts - Scoring
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  Send,
  Loader2,
  X,
  Trophy,
  Zap,
  Activity,
  Users,
  Clock,
  Target,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  FlaskConical,
  Brain,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Flame,
  RotateCcw,
  Download,
  FileText,
  Copy,
  Check,
  BookOpen,
  BarChart3,
  Microscope,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import {
  HypothesisRaceViewer,
  type RacingHypothesis,
  type RaceStats,
  AGENT_CONFIG,
  type HypGenAgentType,
} from '@/components/discovery/HypothesisRaceViewer'
import {
  type ClassificationTier,
  TIER_CONFIG,
} from '@/components/discovery/BreakthroughScoreCard'
import {
  useBreakthroughWorkflow,
  type BreakthroughPhase,
  type BreakthroughStatus,
} from '@/hooks/use-breakthrough-workflow'
import {
  BreakthroughPhaseTimeline,
  type BreakthroughEnginePhase,
} from '@/components/discovery/BreakthroughPhaseTimeline'

// ============================================================================
// Types
// ============================================================================

// EnginePhase includes 'hypothesis' as the combined phase, with 'generation' and 'racing' as legacy values
type EnginePhase = 'idle' | 'research' | 'hypothesis' | 'generation' | 'racing' | 'validation' | 'complete' | 'failed'
type EngineStatus = 'idle' | 'starting' | 'running' | 'completed' | 'failed'

// Map legacy phases to the unified "hypothesis" phase for display
function normalizePhase(phase: EnginePhase): EnginePhase {
  if (phase === 'generation' || phase === 'racing') {
    return 'hypothesis'
  }
  return phase
}

interface EngineConfig {
  maxIterations: number
  hypothesesPerAgent: number
  breakthroughThreshold: number
  eliminationThreshold: number
  enableGPU: boolean
}

interface ActivityEntry {
  time: Date
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

// Findings interface for export and fallback display
interface HypothesisFindings {
  _dataSource?: 'template' | 'real' // Indicates whether data is from template or real backend
  _notice?: string // Notice about data source for UI display
  methodology: string
  keyInsights: string[]
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  simulationResults?: {
    metric: string
    value: string
    unit: string
  }[]
  economicProjections?: {
    metric: string
    value: string
  }[]
}

// Extended hypothesis with real backend data for detailed views
interface ExtendedHypothesis extends RacingHypothesis {
  // Core data from backend (real data)
  statement?: string
  predictions?: Array<{ statement: string; expectedValue?: number; unit?: string }>
  mechanism?: { steps: Array<{ order: number; description: string; physicalPrinciple?: string }> }
  noveltyScore?: number
  feasibilityScore?: number
  impactScore?: number
  supportingEvidence?: Array<{ finding: string; citation: string; relevance: number }>
  refinementHistory?: Array<{ iteration: number; score: number; feedback?: string; improvements?: string[] }>
  // Legacy/backward compatibility fields
  description?: string
  findings?: HypothesisFindings
}

// ============================================================================
// Default Config
// ============================================================================

const DEFAULT_CONFIG: EngineConfig = {
  maxIterations: 5,
  hypothesesPerAgent: 3,
  breakthroughThreshold: 9.0,
  eliminationThreshold: 5.0,
  enableGPU: false,
}

// ============================================================================
// Phase Config
// ============================================================================

const PHASE_CONFIG: Record<EnginePhase, { label: string; icon: React.ReactNode; color: string; description: string }> = {
  idle: { label: 'Ready', icon: <Sparkles size={16} />, color: '#9CA3AF', description: 'Waiting to start' },
  research: { label: 'Research', icon: <Brain size={16} />, color: '#3B82F6', description: 'Synthesizing literature and identifying gaps' },
  hypothesis: { label: 'Hypothesis', icon: <Lightbulb size={16} />, color: '#8B5CF6', description: '5 agents generating and racing hypotheses' },
  generation: { label: 'Hypothesis', icon: <Lightbulb size={16} />, color: '#8B5CF6', description: '5 agents generating hypotheses in parallel' }, // Legacy - maps to hypothesis
  racing: { label: 'Hypothesis', icon: <Zap size={16} />, color: '#8B5CF6', description: 'Hypotheses competing through refinement iterations' }, // Legacy - maps to hypothesis
  validation: { label: 'Validation', icon: <FlaskConical size={16} />, color: '#10B981', description: 'Final validation with simulations' },
  complete: { label: 'Complete', icon: <Trophy size={16} />, color: '#10B981', description: 'Discovery complete' },
  failed: { label: 'Failed', icon: <AlertCircle size={16} />, color: '#EF4444', description: 'Discovery failed' },
}

// ============================================================================
// Main Component
// ============================================================================

export function BreakthroughEngineInterface() {
  // Real API hook (v0.0.2)
  const workflow = useBreakthroughWorkflow()

  // Toggle for real API vs simulation mode
  // Default to true to use real API with actual LLM calls
  const [useRealAPI, setUseRealAPI] = React.useState(true)

  // State (used in simulation mode)
  const [inputValue, setInputValue] = React.useState('')
  const [localStatus, setLocalStatus] = React.useState<EngineStatus>('idle')
  const [localPhase, setLocalPhase] = React.useState<EnginePhase>('idle')
  const [phaseProgress, setPhaseProgress] = React.useState(0)
  const [localThinkingMessage, setLocalThinkingMessage] = React.useState('')
  const [config, setConfig] = React.useState<EngineConfig>(DEFAULT_CONFIG)
  const [localQuery, setLocalQuery] = React.useState('')

  // Use hook state or local state based on mode
  const status: EngineStatus = useRealAPI ? workflow.status : localStatus
  const phase: EnginePhase = useRealAPI
    ? (workflow.phase === 'researching' ? 'research' :
       workflow.phase === 'generating' ? 'generation' :
       workflow.phase as EnginePhase)
    : localPhase
  const query = useRealAPI ? (workflow.query || '') : localQuery
  const thinkingMessage = useRealAPI ? (workflow.thinkingMessage || '') : localThinkingMessage

  // Setters that work for both modes
  const setStatus = useRealAPI ? () => {} : setLocalStatus
  const setPhase = useRealAPI ? () => {} : setLocalPhase
  const setQuery = useRealAPI ? () => {} : setLocalQuery
  const setThinkingMessage = useRealAPI ? () => {} : setLocalThinkingMessage

  // Racing state (used in simulation mode)
  const [localHypotheses, setLocalHypotheses] = React.useState<ExtendedHypothesis[]>([])

  // Use hook hypotheses or local hypotheses based on mode
  const hypotheses: ExtendedHypothesis[] = useRealAPI
    ? (workflow.hypotheses as ExtendedHypothesis[])
    : localHypotheses
  const setHypotheses = useRealAPI ? () => {} : setLocalHypotheses

  // Race stats (local for simulation mode)
  const [localRaceStats, setLocalRaceStats] = React.useState<RaceStats>({
    totalHypotheses: 0,
    activeCount: 0,
    eliminatedCount: 0,
    breakthroughCount: 0,
    currentIteration: 0,
    maxIterations: 5,
    topScore: 0,
    averageScore: 0,
    elapsedTimeMs: 0,
  })

  // Use hook stats or local stats based on mode
  const raceStats: RaceStats = useRealAPI
    ? {
        totalHypotheses: workflow.hypotheses.length + (workflow.result?.statistics?.totalEliminated || 0),
        activeCount: workflow.hypotheses.length,
        eliminatedCount: workflow.result?.statistics?.totalEliminated || 0,
        breakthroughCount: workflow.result?.statistics?.totalBreakthroughs || 0,
        currentIteration: workflow.currentIteration,
        maxIterations: workflow.maxIterations,
        topScore: workflow.leaderboard[0]?.score || 0,
        averageScore: workflow.result?.statistics?.averageScore || 0,
        elapsedTimeMs: workflow.elapsedTime,
      }
    : localRaceStats
  const setRaceStats = useRealAPI ? () => {} : setLocalRaceStats

  // Activity log (local for simulation mode)
  const [localActivities, setLocalActivities] = React.useState<ActivityEntry[]>([])

  // Use hook activities or local activities based on mode
  const activities: ActivityEntry[] = useRealAPI
    ? workflow.activities.map(a => ({
        time: a.time,
        message: a.message,
        type: a.type === 'breakthrough' ? 'success' : a.type,
      }))
    : localActivities
  const setActivities = useRealAPI ? () => {} : setLocalActivities

  // Selected hypothesis and report modal
  const [selectedHypothesis, setSelectedHypothesis] = React.useState<ExtendedHypothesis | null>(null)
  const [showReportModal, setShowReportModal] = React.useState(false)
  const [showExportPanel, setShowExportPanel] = React.useState(false)

  // Refs
  const inputRef = React.useRef<HTMLTextAreaElement>(null)
  const startTimeRef = React.useRef<number | null>(null)
  const timerRef = React.useRef<NodeJS.Timeout | null>(null)

  // Add activity log entry (for simulation mode)
  const addActivity = React.useCallback((message: string, type: ActivityEntry['type'] = 'info') => {
    if (!useRealAPI) {
      setLocalActivities(prev => [...prev.slice(-49), { time: new Date(), message, type }])
    }
  }, [useRealAPI])

  // Start discovery with a specific query
  const startDiscovery = React.useCallback(async (queryToRun: string) => {
    if (!queryToRun.trim() || status === 'running' || status === 'starting') return

    // Use real API when enabled
    if (useRealAPI) {
      setInputValue('')
      await workflow.startDiscovery(queryToRun.trim(), {
        maxIterations: config.maxIterations,
        breakthroughThreshold: config.breakthroughThreshold,
        eliminationThreshold: config.eliminationThreshold,
        winnersCount: 3,
      })
      return
    }

    // Simulation mode (legacy)

    const submittedQuery = queryToRun.trim()
    setQuery(submittedQuery)
    setInputValue('')
    setStatus('starting')
    startTimeRef.current = Date.now()
    addActivity(`Starting Breakthrough Engine for: "${submittedQuery}"`, 'info')

    // Start elapsed time counter
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setRaceStats(prev => ({
          ...prev,
          elapsedTimeMs: Date.now() - startTimeRef.current!,
        }))
      }
    }, 100)

    setStatus('running')

    try {
      // Phase 1: Research
      setPhase('research')
      setPhaseProgress(0)
      setThinkingMessage('Synthesizing literature from multiple sources...')
      addActivity('Phase 1: Research synthesis starting...', 'info')

      await simulatePhaseWithProgress(setPhaseProgress, setThinkingMessage, [
        'Querying Semantic Scholar for recent publications...',
        'Analyzing patent landscape via USPTO...',
        'Identifying research gaps and opportunities...',
        'Extracting key insights and prior art...',
      ])
      addActivity('Research synthesis complete', 'success')

      // Phase 2: Generation
      setPhase('generation')
      setPhaseProgress(0)
      setThinkingMessage('Generating hypotheses with 5 specialized agents...')
      addActivity('Phase 2: Parallel hypothesis generation...', 'info')

      const generatedHypotheses = await simulateHypothesisGeneration(submittedQuery, config, setThinkingMessage, setPhaseProgress)
      setHypotheses(generatedHypotheses)
      setRaceStats(prev => ({
        ...prev,
        totalHypotheses: generatedHypotheses.length,
        activeCount: generatedHypotheses.length,
        maxIterations: config.maxIterations,
      }))
      addActivity(`Generated ${generatedHypotheses.length} hypotheses from 5 separate agents`, 'success')

      // Phase 3: Racing
      setPhase('racing')
      setPhaseProgress(0)
      setThinkingMessage('Starting hypothesis racing arena...')
      addActivity('Phase 3: Hypothesis racing arena...', 'info')

      await simulateRacing(generatedHypotheses, config, setHypotheses, setRaceStats, addActivity, setThinkingMessage, setPhaseProgress)
      addActivity('Racing complete', 'success')

      // Phase 4: Validation
      setPhase('validation')
      setPhaseProgress(0)
      setThinkingMessage('Running final validation simulations...')
      addActivity('Phase 4: Final validation...', 'info')

      await simulatePhaseWithProgress(setPhaseProgress, setThinkingMessage, [
        'Running Monte Carlo simulations on top hypotheses...',
        'Performing techno-economic analysis...',
        'Checking physics constraints and feasibility...',
        'Generating final breakthrough scores...',
      ])
      addActivity('Validation complete', 'success')

      // Complete
      setPhase('complete')
      setStatus('completed')
      setPhaseProgress(100)
      setThinkingMessage('Discovery complete!')

      const breakthroughs = hypotheses.filter(h => h.status === 'breakthrough')
      if (breakthroughs.length > 0) {
        addActivity(`POTENTIAL BREAKTHROUGH FOUND! ${breakthroughs.length} breakthrough hypothesis found!`, 'success')
      } else {
        addActivity('No breakthroughs achieved, but significant discoveries found.', 'info')
      }

    } catch (error) {
      setStatus('failed')
      setPhase('failed')
      addActivity(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error')
    } finally {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [status, config, addActivity])

  // Handle form submission
  const handleSubmit = React.useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!inputValue.trim()) return
    await startDiscovery(inputValue)
  }, [inputValue, startDiscovery])

  // Reset engine
  const handleReset = React.useCallback(() => {
    // Use hook reset when in real API mode
    if (useRealAPI) {
      workflow.reset()
      setSelectedHypothesis(null)
      return
    }

    // Simulation mode reset
    setLocalStatus('idle')
    setLocalPhase('idle')
    setPhaseProgress(0)
    setLocalThinkingMessage('')
    setLocalQuery('')
    setLocalHypotheses([])
    setLocalRaceStats({
      totalHypotheses: 0,
      activeCount: 0,
      eliminatedCount: 0,
      breakthroughCount: 0,
      currentIteration: 0,
      maxIterations: config.maxIterations,
      topScore: 0,
      averageScore: 0,
      elapsedTimeMs: 0,
    })
    setSelectedHypothesis(null)
    setLocalActivities([])
    startTimeRef.current = null
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
  }, [config.maxIterations])

  // Cancel discovery
  const handleCancel = React.useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    setStatus('failed')
    setPhase('failed')
    addActivity('Discovery cancelled by user', 'warning')
  }, [addActivity])

  // Handle keyboard
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [])

  const isInputDisabled = status === 'running' || status === 'starting'

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header - Hidden when idle */}
      {status !== 'idle' && (
        <div className="shrink-0 border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/10 to-yellow-500/10 text-amber-600">
              <Microscope className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-foreground">Breakthrough Engine</h1>
              <p className="text-base text-muted-foreground">Multi-agent hypothesis generation with 12-dimension validation system</p>
            </div>

            {/* Phase Badge */}
            {status === 'running' && (
              <PhaseBadge phase={phase} />
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {status === 'running' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
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
        {status === 'idle' ? (
          /* Idle State - Match Discovery Engine layout */
          <div className="h-full flex flex-col">
            {/* Header - Fixed at top */}
            <div className="shrink-0 text-center pt-6 pb-4 px-6">
              <div className="mb-3 flex justify-center">
                <Microscope size={56} className="text-amber-600" />
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-2 text-amber-600">
                Breakthrough Engine
              </h1>
              <p className="text-base text-muted-foreground max-w-xl mx-auto">
                Multi-agent hypothesis generation with 12-dimension validation
              </p>
            </div>

            {/* Instructions Card - Scrollable */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-4">
              <div className="max-w-4xl w-full mx-auto">
                <IdleStateCard
                  onExampleClick={(exampleQuery) => {
                    startDiscovery(exampleQuery)
                  }}
                />
              </div>
            </div>

            {/* Input Area - Fixed at bottom */}
            <div className="shrink-0 border-t border-border px-6 py-3 bg-background">
              <form onSubmit={handleSubmit} className="w-full">
                <div className="flex gap-3 items-end">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isInputDisabled}
                    placeholder="Describe a clean energy research challenge to discover potential breakthrough solutions..."
                    className={cn(
                      'flex-1 min-h-[80px] max-h-[160px] p-3',
                      'rounded-xl border border-border bg-background',
                      'text-foreground placeholder:text-muted-foreground',
                      'resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={isInputDisabled || !inputValue.trim()}
                    className="h-[48px] px-6 shrink-0 bg-amber-600 hover:bg-amber-700"
                  >
                    {isInputDisabled ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-5 w-5 mr-2" />
                        Start Discovery
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : status === 'running' || status === 'starting' ? (
          /* Running State - Progress View */
          <div className="h-full overflow-y-auto px-4 py-6">
            <BreakthroughProgressCard
              query={query}
              phase={phase}
              phaseProgress={phaseProgress}
              thinkingMessage={thinkingMessage}
              hypotheses={hypotheses}
              raceStats={raceStats}
              activities={activities}
              selectedHypothesis={selectedHypothesis}
              onHypothesisClick={setSelectedHypothesis}
              onCancel={handleCancel}
            />
          </div>
        ) : status === 'completed' ? (
          /* Completed State - Results View */
          <div className="h-full overflow-y-auto px-4 py-6">
            <BreakthroughResultsCard
              query={query}
              hypotheses={hypotheses}
              raceStats={raceStats}
              onReset={handleReset}
              onHypothesisClick={setSelectedHypothesis}
              onViewReport={() => setShowReportModal(true)}
              onExport={() => setShowExportPanel(true)}
            />

            {/* Report Modal */}
            <BreakthroughReportModal
              isOpen={showReportModal}
              onClose={() => {
                setShowReportModal(false)
                setSelectedHypothesis(null)
              }}
              query={query}
              hypotheses={hypotheses}
              raceStats={raceStats}
              selectedHypothesis={selectedHypothesis}
              onSelectHypothesis={setSelectedHypothesis}
            />

            {/* Export Panel */}
            <BreakthroughExportPanel
              isOpen={showExportPanel}
              onClose={() => setShowExportPanel(false)}
              query={query}
              hypotheses={hypotheses}
              raceStats={raceStats}
            />
          </div>
        ) : status === 'failed' ? (
          /* Failed State */
          <div className="h-full overflow-y-auto px-4 py-6">
            <FailedStateCard
              query={query}
              activities={activities}
              onReset={handleReset}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ============================================================================
// Sub-Components
// ============================================================================

function PhaseBadge({ phase }: { phase: EnginePhase }) {
  const config = PHASE_CONFIG[phase]

  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium animate-pulse"
      style={{ backgroundColor: `${config.color}15`, color: config.color }}
    >
      {config.icon}
      <span>{config.label}</span>
    </div>
  )
}

function IdleStateCard({
  onExampleClick,
}: {
  onExampleClick: (query: string) => void
}) {
  const examples = [
    "Novel perovskite-silicon tandem architectures for >30% efficiency solar cells",
    "Breakthrough approaches to solid-state battery electrolytes with >5 mS/cm ionic conductivity",
    "Revolutionary methods for green hydrogen production at $2/kg",
  ]

  return (
    <div className="w-full rounded-xl border bg-card p-5">
      <h2 className="text-lg font-semibold text-foreground mb-4">
        How It Works
      </h2>

      {/* Steps - Compact inline layout */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-600 text-sm font-semibold">
            1
          </div>
          <div>
            <p className="text-sm text-foreground font-medium">Enter a query</p>
            <p className="text-xs text-muted-foreground mt-0.5">Describe a clean energy challenge.</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-600 text-sm font-semibold">
            2
          </div>
          <div>
            <p className="text-sm text-foreground font-medium">Hypothesis Generation</p>
            <p className="text-xs text-muted-foreground mt-0.5">Hypotheses are generated and refined.</p>
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-600 text-sm font-semibold">
            3
          </div>
          <div>
            <p className="text-sm text-foreground font-medium">Breakthrough Evaluation</p>
            <p className="text-xs text-muted-foreground mt-0.5">Hypotheses are evaluated for their potential.</p>
          </div>
        </div>
      </div>

      {/* Examples */}
      <div className="mb-5">
        <h3 className="text-sm font-medium text-foreground mb-2.5">
          Example Challenges
        </h3>
        <div className="space-y-2">
          {examples.map((example, index) => (
            <button
              key={index}
              onClick={() => onExampleClick(example)}
              className="w-full text-left p-2.5 rounded-lg bg-muted/50 border border-border text-sm text-muted-foreground italic hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-foreground transition-all duration-200 cursor-pointer group"
            >
              <span className="group-hover:text-amber-600">"{example}"</span>
            </button>
          ))}
        </div>
      </div>

      {/* 5 Agents & 12 Dimensions */}
      <div className="pt-4 border-t">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* 5 HypGen Agents */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2.5">5 Hypothesis Generation Agents</h3>
            <div className="space-y-1.5">
              {(['novel', 'feasible', 'economic', 'cross-domain', 'paradigm'] as const).map((agent) => {
                const agentConfig = AGENT_CONFIG[agent]
                return (
                  <div key={agent} className="flex items-center gap-2 text-sm">
                    <span
                      className="w-5 h-5 rounded flex items-center justify-center"
                      style={{ backgroundColor: `${agentConfig.color}20`, color: agentConfig.color }}
                    >
                      {agentConfig.icon}
                    </span>
                    <span className="text-foreground text-xs">{agentConfig.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 12 Breakthrough Dimensions */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-2.5">12-Dimension Scoring Criteria</h3>
            <div className="grid grid-cols-2 gap-1.5 text-xs text-muted-foreground">
              <span>Performance Gains</span>
              <span>Cost Reductions</span>
              <span>Advanced Capabilities</span>
              <span>New Applications</span>
              <span>Societal Impact</span>
              <span>Opportunity Scale</span>
              <span>Problem-Solving</span>
              <span>Knowledge Trajectory</span>
              <span>Technical Feasibility</span>
              <span>Existing Literature</span>
              <span>Existing Infrastructure</span>
              <span>Capital Requirements</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function BreakthroughProgressCard({
  query,
  phase,
  phaseProgress,
  thinkingMessage,
  hypotheses,
  raceStats,
  activities,
  selectedHypothesis,
  onHypothesisClick,
  onCancel,
}: {
  query: string
  phase: EnginePhase
  phaseProgress: number
  thinkingMessage: string
  hypotheses: RacingHypothesis[]
  raceStats: RaceStats
  activities: ActivityEntry[]
  selectedHypothesis: RacingHypothesis | null
  onHypothesisClick: (h: RacingHypothesis) => void
  onCancel: () => void
}) {
  const phaseConfig = PHASE_CONFIG[phase]
  const activityLogRef = React.useRef<HTMLDivElement>(null)

  // Convert EnginePhase to BreakthroughEnginePhase for timeline (normalize to unified phases)
  const normalizedPhase = normalizePhase(phase)
  const timelinePhase: BreakthroughEnginePhase = normalizedPhase === 'idle' ? 'research' : normalizedPhase as BreakthroughEnginePhase

  // Auto-scroll activity log to bottom when new entries added
  React.useEffect(() => {
    if (activityLogRef.current) {
      activityLogRef.current.scrollTop = activityLogRef.current.scrollHeight
    }
  }, [activities.length, thinkingMessage])

  // Combine activities with current thinking message for unified display
  const allActivities = React.useMemo(() => {
    const entries = [...activities]
    // Add current thinking message as the latest entry with improved deduplication
    // Check last 3 entries for similar messages (substring matching to catch variations)
    if (thinkingMessage) {
      const recentMessages = entries.slice(-3).map(a => a.message.toLowerCase())
      const normalizedThinking = thinkingMessage.toLowerCase()
      // Check if the message is substantially similar to recent entries
      const isDuplicate = recentMessages.some(msg =>
        msg === normalizedThinking ||
        msg.includes(normalizedThinking.slice(0, 30)) ||
        normalizedThinking.includes(msg.slice(0, 30))
      )
      if (!isDuplicate) {
        entries.push({
          time: new Date(),
          message: thinkingMessage,
          type: 'info' as const,
        })
      }
    }
    return entries
  }, [activities, thinkingMessage])

  return (
    <div className="space-y-6">
      {/* Query Display */}
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
        <div className="text-xs font-medium text-amber-600 mb-1">Research Challenge</div>
        <p className="text-foreground">{query}</p>
      </div>

      {/* Phase Timeline */}
      <div className="bg-card border rounded-xl p-6">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
          Discovery Progress
        </h3>
        <BreakthroughPhaseTimeline
          currentPhase={timelinePhase}
          showLabels={true}
          showProgress={true}
        />
      </div>

      {/* Current Phase Progress with Unified Activity Log */}
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${phaseConfig.color}20`, color: phaseConfig.color }}
            >
              {phaseConfig.icon}
            </div>
            <div>
              <div className="font-medium text-foreground">{phaseConfig.label}</div>
              <div className="text-sm text-muted-foreground">{phaseConfig.description}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold" style={{ color: phaseConfig.color }}>
              {phaseProgress}%
            </div>
            <div className="text-xs text-muted-foreground">
              {formatTime(raceStats.elapsedTimeMs)} elapsed
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden mb-4">
          <div
            className="h-full transition-all duration-300 rounded-full"
            style={{
              width: `${phaseProgress}%`,
              backgroundColor: phaseConfig.color,
            }}
          />
        </div>

        {/* Unified Real-Time Activity Log - Always visible */}
        <div className="border-t pt-4 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Live Activity Feed</span>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {allActivities.length} events
            </span>
          </div>
          <div
            ref={activityLogRef}
            className="max-h-[400px] overflow-y-auto space-y-2 pr-2"
          >
            {allActivities.length === 0 ? (
              <div className="text-sm text-muted-foreground italic">Waiting for activity...</div>
            ) : (
              allActivities.map((entry, index) => (
                <DetailedActivityEntry
                  key={`${entry.time.getTime()}-${index}`}
                  entry={entry}
                  isLatest={index === allActivities.length - 1}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Racing Visualization - Show during hypothesis phase (includes generation + racing) */}
      {(normalizedPhase === 'hypothesis' || normalizedPhase === 'validation') && hypotheses.length > 0 && (
        <div className="bg-card border rounded-xl p-6">
          <HypothesisRaceViewer
            hypotheses={hypotheses}
            stats={raceStats}
            showTrajectories={true}
            showEliminated={true}
            onHypothesisClick={onHypothesisClick}
          />
        </div>
      )}

      {/* Agent Status - Show during hypothesis phase */}
      {normalizedPhase === 'hypothesis' && (
        <div className="bg-card border rounded-xl p-6">
          <h3 className="text-sm font-medium text-foreground mb-4">Hypothesis Generation Agents</h3>
          <div className="grid grid-cols-5 gap-3">
            {(['novel', 'feasible', 'economic', 'cross-domain', 'paradigm'] as const).map((agent) => {
              const agentConfig = AGENT_CONFIG[agent]
              const agentHypotheses = hypotheses.filter(h => h.agentSource === agent)

              return (
                <div
                  key={agent}
                  className="p-3 rounded-lg border text-center"
                  style={{ borderColor: `${agentConfig.color}40` }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2"
                    style={{ backgroundColor: `${agentConfig.color}20`, color: agentConfig.color }}
                  >
                    {agentHypotheses.length > 0 ? (
                      <CheckCircle2 size={20} />
                    ) : (
                      <Loader2 size={20} className="animate-spin" />
                    )}
                  </div>
                  <div className="text-xs font-medium" style={{ color: agentConfig.color }}>
                    {agentConfig.label}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {agentHypotheses.length}/3 hypotheses
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Cancel Button */}
      <div className="flex justify-center">
        <Button variant="outline" onClick={onCancel}>
          <X size={16} className="mr-2" />
          Cancel Discovery
        </Button>
      </div>
    </div>
  )
}

/**
 * Detailed Activity Entry with full descriptions and visual styling
 */
function DetailedActivityEntry({ entry, isLatest }: { entry: ActivityEntry; isLatest: boolean }) {
  const icons = {
    info: <Activity size={14} className="text-blue-500" />,
    success: <CheckCircle2 size={14} className="text-emerald-500" />,
    warning: <AlertCircle size={14} className="text-amber-500" />,
    error: <XCircle size={14} className="text-red-500" />,
  }

  const bgColors = {
    info: isLatest ? 'bg-blue-50 dark:bg-blue-950/30' : '',
    success: 'bg-emerald-50 dark:bg-emerald-950/30',
    warning: 'bg-amber-50 dark:bg-amber-950/30',
    error: 'bg-red-50 dark:bg-red-950/30',
  }

  return (
    <div className={cn(
      'flex items-start gap-3 p-2 rounded-lg transition-colors',
      bgColors[entry.type],
      isLatest && 'ring-1 ring-blue-200 dark:ring-blue-800'
    )}>
      <span className="shrink-0 mt-0.5">{icons[entry.type]}</span>
      <div className="flex-1 min-w-0">
        <div className={cn(
          'text-sm',
          entry.type === 'error' && 'text-red-700 dark:text-red-400',
          entry.type === 'success' && 'text-emerald-700 dark:text-emerald-400',
          entry.type === 'warning' && 'text-amber-700 dark:text-amber-400',
          entry.type === 'info' && 'text-foreground'
        )}>
          {entry.message}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {entry.time.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          })}
        </div>
      </div>
      {isLatest && (
        <div className="shrink-0">
          <Loader2 size={12} className="animate-spin text-blue-500" />
        </div>
      )}
    </div>
  )
}

function BreakthroughResultsCard({
  query,
  hypotheses,
  raceStats,
  onReset,
  onHypothesisClick,
  onViewReport,
  onExport,
}: {
  query: string
  hypotheses: ExtendedHypothesis[]
  raceStats: RaceStats
  onReset: () => void
  onHypothesisClick: (h: ExtendedHypothesis) => void
  onViewReport: () => void
  onExport: () => void
}) {
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set(['hypotheses']))

  const breakthroughs = hypotheses.filter(h => h.status === 'breakthrough')
  const topHypotheses = hypotheses
    .filter(h => h.status !== 'eliminated')
    .sort((a, b) => b.currentScore - a.currentScore)
    .slice(0, 5)

  // Determine quality tier based on results
  const getQualityLabel = () => {
    if (breakthroughs.length >= 2) return { label: 'Exceptional', color: 'emerald' }
    if (breakthroughs.length === 1) return { label: 'Breakthrough', color: 'emerald' }
    if (raceStats.topScore >= 8.5) return { label: 'Near-Breakthrough', color: 'teal' }
    if (raceStats.topScore >= 7.0) return { label: 'Significant', color: 'blue' }
    return { label: 'Promising', color: 'amber' }
  }
  const quality = getQualityLabel()

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  return (
    <div className="border rounded-xl overflow-hidden bg-card flex flex-col h-full">
      {/* Header - Discovery Overview (matches FrontierScienceResultsCard) */}
      <div className="p-6 border-b bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-transparent">
        {/* Top Row - Title and Export */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
              {breakthroughs.length > 0 ? (
                <Trophy size={20} className="text-emerald-600" />
              ) : (
                <Sparkles size={20} className="text-emerald-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {breakthroughs.length > 0
                  ? `${breakthroughs.length} Breakthrough${breakthroughs.length > 1 ? 's' : ''} Achieved!`
                  : 'Breakthrough Report'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {formatTime(raceStats.elapsedTimeMs)} • {raceStats.totalHypotheses} hypotheses evaluated
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onViewReport}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors text-sm font-medium"
            >
              <FileText size={14} />
              Full Report
            </button>
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted transition-colors text-sm font-medium"
            >
              <Download size={14} />
              Export
            </button>
          </div>
        </div>

        {/* Query Display */}
        <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Research Challenge</p>
          <p className="text-sm text-foreground leading-relaxed">{query}</p>
        </div>

        {/* Discovery Metrics Grid (matches FrontierScienceResultsCard) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Quality Badge */}
          <div className="p-3 rounded-lg bg-card border border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Quality</p>
            <span className={cn(
              'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
              quality.color === 'emerald' && 'bg-emerald-500/20 text-emerald-600',
              quality.color === 'teal' && 'bg-teal-500/20 text-teal-600',
              quality.color === 'blue' && 'bg-blue-500/20 text-blue-600',
              quality.color === 'amber' && 'bg-amber-500/20 text-amber-600',
            )}>
              {quality.label}
            </span>
          </div>

          {/* Top Score */}
          <div className="p-3 rounded-lg bg-card border border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Top Score</p>
            <div className="flex items-baseline gap-1">
              <span className={cn(
                "text-xl font-bold",
                raceStats.topScore >= 9 ? "text-emerald-600" :
                raceStats.topScore >= 7 ? "text-blue-600" : "text-amber-600"
              )}>
                {raceStats.topScore.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">/10</span>
            </div>
          </div>

          {/* Breakthroughs */}
          <div className="p-3 rounded-lg bg-card border border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Breakthroughs</p>
            <div className="flex items-center gap-1.5">
              <Trophy size={16} className={breakthroughs.length > 0 ? 'text-emerald-600' : 'text-muted-foreground'} />
              <span className={cn(
                "text-lg font-semibold",
                breakthroughs.length > 0 ? "text-emerald-600" : "text-muted-foreground"
              )}>
                {breakthroughs.length}
              </span>
            </div>
          </div>

          {/* Iterations */}
          <div className="p-3 rounded-lg bg-card border border-border/50">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Iterations</p>
            <p className="text-sm font-medium text-foreground">
              {raceStats.currentIteration}/{raceStats.maxIterations} complete
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Breakthroughs Section (if any) */}
        {breakthroughs.length > 0 && (
          <ResultsSection
            id="breakthroughs"
            title={`Breakthrough${breakthroughs.length > 1 ? 's' : ''}`}
            icon={Trophy}
            accentColor="emerald"
            isExpanded={expandedSections.has('breakthroughs')}
            onToggle={() => toggleSection('breakthroughs')}
            badge={String(breakthroughs.length)}
          >
            <div className="space-y-3">
              {breakthroughs.map((hypothesis, index) => (
                <HypothesisResultCard
                  key={hypothesis.id}
                  hypothesis={hypothesis}
                  rank={index + 1}
                  onClick={() => onHypothesisClick(hypothesis)}
                  isBreakthrough
                />
              ))}
            </div>
          </ResultsSection>
        )}

        {/* Top Hypotheses Section */}
        <ResultsSection
          id="hypotheses"
          title="Top Hypotheses"
          icon={Lightbulb}
          accentColor="amber"
          isExpanded={expandedSections.has('hypotheses')}
          onToggle={() => toggleSection('hypotheses')}
          badge={String(topHypotheses.length)}
        >
          {topHypotheses.length > 0 ? (
            <div className="space-y-3">
              {topHypotheses.map((hypothesis, index) => (
                <HypothesisResultCard
                  key={hypothesis.id}
                  hypothesis={hypothesis}
                  rank={index + 1}
                  onClick={() => onHypothesisClick(hypothesis)}
                  isBreakthrough={hypothesis.status === 'breakthrough'}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Lightbulb size={32} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No hypotheses generated</p>
              <p className="text-xs mt-1 max-w-md mx-auto">
                The hypothesis generation encountered an issue. Try running a new discovery with a different query.
              </p>
            </div>
          )}
        </ResultsSection>

        {/* Statistics Section */}
        <ResultsSection
          id="statistics"
          title="Racing Statistics"
          icon={BarChart3}
          accentColor="blue"
          isExpanded={expandedSections.has('statistics')}
          onToggle={() => toggleSection('statistics')}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Hypotheses" value={raceStats.totalHypotheses} />
            <StatCard label="Eliminated" value={raceStats.eliminatedCount} />
            <StatCard label="Avg Score" value={raceStats.averageScore.toFixed(1)} />
            <StatCard label="Duration" value={formatTime(raceStats.elapsedTimeMs)} />
          </div>
        </ResultsSection>
      </div>

      {/* Footer - New Discovery */}
      <div className="p-4 border-t bg-muted/20 flex justify-center">
        <Button onClick={onReset} variant="outline" className="gap-2">
          <RotateCcw size={16} />
          New Discovery
        </Button>
      </div>
    </div>
  )
}

/**
 * Collapsible results section (matches FrontierScienceResultsCard pattern)
 */
function ResultsSection({
  id,
  title,
  icon: Icon,
  accentColor,
  isExpanded,
  onToggle,
  badge,
  children,
}: {
  id: string
  title: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  accentColor: 'emerald' | 'amber' | 'blue' | 'teal'
  isExpanded: boolean
  onToggle: () => void
  badge?: string
  children: React.ReactNode
}) {
  const colorClasses = {
    emerald: { bg: 'bg-emerald-500/10', icon: 'text-emerald-600', border: 'border-emerald-500/20', gradient: 'from-emerald-500/5' },
    amber: { bg: 'bg-amber-500/10', icon: 'text-amber-600', border: 'border-amber-500/20', gradient: 'from-amber-500/5' },
    blue: { bg: 'bg-blue-500/10', icon: 'text-blue-600', border: 'border-blue-500/20', gradient: 'from-blue-500/5' },
    teal: { bg: 'bg-teal-500/10', icon: 'text-teal-600', border: 'border-teal-500/20', gradient: 'from-teal-500/5' },
  }
  const colors = colorClasses[accentColor]

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden transition-all duration-200',
      isExpanded ? colors.border : 'border-border'
    )}>
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left',
          isExpanded && `bg-gradient-to-r ${colors.gradient} to-transparent`
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colors.bg)}>
            <Icon size={18} className={colors.icon} />
          </div>
          <span className="text-base font-semibold text-foreground">{title}</span>
          {badge && (
            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', colors.bg, colors.icon)}>
              {badge}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown size={18} className="text-muted-foreground" />
        ) : (
          <ChevronRight size={18} className="text-muted-foreground" />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 pt-2">
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * Hypothesis result card for the results view
 */
function HypothesisResultCard({
  hypothesis,
  rank,
  onClick,
  isBreakthrough,
}: {
  hypothesis: ExtendedHypothesis
  rank: number
  onClick: () => void
  isBreakthrough: boolean
}) {
  const agentConfig = AGENT_CONFIG[hypothesis.agentSource]
  const tierConfig = TIER_CONFIG[hypothesis.classification]

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 rounded-lg border text-left transition-all hover:border-foreground/20 hover:shadow-sm group',
        isBreakthrough
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : 'bg-card border-border'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
            rank === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
            rank === 2 ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' :
            rank === 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300' :
            'bg-muted text-muted-foreground'
          )}
        >
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isBreakthrough && (
              <Trophy size={14} className="text-emerald-500 shrink-0" />
            )}
            <span className="font-medium text-foreground truncate group-hover:text-amber-600 transition-colors">
              {hypothesis.title}
            </span>
          </div>
          {(hypothesis.statement || hypothesis.description) && (
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {hypothesis.statement || hypothesis.description}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${agentConfig.color}15`, color: agentConfig.color }}
            >
              {agentConfig.icon}
              {agentConfig.label}
            </span>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ backgroundColor: `${tierConfig.color}15`, color: tierConfig.color }}
            >
              {tierConfig.label}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold" style={{ color: tierConfig.color }}>
            {hypothesis.currentScore.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">
            {hypothesis.iteration} iteration{hypothesis.iteration !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </button>
  )
}

/**
 * Simple stat card for statistics section
 */
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}

function FailedStateCard({
  query,
  activities,
  onReset,
}: {
  query: string
  activities: ActivityEntry[]
  onReset: () => void
}) {
  const lastError = activities.filter(a => a.type === 'error').pop()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-6 text-center">
        <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Discovery Failed</h2>
        <p className="text-muted-foreground mb-4">
          {lastError?.message || 'An unexpected error occurred during the discovery process.'}
        </p>
        <p className="text-sm text-muted-foreground">Query: "{query}"</p>
      </div>

      <div className="flex justify-center">
        <Button onClick={onReset} className="bg-amber-600 hover:bg-amber-700">
          <RotateCcw size={16} className="mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Report Modal Component
// ============================================================================

function BreakthroughReportModal({
  isOpen,
  onClose,
  query,
  hypotheses,
  raceStats,
  selectedHypothesis,
  onSelectHypothesis,
}: {
  isOpen: boolean
  onClose: () => void
  query: string
  hypotheses: ExtendedHypothesis[]
  raceStats: RaceStats
  selectedHypothesis: ExtendedHypothesis | null
  onSelectHypothesis: (h: ExtendedHypothesis | null) => void
}) {
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set(['overview', 'hypotheses']))

  if (!isOpen) return null

  const breakthroughs = hypotheses.filter(h => h.status === 'breakthrough')
  const topHypotheses = hypotheses
    .filter(h => h.status !== 'eliminated')
    .sort((a, b) => b.currentScore - a.currentScore)

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  // Generate dynamic recommendations based on actual results
  const generateDynamicRecommendations = (): string[] => {
    const recs: string[] = []

    // Top hypothesis recommendation
    if (topHypotheses.length > 0) {
      const top = topHypotheses[0]
      recs.push(`Prioritize "${top.title}" (${top.currentScore.toFixed(1)}/10) for detailed experimental validation`)
    }

    // Breakthrough-specific recommendation
    if (breakthroughs.length > 0) {
      recs.push(`${breakthroughs.length} breakthrough${breakthroughs.length > 1 ? 's' : ''} achieved - fast-track these for patent review and industry partnership discussions`)
    } else if (raceStats.topScore >= 8.0) {
      recs.push('Near-breakthrough results achieved - consider targeted refinement to push scores above 9.0')
    }

    // Agent diversity recommendation
    const agentTypes = new Set(topHypotheses.slice(0, 5).map(h => h.agentSource))
    if (agentTypes.size >= 3) {
      recs.push('Multiple agent perspectives succeeded - consider combining insights for hybrid approaches')
    }

    // Elimination analysis
    if (raceStats.eliminatedCount > raceStats.totalHypotheses * 0.5) {
      recs.push('High elimination rate suggests research area may need broader exploration or refined query')
    }

    // Scale-up recommendation for economic viability
    const economicHypotheses = topHypotheses.filter(h => h.agentSource === 'economic')
    if (economicHypotheses.length > 0 && economicHypotheses[0].currentScore >= 7.0) {
      recs.push('Strong economic viability indicated - conduct techno-economic analysis at pilot scale')
    }

    // Always add patent protection for high-scoring novel approaches
    const novelHypotheses = topHypotheses.filter(h => h.agentSource === 'novel' && h.currentScore >= 7.0)
    if (novelHypotheses.length > 0) {
      recs.push('Novel approaches identified with IP potential - pursue patent protection before publication')
    }

    // Fallback if no specific recommendations
    if (recs.length < 3) {
      recs.push('Engage with domain experts to validate computational findings')
    }

    return recs.slice(0, 5) // Max 5 recommendations
  }

  const dynamicRecommendations = generateDynamicRecommendations()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="shrink-0 border-b p-6 bg-gradient-to-r from-amber-500/5 to-yellow-500/5">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20 flex items-center justify-center">
                <FileText size={24} className="text-amber-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-1">
                  Breakthrough Discovery Report
                </h2>
                <p className="text-sm text-muted-foreground max-w-xl line-clamp-2">
                  {query}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-muted-foreground" />
              <span className="text-muted-foreground">Duration:</span>
              <span className="font-medium text-foreground">{formatTime(raceStats.elapsedTimeMs)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-emerald-500" />
              <span className="text-muted-foreground">Breakthroughs:</span>
              <span className="font-medium text-foreground">{breakthroughs.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Target size={14} className="text-muted-foreground" />
              <span className="text-muted-foreground">Top Score:</span>
              <span className="font-medium text-foreground">{raceStats.topScore.toFixed(1)}/10</span>
            </div>
            <div className="flex items-center gap-2">
              <Lightbulb size={14} className="text-muted-foreground" />
              <span className="text-muted-foreground">Hypotheses:</span>
              <span className="font-medium text-foreground">{raceStats.totalHypotheses}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Overview Section */}
          <ReportSectionCard
            id="overview"
            title="Executive Summary"
            icon={BookOpen}
            color="amber"
            isExpanded={expandedSections.has('overview')}
            onToggle={() => toggleSection('overview')}
          >
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-foreground/80 leading-relaxed">
                This breakthrough discovery session evaluated <strong>{raceStats.totalHypotheses} hypotheses</strong> across
                5 specialized HypGen agents (Novel, Feasible, Economic, Cross-Domain, and Paradigm-Shift).
                After <strong>{raceStats.maxIterations} iterations</strong> of evaluation and refinement,
                {breakthroughs.length > 0 ? (
                  <> <strong>{breakthroughs.length} breakthrough{breakthroughs.length > 1 ? 's were' : ' was'}</strong> achieved
                    with scores of 9.0 or higher.</>
                ) : (
                  <> no breakthroughs were achieved, but significant discoveries were found.</>
                )}
              </p>
              <p className="text-foreground/80 leading-relaxed">
                The top-performing hypothesis achieved a score of <strong>{raceStats.topScore.toFixed(1)}/10</strong>,
                with an average score of <strong>{raceStats.averageScore.toFixed(1)}/10</strong> across all active hypotheses.
                <strong> {raceStats.eliminatedCount} hypotheses</strong> were eliminated during the racing phase due to
                scores falling below the 5.0 threshold.
              </p>
            </div>
          </ReportSectionCard>

          {/* Hypothesis Detail View (when one is selected) */}
          {selectedHypothesis && (
            <div className="border-2 border-amber-500/30 rounded-xl overflow-hidden">
              <div className="bg-amber-500/5 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Lightbulb size={20} className="text-amber-600" />
                  <h3 className="font-semibold text-foreground">{selectedHypothesis.title}</h3>
                </div>
                <button
                  onClick={() => onSelectHypothesis(null)}
                  className="text-sm text-amber-600 hover:text-amber-700"
                >
                  Back to all hypotheses
                </button>
              </div>
              <HypothesisDetailView hypothesis={selectedHypothesis} />
            </div>
          )}

          {/* Hypotheses List (when none selected) */}
          {!selectedHypothesis && (
            <ReportSectionCard
              id="hypotheses"
              title="Hypothesis Analysis"
              icon={Lightbulb}
              color="amber"
              isExpanded={expandedSections.has('hypotheses')}
              onToggle={() => toggleSection('hypotheses')}
            >
              <div className="space-y-3">
                {topHypotheses.map((hypothesis, index) => {
                  const agentConfig = AGENT_CONFIG[hypothesis.agentSource]
                  const tierConfig = TIER_CONFIG[hypothesis.classification]

                  return (
                    <button
                      key={hypothesis.id}
                      onClick={() => onSelectHypothesis(hypothesis)}
                      className={cn(
                        'w-full p-4 rounded-lg border text-left transition-all hover:border-amber-500/30 hover:bg-amber-500/5',
                        hypothesis.status === 'breakthrough' && 'bg-emerald-50/30 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                            index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' :
                            index === 1 ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300' :
                            index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                            'bg-muted text-muted-foreground'
                          )}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {hypothesis.status === 'breakthrough' && (
                              <Trophy size={12} className="text-emerald-500 shrink-0" />
                            )}
                            <span className="font-medium text-foreground text-sm">{hypothesis.title}</span>
                          </div>
                          {hypothesis.description && (
                            <p className="text-xs text-muted-foreground mb-2">{hypothesis.description}</p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: `${agentConfig.color}20`, color: agentConfig.color }}
                            >
                              {agentConfig.icon}
                              {agentConfig.label}
                            </span>
                            <span
                              className="text-xs px-1.5 py-0.5 rounded font-medium"
                              style={{ backgroundColor: `${tierConfig.color}20`, color: tierConfig.color }}
                            >
                              {tierConfig.label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {hypothesis.iteration} iterations
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-lg font-bold" style={{ color: tierConfig.color }}>
                            {hypothesis.currentScore.toFixed(1)}
                          </div>
                          <ArrowRight size={14} className="text-amber-500 mt-1 ml-auto" />
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </ReportSectionCard>
          )}

          {/* Recommendations - Dynamically generated based on results */}
          {!selectedHypothesis && dynamicRecommendations.length > 0 && (
            <ReportSectionCard
              id="recommendations"
              title="Key Recommendations"
              icon={Target}
              color="emerald"
              isExpanded={expandedSections.has('recommendations')}
              onToggle={() => toggleSection('recommendations')}
            >
              <div className="space-y-3">
                {dynamicRecommendations.map((rec, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10"
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-600 text-xs font-medium">
                      {index + 1}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            </ReportSectionCard>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t p-4 flex items-center justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Hypothesis Detail View
// ============================================================================

function HypothesisDetailView({ hypothesis }: { hypothesis: ExtendedHypothesis }) {
  const agentConfig = AGENT_CONFIG[hypothesis.agentSource]
  const tierConfig = TIER_CONFIG[hypothesis.classification]

  // Check if we have real data from backend
  const hasRealData = hypothesis.statement || hypothesis.predictions || hypothesis.mechanism

  return (
    <div className="p-6 space-y-6">
      {/* Score and Classification */}
      <div className="flex items-start gap-6">
        <div className="text-center">
          <div className="text-4xl font-bold" style={{ color: tierConfig.color }}>
            {hypothesis.currentScore.toFixed(1)}
          </div>
          <div className="text-xs text-muted-foreground">Score</div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="flex items-center gap-1 text-sm px-2 py-1 rounded"
              style={{ backgroundColor: `${agentConfig.color}20`, color: agentConfig.color }}
            >
              {agentConfig.icon}
              {agentConfig.label} Agent
            </span>
            <span
              className="text-sm px-2 py-1 rounded font-medium"
              style={{ backgroundColor: `${tierConfig.color}20`, color: tierConfig.color }}
            >
              {tierConfig.label}
            </span>
          </div>
        </div>
      </div>

      {/* Core Metrics Grid */}
      {(hypothesis.noveltyScore !== undefined || hypothesis.feasibilityScore !== undefined || hypothesis.impactScore !== undefined) && (
        <div className="grid grid-cols-3 gap-4">
          {hypothesis.noveltyScore !== undefined && (
            <div className="border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{hypothesis.noveltyScore}</div>
              <div className="text-xs text-muted-foreground">Novelty</div>
            </div>
          )}
          {hypothesis.feasibilityScore !== undefined && (
            <div className="border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">{hypothesis.feasibilityScore}</div>
              <div className="text-xs text-muted-foreground">Feasibility</div>
            </div>
          )}
          {hypothesis.impactScore !== undefined && (
            <div className="border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{hypothesis.impactScore}</div>
              <div className="text-xs text-muted-foreground">Impact</div>
            </div>
          )}
        </div>
      )}

      {/* Hypothesis Statement */}
      {hypothesis.statement && (
        <div className="border rounded-lg p-4">
          <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <Lightbulb size={14} className="text-amber-500" />
            Hypothesis Statement
          </h4>
          <p className="text-sm text-foreground/80 leading-relaxed">{hypothesis.statement}</p>
        </div>
      )}

      {/* Mechanism */}
      {hypothesis.mechanism?.steps && hypothesis.mechanism.steps.length > 0 && (
        <div className="border rounded-lg p-4">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <FlaskConical size={14} className="text-amber-500" />
            Proposed Mechanism
          </h4>
          <div className="space-y-3">
            {hypothesis.mechanism.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-xs font-medium text-amber-700 dark:text-amber-300 shrink-0">
                  {step.order}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground/80">{step.description}</p>
                  {step.physicalPrinciple && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      Principle: {step.physicalPrinciple}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Predictions */}
      {hypothesis.predictions && hypothesis.predictions.length > 0 && (
        <div className="border rounded-lg p-4">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Target size={14} className="text-blue-500" />
            Testable Predictions
          </h4>
          <div className="space-y-2">
            {hypothesis.predictions.map((pred, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="text-foreground/80">{pred.statement}</span>
                  {pred.expectedValue !== undefined && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                      Expected: {pred.expectedValue}{pred.unit ? ` ${pred.unit}` : ''}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Supporting Evidence */}
      {hypothesis.supportingEvidence && hypothesis.supportingEvidence.length > 0 && (
        <div className="border rounded-lg p-4 bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
          <h4 className="text-sm font-medium text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
            <BookOpen size={14} />
            Supporting Evidence
          </h4>
          <div className="space-y-2">
            {hypothesis.supportingEvidence.map((ev, i) => (
              <div key={i} className="text-sm">
                <p className="text-foreground/80">{ev.finding}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Source: {ev.citation} • Relevance: {Math.round(ev.relevance * 100)}%
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Refinement History */}
      {hypothesis.refinementHistory && hypothesis.refinementHistory.length > 0 && (
        <div className="border rounded-lg p-4">
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Activity size={14} className="text-amber-500" />
            Refinement History
          </h4>
          <div className="space-y-3">
            {hypothesis.refinementHistory.map((entry, i) => (
              <div key={i} className="border-l-2 border-amber-200 dark:border-amber-800 pl-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-foreground">Iteration {entry.iteration}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    Score: {entry.score.toFixed(1)}
                  </span>
                </div>
                {entry.feedback && (
                  <p className="text-xs text-muted-foreground mt-1">{entry.feedback}</p>
                )}
                {entry.improvements && entry.improvements.length > 0 && (
                  <ul className="mt-1 space-y-1">
                    {entry.improvements.map((imp, j) => (
                      <li key={j} className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <ArrowRight size={10} />
                        {imp}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Score History Chart */}
      <div className="border rounded-lg p-4">
        <h4 className="text-sm font-medium text-foreground mb-3">Score Progression</h4>
        <div className="flex items-end gap-1 h-20">
          {hypothesis.scoreHistory.map((score, i) => (
            <div
              key={i}
              className="flex-1 rounded-t transition-all"
              style={{
                height: `${(score / 10) * 100}%`,
                backgroundColor: getClassification(score) === 'breakthrough'
                  ? '#10B981'
                  : getClassification(score) === 'scientific_discovery'
                  ? '#3B82F6'
                  : getClassification(score) === 'general_insights'
                  ? '#8B5CF6'
                  : getClassification(score) === 'partial_failure'
                  ? '#F59E0B'
                  : '#EF4444',
              }}
              title={`Iteration ${i + 1}: ${score.toFixed(1)}`}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>Iteration 1</span>
          <span>Iteration {hypothesis.scoreHistory.length}</span>
        </div>
      </div>

      {/* Fallback message if no detailed data */}
      {!hasRealData && (
        <div className="border rounded-lg p-4 bg-amber-50/30 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-700 dark:text-amber-400 text-center">
            Detailed hypothesis data is being generated. Full analysis will be available when the discovery completes.
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Report Section Card
// ============================================================================

function ReportSectionCard({
  id,
  title,
  icon: Icon,
  color,
  isExpanded,
  onToggle,
  children,
}: {
  id: string
  title: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  color: 'amber' | 'emerald' | 'blue'
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  const colorClasses = {
    amber: {
      bg: 'bg-amber-500/10',
      icon: 'text-amber-600',
      border: 'border-amber-500/20',
      gradient: 'from-amber-500/5',
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      icon: 'text-emerald-600',
      border: 'border-emerald-500/20',
      gradient: 'from-emerald-500/5',
    },
    blue: {
      bg: 'bg-blue-500/10',
      icon: 'text-blue-600',
      border: 'border-blue-500/20',
      gradient: 'from-blue-500/5',
    },
  }

  const colors = colorClasses[color]

  return (
    <div className={cn('rounded-xl border overflow-hidden', isExpanded ? colors.border : 'border-border')}>
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left',
          isExpanded && `bg-gradient-to-r ${colors.gradient} to-transparent`
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colors.bg)}>
            <Icon size={18} className={colors.icon} />
          </div>
          <span className="text-base font-semibold text-foreground">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronDown size={18} className="text-muted-foreground" />
        ) : (
          <ArrowRight size={18} className="text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2">
          {children}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Export Panel Component
// ============================================================================

type ExportFormat = 'pdf' | 'json' | 'markdown' | 'debug'

function BreakthroughExportPanel({
  isOpen,
  onClose,
  query,
  hypotheses,
  raceStats,
}: {
  isOpen: boolean
  onClose: () => void
  query: string
  hypotheses: ExtendedHypothesis[]
  raceStats: RaceStats
}) {
  const [selectedFormat, setSelectedFormat] = React.useState<ExportFormat>('markdown')
  const [isExporting, setIsExporting] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  if (!isOpen) return null

  const generateMarkdown = (): string => {
    const lines: string[] = []
    const breakthroughs = hypotheses.filter(h => h.status === 'breakthrough')
    const topHypotheses = hypotheses
      .filter(h => h.status !== 'eliminated')
      .sort((a, b) => b.currentScore - a.currentScore)

    lines.push('# Breakthrough Discovery Report')
    lines.push('')
    lines.push(`**Research Query:** ${query}`)
    lines.push(`**Generated:** ${new Date().toLocaleString()}`)
    lines.push(`**Duration:** ${formatTime(raceStats.elapsedTimeMs)}`)
    lines.push(`**Top Score:** ${raceStats.topScore.toFixed(1)}/10`)
    lines.push(`**Breakthroughs:** ${breakthroughs.length}`)
    lines.push('')
    lines.push('---')
    lines.push('')

    // Executive Summary
    lines.push('## Executive Summary')
    lines.push('')
    lines.push(`This breakthrough discovery session evaluated ${raceStats.totalHypotheses} hypotheses across 5 specialized HypGen agents. After ${raceStats.maxIterations} iterations of evaluation and refinement, ${breakthroughs.length > 0 ? `${breakthroughs.length} breakthrough${breakthroughs.length > 1 ? 's were' : ' was'} achieved.` : 'no breakthroughs were achieved, but significant discoveries were found.'}`)
    lines.push('')
    lines.push('---')
    lines.push('')

    // Top Hypotheses
    lines.push('## Top Hypotheses')
    lines.push('')

    topHypotheses.forEach((h, index) => {
      const agentConfig = AGENT_CONFIG[h.agentSource]
      lines.push(`### ${index + 1}. ${h.title}`)
      lines.push('')
      lines.push(`**Score:** ${h.currentScore.toFixed(1)}/10 | **Agent:** ${agentConfig.label} | **Iterations:** ${h.iteration}`)
      lines.push('')
      if (h.description) {
        lines.push(`> ${h.description}`)
        lines.push('')
      }

      if (h.findings) {
        lines.push('**Methodology:**')
        lines.push(h.findings.methodology)
        lines.push('')

        lines.push('**Key Insights:**')
        h.findings.keyInsights.forEach(insight => {
          lines.push(`- ${insight}`)
        })
        lines.push('')

        lines.push('**Strengths:**')
        h.findings.strengths.forEach(s => {
          lines.push(`- ${s}`)
        })
        lines.push('')

        lines.push('**Areas for Improvement:**')
        h.findings.weaknesses.forEach(w => {
          lines.push(`- ${w}`)
        })
        lines.push('')

        if (h.findings.simulationResults) {
          lines.push('**Simulation Results:**')
          h.findings.simulationResults.forEach(r => {
            lines.push(`- ${r.metric}: ${r.value} ${r.unit}`)
          })
          lines.push('')
        }

        if (h.findings.economicProjections) {
          lines.push('**Economic Projections:**')
          h.findings.economicProjections.forEach(p => {
            lines.push(`- ${p.metric}: ${p.value}`)
          })
          lines.push('')
        }

        lines.push('**Recommendations:**')
        h.findings.recommendations.forEach(rec => {
          lines.push(`- ${rec}`)
        })
        lines.push('')
      }

      lines.push('---')
      lines.push('')
    })

    lines.push('## Next Steps')
    lines.push('')
    lines.push('1. Focus on the top 3 hypotheses for detailed experimental validation')
    lines.push('2. Consider combining insights from multiple agents for hybrid approaches')
    lines.push('3. Conduct techno-economic analysis at larger scales for promising candidates')
    lines.push('4. Engage with industry partners for co-development opportunities')
    lines.push('5. Pursue patent protection for novel approaches identified')
    lines.push('')
    lines.push('---')
    lines.push('')
    lines.push('*Generated by Exergy Lab Breakthrough Engine v0.0.2*')

    return lines.join('\n')
  }

  const generateJSON = (): string => {
    const topHypotheses = hypotheses
      .filter(h => h.status !== 'eliminated')
      .sort((a, b) => b.currentScore - a.currentScore)

    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '0.0.2',
        engine: 'Breakthrough Engine',
      },
      query,
      stats: {
        duration: raceStats.elapsedTimeMs,
        totalHypotheses: raceStats.totalHypotheses,
        breakthroughs: raceStats.breakthroughCount,
        eliminated: raceStats.eliminatedCount,
        topScore: raceStats.topScore,
        averageScore: raceStats.averageScore,
        iterations: raceStats.maxIterations,
      },
      hypotheses: topHypotheses.map(h => ({
        id: h.id,
        title: h.title,
        description: h.description,
        agentSource: h.agentSource,
        status: h.status,
        score: h.currentScore,
        classification: h.classification,
        iterations: h.iteration,
        scoreHistory: h.scoreHistory,
        findings: h.findings,
      })),
    }

    return JSON.stringify(exportData, null, 2)
  }

  const handleExport = async () => {
    setIsExporting(true)

    try {
      let data: string
      let filename: string
      let mimeType: string

      switch (selectedFormat) {
        case 'pdf':
          // For PDF, we'll use html2pdf - generate markdown first
          const markdown = generateMarkdown()
          // Dynamic import of html2pdf.js
          const html2pdf = (await import('html2pdf.js')).default

          // Convert markdown to HTML (basic conversion)
          let html = markdown
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^- (.*$)/gm, '<li>$1</li>')
            .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
            .replace(/^---$/gm, '<hr>')
            .replace(/\n\n/g, '</p><p>')

          html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)

          const container = document.createElement('div')
          container.innerHTML = `
            <style>
              .pdf-content { font-family: 'Segoe UI', sans-serif; line-height: 1.6; padding: 20px; color: #333; }
              .pdf-content h1 { color: #1a1a1a; border-bottom: 2px solid #7c3aed; padding-bottom: 10px; }
              .pdf-content h2 { color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-top: 30px; }
              .pdf-content h3 { color: #374151; margin-top: 20px; }
              .pdf-content ul { margin: 10px 0; padding-left: 25px; }
              .pdf-content li { margin: 5px 0; }
              .pdf-content blockquote { border-left: 4px solid #7c3aed; padding-left: 15px; color: #4b5563; font-style: italic; background: #f3f4f6; padding: 10px 15px; border-radius: 0 8px 8px 0; }
              .pdf-content hr { border: none; border-top: 1px solid #e5e7eb; margin: 30px 0; }
              .pdf-content strong { color: #111827; }
            </style>
            <div class="pdf-content"><p>${html}</p></div>
          `

          const options = {
            margin: [10, 10, 10, 10] as [number, number, number, number],
            filename: `breakthrough-report-${Date.now()}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
          }

          await html2pdf().set(options).from(container).save()
          setIsExporting(false)
          return

        case 'json':
          data = generateJSON()
          filename = `breakthrough-report-${Date.now()}.json`
          mimeType = 'application/json'
          break

        case 'debug':
          data = generateDebugAnalysis()
          filename = `breakthrough-debug-${Date.now()}.md`
          mimeType = 'text/markdown'
          break

        case 'markdown':
        default:
          data = generateMarkdown()
          filename = `breakthrough-report-${Date.now()}.md`
          mimeType = 'text/markdown'
          break
      }

      // Download file
      const blob = new Blob([data], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopy = async () => {
    let data: string
    switch (selectedFormat) {
      case 'json':
        data = generateJSON()
        break
      case 'debug':
        data = generateDebugAnalysis()
        break
      case 'markdown':
      case 'pdf':
      default:
        data = generateMarkdown()
        break
    }
    await navigator.clipboard.writeText(data)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const generateDebugAnalysis = (): string => {
    const lines: string[] = []
    const breakthroughs = hypotheses.filter(h => h.status === 'breakthrough')
    const eliminated = hypotheses.filter(h => h.status === 'eliminated')
    const active = hypotheses.filter(h => h.status !== 'eliminated')
    const topHypotheses = hypotheses
      .filter(h => h.status !== 'eliminated')
      .sort((a, b) => b.currentScore - a.currentScore)

    // Header with analysis instructions
    lines.push('# BREAKTHROUGH ENGINE DEBUG ANALYSIS')
    lines.push('')
    lines.push('## ANALYSIS INSTRUCTIONS FOR CLAUDE')
    lines.push('')
    lines.push('This is a structured debug export from the Exergy Lab Breakthrough Engine v0.0.2.')
    lines.push('Please analyze this data to identify:')
    lines.push('1. **Performance Issues**: Bottlenecks, slow phases, inefficient operations')
    lines.push('2. **Quality Issues**: Why hypotheses failed to reach breakthrough status')
    lines.push('3. **Agent Effectiveness**: Which HypGen agents are underperforming')
    lines.push('4. **Dimension Weaknesses**: Which breakthrough dimensions are hardest to satisfy')
    lines.push('5. **Improvement Recommendations**: Specific, actionable suggestions')
    lines.push('')
    lines.push('---')
    lines.push('')

    // Session Overview
    lines.push('## 1. SESSION OVERVIEW')
    lines.push('')
    lines.push('```yaml')
    lines.push(`query: "${query}"`)
    lines.push(`status: completed`)
    lines.push(`engine_version: 0.6.0`)
    lines.push(`exported_at: ${new Date().toISOString()}`)
    lines.push(`total_duration_ms: ${raceStats.elapsedTimeMs}`)
    lines.push('```')
    lines.push('')

    // Performance Metrics
    lines.push('## 2. PERFORMANCE METRICS')
    lines.push('')
    lines.push('```yaml')
    lines.push(`breakthrough_rate: ${((breakthroughs.length / hypotheses.length) * 100).toFixed(1)}%`)
    lines.push(`average_final_score: ${raceStats.averageScore.toFixed(2)}/10`)
    lines.push(`top_score: ${raceStats.topScore.toFixed(2)}/10`)
    lines.push(`elimination_rate: ${((eliminated.length / hypotheses.length) * 100).toFixed(1)}%`)
    lines.push(`total_hypotheses: ${raceStats.totalHypotheses}`)
    lines.push(`breakthroughs_achieved: ${raceStats.breakthroughCount}`)
    lines.push(`max_iterations: ${raceStats.maxIterations}`)
    lines.push('```')
    lines.push('')

    // Performance Assessment
    lines.push('### Performance Assessment')
    lines.push('')
    if (breakthroughs.length === 0) {
      lines.push('- **CRITICAL**: No breakthroughs achieved. Review hypothesis quality and evaluation criteria.')
    } else if (breakthroughs.length / hypotheses.length < 0.1) {
      lines.push('- **WARNING**: Low breakthrough rate (<10%). Consider improving initial hypothesis quality.')
    } else {
      lines.push('- **OK**: Breakthrough rate is acceptable.')
    }
    if (eliminated.length / hypotheses.length > 0.7) {
      lines.push('- **WARNING**: High elimination rate (>70%). Initial hypotheses may be too weak.')
    }
    if (raceStats.averageScore < 6.0) {
      lines.push('- **WARNING**: Low average score (<6.0). Refinement process may need improvement.')
    }
    lines.push('')

    // Agent Effectiveness
    lines.push('## 3. HYPGEN AGENT EFFECTIVENESS')
    lines.push('')
    lines.push('| Agent | Hypotheses | Avg Score | Breakthroughs | Status |')
    lines.push('|-------|------------|-----------|---------------|--------|')

    const agentTypes: HypGenAgentType[] = ['novel', 'feasible', 'economic', 'cross-domain', 'paradigm']
    for (const agentType of agentTypes) {
      const agentHypotheses = hypotheses.filter(h => h.agentSource === agentType)
      const agentBreakthroughs = agentHypotheses.filter(h => h.status === 'breakthrough')
      const avgScore = agentHypotheses.length > 0
        ? agentHypotheses.reduce((sum, h) => sum + h.currentScore, 0) / agentHypotheses.length
        : 0

      let status = '✓ Good'
      if (avgScore < 6.0) status = '⚠ Weak'
      if (agentBreakthroughs.length > 0) status = '★ Excellent'

      lines.push(`| ${agentType} | ${agentHypotheses.length} | ${avgScore.toFixed(2)} | ${agentBreakthroughs.length} | ${status} |`)
    }
    lines.push('')

    // Hypothesis Details
    lines.push('## 4. HYPOTHESIS ANALYSIS')
    lines.push('')

    if (breakthroughs.length > 0) {
      lines.push('### Breakthroughs Achieved')
      lines.push('')
      for (const hyp of breakthroughs) {
        const agentConfig = AGENT_CONFIG[hyp.agentSource]
        lines.push(`#### ${hyp.title}`)
        lines.push('')
        lines.push(`- **Score**: ${hyp.currentScore.toFixed(2)}/10`)
        lines.push(`- **Agent**: ${agentConfig.label}`)
        lines.push(`- **Iterations**: ${hyp.iteration}`)
        if (hyp.description) {
          lines.push(`- **Description**: ${hyp.description}`)
        }
        if (hyp.findings) {
          lines.push('')
          lines.push('**Key Insights:**')
          for (const insight of hyp.findings.keyInsights) {
            lines.push(`- ${insight}`)
          }
          lines.push('')
          lines.push('**Strengths:**')
          for (const s of hyp.findings.strengths) {
            lines.push(`- ${s}`)
          }
          lines.push('')
          lines.push('**Weaknesses:**')
          for (const w of hyp.findings.weaknesses) {
            lines.push(`- ${w}`)
          }
        }
        lines.push('')
      }
    } else {
      lines.push('### Breakthroughs Achieved')
      lines.push('')
      lines.push('**None** - No hypotheses reached the 9.0 breakthrough threshold.')
      lines.push('')
    }

    // Top performers
    lines.push('### Top Performers')
    lines.push('')
    for (const hyp of topHypotheses.slice(0, 5)) {
      const tierConfig = TIER_CONFIG[hyp.classification]
      lines.push(`- **${hyp.title}**: ${hyp.currentScore.toFixed(2)}/10 (${tierConfig.label}, ${hyp.iteration} iterations)`)
    }
    lines.push('')

    // Score History
    lines.push('## 5. SCORE PROGRESSION DATA')
    lines.push('')
    for (const hyp of topHypotheses.slice(0, 3)) {
      lines.push(`### ${hyp.title}`)
      lines.push('')
      lines.push('| Iteration | Score | Delta | Classification |')
      lines.push('|-----------|-------|-------|----------------|')
      for (let i = 0; i < hyp.scoreHistory.length; i++) {
        const score = hyp.scoreHistory[i]
        const prevScore = i > 0 ? hyp.scoreHistory[i - 1] : score
        const delta = score - prevScore
        const deltaStr = delta >= 0 ? `+${delta.toFixed(2)}` : delta.toFixed(2)
        const classification = getClassification(score)
        lines.push(`| ${i + 1} | ${score.toFixed(2)} | ${deltaStr} | ${classification} |`)
      }
      lines.push('')
    }

    // Suggested Improvements
    lines.push('## 6. SUGGESTED IMPROVEMENTS')
    lines.push('')
    const improvements: string[] = []
    if (breakthroughs.length === 0) {
      improvements.push('No breakthroughs achieved - review hypothesis generation strategies and evaluation criteria')
    }
    if (eliminated.length / hypotheses.length > 0.7) {
      improvements.push('High elimination rate - improve initial hypothesis quality or lower elimination threshold')
    }
    for (const agentType of agentTypes) {
      const agentHypotheses = hypotheses.filter(h => h.agentSource === agentType)
      if (agentHypotheses.length > 0) {
        const avgScore = agentHypotheses.reduce((sum, h) => sum + h.currentScore, 0) / agentHypotheses.length
        if (avgScore < 6.0) {
          improvements.push(`${agentType} agent underperforming (avg: ${avgScore.toFixed(2)}) - review generation strategy`)
        }
      }
    }
    if (improvements.length === 0) {
      improvements.push('Session performed well - consider running with more iterations for higher breakthrough rate')
    }
    for (let i = 0; i < improvements.length; i++) {
      lines.push(`${i + 1}. ${improvements[i]}`)
    }
    lines.push('')

    // Analysis Request
    lines.push('---')
    lines.push('')
    lines.push('## ANALYSIS REQUEST')
    lines.push('')
    lines.push('Based on the data above, please provide:')
    lines.push('')
    lines.push('1. **Root Cause Analysis**: What are the primary reasons this session did/didn\'t achieve breakthroughs?')
    lines.push('2. **Agent Optimization**: Which agents should be improved and how?')
    lines.push('3. **Refinement Strategy**: How can we improve the hypothesis refinement process?')
    lines.push('4. **Code Changes**: Specific code changes that would address the issues found.')
    lines.push('')
    lines.push('*Generated by Exergy Lab Breakthrough Engine v0.0.2*')

    return lines.join('\n')
  }

  const exportOptions: { format: ExportFormat; label: string; description: string; icon: React.ReactNode; recommended?: boolean }[] = [
    { format: 'debug', label: 'Debug Analysis', description: 'Optimized for Claude/LLM analysis', icon: <Brain size={20} />, recommended: true },
    { format: 'markdown', label: 'Markdown', description: 'Human-readable summary', icon: <FileText size={20} /> },
    { format: 'pdf', label: 'PDF Report', description: 'Formatted document for sharing', icon: <FileText size={20} /> },
    { format: 'json', label: 'JSON Data', description: 'Raw data for programmatic use', icon: <FileText size={20} /> },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-card border rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="border-b p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Download size={24} className="text-amber-600" />
              <h2 className="text-xl font-semibold text-foreground">Export Results</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {exportOptions.map((option) => (
            <button
              key={option.format}
              onClick={() => setSelectedFormat(option.format)}
              className={cn(
                'w-full flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all',
                selectedFormat === option.format
                  ? 'border-amber-500 bg-amber-500/5'
                  : 'border-border hover:border-amber-500/30'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center',
                selectedFormat === option.format ? 'bg-amber-500/20 text-amber-600' : 'bg-muted text-muted-foreground'
              )}>
                {option.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{option.label}</span>
                  {option.recommended && (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-emerald-500/20 text-emerald-400 rounded">
                      Recommended
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{option.description}</div>
              </div>
              {selectedFormat === option.format && (
                <Check size={20} className="text-amber-600 shrink-0" />
              )}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex items-center justify-between">
          <Button variant="outline" onClick={handleCopy} disabled={isExporting}>
            {copied ? (
              <>
                <Check size={16} className="mr-2 text-emerald-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy size={16} className="mr-2" />
                Copy to Clipboard
              </>
            )}
          </Button>
          <Button onClick={handleExport} disabled={isExporting} className="bg-amber-600 hover:bg-amber-700">
            {isExporting ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download size={16} className="mr-2" />
                Download
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ActivityLogEntry({ entry }: { entry: ActivityEntry }) {
  const icons = {
    info: <Activity size={12} className="text-blue-500" />,
    success: <CheckCircle2 size={12} className="text-green-500" />,
    warning: <AlertCircle size={12} className="text-amber-500" />,
    error: <XCircle size={12} className="text-red-500" />,
  }

  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="shrink-0 mt-0.5">{icons[entry.type]}</span>
      <span className="text-muted-foreground">
        {entry.time.toLocaleTimeString('en-US', { hour12: false })}
      </span>
      <span className={cn(
        'flex-1',
        entry.type === 'error' && 'text-red-600',
        entry.type === 'success' && 'text-green-600'
      )}>
        {entry.message}
      </span>
    </div>
  )
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

async function simulatePhaseWithProgress(
  setProgress: (p: number) => void,
  setMessage: (m: string) => void,
  messages: string[]
): Promise<void> {
  const interval = 2000 / messages.length

  for (let i = 0; i < messages.length; i++) {
    setMessage(messages[i])
    setProgress(Math.round(((i + 1) / messages.length) * 100))
    await new Promise(resolve => setTimeout(resolve, interval))
  }
}

/**
 * Generate query-relevant hypothesis titles based on the user's research query
 * This ensures hypotheses are contextually relevant to the problem domain
 */
function generateQueryRelevantHypotheses(
  prompt: string,
  agentType: HypGenAgentType,
  count: number
): { title: string; description: string; findings: HypothesisFindings }[] {
  // Extract key domain terms from the query
  const lowerPrompt = prompt.toLowerCase()

  // Determine the primary domain
  const isSolar = lowerPrompt.includes('solar') || lowerPrompt.includes('pv') || lowerPrompt.includes('photovoltaic')
  const isBattery = lowerPrompt.includes('battery') || lowerPrompt.includes('storage') || lowerPrompt.includes('lithium') || lowerPrompt.includes('electrolyte')
  const isHydrogen = lowerPrompt.includes('hydrogen') || lowerPrompt.includes('fuel cell') || lowerPrompt.includes('electrolyzer')
  const isWind = lowerPrompt.includes('wind') || lowerPrompt.includes('turbine')
  const isManufacturing = lowerPrompt.includes('manufactur') || lowerPrompt.includes('process') || lowerPrompt.includes('production')
  const isEfficiency = lowerPrompt.includes('efficien') || lowerPrompt.includes('performance') || lowerPrompt.includes('optim')
  const isCost = lowerPrompt.includes('cost') || lowerPrompt.includes('cheap') || lowerPrompt.includes('afford')

  // Generate domain-specific hypothesis templates
  const hypothesisTemplates: Record<string, { title: string; description: string; findings: HypothesisFindings }[]> = {
    // Solar-related hypotheses
    solar: [
      {
        title: 'Perovskite-silicon tandem with self-healing interface layer',
        description: 'Novel interface engineering approach using self-healing polymers to improve long-term stability of perovskite-silicon tandem cells.',
        findings: generateFindings('solar', agentType, 'tandem'),
      },
      {
        title: 'Low-temperature passivation for TOPCon cell manufacturing',
        description: 'Revolutionary low-temperature plasma-enhanced passivation technique reducing thermal budget by 40%.',
        findings: generateFindings('solar', agentType, 'passivation'),
      },
      {
        title: 'Inline defect detection using hyperspectral imaging',
        description: 'AI-powered real-time quality control system for detecting micro-defects during cell production.',
        findings: generateFindings('solar', agentType, 'defect'),
      },
      {
        title: 'Bifacial module encapsulation with enhanced durability',
        description: 'Novel encapsulant materials with improved UV resistance and thermal cycling performance.',
        findings: generateFindings('solar', agentType, 'encapsulation'),
      },
      {
        title: 'Selective emitter formation using laser doping',
        description: 'Precision laser-based selective emitter technology for improved cell efficiency.',
        findings: generateFindings('solar', agentType, 'laser'),
      },
    ],
    // Battery-related hypotheses
    battery: [
      {
        title: 'Solid-state electrolyte with enhanced ionic conductivity',
        description: 'Novel ceramic-polymer composite electrolyte achieving >5 mS/cm at room temperature.',
        findings: generateFindings('battery', agentType, 'electrolyte'),
      },
      {
        title: 'Silicon-graphene anode composite for high-capacity cells',
        description: 'Hierarchical silicon-graphene architecture preventing capacity fade from volume expansion.',
        findings: generateFindings('battery', agentType, 'anode'),
      },
      {
        title: 'Self-healing binder system for electrode integrity',
        description: 'Dynamic covalent bond network enabling autonomous repair of electrode damage.',
        findings: generateFindings('battery', agentType, 'binder'),
      },
      {
        title: 'Dry electrode manufacturing for reduced energy consumption',
        description: 'Solvent-free electrode production reducing manufacturing costs by 30%.',
        findings: generateFindings('battery', agentType, 'dry-electrode'),
      },
      {
        title: 'AI-optimized formation protocol for faster cell activation',
        description: 'Machine learning-driven formation cycling reducing activation time by 50%.',
        findings: generateFindings('battery', agentType, 'formation'),
      },
    ],
    // Hydrogen-related hypotheses
    hydrogen: [
      {
        title: 'Non-precious metal catalyst for PEM electrolysis',
        description: 'Earth-abundant catalyst achieving comparable performance to platinum group metals.',
        findings: generateFindings('hydrogen', agentType, 'catalyst'),
      },
      {
        title: 'High-pressure membrane electrode assembly design',
        description: 'Novel MEA architecture enabling direct production of 700 bar hydrogen.',
        findings: generateFindings('hydrogen', agentType, 'membrane'),
      },
      {
        title: 'Solar-thermal hydrogen production via thermochemical cycles',
        description: 'Integrated solar concentrator with metal oxide redox cycles for water splitting.',
        findings: generateFindings('hydrogen', agentType, 'thermal'),
      },
      {
        title: 'Biological hydrogen production using engineered microorganisms',
        description: 'Genetically modified cyanobacteria with enhanced hydrogen evolution rates.',
        findings: generateFindings('hydrogen', agentType, 'bio'),
      },
      {
        title: 'Ammonia cracking for hydrogen carrier systems',
        description: 'Low-temperature ammonia decomposition catalyst for distributed hydrogen generation.',
        findings: generateFindings('hydrogen', agentType, 'ammonia'),
      },
    ],
    // Wind-related hypotheses
    wind: [
      {
        title: 'Vertical axis turbine with adaptive blade pitch',
        description: 'Self-adjusting VAWT design for optimal performance across wind conditions.',
        findings: generateFindings('wind', agentType, 'vawt'),
      },
      {
        title: 'Offshore floating platform with integrated storage',
        description: 'Hybrid floating wind-battery system for grid-stable power delivery.',
        findings: generateFindings('wind', agentType, 'offshore'),
      },
      {
        title: 'Recyclable blade materials using thermoplastic composites',
        description: 'Fully recyclable wind turbine blades enabling circular economy approach.',
        findings: generateFindings('wind', agentType, 'blade'),
      },
      {
        title: 'Airborne wind energy using autonomous kites',
        description: 'High-altitude wind harvesting with tethered autonomous flight systems.',
        findings: generateFindings('wind', agentType, 'airborne'),
      },
      {
        title: 'Predictive maintenance using structural health monitoring',
        description: 'IoT sensor network with AI-driven failure prediction for wind assets.',
        findings: generateFindings('wind', agentType, 'maintenance'),
      },
    ],
    // General clean energy hypotheses
    general: [
      {
        title: 'Multi-junction concentrator photovoltaics for utility scale',
        description: 'High-efficiency CPV system with spectral splitting for >45% efficiency.',
        findings: generateFindings('general', agentType, 'cpv'),
      },
      {
        title: 'Thermal energy storage using phase change materials',
        description: 'Novel PCM formulation with high energy density and thermal stability.',
        findings: generateFindings('general', agentType, 'thermal-storage'),
      },
      {
        title: 'Grid-scale flow battery with organic electrolytes',
        description: 'Sustainable redox flow battery using earth-abundant organic molecules.',
        findings: generateFindings('general', agentType, 'flow-battery'),
      },
      {
        title: 'Wave energy converter with resonant point absorber',
        description: 'Optimized wave energy harvesting using frequency-matched mechanical design.',
        findings: generateFindings('general', agentType, 'wave'),
      },
      {
        title: 'Geothermal enhanced system with supercritical CO2',
        description: 'Deep geothermal extraction using sCO2 as working fluid for enhanced heat transfer.',
        findings: generateFindings('general', agentType, 'geothermal'),
      },
    ],
  }

  // Select the most relevant domain
  let selectedDomain = 'general'
  if (isSolar) selectedDomain = 'solar'
  else if (isBattery) selectedDomain = 'battery'
  else if (isHydrogen) selectedDomain = 'hydrogen'
  else if (isWind) selectedDomain = 'wind'

  // Apply agent-specific modifications
  const templates = hypothesisTemplates[selectedDomain]

  // Shuffle and select hypotheses for this agent
  const shuffled = [...templates].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}

/**
 * Generate realistic findings for a hypothesis
 */
function generateFindings(
  domain: string,
  agentType: HypGenAgentType,
  variant: string
): HypothesisFindings {
  // Base findings templates per domain
  const methodologies: Record<string, string> = {
    solar: 'Computational screening of materials using DFT calculations, followed by experimental validation using thin-film deposition and characterization techniques including XRD, SEM, and EQE measurements.',
    battery: 'Electrochemical testing using coin cells and pouch cells, combined with in-situ characterization techniques including impedance spectroscopy and synchrotron X-ray diffraction.',
    hydrogen: 'Catalyst synthesis and characterization combined with electrochemical testing in three-electrode cells and MEA performance evaluation.',
    wind: 'CFD simulation coupled with scaled wind tunnel testing and field validation using instrumented prototype installations.',
    general: 'Multi-physics simulation and optimization, followed by laboratory-scale prototype development and techno-economic analysis.',
  }

  const keyInsights: Record<string, string[]> = {
    solar: [
      'Interface defect density reduced by 2 orders of magnitude',
      'Carrier lifetime improved from 1.2 to 2.8 ms',
      'Manufacturing throughput increased by 35%',
      'Module efficiency potential exceeds 26%',
    ],
    battery: [
      'Ionic conductivity of 8.2 mS/cm achieved at 25°C',
      'Coulombic efficiency maintained at 99.8% over 500 cycles',
      'Energy density increased to 450 Wh/kg at cell level',
      'Formation time reduced from 24h to 8h',
    ],
    hydrogen: [
      'Overpotential reduced by 180 mV at 1 A/cm²',
      'Catalyst loading reduced by 80% vs. Pt baseline',
      'System efficiency reached 78% (HHV basis)',
      'Degradation rate below 0.5%/1000h operation',
    ],
    wind: [
      'Capacity factor improved by 12% across wind conditions',
      'Blade recyclability reaches 95% by mass',
      'LCOE reduction of 18% vs. conventional designs',
      'Maintenance costs reduced by 40% through predictive analytics',
    ],
    general: [
      'System efficiency exceeds theoretical baseline by 15%',
      'Capital cost reduction pathway identified to $50/kWh',
      'Scalability demonstrated from lab to pilot scale',
      'Environmental impact reduced by 60% vs. incumbent technology',
    ],
  }

  const strengths: Record<HypGenAgentType, string[]> = {
    novel: [
      'First-of-kind approach with strong IP potential',
      'Addresses fundamental limitations in current technology',
      'Opens new research directions',
    ],
    feasible: [
      'Uses commercially available equipment and materials',
      'Compatible with existing manufacturing infrastructure',
      'Clear pathway to industrial implementation',
    ],
    economic: [
      'Strong ROI potential with <3 year payback',
      'Reduces OPEX by 25% vs. baseline',
      'Creates value across the supply chain',
    ],
    'cross-domain': [
      'Leverages proven concepts from adjacent industries',
      'Benefits from existing knowledge and supply chains',
      'Reduces development risk through technology transfer',
    ],
    paradigm: [
      'Potential to disrupt existing market dynamics',
      'Enables previously impossible applications',
      'Creates new value propositions for end users',
    ],
    fusion: [
      'Combines 3+ domains for novel synthesis',
      'High citation distance indicates paradigm potential',
      'Multi-disciplinary approach reduces blind spots',
    ],
  }

  const weaknesses: Record<string, string[]> = {
    solar: [
      'Long-term stability requires further validation',
      'Scale-up challenges in uniform film deposition',
      'Supply chain for novel materials not yet established',
    ],
    battery: [
      'High-temperature processing may limit applications',
      'Interface stability under fast charging needs optimization',
      'Cost of precursor materials requires attention',
    ],
    hydrogen: [
      'Catalyst durability under dynamic operation needs improvement',
      'Membrane performance at high temperature requires enhancement',
      'System integration complexity',
    ],
    wind: [
      'Extreme weather resilience needs validation',
      'Grid integration requirements vary by region',
      'Supply chain logistics for large components',
    ],
    general: [
      'Technology readiness level currently at TRL 4-5',
      'Regulatory pathway not yet fully defined',
      'Market acceptance requires demonstration projects',
    ],
  }

  const recommendations: Record<string, string[]> = {
    solar: [
      'Conduct accelerated aging studies (IEC 61215)',
      'Partner with equipment manufacturers for scale-up',
      'Engage with module producers for pilot integration',
    ],
    battery: [
      'Validate performance in automotive-relevant conditions',
      'Develop recycling process for end-of-life materials',
      'Establish supply agreements with material suppliers',
    ],
    hydrogen: [
      'Perform techno-economic analysis at MW scale',
      'Engage with electrolyzer OEMs for co-development',
      'Pursue demonstration project funding',
    ],
    wind: [
      'Complete full-scale prototype testing',
      'Develop certification pathway with classification society',
      'Identify pilot project sites with supportive policy frameworks',
    ],
    general: [
      'Secure additional R&D funding for TRL advancement',
      'Build industry consortium for pre-competitive research',
      'Develop IP strategy and freedom-to-operate analysis',
    ],
  }

  const simulationMetrics: Record<string, { metric: string; value: string; unit: string }[]> = {
    solar: [
      { metric: 'Cell Efficiency', value: '24.8', unit: '%' },
      { metric: 'Fill Factor', value: '82.3', unit: '%' },
      { metric: 'Voc', value: '0.72', unit: 'V' },
      { metric: 'Degradation Rate', value: '0.3', unit: '%/year' },
    ],
    battery: [
      { metric: 'Energy Density', value: '420', unit: 'Wh/kg' },
      { metric: 'Cycle Life', value: '1500', unit: 'cycles' },
      { metric: 'Charging Rate', value: '4', unit: 'C' },
      { metric: 'Capacity Retention', value: '92', unit: '%' },
    ],
    hydrogen: [
      { metric: 'Stack Efficiency', value: '72', unit: '%' },
      { metric: 'Current Density', value: '2.5', unit: 'A/cm²' },
      { metric: 'Hydrogen Purity', value: '99.999', unit: '%' },
      { metric: 'Operating Temperature', value: '80', unit: '°C' },
    ],
    wind: [
      { metric: 'Capacity Factor', value: '48', unit: '%' },
      { metric: 'AEP Increase', value: '12', unit: '%' },
      { metric: 'Availability', value: '97', unit: '%' },
      { metric: 'Sound Level', value: '42', unit: 'dB(A)' },
    ],
    general: [
      { metric: 'System Efficiency', value: '85', unit: '%' },
      { metric: 'Round-trip Efficiency', value: '78', unit: '%' },
      { metric: 'Response Time', value: '50', unit: 'ms' },
      { metric: 'Lifetime', value: '25', unit: 'years' },
    ],
  }

  const economicMetrics: Record<string, { metric: string; value: string }[]> = {
    solar: [
      { metric: 'LCOE', value: '$0.028/kWh' },
      { metric: 'Module Cost', value: '$0.18/Wp' },
      { metric: 'IRR', value: '18%' },
      { metric: 'Payback Period', value: '4.2 years' },
    ],
    battery: [
      { metric: 'Pack Cost', value: '$95/kWh' },
      { metric: 'LCOS', value: '$0.08/kWh-cycle' },
      { metric: 'NPV (10yr)', value: '$2.4M' },
      { metric: 'Manufacturing Cost', value: '$72/kWh' },
    ],
    hydrogen: [
      { metric: 'LCOH', value: '$1.85/kg' },
      { metric: 'Stack Cost', value: '$280/kW' },
      { metric: 'System CAPEX', value: '$450/kW' },
      { metric: 'OPEX', value: '$15/MWh' },
    ],
    wind: [
      { metric: 'LCOE', value: '$0.032/kWh' },
      { metric: 'CAPEX', value: '$1,420/kW' },
      { metric: 'O&M', value: '$12/MWh' },
      { metric: 'NPV (25yr)', value: '$45M' },
    ],
    general: [
      { metric: 'LCOE', value: '$0.045/kWh' },
      { metric: 'System CAPEX', value: '$800/kW' },
      { metric: 'IRR', value: '14%' },
      { metric: 'Payback', value: '6 years' },
    ],
  }

  return {
    _dataSource: 'template' as const,
    _notice: 'These findings are illustrative templates. Actual research findings will be populated from backend analysis.',
    methodology: methodologies[domain] || methodologies.general,
    keyInsights: keyInsights[domain] || keyInsights.general,
    strengths: strengths[agentType],
    weaknesses: weaknesses[domain] || weaknesses.general,
    recommendations: recommendations[domain] || recommendations.general,
    simulationResults: simulationMetrics[domain] || simulationMetrics.general,
    economicProjections: economicMetrics[domain] || economicMetrics.general,
  }
}

async function simulateHypothesisGeneration(
  prompt: string,
  config: EngineConfig,
  setMessage: (m: string) => void,
  setProgress: (p: number) => void
): Promise<ExtendedHypothesis[]> {
  const agents: HypGenAgentType[] = ['novel', 'feasible', 'economic', 'cross-domain', 'paradigm']
  const hypotheses: ExtendedHypothesis[] = []

  for (let agentIndex = 0; agentIndex < agents.length; agentIndex++) {
    const agent = agents[agentIndex]
    setMessage(`${AGENT_CONFIG[agent].label} agent generating hypotheses...`)
    setProgress(Math.round(((agentIndex + 1) / agents.length) * 100))

    await new Promise(resolve => setTimeout(resolve, 400))

    // Generate query-relevant hypotheses for this agent
    const generatedHypotheses = generateQueryRelevantHypotheses(prompt, agent, config.hypothesesPerAgent)

    for (let i = 0; i < generatedHypotheses.length; i++) {
      const { title, description, findings } = generatedHypotheses[i]
      const initialScore = 5 + Math.random() * 3

      hypotheses.push({
        id: `hyp_${agent}_${i}`,
        title,
        description,
        findings,
        agentSource: agent,
        status: 'active',
        currentScore: initialScore,
        scoreHistory: [initialScore],
        classification: getClassification(initialScore),
        iteration: 1,
      })
    }
  }

  return hypotheses
}

async function simulateRacing(
  initialHypotheses: RacingHypothesis[],
  config: EngineConfig,
  setHypotheses: React.Dispatch<React.SetStateAction<RacingHypothesis[]>>,
  setRaceStats: React.Dispatch<React.SetStateAction<RaceStats>>,
  addLog: (message: string, type: 'info' | 'success' | 'warning' | 'error') => void,
  setMessage: (m: string) => void,
  setProgress: (p: number) => void
): Promise<void> {
  let hypotheses = [...initialHypotheses]

  for (let iteration = 2; iteration <= config.maxIterations; iteration++) {
    setMessage(`Iteration ${iteration}: Evaluating and refining hypotheses...`)
    setProgress(Math.round(((iteration - 1) / (config.maxIterations - 1)) * 100))

    await new Promise(resolve => setTimeout(resolve, 1500))

    addLog(`Iteration ${iteration}: Evaluating and refining hypotheses...`, 'info')

    hypotheses = hypotheses.map(h => {
      if (h.status !== 'active') return h

      const previousScore = h.currentScore
      const scoreChange = (Math.random() - 0.3) * 1.5
      let newScore = Math.max(0, Math.min(10, previousScore + scoreChange))

      let status: 'active' | 'breakthrough' | 'eliminated' = 'active'

      if (newScore >= config.breakthroughThreshold) {
        status = 'breakthrough'
        addLog(`BREAKTHROUGH: "${h.title}" achieved score ${newScore.toFixed(1)}!`, 'success')
      } else if (newScore < config.eliminationThreshold) {
        status = 'eliminated'
        addLog(`Eliminated: "${h.title}" (score: ${newScore.toFixed(1)})`, 'warning')
      }

      return {
        ...h,
        previousScore,
        currentScore: newScore,
        scoreHistory: [...h.scoreHistory, newScore],
        classification: getClassification(newScore),
        status,
        iteration,
        eliminatedReason: status === 'eliminated' ? `Score below ${config.eliminationThreshold}` : undefined,
      }
    })

    setHypotheses(hypotheses)

    const activeHypotheses = hypotheses.filter(h => h.status === 'active' || h.status === 'breakthrough')
    const scores = activeHypotheses.map(h => h.currentScore)

    setRaceStats(prev => ({
      ...prev,
      currentIteration: iteration,
      activeCount: hypotheses.filter(h => h.status === 'active').length,
      eliminatedCount: hypotheses.filter(h => h.status === 'eliminated').length,
      breakthroughCount: hypotheses.filter(h => h.status === 'breakthrough').length,
      topScore: scores.length > 0 ? Math.max(...scores) : 0,
      averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    }))
  }

  setProgress(100)
}

function getClassification(score: number): ClassificationTier {
  if (score >= 9.0) return 'breakthrough'
  if (score >= 8.0) return 'scientific_discovery'
  if (score >= 6.5) return 'general_insights'
  if (score >= 5.0) return 'partial_failure'
  return 'failure'
}

// ============================================================================
// Exports
// ============================================================================

export default BreakthroughEngineInterface
