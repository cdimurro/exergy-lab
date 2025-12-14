import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { KPICard } from '@/components/ui/KPICard'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import ReactECharts from 'echarts-for-react'
import { Atom, Info, ArrowRight, Zap } from 'lucide-react'

// Energy source options with their efficiency and quality factors
const ENERGY_SOURCES = [
  { id: 'solar', name: 'Solar PV', efficiency: 0.85, qualityFactor: 0.95, icon: '☀️' },
  { id: 'wind', name: 'Wind', efficiency: 0.88, qualityFactor: 0.95, icon: '💨' },
  { id: 'hydro', name: 'Hydropower', efficiency: 0.87, qualityFactor: 0.95, icon: '💧' },
  { id: 'nuclear', name: 'Nuclear', efficiency: 0.33, qualityFactor: 0.95, icon: '⚛️' },
  { id: 'coal', name: 'Coal', efficiency: 0.32, qualityFactor: 0.78, icon: '🪨' },
  { id: 'gas', name: 'Natural Gas', efficiency: 0.52, qualityFactor: 0.85, icon: '🔥' },
  { id: 'oil', name: 'Oil', efficiency: 0.30, qualityFactor: 0.80, icon: '🛢️' },
  { id: 'biomass', name: 'Biomass', efficiency: 0.25, qualityFactor: 0.70, icon: '🌿' },
  { id: 'geothermal', name: 'Geothermal', efficiency: 0.15, qualityFactor: 0.50, icon: '🌋' },
]

