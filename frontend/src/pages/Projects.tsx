import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Plus, Search, Filter, MoreVertical } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const MOCK_PROJECTS = [
  {
    id: '1',
    name: 'Solar Farm - Texas Hill Country',
    technology: 'Solar PV',
    capacity: '150 MW',
    lcoe: '$35.20/MWh',
    npv: '$42.5M',
    status: 'complete',
    updated: '2 hours ago',
  },
  {
    id: '2',
    name: 'North Sea Offshore Wind',
    technology: 'Offshore Wind',
    capacity: '500 MW',
    lcoe: '$62.80/MWh',
    npv: '$185.2M',
    status: 'analyzing',
    updated: '1 day ago',
  },
  {
    id: '3',
    name: 'Green Hydrogen - Gulf Coast',
    technology: 'Electrolyzer',
    capacity: '100 MW',
    lcoe: '$3.45/kg',
    npv: '$28.9M',
    status: 'draft',
    updated: '3 days ago',
  },
  {
    id: '4',
    name: 'Battery Storage - California',
    technology: 'Li-ion Storage',
    capacity: '200 MW/800 MWh',
    lcoe: '$142/MWh',
    npv: '$15.8M',
    status: 'complete',
    updated: '1 week ago',
  },
  {
    id: '5',
    name: 'Onshore Wind - Great Plains',
    technology: 'Wind',
    capacity: '300 MW',
    lcoe: '$28.50/MWh',
    npv: '$95.4M',
    status: 'complete',
    updated: '2 weeks ago',
  },
]

export function Projects() {
  const navigate = useNavigate()

  return (
    <div>
      <Header title="Projects" subtitle="Manage your TEA projects" />

      <div className="p-6 space-y-6">
        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search projects..."
                className="input pl-9 w-80"
              />
            </div>
            <Button variant="secondary" leftIcon={<Filter className="w-4 h-4" />}>
              Filter
            </Button>
          </div>
          <Button
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/tea')}
          >
            New Project
          </Button>
        </div>

        {/* Projects Table */}
        <div className="card p-0 overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Technology</th>
                <th>Capacity</th>
                <th>LCOE</th>
                <th>NPV</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {MOCK_PROJECTS.map((project) => (
                <tr
                  key={project.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <td>
                    <span className="font-medium text-text-primary">
                      {project.name}
                    </span>
                  </td>
                  <td>{project.technology}</td>
                  <td>{project.capacity}</td>
                  <td className="text-primary font-medium">{project.lcoe}</td>
                  <td>{project.npv}</td>
                  <td>
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
                  </td>
                  <td className="text-text-muted">{project.updated}</td>
                  <td>
                    <button
                      className="p-1 rounded hover:bg-surface-elevated"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-4 h-4 text-text-muted" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">
            Showing 1-5 of 12 projects
          </p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled>
              Previous
            </Button>
            <Button variant="secondary" size="sm">
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
