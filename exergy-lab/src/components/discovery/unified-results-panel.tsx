/**
 * UnifiedResultsPanel Component
 *
 * Displays comprehensive workflow results across all phases:
 * - Research (papers, patents, datasets)
 * - Experiments (protocols, failure analyses)
 * - Simulations (runs, optimizations)
 * - TEA (financial analysis)
 * - Cross-feature insights
 *
 * Features tabbed interface for easy navigation
 */

'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs } from '@/components/ui/tabs'
import { NextStepSelector } from './next-step-selector'
import { recommendationEngine } from '@/lib/discovery/recommendation-engine'
import type { WorkflowResults, NextStepType } from '@/types/workflow'

interface UnifiedResultsPanelProps {
  results: WorkflowResults
  onNextStepAction: (type: NextStepType, parameters?: Record<string, any>) => void
}

type TabType = 'overview' | 'research' | 'experiments' | 'simulations' | 'tea'

export function UnifiedResultsPanel({ results, onNextStepAction }: UnifiedResultsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  // Generate recommendations
  const suggestions = recommendationEngine.generateNextSteps(results)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Workflow Results</h2>
        <p className="text-muted-foreground">
          Comprehensive analysis across all workflow phases
        </p>
      </div>

      {/* Tabs */}
      <Card className="overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'research', label: 'Research', icon: '📚', count: results.research.totalSources },
            {
              id: 'experiments',
              label: 'Experiments',
              icon: '🧪',
              count: results.experiments.totalProtocols,
            },
            {
              id: 'simulations',
              label: 'Simulations',
              icon: '⚙️',
              count: results.simulations.totalRuns,
            },
            { id: 'tea', label: 'TEA', icon: '💰' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {tab.count}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && <OverviewTab results={results} />}
          {activeTab === 'research' && <ResearchTab results={results.research} />}
          {activeTab === 'experiments' && <ExperimentsTab results={results.experiments} />}
          {activeTab === 'simulations' && <SimulationsTab results={results.simulations} />}
          {activeTab === 'tea' && <TEATab results={results.tea} />}
        </div>
      </Card>

      {/* Next Steps */}
      <NextStepSelector
        suggestions={suggestions}
        results={results}
        onSelectAction={onNextStepAction}
      />
    </div>
  )
}

// ============================================================================
// Tab Components
// ============================================================================

