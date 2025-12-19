'use client'

/**
 * DiscoveryOptionsModal Component
 *
 * Streamlined configuration modal that complements the Discovery Mode selector.
 * Focuses on domain selection and advanced analysis options without duplicating
 * the mode-specific settings (thresholds, iterations, novelty weights).
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import {
  X,
  Settings2,
  Beaker,
  FlaskConical,
  FileSearch,
  Calculator,
  Award,
  ChevronDown,
  ChevronUp,
  Zap,
  Globe,
  Info,
} from 'lucide-react'
import { DOMAIN_CONFIGS, type Domain } from '@/types/intervention'
import { ModeBadge } from './DiscoveryModeSelector'
import type { DiscoveryMode } from '@/lib/ai/rubrics/mode-configs'

// ============================================================================
// Types
// ============================================================================

export interface DiscoveryAdvancedOptions {
  domain: Domain
  customDomain?: string
  enablePatentAnalysis: boolean
  enableExergyAnalysis: boolean
  enableTEAAnalysis: boolean
  maxIterationsOverride?: number
}

interface DiscoveryOptionsModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback to close the modal */
  onClose: () => void
  /** Current selected mode (for display) */
  selectedMode: DiscoveryMode | 'parallel' | null
  /** Current query (for domain inference) */
  query?: string
  /** Current options */
  options: DiscoveryAdvancedOptions
  /** Callback when options change */
  onOptionsChange: (options: DiscoveryAdvancedOptions) => void
  /** Callback to start discovery with current options */
  onStart?: () => void
  /** Whether discovery is starting */
  isStarting?: boolean
}

// ============================================================================
// Domain Inference Helper
// ============================================================================

function inferDomainFromQuery(query: string): Domain | null {
  const q = query.toLowerCase()
  if (q.includes('soec') || q.includes('solid oxide') || q.includes('fuel cell')) return 'fuel-cells'
  if (q.includes('electrolyzer') || q.includes('electrolysis') || q.includes('hydrogen')) return 'electrolyzers'
  if (q.includes('perovskite') || q.includes('solar cell') || q.includes('photovoltaic') || q.includes('pv ')) return 'solar-photovoltaics'
  if (q.includes('solar thermal') || q.includes('concentrated solar') || q.includes('csp')) return 'solar-thermal'
  if (q.includes('battery') || q.includes('lithium') || q.includes('energy storage')) return 'battery-storage'
  if (q.includes('carbon capture') || q.includes('co2 capture') || q.includes('sequestration')) return 'carbon-capture'
  if (q.includes('direct air capture') || q.includes('dac ')) return 'direct-air-capture'
  if (q.includes('wind') || q.includes('turbine')) return 'wind-energy'
  if (q.includes('catalyst') || q.includes('catalysis')) return 'catalysis'
  if (q.includes('geothermal')) return 'geothermal'
  if (q.includes('nuclear') || q.includes('fusion') || q.includes('fission') || q.includes('tokamak') || q.includes('plasma')) return 'nuclear-advanced'
  if (q.includes('biofuel') || q.includes('biomass') || q.includes('ethanol')) return 'biofuels'
  if (q.includes('thermoelectric')) return 'thermoelectrics'
  if (q.includes('supercapacitor') || q.includes('ultracapacitor')) return 'supercapacitors'
  return null
}

// ============================================================================
// Main Component
// ============================================================================

