/**
 * Experiments Export API
 *
 * POST /api/experiments/export
 *
 * Takes an ExperimentProtocol and generates an ExergyExperimentFile
 * with AI-suggested simulation parameters for use in the Simulations page.
 */

import { NextRequest, NextResponse } from 'next/server'
import { aiRouter } from '@/lib/ai/model-router'
import type { ExperimentProtocol, FailureAnalysis } from '@/types/experiment'
import type {
  ExergyExperimentFile,
  SimulationSuggestion,
  ExperimentDomain,
  SimulationParameter,
  ExpectedOutput,
} from '@/types/exergy-experiment'
import type { SimulationType, SimulationTier, BoundaryCondition } from '@/lib/simulation/types'

// ============================================================================
// Request/Response Types
// ============================================================================

interface ExportRequest {
  protocol: ExperimentProtocol
  failureAnalysis?: FailureAnalysis
  targetTier?: SimulationTier
  generateSimulationSuggestions?: boolean
}

interface ExportResponse {
  success: boolean
  file?: ExergyExperimentFile
  error?: string
}

// ============================================================================
// Domain Mapping
// ============================================================================

function mapDomainToExperimentDomain(domain: string): ExperimentDomain {
  const domainMap: Record<string, ExperimentDomain> = {
    'solar energy': 'solar',
    'solar': 'solar',
    'photovoltaic': 'solar',
    'pv': 'solar',
    'wind': 'wind',
    'wind energy': 'wind',
    'wind turbine': 'wind',
    'battery': 'battery',
    'battery storage': 'battery',
    'energy storage': 'battery',
    'lithium': 'battery',
    'hydrogen': 'hydrogen',
    'fuel cell': 'hydrogen',
    'electrolyzer': 'hydrogen',
    'h2': 'hydrogen',
    'geothermal': 'geothermal',
    'biomass': 'biomass',
    'bioenergy': 'biomass',
    'biofuel': 'biomass',
    'carbon capture': 'carbon-capture',
    'ccs': 'carbon-capture',
    'carbon-capture': 'carbon-capture',
    'energy efficiency': 'energy-efficiency',
    'efficiency': 'energy-efficiency',
    'grid': 'grid-optimization',
    'smart grid': 'grid-optimization',
    'grid-optimization': 'grid-optimization',
    'materials': 'materials-science',
    'materials science': 'materials-science',
    'catalyst': 'materials-science',
  }

  const lowerDomain = domain.toLowerCase()
  return domainMap[lowerDomain] || 'materials-science'
}

// ============================================================================
// AI Simulation Suggestion Generator
// ============================================================================

async function generateAISimulationSuggestions(
  protocol: ExperimentProtocol,
  targetTier: SimulationTier = 'tier1'
): Promise<SimulationSuggestion> {
  const prompt = `As a simulation expert, analyze this experiment protocol and suggest optimal simulation parameters.

EXPERIMENT PROTOCOL:
Title: ${protocol.title}
Domain: ${protocol.goal.domain}
Description: ${protocol.goal.description}
Objectives: ${protocol.goal.objectives.join(', ')}

Materials:
${protocol.materials.map((m) => `- ${m.name}: ${m.quantity} ${m.unit}`).join('\n')}

Equipment:
${protocol.equipment.join(', ')}

Steps:
${protocol.steps.map((s) => `${s.step}. ${s.title}: ${s.description}`).join('\n')}

Expected Results: ${protocol.expectedResults}

Based on this experiment, provide simulation suggestions in the following JSON format:
{
  "simulationType": "thermodynamic" | "electrochemical" | "cfd" | "kinetics" | "heat-transfer" | "mass-transfer" | "materials" | "optimization",
  "reasoning": "Brief explanation of why this simulation type is appropriate",
  "confidence": 0-100,
  "parameters": [
    { "name": "parameter name", "value": number, "unit": "unit", "description": "what this parameter represents" }
  ],
  "boundaryConditions": [
    { "name": "condition name", "type": "dirichlet" | "neumann" | "robin" | "periodic", "value": number, "unit": "unit", "location": "where applied" }
  ],
  "expectedOutputs": [
    { "name": "output name", "expectedRange": [min, max], "unit": "unit", "description": "what to expect" }
  ],
  "alternativeTypes": ["other simulation types that could work"]
}

Consider:
1. The physical phenomena involved (heat transfer, fluid flow, reactions, etc.)
2. The scale of the experiment (lab, pilot, industrial)
3. The accuracy requirements based on the objectives
4. Typical values for the domain

Respond ONLY with the JSON object, no other text.`

  try {
    const response = await aiRouter.execute('experiment-design', prompt, {
      temperature: 0.3,
      maxTokens: 2000,
    })

    // Parse the AI response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Failed to parse AI response')
    }

    const suggestion = JSON.parse(jsonMatch[0])

    // Validate and transform the response
    const simulationType = validateSimulationType(suggestion.simulationType)
    const parameters: SimulationParameter[] = (suggestion.parameters || []).map(
      (p: { name: string; value: number; unit: string; description?: string }) => ({
        name: p.name,
        value: p.value,
        unit: p.unit,
        description: p.description,
      })
    )

    const boundaryConditions: BoundaryCondition[] = (suggestion.boundaryConditions || []).map(
      (bc: { name: string; type: string; value: number; unit: string; location?: string }) => ({
        name: bc.name,
        type: validateBoundaryType(bc.type),
        value: bc.value,
        unit: bc.unit,
        location: bc.location,
      })
    )

    const expectedOutputs: ExpectedOutput[] = (suggestion.expectedOutputs || []).map(
      (eo: { name: string; expectedRange: [number, number]; unit: string; description?: string }) => ({
        name: eo.name,
        expectedRange: eo.expectedRange as [number, number],
        unit: eo.unit,
        description: eo.description,
      })
    )

    // Estimate cost and duration based on tier and simulation type
    const { estimatedCost, estimatedDuration } = estimateCostAndDuration(
      simulationType,
      targetTier
    )

    return {
      suggestedType: simulationType,
      suggestedTier: targetTier,
      parameters,
      boundaryConditions,
      expectedOutputs,
      reasoning: suggestion.reasoning || 'AI-generated simulation suggestion',
      confidence: Math.min(100, Math.max(0, suggestion.confidence || 70)),
      alternativeTypes: (suggestion.alternativeTypes || []).map(validateSimulationType),
      estimatedCost,
      estimatedDuration,
    }
  } catch (error) {
    console.error('AI suggestion generation failed:', error)
    // Return default suggestions based on domain
    return getDefaultSuggestions(protocol.goal.domain, targetTier)
  }
}

