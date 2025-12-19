/**
 * Test Prompts for Discovery Engine Stress Testing
 *
 * 25 diverse prompts across 5 categories to test system robustness:
 * A: Basic/Vague (5) - Tests handling of minimal/ambiguous input
 * B: Standard (5) - Typical user queries with moderate specificity
 * C: Technical (5) - Professional-grade detailed research prompts
 * D: Edge Cases (5) - Stress tests for system limits
 * E: Domain Deep Dives (5) - Domain-specific expertise tests
 */

import type { TestPrompt, PromptCategory } from './types'

// =============================================================================
// Category A: Basic/Vague Queries (5 prompts)
// Tests how the system handles minimal input and ambiguity
// =============================================================================

const BASIC_PROMPTS: TestPrompt[] = [
  {
    id: 'A1',
    category: 'basic',
    query: 'solar energy',
    expectedDomain: 'solar-energy',
    expectedChallenges: ['Too vague', 'No specific research direction', 'May fail validation'],
    difficultyLevel: 1,
    description: 'Minimal query - just two words, no specific goal',
  },
  {
    id: 'A2',
    category: 'basic',
    query: 'Make batteries better for cars',
    expectedDomain: 'battery-storage',
    expectedChallenges: ['Informal language', 'No metrics', 'Vague goal'],
    difficultyLevel: 1,
    description: 'Vague goal with informal phrasing',
  },
  {
    id: 'A3',
    category: 'basic',
    query: 'What is the best renewable energy?',
    expectedDomain: 'other',
    expectedChallenges: ['Question format', 'Subjective', 'No constraints'],
    difficultyLevel: 1,
    description: 'Question-only format, no research direction',
  },
  {
    id: 'A4',
    category: 'basic',
    query: 'How can we reduce emissions?',
    expectedDomain: 'carbon-capture',
    expectedChallenges: ['Too broad', 'Multiple domains possible', 'No technical specifics'],
    difficultyLevel: 1,
    description: 'Broad environmental question without domain clarity',
  },
  {
    id: 'A5',
    category: 'basic',
    query: 'Improve all clean energy technologies',
    expectedDomain: 'other',
    expectedChallenges: ['Multi-domain', 'Impossibly broad', 'No focus'],
    difficultyLevel: 2,
    description: 'Overly broad multi-domain request',
  },
]

// =============================================================================
// Category B: Standard Research Queries (5 prompts)
// Typical user queries with moderate specificity
// =============================================================================

const STANDARD_PROMPTS: TestPrompt[] = [
  {
    id: 'B1',
    category: 'standard',
    query: 'Improve perovskite solar cell stability under humidity',
    expectedDomain: 'solar-energy',
    expectedChallenges: ['Specific but achievable', 'Well-defined problem'],
    difficultyLevel: 2,
    description: 'Solar focus with specific stability concern',
  },
  {
    id: 'B2',
    category: 'standard',
    query: 'Design lithium-ion battery with faster charging capability',
    expectedDomain: 'battery-storage',
    expectedChallenges: ['Common research topic', 'Multiple approaches possible'],
    difficultyLevel: 2,
    description: 'Battery focus on charging performance',
  },
  {
    id: 'B3',
    category: 'standard',
    query: 'Optimize PEM electrolyzer efficiency for green hydrogen production',
    expectedDomain: 'hydrogen-fuel',
    expectedChallenges: ['Technical but accessible', 'Specific technology'],
    difficultyLevel: 2,
    description: 'Hydrogen production efficiency optimization',
  },
  {
    id: 'B4',
    category: 'standard',
    query: 'Develop cost-effective direct air capture technology for CO2 removal',
    expectedDomain: 'carbon-capture',
    expectedChallenges: ['Cost focus', 'DAC specifics needed'],
    difficultyLevel: 2,
    description: 'Carbon capture with economic constraints',
  },
  {
    id: 'B5',
    category: 'standard',
    query: 'Create grid-scale energy storage solution under $100/kWh',
    expectedDomain: 'battery-storage',
    expectedChallenges: ['Cost constraint', 'Scale requirement'],
    difficultyLevel: 3,
    description: 'Grid storage with specific cost target',
  },
]

// =============================================================================
// Category C: Technical/Professional Queries (5 prompts)
// Detailed professional-grade research prompts
// =============================================================================

