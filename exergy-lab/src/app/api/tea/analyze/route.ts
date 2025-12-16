/**
 * TEA Analysis API Route
 * AI-powered extraction of TEA parameters from files and generation of insights
 */

import { NextRequest, NextResponse } from 'next/server'
import { aiRouter } from '@/lib/ai/model-router'
import type { ExtractedData, TEAParameters } from '@/lib/file-upload'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface AnalysisRequest {
  extractedData: ExtractedData[]
  projectName: string
  technology: string
  userInputs?: Partial<TEAParameters>
}

interface AnalysisResponse {
  parameters: TEAParameters
  insights: {
    marketAnalysis: string
    riskAssessment: string
    recommendations: string[]
    competitiveAdvantages: string[]
    potentialChallenges: string[]
  }
  dataQuality: {
    completeness: number // 0-100
    confidence: number // 0-100
    missingFields: string[]
  }
}

/**
 * POST /api/tea/analyze
 * Analyze uploaded files and extract TEA parameters
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalysisRequest

    if (!body.extractedData || body.extractedData.length === 0) {
      return NextResponse.json({ error: 'No data provided for analysis' }, { status: 400 })
    }

    // Step 1: Extract TEA parameters from files using AI
    const parameters = await extractParameters(body.extractedData, body.userInputs)

    // Step 2: Generate AI insights
    const insights = await generateInsights(
      body.projectName,
      body.technology,
      parameters
    )

    // Step 3: Assess data quality
    const dataQuality = assessDataQuality(parameters)

    const response: AnalysisResponse = {
      parameters,
      insights,
      dataQuality,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Analysis error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    )
  }
}

/**
 * Extract TEA parameters from extracted file data
 */
async function extractParameters(
  extractedData: ExtractedData[],
  userInputs?: Partial<TEAParameters>
): Promise<TEAParameters> {
  // Combine all text and structured data
  const allText = extractedData.map((d) => d.text || '').join('\n\n')
  const allTables = extractedData.flatMap((d) => d.tables || [])

  // Build prompt for AI to extract parameters
  const prompt = `You are a techno-economic analysis expert. Extract TEA parameters from the following data.

Text Content:
${allText.substring(0, 4000)} ${allText.length > 4000 ? '...(truncated)' : ''}

Tables:
${JSON.stringify(allTables.slice(0, 3))}

Extract the following parameters and return them as JSON:
{
  "capacity": number (system capacity),
  "capacityUnit": string (e.g., "kW", "MW", "tons/year"),
  "projectLifetime": number (years, typically 20-30),
  "discountRate": number (percentage, typically 5-10),
  "capitalCosts": {
    "equipment": number,
    "installation": number,
    "infrastructure": number,
    "other": number
  },
  "operationalCosts": {
    "maintenance": number (annual),
    "labor": number (annual),
    "materials": number (annual),
    "utilities": number (annual)
  },
  "revenue": {
    "energyPrice": number ($/kWh or similar),
    "annualProduction": number
  }
}

If a value cannot be determined, use reasonable defaults based on the technology type.
Return ONLY valid JSON, no additional text.`

  try {
    const aiResponse = await aiRouter.execute('tea-extract', prompt, {
      temperature: 0.2, // Low temperature for more deterministic extraction
    })

    // Parse AI response
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const extracted = JSON.parse(jsonMatch[0])

      // Merge with user inputs (user inputs take precedence)
      return {
        ...extracted,
        ...userInputs,
      }
    }
  } catch (error) {
    console.error('Parameter extraction failed:', error)
  }

  // Fallback: return user inputs or defaults
  return {
    capacity: userInputs?.capacity || 1000,
    capacityUnit: userInputs?.capacityUnit || 'kW',
    projectLifetime: userInputs?.projectLifetime || 25,
    discountRate: userInputs?.discountRate || 8,
    capitalCosts: userInputs?.capitalCosts || {
      equipment: 500000,
      installation: 200000,
      infrastructure: 150000,
      other: 50000,
    },
    operationalCosts: userInputs?.operationalCosts || {
      maintenance: 20000,
      labor: 50000,
      materials: 15000,
      utilities: 10000,
    },
    revenue: userInputs?.revenue || {
      energyPrice: 0.12,
      annualProduction: 8760000, // 1000 kW * 8760 hours
    },
  }
}

/**
 * Generate AI insights for the TEA report
 */
