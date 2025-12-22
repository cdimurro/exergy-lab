/**
 * Feasible HypGen Agent
 *
 * Generates hypotheses with a feasibility-first strategy.
 * Focuses on near-term implementation, proven foundations,
 * and practical manufacturing considerations.
 *
 * @strategy feasibility-first
 * @focus Near-term implementation, proven foundations
 */

import { BaseHypGenAgent, type HypGenConfig } from './base'

// ============================================================================
// Feasible HypGen Agent
// ============================================================================

export class FeasibleHypGenAgent extends BaseHypGenAgent {
  constructor(config: Partial<HypGenConfig> = {}) {
    super({
      ...config,
      agentType: 'feasible',
      hypothesesPerGeneration: config.hypothesesPerGeneration ?? 3,
      minFeasibilityScore: config.minFeasibilityScore ?? 75, // Higher feasibility threshold
      temperature: config.temperature ?? 0.7, // Lower temperature for practical ideas
    })
  }

  get strategicFocus(): string {
    return 'feasibility-first: near-term implementation with proven foundations'
  }

  getStrategicPromptInstructions(): string {
    return `
As a FEASIBILITY-FOCUSED hypothesis generator, your primary goal is to identify:

1. **Proven Foundation Extensions**
   - Build on well-established technologies
   - Propose incremental but significant improvements
   - Leverage existing manufacturing infrastructure
   - Use commercially available materials and processes

2. **Manufacturing Readiness**
   - Consider scalability from the start
   - Prefer ambient or near-ambient processing conditions
   - Avoid exotic equipment or rare materials
   - Design for roll-to-roll, continuous, or batch processes

3. **Risk Mitigation**
   - Propose fallback options within each hypothesis
   - Identify the 1-2 key technical risks and how to address them
   - Build on prior successful demonstrations
   - Reference pilot plants or industrial precedents

4. **Timeline Realism**
   - Aim for lab validation possible within 1 year
   - Consider technology readiness level (TRL) progression
   - Identify critical path dependencies
   - Propose staged validation approach

**Scoring Priority:**
- Feasibility Score: 80-95 (prioritize this)
- Impact Score: 65-85 (moderate to high impact acceptable)
- Novelty Score: 55-75 (novelty is secondary but still valued)

**Key Questions to Drive Feasibility:**
- Can this be validated in a standard lab within 6 months?
- What existing processes can be adapted?
- What is the simplest path to a working prototype?
- What would a skeptical manufacturing engineer accept?

**Manufacturing Considerations:**
- Prefer: solution processing, screen printing, CVD, ALD
- Avoid: ultra-high vacuum, cryogenic temperatures, exotic precursors
- Consider: yield, throughput, defect tolerance
- Remember: cost-effective at scale is the ultimate goal

IMPORTANT: While prioritizing feasibility, ensure hypotheses still offer meaningful advancement.
Avoid trivial improvements that wouldn't merit publication or patents.`
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createFeasibleHypGenAgent(config?: Partial<HypGenConfig>): FeasibleHypGenAgent {
  return new FeasibleHypGenAgent(config)
}
