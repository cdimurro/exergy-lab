'use client'

import * as React from 'react'
import { Card, Badge, Button } from '@/components/ui'
import {
  Check,
  Zap,
  Building2,
  ArrowRight,
  Sparkles,
  Search,
  Cpu,
  FlaskConical,
  Calculator,
  Rocket,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useUsage } from '@/hooks/use-usage'
import { FEATURE_LIMITS, FEATURE_DISPLAY_NAMES, type UserTier } from '@/lib/usage'

interface PricingTier {
  name: string
  tier: UserTier
  description: string
  price: { monthly: number; annual: number } | null
  priceLabel?: string
  icon: React.ElementType
  popular?: boolean
  features: string[]
  limits: Array<{
    feature: string
    limit: string
  }>
  ctaText: string
  ctaHref?: string
}

const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Free',
    tier: 'free',
    description: 'Explore the platform with limited access',
    price: null,
    priceLabel: 'Free',
    icon: Sparkles,
    features: [
      'Literature Search (10/day)',
      'TEA Reports (5/month)',
      'Basic analytics',
      'Community support',
    ],
    limits: [
      { feature: 'Searches', limit: '10/day' },
      { feature: 'TEA reports', limit: '5/month' },
      { feature: 'Discovery workflows', limit: 'Not included' },
      { feature: 'Breakthrough workflows', limit: 'Not included' },
      { feature: 'Simulations', limit: 'Not included' },
      { feature: 'GPU simulations', limit: 'Not included' },
    ],
    ctaText: 'Get Started',
    ctaHref: '/search',
  },
  {
    name: 'Pro',
    tier: 'pro',
    description: 'Full access for individual researchers',
    price: { monthly: 1999, annual: 19990 },
    icon: Zap,
    popular: true,
    features: [
      'Everything in Free, plus:',
      'Discovery Engine (10/month)',
      'Breakthrough Engine (5/month)',
      'Simulations (30/day)',
      'Experiments (20/month)',
      'GPU Simulations (5/month)',
      'Email support',
    ],
    limits: [
      { feature: 'Searches', limit: '50/day' },
      { feature: 'TEA reports', limit: '25/month' },
      { feature: 'Discovery workflows', limit: '10/month' },
      { feature: 'Breakthrough workflows', limit: '5/month' },
      { feature: 'Simulations', limit: '30/day' },
      { feature: 'GPU simulations', limit: '5/month' },
    ],
    ctaText: 'Upgrade to Pro',
  },
  {
    name: 'Enterprise',
    tier: 'enterprise',
    description: 'Unlimited access for teams and organizations',
    price: { monthly: 9900, annual: 99000 },
    icon: Building2,
    features: [
      'Everything in Pro, plus:',
      'Unlimited usage on all features',
      'Team workspaces',
      'Shared reports and saved items',
      'Member management',
      'Priority support',
      'SSO integration (add-on)',
    ],
    limits: [
      { feature: 'Searches', limit: 'Unlimited' },
      { feature: 'TEA reports', limit: 'Unlimited' },
      { feature: 'Discovery workflows', limit: 'Unlimited' },
      { feature: 'Breakthrough workflows', limit: 'Unlimited' },
      { feature: 'Simulations', limit: 'Unlimited' },
      { feature: 'GPU simulations', limit: 'Unlimited' },
    ],
    ctaText: 'Upgrade to Enterprise',
  },
]

const FEATURE_ICONS: Record<string, React.ElementType> = {
  Searches: Search,
  'Discovery workflows': Cpu,
  'Breakthrough workflows': Rocket,
  Simulations: FlaskConical,
  'TEA reports': Calculator,
  'GPU simulations': Zap,
}