function validateSimulationType(type: string): SimulationType {
  const validTypes: SimulationType[] = [
    'thermodynamic',
    'electrochemical',
    'cfd',
    'kinetics',
    'heat-transfer',
    'mass-transfer',
    'materials',
    'optimization',
  ]
  return validTypes.includes(type as SimulationType)
    ? (type as SimulationType)
    : 'thermodynamic'
}

function validateBoundaryType(type: string): 'dirichlet' | 'neumann' | 'robin' | 'periodic' {
  const validTypes = ['dirichlet', 'neumann', 'robin', 'periodic'] as const
  return validTypes.includes(type as (typeof validTypes)[number])
    ? (type as (typeof validTypes)[number])
    : 'dirichlet'
}

function estimateCostAndDuration(
  simType: SimulationType,
  tier: SimulationTier
): { estimatedCost: number; estimatedDuration: number } {
  const baseCosts: Record<SimulationTier, number> = {
    tier1: 0,
    tier2: 0.01,
    tier3: 0.05,
  }

  const baseDurations: Record<SimulationTier, number> = {
    tier1: 5, // 5 seconds
    tier2: 60, // 1 minute
    tier3: 300, // 5 minutes
  }

  const typeMultipliers: Record<SimulationType, number> = {
    thermodynamic: 1,
    electrochemical: 1.2,
    cfd: 3,
    kinetics: 1.5,
    'heat-transfer': 1.5,
    'mass-transfer': 1.5,
    materials: 2,
    optimization: 2,
  }

  const multiplier = typeMultipliers[simType] || 1

  return {
    estimatedCost: baseCosts[tier] * multiplier,
    estimatedDuration: baseDurations[tier] * multiplier,
  }
}

