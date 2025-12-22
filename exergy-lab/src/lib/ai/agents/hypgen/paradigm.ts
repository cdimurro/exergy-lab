/**
 * Paradigm HypGen Agent
 *
 * Generates hypotheses with a paradigm-shift focus.
 * Aims for breakthrough-level discoveries that challenge
 * fundamental assumptions and open new research fields.
 *
 * @strategy paradigm-shift
 * @focus Challenging assumptions, breakthrough potential
 */

import { BaseHypGenAgent, type HypGenConfig, type GenerationContext } from './base'

// ============================================================================
// Paradigm Shift Indicators
// ============================================================================

const PARADIGM_SHIFT_INDICATORS = {
  // What makes something paradigm-shifting
  characteristics: [
    'Challenges a fundamental assumption held for 10+ years',
    'Introduces a completely new methodology or framework',
    'Enables 2+ follow-on discoveries not previously possible',
    'Contradicts widely-cited prior art with new evidence',
    'Opens an entirely new research field or subfield',
    'Makes previously impossible performance possible',
    'Changes how we think about the problem, not just the solution',
  ],

  // Historical paradigm shifts for inspiration
  examples: [
    { shift: 'Perovskite solar cells', year: 2012, impact: 'New material class, 0% to 25%+ efficiency in 10 years' },
    { shift: 'Lithium-ion batteries', year: 1991, impact: 'Enabled mobile computing, EVs, grid storage' },
    { shift: 'CRISPR gene editing', year: 2012, impact: 'Precise genetic modification at low cost' },
    { shift: 'mRNA vaccines', year: 2020, impact: 'Rapid vaccine development platform' },
    { shift: 'Transformer architecture', year: 2017, impact: 'Foundation for modern AI capabilities' },
  ],

  // Common paradigm-limiting assumptions to challenge
  assumptions: {
    solar: [
      'Single-junction cells have hard efficiency limits',
      'Stability and efficiency are fundamentally trade-offs',
      'High-efficiency requires expensive materials',
    ],
    batteries: [
      'Li-ion is the only viable chemistry for EVs',
      'Energy density and safety are fundamentally opposed',
      'Fast charging inevitably degrades batteries',
    ],
    wind: [
      'Larger turbines are always better for offshore',
      'Blade materials cannot be recycled',
      'Capacity factors are limited by wind variability',
    ],
    hydrogen: [
      'Green hydrogen will always be more expensive than gray',
      'Platinum-group metals are essential for electrolysis',
      'Storage and transport are the main cost barriers',
    ],
  },
}

// ============================================================================
// Paradigm HypGen Agent
// ============================================================================

export class ParadigmHypGenAgent extends BaseHypGenAgent {
  constructor(config: Partial<HypGenConfig> = {}) {
    super({
      ...config,
      agentType: 'paradigm',
      hypothesesPerGeneration: config.hypothesesPerGeneration ?? 3,
      minNoveltyScore: config.minNoveltyScore ?? 80, // Very high novelty threshold
      temperature: config.temperature ?? 0.95, // Highest temperature for breakthrough thinking
    })
  }

  get strategicFocus(): string {
    return 'paradigm-shift: challenging fundamental assumptions and enabling breakthroughs'
  }

