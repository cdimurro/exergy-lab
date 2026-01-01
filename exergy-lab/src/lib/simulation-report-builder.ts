/**
 * Simulation Report Builder
 *
 * Converts SimulationResult and SimulationConfig into SimulationReportData
 * for PDF report generation.
 */

import type { SimulationResult, SimulationConfig, StructuredInsights } from '@/types/simulation'
import type { SimulationReportData, SimulationMetric as ReportMetric } from '@/types/simulation-report'
import type { ExperimentDomain } from '@/types/exergy-experiment'
import type { SimulationType } from '@/lib/simulation/types'

/**
 * Map simulation tier to provider name
 */
function getTierProvider(tier: string): string {
  switch (tier) {
    case 'cloud':
      return 'Modal A10G GPU'
    case 'browser':
      return 'Modal T4 GPU'
    case 'local':
    default:
      return 'Analytical (Local)'
  }
}

/**
 * Normalize domain to valid ExperimentDomain
 */
function normalizeDomain(domain?: string): ExperimentDomain {
  const validDomains: ExperimentDomain[] = [
    'solar',
    'wind',
    'battery',
    'hydrogen',
    'geothermal',
    'biomass',
    'carbon-capture',
    'energy-efficiency',
    'grid-optimization',
    'materials-science',
  ]

  if (domain && validDomains.includes(domain as ExperimentDomain)) {
    return domain as ExperimentDomain
  }

  // Try to match partial domain names (e.g., 'solar-energy' -> 'solar')
  if (domain) {
    const partial = domain.split('-')[0]
    if (validDomains.includes(partial as ExperimentDomain)) {
      return partial as ExperimentDomain
    }
  }

  return 'solar' // Default fallback
}

/**
 * Convert StructuredInsights to AIGeneratedInsights format
 */
function convertInsights(structured?: StructuredInsights) {
  if (!structured) return undefined

  return {
    summary: structured.summary || '',
    insights: [
      ...structured.observations.map((obs, i) => ({
        category: 'observation' as const,
        title: `Observation ${i + 1}`,
        description: obs,
        confidence: 80,
        priority: 'medium' as const,
        actionable: false,
      })),
      ...structured.recommendations.map((rec, i) => ({
        category: 'recommendation' as const,
        title: `Recommendation ${i + 1}`,
        description: rec,
        confidence: 75,
        priority: 'high' as const,
        actionable: true,
      })),
      ...structured.warnings.map((warn, i) => ({
        category: 'warning' as const,
        title: `Warning ${i + 1}`,
        description: warn,
        confidence: 85,
        priority: 'high' as const,
        actionable: true,
      })),
    ],
    nextSteps: structured.nextSteps || [],
  }
}

/**
 * Build SimulationReportData from SimulationResult and config
 */
export function buildReportData(
  result: SimulationResult,
  config: Partial<SimulationConfig>
): SimulationReportData {
  const domain = normalizeDomain(
    (config as Record<string, unknown>).domain as string | undefined
  )
  const tier = config.tier || 'local'
  const provider = getTierProvider(tier)

  // Convert metrics to report format with significance
  const reportMetrics: ReportMetric[] = result.metrics.map((m) => ({
    name: m.name,
    value: m.value,
    unit: m.unit,
    significance: 'medium' as const,
    uncertainty: m.uncertainty,
  }))

  // Convert parameters to report format
  const parameters = (config.parameters || []).map((p) => ({
    name: p.name,
    value: typeof p.value === 'number' ? p.value : parseFloat(String(p.value)) || 0,
    unit: p.unit,
    description: p.description,
  }))

  return {
    metadata: {
      id: result.id || `sim_${Date.now()}`,
      title: config.title || 'Simulation Report',
      domain,
      createdAt: new Date().toISOString(),
      version: '1.0.0',
    },

    overview: {
      title: config.title || 'Simulation Report',
      description: config.description || 'Simulation results and analysis',
      domain,
      goals: [],
    },

    methodology: {
      simulationType: 'thermodynamic' as SimulationType,
      tier: tier as 'tier1' | 'tier2' | 'tier3',
      provider,
      description: config.description || '',
      parameters,
      boundaryConditions: [],
      assumptions: [
        'Standard operating conditions assumed',
        'Ideal material properties',
        'Steady-state operation',
      ],
    },

    results: {
      metrics: reportMetrics,
      outputs: [],
    },

    visualizations: (result.visualizations || []).map((viz, i) => ({
      id: `viz_${i}`,
      title: viz.title,
      type: viz.type as 'line' | 'bar' | 'scatter' | 'heatmap' | 'contour',
      data: {
        labels: viz.data.map((d) => String(d.timestamp)),
        datasets: Object.keys(viz.data[0]?.values || {}).map((key) => ({
          name: key,
          values: viz.data.map((d) => d.values[key] || 0),
        })),
      },
      xAxis: { label: viz.xAxis },
      yAxis: { label: viz.yAxis },
    })),

    aiInsights: convertInsights(result.structuredInsights),

    conclusions: {
      summary: result.insights || 'Simulation completed successfully.',
      keyFindings: result.structuredInsights?.observations || [],
      achievements: [],
      limitations: [],
      futureWork: result.structuredInsights?.nextSteps || [],
    },

    recommendations: {
      designChanges: [],
      operationalOptimizations: result.structuredInsights?.recommendations || [],
      furtherExperiments: [],
      researchDirections: [],
    },

    references: [],

    executionMetadata: {
      executedAt: new Date().toISOString(),
      duration: (result.config?.duration || 0) / 1000,
      cost: result.cost,
      provider,
      tier: tier as 'tier1' | 'tier2' | 'tier3',
      warnings: result.structuredInsights?.warnings,
    },
  }
}