const TECHNICAL_PROMPTS: TestPrompt[] = [
  {
    id: 'C1',
    category: 'technical',
    query: 'Design tandem perovskite-silicon solar cell architecture achieving >30% PCE with encapsulation strategy for 25-year outdoor stability, targeting <$0.20/Wp manufacturing cost',
    expectedDomain: 'solar-energy',
    expectedChallenges: ['Multiple metrics', 'Specific targets', 'Long-term stability'],
    difficultyLevel: 4,
    description: 'Advanced solar with efficiency, stability, and cost targets',
  },
  {
    id: 'C2',
    category: 'technical',
    query: 'Develop solid-state lithium-metal battery with Li6PS5Cl electrolyte, targeting 400 Wh/kg energy density, >1000 cycle life at 1C rate, and dendrite suppression mechanism',
    expectedDomain: 'battery-storage',
    expectedChallenges: ['Specific chemistry', 'Multiple performance metrics'],
    difficultyLevel: 5,
    description: 'Advanced battery with specific electrolyte and performance targets',
  },
  {
    id: 'C3',
    category: 'technical',
    query: 'Engineer high-temperature SOEC system with La0.8Sr0.2MnO3 oxygen electrode for >90% electrical efficiency at 800C, 50,000 hour durability',
    expectedDomain: 'hydrogen-fuel',
    expectedChallenges: ['Specific materials', 'High-temp operation', 'Durability focus'],
    difficultyLevel: 5,
    description: 'Advanced hydrogen with specific electrode composition',
  },
  {
    id: 'C4',
    category: 'technical',
    query: 'Design single-atom Pt catalyst on nitrogen-doped carbon support for ORR with mass activity >1.0 A/mgPt and <30% degradation over 30,000 cycles',
    expectedDomain: 'materials-science',
    expectedChallenges: ['Catalyst design', 'Atomic-level specificity', 'Durability metrics'],
    difficultyLevel: 5,
    description: 'Advanced catalysis with specific activity and durability targets',
  },
  {
    id: 'C5',
    category: 'technical',
    query: 'Synthesize n-type Bi2Te3-based thermoelectric with ZT>1.5 at 300K via defect engineering and grain boundary optimization',
    expectedDomain: 'materials-science',
    expectedChallenges: ['Thermoelectric specifics', 'ZT optimization', 'Nanostructure control'],
    difficultyLevel: 5,
    description: 'Advanced thermoelectric with specific ZT target',
  },
]

// =============================================================================
// Category D: Edge Cases & Stress Tests (5 prompts)
// Queries designed to stress system limits
// =============================================================================

const EDGE_CASE_PROMPTS: TestPrompt[] = [
  {
    id: 'D1',
    category: 'edge',
    query: 'Investigate the thermodynamic efficiency limits of reversible solid oxide cells operating in both fuel cell and electrolysis modes, considering the effects of temperature gradients, gas diffusion limitations, electrode microstructure optimization using infiltrated nanoparticles, and the integration of thermal management systems for waste heat recovery in combined heat and power applications targeting industrial-scale deployment with minimum 60% round-trip efficiency and 10-year operational lifetime under cycling conditions',
    expectedDomain: 'hydrogen-fuel',
    expectedChallenges: ['Very long query (~400 chars)', 'Multiple sub-topics', 'Complex requirements'],
    difficultyLevel: 5,
    description: 'Very long query testing character limits',
  },
  {
    id: 'D2',
    category: 'edge',
    query: 'Optimize Li3PO4@LiCoO2 core-shell cathode with alpha-Al2O3 coating (5nm) for 4.5V operation',
    expectedDomain: 'battery-storage',
    expectedChallenges: ['Special characters', 'Subscripts', 'Greek letters'],
    difficultyLevel: 4,
    description: 'Query with special characters and chemical notation',
  },
  {
    id: 'D3',
    category: 'edge',
    query: 'Achieve efficiency=95%, T=850C, p=1atm, SOFC with ASR<0.1 ohm-cm2 and OCV>1.1V',
    expectedDomain: 'hydrogen-fuel',
    expectedChallenges: ['Numeric-heavy', 'Units and symbols', 'Multiple constraints'],
    difficultyLevel: 4,
    description: 'Numeric-heavy query with multiple technical parameters',
  },
  {
    id: 'D4',
    category: 'edge',
    query: 'Combine concentrated solar thermal with molten salt storage and supercritical CO2 Brayton cycle for baseload power generation with integrated carbon capture',
    expectedDomain: 'solar-energy',
    expectedChallenges: ['Cross-domain', 'Multiple technologies', 'System integration'],
    difficultyLevel: 5,
    description: 'Complex cross-domain system integration',
  },
  {
    id: 'D5',
    category: 'edge',
    query: 'Design room-temperature superconductor-based power transmission system using hydrogen-rich materials under ambient pressure',
    expectedDomain: 'materials-science',
    expectedChallenges: ['Hypothetical/cutting-edge', 'Unproven technology', 'May lack literature'],
    difficultyLevel: 5,
    description: 'Hypothetical/novel technology with limited existing research',
  },
]

// =============================================================================
// Category E: Domain-Specific Deep Dives (5 prompts)
// One prompt per major domain area
// =============================================================================

