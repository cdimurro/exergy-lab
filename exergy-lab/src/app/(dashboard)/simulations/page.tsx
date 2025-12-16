'use client'

import * as React from 'react'
import { Cpu, Sparkles, Download, Plus, X } from 'lucide-react'
import { TierSelector, SimulationViewer, ResultsChart } from '@/components/simulations'
import { Button, Input, Textarea, Card } from '@/components/ui'
import type {
  SimulationTier,
  SimulationConfig,
  SimulationResult,
  SimulationParameter,
  TierCapabilities,
} from '@/types/simulation'

export default function SimulationsPage() {
  const [selectedTier, setSelectedTier] = React.useState<SimulationTier>('local')
  const [tiers, setTiers] = React.useState<TierCapabilities[]>([])
  const [isRunning, setIsRunning] = React.useState(false)
  const [result, setResult] = React.useState<SimulationResult | null>(null)

  // Form state
  const [title, setTitle] = React.useState('')
  const [description, setDescription] = React.useState('')
  const [parameters, setParameters] = React.useState<SimulationParameter[]>([
    { name: 'capacity', value: 1000, unit: 'kW', description: 'System capacity' },
    { name: 'operatingHours', value: 8760, unit: 'hours/year', description: 'Annual operating hours' },
  ])

  // Fetch tier capabilities on mount
  React.useEffect(() => {
    fetch('/api/simulations/execute')
      .then((res) => res.json())
      .then((data) => {
        if (data.tiers) {
          setTiers(data.tiers)
        }
      })
      .catch((err) => console.error('Failed to fetch tiers:', err))
  }, [])

  const handleAddParameter = () => {
    setParameters([
      ...parameters,
      { name: '', value: 0, unit: '', description: '' },
    ])
  }

  const handleRemoveParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index))
  }

  const handleParameterChange = (
    index: number,
    field: keyof SimulationParameter,
    value: string | number
  ) => {
    const newParameters = [...parameters]
    newParameters[index] = { ...newParameters[index], [field]: value }
    setParameters(newParameters)
  }

  const handleRunSimulation = async () => {
    if (!title.trim() || !description.trim()) {
      alert('Please provide simulation title and description')
      return
    }

    if (parameters.length === 0) {
      alert('Please add at least one parameter')
      return
    }

    setIsRunning(true)
    setResult(null)

    const config: SimulationConfig = {
      tier: selectedTier,
      title: title.trim(),
      description: description.trim(),
      parameters: parameters.filter((p) => p.name.trim()),
    }

    try {
      const response = await fetch('/api/simulations/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        throw new Error('Simulation failed')
      }

      const simulationResult: SimulationResult = await response.json()
      setResult(simulationResult)
    } catch (error) {
      console.error('Simulation error:', error)
      alert('Simulation failed. Please try again.')
    } finally {
      setIsRunning(false)
    }
  }

  const handleExportResults = () => {
    if (!result) return

    const exportData = {
      config: result.config,
      metrics: result.metrics,
      visualizations: result.visualizations,
      insights: result.insights,
      completedAt: result.progress.completedAt,
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `simulation_${result.id}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                <Cpu className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Simulations</h1>
                <p className="text-sm text-foreground-muted mt-1">
                  3-tier computational system for clean energy simulations
                </p>
              </div>
            </div>

            {result && result.progress.status === 'completed' && (
              <Button onClick={handleExportResults}>
                <Download className="w-4 h-4 mr-2" />
                Export Results
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-6">
              {/* Simulation Details */}
              <Card>
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Simulation Configuration
                </h2>

                <div className="space-y-4">
                  <Input
                    label="Simulation Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Solar Panel Efficiency Analysis"
                    disabled={isRunning}
                  />

                  <Textarea
                    label="Description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what this simulation will analyze..."
                    rows={4}
                    disabled={isRunning}
                  />

                  {/* Parameters */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-3">
                      Simulation Parameters
                    </label>

                    <div className="space-y-3">
                      {parameters.map((param, index) => (
                        <div
                          key={index}
                          className="p-3 rounded-lg bg-background-surface border border-border"
                        >
                          <div className="flex items-start gap-2 mb-2">
                            <Input
                              value={param.name}
                              onChange={(e) =>
                                handleParameterChange(index, 'name', e.target.value)
                              }
                              placeholder="Parameter name"
                              className="flex-1"
                              disabled={isRunning}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveParameter(index)}
                              disabled={isRunning || parameters.length === 1}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              value={param.value}
                              onChange={(e) =>
                                handleParameterChange(
                                  index,
                                  'value',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder="Value"
                              disabled={isRunning}
                            />
                            <Input
                              value={param.unit}
                              onChange={(e) =>
                                handleParameterChange(index, 'unit', e.target.value)
                              }
                              placeholder="Unit"
                              disabled={isRunning}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAddParameter}
                      disabled={isRunning || parameters.length >= 10}
                      className="mt-3 w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Parameter
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Run Button */}
              <Button
                onClick={handleRunSimulation}
                disabled={isRunning || !title.trim() || !description.trim()}
                className="w-full"
                size="lg"
              >
                {isRunning ? (
                  <>
                    <Cpu className="w-5 h-5 mr-2 animate-pulse" />
                    Running Simulation...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Run Simulation
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tier Selection */}
            {tiers.length > 0 && (
              <TierSelector
                selectedTier={selectedTier}
                onTierSelect={setSelectedTier}
                tiers={tiers}
                recommendation="browser"
              />
            )}

            {/* Simulation Progress/Results */}
            {result && (
              <>
                <SimulationViewer
                  progress={result.progress}
                  metrics={result.metrics}
                  insights={result.insights}
                />

                {/* Visualizations */}
                {result.visualizations &&
                  result.visualizations.length > 0 &&
                  result.progress.status === 'completed' && (
                    <div className="space-y-6">
                      {result.visualizations.map((viz, index) => (
                        <ResultsChart key={index} visualization={viz} />
                      ))}
                    </div>
                  )}
              </>
            )}

            {/* Empty State */}
            {!result && !isRunning && (
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                    <Cpu className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Configure and Run Simulation
                    </h3>
                    <p className="text-sm text-foreground-muted mb-4">
                      Set up your simulation parameters and choose a computational tier
                    </p>
                    <div className="text-xs text-foreground-muted space-y-1">
                      <p>• Tier 1: Fast local calculations (~10 seconds)</p>
                      <p>• Tier 2: AI-powered predictions (~2 minutes)</p>
                      <p>• Tier 3: Cloud GPU simulations (~10 minutes)</p>
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
