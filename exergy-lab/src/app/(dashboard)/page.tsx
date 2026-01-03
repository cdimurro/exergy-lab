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
  Home,
  Circle,
  ArrowRight,
  CheckCircle2,
  Search,
  FlaskConical,
  Bot,
  Calculator,
  Cpu,
  Rocket,
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

const ABOUT_FEATURES = [
  { title: 'Search', description: 'Find papers across 15+ academic databases', icon: Search, href: '/search' },
  { title: 'Experiments', description: 'AI-generated experimental protocols', icon: FlaskConical, href: '/experiments' },
  { title: 'Simulations', description: '3-tier computational simulations', icon: Bot, href: '/simulations' },
  { title: 'Discovery', description: 'Novel cross-domain innovations', icon: Cpu, href: '/discovery' },
  { title: 'Breakthrough', description: 'Scientific breakthrough engine', icon: Rocket, href: '/breakthrough' },
  { title: 'TEA Reports', description: 'Techno-economic analysis', icon: Calculator, href: '/tea-generator' },
]

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
      <div className="h-full flex flex-col">
        <div className="border-b border-border bg-background-elevated px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Home className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Exergy Lab</h1>
              <p className="text-sm text-foreground-muted">AI-powered scientific research platform</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="animate-pulse space-y-6">
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
    <div className="h-full flex flex-col">
      {/* Fixed Header */}
      <div className="border-b border-border bg-background-elevated px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Home className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Exergy Lab</h1>
              <p className="text-sm text-foreground-muted">AI-powered scientific research platform</p>
            </div>
          </div>
          <div className="text-sm text-foreground-muted hidden sm:block">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-6">
          {/* Stats Row */}
          <DashboardStatsRow
            searches={stats.searches}
            experiments={stats.experiments}
            simulations={stats.simulations}
            teaReports={stats.teaReports}
            discoveries={stats.discoveries}
          />

          {/* About Exergy Lab */}
          <Card className="bg-background-elevated/50">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              About Exergy Lab
            </h2>
            <p className="text-sm text-foreground-muted mb-4">
              An AI-powered platform for accelerating scientific research in energy, materials, and chemicals.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {ABOUT_FEATURES.map((feature) => {
                const Icon = feature.icon
                return (
                  <button
                    key={feature.title}
                    onClick={() => router.push(feature.href)}
                    className="p-3 rounded-lg bg-background-surface hover:bg-background-elevated transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-foreground-muted group-hover:text-primary transition-colors" />
                      <span className="font-medium text-foreground text-sm group-hover:text-primary transition-colors">{feature.title}</span>
                    </div>
                    <p className="text-foreground-muted text-xs">{feature.description}</p>
                  </button>
                )
              })}
            </div>
          </Card>

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
                <Card>
                  <div className="flex items-center gap-2 mb-4">
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
                          className="w-full flex items-center gap-2 text-left text-sm py-1.5 cursor-pointer disabled:cursor-default"
                          disabled={item.done}
                        >
                          {item.done ? (
                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
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
              <Card>
                <h3 className="font-semibold text-foreground mb-3">Pro Tips</h3>
                <ul className="space-y-2 text-sm text-foreground-muted">
                  <li className="flex items-start gap-2">
                    <span className="text-foreground-muted shrink-0">-</span>
                    <span>
                      Use Discovery Engine to find novel cross-domain innovations
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-foreground-muted shrink-0">-</span>
                    <span>
                      Start with Tier 1 simulations (free, fast) then upgrade for accuracy
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-foreground-muted shrink-0">-</span>
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
    </div>
  )
}
