'use client'

import { Zap } from 'lucide-react'
import { SimulationWorkflow } from '@/components/simulations/workflow'

export default function SimulationsPage() {
  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="border-b border-border bg-elevated px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Simulation Engine</h1>
            <p className="text-sm text-muted">
              AI-guided simulations with thermodynamic validation
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <SimulationWorkflow />
      </div>
    </div>
  )
}
