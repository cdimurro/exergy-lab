/**
 * Send to Simulations Button
 *
 * Displayed on Experiments complete phase to send protocol to Simulations.
 * Prompts user and passes experiment context to the simulations workflow.
 */

'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { Send } from 'lucide-react'
import type { ExperimentPlan, ProtocolValidation, ExergyExperimentFile } from '@/types/experiment-workflow'

interface SendToSimulationsButtonProps {
  plan: ExperimentPlan
  validation?: ProtocolValidation | null
  className?: string
  variant?: 'primary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

// Map experiment domain to simulation type
const DOMAIN_TO_SIMULATION: Record<string, string> = {
  'solar-energy': 'solar',
  'wind-energy': 'wind',
  'battery-storage': 'battery',
  'geothermal': 'geothermal',
  'hydrogen-fuel': 'hydrogen',
  'biomass': 'biomass',
  'carbon-capture': 'carbon-capture',
  'energy-efficiency': 'process',
  'grid-optimization': 'grid',
  'materials-science': 'materials',
}

export function SendToSimulationsButton({
  plan,
  validation,
  className,
  variant = 'primary',
  size = 'lg',
}: SendToSimulationsButtonProps) {
  const router = useRouter()

  const handleSend = () => {
    // Confirm with user
    const confirmed = window.confirm(
      'Would you like to run a simulation of this experiment to analyze the results?'
    )

    if (!confirmed) {
      return
    }

    // Build experiment file for simulation
    const experimentFile: ExergyExperimentFile = {
      version: '1.0.0',
      metadata: {
        id: plan.id,
        title: plan.title,
        domain: plan.domain,
        createdAt: plan.generatedAt,
      },
      protocol: {
        materials: plan.materials,
        steps: plan.steps,
        safetyWarnings: plan.safetyWarnings,
        equipment: plan.equipment,
      },
      validation: validation || undefined,
      simulation: {
        suggestedType: DOMAIN_TO_SIMULATION[plan.domain] || 'process',
        suggestedTier: 'browser',
        parameters: extractParametersFromPlan(plan),
      },
    }

    // Store experiment file in sessionStorage
    sessionStorage.setItem('simulation-experiment-import', JSON.stringify(experimentFile))

    // Navigate to simulations
    router.push(`/simulations?import=true&experimentId=${plan.id}`)
  }

  return (
    <Button
      onClick={handleSend}
      variant={variant}
      size={size}
      className={className}
    >
      <Send className="w-4 h-4 mr-2" />
      Run Simulation
    </Button>
  )
}

/**
 * Extract simulation parameters from experiment plan
 */
function extractParametersFromPlan(plan: ExperimentPlan): Record<string, unknown> {
  const parameters: Record<string, unknown> = {}

  // Extract temperatures from steps
  const temperatures: number[] = []
  const pressures: number[] = []

  for (const step of plan.steps) {
    if (step.temperature) {
      const tempMatch = step.temperature.match(/(\d+)/);
      if (tempMatch) {
        temperatures.push(parseFloat(tempMatch[1]))
      }
    }
    if (step.pressure) {
      const pressMatch = step.pressure.match(/(\d+(?:\.\d+)?)/);
      if (pressMatch) {
        pressures.push(parseFloat(pressMatch[1]))
      }
    }
  }

  if (temperatures.length > 0) {
    parameters.operatingTemperature = Math.max(...temperatures)
    parameters.minTemperature = Math.min(...temperatures)
  }

  if (pressures.length > 0) {
    parameters.operatingPressure = Math.max(...pressures)
  }

  // Add materials info
  parameters.materialCount = plan.materials.length
  parameters.estimatedCost = plan.estimatedCost

  // Domain-specific parameters
  switch (plan.domain) {
    case 'solar-energy':
      parameters.systemType = 'photovoltaic'
      break
    case 'battery-storage':
      parameters.storageType = 'lithium-ion'
      break
    case 'geothermal':
      parameters.reservoirDepth = temperatures.length > 0 ? 3000 : undefined
      break
    case 'hydrogen-fuel':
      parameters.productionMethod = 'electrolysis'
      break
  }

  return parameters
}
