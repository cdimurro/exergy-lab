/**
 * Simulation Cost Control Service
 *
 * Tracks simulation costs and enforces budget limits.
 * Prevents runaway costs from GPU simulations.
 *
 * @see providers/modal-provider.ts - GPU simulation costs
 * @see components/simulation/CostWarningModal.tsx - UI component
 */

export interface CostLimits {
  /** Maximum cost per single simulation ($) */
  maxCostPerSimulation: number
  /** Maximum daily spending ($) */
  maxCostPerDay: number
  /** Maximum monthly spending ($) */
  maxCostPerMonth: number
  /** Warning threshold (% of limit) */
  warningThresholdPercent: number
}

export interface CostRecord {
  timestamp: string
  provider: string
  simulationType: string
  cost: number
  duration: number
  hypothesisId?: string
}

export interface CostSummary {
  today: number
  thisWeek: number
  thisMonth: number
  total: number
  recordCount: number
  lastSimulation?: CostRecord
}

export interface CostCheckResult {
  allowed: boolean
  reason?: string
  estimatedCost: number
  remainingBudget: {
    daily: number
    monthly: number
  }
  warningLevel: 'none' | 'approaching' | 'exceeded'
}

// Default limits (conservative for development)
export const DEFAULT_COST_LIMITS: CostLimits = {
  maxCostPerSimulation: 0.50,  // $0.50 max per run
  maxCostPerDay: 5.00,         // $5/day
  maxCostPerMonth: 50.00,      // $50/month
  warningThresholdPercent: 80,
}

// Storage key for cost records
const COST_RECORDS_KEY = 'exergy-lab-simulation-costs'
const COST_LIMITS_KEY = 'exergy-lab-cost-limits'

/**
 * Cost Control Service
 *
 * Tracks simulation costs and enforces budget limits.
 */
export class CostControlService {
  private limits: CostLimits
  private records: CostRecord[] = []

  constructor(limits?: Partial<CostLimits>) {
    this.limits = { ...DEFAULT_COST_LIMITS, ...limits }
    this.loadRecords()
    this.loadLimits()
  }

  /**
   * Check if a simulation is allowed within budget
   */
  checkBudget(estimatedCost: number): CostCheckResult {
    const summary = this.getSummary()

    // Check per-simulation limit
    if (estimatedCost > this.limits.maxCostPerSimulation) {
      return {
        allowed: false,
        reason: `Estimated cost ($${estimatedCost.toFixed(2)}) exceeds per-simulation limit ($${this.limits.maxCostPerSimulation.toFixed(2)})`,
        estimatedCost,
        remainingBudget: {
          daily: this.limits.maxCostPerDay - summary.today,
          monthly: this.limits.maxCostPerMonth - summary.thisMonth,
        },
        warningLevel: 'exceeded',
      }
    }

    // Check daily limit
    if (summary.today + estimatedCost > this.limits.maxCostPerDay) {
      return {
        allowed: false,
        reason: `Would exceed daily budget ($${this.limits.maxCostPerDay.toFixed(2)}). Spent today: $${summary.today.toFixed(2)}`,
        estimatedCost,
        remainingBudget: {
          daily: this.limits.maxCostPerDay - summary.today,
          monthly: this.limits.maxCostPerMonth - summary.thisMonth,
        },
        warningLevel: 'exceeded',
      }
    }

    // Check monthly limit
    if (summary.thisMonth + estimatedCost > this.limits.maxCostPerMonth) {
      return {
        allowed: false,
        reason: `Would exceed monthly budget ($${this.limits.maxCostPerMonth.toFixed(2)}). Spent this month: $${summary.thisMonth.toFixed(2)}`,
        estimatedCost,
        remainingBudget: {
          daily: this.limits.maxCostPerDay - summary.today,
          monthly: this.limits.maxCostPerMonth - summary.thisMonth,
        },
        warningLevel: 'exceeded',
      }
    }

    // Check warning threshold
    const dailyUsagePercent = (summary.today + estimatedCost) / this.limits.maxCostPerDay * 100
    const monthlyUsagePercent = (summary.thisMonth + estimatedCost) / this.limits.maxCostPerMonth * 100

    let warningLevel: 'none' | 'approaching' | 'exceeded' = 'none'
    if (dailyUsagePercent >= this.limits.warningThresholdPercent ||
        monthlyUsagePercent >= this.limits.warningThresholdPercent) {
      warningLevel = 'approaching'
    }

    return {
      allowed: true,
      estimatedCost,
      remainingBudget: {
        daily: this.limits.maxCostPerDay - summary.today - estimatedCost,
        monthly: this.limits.maxCostPerMonth - summary.thisMonth - estimatedCost,
      },
      warningLevel,
    }
  }

