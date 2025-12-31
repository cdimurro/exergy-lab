'use client'

import * as React from 'react'
import {
  Bot,
  Loader2,
  Play,
  Square,
  Download,
  Calculator,
  BarChart3,
  Zap,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Clock,
  FileJson,
  FileText,
  ChevronRight,
  Info,
  X,
} from 'lucide-react'
import { Card, Button, Badge, Input } from '@/components/ui'
import { useSimulation, TIER_INFO, QUICK_CALCULATORS, type QuickCalculator } from '@/hooks/useSimulation'
import type { Domain } from '@/types/discovery'
import type { SimulationTier, SimulationParameter } from '@/types/simulation'

// ============================================================================
// Types
// ============================================================================

interface SimulationPlatformProps {
  domains?: Domain[]
}

// ============================================================================
// Component
// ============================================================================

export function SimulationPlatform({ domains = [] }: SimulationPlatformProps) {
  const sim = useSimulation()

  // Form state
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [newParamName, setNewParamName] = React.useState('')
  const [newParamValue, setNewParamValue] = React.useState('')
  const [newParamUnit, setNewParamUnit] = React.useState('')

  // Calculator inputs
  const [calcInputs, setCalcInputs] = React.useState<Record<string, number>>({})

  // UI state
  const [activeTab, setActiveTab] = React.useState<'setup' | 'params' | 'sweep'>('setup')
  const [activeResultsTab, setActiveResultsTab] = React.useState<'results' | 'charts' | 'exergy' | 'report'>('results')
  const [showCalculator, setShowCalculator] = React.useState(false)

  // Initialize from experiment context
  React.useEffect(() => {
    if (sim.hasExperimentContext && !sim.config.experimentId) {
      sim.initializeFromExperiment()
    }
  }, [sim.hasExperimentContext])

  // Initialize calculator inputs when calculator is selected
  React.useEffect(() => {
    if (sim.selectedCalculator) {
      const initialInputs: Record<string, number> = {}
      sim.selectedCalculator.inputs.forEach(input => {
        initialInputs[input.symbol] = input.defaultValue
      })
      setCalcInputs(initialInputs)
    }
  }, [sim.selectedCalculator])

  const handleAddParameter = () => {
    if (newParamName && newParamValue) {
      sim.addParameter({
        name: newParamName,
        value: parseFloat(newParamValue) || 0,
        unit: newParamUnit || 'units',
      })
      setNewParamName('')
      setNewParamValue('')
      setNewParamUnit('')
    }
  }

  const handleRunSimulation = () => {
    sim.updateConfig({
      title,
      description,
    })
    sim.runSimulation()
  }

  const handleRunCalculator = () => {
    sim.runCalculator(calcInputs)
  }

  const getTierBadgeColor = (tier: SimulationTier) => {
    switch (tier) {
      case 'local': return 'bg-green-100 text-green-800'
      case 'browser': return 'bg-blue-100 text-blue-800'
      case 'cloud': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-background">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Simulation Engine</h1>
            <p className="text-sm text-foreground-muted">
              3-tier computational system for clean energy simulations
            </p>
          </div>
          {sim.hasExperimentContext && (
            <Badge className="ml-auto bg-primary/10 text-primary">
              Context from Experiment
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Calculator Bar */}
      <div className="px-6 py-3 border-b border-border bg-background-surface overflow-x-auto">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground-muted whitespace-nowrap">Quick Calc:</span>
          {QUICK_CALCULATORS.map(calc => (
            <Button
              key={calc.id}
              variant={sim.selectedCalculator?.id === calc.id ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => {
                sim.selectCalculator(calc.id)
                setShowCalculator(true)
              }}
              className="whitespace-nowrap"
            >
              <Calculator className="h-3 w-3 mr-1" />
              {calc.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Calculator Modal */}
      {showCalculator && sim.selectedCalculator && (
        <CalculatorModal
          calculator={sim.selectedCalculator}
          inputs={calcInputs}
          result={sim.calculatorResult}
          onInputChange={(symbol, value) => setCalcInputs(prev => ({ ...prev, [symbol]: value }))}
          onCalculate={handleRunCalculator}
          onClose={() => {
            setShowCalculator(false)
            sim.clearCalculator()
          }}
          onUseInSimulation={() => {
            // Add result as a parameter
            if (sim.calculatorResult) {
              sim.addParameter({
                name: sim.calculatorResult.name,
                value: sim.calculatorResult.value,
                unit: sim.calculatorResult.unit,
              })
            }
            setShowCalculator(false)
            sim.clearCalculator()
          }}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Configuration */}
        <div className="w-[45%] border-r border-border flex flex-col">
          {/* Tier Selector */}
          <div className="p-4 border-b border-border bg-background">
            <h3 className="text-sm font-semibold text-foreground mb-3">Simulation Tier</h3>
            <div className="grid grid-cols-3 gap-3">
              {TIER_INFO.map(tier => (
                <button
                  key={tier.tier}
                  onClick={() => sim.setTier(tier.tier)}
                  disabled={sim.phase === 'running'}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    sim.selectedTier === tier.tier
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={getTierBadgeColor(tier.tier)}>
                      {tier.tier === 'local' ? 'T1' : tier.tier === 'browser' ? 'T2' : 'T3'}
                    </Badge>
                    {tier.tier === 'local' && <span className="text-xs text-green-600">Free</span>}
                  </div>
                  <p className="text-xs font-medium text-foreground">{tier.name.replace('Tier 1: ', '').replace('Tier 2: ', '').replace('Tier 3: ', '')}</p>
                  <p className="text-xs text-foreground-muted mt-0.5">{tier.estimatedTime}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            {(['setup', 'params', 'sweep'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                {tab === 'setup' && 'Setup'}
                {tab === 'params' && 'Parameters'}
                {tab === 'sweep' && 'Sweep'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-6">
            {activeTab === 'setup' && (
              <div className="space-y-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Simulation Title
                  </label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Perovskite Cell Efficiency Analysis"
                    disabled={sim.phase === 'running'}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what you want to simulate..."
                    rows={4}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                    disabled={sim.phase === 'running'}
                  />
                </div>

                {/* Estimated Cost/Time */}
                <Card className="p-4 bg-background-surface/50">
                  <h4 className="text-sm font-medium text-foreground mb-3">Estimate</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-foreground-muted" />
                      <span className="text-sm text-foreground">{sim.estimatedDuration}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-foreground-muted" />
                      <span className="text-sm text-foreground">
                        {sim.estimatedCost === 0 ? 'Free' : `~$${sim.estimatedCost.toFixed(2)}`}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Run Button */}
                <Button
                  onClick={handleRunSimulation}
                  disabled={!title || !description || sim.phase === 'running'}
                  className="w-full h-12"
                >
                  {sim.phase === 'running' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Simulating... {sim.progress.percentage}%
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Simulation
                    </>
                  )}
                </Button>

                {sim.phase === 'running' && (
                  <Button
                    variant="secondary"
                    onClick={sim.cancelSimulation}
                    className="w-full"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                )}
              </div>
            )}

            {activeTab === 'params' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Simulation Parameters</h3>
                  <Badge variant="secondary">
                    {(sim.config.parameters || []).length} params
                  </Badge>
                </div>

                {/* Existing Parameters */}
                <div className="space-y-2">
                  {(sim.config.parameters || []).map((param, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{param.name}</p>
                        <p className="text-sm text-foreground-muted">
                          {param.value} {param.unit}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => sim.removeParameter(param.name)}
                        disabled={sim.phase === 'running'}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Add Parameter */}
                <Card className="p-4">
                  <h4 className="text-sm font-medium text-foreground mb-3">Add Parameter</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <Input
                      placeholder="Name"
                      value={newParamName}
                      onChange={(e) => setNewParamName(e.target.value)}
                      disabled={sim.phase === 'running'}
                    />
                    <Input
                      placeholder="Value"
                      type="number"
                      value={newParamValue}
                      onChange={(e) => setNewParamValue(e.target.value)}
                      disabled={sim.phase === 'running'}
                    />
                    <Input
                      placeholder="Unit"
                      value={newParamUnit}
                      onChange={(e) => setNewParamUnit(e.target.value)}
                      disabled={sim.phase === 'running'}
                    />
                  </div>
                  <Button
                    onClick={handleAddParameter}
                    disabled={!newParamName || !newParamValue || sim.phase === 'running'}
                    className="w-full mt-3"
                    variant="secondary"
                  >
                    Add Parameter
                  </Button>
                </Card>

                {/* Quick add from calculators */}
                <div className="p-4 bg-background-surface rounded-lg">
                  <p className="text-sm text-foreground-muted">
                    Use the Quick Calculator bar above to compute values and add them as parameters.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'sweep' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Parameter Sweep</h3>
                </div>

                <Card className="p-4">
                  <p className="text-sm text-foreground-muted mb-4">
                    Configure parameter ranges to run multiple simulations and find optimal values.
                    This feature performs sensitivity analysis automatically.
                  </p>

                  {sim.sweepConfig ? (
                    <div>
                      <p className="font-medium text-foreground mb-2">
                        {sim.sweepConfig.totalRuns} runs configured
                      </p>
                      <Button onClick={sim.runParameterSweep} className="w-full">
                        <Play className="h-4 w-4 mr-2" />
                        Run Parameter Sweep
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-foreground-muted">
                        Add parameters in the Parameters tab first, then configure sweep ranges.
                      </p>
                    </div>
                  )}
                </Card>

                {/* Sensitivity Results */}
                {sim.sensitivityResults.length > 0 && (
                  <Card className="p-4">
                    <h4 className="font-semibold text-foreground mb-3">Sensitivity Analysis</h4>
                    <div className="space-y-2">
                      {sim.sensitivityResults.map(result => (
                        <div key={result.parameter} className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                            {result.rank}
                          </span>
                          <span className="flex-1 text-sm text-foreground">{result.parameter}</span>
                          <div className="w-24 h-2 bg-background-surface rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${result.sensitivity}%` }}
                            />
                          </div>
                          <span className="text-xs text-foreground-muted w-12 text-right">
                            {result.sensitivity.toFixed(1)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Results */}
        <div className="flex-1 flex flex-col bg-background-surface/30">
          {/* Results Tabs */}
          <div className="flex border-b border-border bg-background">
            {(['results', 'charts', 'exergy', 'report'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveResultsTab(tab)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeResultsTab === tab
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                {tab === 'results' && 'Results'}
                {tab === 'charts' && 'Charts'}
                {tab === 'exergy' && 'Exergy'}
                {tab === 'report' && 'Report'}
              </button>
            ))}
          </div>

          {/* Results Content */}
          <div className="flex-1 overflow-auto p-6">
            {/* Running State */}
            {sim.phase === 'running' && (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                <p className="text-lg font-semibold text-foreground mb-2">
                  Running Simulation
                </p>
                <p className="text-sm text-foreground-muted mb-4">
                  {sim.progress.status === 'initializing' && 'Initializing solver...'}
                  {sim.progress.status === 'running' && 'Computing results...'}
                  {sim.progress.status === 'processing' && 'Processing outputs...'}
                </p>
                <div className="w-64 h-2 bg-background rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${sim.progress.percentage}%` }}
                  />
                </div>
                <span className="text-sm text-foreground-muted mt-2">
                  {sim.progress.percentage}%
                </span>
              </div>
            )}

            {/* No Results Yet */}
            {sim.phase === 'idle' && !sim.result && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No Simulation Results
                </h3>
                <p className="text-sm text-foreground-muted max-w-md">
                  Configure your simulation on the left and click Run Simulation.
                  Use Quick Calculators for instant estimates.
                </p>
              </div>
            )}

            {/* Results Tab */}
            {activeResultsTab === 'results' && sim.result && sim.phase === 'complete' && (
              <div className="space-y-6">
                {/* Status */}
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-foreground">Simulation Complete</p>
                    <p className="text-sm text-foreground-muted">
                      Completed in {(sim.result.config?.duration || 0) / 1000}s
                      {sim.result.cost && ` - Cost: $${sim.result.cost.toFixed(2)}`}
                    </p>
                  </div>
                </div>

                {/* Key Metrics */}
                <Card className="p-4">
                  <h3 className="font-semibold text-foreground mb-4">Key Metrics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {sim.result.metrics.map((metric, idx) => (
                      <div key={idx} className="p-3 bg-background rounded-lg border border-border">
                        <p className="text-sm text-foreground-muted">{metric.name}</p>
                        <p className="text-2xl font-bold text-foreground">
                          {metric.value.toFixed(2)}
                          <span className="text-sm font-normal text-foreground-muted ml-1">
                            {metric.unit}
                          </span>
                        </p>
                        {metric.uncertainty && (
                          <p className="text-xs text-foreground-subtle">
                            +/- {metric.uncertainty}%
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Insights */}
                {sim.result.insights && (
                  <Card className="p-4">
                    <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" />
                      AI Insights
                    </h3>
                    <p className="text-sm text-foreground">{sim.result.insights}</p>
                  </Card>
                )}
              </div>
            )}

            {/* Charts Tab */}
            {activeResultsTab === 'charts' && sim.result && (
              <div className="space-y-6">
                <Card className="p-4">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Visualizations
                  </h3>
                  {sim.result.visualizations && sim.result.visualizations.length > 0 ? (
                    <div className="space-y-4">
                      {sim.result.visualizations.map((viz, idx) => (
                        <div key={idx} className="p-4 bg-background rounded-lg border border-border">
                          <p className="font-medium text-foreground mb-2">{viz.title}</p>
                          <p className="text-sm text-foreground-muted">
                            Chart type: {viz.type}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-foreground-muted">
                      Visualizations will appear here after simulation.
                    </p>
                  )}
                </Card>
              </div>
            )}

            {/* Exergy Tab */}
            {activeResultsTab === 'exergy' && (
              <div className="space-y-6">
                <Card className="p-4">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Exergy Analysis
                  </h3>
                  <p className="text-sm text-foreground-muted mb-4">
                    Second-law thermodynamic analysis of your simulation results.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-sm text-foreground-muted">Exergy Efficiency</p>
                      <p className="text-2xl font-bold text-foreground">
                        {sim.result?.metrics?.find(m => m.name.toLowerCase().includes('efficiency'))?.value.toFixed(1) || '--'}%
                      </p>
                    </div>
                    <div className="p-3 bg-background rounded-lg">
                      <p className="text-sm text-foreground-muted">Exergy Destruction</p>
                      <p className="text-2xl font-bold text-foreground">--</p>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-sm text-foreground">
                      <strong>Applied Exergy Leverage:</strong> This simulation helps quantify
                      the potential impact of clean energy improvements using second-law analysis.
                    </p>
                  </div>
                </Card>
              </div>
            )}

            {/* Report Tab */}
            {activeResultsTab === 'report' && sim.result && (
              <div className="space-y-6">
                <Card className="p-4">
                  <h3 className="font-semibold text-foreground mb-4">Export Options</h3>
                  <div className="space-y-3">
                    <Button
                      onClick={sim.downloadReport}
                      className="w-full justify-start"
                      variant="secondary"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Download PDF Report
                    </Button>
                    <Button
                      onClick={sim.exportData}
                      className="w-full justify-start"
                      variant="secondary"
                    >
                      <FileJson className="h-4 w-4 mr-2" />
                      Export Data (JSON)
                    </Button>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold text-foreground mb-3">Report Sections</h3>
                  <div className="space-y-2">
                    {[
                      'Executive Summary',
                      'Methodology',
                      'Results',
                      'Visualizations',
                      'Exergy Analysis',
                      'Recommendations',
                    ].map((section, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-foreground">{section}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* Error State */}
            {sim.phase === 'error' && (
              <Card className="p-4 bg-red-50 border-red-200">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-800">Simulation Error</p>
                    <p className="text-sm text-red-600">{sim.error}</p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  className="mt-4"
                  onClick={sim.reset}
                >
                  Try Again
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Calculator Modal
// ============================================================================

interface CalculatorModalProps {
  calculator: QuickCalculator
  inputs: Record<string, number>
  result: { name: string; value: number; unit: string; formula: string; inputs: Record<string, number> } | null
  onInputChange: (symbol: string, value: number) => void
  onCalculate: () => void
  onClose: () => void
  onUseInSimulation: () => void
}

function CalculatorModal({
  calculator,
  inputs,
  result,
  onInputChange,
  onCalculate,
  onClose,
  onUseInSimulation,
}: CalculatorModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{calculator.name}</h2>
            <p className="text-sm text-foreground-muted">{calculator.domain}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-background-surface rounded">
            <X className="h-5 w-5 text-foreground-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          <p className="text-sm text-foreground-muted">{calculator.description}</p>

          {/* Inputs */}
          <div className="space-y-3">
            {calculator.inputs.map(input => (
              <div key={input.symbol}>
                <label className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-foreground">
                    {input.name} ({input.symbol})
                  </span>
                  <span className="text-xs text-foreground-muted">{input.unit}</span>
                </label>
                <Input
                  type="number"
                  value={inputs[input.symbol] || input.defaultValue}
                  onChange={(e) => onInputChange(input.symbol, parseFloat(e.target.value) || 0)}
                  min={input.min}
                  max={input.max}
                  step={input.step}
                />
                <p className="text-xs text-foreground-subtle mt-1">{input.description}</p>
              </div>
            ))}
          </div>

          <Button onClick={onCalculate} className="w-full">
            <Calculator className="h-4 w-4 mr-2" />
            Calculate
          </Button>

          {/* Result */}
          {result && (
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">{result.name}</span>
                <Badge className="bg-primary/10 text-primary">Result</Badge>
              </div>
              <p className="text-3xl font-bold text-primary">
                {result.value.toFixed(2)}
                <span className="text-sm font-normal text-primary/70 ml-1">{result.unit}</span>
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3 w-full"
                onClick={onUseInSimulation}
              >
                Use in Simulation
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Card>
          )}

          {/* Citation */}
          {calculator.citation && (
            <p className="text-xs text-foreground-subtle flex items-start gap-1">
              <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
              {calculator.citation}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
