/**
 * Tier 1: Rapid Feasibility Check
 *
 * Quick analytical validation using thermodynamic limits and literature data.
 * Executes in <1 minute with no external compute costs.
 */

import type { Hypothesis } from '@/lib/ai/agents/creative-agent'
import type {
  Tier1FeasibilityResult,
  ThermodynamicCheck,
  SafetyFlag,
  LiteratureSupport,
} from '@/types/experiment-tiers'

// ============================================================================
// Thermodynamic Limits Database
// ============================================================================

const THERMODYNAMIC_LIMITS = {
  // Efficiency limits
  carnot: (tHot: number, tCold: number) => (tHot - tCold) / tHot,
  betz: 0.593,                    // Wind turbine limit
  shockleyQueisser: 0.337,        // Single-junction solar cell
  concentratedSolar: 0.86,        // With concentration
  electrolysisVoltage: 1.48,      // Thermoneutral voltage (V)
  fuelCellEfficiency: 0.83,       // Theoretical max

  // Material limits
  maxBandGap: 4.0,                // eV, practical limit for solar
  minBandGap: 0.5,                // eV, practical limit
  maxDensity: 25,                 // g/cm³, heaviest practical materials
  maxMeltingPoint: 4000,          // °C, tungsten ~3400°C

  // Process limits
  maxTemperature: 2500,           // °C, practical lab limit
  maxPressure: 1000,              // bar, practical lab limit
  minPressure: 1e-10,             // bar, ultra-high vacuum
}

// ============================================================================
// Safety Hazard Database
// ============================================================================

interface HazardKeyword {
  keywords: string[]
  category: SafetyFlag['category']
  severity: SafetyFlag['severity']
  description: string
  mitigation: string
}

const HAZARD_DATABASE: HazardKeyword[] = [
  {
    keywords: ['hydrogen', 'h2', 'hydride'],
    category: 'chemical',
    severity: 'high',
    description: 'Hydrogen is highly flammable and can form explosive mixtures with air',
    mitigation: 'Use inert atmosphere, proper ventilation, and explosion-proof equipment',
  },
  {
    keywords: ['lithium', 'sodium', 'potassium', 'alkali metal'],
    category: 'chemical',
    severity: 'high',
    description: 'Alkali metals react violently with water and air',
    mitigation: 'Handle in glovebox with inert atmosphere, use mineral oil storage',
  },
  {
    keywords: ['fluorine', 'hf', 'hydrofluoric'],
    category: 'chemical',
    severity: 'critical',
    description: 'Fluorine compounds are extremely toxic and corrosive',
    mitigation: 'Specialized training required, calcium gluconate on hand',
  },
  {
    keywords: ['cyanide', 'cn'],
    category: 'chemical',
    severity: 'critical',
    description: 'Cyanide compounds are acutely toxic',
    mitigation: 'Strict protocols, antidote kit available',
  },
  {
    keywords: ['high temperature', 'furnace', '>500°c', '>800°c', '>1000°c'],
    category: 'thermal',
    severity: 'medium',
    description: 'High temperatures pose burn risks and fire hazards',
    mitigation: 'Heat-resistant PPE, proper shielding, fire suppression nearby',
  },
  {
    keywords: ['high pressure', '>10 bar', '>50 bar', '>100 bar', 'autoclave'],
    category: 'pressure',
    severity: 'high',
    description: 'High pressure systems can cause explosive failure',
    mitigation: 'Pressure relief valves, blast shields, regular inspection',
  },
  {
    keywords: ['x-ray', 'synchrotron', 'gamma', 'radioactive'],
    category: 'radiation',
    severity: 'high',
    description: 'Ionizing radiation exposure risk',
    mitigation: 'Proper shielding, dosimetry, time/distance/shielding protocols',
  },
  {
    keywords: ['laser', 'uv', 'ultraviolet'],
    category: 'radiation',
    severity: 'medium',
    description: 'Non-ionizing radiation can cause eye and skin damage',
    mitigation: 'Appropriate eyewear, enclosures, warning signs',
  },
  {
    keywords: ['nanoparticle', 'nanomaterial', 'quantum dot'],
    category: 'chemical',
    severity: 'medium',
    description: 'Nanomaterials may have unknown toxicity profiles',
    mitigation: 'Fume hood, N95+ respirator, minimize aerosolization',
  },
]

// ============================================================================
// Main Feasibility Check Functions
// ============================================================================