export function DiscoveryOptionsModal({
  isOpen,
  onClose,
  selectedMode,
  query,
  options,
  onOptionsChange,
  onStart,
  isStarting = false,
}: DiscoveryOptionsModalProps) {
  const [showAdvanced, setShowAdvanced] = React.useState(false)
  const inferredDomain = query ? inferDomainFromQuery(query) : null

  // Auto-set domain if inferred and current domain is still default
  React.useEffect(() => {
    if (inferredDomain && options.domain === 'solar-photovoltaics') {
      onOptionsChange({ ...options, domain: inferredDomain })
    }
  }, [inferredDomain])

  if (!isOpen) return null

  const domainOptions = DOMAIN_CONFIGS.map(d => ({ value: d.id, label: d.name }))

  const updateOption = <K extends keyof DiscoveryAdvancedOptions>(
    key: K,
    value: DiscoveryAdvancedOptions[K]
  ) => {
    onOptionsChange({ ...options, [key]: value })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card rounded-2xl border border-border shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Discovery Options</h2>
              <p className="text-xs text-muted-foreground">Configure your research analysis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Mode Display */}
          {selectedMode && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border">
              <span className="text-sm text-muted-foreground">Discovery Mode</span>
              <ModeBadge mode={selectedMode} size="md" />
            </div>
          )}

          {/* Research Domain */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Globe className="w-4 h-4 text-muted-foreground" />
              Research Domain
            </label>
            <Select
              value={options.domain}
              onChange={(value) => updateOption('domain', value as Domain)}
              options={domainOptions}
            />
            {inferredDomain && inferredDomain !== options.domain && (
              <button
                onClick={() => updateOption('domain', inferredDomain)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Info className="w-3 h-3" />
                Detected: {DOMAIN_CONFIGS.find(d => d.id === inferredDomain)?.name}. Click to use.
              </button>
            )}
            {options.domain === 'custom' && (
              <input
                type="text"
                value={options.customDomain || ''}
                onChange={(e) => updateOption('customDomain', e.target.value)}
                placeholder="Enter your custom research domain..."
                className="w-full h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground"
              />
            )}
          </div>

          {/* Analysis Options */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Validation Analyses</label>
            <div className="space-y-2">
              <ToggleOption
                icon={FileSearch}
                label="Patent Landscape Analysis"
                description="Search USPTO, EPO for prior art and freedom-to-operate"
                checked={options.enablePatentAnalysis}
                onChange={(v) => updateOption('enablePatentAnalysis', v)}
              />
              <ToggleOption
                icon={Zap}
                label="Exergy Analysis"
                description="Thermodynamic efficiency and destruction analysis"
                checked={options.enableExergyAnalysis}
                onChange={(v) => updateOption('enableExergyAnalysis', v)}
              />
              <ToggleOption
                icon={Calculator}
                label="Techno-Economic Analysis"
                description="NPV, IRR, LCOE, and payback calculations"
                checked={options.enableTEAAnalysis}
                onChange={(v) => updateOption('enableTEAAnalysis', v)}
              />
            </div>
          </div>

          {/* Advanced Options (Collapsed) */}
          <div className="border-t border-border pt-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span>Advanced Options</span>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4">
                {/* Max Iterations Override */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground">
                    Max Iterations Override (leave empty for mode default)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={options.maxIterationsOverride ?? ''}
                      onChange={(e) => updateOption(
                        'maxIterationsOverride',
                        e.target.value ? parseInt(e.target.value) : undefined
                      )}
                      placeholder="Auto"
                      className="w-24 h-9 px-3 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground"
                    />
                    <span className="text-xs text-muted-foreground">
                      iterations per phase
                    </span>
                  </div>
                </div>

                {/* Mode Info */}
                {selectedMode && selectedMode !== 'parallel' && (
                  <div className="p-3 rounded-lg bg-muted/30 border border-border">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Mode defaults:</strong>
                      {' '}
                      {selectedMode === 'breakthrough' && 'Novelty 25%, Threshold 7.0, Max 5 iterations'}
                      {selectedMode === 'synthesis' && 'Novelty 5%, Threshold 6.0, Max 3 iterations'}
                      {selectedMode === 'validation' && 'Novelty 10%, Threshold 6.5, Max 3 iterations'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-border bg-muted/20">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isStarting}
          >
            Cancel
          </Button>
          {onStart && (
            <Button
              onClick={onStart}
              disabled={isStarting}
              className="gap-2"
            >
              {isStarting ? 'Starting...' : 'Start Discovery'}
              <Zap className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Toggle Option Component
// ============================================================================

interface ToggleOptionProps {
  icon: React.ElementType
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function ToggleOption({ icon: Icon, label, description, checked, onChange }: ToggleOptionProps) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left',
        checked
          ? 'bg-primary/5 border-primary/30'
          : 'bg-transparent border-border hover:border-primary/20'
      )}
    >
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
        checked ? 'bg-primary/10' : 'bg-muted'
      )}>
        <Icon className={cn(
          'w-4 h-4',
          checked ? 'text-primary' : 'text-muted-foreground'
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={cn(
            'text-sm font-medium',
            checked ? 'text-foreground' : 'text-muted-foreground'
          )}>
            {label}
          </span>
          <div className={cn(
            'w-9 h-5 rounded-full transition-colors relative',
            checked ? 'bg-primary' : 'bg-muted'
          )}>
            <div className={cn(
              'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
              checked ? 'translate-x-4' : 'translate-x-0.5'
            )} />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {description}
        </p>
      </div>
    </button>
  )
}

// ============================================================================
// Trigger Button Component
// ============================================================================

interface OptionsButtonProps {
  onClick: () => void
  hasCustomizations?: boolean
  className?: string
}

export function DiscoveryOptionsButton({ onClick, hasCustomizations, className }: OptionsButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
        hasCustomizations
          ? 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/10'
          : 'border-border text-muted-foreground hover:border-primary/30 hover:text-foreground',
        className
      )}
    >
      <Settings2 className="w-4 h-4" />
      <span className="text-sm">Configuration Options</span>
      {hasCustomizations && (
        <span className="w-2 h-2 rounded-full bg-primary" />
      )}
    </button>
  )
}

export default DiscoveryOptionsModal
