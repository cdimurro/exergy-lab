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
  if (config.domain) {
    const validDomains: ExperimentDomain[] = [
      'solar', 'wind', 'battery', 'hydrogen', 'geothermal',
      'biomass', 'carbon-capture', 'energy-efficiency',
      'grid-optimization', 'materials-science',
    ]
    if (validDomains.includes(config.domain as ExperimentDomain)) {
      return config.domain as ExperimentDomain
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
 * Extract goals/objectives from a natural language simulation description
 * Looks for action verbs like "analyze", "calculate", "determine", etc.
 */
export function extractGoalsFromDescription(description: string): string[] {
  if (!description || description.trim().length === 0) {
    return ['Perform thermodynamic simulation and analysis']
  }

  const goals: string[] = []

  // Split into sentences
  const sentences = description
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)

  // Look for goal-indicating verbs
  const goalVerbs = [
    'analyze', 'calculate', 'determine', 'assess', 'evaluate',
    'model', 'simulate', 'compare', 'investigate', 'study',
    'measure', 'predict', 'optimize', 'design', 'validate'
  ]

  for (const sentence of sentences) {
    const lowerSentence = sentence.toLowerCase()
    const hasGoalVerb = goalVerbs.some(verb =>
      lowerSentence.includes(verb) ||
      lowerSentence.startsWith(verb)
    )

    if (hasGoalVerb) {
      // Capitalize first letter
      const goal = sentence.charAt(0).toUpperCase() + sentence.slice(1)
      goals.push(goal)
    }
  }

  // If no goals found, use the whole description as a single goal
  if (goals.length === 0) {
    goals.push(description)
  }

  return goals
}

/**
 * Generate recommendations based on simulation results and configuration
 */
function generateRecommendations(
  result: SimulationResult,
  config: Partial<SimulationConfig>,
  domain: ExperimentDomain
): {
  designChanges: string[]
  operationalOptimizations: string[]
  furtherExperiments: string[]
  researchDirections: string[]
} {
  const designChanges: string[] = []
  const operationalOptimizations: string[] = []
  const furtherExperiments: string[] = []
  const researchDirections: string[] = []

  // Extract key metrics
  const efficiency = result.metrics.find(m =>
    m.name.toLowerCase().includes('efficiency')
  )
  const power = result.metrics.find(m =>
    m.name.toLowerCase().includes('power')
  )

  // Generate tier-specific recommendations
  const tier = config.tier || 'local'
  if (tier === 'local') {
    // T1: Suggest upgrading for more detail
    furtherExperiments.push(
      'Run Tier 2 simulation with Monte Carlo uncertainty quantification for statistical validation'
    )
    furtherExperiments.push(
      'Perform parametric sensitivity analysis to identify critical design parameters'
    )
  }

  if (tier === 'browser') {
    // T2: Suggest validation
    furtherExperiments.push(
      'Validate results with Tier 3 GPU-accelerated simulation for higher fidelity'
    )
    researchDirections.push(
      'Compare simulation predictions against published experimental data or field measurements'
    )
  }

  // Domain-specific recommendations
  switch (domain) {
    case 'battery':
      designChanges.push('Consider thermal management optimization to reduce degradation')
      operationalOptimizations.push('Implement adaptive charging strategy to balance speed and longevity')
      researchDirections.push('Investigate alternative chemistries with higher cycle life at fast-charge rates')
      break

    case 'geothermal':
      designChanges.push('Evaluate alternative working fluids for improved cycle efficiency')
      operationalOptimizations.push('Optimize turbine inlet conditions to maximize net power output')
      researchDirections.push('Assess hybrid configurations combining binary and flash cycles')
      break

    case 'solar':
      designChanges.push('Explore multi-junction cell architectures to exceed single-junction limits')
      operationalOptimizations.push('Implement maximum power point tracking with temperature compensation')
      researchDirections.push('Investigate tandem perovskite-silicon configurations for higher efficiency')
      break

    case 'wind':
      designChanges.push('Optimize blade profile for site-specific wind resource characteristics')
      operationalOptimizations.push('Implement yaw and pitch control strategies to minimize wake losses')
      researchDirections.push('Study atmospheric stability effects on power production and turbulence')
      break

    case 'hydrogen':
      designChanges.push('Evaluate advanced membrane materials to reduce ohmic overpotential')
      operationalOptimizations.push('Optimize operating temperature and pressure for maximum efficiency')
      researchDirections.push('Investigate coupling with renewable energy for green hydrogen production')
      break

    case 'biomass':
      designChanges.push('Optimize gasification temperature and pressure for maximum syngas yield')
      operationalOptimizations.push('Implement feedstock pre-treatment to improve conversion efficiency')
      researchDirections.push('Explore catalytic upgrading of bio-oil for higher energy density')
      break

    case 'carbon-capture':
      designChanges.push('Evaluate novel sorbent materials with lower regeneration energy requirements')
      operationalOptimizations.push('Optimize capture process parameters to minimize efficiency penalty')
      researchDirections.push('Investigate direct air capture integration with renewable energy systems')
      break

    case 'grid-optimization':
      designChanges.push('Implement advanced control algorithms for real-time load balancing')
      operationalOptimizations.push('Optimize storage dispatch strategy to minimize peak demand charges')
      researchDirections.push('Study integration of distributed energy resources with grid stability')
      break

    case 'materials-science':
      designChanges.push('Explore nanostructured materials for enhanced catalytic activity')
      operationalOptimizations.push('Optimize synthesis conditions to maximize material performance')
      researchDirections.push('Investigate degradation mechanisms and stability under operating conditions')
      break

    case 'energy-efficiency':
    default:
      designChanges.push('Identify and minimize major exergy destruction sources through second-law analysis')
      operationalOptimizations.push('Optimize operating parameters to maximize overall system efficiency')
      researchDirections.push('Investigate advanced heat recovery and waste heat utilization strategies')
      break
  }

  // Efficiency-based recommendations
  if (efficiency && efficiency.value < 30) {
    operationalOptimizations.push(
      'Identify and minimize major exergy destruction sources through second-law analysis'
    )
  }

  // Always suggest validation if not already present
  if (!researchDirections.some(r => r.includes('validate') || r.includes('experimental'))) {
    researchDirections.push(
      'Validate model predictions with experimental measurements to calibrate assumptions'
    )
  }

  return {
    designChanges,
    operationalOptimizations,
    furtherExperiments,
    researchDirections
  }
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
      goals: config.goals || [],
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

    recommendations: (() => {
      // Try to use insights from simulation engine first
      if (result.structuredInsights?.recommendations?.length) {
        return {
          designChanges: [],
          operationalOptimizations: result.structuredInsights.recommendations,
          furtherExperiments: [],
          researchDirections: [],
        }
      }

      // Otherwise generate recommendations based on results
      return generateRecommendations(result, config, domain)
    })(),

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
