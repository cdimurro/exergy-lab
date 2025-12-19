'use client'

/**
 * DiscoveryModeSelector Component
 *
 * Allows users to select between discovery modes:
 * - Synthesis: Comprehensive research analysis (relaxed novelty)
 * - Validation: Validate existing hypotheses (moderate novelty)
 * - Breakthrough: Novel discoveries for publication/patents (strict novelty)
 * - Parallel: Run all modes simultaneously (Professional tier)
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Sparkles, BookOpen, CheckCircle, Layers, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  type DiscoveryMode,
  type DiscoveryModeConfig,
  getAllModes,
  suggestMode,
} from '@/lib/ai/rubrics/mode-configs'

interface DiscoveryModeSelectorProps {
  /** Currently selected mode */
  selectedMode: DiscoveryMode | 'parallel' | null
  /** Callback when mode is selected */
  onModeSelect: (mode: DiscoveryMode | 'parallel') => void
  /** Optional query to suggest a mode */
  query?: string
  /** Whether to show the parallel option */
  showParallelOption?: boolean
  /** Compact mode for smaller spaces */
  compact?: boolean
  /** Additional CSS classes */
  className?: string
}

const iconMap = {
  Sparkles,
  BookOpen,
  CheckCircle,
} as const

const colorThemeMap: Record<string, {
  bg: string
  bgHover: string
  bgSelected: string
  text: string
  icon: string
  badge: string
}> = {
  purple: {
    bg: 'bg-purple-500/10',
    bgHover: 'hover:bg-purple-500/20',
    bgSelected: 'bg-purple-500/20 ring-2 ring-purple-500',
    text: 'text-purple-600',
    icon: 'text-purple-500',
    badge: 'bg-purple-500/20 text-purple-700',
  },
  blue: {
    bg: 'bg-blue-500/10',
    bgHover: 'hover:bg-blue-500/20',
    bgSelected: 'bg-blue-500/20 ring-2 ring-blue-500',
    text: 'text-blue-600',
    icon: 'text-blue-500',
    badge: 'bg-blue-500/20 text-blue-700',
  },
  green: {
    bg: 'bg-emerald-500/10',
    bgHover: 'hover:bg-emerald-500/20',
    bgSelected: 'bg-emerald-500/20 ring-2 ring-emerald-500',
    text: 'text-emerald-600',
    icon: 'text-emerald-500',
    badge: 'bg-emerald-500/20 text-emerald-700',
  },
  amber: {
    bg: 'bg-amber-500/10',
    bgHover: 'hover:bg-amber-500/20',
    bgSelected: 'bg-amber-500/20 ring-2 ring-amber-500',
    text: 'text-amber-600',
    icon: 'text-amber-500',
    badge: 'bg-amber-500/20 text-amber-700',
  },
}

// Parallel mode colors
const parallelColors = {
  bg: 'bg-gradient-to-br from-purple-500/10 via-blue-500/10 to-emerald-500/10',
  bgHover: 'hover:from-purple-500/20 hover:via-blue-500/20 hover:to-emerald-500/20',
  bgSelected: 'bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-emerald-500/20 ring-2 ring-purple-500',
  text: 'text-purple-600',
  icon: 'text-purple-500',
  badge: 'bg-purple-500/20 text-purple-700',
}

