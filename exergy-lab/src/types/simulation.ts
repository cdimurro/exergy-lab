/**
 * Simulation System Types - 3-Tier Computational Architecture
 */

export type SimulationTier = 'local' | 'browser' | 'cloud'

export interface TierCapabilities {
  tier: SimulationTier
  name: string
  description: string
  estimatedTime: string // e.g., "< 1 second", "1-5 seconds", "5-30 seconds"
  accuracy: string // e.g., "+/- 5-10%", "+/- 2-5%", "+/- 1-2%"
  cost: string // e.g., "FREE", "~$0.01", "~$0.02"
  computeLocation: 'browser' | 'ai-inference' | 'cloud-gpu' | 'modal-t4' | 'modal-a10g'
}

export interface SimulationParameter {
  name: string
  value: number | string
  unit: string
  description?: string
}

export interface SimulationConfig {
  tier: SimulationTier
  experimentId?: string // Reference to experiment protocol
  title: string
  description: string
  parameters: SimulationParameter[]
  duration?: number // Expected duration in seconds
  targetAccuracy?: number // Desired accuracy percentage
}

export interface SimulationMetric {
  name: string
  value: number
  unit: string
  uncertainty?: number // e.g., ±2%
  confidenceInterval?: [number, number]
}

export interface SimulationDataPoint {
  timestamp: number
  values: Record<string, number>
}

export interface SimulationVisualization {
  type: 'line' | 'bar' | 'scatter' | 'heatmap' | '3d'
  title: string
  data: SimulationDataPoint[]
  xAxis: string
  yAxis: string
  zAxis?: string // For 3D visualizations
}

export interface SimulationProgress {
  status: 'queued' | 'initializing' | 'running' | 'processing' | 'completed' | 'failed'
  percentage: number // 0-100
  currentStep?: string
  estimatedTimeRemaining?: number // seconds
  startedAt?: string
  completedAt?: string
}

/**
 * Structured AI insights with organized sections
 */
export interface StructuredInsights {
  summary: string
  observations: string[]
  recommendations: string[]
  warnings: string[]
  nextSteps: string[]
}

export interface SimulationResult {
  id: string
  config: SimulationConfig
  progress: SimulationProgress
  metrics: SimulationMetric[]
  visualizations: SimulationVisualization[]
  insights?: string // AI-generated insights about results (raw text)
  structuredInsights?: StructuredInsights // Parsed structured insights
  rawData?: string // CSV or JSON export of raw data
  cost?: number // Actual cost for Tier 3
  error?: string
}

export interface SimulationHistory {
  id: string
  title: string
  tier: SimulationTier
  completedAt: string
  metrics: SimulationMetric[]
  experimentId?: string
}

export interface CloudGPUProvider {
  name: 'runpod' | 'modal' | 'replicate' | 'vast.ai'
  endpoint: string
  apiKey: string
  estimatedCost: number
  availableGPUs: string[] // e.g., ["A100", "H100", "V100"]
}

export interface CloudGPUResponse {
  metrics: SimulationMetric[]
  visualizations: SimulationVisualization[]
  raw_data?: {
    monte_carlo_iterations: number
    efficiency_distribution: {
      mean: number
      std: number
      min: number
      max: number
    }
    power_distribution: {
      mean: number
      std: number
      min: number
      max: number
    }
  }
  execution_time_ms: number
}

export interface TierComparison {
  tiers: TierCapabilities[]
  recommendation?: SimulationTier
  reasoning?: string
}
