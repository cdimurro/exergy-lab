import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Check, Zap, Star, Sparkles, ArrowRight, Crown, Eye } from 'lucide-react'
import { useAuthContext, useApi, type Tier } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'

interface PricingTier {
  name: string
  price: string
  priceYearly: string
  description: string
  features: string[]
  highlighted?: boolean
  tier: Tier
  cta: string
  icon: React.ReactNode
}

const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Free',
    price: '$0',
    priceYearly: '$0',
    description: 'Explore the platform and visualize global energy data',
    tier: 'free',
    cta: 'Get Started Free',
    icon: <Eye className="w-5 h-5 text-gray-400" />,
    features: [
      'Interactive Energy Visualization',
      'View-only Global Dashboard',
      '1 Sample Project',
      'Community Support',
    ],
  },
  {
    name: 'Starter',
    price: '$19.99',
    priceYearly: '$199',
    description: 'Perfect for students, researchers, and early-stage founders',
    tier: 'starter',
    cta: 'Start Free Trial',
    icon: <Zap className="w-5 h-5 text-primary" />,
    features: [
      'Everything in Free',
      'Basic TEA Calculator (CAPEX, OPEX, LCOE)',
      'Upload and analyze data (CSV, Excel)',
      'Historical energy trends',
      'Standard PDF reports',
      '3 Projects',
      'Email support',
    ],
  },
  {
    name: 'Professional',
    price: '$99',
    priceYearly: '$990',
    description: 'For working engineers, scientists, and growing teams',
    tier: 'professional',
    highlighted: true,
    cta: 'Start Free Trial',
    icon: <Star className="w-5 h-5 text-accent-blue" />,
    features: [
      'Everything in Starter',
      'Full TEA Engine (NPV, IRR, Monte Carlo)',
      'Exergy-Economic Analysis',
      'Sensitivity analysis & scenario comparison',
      'AI-powered custom insights',
      'Investor-ready PDF reports',
      'Unlimited projects',
      '5 team seats',
      'Priority support (24hr response)',
    ],
  },
  {
    name: 'Discovery',
    price: '$499',
    priceYearly: '$4,990',
    description: 'For R&D teams, innovation labs, VCs, and large corporations',
    tier: 'discovery',
    cta: 'Contact Sales',
    icon: <Sparkles className="w-5 h-5 text-accent-purple" />,
    features: [
      'Everything in Professional',
      'AI Discovery Engine',
      'Materials Project database integration',
      'Literature synthesis & research assistant',
      'Patent landscape analysis',
      'Cross-domain synthesis',
      'Full API access',
      'Unlimited team members',
      'Dedicated support channel',
      'Custom model requests',
    ],
  },
]

const FAQ_ITEMS = [
  {
    question: 'What makes this different from NREL SAM or other tools?',
    answer: 'We provide Exergy-Economic Analysis (Second Law thermodynamics) that no other tool offers. This reveals the true thermodynamic value of different energy sources and shows why clean energy delivers 3x more value per unit of primary energy. Plus, we\'re cloud-native with AI-powered insights.',
  },
  {
    question: 'Can I try before I buy?',
    answer: 'Yes! The Global Energy Dashboard is free for everyone. You can explore 60 years of energy data and see the exergy services methodology in action before upgrading to access TEA calculations and advanced features.',
  },
  {
    question: 'What data sources do you use?',
    answer: 'We integrate with Materials Project (CC-BY 4.0), Open Catalyst Project (MIT), NIST/ATcT (public domain), and our proprietary Global Exergy Services model validated against IEA World Energy Outlook and peer-reviewed literature.',
  },
  {
    question: 'Can I cancel anytime?',
    answer: 'Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period.',
  },
  {
    question: 'Do you offer discounts for academic institutions?',
    answer: 'Yes! We offer 50% discounts for academic institutions and non-profits. Contact us at support@cleanenergyplatform.com with your institutional email for a discount code.',
  },
]

