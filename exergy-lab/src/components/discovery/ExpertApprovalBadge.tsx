'use client'

/**
 * Expert Approval Badge (v0.0.4.1)
 *
 * Visual indicator showing expert review status for a hypothesis.
 * Can show approved, rejected, needs refinement, or pending states.
 *
 * @see ExpertReviewPanel.tsx - Main review panel
 * @see use-expert-review.ts - Hook for expert review state
 */

import { cn } from '@/lib/utils'
import {
  CheckCircle,
  XCircle,
  Edit3,
  Clock,
  User,
  Shield,
} from 'lucide-react'
import type { ExpertDecision } from './ExpertReviewPanel'

// ============================================================================
// Types
// ============================================================================

export interface ExpertApprovalBadgeProps {
  decision?: ExpertDecision
  expertId?: string
  timestamp?: number
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// ============================================================================
// Configurations
// ============================================================================

const DECISION_CONFIG = {
  approve: {
    label: 'Expert Approved',
    shortLabel: 'Approved',
    icon: CheckCircle,
    color: '#10B981',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-500',
  },
  reject: {
    label: 'Expert Rejected',
    shortLabel: 'Rejected',
    icon: XCircle,
    color: '#EF4444',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-500',
  },
  refine: {
    label: 'Needs Refinement',
    shortLabel: 'Refine',
    icon: Edit3,
    color: '#F59E0B',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-500',
  },
  pending: {
    label: 'Pending Review',
    shortLabel: 'Pending',
    icon: Clock,
    color: '#6B7280',
    bgColor: 'bg-gray-500/10',
    borderColor: 'border-gray-500/30',
    textColor: 'text-gray-500',
  },
}

const SIZE_CONFIG = {
  sm: {
    iconSize: 12,
    padding: 'px-1.5 py-0.5',
    text: 'text-xs',
    gap: 'gap-1',
  },
  md: {
    iconSize: 14,
    padding: 'px-2 py-1',
    text: 'text-sm',
    gap: 'gap-1.5',
  },
  lg: {
    iconSize: 16,
    padding: 'px-3 py-1.5',
    text: 'text-sm',
    gap: 'gap-2',
  },
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString()
}

// ============================================================================
// Component
// ============================================================================

export function ExpertApprovalBadge({
  decision,
  expertId,
  timestamp,
  showLabel = true,
  size = 'md',
  className,
}: ExpertApprovalBadgeProps) {
  const config = decision ? DECISION_CONFIG[decision] : DECISION_CONFIG.pending
  const sizeConfig = SIZE_CONFIG[size]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border',
        config.bgColor,
        config.borderColor,
        sizeConfig.padding,
        sizeConfig.gap,
        className
      )}
      title={
        timestamp
          ? `${config.label} by ${expertId || 'expert'} ${formatTimestamp(timestamp)}`
          : config.label
      }
    >
      <Icon size={sizeConfig.iconSize} className={config.textColor} />
      {showLabel && (
        <span className={cn(sizeConfig.text, 'font-medium', config.textColor)}>
          {size === 'sm' ? config.shortLabel : config.label}
        </span>
      )}
    </div>
  )
}

// ============================================================================
// Verified Badge (for expert-approved + validated hypotheses)
// ============================================================================

export interface VerifiedBadgeProps {
  expertApproved: boolean
  gpuValidated?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function VerifiedBadge({
  expertApproved,
  gpuValidated = false,
  size = 'md',
  className,
}: VerifiedBadgeProps) {
  const sizeConfig = SIZE_CONFIG[size]

  if (!expertApproved && !gpuValidated) {
    return null
  }

  const isFullyVerified = expertApproved && gpuValidated

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border',
        isFullyVerified
          ? 'bg-primary/10 border-primary/30'
          : 'bg-emerald-500/10 border-emerald-500/30',
        sizeConfig.padding,
        sizeConfig.gap,
        className
      )}
      title={
        isFullyVerified
          ? 'Expert approved and GPU validated'
          : expertApproved
          ? 'Expert approved'
          : 'GPU validated'
      }
    >
      <Shield
        size={sizeConfig.iconSize}
        className={isFullyVerified ? 'text-primary' : 'text-emerald-500'}
      />
      {size !== 'sm' && (
        <span
          className={cn(
            sizeConfig.text,
            'font-medium',
            isFullyVerified ? 'text-primary' : 'text-emerald-500'
          )}
        >
          {isFullyVerified ? 'Verified' : expertApproved ? 'Expert' : 'GPU'}
        </span>
      )}
      {isFullyVerified && (
        <div className="flex items-center gap-0.5">
          <User size={sizeConfig.iconSize - 2} className="text-primary" />
          <span className="text-primary">+</span>
          <CheckCircle size={sizeConfig.iconSize - 2} className="text-primary" />
        </div>
      )}
    </div>
  )
}

export default ExpertApprovalBadge