export function DiscoveryModeSelector({
  selectedMode,
  onModeSelect,
  query,
  showParallelOption = true,
  compact = false,
  className,
}: DiscoveryModeSelectorProps) {
  const modes = getAllModes()
  const suggestedMode = query ? suggestMode(query) : null

  if (compact) {
    return (
      <CompactModeSelector
        modes={modes}
        selectedMode={selectedMode}
        onModeSelect={onModeSelect}
        suggestedMode={suggestedMode}
        showParallelOption={showParallelOption}
        className={className}
      />
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Mode Cards */}
      <div className="grid gap-3">
        {modes.map((mode) => {
          const Icon = iconMap[mode.icon]
          const colors = colorThemeMap[mode.colorTheme] || colorThemeMap.blue
          const isSelected = selectedMode === mode.id
          const isSuggested = suggestedMode === mode.id

          return (
            <div
              key={mode.id}
              role="button"
              tabIndex={0}
              onClick={() => onModeSelect(mode.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onModeSelect(mode.id)
                }
              }}
              className={cn(
                'relative p-4 rounded-xl border transition-all duration-200 text-left cursor-pointer',
                'focus:outline-none focus:ring-2 focus:ring-offset-2',
                isSelected
                  ? cn(colors.bgSelected, 'border-transparent')
                  : 'bg-card border-border'
              )}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                  colors.bg
                )}>
                  <Icon className={cn('w-6 h-6', colors.icon)} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={cn('font-semibold text-base', colors.text)}>
                      {mode.name}
                    </h4>
                    {isSuggested && (
                      <span className={cn(
                        'text-xs font-medium px-2 py-0.5 rounded-full',
                        colors.badge
                      )}>
                        Suggested
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {mode.description}
                  </p>

                  {/* Always show details */}
                  <div className="mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span>Level of Novelty: {Math.round((mode.rubricWeights.noveltyWeight / 2.5) * 100)}%</span>
                      <span>Scoring Threshold: {mode.rubricWeights.overallPassThreshold}/10</span>
                      <span>Number of Iterations: {mode.iterationConfig.hypothesisMaxIterations}</span>
                    </div>
                  </div>
                </div>

                {/* Selection indicator */}
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1',
                  isSelected
                    ? cn('border-transparent', colors.bg)
                    : 'border-border'
                )}>
                  {isSelected && (
                    <CheckCircle className={cn('w-4 h-4', colors.icon)} />
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {/* Parallel Analysis Option - same card style as others */}
        {showParallelOption && (
          <div
            role="button"
            tabIndex={0}
            onClick={() => onModeSelect('parallel')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onModeSelect('parallel')
              }
            }}
            className={cn(
              'relative p-4 rounded-xl border transition-all duration-200 text-left cursor-pointer',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              selectedMode === 'parallel'
                ? cn(parallelColors.bgSelected, 'border-transparent')
                : 'bg-card border-border'
            )}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-emerald-500/20 flex items-center justify-center shrink-0">
                <Layers className="w-6 h-6 text-purple-500" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-base text-purple-600">
                    Parallel Analysis
                  </h4>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-foreground/10 text-foreground flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Professional
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Run all 3 modes simultaneously and compare results
                </p>

                {/* Always show details */}
                <div className="mt-2 text-xs text-muted-foreground">
                  Runs Synthesis, Validation, and Breakthrough in parallel for comprehensive analysis
                </div>
              </div>

              {/* Selection indicator */}
              <div className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-1',
                selectedMode === 'parallel'
                  ? 'border-transparent bg-purple-500/20'
                  : 'border-border'
              )}>
                {selectedMode === 'parallel' && (
                  <CheckCircle className="w-4 h-4 text-purple-500" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Compact mode selector for smaller spaces (e.g., inline in header)
 */
function CompactModeSelector({
  modes,
  selectedMode,
  onModeSelect,
  suggestedMode,
  showParallelOption,
  className,
}: {
  modes: DiscoveryModeConfig[]
  selectedMode: DiscoveryMode | 'parallel' | null
  onModeSelect: (mode: DiscoveryMode | 'parallel') => void
  suggestedMode: DiscoveryMode | null
  showParallelOption: boolean
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {modes.map((mode) => {
        const Icon = iconMap[mode.icon]
        const colors = colorThemeMap[mode.colorTheme] || colorThemeMap.blue
        const isSelected = selectedMode === mode.id
        const isSuggested = suggestedMode === mode.id

        return (
          <Button
            key={mode.id}
            variant={isSelected ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onModeSelect(mode.id)}
            className={cn(
              'gap-1.5',
              isSelected && colors.bg,
              isSuggested && !isSelected && 'ring-1 ring-offset-1'
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{mode.name}</span>
          </Button>
        )
      })}
      {showParallelOption && (
        <Button
          variant={selectedMode === 'parallel' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => onModeSelect('parallel')}
          className="gap-1.5"
        >
          <Layers className="w-4 h-4" />
          <span>All</span>
        </Button>
      )}
    </div>
  )
}

/**
 * Mode badge component for displaying selected mode
 */
export function ModeBadge({
  mode,
  size = 'sm',
  className,
}: {
  mode: DiscoveryMode | 'parallel'
  size?: 'sm' | 'md'
  className?: string
}) {
  if (mode === 'parallel') {
    return (
      <span className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full',
        'bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-emerald-500/10',
        'text-primary',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className
      )}>
        <Layers className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
        Parallel
      </span>
    )
  }

  const config = getAllModes().find(m => m.id === mode)
  if (!config) return null

  const Icon = iconMap[config.icon]
  const colors = colorThemeMap[config.colorTheme] || colorThemeMap.blue

  return (
    <span className={cn(
      'inline-flex items-center gap-1 font-medium rounded-full',
      colors.badge,
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
      className
    )}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {config.name}
    </span>
  )
}

export default DiscoveryModeSelector