export function Pricing() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const { isAuthenticated, tier: currentTier } = useAuthContext()
  const { fetchWithAuth } = useApi()
  const navigate = useNavigate()

  const handleSubscribe = async (tier: PricingTier) => {
    if (tier.tier === 'free') {
      if (!isAuthenticated) {
        navigate('/login')
      } else {
        navigate('/energy')
      }
      return
    }

    if (tier.tier === 'discovery') {
      // Discovery tier requires contacting sales
      window.location.href = 'mailto:sales@cleanenergyplatform.com?subject=Discovery Tier Inquiry'
      return
    }

    if (!isAuthenticated) {
      // Redirect to login with return URL
      navigate('/login?redirect=/pricing')
      return
    }

    setIsLoading(tier.tier)

    try {
      const response = await fetchWithAuth('/api/payments/create-checkout', {
        method: 'POST',
        body: JSON.stringify({
          tier: tier.tier,
          success_url: `${window.location.origin}/dashboard?checkout=success`,
          cancel_url: `${window.location.origin}/pricing?checkout=cancelled`,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        window.location.href = data.checkout_url
      } else {
        const error = await response.json()
        alert(`Checkout failed: ${error.detail || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout. Please try again.')
    } finally {
      setIsLoading(null)
    }
  }

  const isCurrentTier = (tier: Tier) => currentTier === tier
  const isUpgrade = (tier: Tier) => {
    const tierOrder = { free: 0, starter: 1, professional: 2, discovery: 3 }
    return tierOrder[tier] > tierOrder[currentTier]
  }

  return (
    <div className="min-h-screen bg-surface">
      <Header
        title="Pricing"
        subtitle="The intelligence platform for the clean energy transition"
      />

      <div className="p-6 space-y-12">
        {/* Tagline */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-text-primary mb-4">
            Accelerate Your Clean Energy Innovation
          </h2>
          <p className="text-lg text-text-secondary">
            From students learning about energy systems to corporations making billion-dollar decisions.
            Turn complex TEA/LCA analysis into intuitive, AI-powered insights.
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4">
          <span className={`text-sm font-medium transition-colors ${billingCycle === 'monthly' ? 'text-text-primary' : 'text-text-muted'}`}>
            Monthly
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            className="relative w-14 h-7 bg-surface-elevated rounded-full transition-colors border border-border hover:border-primary/50"
          >
            <span
              className={`absolute top-1 w-5 h-5 bg-primary rounded-full transition-transform shadow-md ${
                billingCycle === 'yearly' ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm font-medium transition-colors ${billingCycle === 'yearly' ? 'text-text-primary' : 'text-text-muted'}`}>
            Yearly
            <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full font-semibold">
              Save 17%
            </span>
          </span>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {PRICING_TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative rounded-xl border transition-all duration-200 hover:shadow-lg ${
                tier.highlighted
                  ? 'border-2 border-primary bg-gradient-to-b from-primary/10 via-primary/5 to-transparent shadow-lg shadow-primary/10'
                  : 'border-border bg-surface-secondary hover:border-primary/30'
              } ${isCurrentTier(tier.tier) ? 'ring-2 ring-primary/50' : ''}`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-primary text-white text-xs font-semibold rounded-full flex items-center gap-1.5 shadow-lg">
                    <Star className="w-3 h-3" />
                    Most Popular
                  </span>
                </div>
              )}

              {isCurrentTier(tier.tier) && (
                <div className="absolute -top-3 right-4">
                  <span className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Current
                  </span>
                </div>
              )}

              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  {tier.icon}
                  <h3 className="text-xl font-bold text-text-primary">{tier.name}</h3>
                </div>

                <div className="mt-4 mb-3">
                  <span className="text-4xl font-bold text-text-primary">
                    {billingCycle === 'monthly' ? tier.price : tier.priceYearly}
                  </span>
                  <span className="text-text-muted ml-1">
                    /{billingCycle === 'monthly' ? 'mo' : 'year'}
                  </span>
                </div>

                <p className="text-sm text-text-secondary mb-6 min-h-[40px]">{tier.description}</p>

                <Button
                  variant={tier.highlighted ? 'primary' : 'secondary'}
                  className="w-full mb-6"
                  onClick={() => handleSubscribe(tier)}
                  disabled={isLoading === tier.tier || isCurrentTier(tier.tier)}
                  loading={isLoading === tier.tier}
                  rightIcon={!isCurrentTier(tier.tier) && isUpgrade(tier.tier) ? <ArrowRight className="w-4 h-4" /> : undefined}
                >
                  {isCurrentTier(tier.tier) ? 'Current Plan' : tier.cta}
                </Button>

                <ul className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <span className="text-text-secondary">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Enterprise CTA */}
        <div className="rounded-xl max-w-4xl mx-auto bg-gradient-to-r from-accent-purple/10 via-primary/10 to-accent-blue/10 border border-border">
          <div className="p-8 text-center">
            <h3 className="text-2xl font-bold text-text-primary mb-3">
              Need a Custom Solution?
            </h3>
            <p className="text-text-secondary mb-6 max-w-2xl mx-auto">
              For large organizations with specific requirements, we offer custom deployments,
              dedicated infrastructure, enterprise-grade SLAs, and white-label solutions.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button
                variant="secondary"
                onClick={() => window.location.href = 'mailto:enterprise@cleanenergyplatform.com'}
              >
                Contact Enterprise Sales
              </Button>
              <Button
                variant="ghost"
                onClick={() => window.location.href = 'mailto:support@cleanenergyplatform.com'}
              >
                Request Demo
              </Button>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-text-primary text-center mb-8">
            How We Compare
          </h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-secondary">
                  <th className="text-left py-4 px-6 text-text-muted font-semibold">Feature</th>
                  <th className="text-center py-4 px-4 text-text-muted font-semibold">Bloomberg Terminal</th>
                  <th className="text-center py-4 px-4 text-text-muted font-semibold">NREL SAM</th>
                  <th className="text-center py-4 px-4 text-primary font-semibold">Clean Energy Platform</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="bg-surface">
                  <td className="py-4 px-6 text-text-primary font-medium">Price</td>
                  <td className="py-4 px-4 text-center text-text-muted">$24,000/year</td>
                  <td className="py-4 px-4 text-center text-text-muted">Free (desktop only)</td>
                  <td className="py-4 px-4 text-center text-primary font-semibold">$0-$499/mo</td>
                </tr>
                <tr className="bg-surface-secondary">
                  <td className="py-4 px-6 text-text-primary font-medium">Exergy Analysis</td>
                  <td className="py-4 px-4 text-center text-red-400">-</td>
                  <td className="py-4 px-4 text-center text-red-400">-</td>
                  <td className="py-4 px-4 text-center text-green-400 font-bold">&#10003;</td>
                </tr>
                <tr className="bg-surface">
                  <td className="py-4 px-6 text-text-primary font-medium">Cloud-native</td>
                  <td className="py-4 px-4 text-center text-green-400">&#10003;</td>
                  <td className="py-4 px-4 text-center text-red-400">-</td>
                  <td className="py-4 px-4 text-center text-green-400 font-bold">&#10003;</td>
                </tr>
                <tr className="bg-surface-secondary">
                  <td className="py-4 px-6 text-text-primary font-medium">AI-powered insights</td>
                  <td className="py-4 px-4 text-center text-red-400">-</td>
                  <td className="py-4 px-4 text-center text-red-400">-</td>
                  <td className="py-4 px-4 text-center text-green-400 font-bold">&#10003;</td>
                </tr>
                <tr className="bg-surface">
                  <td className="py-4 px-6 text-text-primary font-medium">Materials Database</td>
                  <td className="py-4 px-4 text-center text-red-400">-</td>
                  <td className="py-4 px-4 text-center text-red-400">-</td>
                  <td className="py-4 px-4 text-center text-green-400 font-bold">&#10003;</td>
                </tr>
                <tr className="bg-surface-secondary">
                  <td className="py-4 px-6 text-text-primary font-medium">TEA Calculator</td>
                  <td className="py-4 px-4 text-center text-red-400">-</td>
                  <td className="py-4 px-4 text-center text-text-muted">&#10003;</td>
                  <td className="py-4 px-4 text-center text-green-400 font-bold">&#10003;</td>
                </tr>
                <tr className="bg-surface">
                  <td className="py-4 px-6 text-text-primary font-medium">Team Collaboration</td>
                  <td className="py-4 px-4 text-center text-green-400">&#10003;</td>
                  <td className="py-4 px-4 text-center text-red-400">-</td>
                  <td className="py-4 px-4 text-center text-green-400 font-bold">&#10003;</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-text-primary text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, index) => (
              <div key={index} className="rounded-xl border border-border bg-surface-secondary overflow-hidden">
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-surface-elevated transition-colors"
                >
                  <span className="font-medium text-text-primary pr-4">{item.question}</span>
                  <span className={`text-text-muted transition-transform shrink-0 ${
                    expandedFaq === index ? 'rotate-180' : ''
                  }`}>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </span>
                </button>
                {expandedFaq === index && (
                  <div className="px-5 pb-5 text-text-secondary leading-relaxed">
                    {item.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Trust Badges */}
        <div className="text-center pb-8">
          <p className="text-text-muted text-sm mb-4">Trusted by researchers and engineers at</p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
            <span className="text-text-muted font-semibold">MIT</span>
            <span className="text-text-muted font-semibold">Stanford</span>
            <span className="text-text-muted font-semibold">NREL</span>
            <span className="text-text-muted font-semibold">Breakthrough Energy</span>
            <span className="text-text-muted font-semibold">Tesla</span>
          </div>
        </div>
      </div>
    </div>
  )
}
