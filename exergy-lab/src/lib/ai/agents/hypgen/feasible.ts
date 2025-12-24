/**
 * Feasible HypGen Agent (v0.0.4.0 Enhanced)
 *
 * Generates hypotheses with a feasibility-first strategy.
 * Focuses on ACHIEVABLE BREAKTHROUGHS - high-impact ideas that
 * can be validated quickly using proven manufacturing approaches.
 *
 * v0.0.4.0: Enhanced prompts for more ambitious but achievable targets
 *
 * @strategy feasibility-first
 * @focus Achievable breakthroughs, proven manufacturing, rapid validation
 */

import { BaseHypGenAgent, type HypGenConfig } from './base'

// ============================================================================
// Success Examples: Feasibility-Led Breakthroughs
// ============================================================================

/**
 * Examples of high-impact breakthroughs achieved through feasibility focus
 */
const FEASIBILITY_SUCCESS_EXAMPLES = [
  {
    name: 'Perovskite solar cell stability (Saliba et al.)',
    approach: 'Added cesium/rubidium to triple-cation perovskites',
    feasibilityAdvantage: 'Used standard spin-coating, no new equipment',
    impact: 'Achieved >1000 hour stability, enabled commercialization path',
  },
  {
    name: 'LFP battery revival (BYD/CATL)',
    approach: 'Cell-to-pack design + improved electrolyte',
    feasibilityAdvantage: 'Used existing cathode materials, scaled on existing lines',
    impact: 'Matched NMC energy density at 30% lower cost',
  },
  {
    name: 'PERC solar cells',
    approach: 'Added aluminum oxide passivation layer to standard cells',
    feasibilityAdvantage: 'Single additional ALD step to existing lines',
    impact: '1-2% absolute efficiency gain, now industry standard',
  },
  {
    name: 'Dry electrode coating (Tesla/Maxwell)',
    approach: 'Eliminated solvent drying step in electrode manufacturing',
    feasibilityAdvantage: 'Retrofit to existing production lines',
    impact: '40% energy savings, faster production, better performance',
  },
]

// ============================================================================
// Feasible HypGen Agent
// ============================================================================

export class FeasibleHypGenAgent extends BaseHypGenAgent {
  constructor(config: Partial<HypGenConfig> = {}) {
    super({
      ...config,
      agentType: 'feasible',
      hypothesesPerGeneration: config.hypothesesPerGeneration ?? 5,
      minFeasibilityScore: config.minFeasibilityScore ?? 75,
      temperature: config.temperature ?? 0.75, // Slightly higher for ambitious ideas
    })
  }

  get strategicFocus(): string {
    return 'feasibility-first: achievable breakthroughs with proven manufacturing'
  }

  getStrategicPromptInstructions(): string {
    return `
As a FEASIBILITY-FOCUSED hypothesis generator, your goal is to identify
ACHIEVABLE BREAKTHROUGHS - ideas that are both high-impact AND can be
validated quickly using proven approaches.

## Core Principle: The Best Breakthroughs Are Often the Simplest

The most transformative innovations often come from clever combinations of
existing technologies, not exotic new approaches. Your hypotheses should be
ideas that make engineers say "Why didn't we try that before?"

## Inspiration: Feasibility-Led Breakthroughs That Changed the Industry

${FEASIBILITY_SUCCESS_EXAMPLES.map(ex => `
**${ex.name}**
- Approach: ${ex.approach}
- Feasibility: ${ex.feasibilityAdvantage}
- Impact: ${ex.impact}`).join('\n')}

## Strategic Focus Areas

1. **Clever Combinations of Proven Technologies**
   - What happens if we combine technology A's strength with technology B's advantage?
   - What mature technique from another field has never been applied here?
   - What "obvious" combination has been overlooked?
   - Example: Perovskite + silicon tandem (two proven PV technologies)

2. **Manufacturing Process Innovations**
   - What process bottleneck can be eliminated or simplified?
   - What expensive step can be replaced with a cheaper one?
   - What batch process could become continuous?
   - Example: Dry electrode coating (eliminated solvent drying entirely)

3. **Materials Optimization Within Known Systems**
   - What composition tweaks could unlock new performance regimes?
   - What additive could solve multiple problems at once?
   - What interface engineering could boost efficiency?
   - Example: Cesium/rubidium in triple-cation perovskites

4. **Underexplored Process Windows**
   - What processing conditions haven't been systematically studied?
   - What intermediate composition space is unexplored?
   - What manufacturing parameters are suboptimal by convention, not physics?
   - Example: Higher temperature annealing for CIGS (unlocked 23%+ efficiency)

## Scoring Targets (Aim High!)

- **Feasibility Score: 75-90** (must be achievable, not just possible)
- **Impact Score: 75-95** (don't sacrifice impact for feasibility)
- **Novelty Score: 65-85** (novel application of proven concepts counts)

## Key Questions for High-Scoring Hypotheses

1. **The 6-Month Test**: Can this show preliminary proof-of-concept in a standard lab?
2. **The Manufacturing Test**: What existing production line could adopt this with minimal changes?
3. **The "Why Not?" Test**: What's the real reason this hasn't been tried? (If no good answer, try it!)
4. **The Impact Test**: If this works, would it change how the industry operates?

## Manufacturing Acceleration Opportunities

- **Drop-in replacements**: New materials that work in existing processes
- **Process intensification**: Same result, fewer steps
- **Ambient processing**: Eliminate vacuum, high-temperature, or controlled atmosphere steps
- **Substrate flexibility**: Enable new form factors with existing materials
- **Quality improvement**: Better yield, lower defects, tighter tolerances

## What Makes a Weak Feasibility Hypothesis (Avoid These)

- Trivial optimization that wouldn't merit a publication
- "Known unknown" problems with no proposed solution path
- Requires equipment that doesn't exist commercially
- Relies on materials with no supply chain
- Would take 5+ years to validate even the basic concept

## What Makes a Strong Feasibility Hypothesis (Target These)

- Clever recombination that no one has documented
- Clear path from lab to pilot to manufacturing
- Quantified improvement target (e.g., "25% cost reduction")
- Specific technical approach, not just a goal
- Addresses a known industry pain point

CRITICAL: Generate hypotheses that are BOTH feasible AND impactful.
The goal is not to be conservative - it's to find the shortest path to breakthrough.`
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createFeasibleHypGenAgent(config?: Partial<HypGenConfig>): FeasibleHypGenAgent {
  return new FeasibleHypGenAgent(config)
}
