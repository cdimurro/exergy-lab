'use client'

import * as React from 'react'
import {
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  Users,
  Zap,
} from 'lucide-react'
import { Card, Button, Input, Badge, Skeleton } from '@/components/ui'
import type { ActivityLog, LogFilters, LogStats } from '@/types/activity-log'

export default function AdminLogsPage() {
  const [logs, setLogs] = React.useState<ActivityLog[]>([])
  const [stats, setStats] = React.useState<LogStats | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedLog, setSelectedLog] = React.useState<ActivityLog | null>(null)
  const [filters, setFilters] = React.useState<LogFilters>({})
  const [searchTerm, setSearchTerm] = React.useState('')

  // Load logs on mount and when filters change
  React.useEffect(() => {
    loadLogs()
    loadStats()
  }, [filters])

  const loadLogs = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      if (filters.page) params.append('page', filters.page)
      if (filters.type) params.append('type', filters.type)
      if (filters.sessionId) params.append('sessionId', filters.sessionId)
      if (filters.success !== undefined) params.append('success', String(filters.success))
      if (searchTerm) params.append('searchTerm', searchTerm)

      const response = await fetch(`/api/logs?${params}`)
      const data = await response.json()
      setLogs(data.logs || [])
    } catch (error) {
      console.error('Failed to load logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/logs/stats')
      const data = await response.json()
      setStats(data.stats)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleRefresh = () => {
    loadLogs()
    loadStats()
  }

  const handleExport = () => {
    const dataStr = JSON.stringify(logs, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `activity-logs-${new Date().toISOString()}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  const getActivityTypeColor = (type: string) => {
    switch (type) {
      case 'search_query':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'discovery_prompt':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20'
      case 'experiment_design':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'simulation_run':
        return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20'
      case 'tea_calculation':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
      case 'ai_agent_request':
        return 'bg-primary/10 text-primary border-primary/20'
      case 'error':
        return 'bg-error/10 text-error border-error/20'
      default:
        return 'bg-foreground-subtle/10 text-foreground-subtle border-foreground-subtle/20'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Activity Logs</h1>
        <p className="text-foreground-muted">
          Monitor all user interactions, field entries, and AI agent validations
        </p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-foreground-muted">Total Logs</span>
              <Activity className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.totalLogs.toLocaleString()}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-foreground-muted">Unique Sessions</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.uniqueSessions}</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-foreground-muted">Success Rate</span>
              <CheckCircle className="w-4 h-4 text-success" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.successRate.toFixed(1)}%</p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-foreground-muted">AI Requests</span>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats.aiAgentUsage.totalRequests}
            </p>
            <p className="text-xs text-foreground-muted mt-1">
              {stats.aiAgentUsage.totalTokens.toLocaleString()} tokens used
            </p>
          </Card>
        </div>
      )}

      {/* Filters & Actions */}
      <Card className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
              <Input
                placeholder="Search in prompts, inputs, outputs..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filter by Page */}
          <select
            className="px-4 py-2 rounded-lg border border-input-border bg-input-background text-foreground"
            value={filters.page || ''}
            onChange={(e) => setFilters({ ...filters, page: e.target.value || undefined })}
          >
            <option value="">All Pages</option>
            <option value="search">Search</option>
            <option value="discovery">Discovery</option>
            <option value="experiments">Experiments</option>
            <option value="simulations">Simulations</option>
            <option value="tea-generator">TEA Generator</option>
          </select>

          {/* Filter by Type */}
          <select
            className="px-4 py-2 rounded-lg border border-input-border bg-input-background text-foreground"
            value={filters.type || ''}
            onChange={(e) => setFilters({ ...filters, type: e.target.value as any || undefined })}
          >
            <option value="">All Types</option>
            <option value="search_query">Search Query</option>
            <option value="discovery_prompt">Discovery Prompt</option>
            <option value="experiment_design">Experiment Design</option>
            <option value="simulation_run">Simulation Run</option>
            <option value="tea_calculation">TEA Calculation</option>
            <option value="ai_agent_request">AI Agent</option>
            <option value="field_input">Field Input</option>
            <option value="error">Errors</option>
          </select>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </Card>

      {/* Logs Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background-surface border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted">
                  Time
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted">
                  Type
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted">
                  Page
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted">
                  Action
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted">
                  Status
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted">
                  Duration
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-foreground-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-4 py-3">
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-foreground-muted">
                    No logs found
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="hover:bg-background-hover transition-colors cursor-pointer"
                    onClick={() => setSelectedLog(log)}
                  >
                    <td className="px-4 py-3 text-sm text-foreground-muted">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getActivityTypeColor(log.type)}`}
                      >
                        {log.type.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{log.page}</td>
                    <td className="px-4 py-3 text-sm text-foreground-muted truncate max-w-xs">
                      {log.action}
                    </td>
                    <td className="px-4 py-3">
                      {log.success ? (
                        <CheckCircle className="w-4 h-4 text-success" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-error" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground-muted">
                      {log.duration ? `${log.duration}ms` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Detail Modal */}
      {selectedLog && (
        <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  )
}

/**
 * Log Detail Modal - Shows full AI agent chain
 */
function LogDetailModal({ log, onClose }: { log: ActivityLog; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-background-elevated border border-border rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Activity Log Details</h2>
            <p className="text-sm text-foreground-muted mt-1">
              {new Date(log.timestamp).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-background-hover rounded-lg transition-colors"
          >
            <span className="text-foreground-muted text-xl">×</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Metadata */}
          <Section title="Metadata">
            <div className="grid grid-cols-2 gap-4">
              <InfoItem label="Session ID" value={log.sessionId} />
              <InfoItem label="User ID" value={log.userId || 'Anonymous'} />
              <InfoItem label="Page" value={log.page} />
              <InfoItem label="Action" value={log.action} />
              <InfoItem label="Type" value={log.type} />
              <InfoItem
                label="Status"
                value={log.success ? 'Success' : 'Failed'}
                valueColor={log.success ? 'text-success' : 'text-error'}
              />
              {log.duration && <InfoItem label="Duration" value={`${log.duration}ms`} />}
              {log.aiTokensUsed && <InfoItem label="AI Tokens" value={String(log.aiTokensUsed)} />}
            </div>
          </Section>

          {/* User Inputs */}
          {log.inputs && Object.keys(log.inputs).length > 0 && (
            <Section title="User Inputs" icon="📝">
              <CodeBlock data={log.inputs} />
            </Section>
          )}

          {/* AI Agent Chain */}
          {log.aiPrompt && (
            <Section title="AI Agent Prompt" icon="🤖">
              <div className="bg-background-surface rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-foreground-muted">
                    Model: {log.aiModel || 'Unknown'}
                  </span>
                  {log.aiResponseTime && (
                    <span className="text-xs text-foreground-subtle">
                      Response time: {log.aiResponseTime}ms
                    </span>
                  )}
                </div>
                <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">
                  {log.aiPrompt}
                </pre>
              </div>
            </Section>
          )}

          {log.aiResponse && (
            <Section title="AI Agent Response" icon="✨">
              <div className="bg-primary/5 rounded-lg p-4 border border-primary/20">
                <pre className="text-sm text-foreground whitespace-pre-wrap font-mono">
                  {log.aiResponse}
                </pre>
              </div>
            </Section>
          )}

          {/* Outputs */}
          {log.outputs && Object.keys(log.outputs).length > 0 && (
            <Section title="Final Outputs" icon="📊">
              <CodeBlock data={log.outputs} />
            </Section>
          )}

          {/* Error Details */}
          {log.error && (
            <Section title="Error Details" icon="❌">
              <div className="bg-error/5 rounded-lg p-4 border border-error/20">
                <p className="text-sm font-medium text-error mb-2">{log.error.message}</p>
                {log.error.stack && (
                  <pre className="text-xs text-foreground-muted whitespace-pre-wrap font-mono mt-2">
                    {log.error.stack}
                  </pre>
                )}
              </div>
            </Section>
          )}

          {/* Metadata */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <Section title="Additional Metadata">
              <CodeBlock data={log.metadata} />
            </Section>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        {icon && <span>{icon}</span>}
        {title}
      </h3>
      {children}
    </div>
  )
}

function InfoItem({
  label,
  value,
  valueColor,
}: {
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <div>
      <p className="text-xs text-foreground-muted mb-1">{label}</p>
      <p className={`text-sm font-medium ${valueColor || 'text-foreground'}`}>{value}</p>
    </div>
  )
}

function CodeBlock({ data }: { data: any }) {
  return (
    <div className="bg-background-surface rounded-lg p-4 border border-border overflow-x-auto">
      <pre className="text-xs text-foreground whitespace-pre-wrap font-mono">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}
