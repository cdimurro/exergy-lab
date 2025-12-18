'use client'

/**
 * QualityBadge Component
 *
 * Displays the discovery quality classification with appropriate styling.
 * Uses the 5-tier system: breakthrough, significant, validated, promising, preliminary
 */

import { cn } from '@/lib/utils'
import type { DiscoveryQuality } from '@/types/frontierscience'
import { getQualityConfig, QUALITY_BADGE_CONFIG } from '@/types/frontierscience'
import { Star, Sparkles, Check, Circle } from 'lucide-react'

interface QualityBadgeProps {
  quality: DiscoveryQuality
  score?: number
  showDescription?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const QUALITY_ICONS = {
  star: Star,
  sparkles: Sparkles,
  check: Check,
  'circle-half': Circle,
  circle: Circle,
}

export function QualityBadge({
  quality,
  score,
  showDescription = false,
  size = 'md',
  className,
}: QualityBadgeProps) {
  const config = getQualityConfig(quality)
  const Icon = QUALITY_ICONS[config.icon]

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
    lg: 'px-4 py-2 text-base gap-2',
  }

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 18,
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <div
        className={cn(
          'inline-flex items-center rounded-full font-medium',
          'border transition-all duration-200',
          config.bgClass,
          config.textClass,
          config.borderClass,
          sizeClasses[size],
          quality === 'breakthrough' && 'shadow-lg shadow-amber-500/25'
        )}
      >
        <Icon
          size={iconSizes[size]}
          className={cn(
            quality === 'breakthrough' && 'animate-pulse',
            config.icon === 'circle-half' && 'fill-current opacity-50'
          )}
        />
        <span>{config.label}</span>
        {score !== undefined && (
          <span className="opacity-80 ml-1">({score.toFixed(1)})</span>
        )}
      </div>
      {showDescription && (
        <p className={cn(
          'text-muted-foreground mt-1',
          size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'
        )}>
          {config.description}
        </p>
      )}
    </div>
  )
}

/**
 * Quality score indicator with gradient fill
 */
interface QualityScoreDisplayProps {
  score: number
  maxScore?: number
  quality: DiscoveryQuality
  showLabel?: boolean
  className?: string
}

export function QualityScoreDisplay({
  score,
  maxScore = 10,
  quality,
  showLabel = true,
  className,
}: QualityScoreDisplayProps) {
  const config = getQualityConfig(quality)
  const percentage = (score / maxScore) * 100

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            Overall Score
          </span>
          <QualityBadge quality={quality} size="sm" />
        </div>
      )}
      <div className="flex items-center gap-3">
        <div className="text-3xl font-bold text-foreground">
          {score.toFixed(1)}
          <span className="text-lg text-muted-foreground font-normal">/{maxScore}</span>
        </div>
        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              quality === 'breakthrough' && 'bg-gradient-to-r from-amber-500 to-yellow-400',
              quality === 'significant' && 'bg-emerald-500',
              quality === 'validated' && 'bg-blue-500',
              quality === 'promising' && 'bg-cyan-500',
              quality === 'preliminary' && 'bg-gray-400'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Compact quality indicator for phase results
 */
interface CompactQualityIndicatorProps {
  score: number
  passed: boolean
  className?: string
}

export function CompactQualityIndicator({
  score,
  passed,
  className,
}: CompactQualityIndicatorProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-2 py-0.5 rounded-md text-sm font-medium',
        passed
          ? 'bg-emerald-500/10 text-emerald-600'
          : 'bg-amber-500/10 text-amber-600',
        className
      )}
    >
      {passed ? (
        <Check size={14} className="text-emerald-500" />
      ) : (
        <Circle size={14} className="text-amber-500" />
      )}
      <span>{score.toFixed(1)}/10</span>
    </div>
  )
}

export default QualityBadge
