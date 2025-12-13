import { Header } from '@/components/layout/Header'
import { KPICard } from '@/components/ui/KPICard'
import { Button } from '@/components/ui/Button'
import { Plus, TrendingUp, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function Dashboard() {
  const navigate = useNavigate()

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle="Overview of your clean energy projects"
      />

      <div className="p-6 space-y-6">
        {/* Welcome Banner */}
        <div className="card-elevated bg-gradient-to-r from-primary/10 to-accent-blue/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">
                Welcome to Clean Energy Intelligence
              </h2>
              <p className="text-text-secondary mt-1">
                Build, analyze, and optimize your clean energy projects with AI-powered TEA tools.
              </p>
              <div className="flex gap-3 mt-4">
                <Button
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => navigate('/tea')}
                >
                  New TEA Analysis
                </Button>
                <Button variant="secondary" onClick={() => navigate('/upload')}>
                  Upload Data
                </Button>
              </div>
            </div>
            <div className="hidden lg:block">
              <Zap className="w-24 h-24 text-primary/20" />
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Active Projects"
            value="12"
            change={8.5}
            changeLabel="vs last month"
          />
          <KPICard
            title="Avg. LCOE"
            value="$42.50"
            unit="/MWh"
            change={-5.2}
            changeLabel="improvement"
          />
          <KPICard
            title="Total Capacity"
            value="1.2"
            unit="GW"
            change={15.3}
            changeLabel="growth"
          />
          <KPICard
            title="CO2 Avoided"
            value="2.4M"
            unit="tons/yr"
            change={12.1}
            changeLabel="increase"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Projects */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">
                Recent Projects
              </h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
                View all
              </Button>
            </div>
            <div className="space-y-3">
              {[
                { name: 'Solar Farm - Texas', type: 'Solar PV', lcoe: '$38.20/MWh', status: 'complete' },
                { name: 'Offshore Wind - North Sea', type: 'Wind', lcoe: '$62.50/MWh', status: 'analyzing' },
                { name: 'Green H2 Facility', type: 'Hydrogen', lcoe: '$3.20/kg', status: 'draft' },
              ].map((project) => (
                <div
                  key={project.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-surface-elevated hover:bg-border transition-colors cursor-pointer"
                >
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {project.name}
                    </p>
                    <p className="text-xs text-text-muted">{project.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-primary">
                      {project.lcoe}
                    </p>
                    <span
                      className={`badge ${
                        project.status === 'complete'
                          ? 'badge-success'
                          : project.status === 'analyzing'
                          ? 'badge-warning'
                          : 'bg-surface text-text-muted'
                      }`}
                    >
                      {project.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Calculator */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">
                Quick LCOE Calculator
              </h3>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Capacity (MW)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="100"
                    defaultValue="100"
                  />
                </div>
                <div>
                  <label className="label">CAPEX ($/kW)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="1000"
                    defaultValue="1000"
                  />
                </div>
                <div>
                  <label className="label">O&M ($/kW/yr)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="15"
                    defaultValue="15"
                  />
                </div>
                <div>
                  <label className="label">Capacity Factor (%)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="25"
                    defaultValue="25"
                  />
                </div>
              </div>
              <Button className="w-full" onClick={() => navigate('/tea')}>
                Calculate Full TEA
              </Button>
            </div>
          </div>
        </div>

        {/* Technology Comparison */}
        <div className="card">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Technology LCOE Comparison (2024)
          </h3>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Technology</th>
                  <th>CAPEX ($/kW)</th>
                  <th>Capacity Factor</th>
                  <th>LCOE Range</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { tech: 'Utility Solar', capex: '$800-1,200', cf: '22-28%', lcoe: '$24-45', trend: -8 },
                  { tech: 'Onshore Wind', capex: '$1,200-1,600', cf: '30-42%', lcoe: '$26-50', trend: -5 },
                  { tech: 'Offshore Wind', capex: '$2,800-4,200', cf: '40-52%', lcoe: '$55-85', trend: -12 },
                  { tech: 'Battery Storage (4h)', capex: '$1,000-1,400', cf: '12-18%', lcoe: '$120-180', trend: -15 },
                  { tech: 'Green Hydrogen', capex: '$600-1,000', cf: '40-60%', lcoe: '$3-6/kg', trend: -10 },
                ].map((row) => (
                  <tr key={row.tech}>
                    <td className="font-medium">{row.tech}</td>
                    <td>{row.capex}</td>
                    <td>{row.cf}</td>
                    <td className="text-primary font-medium">{row.lcoe}</td>
                    <td>
                      <span className="flex items-center gap-1 text-success">
                        <TrendingUp className="w-4 h-4" />
                        {row.trend}% YoY
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
