/**
 * Cross-Domain Fusion Agent (v0.0.4.0)
 *
 * Generates hypotheses by fusing concepts from 3+ domains simultaneously.
 * Unlike the standard cross-domain agent (1-to-1 transfers), this agent
 * explicitly combines multiple distant fields to find breakthrough innovations.
 *
 * Key differences from cross-domain agent:
 * - Requires 3+ domain combination (not just 2)
 * - Measures "citation distance" as novelty metric
 * - Targets high-potential fusion categories (biology + materials + AI)
 * - Scores higher on paradigm-shift potential
 *
 * @strategy multi-domain-fusion
 * @focus 3+ domain synthesis, distant analogies, paradigm shifts
 */

import { BaseHypGenAgent, type HypGenConfig, type GenerationContext } from './base'

// ============================================================================
// Multi-Domain Fusion Categories
// ============================================================================

/**
 * High-potential fusion categories identified from breakthrough analysis.
 * Each category combines 3+ domains that have historically yielded paradigm shifts.
 */
const FUSION_CATEGORIES = {
  // Bio-inspired + AI + Materials
  bioMaterialsAI: {
    name: 'Bio-Materials-AI Fusion',
    domains: ['biology', 'materials science', 'artificial intelligence'],
    description: 'Nature-inspired materials designed and optimized by AI',
    examples: [
      'AI-designed protein scaffolds for solar light harvesting (inspired by photosynthesis)',
      'Machine learning optimization of biomimetic catalyst structures',
      'Neural network-guided self-healing material design based on biological repair',
      'Generative AI for bio-inspired hierarchical battery electrode architectures',
    ],
    historicalSuccesses: [
      'AlphaFold protein structure prediction',
      'ML-accelerated materials discovery (A-Lab)',
      'Biomimetic perovskite interfaces',
    ],
  },

  // Quantum + Chemistry + Computing
  quantumChemCompute: {
    name: 'Quantum-Chemistry-Computing Fusion',
    domains: ['quantum mechanics', 'computational chemistry', 'high-performance computing'],
    description: 'Quantum-informed computational design of novel energy materials',
    examples: [
      'Quantum computing simulation of catalyst reaction pathways',
      'DFT + ML hybrid for high-throughput materials screening',
      'Quantum dot design via ab initio molecular dynamics',
      'Tensor network methods for complex electrochemical interfaces',
    ],
    historicalSuccesses: [
      'DFT-guided catalyst design',
      'Machine learning interatomic potentials',
      'High-throughput computational screening',
    ],
  },

  // Systems + Economics + Policy
  systemsEconPolicy: {
    name: 'Systems-Economics-Policy Fusion',
    domains: ['systems engineering', 'economics', 'policy/regulation'],
    description: 'Holistic techno-economic-regulatory innovation pathways',
    examples: [
      'Integrated assessment models linking technology, markets, and policy',
      'Real options valuation for emerging energy technologies',
      'Regulatory sandbox design for novel storage technologies',
      'Market mechanism design for grid-scale flexibility services',
    ],
    historicalSuccesses: [
      'Feed-in tariff design (German Energiewende)',
      'Capacity market mechanisms',
      'Carbon pricing schemes',
    ],
  },

  // Nano + Bio + Energy
  nanoBioEnergy: {
    name: 'Nano-Bio-Energy Fusion',
    domains: ['nanotechnology', 'biochemistry', 'energy systems'],
    description: 'Nanoscale biological systems for energy conversion and storage',
    examples: [
      'Virus-templated nanowire electrodes for batteries',
      'Enzyme-nanoparticle hybrids for fuel cells',
      'DNA origami frameworks for precise catalyst placement',
      'Bacterial nanowires for bioelectrochemical systems',
    ],
    historicalSuccesses: [
      'M13 virus battery electrodes (MIT)',
      'Enzymatic fuel cells',
      'Geobacter nanowires',
    ],
  },

  // Manufacturing + Robotics + AI
  mfgRoboticsAI: {
    name: 'Manufacturing-Robotics-AI Fusion',
    domains: ['manufacturing', 'robotics', 'artificial intelligence'],
    description: 'Autonomous manufacturing optimization for energy technologies',
    examples: [
      'Self-driving labs for battery material synthesis optimization',
      'Robotic assembly with ML-guided quality control for solar modules',
      'Digital twin + reinforcement learning for continuous process optimization',
      'Automated high-throughput experimentation with active learning',
    ],
    historicalSuccesses: [
      'A-Lab autonomous materials synthesis',
      'High-throughput electrocatalyst screening',
      'Tesla Gigafactory automation',
    ],
  },
}

