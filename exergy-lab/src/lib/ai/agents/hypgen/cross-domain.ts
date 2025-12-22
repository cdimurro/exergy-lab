/**
 * Cross-Domain HypGen Agent
 *
 * Generates hypotheses with a cross-domain transfer strategy.
 * Focuses on knowledge transfer from adjacent fields, biomimicry,
 * and applying solutions from unrelated industries.
 *
 * @strategy cross-domain
 * @focus Knowledge transfer, biomimicry, inter-industry solutions
 */

import { BaseHypGenAgent, type HypGenConfig, type GenerationContext } from './base'

// ============================================================================
// Cross-Domain Knowledge Base
// ============================================================================

const CROSS_DOMAIN_MAPPINGS = {
  // Energy storage ← Other fields
  batteries: [
    { domain: 'neuroscience', concept: 'synaptic plasticity', application: 'adaptive charge management' },
    { domain: 'geology', concept: 'mineral crystallization', application: 'solid-state electrolytes' },
    { domain: 'biology', concept: 'ion channels', application: 'selective ion transport membranes' },
    { domain: 'aerospace', concept: 'thermal protection', application: 'battery thermal management' },
  ],

  // Solar ← Other fields
  solar: [
    { domain: 'botany', concept: 'leaf structure', application: 'light harvesting optimization' },
    { domain: 'marine biology', concept: 'bioluminescence', application: 'quantum dot enhancement' },
    { domain: 'semiconductor', concept: 'transistor scaling', application: 'tandem cell architecture' },
    { domain: 'optics', concept: 'metamaterials', application: 'light trapping structures' },
  ],

  // Wind ← Other fields
  wind: [
    { domain: 'aviation', concept: 'winglets', application: 'blade tip optimization' },
    { domain: 'marine biology', concept: 'whale flippers', application: 'tubercle blade edges' },
    { domain: 'materials science', concept: 'self-healing polymers', application: 'blade repair' },
    { domain: 'acoustics', concept: 'noise cancellation', application: 'quiet blade design' },
  ],

  // Hydrogen ← Other fields
  hydrogen: [
    { domain: 'catalysis', concept: 'enzyme mimicry', application: 'bio-inspired catalysts' },
    { domain: 'metallurgy', concept: 'metal hydrides', application: 'solid-state storage' },
    { domain: 'food science', concept: 'encapsulation', application: 'hydrogen carriers' },
    { domain: 'water treatment', concept: 'membrane technology', application: 'electrolysis efficiency' },
  ],
}

// ============================================================================
// Cross-Domain HypGen Agent
// ============================================================================

export class CrossDomainHypGenAgent extends BaseHypGenAgent {
  constructor(config: Partial<HypGenConfig> = {}) {
    super({
      ...config,
      agentType: 'cross-domain',
      hypothesesPerGeneration: config.hypothesesPerGeneration ?? 3,
      temperature: config.temperature ?? 0.85, // Higher for creative connections
    })
  }

  get strategicFocus(): string {
    return 'cross-domain: knowledge transfer from adjacent fields and industries'
  }

  getStrategicPromptInstructions(): string {
    return `
As a CROSS-DOMAIN hypothesis generator, your primary goal is to identify:

1. **Knowledge Transfer from Adjacent Fields**
   - Identify analogous problems solved in other domains
   - Adapt solutions from materials science, chemistry, biology, physics
   - Look for mature technologies in one field applicable to energy
   - Consider what experts from other fields might suggest

2. **Biomimicry and Nature-Inspired Solutions**
   - Study how nature solves similar energy challenges
   - Photosynthesis → solar, ATP → batteries, ion pumps → membranes
   - Consider structural solutions (honeycomb, hierarchical, fractal)
   - Look at extreme environments (deep sea, desert, arctic)

3. **Inter-Industry Technology Transfer**
   - Aerospace: lightweight materials, thermal management, reliability
   - Semiconductor: fabrication techniques, defect control, scaling
   - Pharmaceutical: molecular design, encapsulation, delivery
   - Automotive: mass manufacturing, cost optimization, recycling

4. **Convergent Problem-Solving**
   - Find where different fields faced similar challenges
   - Identify universal principles (e.g., transport phenomena, interfaces)
   - Look for mathematical or physical analogies
   - Consider what AI/ML from other fields could offer

**Cross-Domain Examples to Consider:**
${this.formatCrossDomainExamples()}

**Scoring Priority:**
- Novelty Score: 75-95 (cross-domain inherently novel)
- Impact Score: 70-90 (significant if transfer works)
- Feasibility Score: 60-85 (may need adaptation)

**Key Questions to Drive Cross-Domain Innovation:**
- What field has already solved an analogous problem?
- What would a [biologist/materials scientist/aerospace engineer] suggest?
- What natural system exhibits the desired behavior?
- What technology from [other industry] could be adapted?

**Transfer Validation Requirements:**
Each hypothesis MUST include:
- Source domain and specific concept/technology
- How the concept maps to the energy application
- Key differences that need to be addressed in transfer
- Precedents for successful similar transfers

IMPORTANT: Ensure that cross-domain transfers are technically valid.
Analogies must hold at the relevant physical/chemical level, not just superficially.`
  }

  /**
   * Format cross-domain examples for the prompt
   */
  private formatCrossDomainExamples(): string {
    const examples: string[] = []

    for (const [field, mappings] of Object.entries(CROSS_DOMAIN_MAPPINGS)) {
      for (const mapping of mappings.slice(0, 2)) {
        examples.push(
          `- ${field.toUpperCase()}: ${mapping.domain} (${mapping.concept}) → ${mapping.application}`
        )
      }
    }

    return examples.join('\n')
  }

  /**
   * Override to inject cross-domain context
   */
  protected buildGenerationPrompt(context: GenerationContext): string {
    const basePrompt = super.buildGenerationPrompt(context)

    // Identify relevant cross-domain mappings based on research domain
    const domainKey = this.identifyDomainKey(context.research.domain)
    const relevantMappings = CROSS_DOMAIN_MAPPINGS[domainKey as keyof typeof CROSS_DOMAIN_MAPPINGS] || []

    if (relevantMappings.length === 0) {
      return basePrompt
    }

    const crossDomainSection = `
## RELEVANT CROSS-DOMAIN OPPORTUNITIES
Based on the research domain (${context.research.domain}), consider these transfers:
${relevantMappings.map(m =>
  `- From ${m.domain}: "${m.concept}" could enable ${m.application}`
).join('\n')}

Use these as inspiration, but feel free to identify other cross-domain opportunities.
---

`

    // Insert after the strategic approach section
    return basePrompt.replace(
      '## RESEARCH CONTEXT',
      `${crossDomainSection}## RESEARCH CONTEXT`
    )
  }

  /**
   * Map research domain to cross-domain mapping key
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

    // Default to batteries as most broadly applicable
    return 'batteries'
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createCrossDomainHypGenAgent(config?: Partial<HypGenConfig>): CrossDomainHypGenAgent {
  return new CrossDomainHypGenAgent(config)
}