/**
 * Run Tier 1 rapid feasibility check on a hypothesis
 */
export async function runTier1Feasibility(
  hypothesis: Hypothesis
): Promise<Tier1FeasibilityResult> {
  const startTime = Date.now()

  // Run all checks in parallel
  const [
    thermodynamicChecks,
    safetyFlags,
    literatureSupport,
    materialsCheck,
  ] = await Promise.all([
    checkThermodynamicLimits(hypothesis),
    screenSafetyHazards(hypothesis),
    searchLiteraturePrecedent(hypothesis),
    checkMaterialsProjectStability(hypothesis),
  ])

  // Calculate overall feasibility
  const thermoPassed = thermodynamicChecks.every(c => c.passed)
  const noBlockingSafety = !safetyFlags.some(f => f.severity === 'critical' && f.requiresExpertReview)
  const hasLiteratureSupport = literatureSupport.length >= 2
  const materialsAvailable = (materialsCheck?.materialsFound ?? 0) > 0

  const feasible = thermoPassed && noBlockingSafety && (hasLiteratureSupport || materialsAvailable)

  // Calculate confidence
  let confidence = 50 // Base confidence
  if (thermoPassed) confidence += 20
  if (hasLiteratureSupport) confidence += 15
  if (materialsAvailable) confidence += 10
  if (noBlockingSafety) confidence += 5
  confidence = Math.min(100, confidence)

  // Determine if escalation is needed
  const escalationSuggested = !feasible || confidence < 60 || safetyFlags.some(f => f.severity === 'high')
  const escalationReason = !feasible
    ? 'Hypothesis failed basic feasibility checks'
    : confidence < 60
    ? 'Low confidence requires more detailed analysis'
    : safetyFlags.some(f => f.severity === 'high')
    ? 'High-risk safety concerns require expert review'
    : undefined

  // Generate rough protocol outline
  const roughProtocolOutline = generateRoughProtocol(hypothesis, thermodynamicChecks, safetyFlags)

  // Generate recommendations
  const recommendations = generateRecommendations(
    thermodynamicChecks,
    safetyFlags,
    literatureSupport,
    materialsCheck
  )

  return {
    tier: 1,
    feasible,
    confidence,
    thermodynamicChecks,
    materialsProjectCheck: materialsCheck,
    safetyFlags,
    literatureSupport,
    roughProtocolOutline,
    recommendations,
    escalationSuggested,
    escalationReason,
    executionTime: Date.now() - startTime,
  }
}

// ============================================================================
// Thermodynamic Checks
// ============================================================================

