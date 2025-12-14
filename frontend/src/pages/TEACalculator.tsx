import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Calculator, Download, Save, Sparkles, Lock, CheckCircle, Loader2 } from 'lucide-react'
import type { TEAInput, TEAResult, TechnologyType } from '@/types/tea'
import { formatCurrency, formatEnergy } from '@/lib/utils'
import { useAuthContext } from '@/lib/auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const TECHNOLOGY_DEFAULTS: Record<TechnologyType, Partial<TEAInput>> = {
  solar: {
    capex_per_kw: 1000,
    opex_per_kw_year: 15,
    capacity_factor: 0.25,
    project_lifetime_years: 30,
  },
  wind: {
    capex_per_kw: 1400,
    opex_per_kw_year: 35,
    capacity_factor: 0.35,
    project_lifetime_years: 25,
  },
  offshore_wind: {
    capex_per_kw: 3500,
    opex_per_kw_year: 80,
    capacity_factor: 0.45,
    project_lifetime_years: 25,
  },
  hydrogen: {
    capex_per_kw: 800,
    opex_per_kw_year: 20,
    capacity_factor: 0.50,
    project_lifetime_years: 20,
  },
  storage: {
    capex_per_kw: 1200,
    opex_per_kw_year: 25,
    capacity_factor: 0.15,
    project_lifetime_years: 15,
  },
  nuclear: {
    capex_per_kw: 6000,
    opex_per_kw_year: 100,
    capacity_factor: 0.92,
    project_lifetime_years: 40,
  },
  geothermal: {
    capex_per_kw: 4000,
    opex_per_kw_year: 80,
    capacity_factor: 0.90,
    project_lifetime_years: 30,
  },
  hydro: {
    capex_per_kw: 2500,
    opex_per_kw_year: 40,
    capacity_factor: 0.45,
    project_lifetime_years: 50,
  },
  biomass: {
    capex_per_kw: 3000,
    opex_per_kw_year: 100,
    capacity_factor: 0.85,
    project_lifetime_years: 25,
  },
  generic: {
    capex_per_kw: 1500,
    opex_per_kw_year: 30,
    capacity_factor: 0.30,
    project_lifetime_years: 25,
  },
}

const DEFAULT_INPUT: TEAInput = {
  project_name: 'New Project',
  technology_type: 'solar',
  capacity_mw: 100,
  capacity_factor: 0.25,
  capex_per_kw: 1000,
  installation_factor: 1.2,
  land_cost: 0,
  grid_connection_cost: 0,
  opex_per_kw_year: 15,
  fixed_opex_annual: 0,
  variable_opex_per_mwh: 0,
  insurance_rate: 0.01,
  project_lifetime_years: 25,
  discount_rate: 0.08,
  debt_ratio: 0.6,
  interest_rate: 0.05,
  tax_rate: 0.21,
  depreciation_years: 20,
  electricity_price_per_mwh: 50,
  price_escalation_rate: 0.02,
  carbon_credit_per_ton: 0,
  carbon_intensity_avoided: 0,
}

