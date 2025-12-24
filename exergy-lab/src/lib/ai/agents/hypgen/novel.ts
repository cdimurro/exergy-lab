/**
 * Novel HypGen Agent
 *
 * Generates hypotheses with a novelty-first strategy.
 * Focuses on unexplored combinations, unconventional approaches,
 * and paradigm-challenging ideas.
 *
 * @strategy novelty-first
 * @focus Unexplored combinations, unconventional approaches
 */

import { BaseHypGenAgent, type HypGenConfig } from './base'

// ============================================================================
// Novel HypGen Agent
// ============================================================================

export class NovelHypGenAgent extends BaseHypGenAgent {
  constructor(config: Partial<HypGenConfig> = {}) {
    super({
      ...config,
      agentType: 'novel',
      hypothesesPerGeneration: config.hypothesesPerGeneration ?? 5,
      minNoveltyScore: config.minNoveltyScore ?? 75, // Higher novelty threshold
      temperature: config.temperature ?? 0.9, // Higher temperature for creativity
    })
  }

  get strategicFocus(): string {
    return 'novelty-first: unexplored combinations and unconventional approaches'
  }

  getStrategicPromptInstructions(): string {
    return `
As a NOVELTY-FOCUSED hypothesis generator, your primary goal is to identify:

1. **Unexplored Material Combinations**
   - Look for materials that haven't been combined before
   - Consider interfacing different material classes (e.g., organic + inorganic, 2D + 3D)
   - Explore unusual stoichiometries or doping strategies

2. **Unconventional Mechanisms**
   - Challenge established pathways
   - Propose new reaction mechanisms or energy transfer modes
   - Consider quantum effects, surface phenomena, or emergent behaviors

3. **Cross-Paradigm Innovation**
   - Combine concepts from seemingly unrelated fields
   - Look for analogies in nature (biomimicry)
   - Apply concepts from other industries (aerospace, medicine, computing)

4. **Counterintuitive Approaches**
   - Question "common knowledge" in the field
   - Explore approaches that have been dismissed or overlooked
   - Consider what would happen if assumptions were inverted

**Scoring Priority:**
- Novelty Score: 80-95 (prioritize this)
- Impact Score: 75-95 (high novelty should have high potential)
- Feasibility Score: 60-80 (acceptable to have some implementation challenges)

**Key Questions to Drive Novelty:**
- What hasn't been tried before?
- What would experts say is "impossible" but might not be?
- What unexpected combinations could yield emergent properties?
- What would a breakthrough from 2040 look like if invented today?

IMPORTANT: While prioritizing novelty, ensure hypotheses remain grounded in physics.
Avoid proposing anything that violates thermodynamic or conservation laws.`
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createNovelHypGenAgent(config?: Partial<HypGenConfig>): NovelHypGenAgent {
  return new NovelHypGenAgent(config)
}
