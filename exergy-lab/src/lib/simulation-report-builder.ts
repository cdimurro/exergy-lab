/**
 * Simulation Report Builder
 *
 * Converts SimulationResult and SimulationConfig into SimulationReportData
 * for PDF report generation.
 */

import type { SimulationResult, SimulationConfig, StructuredInsights, SimulationMetric } from '@/types/simulation'
import type { SimulationReportData, SimulationMetric as ReportMetric } from '@/types/simulation-report'
import type { ExperimentDomain } from '@/types/exergy-experiment'
import type { SimulationType } from '@/lib/simulation/types'
import { renderChartToBase64 } from './chart-renderer'

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
 * Domain patterns for intelligent extraction from simulation title/description
 */
const DOMAIN_PATTERNS: [RegExp, ExperimentDomain][] = [
  [/geothermal|binary.*cycle|orc\b|organic.*rankine/i, 'geothermal'],
  [/solar|photovoltaic|pv\b|sunlight/i, 'solar'],
  [/wind|turbine|offshore.*wind/i, 'wind'],
  [/battery|storage|lithium|energy.*storage/i, 'battery'],
  [/hydrogen|electroly|fuel.*cell|h2\b/i, 'hydrogen'],
  [/biomass|biofuel|biogas|organic.*waste/i, 'biomass'],
  [/carbon.*capture|ccs\b|ccus\b|co2.*removal/i, 'carbon-capture'],
  [/grid|transmission|distribution|power.*flow/i, 'grid-optimization'],
  [/material|catalyst|membrane|electrode/i, 'materials-science'],
]

/**
 * Extract domain from config with intelligent pattern matching
 * Falls back to 'energy-efficiency' instead of 'solar' for unknown domains
 */
function extractDomain(config: Partial<SimulationConfig>): ExperimentDomain {
  // 1. Check explicit domain field
  const explicitDomain = (config as Record<string, unknown>).domain as string | undefined
  if (explicitDomain) {
    const validDomains: ExperimentDomain[] = [
      'solar', 'wind', 'battery', 'hydrogen', 'geothermal',
      'biomass', 'carbon-capture', 'energy-efficiency',
      'grid-optimization', 'materials-science',
    ]
    if (validDomains.includes(explicitDomain as ExperimentDomain)) {
      return explicitDomain as ExperimentDomain
    }
  }

  // 2. Infer from title and description
  const title = (config.title || '').toLowerCase()
  const description = (config.description || '').toLowerCase()
  const combined = `${title} ${description}`

  for (const [pattern, domain] of DOMAIN_PATTERNS) {
    if (pattern.test(combined)) {
      return domain
    }
  }

  // 3. Default to energy-efficiency (neutral fallback instead of 'solar')
  return 'energy-efficiency'
}

/**
 * Calculate metric significance based on name patterns
 * Key performance metrics get 'high' significance for Key Findings
 */
function calculateSignificance(metricName: string): 'high' | 'medium' | 'low' {
  const name = metricName.toLowerCase()

  // High significance metrics (key performance indicators)
  const highPatterns = [
    /efficiency/,
    /power.*output/,
    /lcoe/,
    /capacity.*factor/,
    /cop\b/,           // Coefficient of performance
    /annual.*energy/,
    /thermal.*efficiency/,
    /exergy.*efficiency/,
  ]

  if (highPatterns.some(p => p.test(name))) {
    return 'high'
  }

  // Medium significance
  const mediumPatterns = [
    /temperature/,
    /pressure/,
    /flow.*rate/,
    /heat.*transfer/,
    /voltage/,
    /current/,
  ]

  if (mediumPatterns.some(p => p.test(name))) {
    return 'medium'
  }

  return 'low'
}

/**
 * Clean raw JSON from insights text
 */
function cleanInsightsText(insights?: string): string {
  if (!insights) return ''

  // Check if it's raw JSON
  const jsonMatch = insights.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0])
      return parsed.summary || ''
    } catch {
      // Not valid JSON, continue
    }
  }

  // Remove any JSON-like artifacts
  return insights.replace(/[{}\[\]"]/g, '').trim()
}

/**
 * Convert StructuredInsights to AIGeneratedInsights format
 * Falls back to generating basic insights from metrics if structured is unavailable
 */
function convertInsights(
  structured?: StructuredInsights,
  metrics?: SimulationMetric[]
) {
  // If structured insights exist, use them
  if (structured) {
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

  // Fallback: Generate basic insights from metrics
  if (metrics && metrics.length > 0) {
    const efficiencyMetrics = metrics.filter(m =>
      m.name.toLowerCase().includes('efficiency')
    )

    return {
      summary: `Simulation completed with ${metrics.length} metrics calculated.`,
      insights: efficiencyMetrics.map(m => ({
        category: 'observation' as const,
        title: 'Efficiency Result',
        description: `${m.name}: ${m.value.toFixed(2)}${m.unit}${m.uncertainty ? ` (uncertainty: ${m.uncertainty}%)` : ''}`,
        confidence: 85,
        priority: 'high' as const,
        actionable: false,
      })),
      nextSteps: [
        'Review simulation parameters for optimization opportunities',
        'Compare results against industry benchmarks',
      ],
    }
  }

  return undefined
}

/**
 * Build SimulationReportData from SimulationResult and config
 */
export function buildReportData(
  result: SimulationResult,
  config: Partial<SimulationConfig>
): SimulationReportData {
  // Use intelligent domain extraction instead of simple normalization
  const domain = extractDomain(config)
  const tier = config.tier || 'local'
  const provider = getTierProvider(tier)

  // Convert metrics to report format with dynamic significance
  const reportMetrics: ReportMetric[] = result.metrics.map((m) => ({
    name: m.name,
    value: m.value,
    unit: m.unit,
    significance: calculateSignificance(m.name),
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
      // Render chart to base64 SVG for PDF embedding
      imageBase64: renderChartToBase64(viz),
    })),

    // Pass metrics as fallback for AI insights generation
    aiInsights: convertInsights(result.structuredInsights, result.metrics),

    conclusions: {
      // Use cleaned insights text, falling back to structured summary or default
      summary: result.structuredInsights?.summary ||
               cleanInsightsText(result.insights) ||
               'Simulation completed successfully.',
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
