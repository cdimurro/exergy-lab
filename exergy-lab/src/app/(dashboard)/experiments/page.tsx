'use client'

import * as React from 'react'
import { Suspense } from 'react'
import { Zap } from 'lucide-react'
import { ExperimentWorkflow } from '@/components/experiments/workflow'

export default function ExperimentsPage() {
  return (
    <div className="h-full flex flex-col">
      {/* Page Header */}
      <div className="border-b border-border bg-elevated px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Experiment Design</h1>
            <p className="text-sm text-muted">
              AI-guided protocol generation with real-world validation
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
            </div>
          }
        >
          <ExperimentWorkflow />
        </Suspense>
      </div>
    </div>
  )
}
