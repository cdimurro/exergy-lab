/**
 * Domain to arXiv Category Mapping
 *
 * Maps clean energy research domains to arXiv subject categories
 * for more precise preprint searches.
 *
 * arXiv categories: https://arxiv.org/category_taxonomy
 */

export const domainToArxivCategory: Record<string, string> = {
  // Solar Energy
  'solar': 'physics.app-ph', // Applied Physics
  'solar-pv': 'cond-mat.mtrl-sci', // Materials Science
  'solar-thermal': 'physics.app-ph',

  // Wind Energy
  'wind': 'physics.flu-dyn', // Fluid Dynamics
  'wind-turbine': 'physics.app-ph',

  // Energy Storage
  'battery-storage': 'cond-mat.mtrl-sci', // Materials Science
  'battery': 'cond-mat.mtrl-sci',
  'thermal-storage': 'physics.app-ph',
  'hydrogen-storage': 'physics.chem-ph', // Chemical Physics

  // Hydrogen
  'hydrogen': 'physics.chem-ph',
  'fuel-cells': 'physics.chem-ph',
  'electrolysis': 'physics.chem-ph',

  // Geothermal
  'geothermal': 'physics.geo-ph', // Geophysics

  // Biomass & Bioenergy
  'biomass': 'q-bio', // Quantitative Biology
  'biofuels': 'q-bio',
  'biogas': 'q-bio',

  // Carbon Capture
  'carbon-capture': 'physics.chem-ph',
  'ccs': 'physics.chem-ph',
  'direct-air-capture': 'physics.chem-ph',

  // Energy Efficiency
  'energy-efficiency': 'physics.app-ph',
  'building-efficiency': 'physics.app-ph',
  'hvac': 'physics.app-ph',

  // Grid & Optimization
  'grid-optimization': 'cs.SY', // Systems and Control
  'smart-grid': 'cs.SY',
  'energy-management': 'cs.SY',
  'demand-response': 'cs.SY',

  // Materials Science
  'materials-science': 'cond-mat.mtrl-sci',
  'nanomaterials': 'cond-mat.mtrl-sci',
  'catalysis': 'physics.chem-ph',

  // Nuclear
  'nuclear': 'physics.gen-ph', // General Physics
  'fusion': 'physics.plasm-ph', // Plasma Physics

  // Hydro & Marine
  'hydro': 'physics.flu-dyn',
  'wave-energy': 'physics.flu-dyn',
  'tidal-energy': 'physics.flu-dyn',

  // Other
  'machine-learning': 'cs.LG', // Machine Learning
  'ai': 'cs.AI', // Artificial Intelligence
  'optimization': 'math.OC', // Optimization and Control
}

/**
 * Get primary arXiv category for a domain
 */
export function getArxivCategory(domain: string): string | null {
  return domainToArxivCategory[domain] || null
}

/**
 * Get all relevant arXiv categories for multiple domains
 * Removes duplicates
 */
export function getArxivCategories(domains: string[]): string[] {
  const categories = new Set<string>()

  for (const domain of domains) {
    const category = domainToArxivCategory[domain]
    if (category) {
      categories.add(category)
    }
  }

  return Array.from(categories)
}

/**
 * Get human-readable name for arXiv category
 */
export const arxivCategoryNames: Record<string, string> = {
  'physics.app-ph': 'Applied Physics',
  'physics.flu-dyn': 'Fluid Dynamics',
  'physics.chem-ph': 'Chemical Physics',
  'physics.geo-ph': 'Geophysics',
  'physics.gen-ph': 'General Physics',
  'physics.plasm-ph': 'Plasma Physics',
  'cond-mat.mtrl-sci': 'Materials Science',
  'q-bio': 'Quantitative Biology',
  'cs.SY': 'Systems and Control',
  'cs.LG': 'Machine Learning',
  'cs.AI': 'Artificial Intelligence',
  'math.OC': 'Optimization and Control'
}

/**
 * Get category name
 */
export function getCategoryName(category: string): string {
  return arxivCategoryNames[category] || category
}