const DOMAIN_PROMPTS: TestPrompt[] = [
  {
    id: 'E1',
    category: 'domain',
    query: 'Discover novel MOF structures with >5 mmol/g CO2 adsorption capacity and water stability for post-combustion capture',
    expectedDomain: 'carbon-capture',
    expectedChallenges: ['MOF specifics', 'Adsorption metrics', 'Stability requirements'],
    difficultyLevel: 4,
    description: 'Materials science focus on MOFs for carbon capture',
  },
  {
    id: 'E2',
    category: 'domain',
    query: 'Engineer cyanobacteria strain for direct ethanol secretion at >2 g/L/day productivity with salt tolerance for seawater cultivation',
    expectedDomain: 'biomass',
    expectedChallenges: ['Biofuels domain', 'Genetic engineering', 'Productivity metrics'],
    difficultyLevel: 4,
    description: 'Biofuels engineering with specific productivity targets',
  },
  {
    id: 'E3',
    category: 'domain',
    query: 'Design passive safety system for molten salt reactor using freeze plug and natural circulation cooling',
    expectedDomain: 'other',
    expectedChallenges: ['Nuclear domain', 'Safety-critical', 'Novel reactor type'],
    difficultyLevel: 5,
    description: 'Nuclear advanced - molten salt reactor safety',
  },
  {
    id: 'E4',
    category: 'domain',
    query: 'Develop graphene/MnO2 hybrid electrode achieving >500 F/g specific capacitance with 10,000 cycle stability',
    expectedDomain: 'battery-storage',
    expectedChallenges: ['Supercapacitor focus', 'Specific capacitance target', 'Cycle stability'],
    difficultyLevel: 4,
    description: 'Supercapacitors with specific performance metrics',
  },
  {
    id: 'E5',
    category: 'domain',
    query: 'Model optimal placement of 100MW battery storage in IEEE 118-bus system for renewable intermittency smoothing',
    expectedDomain: 'grid-optimization',
    expectedChallenges: ['Grid integration', 'Optimization problem', 'Standard test system'],
    difficultyLevel: 4,
    description: 'Grid integration modeling with specific system',
  },
]

// =============================================================================
// Export All Prompts
// =============================================================================

export const ALL_TEST_PROMPTS: TestPrompt[] = [
  ...BASIC_PROMPTS,
  ...STANDARD_PROMPTS,
  ...TECHNICAL_PROMPTS,
  ...EDGE_CASE_PROMPTS,
  ...DOMAIN_PROMPTS,
]

export const PROMPTS_BY_CATEGORY: Record<PromptCategory, TestPrompt[]> = {
  basic: BASIC_PROMPTS,
  standard: STANDARD_PROMPTS,
  technical: TECHNICAL_PROMPTS,
  edge: EDGE_CASE_PROMPTS,
  domain: DOMAIN_PROMPTS,
}

/**
 * Get prompts by category
 */
export function getPromptsByCategory(category: PromptCategory): TestPrompt[] {
  return PROMPTS_BY_CATEGORY[category]
}

/**
 * Get prompt by ID
 */
export function getPromptById(id: string): TestPrompt | undefined {
  return ALL_TEST_PROMPTS.find(p => p.id === id)
}

/**
 * Get prompts by IDs
 */
export function getPromptsByIds(ids: string[]): TestPrompt[] {
  return ALL_TEST_PROMPTS.filter(p => ids.includes(p.id))
}

/**
 * Get prompts by difficulty level
 */
export function getPromptsByDifficulty(minLevel: number, maxLevel?: number): TestPrompt[] {
  const max = maxLevel ?? 5
  return ALL_TEST_PROMPTS.filter(p => p.difficultyLevel >= minLevel && p.difficultyLevel <= max)
}

/**
 * Get a quick test set (one from each category)
 */
export function getQuickTestSet(): TestPrompt[] {
  return [
    BASIC_PROMPTS[0],      // A1
    STANDARD_PROMPTS[0],   // B1
    TECHNICAL_PROMPTS[0],  // C1
    EDGE_CASE_PROMPTS[0],  // D1
    DOMAIN_PROMPTS[0],     // E1
  ]
}

/**
 * Summary statistics about the test suite
 */
export const TEST_SUITE_INFO = {
  totalPrompts: ALL_TEST_PROMPTS.length,
  categories: Object.keys(PROMPTS_BY_CATEGORY).length,
  promptsPerCategory: 5,
  difficultyDistribution: {
    level1: ALL_TEST_PROMPTS.filter(p => p.difficultyLevel === 1).length,
    level2: ALL_TEST_PROMPTS.filter(p => p.difficultyLevel === 2).length,
    level3: ALL_TEST_PROMPTS.filter(p => p.difficultyLevel === 3).length,
    level4: ALL_TEST_PROMPTS.filter(p => p.difficultyLevel === 4).length,
    level5: ALL_TEST_PROMPTS.filter(p => p.difficultyLevel === 5).length,
  },
}
