/**
 * Recommendation Parser
 *
 * Converts natural language AI recommendations into actionable workflow steps.
 * Uses pattern matching to detect recommendation types and generate
 * pre-configured actions for users to execute with a single click.
 */

import type {
  RecommendationAction,
  RecommendationActionType,
  ParsedRecommendations,
  SimulationTier,
  SimulationType,
} from '@/types/simulation-workflow'

// ============================================================================
// Parser Context
// ============================================================================

export interface ParserContext {
  currentTier: SimulationTier
  simulationType: SimulationType
  currentGoal: string
}

// ============================================================================
// Pattern Definitions
// ============================================================================

interface PatternMatcher {
  type: RecommendationActionType
  patterns: RegExp[]
  priority: number // Higher = match first (for overlapping patterns)
  generateAction: (
    recommendation: string,
    context: ParserContext
  ) => Omit<RecommendationAction, 'id' | 'rawRecommendation'>
}

const PATTERN_MATCHERS: PatternMatcher[] = [
  // Tier 3 Upgrade (highest priority - most specific)
  {
    type: 'tier-upgrade',
    patterns: [
      /tier\s*3/i,
      /\bt3\b/i,
      /gpu[-\s]?accelerat/i,
      /cloud[-\s]?simulat/i,
      /modal.*a10g/i,
    ],
    priority: 100,
    generateAction: (rec, ctx) => ({
      type: 'tier-upgrade',
      title: 'Upgrade to Tier 3 (GPU-Accelerated)',
      description: 'Run this simulation with GPU acceleration for publication-grade accuracy',
      icon: 'Zap',
      targetTier: 'cloud',
      keepParameters: true,
    }),
  },

  // Tier 2 Upgrade
  {
    type: 'tier-upgrade',
    patterns: [
      /tier\s*2/i,
      /\bt2\b/i,
      /upgrade.*tier/i,
      /higher.*fidelity/i,
      /monte\s*carlo/i,
      /uncertainty.*quantif/i,
    ],
    priority: 90,
    generateAction: (rec, ctx) => ({
      type: 'tier-upgrade',
      title: 'Upgrade to Tier 2 (Monte Carlo)',
      description: 'Add statistical uncertainty quantification and validation',
      icon: 'TrendingUp',
      targetTier: 'browser',
      keepParameters: true,
    }),
  },

  // Sensitivity Analysis
  {
    type: 'sensitivity-analysis',
    patterns: [
      /sensitivity/i,
      /parameter.*sens/i,
      /sensitive.*param/i,
      /critical.*design.*param/i,
      /identify.*critical/i,
    ],
    priority: 80,
    generateAction: (rec, ctx) => ({
      type: 'sensitivity-analysis',
      title: 'Run Sensitivity Analysis',
      description: 'Identify which parameters most affect system performance',
      icon: 'Activity',
      targetGoal: `${ctx.currentGoal}\n\nPerform sensitivity analysis on key parameters to identify critical design variables.`,
      keepParameters: true,
    }),
  },

  // Parametric Study
  {
    type: 'parametric-study',
    patterns: [
      /parametric/i,
      /parameter.*sweep/i,
      /sweep/i,
      /vary.*param/i,
      /range.*of.*param/i,
    ],
    priority: 75,
    generateAction: (rec, ctx) => ({
      type: 'parametric-study',
      title: 'Parametric Study',
      description: 'Sweep parameter ranges to map the design space',
      icon: 'BarChart3',
      targetGoal: `${ctx.currentGoal}\n\nPerform parametric sweep across operating conditions.`,
      keepParameters: true,
    }),
  },

  // Comparison
  {
    type: 'comparison',
    patterns: [
      /compar/i,
      /benchmark/i,
      /vs\b/i,
      /versus/i,
      /against.*publish/i,
      /experimental.*data/i,
      /field.*measurement/i,
    ],
    priority: 70,
    generateAction: (rec, ctx) => ({
      type: 'comparison',
      title: 'Compare with Benchmarks',
      description: 'Compare results against published data or industry benchmarks',
      icon: 'GitCompare',
      navigateTo: '/simulations?mode=compare',
    }),
  },

  // Optimization
  {
    type: 'optimization',
    patterns: [
      /optimi[zs]/i,
      /improv/i,
      /maximi[zs]/i,
      /minimi[zs]/i,
      /enhance/i,
      /increas.*efficiency/i,
    ],
    priority: 65,
    generateAction: (rec, ctx) => ({
      type: 'optimization',
      title: 'Optimize Design',
      description: 'Find optimal operating conditions or design parameters',
      icon: 'Target',
      targetGoal: `${ctx.currentGoal}\n\nOptimize system parameters to maximize performance.`,
      keepParameters: true,
    }),
  },

  // Validation / Experimental Design
  {
    type: 'validation',
    patterns: [
      /validat/i,
      /verify/i,
      /experiment/i,
      /test.*predict/i,
      /calibrat/i,
      /measure/i,
    ],
    priority: 60,
    generateAction: (rec, ctx) => ({
      type: 'validation',
      title: 'Design Validation Experiment',
      description: 'Create experimental protocol to validate simulation predictions',
      icon: 'FlaskConical',
      navigateTo: '/experiments',
    }),
  },

  // Generic experiment design
  {
    type: 'experiment-design',
    patterns: [
      /design.*experiment/i,
      /experimental.*protocol/i,
      /lab.*test/i,
      /prototype/i,
    ],
    priority: 55,
    generateAction: (rec, ctx) => ({
      type: 'experiment-design',
      title: 'Design Experiment',
      description: 'Create experimental protocol based on simulation insights',
      icon: 'Microscope',
      navigateTo: '/experiments',
    }),
  },
]

