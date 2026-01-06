/**
 * Scientific Task Instructions for Nemotron Embeddings
 *
 * NVIDIA's Llama-Embed-Nemotron-8B supports instruction-aware embeddings,
 * which improve retrieval quality when the instruction matches the task.
 *
 * These instructions are optimized for clean energy research tasks:
 * - Scientific literature retrieval
 * - Hypothesis validation
 * - Materials science search
 * - Patent discovery
 *
 * @see nvidia-nemotron.ts - Uses these instructions
 * @see research-agent.ts - Task-specific search
 */

// ============================================================================
// Types
// ============================================================================

export type ScientificTaskType =
  | 'research'    // General scientific literature retrieval
  | 'hypothesis'  // Hypothesis validation and evidence gathering
  | 'materials'   // Materials science and property search
  | 'patent'      // Patent and IP discovery
  | 'general'     // General clean energy search

// ============================================================================
// Scientific Instructions
// ============================================================================

/**
 * Task-specific instructions for Nemotron embeddings
 *
 * These instructions are prepended to queries in the format:
 * "Instruct: {instruction}\nQuery: {user_query}"
 *
 * This significantly improves retrieval quality for domain-specific tasks.
 */
export const SCIENTIFIC_INSTRUCTIONS: Record<ScientificTaskType, string> = {
  research:
    'Retrieve scientific papers about clean energy technology and sustainable systems',

  hypothesis:
    'Find research supporting or contradicting energy conversion hypotheses',

  materials:
    'Search for material properties relevant to energy storage and conversion',

  patent:
    'Retrieve patents related to clean energy innovation and manufacturing',

  general:
    'Retrieve relevant scientific documents for clean energy research',
}

// ============================================================================
// Extended Instructions for Specific Domains
// ============================================================================

/**
 * Domain-specific instructions for more targeted retrieval
 */
export const DOMAIN_INSTRUCTIONS: Record<string, string> = {
  // Solar energy
  'solar-pv':
    'Find research on photovoltaic solar cell efficiency, materials, and degradation',
  'solar-thermal':
    'Retrieve papers on concentrated solar power, thermal storage, and heat transfer',
  'perovskite':
    'Search for perovskite solar cell stability, efficiency, and manufacturing research',

  // Hydrogen and fuel cells
  'hydrogen-production':
    'Find papers on electrolysis, hydrogen generation, and water splitting',
  'fuel-cells':
    'Retrieve research on fuel cell catalysts, membranes, and performance',
  'electrolyzer':
    'Search for electrolyzer efficiency, durability, and cost reduction',

  // Energy storage
  'battery':
    'Find research on battery chemistry, degradation, and performance optimization',
  'lithium-ion':
    'Retrieve papers on lithium-ion battery materials and safety',
  'solid-state':
    'Search for solid-state battery electrolytes and manufacturing',
  'thermal-storage':
    'Find research on thermal energy storage materials and systems',

  // Wind energy
  'wind-onshore':
    'Retrieve papers on onshore wind turbine design and performance',
  'wind-offshore':
    'Search for offshore wind energy challenges and foundations',

  // Grid and integration
  'grid-integration':
    'Find research on renewable energy grid integration and stability',
  'power-electronics':
    'Retrieve papers on inverters, converters, and power electronics',

  // Carbon capture
  'carbon-capture':
    'Search for carbon capture and storage technologies and materials',
  'dac':
    'Find research on direct air capture efficiency and economics',

  // Economics and policy
  'techno-economic':
    'Retrieve techno-economic analysis of clean energy technologies',
  'lcoe':
    'Search for levelized cost of energy analysis and projections',
  'policy':
    'Find research on clean energy policy and market mechanisms',
}

// ============================================================================
// Instruction Selection Helpers
// ============================================================================

/**
 * Get the best instruction for a given query
 *
 * Analyzes the query content to select the most relevant instruction.
 */
export function selectInstruction(query: string): string {
  const queryLower = query.toLowerCase()

  // Check for domain-specific keywords
  for (const [domain, instruction] of Object.entries(DOMAIN_INSTRUCTIONS)) {
    const keywords = domain.split('-')
    if (keywords.some(kw => queryLower.includes(kw))) {
      return instruction
    }
  }

  // Check for general task type keywords
  if (
    queryLower.includes('hypothesis') ||
    queryLower.includes('validate') ||
    queryLower.includes('verify')
  ) {
    return SCIENTIFIC_INSTRUCTIONS.hypothesis
  }

  if (
    queryLower.includes('material') ||
    queryLower.includes('catalyst') ||
    queryLower.includes('membrane')
  ) {
    return SCIENTIFIC_INSTRUCTIONS.materials
  }

  if (
    queryLower.includes('patent') ||
    queryLower.includes('intellectual property') ||
    queryLower.includes('invention')
  ) {
    return SCIENTIFIC_INSTRUCTIONS.patent
  }

  // Default to research instruction
  return SCIENTIFIC_INSTRUCTIONS.research
}

/**
 * Get instruction by task type
 */
export function getInstruction(taskType: ScientificTaskType): string {
  return SCIENTIFIC_INSTRUCTIONS[taskType] || SCIENTIFIC_INSTRUCTIONS.general
}

/**
 * Get instruction by domain
 */
export function getDomainInstruction(domain: string): string | undefined {
  return DOMAIN_INSTRUCTIONS[domain]
}

/**
 * List all available task types
 */
export function getAvailableTaskTypes(): ScientificTaskType[] {
  return Object.keys(SCIENTIFIC_INSTRUCTIONS) as ScientificTaskType[]
}

/**
 * List all available domains
 */
export function getAvailableDomains(): string[] {
  return Object.keys(DOMAIN_INSTRUCTIONS)
}

// ============================================================================
// Query Formatting
// ============================================================================

/**
 * Format a query with instruction for Nemotron
 *
 * Nemotron expects queries in the format:
 * "Instruct: {instruction}\nQuery: {query}"
 */
export function formatQueryWithInstruction(
  query: string,
  taskType?: ScientificTaskType,
  customInstruction?: string
): string {
  const instruction = customInstruction ||
    (taskType ? SCIENTIFIC_INSTRUCTIONS[taskType] : selectInstruction(query))

  return `Instruct: ${instruction}\nQuery: ${query}`
}

/**
 * Format multiple queries with the same instruction
 */
export function formatQueriesWithInstruction(
  queries: string[],
  taskType?: ScientificTaskType,
  customInstruction?: string
): string[] {
  const instruction = customInstruction ||
    (taskType ? SCIENTIFIC_INSTRUCTIONS[taskType] : SCIENTIFIC_INSTRUCTIONS.general)

  return queries.map(query => `Instruct: ${instruction}\nQuery: ${query}`)
}

export default SCIENTIFIC_INSTRUCTIONS
