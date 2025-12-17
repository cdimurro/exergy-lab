/**
 * UnifiedResultsPanel Component
 *
 * Displays comprehensive workflow results across all 7 phases:
 * - Research (papers, patents, datasets)
 * - Hypotheses (generated hypotheses with scores)
 * - Experiments (protocols, failure analyses)
 * - Simulations (runs, optimizations)
 * - TEA (financial analysis)
 * - Validation (literature comparison, checks)
 * - Quality Gates (quality scores, pass/fail)
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
import type { WorkflowResults, NextStepType, HypothesisResults, ValidationResults, QualityGatesResults } from '@/types/workflow'

interface UnifiedResultsPanelProps {
  results: WorkflowResults
  onNextStepAction: (type: NextStepType, parameters?: Record<string, any>) => void
}

type TabType = 'overview' | 'research' | 'hypotheses' | 'experiments' | 'simulations' | 'tea' | 'validation' | 'quality'

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
            { id: 'research', label: 'Research', icon: '📚', count: results.research?.totalSources },
            {
              id: 'hypotheses',
              label: 'Hypotheses',
              icon: '💡',
              count: results.hypotheses?.totalHypotheses,
            },
            {
              id: 'experiments',
              label: 'Experiments',
              icon: '🧪',
              count: results.experiments?.totalProtocols,
            },
            {
              id: 'simulations',
              label: 'Simulations',
              icon: '⚙️',
              count: results.simulations?.totalRuns,
            },
            { id: 'tea', label: 'TEA', icon: '💰' },
            {
              id: 'validation',
              label: 'Validation',
              icon: '✅',
              count: results.validation?.validationChecks?.length,
            },
            {
              id: 'quality',
              label: 'Quality',
              icon: '🛡️',
              passed: results.qualityGates?.passed,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
              {'passed' in tab && tab.passed !== undefined && (
                <Badge variant={tab.passed ? 'success' : 'error'} className="text-xs">
                  {tab.passed ? '✓' : '✗'}
                </Badge>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'overview' && <OverviewTab results={results} />}
          {activeTab === 'research' && <ResearchTab results={results.research} />}
          {activeTab === 'hypotheses' && <HypothesesTab results={results.hypotheses} />}
          {activeTab === 'experiments' && <ExperimentsTab results={results.experiments} />}
          {activeTab === 'simulations' && <SimulationsTab results={results.simulations} />}
          {activeTab === 'tea' && <TEATab results={results.tea} />}
          {activeTab === 'validation' && <ValidationTab results={results.validation} />}
          {activeTab === 'quality' && <QualityGatesTab results={results.qualityGates} />}
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
            {results.crossFeatureInsights.map((insight, idx) => {
              // Handle both string and Insight object types
              if (typeof insight === 'string') {
                return (
                  <Card key={idx} className="p-4 border-border">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">💡</span>
                      <p className="text-sm text-foreground">{insight}</p>
                    </div>
                  </Card>
                )
              }
              return (
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
              )
            })}
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

function HypothesesTab({ results }: { results: HypothesisResults | undefined }) {
  if (!results || !results.hypotheses || results.hypotheses.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No hypotheses generated yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard icon="💡" label="Total Hypotheses" value={results.totalHypotheses} />
        <StatCard icon="⭐" label="Top Ranked" value={results.topRanked?.length || 0} />
      </div>

      {/* Hypotheses List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Generated Hypotheses</h3>
        {results.hypotheses.map((hypothesis, idx) => (
          <Card key={idx} className="p-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <h4 className="font-semibold mb-1">{hypothesis.title}</h4>
                <p className="text-sm text-muted-foreground">{hypothesis.statement}</p>
              </div>
              <Badge
                variant={
                  hypothesis.status === 'supported'
                    ? 'success'
                    : hypothesis.status === 'refuted'
                    ? 'error'
                    : 'secondary'
                }
                className="capitalize"
              >
                {hypothesis.status}
              </Badge>
            </div>

            {/* Scores */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="text-center p-2 bg-muted/50 rounded">
                <p className="text-xs text-muted-foreground">Novelty</p>
                <p className="font-bold">{hypothesis.noveltyScore}%</p>
              </div>
              <div className="text-center p-2 bg-muted/50 rounded">
                <p className="text-xs text-muted-foreground">Feasibility</p>
                <p className="font-bold">{hypothesis.feasibilityScore}%</p>
              </div>
              <div className="text-center p-2 bg-muted/50 rounded">
                <p className="text-xs text-muted-foreground">Impact</p>
                <p className="font-bold">{hypothesis.impactScore}%</p>
              </div>
              <div className="text-center p-2 bg-primary/10 rounded">
                <p className="text-xs text-muted-foreground">Overall</p>
                <p className="font-bold text-primary">{hypothesis.overallScore}%</p>
              </div>
            </div>

            {/* Supporting Evidence */}
            {hypothesis.supportingEvidence && hypothesis.supportingEvidence.length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer font-medium">Supporting Evidence</summary>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  {hypothesis.supportingEvidence.map((evidence, i) => (
                    <li key={i}>• {evidence}</li>
                  ))}
                </ul>
              </details>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}

