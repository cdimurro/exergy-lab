'use client'

/**
 * DiscoveryConfigPanel Component
 *
 * Pre-discovery configuration panel for setting domain, quality targets,
 * phase selection, tier preferences, and interaction mode.
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
  ChevronUp,
  Zap,
  Target,
  Timer,
  DollarSign,
  RotateCcw,
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
// Phase Selection
// ============================================================================

interface PhaseToggleProps {
  phase: DiscoveryPhase
  enabled: boolean
  onToggle: (phase: DiscoveryPhase) => void
  isRequired?: boolean
}

function PhaseToggle({ phase, enabled, onToggle, isRequired }: PhaseToggleProps) {
  const metadata = PHASE_METADATA.find(p => p.id === phase)
  if (!metadata) return null

  return (
    <button
      onClick={() => !isRequired && onToggle(phase)}
      disabled={isRequired}
      className={cn(
        'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
        'border hover:border-primary/50 hover:shadow-sm',
        enabled
          ? 'bg-primary/10 border-primary/40 text-foreground shadow-sm'
          : 'bg-muted/20 border-border text-muted-foreground hover:bg-muted/30',
        isRequired && 'opacity-70 cursor-not-allowed'
      )}
    >
      <div
        className={cn(
          'w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0',
          enabled ? 'bg-primary border-primary' : 'border-muted-foreground/40'
        )}
      >
        {enabled && (
          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 12 12">
            <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
          </svg>
        )}
      </div>
      <span className="whitespace-nowrap">{metadata.shortName}</span>
      {isRequired && (
        <Badge variant="secondary" className="text-xs px-2 py-0.5 ml-auto">
          Required
        </Badge>
      )}
    </button>
  )
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
  // State
  const [domain, setDomain] = React.useState<Domain>(
    initialConfig?.domain || DEFAULT_DISCOVERY_CONFIG.domain
  )
  const [customDomain, setCustomDomain] = React.useState<string>(
    initialConfig?.customDomain || ''
  )
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
  const [showAdvanced, setShowAdvanced] = React.useState(false)

  // Required phases that cannot be disabled
  const requiredPhases: DiscoveryPhase[] = ['validation', 'rubric_eval']

  // Update phase selection when domain changes
  React.useEffect(() => {
    const domainConfig = getDomainConfig(domain)
    const defaultSettings = getDefaultPhaseSettings(domain)
    const newEnabledPhases = new Set<DiscoveryPhase>()
    defaultSettings.forEach((settings, phase) => {
      if (settings.enabled || requiredPhases.includes(phase)) {
        newEnabledPhases.add(phase)
      }
    })
    setEnabledPhases(newEnabledPhases)
    setExperimentTier(domainConfig.typicalExperimentTier)
    setSimulationTier(domainConfig.typicalSimulationTier)
  }, [domain])

  // Build configuration object
  const buildConfig = React.useCallback((): DiscoveryConfiguration => {
    return {
      query: '', // Will be set by parent
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
    }
  }, [domain, customDomain, targetQuality, enabledPhases, experimentTier, simulationTier, autoEscalate, budget, interactionLevel])

  // Notify parent of config changes
  React.useEffect(() => {
    onConfigChange?.(buildConfig())
  }, [buildConfig, onConfigChange])

  // Toggle phase
  const togglePhase = (phase: DiscoveryPhase) => {
    setEnabledPhases(prev => {
      const next = new Set(prev)
      if (next.has(phase)) {
        next.delete(phase)
      } else {
        next.add(phase)
      }
      return next
    })
  }

  // Reset to defaults
  const resetToDefaults = () => {
    setDomain(DEFAULT_DISCOVERY_CONFIG.domain)
    setTargetQuality(DEFAULT_DISCOVERY_CONFIG.targetQuality)
    setInteractionLevel(DEFAULT_DISCOVERY_CONFIG.interactionLevel)
    setEnabledPhases(new Set(DEFAULT_DISCOVERY_CONFIG.enabledPhases))
    setExperimentTier(DEFAULT_DISCOVERY_CONFIG.experimentTier)
    setSimulationTier(DEFAULT_DISCOVERY_CONFIG.simulationTier)
    setAutoEscalate(DEFAULT_DISCOVERY_CONFIG.autoEscalate)
    setBudget(DEFAULT_DISCOVERY_CONFIG.budget)
  }

  // Handle start
  const handleStart = () => {
    onStart?.(buildConfig())
  }

  // Domain options
  const domainOptions = DOMAIN_CONFIGS.map(d => ({
    value: d.id,
    label: d.name,
  }))

  // Quality options
  const qualityOptions = [
    { value: 'exploratory', label: 'Exploratory (fast, broad)' },
    { value: 'validated', label: 'Validated (balanced, 7/10 threshold)' },
    { value: 'publication', label: 'Publication-Ready (thorough, 8+/10)' },
  ]

  // Interaction level options
  const interactionOptions = [
    { value: 'autonomous', label: 'Autonomous (run without stopping)' },
    { value: 'guided', label: 'Guided (pause at key decisions)' },
    { value: 'manual', label: 'Manual (approve each phase)' },
  ]

  // Group phases by category
  const researchPhases: DiscoveryPhase[] = ['research', 'synthesis', 'hypothesis', 'screening']
  const validationPhases: DiscoveryPhase[] = ['experiment', 'simulation', 'exergy', 'tea', 'patent', 'validation']
  const outputPhases: DiscoveryPhase[] = ['rubric_eval', 'publication']

  return (
    <div className={cn('w-full h-full flex flex-col bg-background', className)}>
      {/* Header */}
      <div className="shrink-0 border-b border-border px-8 py-6 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3 mb-1">
          <Settings2 className="w-6 h-6 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Discovery Configuration</h1>
        </div>
        <p className="text-lg text-muted-foreground ml-9">
          Configure your FrontierScience discovery parameters before starting
        </p>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-8 space-y-8">
        {/* Domain Selection */}
        <div className="space-y-2">
          <Select
            label="Research Domain"
            value={domain}
            onChange={(value) => setDomain(value as Domain)}
            options={domainOptions}
          />
          {domain === 'custom' && (
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="Enter custom domain..."
              className="w-full h-10 px-3 rounded-lg border border-input-border bg-input-background text-foreground text-sm"
            />
          )}
        </div>

        {/* Quality Target */}
        <div className="space-y-4">
          <label className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Target className="w-5 h-5 text-primary" />
            Quality Target
          </label>
          <div className="grid grid-cols-1 gap-3">
            {qualityOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTargetQuality(option.value as TargetQuality)}
                className={cn(
                  'flex items-center gap-3 px-5 py-4 rounded-lg text-left text-base font-medium transition-all',
                  'border-2 hover:shadow-md',
                  targetQuality === option.value
                    ? 'bg-primary/15 border-primary/60 text-foreground shadow-sm'
                    : 'bg-muted/15 border-border text-foreground hover:border-primary/40 hover:bg-muted/25'
                )}
              >
                <div
                  className={cn(
                    'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                    targetQuality === option.value
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground/40'
                  )}
                >
                  {targetQuality === option.value && (
                    <div className="w-2.5 h-2.5 rounded-full bg-white" />
                  )}
                </div>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Phase Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-base font-semibold text-foreground">
              Discovery Phases
            </label>
            <button
              onClick={() => setEnabledPhases(new Set(PHASE_METADATA.map(p => p.id)))}
              className="text-sm text-primary hover:text-primary/80 hover:underline font-medium"
            >
              Select All
            </button>
          </div>

          {/* Research & Analysis */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              🔬 Research & Analysis
            </span>
            <div className="flex flex-wrap gap-2.5">
              {researchPhases.map((phase) => (
                <PhaseToggle
                  key={phase}
                  phase={phase}
                  enabled={enabledPhases.has(phase)}
                  onToggle={togglePhase}
                />
              ))}
            </div>
          </div>

          {/* Validation & Testing */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              ✓ Validation & Testing
            </span>
            <div className="flex flex-wrap gap-2.5">
              {validationPhases.map((phase) => (
                <PhaseToggle
                  key={phase}
                  phase={phase}
                  enabled={enabledPhases.has(phase)}
                  onToggle={togglePhase}
                  isRequired={requiredPhases.includes(phase)}
                />
              ))}
            </div>
          </div>

          {/* Output */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              📊 Output & Publication
            </span>
            <div className="flex flex-wrap gap-2.5">
              {outputPhases.map((phase) => (
                <PhaseToggle
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

        {/* Tier Selection */}
        <div className="space-y-4 bg-muted/20 rounded-lg p-6 border border-border">
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Computational Tiers
          </h3>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
                <Beaker className="w-4 h-4 text-blue-500" />
                Experiment Tier
              </label>
              <ExperimentTierSelector
                value={experimentTier}
                onChange={setExperimentTier}
                compact
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
                <Cpu className="w-4 h-4 text-purple-500" />
                Simulation Tier
              </label>
              <SimulationTierSelector
                value={simulationTier}
                onChange={setSimulationTier}
                compact
              />
            </div>
          </div>

          {/* Auto-escalate toggle */}
          <label className="flex items-center gap-3 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={autoEscalate}
              onChange={(e) => setAutoEscalate(e.target.checked)}
              className="w-5 h-5 rounded border-muted-foreground/50 text-primary focus:ring-primary accent-primary"
            />
            <span className="text-sm font-medium text-foreground">
              Auto-escalate to higher tier if precision needs increase
            </span>
          </label>
        </div>

        {/* Interaction Level */}
        <div className="space-y-3 bg-blue-500/5 rounded-lg p-6 border border-blue-200/30">
          <h3 className="text-base font-semibold text-foreground">
            Interaction Mode
          </h3>
          <div className="space-y-3">
            {interactionOptions.map((option) => (
              <label key={option.value} className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="interaction"
                  value={option.value}
                  checked={interactionLevel === option.value}
                  onChange={(e) => setInteractionLevel(e.target.value as InteractionLevel)}
                  className="w-5 h-5 mt-0.5 accent-primary"
                />
                <div>
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {option.label}
                  </span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {interactionLevel === option.value && (
                      <>
                        {option.value === 'autonomous'
                          ? 'Discovery runs without stopping for approval'
                          : option.value === 'guided'
                          ? 'You can review and modify at key decision points'
                          : 'Approve each phase before continuing'}
                      </>
                    )}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Advanced Settings (Collapsed) */}
        <div className="border-t-2 border-border pt-6">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-base font-semibold text-foreground hover:text-primary transition-colors"
          >
            {showAdvanced ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            Advanced Settings
          </button>

          {showAdvanced && (
            <div className="mt-6 space-y-6 pl-0">
              {/* Budget Constraints */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Timer className="w-4 h-4 text-orange-500" />
                  Budget Constraints
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Max Duration
                    </label>
                    <select
                      value={budget.maxDuration}
                      onChange={(e) => setBudget(prev => ({ ...prev, maxDuration: parseInt(e.target.value) }))}
                      className="w-full h-10 px-3 rounded-lg border border-input-border bg-input-background text-foreground text-sm font-medium"
                    >
                      <option value={15}>15 min</option>
                      <option value={30}>30 min</option>
                      <option value={60}>1 hour</option>
                      <option value={120}>2 hours</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Max Cost
                    </label>
                    <select
                      value={budget.maxCost}
                      onChange={(e) => setBudget(prev => ({ ...prev, maxCost: parseInt(e.target.value) }))}
                      className="w-full h-10 px-3 rounded-lg border border-input-border bg-input-background text-foreground text-sm font-medium"
                    >
                      <option value={0}>Free only</option>
                      <option value={5}>$5 max</option>
                      <option value={20}>$20 max</option>
                      <option value={50}>$50 max</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Max Iterations
                    </label>
                    <select
                      value={budget.maxIterations}
                      onChange={(e) => setBudget(prev => ({ ...prev, maxIterations: parseInt(e.target.value) }))}
                      className="w-full h-10 px-3 rounded-lg border border-input-border bg-input-background text-foreground text-sm font-medium"
                    >
                      <option value={1}>1 iteration</option>
                      <option value={2}>2 iterations</option>
                      <option value={3}>3 iterations</option>
                      <option value={5}>5 iterations</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Reset Button */}
              <button
                onClick={resetToDefaults}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 px-3 py-2 rounded-lg transition-all"
              >
                <RotateCcw size={16} />
                Reset to Defaults
              </button>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border px-8 py-4 bg-muted/30 flex justify-between items-center">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          size="lg"
          className="px-8"
        >
          Cancel
        </Button>
        <Button
          onClick={handleStart}
          disabled={isLoading}
          size="lg"
          className="px-8"
        >
          {isLoading ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Starting...
            </>
          ) : (
            <>
              Start Discovery
              <Zap className="ml-2 w-5 h-5" />
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

export default DiscoveryConfigPanel
