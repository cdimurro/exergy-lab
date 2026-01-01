'use client'

import { SimulationWorkflow } from '@/components/simulations/workflow'

export default function SimulationsPage() {
  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-2xl font-bold text-white">Simulation Engine</h1>
        <p className="text-sm text-foreground-subtle mt-1">
          AI-guided simulations with thermodynamic validation
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <SimulationWorkflow />
      </div>
    </div>
  )
}
