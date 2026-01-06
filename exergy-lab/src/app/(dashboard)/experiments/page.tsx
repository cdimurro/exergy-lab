'use client'

import { Suspense } from 'react'
import { FlaskConical } from 'lucide-react'
import { ExperimentWorkflow } from '@/components/experiments/workflow'
import { PageHeader, LoadingSpinner } from '@/components/shared'

export default function ExperimentsPage() {
  return (
    <div className="h-full flex flex-col">
      <PageHeader
        icon={FlaskConical}
        title="Experiment Design"
        description="AI-guided protocol generation with real-world validation"
      />

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <Suspense fallback={<LoadingSpinner size="md" centered />}>
          <ExperimentWorkflow />
        </Suspense>
      </div>
    </div>
  )
}
