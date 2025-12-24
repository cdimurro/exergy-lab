/**
 * HypGen Agents Module
 *
 * Exports all 6 specialized hypothesis generation agents for the Breakthrough Engine.
 * Each agent has a unique strategic focus for generating diverse hypotheses.
 *
 * v0.0.4.0: Added Fusion Agent for multi-domain synthesis (3+ domains)
 *
 * @see base.ts - Shared base class and types
 * @see ../hypothesis-racer.ts - Racing arena that orchestrates these agents
 */

// Base class and shared types
export {
  BaseHypGenAgent,
  THERMODYNAMIC_LIMITS,
  DEFAULT_HYPGEN_CONFIG,
} from './base'
export type {
  HypGenAgentType,
  HypGenConfig,
  RacingHypothesis,
  GenerationContext,
  GenerationResult,
} from './base'

// Novel Agent - Novelty-first strategy
export { NovelHypGenAgent, createNovelHypGenAgent } from './novel'

// Feasible Agent - Feasibility-first strategy
export { FeasibleHypGenAgent, createFeasibleHypGenAgent } from './feasible'

// Economic Agent - Economics-first strategy
export { EconomicHypGenAgent, createEconomicHypGenAgent } from './economic'

// Cross-Domain Agent - Cross-domain transfer strategy
export { CrossDomainHypGenAgent, createCrossDomainHypGenAgent } from './cross-domain'

// Paradigm Agent - Paradigm-shift focus
export { ParadigmHypGenAgent, createParadigmHypGenAgent } from './paradigm'

// Fusion Agent - Multi-domain synthesis (3+ domains) [v0.0.4.0]
export {
  FusionHypGenAgent,
  createFusionHypGenAgent,
  FUSION_CATEGORIES,
  calculateCitationDistance,
} from './fusion'

// ============================================================================
// Factory Functions
// ============================================================================

import type { HypGenAgentType, HypGenConfig } from './base'
import { NovelHypGenAgent } from './novel'
import { FeasibleHypGenAgent } from './feasible'
import { EconomicHypGenAgent } from './economic'
import { CrossDomainHypGenAgent } from './cross-domain'
import { ParadigmHypGenAgent } from './paradigm'
import { FusionHypGenAgent } from './fusion'
import { BaseHypGenAgent } from './base'

/**
 * Create a HypGen agent by type
 */
export function createHypGenAgent(
  type: HypGenAgentType,
  config?: Partial<HypGenConfig>
): BaseHypGenAgent {
  switch (type) {
    case 'novel':
      return new NovelHypGenAgent(config)
    case 'feasible':
      return new FeasibleHypGenAgent(config)
    case 'economic':
      return new EconomicHypGenAgent(config)
    case 'cross-domain':
      return new CrossDomainHypGenAgent(config)
    case 'paradigm':
      return new ParadigmHypGenAgent(config)
    case 'fusion':
      return new FusionHypGenAgent(config)
    default:
      throw new Error(`Unknown HypGen agent type: ${type}`)
  }
}

/**
 * Create all 6 HypGen agents
 * v0.0.4.0: Added Fusion agent for multi-domain synthesis
 */
export function createAllHypGenAgents(
  config?: Partial<HypGenConfig>
): Map<HypGenAgentType, BaseHypGenAgent> {
  const agents = new Map<HypGenAgentType, BaseHypGenAgent>()

  agents.set('novel', new NovelHypGenAgent(config))
  agents.set('feasible', new FeasibleHypGenAgent(config))
  agents.set('economic', new EconomicHypGenAgent(config))
  agents.set('cross-domain', new CrossDomainHypGenAgent(config))
  agents.set('paradigm', new ParadigmHypGenAgent(config))
  agents.set('fusion', new FusionHypGenAgent(config))

  return agents
}

/**
 * Agent type descriptions for UI
 * v0.0.4.0: Added Fusion agent
 */
export const HYPGEN_AGENT_DESCRIPTIONS: Record<HypGenAgentType, {
  name: string
  shortName: string
  description: string
  icon: string
  color: string
}> = {
  novel: {
    name: 'Novel Agent',
    shortName: 'Novel',
    description: 'Explores unexplored combinations and unconventional approaches',
    icon: 'Lightbulb',
    color: '#F59E0B', // Amber
  },
  feasible: {
    name: 'Feasible Agent',
    shortName: 'Feasible',
    description: 'Focuses on near-term implementation with proven foundations',
    icon: 'Wrench',
    color: '#3B82F6', // Blue
  },
  economic: {
    name: 'Economic Agent',
    shortName: 'Economic',
    description: 'Prioritizes cost reduction and market viability',
    icon: 'DollarSign',
    color: '#10B981', // Emerald
  },
  'cross-domain': {
    name: 'Cross-Domain Agent',
    shortName: 'CrossDom',
    description: 'Transfers knowledge from adjacent fields and industries',
    icon: 'GitBranch',
    color: '#8B5CF6', // Violet
  },
  paradigm: {
    name: 'Paradigm Agent',
    shortName: 'Paradigm',
    description: 'Challenges fundamental assumptions for breakthrough potential',
    icon: 'Zap',
    color: '#EF4444', // Red
  },
  fusion: {
    name: 'Fusion Agent',
    shortName: 'Fusion',
    description: 'Synthesizes 3+ distant domains for paradigm-shifting breakthroughs',
    icon: 'Combine',
    color: '#EC4899', // Pink
  },
}
