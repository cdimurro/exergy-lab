'use client'

/**
 * Success Rate Tracker Component (v0.0.5)
 *
 * Displays hypothesis approval rates, agent performance metrics,
 * and prompt tuning recommendations based on expert feedback.
 *
 * @see lib/store/expert-feedback-store.ts - Data source
 * @see hooks/use-expert-review.ts - Integration hook
 */

import * as React from 'react'
import { Card, Badge, Button } from '@/components/ui'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  AlertCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import {
  useExpertFeedbackStore,
  type ExpertSuccessMetrics,
  type DomainMetrics,
  type AgentMetrics,
} from '@/lib/store/expert-feedback-store'

// ============================================================================
// Types
// ============================================================================

interface SuccessRateTrackerProps {
  className?: string
  showExportButton?: boolean
  showPromptTuning?: boolean
  collapsible?: boolean
  defaultCollapsed?: boolean
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}

function getPerformanceColor(rate: number): string {
  if (rate >= 0.7) return 'text-success'
  if (rate >= 0.5) return 'text-warning'
  return 'text-error'
}

function getPerformanceBadge(rate: number): 'success' | 'warning' | 'error' {
  if (rate >= 0.7) return 'success'
  if (rate >= 0.5) return 'warning'
  return 'error'
}

// ============================================================================
// Sub-Components
// ============================================================================

interface MetricCardProps {
  title: string
  value: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  subtitle?: string
}

function MetricCard({ title, value, icon, trend, subtitle }: MetricCardProps) {
  return (
    <div className="p-4 rounded-lg bg-background-surface border border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-foreground-muted">{title}</span>
        <div className="text-foreground-muted">{icon}</div>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-foreground">{value}</span>
        {trend && (
          <span className={trend === 'up' ? 'text-success' : trend === 'down' ? 'text-error' : 'text-foreground-muted'}>
            {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          </span>
        )}
      </div>
      {subtitle && <p className="text-xs text-foreground-muted mt-1">{subtitle}</p>}
    </div>
  )
}

interface DomainRowProps {
  domain: string
  metrics: DomainMetrics
}

function DomainRow({ domain, metrics }: DomainRowProps) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-b-0">
      <div className="flex items-center gap-2">
        <Badge variant={getPerformanceBadge(metrics.approvalRate)}>
          {domain}
        </Badge>
        <span className="text-sm text-foreground-muted">
          {metrics.reviews} reviews
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className={getPerformanceColor(metrics.approvalRate)}>
          {formatPercent(metrics.approvalRate)} approved
        </span>
        <span className="text-foreground-muted">
          {formatPercent(metrics.avgConfidence)} confidence
        </span>
      </div>
    </div>
  )
}

interface AgentRowProps {
  agent: string
  metrics: AgentMetrics
}

function AgentRow({ agent, metrics }: AgentRowProps) {
  return (
    <div className="p-3 rounded-lg bg-background hover:bg-background-surface transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{agent}</span>
          <Badge variant="secondary" size="sm">
            {metrics.reviews} reviews
          </Badge>
        </div>
        <span className={`text-sm font-medium ${getPerformanceColor(metrics.approvalRate)}`}>
          {formatPercent(metrics.approvalRate)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-background-surface rounded-full overflow-hidden mb-2">
        <div
          className={`h-full transition-all ${
            metrics.approvalRate >= 0.7
              ? 'bg-success'
              : metrics.approvalRate >= 0.5
              ? 'bg-warning'
              : 'bg-error'
          }`}
          style={{ width: `${metrics.approvalRate * 100}%` }}
        />
      </div>

      {/* Common issues */}
      {metrics.commonIssues.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-foreground-muted">
          <AlertCircle className="w-3 h-3" />
          <span>Issues: {metrics.commonIssues.slice(0, 2).join(', ')}</span>
        </div>
      )}
    </div>
  )
}

interface TopIssuesListProps {
  issues: ExpertSuccessMetrics['topIssues']
}

