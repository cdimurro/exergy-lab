/**
 * Dashboard Page
 *
 * Unified results hub showing recent activity across all features
 * with actionable insights and quick navigation.
 */

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Lightbulb,
  Circle,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
} from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'
import { useProjectsStore } from '@/lib/store/projects-store'
import { useSimulationsStore } from '@/lib/store/simulations-store'
import { useExperimentsStore } from '@/lib/store/experiments-store'
import { useDiscoveriesStore } from '@/lib/store/discoveries-store'
import { useTEAStore } from '@/lib/store/tea-store'
import {
  DashboardStatsRow,
  RecentDiscoveriesCard,
  RecentSimulationsCard,
  RecentExperimentsCard,
  RecentTEACard,
  SessionInsightsCard,
  QuickActionsCard,
} from '@/components/dashboard'

export default function DashboardPage() {
  const router = useRouter()
  const [mounted, setMounted] = React.useState(false)

  // Get data from stores
  const projectsStore = useProjectsStore()
  const simulationsStore = useSimulationsStore()
  const experimentsStore = useExperimentsStore()
  const discoveriesStore = useDiscoveriesStore()
  const teaStore = useTEAStore()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate stats from stores (prefer actual saved items, fallback to counters)
  const stats = {
    searches: projectsStore.searchCount,
    experiments: experimentsStore.savedExperiments.length || projectsStore.experimentCount,
    simulations: simulationsStore.savedSimulations.length || projectsStore.simulationCount,
    teaReports: teaStore.savedReports.length || projectsStore.teaCount,
    discoveries: discoveriesStore.savedDiscoveries.length || projectsStore.discoveryCount,
  }

  // Onboarding checklist items
  const onboardingItems = [
    {
      label: 'Run your first Search',
      href: '/search',
      done: stats.searches > 0,
    },
    {
      label: 'Design an Experiment',
      href: '/experiments',
      done: stats.experiments > 0,
    },
    {
      label: 'Run a Simulation',
      href: '/simulations',
      done: stats.simulations > 0,
    },
    {
      label: 'Generate a TEA Report',
      href: '/tea-generator',
      done: stats.teaReports > 0,
    },
    {
      label: 'Try the Discovery Engine',
      href: '/discovery',
      done: stats.discoveries > 0,
    },
  ]

  const completedOnboarding = onboardingItems.filter((i) => i.done).length

  if (!mounted) {
    return (
      <div className="min-h-screen p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-background-elevated rounded w-1/3" />
            <div className="grid grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-24 bg-background-elevated rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Welcome Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              Welcome to Exergy Lab
            </h1>
            <p className="text-foreground-subtle mt-1">
              Your AI-powered clean energy research platform
            </p>
          </div>
          <div className="text-sm text-foreground-muted hidden sm:block">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>

        {/* Stats Row */}
        <DashboardStatsRow
          searches={stats.searches}
          experiments={stats.experiments}
          simulations={stats.simulations}
          teaReports={stats.teaReports}
          discoveries={stats.discoveries}
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Recent Activity (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Discoveries */}
            <RecentDiscoveriesCard />

            {/* Recent Simulations */}
            <RecentSimulationsCard />

            {/* Recent Experiments */}
            <RecentExperimentsCard />

            {/* Recent TEA Reports */}
            <RecentTEACard />
          </div>

          {/* Right Column - Sidebar (1/3 width) */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <QuickActionsCard />

            {/* Session Insights */}
            <SessionInsightsCard />

            {/* Onboarding Checklist - Show for new or partial users */}
            {completedOnboarding < 5 && (
              <Card className="border-primary/30">
                <div className="flex items-center gap-2 mb-4">
                  <Lightbulb className="w-5 h-5 text-accent-amber" />
                  <h3 className="font-semibold text-foreground">Getting Started</h3>
                  <Badge variant="secondary" size="sm" className="ml-auto">
                    {completedOnboarding}/5
                  </Badge>
                </div>

                <ul className="space-y-2">
                  {onboardingItems.map((item) => (
                    <li key={item.href} className="group">
                      <button
                        onClick={() => router.push(item.href)}
                        className="w-full flex items-center gap-2 text-left text-sm py-1.5"
                        disabled={item.done}
                      >
                        {item.done ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-foreground-subtle shrink-0 group-hover:text-primary transition-colors" />
                        )}
                        <span
                          className={
                            item.done
                              ? 'text-foreground-muted line-through'
                              : 'text-foreground group-hover:text-primary transition-colors'
                          }
                        >
                          {item.label}
                        </span>
                        {!item.done && (
                          <ArrowRight className="w-3 h-3 text-foreground-muted ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {/* Pro Tips */}
            <Card className="border-accent-purple/30">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-accent-purple" />
                <h3 className="font-semibold text-foreground">Pro Tips</h3>
              </div>

              <ul className="space-y-2 text-sm text-foreground-muted">
                <li className="flex items-start gap-2">
                  <span className="text-accent-cyan shrink-0">1.</span>
                  <span>
                    Use Discovery Engine to find novel cross-domain innovations
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-cyan shrink-0">2.</span>
                  <span>
                    Start with Tier 1 simulations (free, fast) then upgrade for accuracy
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-cyan shrink-0">3.</span>
                  <span>
                    Upload data files to TEA Reports for AI parameter extraction
                  </span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