async function generateInsights(
  projectName: string,
  technology: string,
  parameters: TEAParameters
): Promise<AnalysisResponse['insights']> {
  try {
    // Market Analysis
    const marketPrompt = `Provide a concise market analysis (3-4 sentences) for a ${technology} project with ${parameters.capacity} ${parameters.capacityUnit} capacity. Focus on market trends, demand, and economic outlook.`

    const marketAnalysis = await aiRouter.execute('tea-insights', marketPrompt, {
      temperature: 0.7,
      maxTokens: 200,
    })

    // Risk Assessment
    const riskPrompt = `Identify key financial and technical risks (3-4 sentences) for a ${technology} project. Consider technology maturity, market volatility, and operational challenges.`

    const riskAssessment = await aiRouter.execute('tea-insights', riskPrompt, {
      temperature: 0.7,
      maxTokens: 200,
    })

    // Recommendations
    const recPrompt = `Provide 3-4 actionable recommendations to improve the economic viability of a ${technology} project with the following parameters:
- Capacity: ${parameters.capacity} ${parameters.capacityUnit}
- Project lifetime: ${parameters.projectLifetime} years
- Discount rate: ${parameters.discountRate}%

Return as a JSON array of strings: ["recommendation 1", "recommendation 2", ...]`

    const recResponse = await aiRouter.execute('tea-insights', recPrompt, {
      temperature: 0.7,
      maxTokens: 300,
    })

    const recommendations = parseJsonArray(recResponse) || [
      'Optimize operational efficiency to reduce OPEX',
      'Explore government incentives and subsidies',
      'Consider economies of scale for larger capacity',
      'Implement predictive maintenance to reduce downtime',
    ]

    // Competitive Advantages
    const advPrompt = `List 3 competitive advantages of ${technology} compared to alternatives. Return as JSON array of strings.`

    const advResponse = await aiRouter.execute('tea-insights', advPrompt, {
      temperature: 0.7,
      maxTokens: 200,
    })

    const competitiveAdvantages = parseJsonArray(advResponse) || [
      'Lower environmental impact',
      'Mature and proven technology',
      'Scalable deployment options',
    ]

    // Potential Challenges
    const challengePrompt = `List 3 potential challenges for deploying ${technology}. Return as JSON array of strings.`

    const challengeResponse = await aiRouter.execute('tea-insights', challengePrompt, {
      temperature: 0.7,
      maxTokens: 200,
    })

    const potentialChallenges = parseJsonArray(challengeResponse) || [
      'High initial capital costs',
      'Regulatory and permitting complexity',
      'Market price volatility',
    ]

    return {
      marketAnalysis: marketAnalysis.trim(),
      riskAssessment: riskAssessment.trim(),
      recommendations,
      competitiveAdvantages,
      potentialChallenges,
    }
  } catch (error) {
    console.error('Insights generation failed:', error)

    // Return fallback insights
    return {
      marketAnalysis: `The ${technology} market shows promising growth potential with increasing demand for clean energy solutions. Current market conditions favor investments in renewable energy infrastructure.`,
      riskAssessment: `Key risks include technology performance uncertainty, market price fluctuations, and regulatory changes. Proper risk mitigation strategies should be implemented.`,
      recommendations: [
        'Conduct detailed feasibility study',
        'Secure long-term power purchase agreements',
        'Implement robust O&M procedures',
        'Monitor market trends and adjust strategy accordingly',
      ],
      competitiveAdvantages: [
        'Sustainable and environmentally friendly',
        'Growing market acceptance',
        'Potential for government support',
      ],
      potentialChallenges: [
        'Capital intensity',
        'Technology risk',
        'Regulatory uncertainty',
      ],
    }
  }
}

/**
 * Parse JSON array from AI response
 */
function parseJsonArray(response: string): string[] | null {
  try {
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch (error) {
    console.error('Failed to parse JSON array:', error)
  }
  return null
}

/**
 * Assess data quality of extracted parameters
 */
function assessDataQuality(parameters: TEAParameters): AnalysisResponse['dataQuality'] {
  const requiredFields = [
    'capacity',
    'capacityUnit',
    'projectLifetime',
    'discountRate',
    'capitalCosts.equipment',
    'capitalCosts.installation',
    'operationalCosts.maintenance',
    'operationalCosts.labor',
    'revenue.energyPrice',
    'revenue.annualProduction',
  ]

  const missingFields: string[] = []
  let presentFields = 0

  for (const field of requiredFields) {
    const keys = field.split('.')
    let value: any = parameters

    for (const key of keys) {
      value = value?.[key]
    }

    if (value === undefined || value === null) {
      missingFields.push(field)
    } else {
      presentFields++
    }
  }

  const completeness = (presentFields / requiredFields.length) * 100

  // Confidence is based on completeness and whether values look reasonable
  const confidence = Math.min(
    100,
    completeness * 0.7 + (hasReasonableValues(parameters) ? 30 : 0)
  )

  return {
    completeness: Math.round(completeness),
    confidence: Math.round(confidence),
    missingFields,
  }
}

/**
 * Check if extracted values seem reasonable
 */
function hasReasonableValues(parameters: TEAParameters): boolean {
  // Basic sanity checks
  if (parameters.capacity && parameters.capacity > 0) {
    if (parameters.projectLifetime && parameters.projectLifetime >= 10 && parameters.projectLifetime <= 50) {
      if (parameters.discountRate && parameters.discountRate >= 1 && parameters.discountRate <= 20) {
        return true
      }
    }
  }
  return false
}