async function checkThermodynamicLimits(hypothesis: Hypothesis): Promise<ThermodynamicCheck[]> {
  const checks: ThermodynamicCheck[] = []
  const statement = hypothesis.statement.toLowerCase()
  const predictions = hypothesis.predictions

  // Check efficiency claims
  for (const prediction of predictions) {
    if (!prediction.expectedValue) continue
    const value = prediction.expectedValue
    const predStatement = prediction.statement.toLowerCase()

    // Solar efficiency check
    if (predStatement.includes('solar') && predStatement.includes('efficiency')) {
      const limit = prediction.statement.includes('concentrated')
        ? THERMODYNAMIC_LIMITS.concentratedSolar
        : THERMODYNAMIC_LIMITS.shockleyQueisser
      const passed = value / 100 <= limit
      checks.push({
        name: 'Solar Efficiency Limit',
        limit: prediction.statement.includes('concentrated')
          ? 'Concentrated solar (86%)'
          : 'Shockley-Queisser (33.7%)',
        expectedValue: value,
        actualValue: limit * 100,
        unit: '%',
        passed,
        reasoning: passed
          ? `Claimed ${value}% is within theoretical limit`
          : `Claimed ${value}% exceeds theoretical limit of ${(limit * 100).toFixed(1)}%`,
      })
    }

    // Wind efficiency check
    if (predStatement.includes('wind') && predStatement.includes('efficiency')) {
      const passed = value / 100 <= THERMODYNAMIC_LIMITS.betz
      checks.push({
        name: 'Betz Limit',
        limit: 'Wind turbine (59.3%)',
        expectedValue: value,
        actualValue: THERMODYNAMIC_LIMITS.betz * 100,
        unit: '%',
        passed,
        reasoning: passed
          ? `Claimed ${value}% is within Betz limit`
          : `Claimed ${value}% exceeds Betz limit of 59.3%`,
      })
    }

    // Electrolysis voltage check
    if (predStatement.includes('electrolysis') && predStatement.includes('voltage')) {
      const passed = value >= THERMODYNAMIC_LIMITS.electrolysisVoltage * 0.95
      checks.push({
        name: 'Electrolysis Thermodynamics',
        limit: 'Thermoneutral voltage (1.48V)',
        expectedValue: value,
        actualValue: THERMODYNAMIC_LIMITS.electrolysisVoltage,
        unit: 'V',
        passed,
        reasoning: passed
          ? `Operating voltage ${value}V is thermodynamically feasible`
          : `Operating voltage ${value}V is below thermoneutral voltage`,
      })
    }

    // Fuel cell efficiency
    if (predStatement.includes('fuel cell') && predStatement.includes('efficiency')) {
      const passed = value / 100 <= THERMODYNAMIC_LIMITS.fuelCellEfficiency
      checks.push({
        name: 'Fuel Cell Efficiency Limit',
        limit: 'Theoretical maximum (83%)',
        expectedValue: value,
        actualValue: THERMODYNAMIC_LIMITS.fuelCellEfficiency * 100,
        unit: '%',
        passed,
        reasoning: passed
          ? `Claimed ${value}% is within theoretical limit`
          : `Claimed ${value}% exceeds theoretical maximum`,
      })
    }
  }

  // Check for Carnot efficiency in general heat engines
  if (statement.includes('heat engine') || statement.includes('thermal efficiency')) {
    // Look for temperature mentions
    const tempMatches = statement.match(/(\d+)\s*[°]?[ck]/gi)
    if (tempMatches && tempMatches.length >= 2) {
      checks.push({
        name: 'Carnot Efficiency Check',
        limit: 'Carnot limit based on temperatures',
        expectedValue: 0,
        unit: '%',
        passed: true,
        reasoning: 'Temperature-dependent Carnot limit should be calculated with specific values',
      })
    }
  }

  // If no specific checks, add a general pass
  if (checks.length === 0) {
    checks.push({
      name: 'General Thermodynamic Feasibility',
      limit: 'No specific limit violations detected',
      expectedValue: 0,
      unit: '',
      passed: true,
      reasoning: 'No obvious thermodynamic limit violations in hypothesis',
    })
  }

  return checks
}

// ============================================================================
// Safety Screening
// ============================================================================

async function screenSafetyHazards(hypothesis: Hypothesis): Promise<SafetyFlag[]> {
  const flags: SafetyFlag[] = []
  const searchText = [
    hypothesis.statement,
    hypothesis.title,
    ...hypothesis.predictions.map(p => p.statement),
    ...(hypothesis.mechanism?.steps || []).map(s => s.description),
  ].join(' ').toLowerCase()

  for (const hazard of HAZARD_DATABASE) {
    const found = hazard.keywords.some(keyword => searchText.includes(keyword.toLowerCase()))
    if (found) {
      flags.push({
        category: hazard.category,
        severity: hazard.severity,
        description: hazard.description,
        mitigation: hazard.mitigation,
        requiresExpertReview: hazard.severity === 'critical' || hazard.severity === 'high',
      })
    }
  }

  // Check for general high-temperature work
  const tempMatch = searchText.match(/(\d+)\s*[°]?c/i)
  if (tempMatch) {
    const temp = parseInt(tempMatch[1])
    if (temp > 500 && !flags.some(f => f.category === 'thermal')) {
      flags.push({
        category: 'thermal',
        severity: temp > 1000 ? 'high' : 'medium',
        description: `Operations at ${temp}°C require careful thermal management`,
        mitigation: 'Heat-resistant PPE, proper shielding, controlled heating/cooling rates',
        requiresExpertReview: temp > 1000,
      })
    }
  }

  return flags
}

// ============================================================================
// Literature Support
// ============================================================================

async function searchLiteraturePrecedent(hypothesis: Hypothesis): Promise<LiteratureSupport[]> {
  // In production, this would query Semantic Scholar, etc.
  // For now, extract from hypothesis supporting evidence
  return (hypothesis.supportingEvidence || []).map(evidence => ({
    finding: evidence.finding,
    citation: evidence.citation,
    relevance: evidence.relevance,
    year: extractYear(evidence.citation),
    sourceType: evidence.citation.toLowerCase().includes('patent') ? 'patent' as const : 'paper' as const,
  }))
}