function getDefaultSuggestions(
  domain: string,
  tier: SimulationTier
): SimulationSuggestion {
  const domainDefaults: Record<string, Partial<SimulationSuggestion>> = {
    solar: {
      suggestedType: 'thermodynamic',
      parameters: [
        { name: 'Irradiance', value: 1000, unit: 'W/m2', description: 'Solar irradiance' },
        { name: 'Cell Temperature', value: 25, unit: 'C', description: 'Operating temperature' },
        { name: 'Module Efficiency', value: 20, unit: '%', description: 'Conversion efficiency' },
      ],
      expectedOutputs: [
        { name: 'Power Output', expectedRange: [0, 500], unit: 'W', description: 'Electrical power' },
        { name: 'Energy Yield', expectedRange: [0, 2000], unit: 'Wh/day', description: 'Daily energy' },
      ],
    },
    battery: {
      suggestedType: 'electrochemical',
      parameters: [
        { name: 'Capacity', value: 100, unit: 'Ah', description: 'Battery capacity' },
        { name: 'Voltage', value: 3.7, unit: 'V', description: 'Nominal voltage' },
        { name: 'C-Rate', value: 1, unit: 'C', description: 'Charge/discharge rate' },
      ],
      expectedOutputs: [
        { name: 'Cycle Efficiency', expectedRange: [85, 98], unit: '%', description: 'Round-trip efficiency' },
        { name: 'State of Charge', expectedRange: [0, 100], unit: '%', description: 'SOC' },
      ],
    },
    hydrogen: {
      suggestedType: 'electrochemical',
      parameters: [
        { name: 'Current Density', value: 1, unit: 'A/cm2', description: 'Operating current' },
        { name: 'Temperature', value: 80, unit: 'C', description: 'Operating temperature' },
        { name: 'Pressure', value: 1, unit: 'bar', description: 'Operating pressure' },
      ],
      expectedOutputs: [
        { name: 'H2 Production Rate', expectedRange: [0, 10], unit: 'kg/h', description: 'Hydrogen output' },
        { name: 'Efficiency', expectedRange: [60, 80], unit: '%', description: 'System efficiency' },
      ],
    },
    wind: {
      suggestedType: 'cfd',
      parameters: [
        { name: 'Wind Speed', value: 10, unit: 'm/s', description: 'Incoming wind speed' },
        { name: 'Rotor Diameter', value: 100, unit: 'm', description: 'Turbine rotor size' },
        { name: 'Hub Height', value: 80, unit: 'm', description: 'Tower height' },
      ],
      expectedOutputs: [
        { name: 'Power Output', expectedRange: [0, 5000], unit: 'kW', description: 'Electrical power' },
        { name: 'Capacity Factor', expectedRange: [25, 45], unit: '%', description: 'Average utilization' },
      ],
    },
  }

  const defaults = domainDefaults[domain.toLowerCase()] || domainDefaults.solar
  const { estimatedCost, estimatedDuration } = estimateCostAndDuration(
    defaults.suggestedType || 'thermodynamic',
    tier
  )

  return {
    suggestedType: defaults.suggestedType || 'thermodynamic',
    suggestedTier: tier,
    parameters: defaults.parameters || [],
    boundaryConditions: [],
    expectedOutputs: defaults.expectedOutputs || [],
    reasoning: `Default simulation configuration for ${domain} experiments`,
    confidence: 60,
    alternativeTypes: ['optimization'],
    estimatedCost,
    estimatedDuration,
  }
}

// ============================================================================
// API Handler
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<ExportResponse>> {
  try {
    const body = (await request.json()) as ExportRequest
    const { protocol, failureAnalysis, targetTier = 'tier1', generateSimulationSuggestions = true } = body

    // Validate required fields
    if (!protocol || !protocol.id || !protocol.title) {
      return NextResponse.json(
        { success: false, error: 'Invalid experiment protocol' },
        { status: 400 }
      )
    }

    // Map domain
    const domain = mapDomainToExperimentDomain(protocol.goal.domain)

    // Generate simulation suggestions if requested
    let simulation: SimulationSuggestion
    if (generateSimulationSuggestions) {
      simulation = await generateAISimulationSuggestions(protocol, targetTier)
    } else {
      simulation = getDefaultSuggestions(protocol.goal.domain, targetTier)
    }

    // Build the ExergyExperimentFile
    const file: ExergyExperimentFile = {
      version: '1.0.0',
      metadata: {
        id: protocol.id,
        title: protocol.title,
        createdAt: protocol.createdAt || new Date().toISOString(),
        domain,
        description: protocol.goal.description,
      },
      protocol: {
        materials: protocol.materials,
        equipment: protocol.equipment,
        steps: protocol.steps,
        safetyWarnings: protocol.safetyWarnings,
        expectedResults: protocol.expectedResults,
        estimatedDuration: protocol.estimatedDuration,
        estimatedCost: protocol.estimatedCost,
      },
      failureAnalysis: failureAnalysis || {
        potentialFailures: [],
        riskScore: 0,
        recommendations: [],
      },
      simulation,
    }

    return NextResponse.json({
      success: true,
      file,
    })
  } catch (error) {
    console.error('Export failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
      },
      { status: 500 }
    )
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    description: 'Experiments Export API',
    endpoints: {
      POST: {
        description: 'Export experiment protocol to .exergy-experiment.json format',
        body: {
          protocol: 'ExperimentProtocol (required)',
          failureAnalysis: 'FailureAnalysis (optional)',
          targetTier: 'tier1 | tier2 | tier3 (optional, default: tier1)',
          generateSimulationSuggestions: 'boolean (optional, default: true)',
        },
        returns: {
          success: 'boolean',
          file: 'ExergyExperimentFile',
          error: 'string (if failed)',
        },
      },
    },
  })
}
