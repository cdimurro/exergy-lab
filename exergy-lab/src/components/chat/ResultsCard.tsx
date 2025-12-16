'use client'

import * as React from 'react'
import {
  ChevronDown,
  ChevronUp,
  FileText,
  FlaskConical,
  Cpu,
  Calculator,
  Lightbulb,
  ExternalLink,
  Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Card, Badge } from '@/components/ui'
import type { ResultsCardProps } from '@/types/chat'
import type { WorkflowResults, Insight } from '@/types/workflow'
import type { Source } from '@/types/discovery'

interface SectionProps {
  title: string
  icon: React.ReactNode
  count?: number
  children: React.ReactNode
  defaultOpen?: boolean
}

function Section({ title, icon, count, children, defaultOpen = false }: SectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <div className="border-t border-border first:border-t-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 py-3 text-left hover:bg-background-elevated/50 transition-colors"
      >
        <span className="text-muted-foreground">{icon}</span>
        <span className="flex-1 font-medium text-sm">{title}</span>
        {count !== undefined && (
          <Badge variant="secondary" className="text-xs">
            {count}
          </Badge>
        )}
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && <div className="pb-3">{children}</div>}
    </div>
  )
}

interface SourceItemProps {
  source: Source
}

function SourceItem({ source }: SourceItemProps) {
  return (
    <div className="flex items-start gap-3 py-2 px-2 rounded hover:bg-background-elevated/50">
      <div className="flex-1 min-w-0">
        <h5 className="text-sm font-medium text-foreground line-clamp-2">
          {source.title}
        </h5>
        {source.authors && source.authors.length > 0 && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {source.authors.slice(0, 3).join(', ')}
            {source.authors.length > 3 && ` +${source.authors.length - 3} more`}
          </p>
        )}
        {source.publicationDate && (
          <p className="text-xs text-muted-foreground">
            {new Date(source.publicationDate).getFullYear()}
          </p>
        )}
      </div>
      {source.url && (
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  )
}

interface InsightItemProps {
  insight: Insight
}

function InsightItem({ insight }: InsightItemProps) {
  const priorityColors = {
    high: 'border-l-primary',
    medium: 'border-l-foreground/30',
    low: 'border-l-muted-foreground/30',
  }

  return (
    <div
      className={cn(
        'border-l-2 pl-3 py-2',
        priorityColors[insight.priority]
      )}
    >
      <h5 className="text-sm font-medium text-foreground">{insight.title}</h5>
      <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
      {insight.recommendation && (
        <p className="text-xs text-primary mt-1">
          Recommendation: {insight.recommendation}
        </p>
      )}
    </div>
  )
}

export function ResultsCard({
  results,
  pageType,
  isCollapsed: initialCollapsed = false,
  onToggleCollapse,
}: ResultsCardProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(initialCollapsed)

  const handleToggle = () => {
    setIsCollapsed(!isCollapsed)
    onToggleCollapse?.()
  }

  // Count totals
  const researchCount =
    (results.research?.papers?.length || 0) +
    (results.research?.patents?.length || 0) +
    (results.research?.datasets?.length || 0)

  const experimentCount = results.experiments?.protocols?.length || 0
  const simulationCount = results.simulations?.runs?.length || 0
  const hasInsights = results.crossFeatureInsights && results.crossFeatureInsights.length > 0

  // Summary stats based on page type
  const getSummaryStats = () => {
    const stats: { label: string; value: string }[] = []

    if (results.research?.totalSources) {
      stats.push({ label: 'Sources', value: String(results.research.totalSources) })
    }
    if (results.research?.confidenceScore) {
      stats.push({ label: 'Confidence', value: `${results.research.confidenceScore}%` })
    }
    if (results.simulations?.averageAccuracy) {
      stats.push({ label: 'Accuracy', value: `${results.simulations.averageAccuracy}%` })
    }
    if (results.tea?.lcoe) {
      stats.push({ label: 'LCOE', value: `$${results.tea.lcoe.toFixed(3)}/kWh` })
    }
    if (results.tea?.irr) {
      stats.push({ label: 'IRR', value: `${results.tea.irr.toFixed(1)}%` })
    }

    return stats.slice(0, 4)
  }

  const summaryStats = getSummaryStats()

  return (
    <Card className="border-border overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-background-elevated/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
            <Lightbulb className="h-3 w-3 text-primary" />
          </div>
          <span className="font-medium">Results</span>
          <Badge variant="default" className="text-xs">
            Complete
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          {/* Quick stats */}
          {!isCollapsed && summaryStats.length > 0 && (
            <div className="hidden sm:flex items-center gap-3 text-xs">
              {summaryStats.map((stat, idx) => (
                <div key={idx} className="text-muted-foreground">
                  <span>{stat.label}: </span>
                  <span className="font-medium text-foreground">{stat.value}</span>
                </div>
              ))}
            </div>
          )}
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-4 pb-4">
          {/* Key Findings */}
          {results.research?.keyFindings && results.research.keyFindings.length > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-background-elevated">
              <h4 className="text-sm font-medium mb-2">Key Findings</h4>
              <ul className="space-y-1.5">
                {results.research.keyFindings.slice(0, 5).map((finding, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-primary shrink-0">•</span>
                    {finding}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Research Results */}
          {researchCount > 0 && (
            <Section
              title="Research"
              icon={<FileText className="h-4 w-4" />}
              count={researchCount}
              defaultOpen={pageType === 'discovery' || pageType === 'search'}
            >
              <div className="space-y-4">
                {/* Papers */}
                {results.research?.papers && results.research.papers.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-2">
                      Papers ({results.research.papers.length})
                    </h5>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {results.research.papers.slice(0, 10).map((paper, idx) => (
                        <SourceItem key={idx} source={paper} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Patents */}
                {results.research?.patents && results.research.patents.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-2">
                      Patents ({results.research.patents.length})
                    </h5>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {results.research.patents.slice(0, 5).map((patent, idx) => (
                        <SourceItem key={idx} source={patent} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Datasets */}
                {results.research?.datasets && results.research.datasets.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-muted-foreground mb-2">
                      Datasets ({results.research.datasets.length})
                    </h5>
                    <div className="space-y-1">
                      {results.research.datasets.slice(0, 3).map((dataset, idx) => (
                        <SourceItem key={idx} source={dataset} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Experiment Results */}
          {experimentCount > 0 && (
            <Section
              title="Experiments"
              icon={<FlaskConical className="h-4 w-4" />}
              count={experimentCount}
              defaultOpen={pageType === 'experiments'}
            >
              <div className="space-y-2">
                {results.experiments?.protocols?.slice(0, 5).map((protocol) => (
                  <div
                    key={protocol.id}
                    className="p-2 rounded border border-border"
                  >
                    <h5 className="text-sm font-medium">{protocol.title}</h5>
                    <p className="text-xs text-muted-foreground mt-1">
                      {protocol.objective}
                    </p>
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      <span>Duration: {protocol.duration}</span>
                      <span>Difficulty: {protocol.difficulty}</span>
                      {protocol.cost > 0 && <span>Cost: ${protocol.cost}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Simulation Results */}
          {simulationCount > 0 && (
            <Section
              title="Simulations"
              icon={<Cpu className="h-4 w-4" />}
              count={simulationCount}
              defaultOpen={pageType === 'simulations'}
            >
              <div className="space-y-2">
                {results.simulations?.runs?.slice(0, 5).map((run) => (
                  <div
                    key={run.id}
                    className="p-2 rounded border border-border"
                  >
                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-medium">{run.name}</h5>
                      <Badge variant={run.status === 'completed' ? 'default' : 'secondary'}>
                        {run.status}
                      </Badge>
                    </div>
                    {run.metrics && run.metrics.length > 0 && (
                      <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                        {run.metrics.slice(0, 3).map((metric, idx) => (
                          <span key={idx}>
                            {metric.name}: {metric.value} {metric.unit}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* TEA Results */}
          {results.tea && (
            <Section
              title="TEA Analysis"
              icon={<Calculator className="h-4 w-4" />}
              defaultOpen={pageType === 'tea'}
            >
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2 rounded bg-background-elevated">
                  <p className="text-xs text-muted-foreground">LCOE</p>
                  <p className="text-lg font-semibold">
                    ${results.tea.lcoe.toFixed(3)}
                    <span className="text-xs font-normal text-muted-foreground">
                      /kWh
                    </span>
                  </p>
                </div>
                <div className="p-2 rounded bg-background-elevated">
                  <p className="text-xs text-muted-foreground">NPV</p>
                  <p className="text-lg font-semibold">
                    ${(results.tea.npv / 1000000).toFixed(2)}M
                  </p>
                </div>
                <div className="p-2 rounded bg-background-elevated">
                  <p className="text-xs text-muted-foreground">IRR</p>
                  <p className="text-lg font-semibold">
                    {results.tea.irr.toFixed(1)}%
                  </p>
                </div>
                <div className="p-2 rounded bg-background-elevated">
                  <p className="text-xs text-muted-foreground">Payback</p>
                  <p className="text-lg font-semibold">
                    {results.tea.paybackPeriod.toFixed(1)}
                    <span className="text-xs font-normal text-muted-foreground">
                      {' '}
                      years
                    </span>
                  </p>
                </div>
              </div>
            </Section>
          )}

          {/* Cross-Feature Insights */}
          {hasInsights && (
            <Section
              title="Insights"
              icon={<Lightbulb className="h-4 w-4" />}
              count={results.crossFeatureInsights!.length}
              defaultOpen
            >
              <div className="space-y-2">
                {results.crossFeatureInsights!.map((insight) => (
                  <InsightItem key={insight.id} insight={insight} />
                ))}
              </div>
            </Section>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-4 pt-4 border-t border-border">
            <Button variant="secondary" size="sm" className="flex-1">
              <Download className="h-3 w-3 mr-2" />
              Export Results
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
