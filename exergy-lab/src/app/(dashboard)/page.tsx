'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  Calculator,
  FlaskConical,
  Cpu,
  Sparkles,
  TrendingUp,
  FileText,
  Clock,
  ArrowRight,
  Lightbulb,
  Zap,
  CheckCircle2,
  Circle,
} from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'

interface QuickAction {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  href: string
  color: string
  gradient: string
}

interface RecentProject {
  id: string
  type: 'search' | 'tea' | 'experiment' | 'simulation' | 'discovery'
  title: string
  timestamp: string
  status?: string
}

export default function DashboardPage() {
  // TODO: Re-enable Clerk authentication when configured
  // const { user, isLoaded } = useUser()
  const user = null
  const isLoaded = true

  const router = useRouter()
  const [recentProjects, setRecentProjects] = React.useState<RecentProject[]>([])
  const [stats, setStats] = React.useState({
    searches: 0,
    experiments: 0,
    teaReports: 0,
    discoveries: 0,
  })

  // Load recent projects from localStorage
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('recentProjects')
      if (saved) {
        setRecentProjects(JSON.parse(saved).slice(0, 5))
      }

      // Load stats
      const statsData = {
        searches: parseInt(localStorage.getItem('searchCount') || '0'),
        experiments: parseInt(localStorage.getItem('experimentCount') || '0'),
        teaReports: parseInt(localStorage.getItem('teaCount') || '0'),
        discoveries: parseInt(localStorage.getItem('discoveryCount') || '0'),
      }
      setStats(statsData)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }, [])

  const quickActions: QuickAction[] = [
    {
      title: 'Search Research',
      description: 'Find academic papers across multiple databases',
      icon: Search,
      href: '/search',
      color: 'text-primary',
      gradient: '',
    },
    {
      title: 'Design Experiment',
      description: 'Generate AI-powered experiment protocols',
      icon: FlaskConical,
      href: '/experiments',
      color: 'text-accent-purple',
      gradient: '',
    },
    {
      title: 'TEA Report',
      description: 'Create techno-economic analysis reports',
      icon: Calculator,
      href: '/tea-generator',
      color: 'text-accent-cyan',
      gradient: '',
    },
    {
      title: 'Run Simulation',
      description: 'Execute 3-tier computational simulations',
      icon: Cpu,
      href: '/simulations',
      color: 'text-accent-amber',
      gradient: '',
    },
    {
      title: 'Discover Ideas',
      description: 'Find novel cross-domain innovations',
      icon: Sparkles,
      href: '/discovery',
      color: 'text-accent-rose',
      gradient: '',
    },
  ]

  const getProjectIcon = (type: string) => {
    switch (type) {
      case 'search':
        return Search
      case 'tea':
        return Calculator
      case 'experiment':
        return FlaskConical
      case 'simulation':
        return Cpu
      case 'discovery':
        return Sparkles
      default:
        return FileText
    }
  }

  const getProjectColor = (type: string) => {
    switch (type) {
      case 'search':
        return 'text-primary'
      case 'tea':
        return 'text-accent-cyan'
      case 'experiment':
        return 'text-accent-purple'
      case 'simulation':
        return 'text-accent-amber'
      case 'discovery':
        return 'text-accent-rose'
      default:
        return 'text-foreground-muted'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMins / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMins < 60) {
        return `${diffMins}m ago`
      } else if (diffHours < 24) {
        return `${diffHours}h ago`
      } else if (diffDays < 7) {
        return `${diffDays}d ago`
      } else {
        return date.toLocaleDateString()
      }
    } catch {
      return timestamp
    }
  }

  return (
    <div className="min-h-screen bg-background p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Welcome to Exergy Lab
          </h1>
          <p className="text-lg text-foreground-muted">
            AI-powered clean energy research platform
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted mb-1">Searches</p>
                <p className="text-2xl font-bold text-foreground">{stats.searches}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <Search className="w-6 h-6 text-primary" />
              </div>
            </div>
          </Card>

          <Card className="hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted mb-1">Experiments</p>
                <p className="text-2xl font-bold text-foreground">{stats.experiments}</p>
              </div>
              <div className="p-3 rounded-xl bg-accent-purple/10">
                <FlaskConical className="w-6 h-6 text-accent-purple" />
              </div>
            </div>
          </Card>

          <Card className="hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted mb-1">TEA Reports</p>
                <p className="text-2xl font-bold text-foreground">{stats.teaReports}</p>
              </div>
              <div className="p-3 rounded-xl bg-accent-cyan/10">
                <Calculator className="w-6 h-6 text-accent-cyan" />
              </div>
            </div>
          </Card>

          <Card className="hover:border-primary/30 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-muted mb-1">Discoveries</p>
                <p className="text-2xl font-bold text-foreground">{stats.discoveries}</p>
              </div>
              <div className="p-3 rounded-xl bg-accent-rose/10">
                <Sparkles className="w-6 h-6 text-accent-rose" />
              </div>
            </div>
          </Card>
        </div>

        {/* Onboarding Checklist - Show for new users */}
        {stats.searches === 0 && stats.experiments === 0 && stats.teaReports === 0 && stats.discoveries === 0 && (
          <Card className="border-primary/30">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-accent-amber/10 shrink-0">
                <Lightbulb className="w-6 h-6 text-accent-amber" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-foreground">Get Started with Exergy Lab</h3>
                  <Badge variant="secondary" size="sm">
                    New User
                  </Badge>
                </div>
                <p className="text-sm text-foreground-muted mb-4">
                  Complete these steps to unlock the full potential of our AI-powered research platform
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-sm group">
                    <Circle className="w-5 h-5 text-foreground-subtle shrink-0" />
                    <span className="text-foreground-muted">
                      Run your first <span className="font-medium text-foreground">Search</span> to find academic papers
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => router.push('/search')}
                    >
                      Go
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </li>
                  <li className="flex items-center gap-3 text-sm group">
                    <Circle className="w-5 h-5 text-foreground-subtle shrink-0" />
                    <span className="text-foreground-muted">
                      Design an <span className="font-medium text-foreground">Experiment</span> with AI-generated protocols
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => router.push('/experiments')}
                    >
                      Go
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </li>
                  <li className="flex items-center gap-3 text-sm group">
                    <Circle className="w-5 h-5 text-foreground-subtle shrink-0" />
                    <span className="text-foreground-muted">
                      Generate a <span className="font-medium text-foreground">TEA Report</span> for techno-economic analysis
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => router.push('/tea-generator')}
                    >
                      Go
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </li>
                  <li className="flex items-center gap-3 text-sm group">
                    <Circle className="w-5 h-5 text-foreground-subtle shrink-0" />
                    <span className="text-foreground-muted">
                      Run a <span className="font-medium text-foreground">Simulation</span> using our 3-tier system
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => router.push('/simulations')}
                    >
                      Go
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </li>
                  <li className="flex items-center gap-3 text-sm group">
                    <Circle className="w-5 h-5 text-foreground-subtle shrink-0" />
                    <span className="text-foreground-muted">
                      Try the <span className="font-medium text-foreground">Discovery Engine</span> to find novel innovations
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => router.push('/discovery')}
                    >
                      Go
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        )}

        {/* Quick Actions */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-accent-amber" />
            <h2 className="text-xl font-semibold text-foreground">Quick Actions</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Card
                  key={action.href}
                  className="hover:border-primary/50 hover:shadow-lg transition-all duration-200 cursor-pointer group"
                  onClick={() => router.push(action.href)}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-background-surface">
                      <Icon className={`w-6 h-6 ${action.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-sm text-foreground-muted">{action.description}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-foreground-muted group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Recent Projects */}
        {recentProjects.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-accent-cyan" />
              <h2 className="text-xl font-semibold text-foreground">Recent Activity</h2>
            </div>

            <Card>
              <div className="divide-y divide-border">
                {recentProjects.map((project) => {
                  const Icon = getProjectIcon(project.type)
                  const color = getProjectColor(project.type)

                  return (
                    <div
                      key={project.id}
                      className="py-4 first:pt-0 last:pb-0 flex items-center gap-4 hover:bg-background-surface px-2 -mx-2 rounded-lg transition-colors"
                    >
                      <div className={`p-2 rounded-lg bg-background-elevated ${color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{project.title}</p>
                        <p className="text-sm text-foreground-muted">
                          {project.type.charAt(0).toUpperCase() + project.type.slice(1)} •{' '}
                          {formatTimestamp(project.timestamp)}
                        </p>
                      </div>
                      {project.status && (
                        <Badge variant="secondary" size="sm">
                          {project.status}
                        </Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          </div>
        )}

        {/* Getting Started (Empty State) */}
        {recentProjects.length === 0 && (
          <Card className="border-primary/30">
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-amber/10 mb-4">
                <Lightbulb className="w-8 h-8 text-accent-amber" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Get Started</h3>
              <p className="text-foreground-muted mb-6 max-w-md mx-auto">
                Start your research journey by exploring our AI-powered tools. Search academic papers,
                design experiments, or discover novel innovations.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button variant="primary" onClick={() => router.push('/search')}>
                  <Search className="w-4 h-4 mr-2" />
                  Start Searching
                </Button>
                <Button variant="secondary" onClick={() => router.push('/discovery')}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Discover Ideas
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Tips Section */}
        <Card className="border-accent-purple/30">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-accent-purple/10">
              <TrendingUp className="w-6 h-6 text-accent-purple" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-foreground mb-2">Pro Tips</h3>
              <ul className="space-y-2 text-sm text-foreground-muted">
                <li className="flex items-start gap-2">
                  <span className="text-accent-cyan shrink-0">•</span>
                  <span>
                    Use the Discovery Engine to find novel cross-domain innovations and automatically
                    generate experiments
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-cyan shrink-0">•</span>
                  <span>
                    Upload existing data files to TEA Reports for AI-powered parameter extraction and
                    analysis
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent-cyan shrink-0">•</span>
                  <span>
                    Start with Tier 1 simulations (free, fast) and upgrade to higher tiers for
                    production accuracy
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
