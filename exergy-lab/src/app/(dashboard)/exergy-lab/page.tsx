'use client'

import * as React from 'react'
import {
  Card,
  Metric,
  Text,
  Flex,
  BadgeDelta,
  BarChart,
  DonutChart,
  ProgressBar,
} from '@tremor/react'
import { Button, Input, Badge } from '@/components/ui'
import {
  Sun,
  Wind,
  Droplets,
  Atom,
  Flame,
  Zap,
  Info,
  Calculator,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Lightbulb,
} from 'lucide-react'

// Energy source configurations
// Efficiency: Primary -> Useful conversion efficiency
// Quality Factor: Weighted exergy factor based on typical end-use allocation
const ENERGY_SOURCES = [
  { id: 'solar', name: 'Solar PV', efficiency: 0.85, qualityFactor: 0.95, icon: Sun, color: 'amber' },
  { id: 'wind', name: 'Wind', efficiency: 1.00, qualityFactor: 1.00, icon: Wind, color: 'cyan' },
  { id: 'hydro', name: 'Hydro', efficiency: 0.90, qualityFactor: 1.00, icon: Droplets, color: 'blue' },
  { id: 'nuclear', name: 'Nuclear', efficiency: 0.33, qualityFactor: 1.00, icon: Atom, color: 'purple' },
  { id: 'gas', name: 'Natural Gas', efficiency: 0.65, qualityFactor: 0.48, icon: Flame, color: 'orange' },
  { id: 'coal', name: 'Coal', efficiency: 0.45, qualityFactor: 0.78, icon: Zap, color: 'slate' },
]

// End-use categories with strict Carnot exergy factors
// Based on Brockway et al. 2019 methodology
const END_USES = [
  { id: 'electricity', name: 'Electricity', qualityFactor: 1.0 },
  { id: 'mechanical', name: 'Mechanical Work', qualityFactor: 1.0 },
  { id: 'high_heat', name: 'High-Temp Heat (>400°C)', qualityFactor: 0.6 },
  { id: 'medium_heat', name: 'Medium-Temp Heat (100-400°C)', qualityFactor: 0.4 },
  { id: 'low_heat', name: 'Low-Temp Heat (<100°C)', qualityFactor: 0.07 }, // Strict Carnot
  { id: 'cooling', name: 'Cooling/AC', qualityFactor: 0.3 },
]

interface AnalysisResult {
  primaryEnergy: number
  usefulEnergy: number
  exergyServices: number
  firstLawEfficiency: number
  secondLawEfficiency: number
  exergyDestruction: number
  cleanEnergyEquivalent: number
}