// ============================================================================
// Parser Implementation
// ============================================================================

/**
 * Parse AI recommendations into actionable workflow steps
 */
export function parseRecommendations(
  recommendations: string[],
  context: ParserContext
): ParsedRecommendations {
  const actions: RecommendationAction[] = []
  const unmapped: string[] = []

  // Sort matchers by priority (descending)
  const sortedMatchers = [...PATTERN_MATCHERS].sort((a, b) => b.priority - a.priority)

  for (const recommendation of recommendations) {
    let matched = false

    // Try each matcher in priority order
    for (const matcher of sortedMatchers) {
      // Check if any pattern matches
      const isMatch = matcher.patterns.some((pattern) => pattern.test(recommendation))

      if (isMatch) {
        // Generate the action
        const baseAction = matcher.generateAction(recommendation, context)

        // Create full action with ID and raw text
        const action: RecommendationAction = {
          ...baseAction,
          id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          rawRecommendation: recommendation,
        }

        actions.push(action)
        matched = true
        break // Stop after first match
      }
    }

    // If no pattern matched, add to unmapped
    if (!matched) {
      unmapped.push(recommendation)
    }
  }

  return {
    actions,
    unmapped,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get icon name for recommendation type
 */
export function getRecommendationIcon(type: RecommendationActionType): string {
  const iconMap: Record<RecommendationActionType, string> = {
    'tier-upgrade': 'Zap',
    'sensitivity-analysis': 'Activity',
    'parametric-study': 'BarChart3',
    'comparison': 'GitCompare',
    'optimization': 'Target',
    'validation': 'FlaskConical',
    'experiment-design': 'Microscope',
  }

  return iconMap[type] || 'ArrowRight'
}

/**
 * Get badge color for recommendation type
 */
export function getRecommendationBadgeColor(
  type: RecommendationActionType
): 'blue' | 'purple' | 'green' | 'orange' | 'red' {
  const colorMap: Record<RecommendationActionType, 'blue' | 'purple' | 'green' | 'orange' | 'red'> = {
    'tier-upgrade': 'purple',
    'sensitivity-analysis': 'blue',
    'parametric-study': 'blue',
    'comparison': 'green',
    'optimization': 'orange',
    'validation': 'green',
    'experiment-design': 'green',
  }

  return colorMap[type] || 'blue'
}
