'use client'

/**
 * DiscoveryConfigPanel Component
 *
 * Single-column configuration panel with color-coded presets at the top.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Settings2,
  Beaker,
  Cpu,
  ChevronDown,
  ChevronRight,
  Zap,
  Target,
  Timer,
  RotateCcw,
  ArrowLeft,
  Shield,
  CheckSquare,
  Sparkles,
  Rocket,
  Award,
  FileCheck,
} from 'lucide-react'
import type {
  DiscoveryConfiguration,
  Domain,
  TargetQuality,
  InteractionLevel,
  BudgetConstraints,
} from '@/types/intervention'
import { DOMAIN_CONFIGS, getDomainConfig, getDefaultPhaseSettings, DEFAULT_DISCOVERY_CONFIG } from '@/types/intervention'
import type { DiscoveryPhase } from '@/lib/ai/rubrics/types'
import { PHASE_METADATA } from '@/types/frontierscience'
import { ExperimentTierSelector } from './ExperimentTierSelector'
import { SimulationTierSelector } from './SimulationTierSelector'
import type { ExperimentTier } from '@/types/experiment-tiers'
import type { SimulationTierNumber } from '@/types/simulation-tiers'

// ============================================================================
// Benchmark Configuration
// ============================================================================

type BenchmarkType = 'frontierscience' | 'domain_specific' | 'practicality' | 'literature' | 'simulation_convergence'

const BENCHMARK_OPTIONS: Array<{
  id: BenchmarkType
  name: string
  shortName: string
  weight: number
}> = [
  { id: 'frontierscience', name: 'FrontierScience Rubric', shortName: 'FS', weight: 30 },
  { id: 'domain_specific', name: 'Domain-Specific', shortName: 'DS', weight: 25 },
  { id: 'practicality', name: 'Practicality', shortName: 'PR', weight: 20 },
  { id: 'literature', name: 'Literature', shortName: 'LT', weight: 15 },
  { id: 'simulation_convergence', name: 'Simulation', shortName: 'SC', weight: 10 },
]

// Color-coded presets
const PRESETS = [
  {
    name: 'Quick Explore',
    description: 'Fast iteration, relaxed thresholds',
    icon: Rocket,
    color: 'bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20',
    activeColor: 'bg-blue-500/20 border-blue-500 text-blue-300',
    targetQuality: 'exploratory' as TargetQuality,
    enabledBenchmarks: new Set<BenchmarkType>(['frontierscience', 'domain_specific']),
    passThreshold: 5.0,
    maxIterations: 1,
    gracefulDegradation: true,
  },
  {
    name: 'Standard',
    description: 'Balanced validation, 7/10 threshold',
    icon: FileCheck,
    color: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20',
    activeColor: 'bg-emerald-500/20 border-emerald-500 text-emerald-300',
    targetQuality: 'validated' as TargetQuality,
    enabledBenchmarks: new Set<BenchmarkType>(['frontierscience', 'domain_specific', 'practicality', 'literature', 'simulation_convergence']),
    passThreshold: 7.0,
    maxIterations: 3,
    gracefulDegradation: true,
  },
  {
    name: 'Publication Ready',
    description: 'Rigorous, 8+/10 threshold',
    icon: Award,
    color: 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20',
    activeColor: 'bg-amber-500/20 border-amber-500 text-amber-300',
    targetQuality: 'publication' as TargetQuality,
    enabledBenchmarks: new Set<BenchmarkType>(['frontierscience', 'domain_specific', 'practicality', 'literature', 'simulation_convergence']),
    passThreshold: 8.0,
    maxIterations: 5,
    gracefulDegradation: false,
  },
]

// ============================================================================
// Props
// ============================================================================

interface DiscoveryConfigPanelProps {
  initialConfig?: Partial<DiscoveryConfiguration>
  onConfigChange?: (config: DiscoveryConfiguration) => void
  onStart?: (config: DiscoveryConfiguration) => void
  onCancel?: () => void
  isLoading?: boolean
  className?: string
}

// ============================================================================
// Collapsible Section Component
// ============================================================================

function Section({
  title,
  children,
  defaultOpen = true,
  badge,
}: {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  badge?: React.ReactNode
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          <span className="text-sm font-medium text-foreground">{title}</span>
          {badge}
        </div>
      </button>
      {isOpen && <div className="pb-4 pl-6">{children}</div>}
    </div>
  )
}

// ============================================================================
// Compact Phase Toggle
// ============================================================================

function CompactPhaseToggle({
  phase,
  enabled,
  onToggle,
  isRequired
}: {
  phase: DiscoveryPhase
  enabled: boolean
  onToggle: (phase: DiscoveryPhase) => void
  isRequired?: boolean
}) {
  const metadata = PHASE_METADATA.find(p => p.id === phase)
  if (!metadata) return null

  return (
    <button
      onClick={() => !isRequired && onToggle(phase)}
      disabled={isRequired}
      className={cn(
        'flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-medium transition-all border',
        enabled
          ? 'bg-foreground/10 border-foreground/20 text-foreground'
          : 'bg-transparent border-border text-muted-foreground hover:border-foreground/30',
        isRequired && 'opacity-60 cursor-not-allowed'
      )}
    >
      <div className={cn(
        'w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0',
        enabled ? 'bg-foreground border-foreground' : 'border-muted-foreground/50'
      )}>
        {enabled && (
          <svg className="w-2 h-2 text-background" fill="currentColor" viewBox="0 0 12 12">
            <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
          </svg>
        )}
      </div>
      {metadata.shortName}
    </button>
  )
}

// ============================================================================
// Helper to infer domain from query
// ============================================================================

function inferDomainFromQuery(query: string): Domain | null {
  const q = query.toLowerCase()
  if (q.includes('soec') || q.includes('solid oxide') || q.includes('fuel cell')) return 'fuel-cells'
  if (q.includes('electrolyzer') || q.includes('electrolysis') || q.includes('hydrogen')) return 'electrolyzers'
  if (q.includes('perovskite') || q.includes('solar cell') || q.includes('photovoltaic')) return 'solar-photovoltaics'
  if (q.includes('solar thermal') || q.includes('concentrated solar')) return 'solar-thermal'
  if (q.includes('battery') || q.includes('lithium') || q.includes('energy storage')) return 'battery-storage'
  if (q.includes('carbon capture') || q.includes('co2 capture') || q.includes('sequestration')) return 'carbon-capture'
  if (q.includes('direct air capture') || q.includes('dac ')) return 'direct-air-capture'
  if (q.includes('wind') || q.includes('turbine')) return 'wind-energy'
  if (q.includes('catalyst') || q.includes('catalysis')) return 'catalysis'
  return null
}

// ============================================================================
// Main Component
// ============================================================================

export function DiscoveryConfigPanel({
  initialConfig,
  onConfigChange,
  onStart,
  onCancel,
  isLoading = false,
  className,
}: DiscoveryConfigPanelProps) {
  const inferredDomain = initialConfig?.query ? inferDomainFromQuery(initialConfig.query) : null

  // State
  const [domain, setDomain] = React.useState<Domain>(
    initialConfig?.domain || inferredDomain || DEFAULT_DISCOVERY_CONFIG.domain
  )
  const [customDomain, setCustomDomain] = React.useState<string>(initialConfig?.customDomain || '')
  const [targetQuality, setTargetQuality] = React.useState<TargetQuality>(
    initialConfig?.targetQuality || DEFAULT_DISCOVERY_CONFIG.targetQuality
  )
  const [interactionLevel, setInteractionLevel] = React.useState<InteractionLevel>(
    initialConfig?.interactionLevel || DEFAULT_DISCOVERY_CONFIG.interactionLevel
  )
  const [enabledPhases, setEnabledPhases] = React.useState<Set<DiscoveryPhase>>(
    initialConfig?.enabledPhases || new Set(DEFAULT_DISCOVERY_CONFIG.enabledPhases)
  )
  const [experimentTier, setExperimentTier] = React.useState<ExperimentTier | 'auto'>(
    initialConfig?.experimentTier || DEFAULT_DISCOVERY_CONFIG.experimentTier
  )
  const [simulationTier, setSimulationTier] = React.useState<SimulationTierNumber | 'auto'>(
    initialConfig?.simulationTier || DEFAULT_DISCOVERY_CONFIG.simulationTier
  )
  const [autoEscalate, setAutoEscalate] = React.useState<boolean>(
    initialConfig?.autoEscalate ?? DEFAULT_DISCOVERY_CONFIG.autoEscalate
  )
  const [budget, setBudget] = React.useState<BudgetConstraints>(
    initialConfig?.budget || DEFAULT_DISCOVERY_CONFIG.budget
  )
  const [enabledBenchmarks, setEnabledBenchmarks] = React.useState<Set<BenchmarkType>>(
    new Set(['frontierscience', 'domain_specific', 'practicality', 'literature', 'simulation_convergence'])
  )
  const [passThreshold, setPassThreshold] = React.useState<number>(7.0)
  const [gracefulDegradation, setGracefulDegradation] = React.useState<boolean>(true)
  const [activePreset, setActivePreset] = React.useState<string>('Standard')

  // In consolidated 4-phase model, 'output' is required (was rubric_eval + publication)
  const requiredPhases: DiscoveryPhase[] = ['validation', 'output']

  // Update phases when domain changes
  React.useEffect(() => {
    const defaultSettings = getDefaultPhaseSettings(domain)
    const newEnabledPhases = new Set<DiscoveryPhase>()
    defaultSettings.forEach((settings, phase) => {
      if (settings.enabled || requiredPhases.includes(phase)) {
        newEnabledPhases.add(phase)
      }
    })
    setEnabledPhases(newEnabledPhases)
    const domainConfig = getDomainConfig(domain)
    setExperimentTier(domainConfig.typicalExperimentTier)
    setSimulationTier(domainConfig.typicalSimulationTier)
  }, [domain])

  // Build configuration
  const buildConfig = React.useCallback((): DiscoveryConfiguration => ({
    query: '',
    domain,
    customDomain: domain === 'custom' ? customDomain : undefined,
    targetQuality,
    enabledPhases,
    phaseSettings: new Map(),
    experimentTier,
    simulationTier,
    autoEscalate,
    budget,
    interactionLevel,
  }), [domain, customDomain, targetQuality, enabledPhases, experimentTier, simulationTier, autoEscalate, budget, interactionLevel])

  React.useEffect(() => {
    onConfigChange?.(buildConfig())
  }, [buildConfig, onConfigChange])

  const togglePhase = (phase: DiscoveryPhase) => {
    setEnabledPhases(prev => {
      const next = new Set(prev)
      if (next.has(phase)) next.delete(phase)
      else next.add(phase)
      return next
    })
  }

  const toggleBenchmark = (benchmark: BenchmarkType) => {
    if (benchmark === 'frontierscience') return
    setEnabledBenchmarks(prev => {
      const next = new Set(prev)
      if (next.has(benchmark)) next.delete(benchmark)
      else next.add(benchmark)
      return next
    })
  }

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setActivePreset(preset.name)
    setTargetQuality(preset.targetQuality)
    setEnabledBenchmarks(new Set(preset.enabledBenchmarks))
    setPassThreshold(preset.passThreshold)
    setGracefulDegradation(preset.gracefulDegradation)
    setBudget(prev => ({ ...prev, maxIterations: preset.maxIterations }))
  }

  const resetToDefaults = () => {
    setDomain(DEFAULT_DISCOVERY_CONFIG.domain)
    setTargetQuality(DEFAULT_DISCOVERY_CONFIG.targetQuality)
    setInteractionLevel(DEFAULT_DISCOVERY_CONFIG.interactionLevel)
    setEnabledPhases(new Set(DEFAULT_DISCOVERY_CONFIG.enabledPhases))
    setExperimentTier(DEFAULT_DISCOVERY_CONFIG.experimentTier)
    setSimulationTier(DEFAULT_DISCOVERY_CONFIG.simulationTier)
    setAutoEscalate(DEFAULT_DISCOVERY_CONFIG.autoEscalate)
    setBudget(DEFAULT_DISCOVERY_CONFIG.budget)
    setEnabledBenchmarks(new Set(['frontierscience', 'domain_specific', 'practicality', 'literature', 'simulation_convergence']))
    setPassThreshold(7.0)
    setGracefulDegradation(true)
    setActivePreset('Standard')
  }

  const handleStart = () => onStart?.(buildConfig())

  // Domain options (custom is already included in DOMAIN_CONFIGS)
  const domainOptions = DOMAIN_CONFIGS.map(d => ({ value: d.id, label: d.name }))

  // Consolidated 4-phase groups
  const researchPhases: DiscoveryPhase[] = ['research', 'hypothesis']
  const validationPhases: DiscoveryPhase[] = ['validation']
  const outputPhases: DiscoveryPhase[] = ['output']

  return (
    <div className={cn('w-full h-full flex flex-col bg-background', className)}>
      {/* Header */}
      <div className="shrink-0 border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold text-foreground">Configuration</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={resetToDefaults} className="text-xs gap-1.5 h-7">
            <RotateCcw className="w-3 h-3" />
            Reset
          </Button>
        </div>
        {initialConfig?.query && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-1">{initialConfig.query}</p>
        )}
      </div>

      {/* Scrollable Content - Single Column */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">

          {/* Color-Coded Presets - Top of Page */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Quick Presets</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {PRESETS.map((preset) => {
                const Icon = preset.icon
                const isActive = activePreset === preset.name
                return (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className={cn(
                      'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                      isActive ? preset.activeColor : preset.color
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{preset.name}</span>
                    <span className="text-[10px] opacity-70 text-center">{preset.description}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Research Domain */}
          <Section title="Research Domain">
            <div className="space-y-3">
              <Select
                value={domain}
                onChange={(value) => setDomain(value as Domain)}
                options={domainOptions}
              />
              {domain === 'custom' && (
                <input
                  type="text"
                  value={customDomain}
                  onChange={(e) => setCustomDomain(e.target.value)}
                  placeholder="Enter your custom research domain..."
                  className="w-full h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground"
                />
              )}
            </div>
          </Section>

          {/* Quality Target */}
          <Section title="Quality Target">
            <div className="flex gap-2">
              {[
                { value: 'exploratory', label: 'Exploratory' },
                { value: 'validated', label: 'Validated' },
                { value: 'publication', label: 'Publication' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTargetQuality(opt.value as TargetQuality)}
                  className={cn(
                    'flex-1 px-3 py-2 rounded text-xs font-medium transition-all border',
                    targetQuality === opt.value
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-transparent border-border text-muted-foreground hover:border-foreground/40'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Discovery Phases */}
          <Section
            title="Discovery Phases"
            badge={<Badge variant="secondary" className="text-[10px] px-1.5 py-0">{enabledPhases.size}/12</Badge>}
          >
            <div className="space-y-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Research</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {researchPhases.map((phase) => (
                    <CompactPhaseToggle
                      key={phase}
                      phase={phase}
                      enabled={enabledPhases.has(phase)}
                      onToggle={togglePhase}
                    />
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Validation</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {validationPhases.map((phase) => (
                    <CompactPhaseToggle
                      key={phase}
                      phase={phase}
                      enabled={enabledPhases.has(phase)}
                      onToggle={togglePhase}
                      isRequired={requiredPhases.includes(phase)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Output</span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {outputPhases.map((phase) => (
                    <CompactPhaseToggle
                      key={phase}
                      phase={phase}
                      enabled={enabledPhases.has(phase)}
                      onToggle={togglePhase}
                      isRequired={requiredPhases.includes(phase)}
                    />
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* Validation Benchmarks */}
          <Section
            title="Validation Benchmarks"
            badge={<Badge variant="secondary" className="text-[10px] px-1.5 py-0">{enabledBenchmarks.size}/5</Badge>}
          >
            <div className="space-y-1.5">
              {BENCHMARK_OPTIONS.map((benchmark) => {
                const isRequired = benchmark.id === 'frontierscience'
                const isEnabled = enabledBenchmarks.has(benchmark.id)
                return (
                  <button
                    key={benchmark.id}
                    onClick={() => toggleBenchmark(benchmark.id)}
                    disabled={isRequired}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded text-xs transition-all border',
                      isEnabled
                        ? 'bg-foreground/5 border-foreground/20 text-foreground'
                        : 'bg-transparent border-border text-muted-foreground hover:border-foreground/20',
                      isRequired && 'opacity-60 cursor-not-allowed'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'w-3.5 h-3.5 rounded-sm border flex items-center justify-center',
                        isEnabled ? 'bg-foreground border-foreground' : 'border-muted-foreground/50'
                      )}>
                        {isEnabled && (
                          <svg className="w-2 h-2 text-background" fill="currentColor" viewBox="0 0 12 12">
                            <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                          </svg>
                        )}
                      </div>
                      <span>{benchmark.name}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{benchmark.weight}%</span>
                  </button>
                )
              })}
            </div>
          </Section>

          {/* Pass Threshold */}
          <Section title="Pass Threshold">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Minimum score to pass phases</span>
                <span className="text-sm font-semibold tabular-nums">{passThreshold.toFixed(1)}/10</span>
              </div>
              <input
                type="range"
                min={5}
                max={9}
                step={0.5}
                value={passThreshold}
                onChange={(e) => setPassThreshold(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-border rounded appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>5.0 (Lenient)</span>
                <span>7.0</span>
                <span>9.0 (Strict)</span>
              </div>
            </div>
          </Section>

          {/* Interaction Mode */}
          <Section title="Interaction Mode">
            <div className="flex gap-2">
              {[
                { value: 'autonomous', label: 'Autonomous' },
                { value: 'guided', label: 'Guided' },
                { value: 'manual', label: 'Manual' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setInteractionLevel(opt.value as InteractionLevel)}
                  className={cn(
                    'flex-1 px-3 py-2 rounded text-xs font-medium transition-all border',
                    interactionLevel === opt.value
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-transparent border-border text-muted-foreground hover:border-foreground/40'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Section>

          {/* Computational Tiers */}
          <Section title="Computational Tiers" defaultOpen={false}>
            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 mb-2">
                  <Beaker className="w-3 h-3" />
                  Experiment Tier
                </span>
                <ExperimentTierSelector value={experimentTier} onChange={setExperimentTier} compact />
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1 mb-2">
                  <Cpu className="w-3 h-3" />
                  Simulation Tier
                </span>
                <SimulationTierSelector value={simulationTier} onChange={setSimulationTier} compact />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoEscalate}
                  onChange={(e) => setAutoEscalate(e.target.checked)}
                  className="w-4 h-4 rounded border-muted-foreground/50"
                />
                <span className="text-xs text-muted-foreground">Auto-escalate if precision needs increase</span>
              </label>
            </div>
          </Section>

          {/* Budget Limits */}
          <Section title="Limits" defaultOpen={false}>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <span className="text-[10px] text-muted-foreground block mb-1.5">Duration</span>
                <select
                  value={budget.maxDuration}
                  onChange={(e) => setBudget(prev => ({ ...prev, maxDuration: parseInt(e.target.value) }))}
                  className="w-full h-8 px-2 rounded border border-border bg-background text-foreground text-xs"
                >
                  <option value={15}>15 min</option>
                  <option value={30}>30 min</option>
                  <option value={60}>1 hour</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block mb-1.5">Cost</span>
                <select
                  value={budget.maxCost}
                  onChange={(e) => setBudget(prev => ({ ...prev, maxCost: parseInt(e.target.value) }))}
                  className="w-full h-8 px-2 rounded border border-border bg-background text-foreground text-xs"
                >
                  <option value={0}>Free</option>
                  <option value={5}>$5</option>
                  <option value={20}>$20</option>
                  <option value={50}>$50</option>
                </select>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block mb-1.5">Iterations</span>
                <select
                  value={budget.maxIterations}
                  onChange={(e) => setBudget(prev => ({ ...prev, maxIterations: parseInt(e.target.value) }))}
                  className="w-full h-8 px-2 rounded border border-border bg-background text-foreground text-xs"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                </select>
              </div>
            </div>
          </Section>

          {/* Graceful Degradation */}
          <Section title="Failure Handling" defaultOpen={false}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={gracefulDegradation}
                onChange={(e) => setGracefulDegradation(e.target.checked)}
                className="w-4 h-4 rounded border-muted-foreground/50 mt-0.5"
              />
              <div>
                <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                  <Shield className="w-3 h-3" />
                  Continue on Phase Failure
                </span>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Return partial results with recommendations if phases fail
                </p>
              </div>
            </label>
          </Section>

        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border px-6 py-4 flex justify-between items-center">
        <Button variant="ghost" onClick={onCancel} disabled={isLoading} size="sm" className="gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </Button>
        <Button onClick={handleStart} disabled={isLoading} size="sm" className="gap-1.5">
          {isLoading ? 'Starting...' : 'Start Discovery'}
          <Zap className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  )
}

export default DiscoveryConfigPanel