export default function ExergyLabPage() {
  const [selectedSource, setSelectedSource] = React.useState(ENERGY_SOURCES[0])
  const [selectedEndUse, setSelectedEndUse] = React.useState(END_USES[0])
  const [primaryEnergyInput, setPrimaryEnergyInput] = React.useState('100')
  const [result, setResult] = React.useState<AnalysisResult | null>(null)

  const calculateExergy = () => {
    const primaryEnergy = parseFloat(primaryEnergyInput)
    if (isNaN(primaryEnergy) || primaryEnergy <= 0) return

    // Calculate useful energy (First Law)
    const usefulEnergy = primaryEnergy * selectedSource.efficiency

    // Calculate exergy services (Second Law)
    const exergyServices =
      usefulEnergy * selectedSource.qualityFactor * selectedEndUse.qualityFactor

    // Calculate efficiencies
    const firstLawEfficiency = selectedSource.efficiency * 100
    const secondLawEfficiency = (exergyServices / primaryEnergy) * 100

    // Calculate exergy destruction
    const maxPossibleExergy = primaryEnergy * selectedSource.qualityFactor
    const exergyDestruction = maxPossibleExergy - exergyServices

    // Clean energy equivalent
    const cleanEnergyEquivalent =
      exergyServices / (0.85 * 0.95 * selectedEndUse.qualityFactor)

    setResult({
      primaryEnergy,
      usefulEnergy,
      exergyServices,
      firstLawEfficiency,
      secondLawEfficiency,
      exergyDestruction,
      cleanEnergyEquivalent,
    })
  }

  // Energy flow data for chart
  const energyFlowData = result
    ? [
        {
          category: 'Primary Energy',
          value: result.primaryEnergy,
        },
        {
          category: 'Useful Energy',
          value: result.usefulEnergy,
        },
        {
          category: 'Exergy Services',
          value: result.exergyServices,
        },
      ]
    : []

  // Efficiency comparison data
  const efficiencyData = result
    ? [
        {
          name: 'First Law',
          efficiency: result.firstLawEfficiency,
        },
        {
          name: 'Second Law',
          efficiency: result.secondLawEfficiency,
        },
      ]
    : []

  // Loss breakdown data
  const lossData = result
    ? [
        {
          name: 'Conversion Loss',
          value: result.primaryEnergy - result.usefulEnergy,
        },
        {
          name: 'Quality Loss',
          value: result.usefulEnergy - result.exergyServices,
        },
        {
          name: 'Useful Output',
          value: result.exergyServices,
        },
      ]
    : []

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold text-foreground">Exergy Lab</h1>
            <Badge variant="primary" size="sm">
              Pro
            </Badge>
          </div>
          <p className="text-foreground-muted">
            Analyze thermodynamic efficiency using Second Law principles. Compare
            conventional and exergy-based metrics.
          </p>
        </div>
      </div>

      {/* Educational Callout */}
      <Card className="bg-gradient-to-br from-accent-blue/10 to-accent-purple/10 border-accent-blue/30">
        <div className="flex gap-4">
          <div className="p-3 rounded-xl bg-accent-blue/20 h-fit">
            <Lightbulb className="w-6 h-6 text-accent-blue" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              What is Exergy Analysis?
            </h3>
            <p className="text-sm text-foreground-muted leading-relaxed">
              While conventional efficiency (First Law) measures energy quantity,
              exergy analysis (Second Law) measures energy <em>quality</em> — the
              actual work potential. A system can have 100% energy efficiency but
              still waste work potential through irreversibilities. Exergy analysis
              reveals the true thermodynamic performance of energy systems.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="xl:col-span-2 space-y-6">
          {/* Energy Source Selection */}
          <Card className="bg-background-elevated border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Select Energy Source
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {ENERGY_SOURCES.map((source) => {
                const Icon = source.icon
                const isSelected = selectedSource.id === source.id
                return (
                  <button
                    key={source.id}
                    onClick={() => {
                      setSelectedSource(source)
                      setResult(null)
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all duration-200 ${
                      isSelected
                        ? 'bg-primary/20 border-2 border-primary text-primary'
                        : 'bg-background-surface border border-border text-foreground-muted hover:bg-background-surface/80 hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-medium text-center">
                      {source.name}
                    </span>
                    <span className="text-xs text-foreground-subtle">
                      η: {(source.efficiency * 100).toFixed(0)}%
                    </span>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* End Use Selection */}
          <Card className="bg-background-elevated border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Select End Use Application
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {END_USES.map((use) => {
                const isSelected = selectedEndUse.id === use.id
                return (
                  <button
                    key={use.id}
                    onClick={() => {
                      setSelectedEndUse(use)
                      setResult(null)
                    }}
                    className={`p-3 rounded-lg text-center transition-all duration-200 ${
                      isSelected
                        ? 'bg-primary/20 border-2 border-primary text-primary'
                        : 'bg-background-surface border border-border text-foreground-muted hover:bg-background-surface/80 hover:text-foreground'
                    }`}
                  >
                    <span className="text-xs font-medium">{use.name}</span>
                    <div className="text-xs text-foreground-subtle mt-1">
                      Quality: {(use.qualityFactor * 100).toFixed(0)}%
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* Energy Input */}
          <Card className="bg-background-elevated border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Primary Energy Input
            </h3>
            <div className="flex gap-4 items-end">
              <div className="flex-1 max-w-xs">
                <Input
                  label="Energy Amount"
                  type="number"
                  value={primaryEnergyInput}
                  onChange={(e) => setPrimaryEnergyInput(e.target.value)}
                />
              </div>
              <span className="text-foreground-muted pb-2">MWh (or any unit)</span>
              <Button
                variant="primary"
                onClick={calculateExergy}
                leftIcon={<Calculator className="w-4 h-4" />}
              >
                Analyze Exergy
              </Button>
            </div>
          </Card>

          {/* Results Visualization */}
          {result && (
            <>
              {/* Energy Flow Chart */}
              <Card className="bg-background-elevated border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Energy Flow Cascade
                </h3>
                <BarChart
                  className="h-64"
                  data={energyFlowData}
                  index="category"
                  categories={['value']}
                  colors={['blue']}
                  valueFormatter={(value) => `${value.toFixed(1)} MWh`}
                  showAnimation
                  showGridLines={false}
                />
                <div className="flex items-center justify-center gap-8 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-slate-500" />
                    <span className="text-sm text-foreground-muted">Primary</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-foreground-subtle" />
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm text-foreground-muted">Useful</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-foreground-subtle" />
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-cyan-500" />
                    <span className="text-sm text-foreground-muted">Exergy</span>
                  </div>
                </div>
              </Card>

              {/* Loss Breakdown */}
              <Card className="bg-background-elevated border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Energy Loss Breakdown
                </h3>
                <DonutChart
                  className="h-64"
                  data={lossData}
                  category="value"
                  index="name"
                  colors={['rose', 'amber', 'cyan']}
                  valueFormatter={(value) => `${value.toFixed(1)} MWh`}
                  showAnimation
                />
              </Card>
            </>
          )}
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          {result ? (
            <>
              {/* Efficiency Comparison */}
              <Card className="bg-background-elevated border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Efficiency Comparison
                </h3>

                <div className="space-y-4">
                  {/* First Law */}
                  <div className="p-4 rounded-lg bg-background-surface">
                    <Flex justifyContent="between" alignItems="center">
                      <Text className="text-foreground-muted">
                        First Law (Conventional)
                      </Text>
                      <Metric className="text-foreground">
                        {result.firstLawEfficiency.toFixed(1)}%
                      </Metric>
                    </Flex>
                    <ProgressBar
                      value={result.firstLawEfficiency}
                      color="blue"
                      className="mt-2"
                    />
                  </div>

                  {/* Second Law */}
                  <div className="p-4 rounded-lg bg-background-surface">
                    <Flex justifyContent="between" alignItems="center">
                      <Text className="text-foreground-muted">
                        Second Law (Exergy)
                      </Text>
                      <Metric className="text-foreground">
                        {result.secondLawEfficiency.toFixed(1)}%
                      </Metric>
                    </Flex>
                    <ProgressBar
                      value={result.secondLawEfficiency}
                      color="cyan"
                      className="mt-2"
                    />
                  </div>

                  {/* Difference */}
                  <div className="p-4 rounded-lg bg-accent-amber/10 border border-accent-amber/30">
                    <Flex justifyContent="between" alignItems="center">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-accent-amber" />
                        <Text className="text-foreground-muted">
                          Efficiency Gap
                        </Text>
                      </div>
                      <BadgeDelta deltaType="decrease">
                        {(
                          result.firstLawEfficiency - result.secondLawEfficiency
                        ).toFixed(1)}
                        %
                      </BadgeDelta>
                    </Flex>
                    <p className="text-xs text-foreground-subtle mt-2">
                      This gap represents hidden thermodynamic losses not
                      captured by conventional efficiency metrics.
                    </p>
                  </div>
                </div>
              </Card>

              {/* Key Metrics */}
              <Card className="bg-background-elevated border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Analysis Results
                </h3>
                <div className="space-y-3">
                  <Flex>
                    <Text className="text-foreground-muted">Primary Energy</Text>
                    <Text className="text-foreground font-medium">
                      {result.primaryEnergy.toFixed(1)} MWh
                    </Text>
                  </Flex>
                  <Flex>
                    <Text className="text-foreground-muted">Useful Energy</Text>
                    <Text className="text-foreground font-medium">
                      {result.usefulEnergy.toFixed(1)} MWh
                    </Text>
                  </Flex>
                  <Flex>
                    <Text className="text-foreground-muted">Exergy Services</Text>
                    <Text className="text-primary font-medium">
                      {result.exergyServices.toFixed(1)} MWh
                    </Text>
                  </Flex>
                  <div className="border-t border-border my-2" />
                  <Flex>
                    <Text className="text-foreground-muted">Exergy Destroyed</Text>
                    <Text className="text-rose-400 font-medium">
                      {result.exergyDestruction.toFixed(1)} MWh
                    </Text>
                  </Flex>
                </div>
              </Card>

              {/* Clean Energy Insight */}
              <Card className="bg-gradient-to-br from-primary/20 to-accent-blue/10 border-primary/30">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <span className="font-medium text-foreground">
                    Clean Energy Equivalent
                  </span>
                </div>
                <Metric className="text-foreground">
                  {result.cleanEnergyEquivalent.toFixed(1)} MWh
                </Metric>
                <p className="text-sm text-foreground-muted mt-2">
                  Amount of solar/wind energy needed to provide the same exergy
                  services as your current {selectedSource.name} input.
                </p>
                <Badge variant="success" className="mt-3">
                  {(
                    ((result.primaryEnergy - result.cleanEnergyEquivalent) /
                      result.primaryEnergy) *
                    100
                  ).toFixed(0)}
                  % less primary energy with renewables
                </Badge>
              </Card>
            </>
          ) : (
            /* Empty State */
            <Card className="bg-background-elevated border-border">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-background-surface mb-4">
                  <Atom className="w-8 h-8 text-foreground-muted" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Ready to Analyze
                </h3>
                <p className="text-sm text-foreground-muted max-w-xs">
                  Select an energy source, end use application, and input the
                  primary energy amount to begin your exergy analysis.
                </p>
              </div>
            </Card>
          )}

          {/* Info Card */}
          <Card className="bg-background-surface border-border">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-foreground-subtle shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground mb-1">
                  About Quality Factors
                </p>
                <p className="text-xs text-foreground-muted">
                  Quality factors represent the theoretical maximum work that
                  can be extracted. High-quality uses (like electricity) have
                  factors near 1.0, while low-grade heat has much lower values.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