// ============================================================================
// Citation Distance Metrics
// ============================================================================

/**
 * Estimated citation distance between domains.
 * Higher values indicate more distant (and potentially more novel) combinations.
 * Based on co-citation analysis patterns in scientific literature.
 */
const DOMAIN_DISTANCE_MATRIX: Record<string, Record<string, number>> = {
  'clean-energy': {
    'materials science': 0.3,
    'chemistry': 0.4,
    'physics': 0.4,
    'biology': 0.7,
    'computer science': 0.6,
    'economics': 0.5,
    'manufacturing': 0.4,
    'medicine': 0.8,
    'architecture': 0.7,
    'agriculture': 0.6,
  },
  // Add more domain combinations as needed
}

/**
 * Calculate estimated citation distance for a domain combination.
 * Returns a score from 0-1 where higher = more distant = potentially more novel.
 */
function calculateCitationDistance(domains: string[]): number {
  if (domains.length < 3) return 0.3 // Low distance for 2-domain combinations

  let totalDistance = 0
  let pairs = 0

  for (let i = 0; i < domains.length; i++) {
    for (let j = i + 1; j < domains.length; j++) {
      // Use symmetric distance lookup
      const d1 = domains[i].toLowerCase()
      const d2 = domains[j].toLowerCase()

      const distance = DOMAIN_DISTANCE_MATRIX[d1]?.[d2] ??
                       DOMAIN_DISTANCE_MATRIX[d2]?.[d1] ??
                       0.5 // Default moderate distance

      totalDistance += distance
      pairs++
    }
  }

  return pairs > 0 ? totalDistance / pairs : 0.5
}

// ============================================================================
// Fusion HypGen Agent
// ============================================================================

export class FusionHypGenAgent extends BaseHypGenAgent {
  constructor(config: Partial<HypGenConfig> = {}) {
    super({
      ...config,
      agentType: 'fusion',
      hypothesesPerGeneration: config.hypothesesPerGeneration ?? 5,
      minNoveltyScore: config.minNoveltyScore ?? 80, // High novelty threshold for fusion
      temperature: config.temperature ?? 0.92, // High temperature for creative fusion
    })
  }

  get strategicFocus(): string {
    return 'multi-domain-fusion: synthesizing 3+ distant fields for breakthrough innovations'
  }

  getStrategicPromptInstructions(): string {
    return `
As a MULTI-DOMAIN FUSION hypothesis generator, your goal is to create breakthrough
innovations by COMBINING concepts from 3 or more distant fields simultaneously.

## Core Principle: Distant Recombination
- Real breakthroughs often come from combining ideas that have never been connected
- You must explicitly fuse concepts from AT LEAST 3 different domains
- The more distant the domains (high citation distance), the more novel the potential
- Each domain must contribute a specific, named concept to the fusion

## Fusion Categories to Consider
${this.formatFusionCategories()}

## Required Fusion Structure
Each hypothesis MUST specify:
1. **Domain 1**: [field] - [specific concept/technology being borrowed]
2. **Domain 2**: [field] - [specific concept/technology being borrowed]
3. **Domain 3**: [field] - [specific concept/technology being borrowed]
4. **Fusion Mechanism**: How these three combine into something new
5. **Citation Distance Score**: Estimated novelty (0-1 scale)

## Scoring Priority
- Novelty Score: 80-100 (multi-domain fusion is inherently novel)
- Impact Score: 75-95 (high potential if fusion works)
- Feasibility Score: 50-80 (may require significant development)

## Examples of Successful Multi-Domain Fusion
- **mRNA vaccines**: molecular biology + lipid chemistry + immunology + manufacturing
- **AlphaFold**: protein biology + deep learning + evolutionary data + structural chemistry
- **CRISPR**: microbiology + molecular biology + biochemistry + genetic engineering

## Key Questions
1. What 3+ fields have NEVER been combined for this energy challenge?
2. Which distant field has solved an analogous problem?
3. What would happen if we applied [field A's] approach using [field B's] tools in [field C's] context?
4. What paradigm-shifting combinations exist in the "adjacent possible"?

## Validation Requirements
- Each domain must contribute a NAMED, SPECIFIC concept (not generic)
- The fusion must be technically plausible (not just superficial analogy)
- Include at least one precedent or theoretical basis for why the fusion could work
- Address key challenges that must be overcome for the fusion to succeed

CRITICAL: Generate hypotheses that would NEVER emerge from single-domain thinking.
The goal is paradigm-shifting innovation through creative recombination.`
  }