function TopIssuesList({ issues }: TopIssuesListProps) {
  if (issues.length === 0) {
    return (
      <div className="text-sm text-foreground-muted italic">
        No common issues identified yet.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {issues.slice(0, 5).map((issue, index) => (
        <div
          key={issue.issue}
          className="flex items-center justify-between p-2 rounded bg-background-surface"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground-muted">
              #{index + 1}
            </span>
            <span className="text-sm text-foreground">{issue.issue}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" size="sm">
              {issue.category}
            </Badge>
            <span className="text-sm text-foreground-muted">
              {issue.count}x
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function SuccessRateTracker({
  className = '',
  showExportButton = true,
  showPromptTuning = true,
  collapsible = false,
  defaultCollapsed = false,
}: SuccessRateTrackerProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed)
  const [selectedAgent, setSelectedAgent] = React.useState<string | null>(null)

  const store = useExpertFeedbackStore()
  const metrics = store.getSuccessMetrics()

  // Calculate trends (would need historical data in production)
  const approvalTrend = metrics.approvalRate >= 0.6 ? 'up' : 'down'
  const confidenceTrend = metrics.averageConfidence >= 0.7 ? 'up' : 'neutral'

  const handleExport = () => {
    const data = store.exportForPromptTuning()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expert-feedback-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCSV = () => {
    const csv = store.exportReviewsCSV()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expert-reviews-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // No data state
  if (metrics.totalReviews === 0) {
    return (
      <Card className={`p-6 bg-background-elevated border-border ${className}`}>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Success Rate Tracking
          </h3>
        </div>
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-full bg-background-surface flex items-center justify-center mx-auto mb-3">
            <Lightbulb className="w-6 h-6 text-foreground-muted" />
          </div>
          <p className="text-foreground-muted mb-2">
            No expert reviews yet
          </p>
          <p className="text-sm text-foreground-muted">
            Start reviewing hypotheses to track success rates and improve agent performance.
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card className={`bg-background-elevated border-border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">
              Success Rate Tracking
            </h3>
            <Badge variant="secondary">{metrics.totalReviews} reviews</Badge>
          </div>
          <div className="flex items-center gap-2">
            {showExportButton && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExportCSV}
                  className="flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  CSV
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleExport}
                  className="flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  JSON
                </Button>
              </>
            )}
            {collapsible && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 hover:bg-background-surface rounded transition-colors"
              >
                {isCollapsed ? (
                  <ChevronDown className="w-5 h-5 text-foreground-muted" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-foreground-muted" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-4 space-y-6">
          {/* Overview Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard
              title="Approval Rate"
              value={formatPercent(metrics.approvalRate)}
              icon={<CheckCircle2 className="w-5 h-5" />}
              trend={approvalTrend}
              subtitle={`${Math.round(metrics.approvalRate * metrics.totalReviews)} approved`}
            />
            <MetricCard
              title="Rejection Rate"
              value={formatPercent(metrics.rejectionRate)}
              icon={<XCircle className="w-5 h-5" />}
              subtitle={`${Math.round(metrics.rejectionRate * metrics.totalReviews)} rejected`}
            />
            <MetricCard
              title="Refinement Rate"
              value={formatPercent(metrics.refinementRate)}
              icon={<RefreshCw className="w-5 h-5" />}
              subtitle={`${Math.round(metrics.refinementRate * metrics.totalReviews)} need refinement`}
            />
            <MetricCard
              title="Avg Confidence"
              value={formatPercent(metrics.averageConfidence)}
              icon={<TrendingUp className="w-5 h-5" />}
              trend={confidenceTrend}
            />
          </div>

          {/* Performance by Domain */}
          {Object.keys(metrics.byDomain).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3">
                Performance by Domain
              </h4>
              <div className="space-y-1">
                {Object.entries(metrics.byDomain).map(([domain, domainMetrics]) => (
                  <DomainRow key={domain} domain={domain} metrics={domainMetrics} />
                ))}
              </div>
            </div>
          )}

          {/* Performance by Agent */}
          {Object.keys(metrics.byAgent).length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3">
                Agent Performance
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(metrics.byAgent).map(([agent, agentMetrics]) => (
                  <AgentRow key={agent} agent={agent} metrics={agentMetrics} />
                ))}
              </div>
            </div>
          )}

          {/* Top Issues */}
          {showPromptTuning && metrics.topIssues.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-foreground mb-3">
                Common Issues (for Prompt Tuning)
              </h4>
              <TopIssuesList issues={metrics.topIssues} />
            </div>
          )}

          {/* Lab Validation Rate */}
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground-muted">
                Lab Validation Rate
              </span>
              <LabValidationStats />
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

function LabValidationStats() {
  const store = useExpertFeedbackStore()
  const stats = store.getLabValidationRate()

  if (stats.total === 0) {
    return (
      <span className="text-sm text-foreground-muted">
        No lab validations yet
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant={getPerformanceBadge(stats.rate)}>
        {formatPercent(stats.rate)}
      </Badge>
      <span className="text-sm text-foreground-muted">
        ({stats.confirmed}/{stats.total} confirmed)
      </span>
    </div>
  )
}

// ============================================================================
// Compact Variant
// ============================================================================

export function SuccessRateCompact({ className = '' }: { className?: string }) {
  const store = useExpertFeedbackStore()
  const metrics = store.getSuccessMetrics()

  if (metrics.totalReviews === 0) {
    return null
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center gap-1">
        <CheckCircle2 className="w-4 h-4 text-success" />
        <span className="text-sm font-medium text-foreground">
          {formatPercent(metrics.approvalRate)}
        </span>
      </div>
      <span className="text-foreground-muted">|</span>
      <span className="text-sm text-foreground-muted">
        {metrics.totalReviews} reviews
      </span>
    </div>
  )
}

export default SuccessRateTracker