  getStrategicPromptInstructions(): string {
    return `
As a PARADIGM-SHIFT hypothesis generator, your goal is to identify potential BREAKTHROUGHS:

## What Makes a Paradigm Shift
${PARADIGM_SHIFT_INDICATORS.characteristics.map(c => `- ${c}`).join('\n')}

## Historical Paradigm Shifts for Inspiration
${PARADIGM_SHIFT_INDICATORS.examples.map(e =>
  `- ${e.shift} (${e.year}): ${e.impact}`
).join('\n')}

## Your Strategic Approach

1. **Challenge Fundamental Assumptions**
   - Identify the "everyone knows that..." assumptions in the field
   - Ask "what if the opposite were true?"
   - Look for assumptions based on old technology or understanding
   - Question constraints that may no longer apply

2. **Seek Order-of-Magnitude Improvements**
   - Don't aim for 10% better, aim for 10x better
   - Identify what would need to change for dramatic improvement
   - Consider what technologies from other fields achieved such leaps
   - Look for "shortcuts" that bypass current limitations

3. **Enable Follow-On Discoveries**
   - Think about what your hypothesis would enable if true
   - Consider the cascade of innovations it could unlock
   - Aim for platform technologies, not point solutions
   - Design for extensibility and combination with other advances

4. **Reframe the Problem**
   - Consider if we're solving the right problem
   - Look for ways to eliminate problems rather than solve them
   - Consider system-level solutions vs. component-level
   - Ask what the problem would look like from first principles

## Assumptions to Challenge
Based on the research domain, consider challenging these common assumptions:
${this.formatAssumptionsToChallenge()}

**Scoring Priority:**
- Novelty Score: 85-98 (paradigm shifts must be highly novel)
- Impact Score: 85-98 (breakthroughs have massive impact)
- Feasibility Score: 50-75 (acceptable to have implementation challenges)

**Key Questions for Paradigm-Shift Potential:**
- What would make experts say "that changes everything"?
- What would future historians cite as the turning point?
- What would win a Nobel Prize if validated?
- What would create a new industry or obsolete an existing one?

**Validation of Paradigm-Shift Potential:**
Each hypothesis MUST include:
- The specific assumption being challenged
- Why this assumption might be wrong or outdated
- The magnitude of potential impact if proven correct
- The new research directions it would enable

IMPORTANT: Paradigm shifts are rare but transformative. Not every hypothesis needs
to be a paradigm shift, but at least 1 of your 3 should have genuine breakthrough potential.
Balance ambition with grounding in physics - extraordinary claims need extraordinary evidence.`
  }

  /**
   * Format assumptions to challenge based on all domains
   */
  private formatAssumptionsToChallenge(): string {
    const all: string[] = []

    for (const [domain, assumptions] of Object.entries(PARADIGM_SHIFT_INDICATORS.assumptions)) {
      all.push(`\n### ${domain.toUpperCase()}`)
      assumptions.forEach(a => all.push(`- Challenge: "${a}"`))
    }

    return all.join('\n')
  }

  /**
   * Override to add paradigm-shift context
   */
  protected buildGenerationPrompt(context: GenerationContext): string {
    const basePrompt = super.buildGenerationPrompt(context)

    // Identify domain-specific assumptions to challenge
    const domainKey = this.identifyDomainKey(context.research.domain)
    const assumptionsToChallenge =
      PARADIGM_SHIFT_INDICATORS.assumptions[domainKey as keyof typeof PARADIGM_SHIFT_INDICATORS.assumptions] || []

    if (assumptionsToChallenge.length === 0) {
      return basePrompt
    }

    const paradigmSection = `
## DOMAIN-SPECIFIC ASSUMPTIONS TO CHALLENGE
For ${context.research.domain}, consider challenging:
${assumptionsToChallenge.map(a => `- "${a}" - What if this isn't true?`).join('\n')}

Generate hypotheses that directly challenge or bypass these limitations.
---

`

    return basePrompt.replace(
      '## RESEARCH CONTEXT',
      `${paradigmSection}## RESEARCH CONTEXT`
    )
  }

  /**
   * Map research domain to assumptions key
   */
  private identifyDomainKey(domain: string): string {
    const domainLower = domain.toLowerCase()

    if (domainLower.includes('solar') || domainLower.includes('photovoltaic')) {
      return 'solar'
    }
    if (domainLower.includes('wind')) {
      return 'wind'
    }
    if (domainLower.includes('battery') || domainLower.includes('storage')) {
      return 'batteries'
    }
    if (domainLower.includes('hydrogen') || domainLower.includes('fuel cell')) {
      return 'hydrogen'
    }

    return 'solar' // Default
  }

  /**
   * Override scoring to emphasize paradigm-shift potential
   */
  protected normalizeHypothesis(raw: any, index: number, overrideId?: string) {
    const normalized = super.normalizeHypothesis(raw, index, overrideId)

    // Boost novelty and impact scores for paradigm agent
    // (The AI should already generate high scores, but ensure minimum thresholds)
    return {
      ...normalized,
      noveltyScore: Math.max(normalized.noveltyScore, 80),
      impactScore: Math.max(normalized.impactScore, 80),
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createParadigmHypGenAgent(config?: Partial<HypGenConfig>): ParadigmHypGenAgent {
  return new ParadigmHypGenAgent(config)
}