  /**
   * Record a simulation cost
   */
  recordCost(record: Omit<CostRecord, 'timestamp'>): void {
    const fullRecord: CostRecord = {
      ...record,
      timestamp: new Date().toISOString(),
    }

    this.records.push(fullRecord)
    this.saveRecords()
  }

  /**
   * Get cost summary
   */
  getSummary(): CostSummary {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    let today = 0
    let thisWeek = 0
    let thisMonth = 0
    let total = 0

    for (const record of this.records) {
      const recordDate = new Date(record.timestamp)
      total += record.cost

      if (recordDate >= monthStart) {
        thisMonth += record.cost
      }
      if (recordDate >= weekStart) {
        thisWeek += record.cost
      }
      if (recordDate >= todayStart) {
        today += record.cost
      }
    }

    return {
      today,
      thisWeek,
      thisMonth,
      total,
      recordCount: this.records.length,
      lastSimulation: this.records[this.records.length - 1],
    }
  }

  /**
   * Get all records for a time period
   */
  getRecords(since?: Date): CostRecord[] {
    if (!since) {
      return [...this.records]
    }

    return this.records.filter(r => new Date(r.timestamp) >= since)
  }

  /**
   * Get current limits
   */
  getLimits(): CostLimits {
    return { ...this.limits }
  }

  /**
   * Update limits
   */
  updateLimits(newLimits: Partial<CostLimits>): void {
    this.limits = { ...this.limits, ...newLimits }
    this.saveLimits()
  }

  /**
   * Clear old records (older than 90 days)
   */
  pruneOldRecords(): number {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)

    const originalCount = this.records.length
    this.records = this.records.filter(r => new Date(r.timestamp) >= cutoff)
    this.saveRecords()

    return originalCount - this.records.length
  }

  /**
   * Export records as CSV
   */
  exportCSV(): string {
    const headers = ['Timestamp', 'Provider', 'Type', 'Cost', 'Duration (ms)', 'Hypothesis ID']
    const rows = this.records.map(r => [
      r.timestamp,
      r.provider,
      r.simulationType,
      r.cost.toFixed(4),
      r.duration.toString(),
      r.hypothesisId || '',
    ])

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private loadRecords(): void {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(COST_RECORDS_KEY)
      if (stored) {
        this.records = JSON.parse(stored)
      }
    } catch (error) {
      console.warn('[CostControl] Failed to load records:', error)
      this.records = []
    }
  }

  private saveRecords(): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(COST_RECORDS_KEY, JSON.stringify(this.records))
    } catch (error) {
      console.warn('[CostControl] Failed to save records:', error)
    }
  }

  private loadLimits(): void {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(COST_LIMITS_KEY)
      if (stored) {
        this.limits = { ...DEFAULT_COST_LIMITS, ...JSON.parse(stored) }
      }
    } catch (error) {
      console.warn('[CostControl] Failed to load limits:', error)
    }
  }

  private saveLimits(): void {
    if (typeof window === 'undefined') return

    try {
      localStorage.setItem(COST_LIMITS_KEY, JSON.stringify(this.limits))
    } catch (error) {
      console.warn('[CostControl] Failed to save limits:', error)
    }
  }
}

// Singleton instance
let costControlInstance: CostControlService | null = null

/**
 * Get the cost control service instance
 */
export function getCostControlService(): CostControlService {
  if (!costControlInstance) {
    costControlInstance = new CostControlService()
  }
  return costControlInstance
}

/**
 * Estimate simulation cost based on parameters
 */
export function estimateSimulationCost(params: {
  provider: 'analytical' | 'modal' | 'physx' | 'mujoco'
  gpuTier?: 'T4' | 'A10G' | 'A100'
  duration?: number // Estimated duration in seconds
  iterations?: number
}): number {
  // Analytical is free
  if (params.provider === 'analytical') {
    return 0
  }

  // MuJoCo is CPU-based, very cheap
  if (params.provider === 'mujoco') {
    const duration = params.duration || 60
    return duration * 0.00005 // ~$0.003 per minute
  }

  // GPU-based costs
  const gpuCostsPerSecond: Record<string, number> = {
    T4: 0.00011,    // $0.40/hr
    A10G: 0.00031,  // $1.10/hr
    A100: 0.00083,  // $3.00/hr
  }

  const tier = params.gpuTier || 'T4'
  const duration = params.duration || 90 // Default 90 seconds

  return gpuCostsPerSecond[tier] * duration
}
