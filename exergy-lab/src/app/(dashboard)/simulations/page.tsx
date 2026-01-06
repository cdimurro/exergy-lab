'use client'

import { Suspense } from 'react'
import { Zap } from 'lucide-react'
import { SimulationWorkflow } from '@/components/simulations/workflow'
import { PageHeader, LoadingSpinner } from '@/components/shared'

export default function SimulationsPage() {
  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={Zap}
        title="Simulation Engine"
        description="AI-guided simulations with thermodynamic validation"
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <Suspense fallback={<LoadingSpinner size="md" centered />}>
          <SimulationWorkflow />
        </Suspense>
      </div>
    </div>
  )
}
