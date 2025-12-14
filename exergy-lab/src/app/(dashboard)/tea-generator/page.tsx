'use client'

import * as React from 'react'
import { Card, Metric, Text, Flex, BadgeDelta, ProgressBar } from '@tremor/react'
import { Button, Input, Badge } from '@/components/ui'
import { CashFlowChart, CostBreakdownChart } from '@/components/charts'
import {
  Sun,
  Wind,
  Waves,
  Atom,
  Battery,
  Flame,
  Droplets,
  Leaf,
  CircleDot,
  Calculator,
  Download,
  Save,
  Sparkles,
  Loader2,
  CheckCircle,
  TrendingUp,
  DollarSign,
  Clock,
  Zap,
} from 'lucide-react'
import type { TEAInput, TEAResult, TechnologyType } from '@/types/tea'

// Technology configuration with icons
const TECHNOLOGIES: {
  type: TechnologyType
  label: string
  icon: React.ElementType
  color: string
  defaults: Partial<TEAInput>
}[] = [
  {
    type: 'solar',
    label: 'Solar PV',
    icon: Sun,
    color: 'amber',
    defaults: {
      capex_per_kw: 1000,
      opex_per_kw_year: 15,
      capacity_factor: 0.25,
      project_lifetime_years: 30,
    },
  },
  {
    type: 'wind',
    label: 'Onshore Wind',
    icon: Wind,
    color: 'blue',
    defaults: {
      capex_per_kw: 1400,
      opex_per_kw_year: 35,
      capacity_factor: 0.35,
      project_lifetime_years: 25,
    },
  },
  {
    type: 'offshore_wind',
    label: 'Offshore Wind',
    icon: Waves,
    color: 'blue',
    defaults: {
      capex_per_kw: 3500,
      opex_per_kw_year: 80,
      capacity_factor: 0.45,
      project_lifetime_years: 25,
    },
  },
  {
    type: 'hydrogen',
    label: 'Green H₂',
    icon: Atom,
    color: 'purple',
    defaults: {
      capex_per_kw: 800,
      opex_per_kw_year: 20,
      capacity_factor: 0.5,
      project_lifetime_years: 20,
    },
  },
  {
    type: 'storage',
    label: 'Battery',
    icon: Battery,
    color: 'cyan',
    defaults: {
      capex_per_kw: 1200,
      opex_per_kw_year: 25,
      capacity_factor: 0.15,
      project_lifetime_years: 15,
    },
  },
  {
    type: 'nuclear',
    label: 'Nuclear',
    icon: CircleDot,
    color: 'rose',
    defaults: {
      capex_per_kw: 6000,
      opex_per_kw_year: 100,
      capacity_factor: 0.92,
      project_lifetime_years: 40,
    },
  },
  {
    type: 'geothermal',
    label: 'Geothermal',
    icon: Flame,
    color: 'orange',
    defaults: {
      capex_per_kw: 4000,
      opex_per_kw_year: 80,
      capacity_factor: 0.9,
      project_lifetime_years: 30,
    },
  },
  {
    type: 'hydro',
    label: 'Hydro',
    icon: Droplets,
    color: 'sky',
    defaults: {
      capex_per_kw: 2500,
      opex_per_kw_year: 40,
      capacity_factor: 0.45,
      project_lifetime_years: 50,
    },
  },
  {
    type: 'biomass',
    label: 'Biomass',
    icon: Leaf,
    color: 'lime',
    defaults: {
      capex_per_kw: 3000,
      opex_per_kw_year: 100,
      capacity_factor: 0.85,
      project_lifetime_years: 25,
    },
  },
]

const DEFAULT_INPUT: TEAInput = {
  project_name: 'New Energy Project',
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

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1e9) {
    return `$${(value / 1e9).toFixed(1)}B`
  }
  if (Math.abs(value) >= 1e6) {
    return `$${(value / 1e6).toFixed(1)}M`
  }
  if (Math.abs(value) >= 1e3) {
    return `$${(value / 1e3).toFixed(0)}K`
  }
  return `$${value.toFixed(0)}`
}