function ValidationTab({ results }: { results: ValidationResults | undefined }) {
  if (!results) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No validation results yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card className={`p-6 ${results.passed ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
        <div className="flex items-center gap-4">
          <span className="text-4xl">{results.passed ? '✅' : '❌'}</span>
          <div>
            <h3 className="text-xl font-bold">{results.passed ? 'Validation Passed' : 'Validation Failed'}</h3>
            <p className="text-muted-foreground">Overall Score: {results.overallScore}/100</p>
          </div>
        </div>
      </Card>

      {/* Validation Checks */}
      {results.validationChecks && results.validationChecks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Validation Checks</h3>
          <div className="space-y-2">
            {results.validationChecks.map((check, idx) => (
              <Card key={idx} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">
                    {check.result === 'pass' ? '✅' : check.result === 'warning' ? '⚠️' : '❌'}
                  </span>
                  <div>
                    <p className="font-medium">{check.name}</p>
                    <p className="text-xs text-muted-foreground">{check.description}</p>
                  </div>
                </div>
                <Badge
                  variant={check.result === 'pass' ? 'success' : check.result === 'warning' ? 'secondary' : 'error'}
                >
                  {check.score}/100
                </Badge>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Literature Comparisons */}
      {results.literatureComparisons && results.literatureComparisons.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Literature Comparison</h3>
          <div className="space-y-2">
            {results.literatureComparisons.map((comp, idx) => (
              <Card key={idx} className="p-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{comp.metric}</span>
                  <div className="flex items-center gap-4 text-sm">
                    <span>Ours: {comp.ourValue}</span>
                    <span>Literature: {comp.literatureValue}</span>
                    <Badge variant={comp.acceptable ? 'success' : 'error'}>
                      {comp.deviation > 0 ? '+' : ''}{comp.deviation.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Issues */}
      {results.issues && results.issues.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Issues Found</h3>
          <div className="space-y-2">
            {results.issues.map((issue, idx) => (
              <Card key={idx} className={`p-3 border-l-4 ${
                issue.severity === 'critical' ? 'border-l-red-500' :
                issue.severity === 'major' ? 'border-l-orange-500' : 'border-l-yellow-500'
              }`}>
                <div className="flex items-start gap-2">
                  <Badge variant={issue.severity === 'critical' ? 'error' : 'secondary'} className="capitalize">
                    {issue.severity}
                  </Badge>
                  <div>
                    <p className="font-medium">{issue.description}</p>
                    <p className="text-sm text-muted-foreground">→ {issue.recommendation}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function QualityGatesTab({ results }: { results: QualityGatesResults | undefined }) {
  if (!results) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No quality gate results yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <Card className={`p-6 ${results.passed ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
        <div className="flex items-center gap-4">
          <span className="text-4xl">{results.passed ? '🛡️' : '🚫'}</span>
          <div>
            <h3 className="text-xl font-bold">{results.passed ? 'Quality Gates Passed' : 'Quality Gates Failed'}</h3>
            <p className="text-muted-foreground">Overall Score: {results.overallScore}/100</p>
            {results.summary && <p className="text-sm mt-1">{results.summary}</p>}
          </div>
        </div>
      </Card>

      {/* Individual Gates */}
      {results.gates && results.gates.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Quality Checks</h3>
          <div className="space-y-3">
            {results.gates.map((gate, idx) => (
              <Card key={idx} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{gate.passed ? '✅' : '❌'}</span>
                    <h4 className="font-semibold">{gate.name}</h4>
                  </div>
                  <Badge variant={gate.passed ? 'success' : 'error'}>
                    {gate.score}/{gate.threshold}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{gate.description}</p>
                {gate.details && (
                  <p className="text-xs bg-muted/50 p-2 rounded">{gate.details}</p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {results.recommendations && results.recommendations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Recommendations</h3>
          <ul className="space-y-2">
            {results.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm">
                <span className="text-primary">→</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
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
