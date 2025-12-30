'use client'

import * as React from 'react'
import { Card, Button, Badge } from '@/components/ui'
import {
  AlertTriangle,
  DollarSign,
  X,
  TrendingUp,
  Clock,
  Zap,
  Settings,
} from 'lucide-react'
import {
  getCostControlService,
  estimateSimulationCost,
  type CostCheckResult,
  type CostSummary,
  type CostLimits,
} from '@/lib/simulation/cost-control-service'

export interface CostWarningModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  simulationParams: {
    provider: 'analytical' | 'modal' | 'physx' | 'mujoco'
    gpuTier?: 'T4' | 'A10G' | 'A100'
    duration?: number
    iterations?: number
    simulationType: string
  }
}

export function CostWarningModal({
  isOpen,
  onClose,
  onConfirm,
  simulationParams,
}: CostWarningModalProps) {
  const [summary, setSummary] = React.useState<CostSummary | null>(null)
  const [checkResult, setCheckResult] = React.useState<CostCheckResult | null>(null)
  const [limits, setLimits] = React.useState<CostLimits | null>(null)
  const [showSettings, setShowSettings] = React.useState(false)

  React.useEffect(() => {
    if (isOpen) {
      const service = getCostControlService()
      const estimatedCost = estimateSimulationCost(simulationParams)

      setSummary(service.getSummary())
      setCheckResult(service.checkBudget(estimatedCost))
      setLimits(service.getLimits())
    }
  }, [isOpen, simulationParams])

  if (!isOpen || !checkResult) return null

  const estimatedCost = estimateSimulationCost(simulationParams)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="bg-background-elevated border-border w-full max-w-md p-6 m-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {checkResult.warningLevel === 'exceeded' ? (
              <AlertTriangle className="w-5 h-5 text-error" />
            ) : checkResult.warningLevel === 'approaching' ? (
              <AlertTriangle className="w-5 h-5 text-warning" />
            ) : (
              <DollarSign className="w-5 h-5 text-primary" />
            )}
            <h2 className="text-lg font-semibold text-foreground">
              {checkResult.allowed ? 'Confirm Simulation Cost' : 'Budget Limit Reached'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-foreground-muted hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cost Estimate */}
        <div className="p-4 rounded-lg bg-background-surface mb-4">
          <div className="flex items-center justify-between">
            <span className="text-foreground-muted">Estimated Cost</span>
            <span className="text-xl font-bold text-foreground">
              ${estimatedCost.toFixed(3)}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2 text-sm text-foreground-muted">
            <Zap className="w-4 h-4" />
            <span>
              {simulationParams.provider.toUpperCase()}
              {simulationParams.gpuTier && ` (${simulationParams.gpuTier})`}
            </span>
          </div>
        </div>

        {/* Budget Status */}
        {summary && limits && (
          <div className="space-y-3 mb-4">
            {/* Daily Budget */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-foreground-muted">Daily Budget</span>
                <span className="text-foreground">
                  ${summary.today.toFixed(2)} / ${limits.maxCostPerDay.toFixed(2)}
                </span>
              </div>
              <div className="h-2 bg-background-surface rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    summary.today / limits.maxCostPerDay >= 0.8
                      ? 'bg-warning'
                      : 'bg-primary'
                  }`}
                  style={{
                    width: `${Math.min(100, (summary.today / limits.maxCostPerDay) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Monthly Budget */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-foreground-muted">Monthly Budget</span>
                <span className="text-foreground">
                  ${summary.thisMonth.toFixed(2)} / ${limits.maxCostPerMonth.toFixed(2)}
                </span>
              </div>
              <div className="h-2 bg-background-surface rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    summary.thisMonth / limits.maxCostPerMonth >= 0.8
                      ? 'bg-warning'
                      : 'bg-primary'
                  }`}
                  style={{
                    width: `${Math.min(100, (summary.thisMonth / limits.maxCostPerMonth) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Warning/Error Message */}
        {!checkResult.allowed && checkResult.reason && (
          <div className="p-3 rounded-lg bg-error/10 border border-error/30 mb-4">
            <p className="text-sm text-error">{checkResult.reason}</p>
          </div>
        )}

        {checkResult.warningLevel === 'approaching' && (
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 mb-4">
            <p className="text-sm text-warning">
              Approaching budget limit. Consider using analytical fallback for lower-priority simulations.
            </p>
          </div>
        )}

        {/* Remaining Budget */}
        <div className="flex items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1 text-foreground-muted">
            <Clock className="w-4 h-4" />
            <span>Remaining today: ${checkResult.remainingBudget.daily.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-1 text-foreground-muted">
            <TrendingUp className="w-4 h-4" />
            <span>This month: ${checkResult.remainingBudget.monthly.toFixed(2)}</span>
          </div>
        </div>

        {/* Settings Toggle */}
        {showSettings && limits && (
          <BudgetSettings
            limits={limits}
            onUpdate={(newLimits) => {
              const service = getCostControlService()
              service.updateLimits(newLimits)
              setLimits(service.getLimits())
              // Recheck budget
              setCheckResult(service.checkBudget(estimatedCost))
            }}
          />
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1 text-sm text-foreground-muted hover:text-foreground transition-colors"
          >
            <Settings className="w-4 h-4" />
            {showSettings ? 'Hide Settings' : 'Budget Settings'}
          </button>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            {checkResult.allowed ? (
              <Button variant="primary" onClick={onConfirm}>
                Run Simulation
              </Button>
            ) : (
              <Button variant="secondary" disabled>
                Budget Exceeded
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

interface BudgetSettingsProps {
  limits: CostLimits
  onUpdate: (limits: Partial<CostLimits>) => void
}

function BudgetSettings({ limits, onUpdate }: BudgetSettingsProps) {
  return (
    <div className="p-4 rounded-lg bg-background-surface mb-4 space-y-3">
      <h3 className="text-sm font-medium text-foreground">Budget Limits</h3>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-foreground-muted mb-1">
            Per Simulation ($)
          </label>
          <input
            type="number"
            step="0.10"
            min="0.01"
            max="10"
            value={limits.maxCostPerSimulation}
            onChange={(e) => onUpdate({ maxCostPerSimulation: parseFloat(e.target.value) })}
            className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded text-foreground"
          />
        </div>

        <div>
          <label className="block text-xs text-foreground-muted mb-1">
            Daily ($)
          </label>
          <input
            type="number"
            step="1"
            min="1"
            max="100"
            value={limits.maxCostPerDay}
            onChange={(e) => onUpdate({ maxCostPerDay: parseFloat(e.target.value) })}
            className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded text-foreground"
          />
        </div>

        <div>
          <label className="block text-xs text-foreground-muted mb-1">
            Monthly ($)
          </label>
          <input
            type="number"
            step="10"
            min="10"
            max="1000"
            value={limits.maxCostPerMonth}
            onChange={(e) => onUpdate({ maxCostPerMonth: parseFloat(e.target.value) })}
            className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded text-foreground"
          />
        </div>

        <div>
          <label className="block text-xs text-foreground-muted mb-1">
            Warning (%)
          </label>
          <input
            type="number"
            step="5"
            min="50"
            max="95"
            value={limits.warningThresholdPercent}
            onChange={(e) => onUpdate({ warningThresholdPercent: parseFloat(e.target.value) })}
            className="w-full px-2 py-1.5 text-sm bg-background border border-border rounded text-foreground"
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Hook to manage cost warning modal state
 */
export function useCostWarningModal() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [pendingSimulation, setPendingSimulation] = React.useState<{
    params: CostWarningModalProps['simulationParams']
    onConfirm: () => void
  } | null>(null)

  const showCostWarning = React.useCallback(
    (
      params: CostWarningModalProps['simulationParams'],
      onConfirm: () => void
    ) => {
      const estimatedCost = estimateSimulationCost(params)

      // Skip warning for free simulations
      if (estimatedCost === 0) {
        onConfirm()
        return
      }

      // Check if within budget without warning
      const service = getCostControlService()
      const checkResult = service.checkBudget(estimatedCost)

      if (checkResult.allowed && checkResult.warningLevel === 'none') {
        // Auto-proceed for small costs within budget
        if (estimatedCost < 0.05) {
          onConfirm()
          return
        }
      }

      // Show modal for higher costs or warnings
      setPendingSimulation({ params, onConfirm })
      setIsOpen(true)
    },
    []
  )

  const handleConfirm = React.useCallback(() => {
    if (pendingSimulation) {
      const service = getCostControlService()
      const estimatedCost = estimateSimulationCost(pendingSimulation.params)

      // Record the cost
      service.recordCost({
        provider: pendingSimulation.params.provider,
        simulationType: pendingSimulation.params.simulationType,
        cost: estimatedCost,
        duration: pendingSimulation.params.duration || 0,
      })

      pendingSimulation.onConfirm()
    }
    setIsOpen(false)
    setPendingSimulation(null)
  }, [pendingSimulation])

  const handleClose = React.useCallback(() => {
    setIsOpen(false)
    setPendingSimulation(null)
  }, [])

  return {
    isOpen,
    simulationParams: pendingSimulation?.params,
    showCostWarning,
    handleConfirm,
    handleClose,
  }
}