export function TEACalculator() {
  const [input, setInput] = useState<TEAInput>(DEFAULT_INPUT)
  const [result, setResult] = useState<TEAResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState<string | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [savedProjectId, setSavedProjectId] = useState<number | null>(null)

  const { tier, isAuthenticated, getAuthToken } = useAuthContext()
  const isProfessional = tier === 'professional' || tier === 'discovery'
  // Starter tier gets basic TEA, Professional+ gets AI insights and advanced features

  const handleTechnologyChange = (tech: TechnologyType) => {
    const defaults = TECHNOLOGY_DEFAULTS[tech]
    setInput((prev) => ({
      ...prev,
      technology_type: tech,
      ...defaults,
    }))
    // Clear previous results when technology changes
    setResult(null)
    setInsights(null)
    setSaveStatus('idle')
    setSavedProjectId(null)
  }

  const updateInput = (field: keyof TEAInput, value: string | number) => {
    setInput((prev) => ({ ...prev, [field]: value }))
  }

  const calculateTEA = async () => {
    setLoading(true)
    setInsights(null)
    try {
      // Call the API for calculation (with insights if Professional+)
      const token = await getAuthToken()
      if (token && isProfessional) {
        const response = await fetch(`${API_URL}/api/tea/calculate-with-insights`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ ...input, include_insights: true }),
        })

        if (response.ok) {
          const data = await response.json()
          setResult(data.results)
          if (data.insights) {
            setInsights(data.insights)
          }
          return
        }
      }

      // Fallback to local calculation
      const annualProduction = input.capacity_mw * input.capacity_factor * 8760
      const totalCapex =
        input.capacity_mw * 1000 * input.capex_per_kw * input.installation_factor +
        input.land_cost +
        input.grid_connection_cost
      const annualOpex =
        input.capacity_mw * 1000 * input.opex_per_kw_year +
        input.fixed_opex_annual +
        annualProduction * input.variable_opex_per_mwh +
        totalCapex * input.insurance_rate

      // Simple LCOE calculation
      const r = input.discount_rate
      const n = input.project_lifetime_years
      const crf = (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
      const lcoe = (totalCapex * crf + annualOpex) / annualProduction

      // NPV calculation
      let npv = -totalCapex
      for (let t = 1; t <= n; t++) {
        const revenue = annualProduction * input.electricity_price_per_mwh * Math.pow(1 + input.price_escalation_rate, t - 1)
        const opex = annualOpex * Math.pow(1.02, t - 1)
        npv += (revenue - opex) / Math.pow(1 + r, t)
      }

      // IRR approximation
      const annualCashFlow = annualProduction * input.electricity_price_per_mwh - annualOpex
      const irr = annualCashFlow / totalCapex

      // Payback
      const payback = totalCapex / annualCashFlow

      setResult({
        lcoe: Math.round(lcoe * 100) / 100,
        npv: Math.round(npv),
        irr: Math.round(irr * 10000) / 100,
        payback_years: Math.round(payback * 10) / 10,
        total_capex: Math.round(totalCapex),
        annual_opex: Math.round(annualOpex),
        total_lifetime_cost: Math.round(totalCapex + annualOpex * n),
        annual_production_mwh: Math.round(annualProduction),
        lifetime_production_mwh: Math.round(annualProduction * n),
        annual_revenue: Math.round(annualProduction * input.electricity_price_per_mwh),
        lifetime_revenue_npv: Math.round(npv + totalCapex),
        capex_breakdown: {
          equipment: Math.round(input.capacity_mw * 1000 * input.capex_per_kw),
          installation: Math.round(input.capacity_mw * 1000 * input.capex_per_kw * (input.installation_factor - 1)),
          land: input.land_cost,
          grid_connection: input.grid_connection_cost,
        },
        opex_breakdown: {
          capacity_based: Math.round(input.capacity_mw * 1000 * input.opex_per_kw_year),
          fixed: input.fixed_opex_annual,
          variable: Math.round(annualProduction * input.variable_opex_per_mwh),
          insurance: Math.round(totalCapex * input.insurance_rate),
        },
        cash_flows: Array.from({ length: n + 1 }, (_, i) =>
          i === 0 ? -totalCapex : Math.round(annualCashFlow)
        ),
      })
    } finally {
      setLoading(false)
    }
  }

  const generateInsights = async () => {
    if (!result || !isProfessional) return

    const token = await getAuthToken()
    if (!token) return

    setInsightsLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/tea/insights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          technology: input.technology_type,
          tea_results: result,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setInsights(data.insights)
      }
    } catch (error) {
      console.error('Failed to generate insights:', error)
    } finally {
      setInsightsLoading(false)
    }
  }

  const saveProject = async () => {
    if (!result) return

    const token = await getAuthToken()
    if (!token) return

    setSaveStatus('saving')
    try {
      const response = await fetch(`${API_URL}/api/tea/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_id: savedProjectId,
          project_name: input.project_name,
          technology_type: input.technology_type,
          input_data: input,
          results: result,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSavedProjectId(data.project_id)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 3000)
      } else {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    } catch (error) {
      console.error('Failed to save project:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    }
  }

  const downloadReport = async () => {
    if (!result || !isProfessional) return

    const token = await getAuthToken()
    if (!token) return

    try {
      const response = await fetch(`${API_URL}/api/tea/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_name: input.project_name,
          technology: input.technology_type,
          tea_results: result,
          include_ai_insights: true,
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `TEA_Report_${input.project_name.replace(/\s+/g, '_')}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }
    } catch (error) {
      console.error('Failed to download report:', error)
    }
  }

  return (
    <div>
      <Header
        title="TEA Calculator"
        subtitle="Techno-Economic Analysis for clean energy projects"
      />

      <div className="p-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Input Panel */}
          <div className="xl:col-span-2 space-y-6">
            {/* Technology Selection */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Technology Type
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {(['solar', 'wind', 'offshore_wind', 'hydrogen', 'storage', 'nuclear', 'geothermal', 'hydro', 'biomass', 'generic'] as TechnologyType[]).map(
                  (tech) => (
                    <button
                      key={tech}
                      onClick={() => handleTechnologyChange(tech)}
                      className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                        input.technology_type === tech
                          ? 'bg-primary text-white shadow-lg shadow-primary/25 scale-105'
                          : 'bg-surface-elevated text-text-secondary hover:bg-border hover:scale-102'
                      }`}
                    >
                      {tech.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Project Details */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Project Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Project Name"
                  value={input.project_name}
                  onChange={(e) => updateInput('project_name', e.target.value)}
                />
                <Input
                  label="Capacity (MW)"
                  type="number"
                  value={input.capacity_mw}
                  onChange={(e) => updateInput('capacity_mw', parseFloat(e.target.value))}
                />
                <Input
                  label="Capacity Factor (%)"
                  type="number"
                  value={input.capacity_factor * 100}
                  onChange={(e) => updateInput('capacity_factor', parseFloat(e.target.value) / 100)}
                  hint="Typical: Solar 22-28%, Wind 30-42%"
                />
                <Input
                  label="Project Lifetime (years)"
                  type="number"
                  value={input.project_lifetime_years}
                  onChange={(e) => updateInput('project_lifetime_years', parseInt(e.target.value))}
                />
              </div>
            </div>

            {/* Capital Costs */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Capital Costs (CAPEX)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Equipment Cost ($/kW)"
                  type="number"
                  value={input.capex_per_kw}
                  onChange={(e) => updateInput('capex_per_kw', parseFloat(e.target.value))}
                />
                <Input
                  label="Installation Factor"
                  type="number"
                  step="0.1"
                  value={input.installation_factor}
                  onChange={(e) => updateInput('installation_factor', parseFloat(e.target.value))}
                  hint="Multiplier for installation costs (typically 1.1-1.4)"
                />
                <Input
                  label="Land Cost ($)"
                  type="number"
                  value={input.land_cost}
                  onChange={(e) => updateInput('land_cost', parseFloat(e.target.value))}
                />
                <Input
                  label="Grid Connection ($)"
                  type="number"
                  value={input.grid_connection_cost}
                  onChange={(e) => updateInput('grid_connection_cost', parseFloat(e.target.value))}
                />
              </div>
            </div>

            {/* Operating Costs */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Operating Costs (OPEX)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="O&M Cost ($/kW/year)"
                  type="number"
                  value={input.opex_per_kw_year}
                  onChange={(e) => updateInput('opex_per_kw_year', parseFloat(e.target.value))}
                />
                <Input
                  label="Fixed Annual OPEX ($)"
                  type="number"
                  value={input.fixed_opex_annual}
                  onChange={(e) => updateInput('fixed_opex_annual', parseFloat(e.target.value))}
                />
                <Input
                  label="Variable Cost ($/MWh)"
                  type="number"
                  value={input.variable_opex_per_mwh}
                  onChange={(e) => updateInput('variable_opex_per_mwh', parseFloat(e.target.value))}
                />
                <Input
                  label="Insurance Rate (%)"
                  type="number"
                  step="0.1"
                  value={input.insurance_rate * 100}
                  onChange={(e) => updateInput('insurance_rate', parseFloat(e.target.value) / 100)}
                  hint="Typically 0.5-2% of CAPEX"
                />
              </div>
            </div>

            {/* Financial Parameters */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Financial Parameters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Discount Rate (%)"
                  type="number"
                  step="0.5"
                  value={input.discount_rate * 100}
                  onChange={(e) => updateInput('discount_rate', parseFloat(e.target.value) / 100)}
                />
                <Input
                  label="Electricity Price ($/MWh)"
                  type="number"
                  value={input.electricity_price_per_mwh}
                  onChange={(e) => updateInput('electricity_price_per_mwh', parseFloat(e.target.value))}
                />
                <Input
                  label="Price Escalation (%/yr)"
                  type="number"
                  step="0.5"
                  value={input.price_escalation_rate * 100}
                  onChange={(e) => updateInput('price_escalation_rate', parseFloat(e.target.value) / 100)}
                />
              </div>
            </div>

            {/* Calculate Button */}
            <Button
              size="lg"
              className="w-full"
              leftIcon={<Calculator className="w-5 h-5" />}
              onClick={calculateTEA}
              loading={loading}
            >
              Calculate TEA
            </Button>
          </div>

          {/* Results Panel */}
          <div className="space-y-6">
            {result ? (
              <>
                {/* Key Metrics */}
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-text-primary">
                      Results
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={saveProject}
                        disabled={!isAuthenticated || saveStatus === 'saving'}
                        title={!isAuthenticated ? 'Sign in to save' : 'Save project'}
                      >
                        {saveStatus === 'saving' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : saveStatus === 'saved' ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={downloadReport}
                        disabled={!isProfessional}
                        title={!isProfessional ? 'Upgrade to Professional for PDF reports' : 'Download PDF report'}
                      >
                        {isProfessional ? (
                          <Download className="w-4 h-4" />
                        ) : (
                          <Lock className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-sm text-text-muted">Levelized Cost of Energy</p>
                      <p className="text-3xl font-bold text-primary">
                        ${result.lcoe.toFixed(2)}
                        <span className="text-lg font-normal text-text-secondary">/MWh</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-surface-elevated">
                        <p className="text-xs text-text-muted">NPV</p>
                        <p className="text-lg font-semibold text-text-primary">
                          {formatCurrency(result.npv)}
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-surface-elevated">
                        <p className="text-xs text-text-muted">IRR</p>
                        <p className="text-lg font-semibold text-text-primary">
                          {result.irr.toFixed(1)}%
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-surface-elevated">
                        <p className="text-xs text-text-muted">Payback</p>
                        <p className="text-lg font-semibold text-text-primary">
                          {result.payback_years.toFixed(1)} yrs
                        </p>
                      </div>
                      <div className="p-3 rounded-lg bg-surface-elevated">
                        <p className="text-xs text-text-muted">Annual Production</p>
                        <p className="text-lg font-semibold text-text-primary">
                          {formatEnergy(result.annual_production_mwh)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CAPEX Breakdown */}
                <div className="card">
                  <h4 className="text-md font-semibold text-text-primary mb-3">
                    CAPEX Breakdown
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(result.capex_breakdown).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-text-secondary capitalize">
                          {key.replace('_', ' ')}
                        </span>
                        <span className="text-text-primary font-medium">
                          {formatCurrency(value)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm pt-2 border-t border-border">
                      <span className="text-text-primary font-semibold">Total CAPEX</span>
                      <span className="text-primary font-semibold">
                        {formatCurrency(result.total_capex)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* OPEX Breakdown */}
                <div className="card">
                  <h4 className="text-md font-semibold text-text-primary mb-3">
                    Annual OPEX
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(result.opex_breakdown).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-text-secondary capitalize">
                          {key.replace('_', ' ')}
                        </span>
                        <span className="text-text-primary font-medium">
                          {formatCurrency(value)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between text-sm pt-2 border-t border-border">
                      <span className="text-text-primary font-semibold">Total Annual OPEX</span>
                      <span className="text-primary font-semibold">
                        {formatCurrency(result.annual_opex)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* AI Insights Panel */}
                <div className="card">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-md font-semibold text-text-primary flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-500" />
                      AI Insights
                    </h4>
                    {isProfessional && !insights && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={generateInsights}
                        disabled={insightsLoading}
                      >
                        {insightsLoading ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            Generating...
                          </>
                        ) : (
                          'Generate'
                        )}
                      </Button>
                    )}
                  </div>

                  {isProfessional ? (
                    insights ? (
                      <div className="prose prose-sm max-w-none text-text-secondary">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {insights}
                        </div>
                      </div>
                    ) : insightsLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                        <span className="ml-2 text-text-muted">Analyzing with Claude Sonnet...</span>
                      </div>
                    ) : (
                      <p className="text-sm text-text-muted">
                        Click "Generate" to get AI-powered insights about your TEA results,
                        including key cost drivers, risk factors, and recommendations.
                      </p>
                    )
                  ) : (
                    <div className="bg-surface-elevated rounded-lg p-4 text-center">
                      <Lock className="w-8 h-8 text-text-muted mx-auto mb-2" />
                      <p className="text-sm text-text-secondary mb-2">
                        AI-powered insights require Professional tier
                      </p>
                      <Button variant="primary" size="sm" onClick={() => window.location.href = '/pricing'}>
                        Upgrade to Professional
                      </Button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="card flex flex-col items-center justify-center py-12 text-center">
                <Calculator className="w-12 h-12 text-text-muted mb-4" />
                <h3 className="text-lg font-semibold text-text-primary">
                  No Results Yet
                </h3>
                <p className="text-sm text-text-muted mt-1">
                  Configure your project parameters and click Calculate
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
