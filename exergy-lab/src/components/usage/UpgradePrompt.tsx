'use client'

import * as React from 'react'
import { Card, Badge, Button } from '@/components/ui'
import { Sparkles, Check, X, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { FeatureType } from '@/lib/usage/types'
import { useUsage } from '@/hooks/use-usage'
import { FEATURE_DISPLAY_NAMES, getFeatureLimit, getTierPricing } from '@/lib/usage/limits'

interface UpgradePromptProps {
  feature: FeatureType
  isOpen: boolean
  onClose: () => void
  className?: string
}

export function UpgradePrompt({ feature, isOpen, onClose, className }: UpgradePromptProps) {
  const { tier, checkFeature } = useUsage()
  const check = checkFeature(feature)

  if (!isOpen) return null

  const proPricing = getTierPricing('pro')
  const proLimit = getFeatureLimit(feature, 'pro')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className={cn('relative max-w-md w-full mx-4 bg-background', className)}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-background-elevated text-foreground-muted hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Content */}
        <div className="text-center pt-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
            <Sparkles className="h-6 w-6" />
          </div>

          <h2 className="text-xl font-semibold text-foreground mb-2">
            Upgrade to Pro
          </h2>

          <p className="text-foreground-muted mb-6">
            You've reached your {FEATURE_DISPLAY_NAMES[feature].toLowerCase()} limit.
            Upgrade to Pro for {proLimit === -1 ? 'unlimited' : `${proLimit}x more`} {FEATURE_DISPLAY_NAMES[feature].toLowerCase()}.
          </p>

          {/* Current Usage */}
          <div className="bg-background-surface rounded-lg p-3 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-muted">Current usage</span>
              <span className="font-medium text-foreground">
                {check.currentUsage} / {check.limit} used
              </span>
            </div>
            <div className="mt-2 h-2 bg-background-elevated rounded-full overflow-hidden">
              <div
                className="h-full bg-red-500 rounded-full"
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Pro Benefits */}
          <div className="text-left space-y-2 mb-6">
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary" />
              <span className="text-foreground">
                {proLimit === -1 ? 'Unlimited' : `${proLimit}`} {FEATURE_DISPLAY_NAMES[feature]}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary" />
              <span className="text-foreground">Discovery Engine (10/month)</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary" />
              <span className="text-foreground">All AI-powered features</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-primary" />
              <span className="text-foreground">Email support</span>
            </div>
          </div>

          {/* Pricing */}
          <div className="flex items-baseline justify-center gap-1 mb-4">
            <span className="text-3xl font-bold text-foreground">
              ${proPricing ? (proPricing.monthly / 100).toFixed(2) : '19.99'}
            </span>
            <span className="text-foreground-muted">/month</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Maybe Later
            </Button>
            <Link href="/pricing" className="flex-1">
              <Button className="w-full" leftIcon={<Zap className="h-4 w-4" />}>
                Upgrade Now
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}

/**
 * Hook to manage upgrade prompt visibility
 */
export function useUpgradePrompt() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [targetFeature, setTargetFeature] = React.useState<FeatureType>('search')

  const showPrompt = React.useCallback((feature: FeatureType) => {
    setTargetFeature(feature)
    setIsOpen(true)
  }, [])

  const hidePrompt = React.useCallback(() => {
    setIsOpen(false)
  }, [])

  return {
    isOpen,
    targetFeature,
    showPrompt,
    hidePrompt,
  }
}