export default function TEAGeneratorPage() {
  const [input, setInput] = React.useState<TEAInput>(DEFAULT_INPUT)
  const [result, setResult] = React.useState<TEAResult | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [insights, setInsights] = React.useState<string | null>(null)
  const [insightsLoading, setInsightsLoading] = React.useState(false)

  const handleTechnologyChange = (tech: TechnologyType) => {
    const techConfig = TECHNOLOGIES.find((t) => t.type === tech)
    if (techConfig) {
      setInput((prev) => ({
        ...prev,
        technology_type: tech,
        ...techConfig.defaults,
      }))
      setResult(null)
      setInsights(null)
    }
  }

  const updateInput = (field: keyof TEAInput, value: string | number) => {
    setInput((prev) => ({ ...prev, [field]: value }))
  }

  const calculateTEA = async () => {
    setLoading(true)
    setInsights(null)

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 800))

    try {
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

      // LCOE calculation
      const r = input.discount_rate
      const n = input.project_lifetime_years
      const crf = (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
      const lcoe = (totalCapex * crf + annualOpex) / annualProduction

      // NPV calculation
      let npv = -totalCapex
      for (let t = 1; t <= n; t++) {
        const revenue =
          annualProduction *
          input.electricity_price_per_mwh *
          Math.pow(1 + input.price_escalation_rate, t - 1)
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
          installation: Math.round(
            input.capacity_mw * 1000 * input.capex_per_kw * (input.installation_factor - 1)
          ),
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
    if (!result) return
    setInsightsLoading(true)

    // Simulate AI insights
    await new Promise((resolve) => setTimeout(resolve, 1500))

    const tech = TECHNOLOGIES.find((t) => t.type === input.technology_type)
    setInsights(
      `Based on the analysis of your ${tech?.label || input.technology_type} project:\n\n` +
        `• Your LCOE of $${result.lcoe}/MWh is ${result.lcoe < 45 ? 'competitive' : 'above average'} for ${tech?.label}.\n` +
        `• With an IRR of ${result.irr}%, this project ${result.irr > 10 ? 'exceeds' : 'falls below'} typical hurdle rates.\n` +
        `• Consider optimizing capacity factor through better site selection.\n` +
        `• The ${result.payback_years.toFixed(1)} year payback period ${result.payback_years < 8 ? 'indicates strong returns' : 'may benefit from incentive programs'}.`
    )
    setInsightsLoading(false)
  }

  const selectedTech = TECHNOLOGIES.find((t) => t.type === input.technology_type)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">TEA Generator</h1>
          <p className="text-foreground-muted mt-1">
            Techno-Economic Analysis for clean energy projects. Configure parameters
            and calculate financial viability.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            leftIcon={<Download className="w-4 h-4" />}
            disabled={!result}
          >
            Export PDF
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Save className="w-4 h-4" />}
            disabled={!result}
          >
            Save Project
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="xl:col-span-2 space-y-6">
          {/* Technology Selection */}
          <Card className="bg-background-elevated border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Select Technology
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
              {TECHNOLOGIES.map((tech) => {
                const Icon = tech.icon
                const isSelected = input.technology_type === tech.type
                return (
                  <button
                    key={tech.type}
                    onClick={() => handleTechnologyChange(tech.type)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all duration-200 ${
                      isSelected
                        ? 'bg-primary/20 border-2 border-primary text-primary scale-105'
                        : 'bg-background-surface border border-border text-foreground-muted hover:bg-background-surface/80 hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-6 h-6" />
                    <span className="text-xs font-medium text-center leading-tight">
                      {tech.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </Card>

          {/* Project Details */}
          <Card className="bg-background-elevated border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
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
                onChange={(e) => updateInput('capacity_mw', parseFloat(e.target.value) || 0)}
              />
              <Input
                label="Capacity Factor (%)"
                type="number"
                value={Math.round(input.capacity_factor * 100)}
                onChange={(e) =>
                  updateInput('capacity_factor', (parseFloat(e.target.value) || 0) / 100)
                }
              />
              <Input
                label="Project Lifetime (years)"
                type="number"
                value={input.project_lifetime_years}
                onChange={(e) =>
                  updateInput('project_lifetime_years', parseInt(e.target.value) || 0)
                }
              />
            </div>
          </Card>

          {/* Capital Costs */}
          <Card className="bg-background-elevated border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Capital Costs (CAPEX)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Equipment Cost ($/kW)"
                type="number"
                value={input.capex_per_kw}
                onChange={(e) => updateInput('capex_per_kw', parseFloat(e.target.value) || 0)}
              />
              <Input
                label="Installation Factor"
                type="number"
                step="0.1"
                value={input.installation_factor}
                onChange={(e) =>
                  updateInput('installation_factor', parseFloat(e.target.value) || 0)
                }
              />
              <Input
                label="Land Cost ($)"
                type="number"
                value={input.land_cost}
                onChange={(e) => updateInput('land_cost', parseFloat(e.target.value) || 0)}
              />
              <Input
                label="Grid Connection ($)"
                type="number"
                value={input.grid_connection_cost}
                onChange={(e) =>
                  updateInput('grid_connection_cost', parseFloat(e.target.value) || 0)
                }
              />
            </div>
          </Card>

          {/* Operating Costs & Financial */}
          <Card className="bg-background-elevated border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Operating & Financial Parameters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="O&M Cost ($/kW/yr)"
                type="number"
                value={input.opex_per_kw_year}
                onChange={(e) =>
                  updateInput('opex_per_kw_year', parseFloat(e.target.value) || 0)
                }
              />
              <Input
                label="Discount Rate (%)"
                type="number"
                value={Math.round(input.discount_rate * 100)}
                onChange={(e) =>
                  updateInput('discount_rate', (parseFloat(e.target.value) || 0) / 100)
                }
              />
              <Input
                label="Electricity Price ($/MWh)"
                type="number"
                value={input.electricity_price_per_mwh}
                onChange={(e) =>
                  updateInput('electricity_price_per_mwh', parseFloat(e.target.value) || 0)
                }
              />
            </div>
          </Card>

          {/* Calculate Button */}
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={calculateTEA}
            loading={loading}
            leftIcon={<Calculator className="w-5 h-5" />}
            
          >
            Calculate TEA
          </Button>
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          {result ? (
            <>
              {/* Key Metrics */}
              <Card className="bg-background-elevated border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    Analysis Results
                  </h3>
                  <Badge variant="success" size="sm">
                    Complete
                  </Badge>
                </div>

                <div className="space-y-4">
                  {/* LCOE */}
                  <div className="p-4 rounded-lg bg-background-surface">
                    <Flex alignItems="center" justifyContent="between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <DollarSign className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <Text className="text-foreground-muted">LCOE</Text>
                          <Metric className="text-foreground">
                            ${result.lcoe}
                            <span className="text-sm font-normal text-foreground-muted">
                              /MWh
                            </span>
                          </Metric>
                        </div>
                      </div>
                      <BadgeDelta
                        deltaType={result.lcoe < 50 ? 'increase' : 'decrease'}
                      >
                        {result.lcoe < 50 ? 'Competitive' : 'High'}
                      </BadgeDelta>
                    </Flex>
                  </div>

                  {/* NPV */}
                  <div className="p-4 rounded-lg bg-background-surface">
                    <Flex alignItems="center" justifyContent="between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent-blue/10">
                          <TrendingUp className="w-5 h-5 text-accent-blue" />
                        </div>
                        <div>
                          <Text className="text-foreground-muted">NPV</Text>
                          <Metric className="text-foreground">
                            {formatCurrency(result.npv)}
                          </Metric>
                        </div>
                      </div>
                      <BadgeDelta
                        deltaType={result.npv > 0 ? 'increase' : 'decrease'}
                      >
                        {result.npv > 0 ? 'Profitable' : 'Unprofitable'}
                      </BadgeDelta>
                    </Flex>
                  </div>

                  {/* IRR */}
                  <div className="p-4 rounded-lg bg-background-surface">
                    <Flex alignItems="center" justifyContent="between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent-purple/10">
                          <Zap className="w-5 h-5 text-accent-purple" />
                        </div>
                        <div>
                          <Text className="text-foreground-muted">IRR</Text>
                          <Metric className="text-foreground">{result.irr}%</Metric>
                        </div>
                      </div>
                      <BadgeDelta deltaType={result.irr > 10 ? 'increase' : 'unchanged'}>
                        {result.irr > 10 ? 'Strong' : 'Moderate'}
                      </BadgeDelta>
                    </Flex>
                  </div>

                  {/* Payback */}
                  <div className="p-4 rounded-lg bg-background-surface">
                    <Flex alignItems="center" justifyContent="between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent-amber/10">
                          <Clock className="w-5 h-5 text-accent-amber" />
                        </div>
                        <div>
                          <Text className="text-foreground-muted">Payback</Text>
                          <Metric className="text-foreground">
                            {result.payback_years}
                            <span className="text-sm font-normal text-foreground-muted">
                              {' '}
                              years
                            </span>
                          </Metric>
                        </div>
                      </div>
                    </Flex>
                    <ProgressBar
                      value={(result.payback_years / input.project_lifetime_years) * 100}
                      color="amber"
                      className="mt-3"
                    />
                  </div>
                </div>
              </Card>

              {/* Cost Summary */}
              <Card className="bg-background-elevated border-border">
                <h3 className="text-lg font-semibold text-foreground mb-4">
                  Cost Summary
                </h3>
                <div className="space-y-3">
                  <Flex>
                    <Text className="text-foreground-muted">Total CAPEX</Text>
                    <Text className="text-foreground font-medium">
                      {formatCurrency(result.total_capex)}
                    </Text>
                  </Flex>
                  <Flex>
                    <Text className="text-foreground-muted">Annual OPEX</Text>
                    <Text className="text-foreground font-medium">
                      {formatCurrency(result.annual_opex)}
                    </Text>
                  </Flex>
                  <Flex>
                    <Text className="text-foreground-muted">Annual Production</Text>
                    <Text className="text-foreground font-medium">
                      {(result.annual_production_mwh / 1000).toFixed(0)} GWh
                    </Text>
                  </Flex>
                  <Flex>
                    <Text className="text-foreground-muted">Annual Revenue</Text>
                    <Text className="text-foreground font-medium">
                      {formatCurrency(result.annual_revenue)}
                    </Text>
                  </Flex>
                </div>
              </Card>

              {/* AI Insights */}
              <Card className="bg-gradient-to-br from-accent-purple/20 to-primary/10 border-accent-purple/30">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-accent-purple" />
                  <span className="font-medium text-foreground">AI Insights</span>
                  <Badge variant="primary" size="sm">
                    Pro
                  </Badge>
                </div>
                {insights ? (
                  <p className="text-sm text-foreground-muted whitespace-pre-line">
                    {insights}
                  </p>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full mt-2"
                    onClick={generateInsights}
                    loading={insightsLoading}
                    leftIcon={<Sparkles className="w-4 h-4" />}
                  >
                    Generate AI Insights
                  </Button>
                )}
              </Card>
            </>
          ) : (
            /* Empty State */
            <Card className="bg-background-elevated border-border">
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="p-4 rounded-full bg-background-surface mb-4">
                  <Calculator className="w-8 h-8 text-foreground-muted" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No Results Yet
                </h3>
                <p className="text-sm text-foreground-muted max-w-xs">
                  Configure your project parameters and click &quot;Calculate TEA&quot; to
                  see financial analysis results.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Cash Flow Chart */}
      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CashFlowChart cashFlows={result.cash_flows} />
          <CostBreakdownChart capex={result.capex_breakdown} type="capex" />
        </div>
      )}
    </div>
  )
}
