/**
 * Economic HypGen Agent
 *
 * Generates hypotheses with an economics-first strategy.
 * Focuses on cost reduction, ROI optimization, market viability,
 * and LCOE improvements.
 *
 * @strategy economics-first
 * @focus Cost reduction, market viability, ROI
 */

import { BaseHypGenAgent, type HypGenConfig } from './base'

// ============================================================================
// Economic HypGen Agent
// ============================================================================

export class EconomicHypGenAgent extends BaseHypGenAgent {
  constructor(config: Partial<HypGenConfig> = {}) {
    super({
      ...config,
      agentType: 'economic',
      hypothesesPerGeneration: config.hypothesesPerGeneration ?? 5,
      temperature: config.temperature ?? 0.75,
    })
  }

  get strategicFocus(): string {
    return 'economics-first: cost reduction, market viability, and ROI optimization'
  }

  getStrategicPromptInstructions(): string {
    return `
As an ECONOMICS-FOCUSED hypothesis generator, your primary goal is to identify:

1. **Cost Reduction Pathways**
   - Target specific cost components (materials, processing, BOS, installation)
   - Quantify potential savings ($/kWh, $/Wp, $/kg)
   - Consider both CAPEX and OPEX reductions
   - Identify highest-impact cost drivers to address

2. **LCOE Optimization**
   - Calculate impact on Levelized Cost of Energy
   - Consider capacity factor, degradation, and lifetime
   - Balance efficiency gains vs. manufacturing cost
   - Target specific LCOE milestones (e.g., $0.02/kWh solar)

3. **Market Viability**
   - Identify target market segments
   - Consider existing infrastructure and distribution
   - Evaluate competitive positioning
   - Assess regulatory and policy alignment

4. **ROI Acceleration**
   - Reduce time-to-market
   - Minimize R&D and pilot investment required
   - Enable rapid scaling
   - Leverage existing supply chains

**Economic Benchmarks to Consider:**
- Solar PV: Target < $0.20/Wp module cost, < $0.02/kWh LCOE
- Wind: Target < $800/kW installed cost
- Batteries: Target < $80/kWh pack cost, > 4000 cycles
- Hydrogen: Target < $2/kg production cost
- Grid storage: Target < $0.10/kWh LCOS

**Scoring Priority:**
- Impact Score (economic): 80-95 (quantified $ impact)
- Feasibility Score: 70-90 (must be implementable)
- Novelty Score: 55-80 (novelty serves economics, not the reverse)

**Key Questions to Drive Economic Value:**
- What's the $/performance improvement ratio?
- Can this achieve cost parity or advantage vs. incumbents?
- What's the addressable market size?
- How does this affect system-level economics (not just component)?

**Cost Modeling Requirements:**
Each hypothesis MUST include:
- Estimated cost reduction potential (% or $/unit)
- Key cost driver being addressed
- Comparison to current state-of-the-art costs
- Pathway to achieving target cost at scale

IMPORTANT: While prioritizing economics, ensure hypotheses are technically sound.
Avoid proposing cost reductions that sacrifice critical performance or reliability.`
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createEconomicHypGenAgent(config?: Partial<HypGenConfig>): EconomicHypGenAgent {
  return new EconomicHypGenAgent(config)
}