function OverviewTab({ results }: { results: WorkflowResults }) {
  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon="📚"
          label="Research Sources"
          value={results.research.totalSources}
          sublabel={`${results.research.confidenceScore}% confidence`}
        />
        <StatCard
          icon="🧪"
          label="Experiment Protocols"
          value={results.experiments.totalProtocols}
          sublabel={`${results.experiments.recommendations.length} recommendations`}
        />
        <StatCard
          icon="⚙️"
          label="Simulation Runs"
          value={results.simulations.totalRuns}
          sublabel={`${results.simulations.averageAccuracy.toFixed(1)}% accuracy`}
        />
        <StatCard
          icon="💰"
          label="LCOE"
          value={`$${results.tea.lcoe.toFixed(3)}`}
          sublabel="/kWh"
        />
      </div>

      {/* Cross-Feature Insights */}
      {results.crossFeatureInsights.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Cross-Feature Insights</h3>
          <div className="space-y-3">
            {results.crossFeatureInsights.map((insight, idx) => (
              <Card
                key={idx}
                className="p-4 bg-gradient-to-r from-purple-500/5 to-pink-500/5 border-purple-500/20"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold">{insight.title}</h4>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {insight.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                    {insight.recommendation && (
                      <p className="text-sm text-purple-600 dark:text-purple-400">
                        → {insight.recommendation}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Key Findings */}
      {results.research.keyFindings.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Key Research Findings</h3>
          <ul className="space-y-2">
            {results.research.keyFindings.map((finding, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="text-primary shrink-0">•</span>
                <span>{finding}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function ResearchTab({ results }: { results: WorkflowResults['research'] }) {
  return (
    <div className="space-y-6">
      {/* Research Summary */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon="📄" label="Papers" value={results.papers.length} />
        <StatCard icon="📋" label="Patents" value={results.patents.length} />
        <StatCard icon="📊" label="Datasets" value={results.datasets.length} />
      </div>

      {/* Papers */}
      {results.papers.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Academic Papers</h3>
          <div className="space-y-2">
            {results.papers.slice(0, 10).map((paper, idx) => (
              <Card key={idx} className="p-3 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1">{paper.title}</h4>
                    <p className="text-xs text-muted-foreground">
                      {paper.authors?.slice(0, 3).join(', ')}
                      {(paper.authors?.length || 0) > 3 && ' et al.'}
                    </p>
                  </div>
                  {paper.url && (
                    <a
                      href={paper.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      View →
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ExperimentsTab({ results }: { results: WorkflowResults['experiments'] }) {
  return (
    <div className="space-y-6">
      {/* Protocols */}
      {results.protocols.map((protocol, idx) => (
        <Card key={idx} className="p-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">{protocol.title}</h3>
              <p className="text-sm text-muted-foreground">{protocol.objective}</p>
            </div>
            <Badge variant="secondary" className="capitalize">
              {protocol.difficulty}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Duration</p>
              <p className="text-sm font-medium">{protocol.duration}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Est. Cost</p>
              <p className="text-sm font-medium">${protocol.cost.toLocaleString()}</p>
            </div>
          </div>

          <details className="text-sm">
            <summary className="cursor-pointer font-medium mb-2">View Details</summary>
            <div className="space-y-3 mt-3">
              <div>
                <p className="font-medium mb-1">Materials ({protocol.materials.length})</p>
                <ul className="text-xs space-y-1">
                  {protocol.materials.slice(0, 5).map((mat, i) => (
                    <li key={i}>• {mat.name} - {mat.quantity}</li>
                  ))}
                </ul>
              </div>
              {protocol.safetyWarnings.length > 0 && (
                <div>
                  <p className="font-medium mb-1 text-red-600">⚠️ Safety Warnings</p>
                  <ul className="text-xs space-y-1">
                    {protocol.safetyWarnings.map((warning, i) => (
                      <li key={i}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </details>
        </Card>
      ))}
    </div>
  )
}

function SimulationsTab({ results }: { results: WorkflowResults['simulations'] }) {
  return (
    <div className="space-y-6">
      {/* Simulation Runs */}
      {results.runs.map((run, idx) => (
        <Card key={idx} className="p-4">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-lg font-semibold mb-1">{run.name}</h3>
              <Badge variant="secondary" className="text-xs capitalize">
                {run.tier} tier
              </Badge>
            </div>
            <Badge variant={run.status === 'completed' ? 'success' : 'secondary'}>
              {run.status}
            </Badge>
          </div>

          {run.metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {run.metrics.map((metric, i) => (
                <div key={i}>
                  <p className="text-xs text-muted-foreground mb-1">{metric.name}</p>
                  <p className="text-sm font-medium">
                    {metric.value.toFixed(2)} {metric.unit}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}

function TEATab({ results }: { results: WorkflowResults['tea'] }) {
  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard icon="⚡" label="LCOE" value={`$${results.lcoe.toFixed(3)}/kWh`} />
        <StatCard icon="💵" label="NPV" value={`$${(results.npv / 1000000).toFixed(2)}M`} />
        <StatCard icon="📈" label="IRR" value={`${results.irr.toFixed(1)}%`} />
        <StatCard icon="⏱️" label="Payback" value={`${results.paybackPeriod.toFixed(1)} years`} />
      </div>

      {/* Cost Breakdown */}
      {results.breakdown && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Cost Breakdown</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium mb-2">Capital Costs</p>
              {results.breakdown.capitalCosts.map((cost, i) => (
                <div key={i} className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{cost.category}</span>
                  <span className="font-medium">${cost.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Operating Costs (Annual)</p>
              {results.breakdown.operatingCosts.map((cost, i) => (
                <div key={i} className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{cost.category}</span>
                  <span className="font-medium">${cost.amount.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Helper Components
// ============================================================================

function StatCard({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: string
  label: string
  value: string | number
  sublabel?: string
}) {
  return (
    <div className="text-center p-4 rounded-lg bg-muted/50">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
      {sublabel && <div className="text-xs text-muted-foreground mt-0.5">{sublabel}</div>}
    </div>
  )
}