// End-use categories with quality factors
const END_USES = [
  { id: 'electricity', name: 'Electricity', qualityFactor: 1.0 },
  { id: 'mechanical', name: 'Mechanical Work', qualityFactor: 0.95 },
  { id: 'high_heat', name: 'High-Temp Heat (>500°C)', qualityFactor: 0.7 },
  { id: 'medium_heat', name: 'Medium-Temp Heat (100-500°C)', qualityFactor: 0.4 },
  { id: 'low_heat', name: 'Low-Temp Heat (<100°C)', qualityFactor: 0.2 },
  { id: 'lighting', name: 'Lighting', qualityFactor: 0.05 },
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

export function ExergyAnalysis() {
  const [selectedSource, setSelectedSource] = useState(ENERGY_SOURCES[0])
  const [selectedEndUse, setSelectedEndUse] = useState(END_USES[0])
  const [primaryEnergyInput, setPrimaryEnergyInput] = useState('100')
  const [result, setResult] = useState<AnalysisResult | null>(null)

  const calculateExergy = () => {
    const primaryEnergy = parseFloat(primaryEnergyInput)
    if (isNaN(primaryEnergy) || primaryEnergy <= 0) return

    // Calculate useful energy (First Law)
    const usefulEnergy = primaryEnergy * selectedSource.efficiency

    // Calculate exergy services (Second Law)
    const exergyServices = usefulEnergy * selectedSource.qualityFactor * selectedEndUse.qualityFactor

    // Calculate efficiencies
    const firstLawEfficiency = selectedSource.efficiency * 100
    const secondLawEfficiency = (exergyServices / primaryEnergy) * 100

    // Calculate exergy destruction (work potential lost)
    const maxPossibleExergy = primaryEnergy * selectedSource.qualityFactor
    const exergyDestruction = maxPossibleExergy - exergyServices

    // Clean energy equivalent (how much clean energy would provide same exergy services)
    const cleanEnergyEquivalent = exergyServices / (0.85 * 0.95 * selectedEndUse.qualityFactor)

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

  // Sankey diagram for energy flow
  const sankeyOptions = result ? {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1a1a24',
      borderColor: '#2a2a3a',
      textStyle: { color: '#f8fafc' },
    },
    series: [{
      type: 'sankey',
      layout: 'none',
      emphasis: { focus: 'adjacency' },
      nodeGap: 12,
      nodeWidth: 20,
      data: [
        { name: 'Primary Energy', itemStyle: { color: '#6b7280' } },
        { name: 'Useful Energy', itemStyle: { color: '#3b82f6' } },
        { name: 'Exergy Services', itemStyle: { color: '#10b981' } },
        { name: 'Conversion Loss', itemStyle: { color: '#ef4444' } },
        { name: 'Quality Loss', itemStyle: { color: '#f59e0b' } },
      ],
      links: [
        { source: 'Primary Energy', target: 'Useful Energy', value: result.usefulEnergy },
        { source: 'Primary Energy', target: 'Conversion Loss', value: result.primaryEnergy - result.usefulEnergy },
        { source: 'Useful Energy', target: 'Exergy Services', value: result.exergyServices },
        { source: 'Useful Energy', target: 'Quality Loss', value: result.usefulEnergy - result.exergyServices },
      ],
      label: {
        color: '#f8fafc',
        fontSize: 12,
      },
      lineStyle: {
        color: 'source',
        curveness: 0.5,
      },
    }],
  } : null

  // Comparison chart
  const comparisonOptions = result ? {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1a1a24',
      borderColor: '#2a2a3a',
      textStyle: { color: '#f8fafc' },
    },
    legend: {
      data: ['First Law (Conventional)', 'Second Law (Exergy)'],
      textStyle: { color: '#94a3b8' },
      top: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: ['Efficiency', 'Useful Output'],
      axisLine: { lineStyle: { color: '#2a2a3a' } },
      axisLabel: { color: '#94a3b8' },
    },
    yAxis: {
      type: 'value',
      name: 'Value',
      nameTextStyle: { color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#2a2a3a' } },
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1f1f2e' } },
    },
    series: [
      {
        name: 'First Law (Conventional)',
        type: 'bar',
        data: [result.firstLawEfficiency, result.usefulEnergy],
        itemStyle: { color: '#6b7280' },
      },
      {
        name: 'Second Law (Exergy)',
        type: 'bar',
        data: [result.secondLawEfficiency, result.exergyServices],
        itemStyle: { color: '#10b981' },
      },
    ],
  } : null

  return (
    <div>
      <Header
        title="Exergy Analysis"
        subtitle="Second Law thermodynamic efficiency - the technical moat"
      />

      <div className="p-6 space-y-6">
        {/* Tier Badge */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent-blue/20 text-accent-blue">
            Professional Tier
          </span>
          <span className="text-sm text-text-muted">
            Thermodynamically accurate analysis unavailable anywhere else
          </span>
        </div>

        {/* Why Exergy Matters */}
        <div className="card bg-gradient-to-r from-surface to-surface-elevated border-accent-blue/20">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-accent-blue/10">
              <Atom className="w-6 h-6 text-accent-blue" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-text-primary">
                Why Exergy Analysis Matters
              </h3>
              <p className="text-text-secondary mt-1">
                <strong>First Law efficiency</strong> (what everyone uses) measures how much energy is converted.
                <strong> Second Law efficiency</strong> (exergy) measures how much <em>work potential</em> is preserved.
                This reveals the true thermodynamic value of different energy sources and why clean energy
                delivers <strong>3x more value</strong> per unit of primary energy.
              </p>
            </div>
          </div>
        </div>

        {/* Analysis Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Panel */}
          <div className="card">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Analysis Inputs</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Primary Energy Input (EJ)
                </label>
                <Input
                  type="number"
                  value={primaryEnergyInput}
                  onChange={(e) => setPrimaryEnergyInput(e.target.value)}
                  placeholder="Enter primary energy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Energy Source
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ENERGY_SOURCES.map((source) => (
                    <button
                      key={source.id}
                      onClick={() => setSelectedSource(source)}
                      className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                        selectedSource.id === source.id
                          ? 'bg-primary/20 text-primary border border-primary'
                          : 'bg-surface-elevated text-text-secondary hover:bg-surface-elevated/80 border border-transparent'
                      }`}
                    >
                      <span className="text-lg">{source.icon}</span>
                      <p className="mt-1">{source.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  End Use Category
                </label>
                <select
                  value={selectedEndUse.id}
                  onChange={(e) => setSelectedEndUse(END_USES.find(u => u.id === e.target.value) || END_USES[0])}
                  className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {END_USES.map((use) => (
                    <option key={use.id} value={use.id}>
                      {use.name} (Quality: {(use.qualityFactor * 100).toFixed(0)}%)
                    </option>
                  ))}
                </select>
              </div>

              <Button
                variant="primary"
                className="w-full"
                onClick={calculateExergy}
                leftIcon={<Atom className="w-4 h-4" />}
              >
                Calculate Exergy
              </Button>
            </div>
          </div>

          {/* Source Info */}
          <div className="card">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Source Properties</h3>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedSource.icon}</span>
                <div>
                  <p className="font-medium text-text-primary">{selectedSource.name}</p>
                  <p className="text-sm text-text-muted">Selected energy source</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-surface-elevated">
                  <p className="text-xs text-text-muted">Conversion Efficiency</p>
                  <p className="text-xl font-bold text-text-primary">
                    {(selectedSource.efficiency * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-text-muted mt-1">First Law (η)</p>
                </div>
                <div className="p-3 rounded-lg bg-surface-elevated">
                  <p className="text-xs text-text-muted">Exergy Quality</p>
                  <p className="text-xl font-bold text-primary">
                    {(selectedSource.qualityFactor * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-text-muted mt-1">Second Law (ψ)</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-accent-blue/10 border border-accent-blue/20">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-accent-blue mt-0.5" />
                  <div>
                    <p className="text-sm text-text-primary font-medium">What this means</p>
                    <p className="text-xs text-text-secondary mt-1">
                      {selectedSource.efficiency >= 0.5
                        ? `${selectedSource.name} converts energy efficiently, with ${((1 - selectedSource.efficiency) * 100).toFixed(0)}% lost as waste heat.`
                        : `${selectedSource.name} loses ${((1 - selectedSource.efficiency) * 100).toFixed(0)}% of energy in conversion. This is typical for thermal power plants.`
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* End Use Info */}
          <div className="card">
            <h3 className="text-lg font-semibold text-text-primary mb-4">End Use: {selectedEndUse.name}</h3>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-surface-elevated">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-text-muted">Thermodynamic Quality</span>
                  <span className="text-lg font-bold text-primary">
                    {(selectedEndUse.qualityFactor * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-border rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${selectedEndUse.qualityFactor * 100}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-text-secondary">
                  <strong>High quality (100%):</strong> Electricity, mechanical work
                </p>
                <p className="text-sm text-text-secondary">
                  <strong>Medium quality (40-70%):</strong> Industrial heat
                </p>
                <p className="text-sm text-text-secondary">
                  <strong>Low quality (5-20%):</strong> Space heating, lighting
                </p>
              </div>

              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-xs text-text-secondary">
                  <strong>Key insight:</strong> Using high-quality energy (electricity from solar)
                  for low-quality needs (space heating) destroys exergy unnecessarily.
                  Heat pumps recover this by using electricity to move heat.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {result && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KPICard
                title="Primary Energy"
                value={result.primaryEnergy.toFixed(1)}
                unit="EJ"
                changeLabel="input"
              />
              <KPICard
                title="Useful Energy"
                value={result.usefulEnergy.toFixed(1)}
                unit="EJ"
                change={-((1 - result.usefulEnergy / result.primaryEnergy) * 100)}
                changeLabel="conversion loss"
              />
              <KPICard
                title="Exergy Services"
                value={result.exergyServices.toFixed(2)}
                unit="EJ"
                changeLabel="thermodynamic value"
              />
              <div className="kpi-card bg-gradient-to-br from-primary/10 to-accent-blue/10">
                <p className="text-sm text-text-muted mb-1">Clean Energy Equivalent</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-primary">
                    {result.cleanEnergyEquivalent.toFixed(1)}
                  </span>
                  <span className="text-lg text-text-secondary">EJ</span>
                </div>
                <p className="text-xs text-text-muted mt-2">
                  Solar would need only {result.cleanEnergyEquivalent.toFixed(1)} EJ to deliver the same exergy services
                </p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Energy Flow Sankey */}
              <div className="card">
                <h3 className="text-lg font-semibold text-text-primary mb-4">
                  Energy Flow & Losses
                </h3>
                <div className="h-[300px]">
                  {sankeyOptions && (
                    <ReactECharts
                      option={sankeyOptions}
                      style={{ height: '100%', width: '100%' }}
                      opts={{ renderer: 'canvas' }}
                    />
                  )}
                </div>
              </div>

              {/* First vs Second Law Comparison */}
              <div className="card">
                <h3 className="text-lg font-semibold text-text-primary mb-4">
                  First Law vs Second Law
                </h3>
                <div className="h-[300px]">
                  {comparisonOptions && (
                    <ReactECharts
                      option={comparisonOptions}
                      style={{ height: '100%', width: '100%' }}
                      opts={{ renderer: 'canvas' }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Exergy Destruction Analysis
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-text-secondary mb-2">Conversion Losses</h4>
                  <p className="text-2xl font-bold text-accent-red">
                    {(result.primaryEnergy - result.usefulEnergy).toFixed(1)} EJ
                  </p>
                  <p className="text-sm text-text-muted mt-1">
                    {((1 - selectedSource.efficiency) * 100).toFixed(0)}% of primary energy lost as waste heat
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-text-secondary mb-2">Quality Degradation</h4>
                  <p className="text-2xl font-bold text-accent-yellow">
                    {(result.usefulEnergy - result.exergyServices).toFixed(1)} EJ
                  </p>
                  <p className="text-sm text-text-muted mt-1">
                    Work potential destroyed due to irreversibilities
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-text-secondary mb-2">Total Exergy Destruction</h4>
                  <p className="text-2xl font-bold text-text-primary">
                    {result.exergyDestruction.toFixed(1)} EJ
                  </p>
                  <p className="text-sm text-text-muted mt-1">
                    {((result.exergyDestruction / (result.primaryEnergy * selectedSource.qualityFactor)) * 100).toFixed(0)}% of available work potential lost
                  </p>
                </div>
              </div>
            </div>

            {/* Key Insight */}
            <div className="card bg-gradient-to-r from-primary/5 to-accent-blue/5 border-primary/20">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">
                    The Clean Energy Advantage
                  </h3>
                  <p className="text-text-secondary mt-1">
                    Using <strong>{selectedSource.name}</strong> to provide <strong>{selectedEndUse.name}</strong>:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-text-secondary">
                    <li>
                      <ArrowRight className="w-4 h-4 inline text-primary mr-1" />
                      First Law efficiency: <strong>{result.firstLawEfficiency.toFixed(1)}%</strong> (what traditional metrics show)
                    </li>
                    <li>
                      <ArrowRight className="w-4 h-4 inline text-primary mr-1" />
                      Second Law efficiency: <strong>{result.secondLawEfficiency.toFixed(1)}%</strong> (true thermodynamic efficiency)
                    </li>
                    <li>
                      <ArrowRight className="w-4 h-4 inline text-primary mr-1" />
                      Solar PV would need only <strong>{((result.cleanEnergyEquivalent / result.primaryEnergy) * 100).toFixed(0)}%</strong> as much primary energy for the same result
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
