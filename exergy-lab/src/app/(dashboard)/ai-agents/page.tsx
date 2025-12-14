'use client'

import * as React from 'react'
import { Card, Metric, Text, Flex, ProgressBar } from '@tremor/react'
import { Button, Badge } from '@/components/ui'
import {
  Bot,
  Play,
  Pause,
  Settings,
  Activity,
  Zap,
  Search,
  FileText,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'

// Sample AI agents
const AI_AGENTS = [
  {
    id: 1,
    name: 'Research Scanner',
    description: 'Monitors arXiv, journals, and preprints for relevant energy research.',
    status: 'active',
    tasksCompleted: 1247,
    lastRun: '5 min ago',
    accuracy: 94,
    icon: Search,
  },
  {
    id: 2,
    name: 'TEA Optimizer',
    description: 'Automatically suggests parameter improvements for TEA analyses.',
    status: 'active',
    tasksCompleted: 856,
    lastRun: '12 min ago',
    accuracy: 91,
    icon: TrendingUp,
  },
  {
    id: 3,
    name: 'Report Generator',
    description: 'Creates detailed PDF reports from analysis results.',
    status: 'idle',
    tasksCompleted: 423,
    lastRun: '2 hours ago',
    accuracy: 98,
    icon: FileText,
  },
  {
    id: 4,
    name: 'Data Validator',
    description: 'Checks imported datasets for anomalies and quality issues.',
    status: 'paused',
    tasksCompleted: 2891,
    lastRun: '1 day ago',
    accuracy: 99,
    icon: CheckCircle,
  },
]

const STATUS_STYLES = {
  active: { color: 'bg-success', label: 'Active', badge: 'success' as const },
  idle: { color: 'bg-accent-amber', label: 'Idle', badge: 'warning' as const },
  paused: { color: 'bg-foreground-subtle', label: 'Paused', badge: 'secondary' as const },
}

export default function AIAgentsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold text-foreground">AI Agents</h1>
            <Badge variant="primary" size="sm">
              Pro
            </Badge>
          </div>
          <p className="text-foreground-muted">
            Manage autonomous AI agents that assist with research, analysis, and
            automation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" leftIcon={<Settings className="w-4 h-4" />}>
            Configure
          </Button>
          <Button variant="primary" leftIcon={<Bot className="w-4 h-4" />}>
            Deploy Agent
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-background-elevated border-border">
          <Flex alignItems="center" justifyContent="between">
            <div>
              <Text className="text-foreground-muted">Active Agents</Text>
              <Metric className="text-foreground">
                {AI_AGENTS.filter((a) => a.status === 'active').length}
              </Metric>
            </div>
            <div className="p-3 rounded-lg bg-success/10">
              <Activity className="w-6 h-6 text-success" />
            </div>
          </Flex>
        </Card>
        <Card className="bg-background-elevated border-border">
          <Flex alignItems="center" justifyContent="between">
            <div>
              <Text className="text-foreground-muted">Tasks Today</Text>
              <Metric className="text-foreground">342</Metric>
            </div>
            <div className="p-3 rounded-lg bg-primary/10">
              <Zap className="w-6 h-6 text-primary" />
            </div>
          </Flex>
        </Card>
        <Card className="bg-background-elevated border-border">
          <Flex alignItems="center" justifyContent="between">
            <div>
              <Text className="text-foreground-muted">Avg Accuracy</Text>
              <Metric className="text-foreground">95.5%</Metric>
            </div>
            <div className="p-3 rounded-lg bg-accent-blue/10">
              <CheckCircle className="w-6 h-6 text-accent-blue" />
            </div>
          </Flex>
        </Card>
        <Card className="bg-background-elevated border-border">
          <Flex alignItems="center" justifyContent="between">
            <div>
              <Text className="text-foreground-muted">Total Tasks</Text>
              <Metric className="text-foreground">5.4K</Metric>
            </div>
            <div className="p-3 rounded-lg bg-accent-purple/10">
              <Bot className="w-6 h-6 text-accent-purple" />
            </div>
          </Flex>
        </Card>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {AI_AGENTS.map((agent) => {
          const Icon = agent.icon
          const statusStyle = STATUS_STYLES[agent.status]

          return (
            <Card
              key={agent.id}
              className="bg-background-elevated border-border hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{agent.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div
                        className={`w-2 h-2 rounded-full ${statusStyle.color} ${
                          agent.status === 'active' ? 'animate-pulse' : ''
                        }`}
                      />
                      <Badge variant={statusStyle.badge} size="sm">
                        {statusStyle.label}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {agent.status === 'active' ? (
                    <Button variant="ghost" size="sm">
                      <Pause className="w-4 h-4" />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm">
                      <Play className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <p className="text-sm text-foreground-muted mb-4">{agent.description}</p>

              <div className="space-y-3">
                <div>
                  <Flex>
                    <Text className="text-foreground-muted text-sm">Accuracy</Text>
                    <Text className="text-foreground text-sm">{agent.accuracy}%</Text>
                  </Flex>
                  <ProgressBar
                    value={agent.accuracy}
                    color="blue"
                    className="mt-1"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div className="flex items-center gap-1 text-xs text-foreground-subtle">
                    <CheckCircle className="w-3 h-3" />
                    {agent.tasksCompleted.toLocaleString()} tasks
                  </div>
                  <div className="flex items-center gap-1 text-xs text-foreground-subtle">
                    <Clock className="w-3 h-3" />
                    Last run: {agent.lastRun}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Activity Log */}
      <Card className="bg-background-elevated border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Recent Activity
        </h3>
        <div className="space-y-3">
          {[
            {
              agent: 'Research Scanner',
              action: 'Found 3 new papers on perovskite solar cells',
              time: '5 min ago',
              type: 'success',
            },
            {
              agent: 'TEA Optimizer',
              action: 'Suggested 12% LCOE improvement for Project Solar-AZ',
              time: '12 min ago',
              type: 'success',
            },
            {
              agent: 'Data Validator',
              action: 'Detected anomaly in wind capacity data',
              time: '45 min ago',
              type: 'warning',
            },
            {
              agent: 'Report Generator',
              action: 'Generated Q4 analysis report',
              time: '2 hours ago',
              type: 'success',
            },
          ].map((activity, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg bg-background-surface"
            >
              <div className="flex items-center gap-3">
                {activity.type === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-success" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-accent-amber" />
                )}
                <div>
                  <p className="text-sm text-foreground">
                    <span className="font-medium">{activity.agent}</span>
                    {' — '}
                    {activity.action}
                  </p>
                </div>
              </div>
              <span className="text-xs text-foreground-subtle">{activity.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