export default function PricingPage() {
  const { tier: currentTier, setTier } = useUsage()
  const [billingPeriod, setBillingPeriod] = React.useState<'monthly' | 'annual'>('monthly')

  // For demo purposes, allow clicking to change tier
  const handleTierClick = (tier: UserTier) => {
    if (tier === 'free' || tier === 'pro') {
      setTier(tier)
    }
  }

  return (
    <div className="min-h-screen bg-page-background">
      {/* Header */}
      <div className="bg-background-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-lg text-foreground-muted max-w-2xl mx-auto">
              Choose the plan that fits your research needs. All plans include access to our core
              AI-powered research tools.
            </p>

            {/* Billing Toggle */}
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  billingPeriod === 'monthly'
                    ? 'bg-primary text-white'
                    : 'text-foreground-muted hover:text-foreground'
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  billingPeriod === 'annual'
                    ? 'bg-primary text-white'
                    : 'text-foreground-muted hover:text-foreground'
                )}
              >
                Annual
                <Badge className="ml-2 bg-green-100 text-green-700" size="sm">
                  Save 17%
                </Badge>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PRICING_TIERS.map((tierInfo) => {
            const Icon = tierInfo.icon
            const isCurrentTier = currentTier === tierInfo.tier

            return (
              <Card
                key={tierInfo.tier}
                className={cn(
                  'relative flex flex-col',
                  tierInfo.popular && 'ring-2 ring-primary',
                  isCurrentTier && 'bg-primary/5'
                )}
              >
                {/* Popular Badge */}
                {tierInfo.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white">
                    Most Popular
                  </Badge>
                )}

                {/* Current Tier Badge */}
                {isCurrentTier && (
                  <Badge className="absolute -top-3 right-4 bg-green-500 text-white">
                    Current Plan
                  </Badge>
                )}

                {/* Header */}
                <div className="text-center pb-6 border-b border-border">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">{tierInfo.name}</h2>
                  <p className="text-sm text-foreground-muted mt-1">{tierInfo.description}</p>

                  {/* Price */}
                  <div className="mt-4">
                    {tierInfo.price ? (
                      <>
                        <span className="text-4xl font-bold text-foreground">
                          ${billingPeriod === 'monthly'
                            ? (tierInfo.price.monthly / 100).toFixed(2)
                            : (tierInfo.price.annual / 12 / 100).toFixed(2)}
                        </span>
                        <span className="text-foreground-muted">/month</span>
                        {billingPeriod === 'annual' && (
                          <p className="text-sm text-foreground-muted mt-1">
                            Billed ${(tierInfo.price.annual / 100).toFixed(0)}/year
                          </p>
                        )}
                      </>
                    ) : (
                      <span className="text-4xl font-bold text-foreground">
                        {tierInfo.priceLabel}
                      </span>
                    )}
                  </div>
                </div>

                {/* Features */}
                <div className="flex-1 py-6">
                  <ul className="space-y-3">
                    {tierInfo.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Limits */}
                  <div className="mt-6 pt-6 border-t border-border">
                    <h4 className="text-sm font-medium text-foreground mb-3">Usage Limits</h4>
                    <div className="space-y-2">
                      {tierInfo.limits.map((limit, i) => {
                        const LimitIcon = FEATURE_ICONS[limit.feature] || Check
                        return (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2 text-foreground-muted">
                              <LimitIcon className="h-3.5 w-3.5" />
                              <span>{limit.feature}</span>
                            </div>
                            <span
                              className={cn(
                                'font-medium',
                                limit.limit === 'Unlimited' ? 'text-primary' : 'text-foreground'
                              )}
                            >
                              {limit.limit}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="pt-4 border-t border-border">
                  {tierInfo.tier === 'enterprise' ? (
                    <Button variant="outline" className="w-full">
                      {tierInfo.ctaText}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  ) : tierInfo.ctaHref ? (
                    <Link href={tierInfo.ctaHref}>
                      <Button
                        variant={tierInfo.popular ? 'primary' : 'outline'}
                        className="w-full"
                        disabled={isCurrentTier}
                      >
                        {isCurrentTier ? 'Current Plan' : tierInfo.ctaText}
                        {!isCurrentTier && <ArrowRight className="h-4 w-4 ml-2" />}
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      variant={tierInfo.popular ? 'primary' : 'outline'}
                      className="w-full"
                      disabled={isCurrentTier}
                      onClick={() => handleTierClick(tierInfo.tier)}
                    >
                      {isCurrentTier ? 'Current Plan' : tierInfo.ctaText}
                      {!isCurrentTier && <ArrowRight className="h-4 w-4 ml-2" />}
                    </Button>
                  )}
                </div>
              </Card>
            )
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card className="bg-background-surface">
              <h3 className="font-semibold text-foreground mb-2">
                Can I change plans anytime?
              </h3>
              <p className="text-sm text-foreground-muted">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect
                immediately, with prorated billing for upgrades.
              </p>
            </Card>
            <Card className="bg-background-surface">
              <h3 className="font-semibold text-foreground mb-2">
                What happens when I hit my limit?
              </h3>
              <p className="text-sm text-foreground-muted">
                You'll see a notification prompting you to upgrade. Daily limits reset at midnight UTC,
                monthly limits on the 1st of each month.
              </p>
            </Card>
            <Card className="bg-background-surface">
              <h3 className="font-semibold text-foreground mb-2">
                Do you offer academic discounts?
              </h3>
              <p className="text-sm text-foreground-muted">
                Yes! Students and academic researchers can get 50% off Pro plans with a valid .edu
                email. Contact support to apply.
              </p>
            </Card>
            <Card className="bg-background-surface">
              <h3 className="font-semibold text-foreground mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-sm text-foreground-muted">
                We accept all major credit cards, PayPal, and wire transfers for Enterprise plans.
                All payments are processed securely via Stripe.
              </p>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20 inline-block max-w-2xl">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Need help choosing?
            </h2>
            <p className="text-foreground-muted mb-4">
              Our team is happy to help you find the right plan for your research needs.
            </p>
            <Button variant="outline">
              Contact Sales
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Card>
        </div>
      </div>
    </div>
  )
}