  /**
   * Format fusion categories for the prompt
   */
  private formatFusionCategories(): string {
    const sections: string[] = []

    for (const [key, category] of Object.entries(FUSION_CATEGORIES)) {
      sections.push(`
### ${category.name}
**Domains**: ${category.domains.join(' + ')}
**Focus**: ${category.description}
**Examples**:
${category.examples.slice(0, 2).map(e => `  - ${e}`).join('\n')}`)
    }

    return sections.join('\n')
  }

  /**
   * Override to inject fusion-specific context
   */
  protected buildGenerationPrompt(context: GenerationContext): string {
    const basePrompt = super.buildGenerationPrompt(context)

    // Select most relevant fusion category based on research domain
    const relevantCategory = this.selectRelevantFusionCategory(context.research.domain)

    const fusionSection = `
## FUSION OPPORTUNITY ANALYSIS
Based on the research domain (${context.research.domain}), consider this high-potential fusion:

**${relevantCategory.name}**
- Domains: ${relevantCategory.domains.join(' + ')}
- Focus: ${relevantCategory.description}
- Historical Successes: ${relevantCategory.historicalSuccesses.join(', ')}

**Example Fusion Hypotheses**:
${relevantCategory.examples.map(e => `- ${e}`).join('\n')}

**Citation Distance**: ~${calculateCitationDistance(relevantCategory.domains).toFixed(2)} (higher = more novel)

---

`

    // Insert after the strategic approach section
    return basePrompt.replace(
      '## RESEARCH CONTEXT',
      `${fusionSection}## RESEARCH CONTEXT`
    )
  }

  /**
   * Select the most relevant fusion category for the research domain
   */
  private selectRelevantFusionCategory(domain: string): typeof FUSION_CATEGORIES[keyof typeof FUSION_CATEGORIES] {
    const domainLower = domain.toLowerCase()

    // Match based on keywords
    if (domainLower.includes('material') || domainLower.includes('catalyst')) {
      return FUSION_CATEGORIES.bioMaterialsAI
    }
    if (domainLower.includes('quantum') || domainLower.includes('computational')) {
      return FUSION_CATEGORIES.quantumChemCompute
    }
    if (domainLower.includes('nano') || domainLower.includes('bio')) {
      return FUSION_CATEGORIES.nanoBioEnergy
    }
    if (domainLower.includes('manufact') || domainLower.includes('scale')) {
      return FUSION_CATEGORIES.mfgRoboticsAI
    }
    if (domainLower.includes('market') || domainLower.includes('policy') || domainLower.includes('economic')) {
      return FUSION_CATEGORIES.systemsEconPolicy
    }

    // Default to Bio-Materials-AI as most broadly applicable
    return FUSION_CATEGORIES.bioMaterialsAI
  }

  /**
   * Get citation distance for a set of domains
   */
  getCitationDistance(domains: string[]): number {
    return calculateCitationDistance(domains)
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createFusionHypGenAgent(config?: Partial<HypGenConfig>): FusionHypGenAgent {
  return new FusionHypGenAgent(config)
}

// Export fusion categories for use in other components
export { FUSION_CATEGORIES, calculateCitationDistance }
