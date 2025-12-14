'use client'

import * as React from 'react'
import { Card, Metric, Text, Flex, BadgeDelta } from '@tremor/react'
import { Button, Badge } from '@/components/ui'
import {
  FolderOpen,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Sun,
  Wind,
  Battery,
  Atom,
  TrendingUp,
  Clock,
  Users,
  Star,
} from 'lucide-react'

// Sample projects data
const PROJECTS = [
  {
    id: 1,
    name: 'Solar Farm Analysis - Arizona',
    technology: 'Solar',
    icon: Sun,
    status: 'active',
    lastUpdated: '2 hours ago',
    team: 3,
    starred: true,
    metrics: { lcoe: 32.5, npv: 12.4, irr: 18.2 },
  },
  {
    id: 2,
    name: 'Offshore Wind - North Sea',
    technology: 'Wind',
    icon: Wind,
    status: 'active',
    lastUpdated: '1 day ago',
    team: 5,
    starred: false,
    metrics: { lcoe: 58.3, npv: 45.2, irr: 14.1 },
  },
  {
    id: 3,
    name: 'Grid Storage - California',
    technology: 'Storage',
    icon: Battery,
    status: 'draft',
    lastUpdated: '3 days ago',
    team: 2,
    starred: true,
    metrics: { lcoe: 125.0, npv: 8.7, irr: 11.5 },
  },
  {
    id: 4,
    name: 'Hydrogen Hub - Netherlands',
    technology: 'Hydrogen',
    icon: Atom,
    status: 'completed',
    lastUpdated: '1 week ago',
    team: 4,
    starred: false,
    metrics: { lcoe: 85.0, npv: 22.1, irr: 16.8 },
  },
]

const STATUS_COLORS = {
  active: 'success',
  draft: 'warning',
  completed: 'secondary',
} as const

export default function SolutionsPage() {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [filter, setFilter] = React.useState<'all' | 'starred'>('all')

  const filteredProjects =
    filter === 'starred' ? PROJECTS.filter((p) => p.starred) : PROJECTS

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Solutions</h1>
          <p className="text-foreground-muted mt-1">
            Manage your energy analysis projects and saved solutions.
          </p>
        </div>
        <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />}>
          New Project
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-background-elevated border-border">
          <Flex alignItems="center" justifyContent="between">
            <div>
              <Text className="text-foreground-muted">Total Projects</Text>
              <Metric className="text-foreground">{PROJECTS.length}</Metric>
            </div>
            <div className="p-3 rounded-lg bg-primary/10">
              <FolderOpen className="w-6 h-6 text-primary" />
            </div>
          </Flex>
        </Card>
        <Card className="bg-background-elevated border-border">
          <Flex alignItems="center" justifyContent="between">
            <div>
              <Text className="text-foreground-muted">Active</Text>
              <Metric className="text-foreground">
                {PROJECTS.filter((p) => p.status === 'active').length}
              </Metric>
            </div>
            <div className="p-3 rounded-lg bg-success/10">
              <TrendingUp className="w-6 h-6 text-success" />
            </div>
          </Flex>
        </Card>
        <Card className="bg-background-elevated border-border">
          <Flex alignItems="center" justifyContent="between">
            <div>
              <Text className="text-foreground-muted">Avg. LCOE</Text>
              <Metric className="text-foreground">$75.2/MWh</Metric>
            </div>
            <BadgeDelta deltaType="decrease">-8.3%</BadgeDelta>
          </Flex>
        </Card>
        <Card className="bg-background-elevated border-border">
          <Flex alignItems="center" justifyContent="between">
            <div>
              <Text className="text-foreground-muted">Total NPV</Text>
              <Metric className="text-foreground">$88.4M</Metric>
            </div>
            <BadgeDelta deltaType="increase">+12.1%</BadgeDelta>
          </Flex>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card className="bg-background-elevated border-border">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1 relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-background-surface border border-border rounded-lg text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={filter === 'all' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'starred' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter('starred')}
              leftIcon={<Star className="w-4 h-4" />}
            >
              Starred
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<Filter className="w-4 h-4" />}>
              Filter
            </Button>
          </div>
        </div>
      </Card>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredProjects.map((project) => {
          const Icon = project.icon
          return (
            <Card
              key={project.id}
              className="bg-background-elevated border-border hover:border-primary/50 transition-colors cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-background-surface">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>
                    <p className="text-xs text-foreground-subtle">
                      {project.technology}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {project.starred && (
                    <Star className="w-4 h-4 text-accent-amber fill-accent-amber" />
                  )}
                  <button className="p-1 rounded hover:bg-background-surface text-foreground-subtle">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-xs text-foreground-subtle">LCOE</p>
                  <p className="text-sm font-medium text-foreground">
                    ${project.metrics.lcoe}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-foreground-subtle">NPV</p>
                  <p className="text-sm font-medium text-foreground">
                    ${project.metrics.npv}M
                  </p>
                </div>
                <div>
                  <p className="text-xs text-foreground-subtle">IRR</p>
                  <p className="text-sm font-medium text-foreground">
                    {project.metrics.irr}%
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-3">
                  <Badge variant={STATUS_COLORS[project.status]} size="sm">
                    {project.status}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-foreground-subtle">
                    <Users className="w-3 h-3" />
                    {project.team}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-foreground-subtle">
                  <Clock className="w-3 h-3" />
                  {project.lastUpdated}
                </div>
              </div>
            </Card>
          )
        })}

        {/* New Project Card */}
        <Card className="bg-background-surface border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <div className="p-3 rounded-full bg-background-elevated mx-auto mb-3">
              <Plus className="w-6 h-6 text-foreground-muted" />
            </div>
            <p className="text-sm font-medium text-foreground-muted">
              Create New Project
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
