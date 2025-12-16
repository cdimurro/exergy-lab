/**
 * Experiment Design API Route
 * AI-powered generation of experiment protocols
 */

import { NextRequest, NextResponse } from 'next/server'
import { aiRouter } from '@/lib/ai/model-router'
import type { ExperimentGoal, ExperimentProtocol } from '@/types/experiment'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface DesignRequest {
  goal: ExperimentGoal
}

/**
 * POST /api/experiments/design
 * Generate experiment protocol from goal description
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DesignRequest

    if (!body.goal || !body.goal.description) {
      return NextResponse.json(
        { error: 'Experiment goal description is required' },
        { status: 400 }
      )
    }

    // Generate protocol using AI
    const protocol = await generateProtocol(body.goal)

    return NextResponse.json({ protocol })
  } catch (error) {
    console.error('Experiment design error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Design failed' },
      { status: 500 }
    )
  }
}

/**
 * Generate detailed experiment protocol
 */
async function generateProtocol(goal: ExperimentGoal): Promise<ExperimentProtocol> {
  const prompt = `You are an experienced clean energy research scientist. Design a detailed laboratory experiment protocol for the following goal:

Domain: ${goal.domain}
Description: ${goal.description}
Objectives: ${goal.objectives.join(', ')}

Generate a complete experiment protocol with:
1. Materials list (name, quantity, unit, specification)
2. Required equipment
3. Step-by-step procedure with safety warnings
4. Expected results
5. Estimated duration and cost

Return as JSON:
{
  "title": "Experiment Title",
  "materials": [
    {"name": "Material Name", "quantity": "10", "unit": "g", "specification": "99% purity"}
  ],
  "equipment": ["Equipment 1", "Equipment 2"],
  "steps": [
    {
      "step": 1,
      "title": "Step Title",
      "description": "Detailed description",
      "duration": "30 minutes",
      "temperature": "25°C",
      "safety": ["Safety warning 1"]
    }
  ],
  "safetyWarnings": [
    {
      "level": "high",
      "category": "chemical hazard",
      "description": "Warning description",
      "mitigation": "How to mitigate"
    }
  ],
  "expectedResults": "What should happen",
  "estimatedDuration": "4 hours",
  "estimatedCost": 500
}

Focus on practical, achievable experiments for a well-equipped clean energy research lab.`

  try {
    const response = await aiRouter.execute('experiment-design', prompt, {
      temperature: 0.7,
      maxTokens: 2000,
    })

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])

      const protocol: ExperimentProtocol = {
        id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: parsed.title || 'Untitled Experiment',
        createdAt: new Date().toISOString(),
        goal,
        materials: parsed.materials || [],
        equipment: parsed.equipment || [],
        steps: parsed.steps || [],
        safetyWarnings: parsed.safetyWarnings || [],
        expectedResults: parsed.expectedResults || '',
        estimatedDuration: parsed.estimatedDuration || 'Unknown',
        estimatedCost: parsed.estimatedCost,
      }

      return protocol
    }
  } catch (error) {
    console.error('Protocol generation failed:', error)
  }

  // Fallback protocol
  return {
    id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    title: `${goal.domain} Experiment`,
    createdAt: new Date().toISOString(),
    goal,
    materials: [
      {
        name: 'Standard lab equipment',
        quantity: '1',
        unit: 'set',
      },
    ],
    equipment: ['Basic laboratory setup'],
    steps: [
      {
        step: 1,
        title: 'Preparation',
        description: `Prepare materials and equipment for ${goal.description}`,
        duration: '30 minutes',
      },
      {
        step: 2,
        title: 'Execution',
        description: `Conduct experiment according to ${goal.domain} protocols`,
        duration: '2 hours',
      },
      {
        step: 3,
        title: 'Data Collection',
        description: 'Record observations and measurements',
        duration: '1 hour',
      },
    ],
    safetyWarnings: [
      {
        level: 'medium',
        category: 'general safety',
        description: 'Follow standard laboratory safety protocols',
        mitigation: 'Wear appropriate PPE and follow safety guidelines',
      },
    ],
    expectedResults: `Expected outcomes for ${goal.description}`,
    estimatedDuration: '4 hours',
    estimatedCost: 500,
  }
}