function extractYear(citation: string): number {
  const match = citation.match(/\b(19|20)\d{2}\b/)
  return match ? parseInt(match[0]) : new Date().getFullYear()
}

// ============================================================================
// Materials Project Check
// ============================================================================

async function checkMaterialsProjectStability(hypothesis: Hypothesis): Promise<Tier1FeasibilityResult['materialsProjectCheck']> {
  // In production, this would query Materials Project API
  // For now, check if materials data is available in hypothesis
  const materials = hypothesis.requiredMaterials || []

  if (materials.length === 0) {
    return {
      materialsFound: 0,
      stabilityVerified: false,
    }
  }

  // Simulate Materials Project check
  const stableMaterials = materials.filter(m => m.stability === 'stable')

  return {
    materialsFound: materials.length,
    stabilityVerified: stableMaterials.length > 0,
    bandGapSuitable: materials.some(m => m.bandGap && m.bandGap > 0.5 && m.bandGap < 4.0),
    formationEnergyFavorable: true, // Would check actual values
  }
}

// ============================================================================
// Protocol Generation
// ============================================================================

function generateRoughProtocol(
  hypothesis: Hypothesis,
  thermoChecks: ThermodynamicCheck[],
  safetyFlags: SafetyFlag[]
): string[] {
  const steps: string[] = []

  // Safety preparation
  if (safetyFlags.length > 0) {
    steps.push(`Safety preparation: ${safetyFlags.map(f => f.mitigation).join('; ')}`)
  }

  // Material acquisition
  const materials = hypothesis.requiredMaterials || []
  if (materials.length > 0) {
    steps.push(`Acquire materials: ${materials.map(m => m.formula).join(', ')}`)
  }

  // Equipment setup based on variables
  const independentVars = hypothesis.variables?.independent || []
  if (independentVars.length > 0) {
    steps.push(`Configure equipment for: ${independentVars.map(v => v.name).join(', ')}`)
  }

  // Synthesis/preparation
  const mechanism = hypothesis.mechanism?.steps || []
  if (mechanism.length > 0) {
    mechanism.slice(0, 3).forEach((step, i) => {
      steps.push(`Step ${i + 1}: ${step.description}`)
    })
    if (mechanism.length > 3) {
      steps.push(`... and ${mechanism.length - 3} more steps`)
    }
  }

  // Characterization
  steps.push('Characterize product (XRD, SEM, basic spectroscopy)')

  // Performance testing
  const dependentVars = hypothesis.variables?.dependent || []
  if (dependentVars.length > 0) {
    steps.push(`Measure: ${dependentVars.map(v => v.name).join(', ')}`)
  }

  // Validation
  steps.push('Compare results to predictions and literature benchmarks')

  return steps
}

// ============================================================================
// Recommendations
// ============================================================================

function generateRecommendations(
  thermoChecks: ThermodynamicCheck[],
  safetyFlags: SafetyFlag[],
  literature: LiteratureSupport[],
  materialsCheck: Tier1FeasibilityResult['materialsProjectCheck']
): string[] {
  const recommendations: string[] = []

  // Thermodynamic recommendations
  const failedThermo = thermoChecks.filter(c => !c.passed)
  if (failedThermo.length > 0) {
    recommendations.push(
      `Revise efficiency claims: ${failedThermo.map(c => c.name).join(', ')} exceed theoretical limits`
    )
  }

  // Safety recommendations
  const criticalSafety = safetyFlags.filter(f => f.severity === 'critical')
  if (criticalSafety.length > 0) {
    recommendations.push(
      'Critical safety review required before proceeding - consult EHS specialist'
    )
  }

  // Literature recommendations
  if (literature.length < 2) {
    recommendations.push(
      'Additional literature review recommended to strengthen scientific basis'
    )
  }

  // Materials recommendations
  if (!materialsCheck?.materialsFound) {
    recommendations.push(
      'Identify specific materials and verify availability via Materials Project'
    )
  }

  if (recommendations.length === 0) {
    recommendations.push('Hypothesis passes initial feasibility screening - proceed to Tier 2')
  }

  return recommendations
}

// ============================================================================
// Exports
// ============================================================================

export {
  THERMODYNAMIC_LIMITS,
  checkThermodynamicLimits,
  screenSafetyHazards,
  searchLiteraturePrecedent,
  checkMaterialsProjectStability,
}
