'use client'

import * as React from 'react'
import { FlaskConical, AlertCircle, Sparkles, Download } from 'lucide-react'
import { ExperimentForm, ProtocolViewer, FailureAnalysisComponent } from '@/components/experiments'
import { Tabs, Button } from '@/components/ui'
import type { ExperimentGoal, Experiment } from '@/types/experiment'

export default function ExperimentsPage() {
  const [isLoading, setIsLoading] = React.useState(false)
  const [experiment, setExperiment] = React.useState<Experiment | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const handleGenerateExperiment = async (goal: ExperimentGoal) => {
    setIsLoading(true)
    setError(null)

    try {
      // Step 1: Generate protocol
      const designResponse = await fetch('/api/experiments/design', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal }),
      })

      if (!designResponse.ok) {
        throw new Error('Failed to generate protocol')
      }

      const { protocol } = await designResponse.json()

      // Step 2: Generate failure analysis
      const analyzeResponse = await fetch('/api/experiments/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ protocol }),
      })

      if (!analyzeResponse.ok) {
        throw new Error('Failed to generate failure analysis')
      }

      const { failureAnalysis } = await analyzeResponse.json()

      // Combine results
      setExperiment({
        protocol,
        failureAnalysis,
      })
    } catch (err) {
      console.error('Experiment generation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate experiment')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = () => {
    if (!experiment) return

    // Create a formatted document
    const doc = `
EXPERIMENT PROTOCOL
==================

Title: ${experiment.protocol.title}
Domain: ${experiment.protocol.goal.domain}
Created: ${new Date(experiment.protocol.createdAt).toLocaleString()}

DESCRIPTION
-----------
${experiment.protocol.goal.description}

OBJECTIVES
----------
${experiment.protocol.goal.objectives.map((obj, i) => `${i + 1}. ${obj}`).join('\n')}

MATERIALS
---------
${experiment.protocol.materials.map((m) => `• ${m.name}: ${m.quantity} ${m.unit}${m.specification ? ` (${m.specification})` : ''}`).join('\n')}

EQUIPMENT
---------
${experiment.protocol.equipment.map((e) => `• ${e}`).join('\n')}

PROCEDURE
---------
${experiment.protocol.steps.map((s) => `
Step ${s.step}: ${s.title}
${s.description}
${s.duration ? `Duration: ${s.duration}` : ''}
${s.temperature ? `Temperature: ${s.temperature}` : ''}
${s.safety ? `Safety: ${s.safety.join(', ')}` : ''}
`).join('\n')}

SAFETY WARNINGS
---------------
${experiment.protocol.safetyWarnings.map((w) => `
[${w.level.toUpperCase()}] ${w.category}
${w.description}
Mitigation: ${w.mitigation}
`).join('\n')}

EXPECTED RESULTS
----------------
${experiment.protocol.expectedResults}

FAILURE ANALYSIS
----------------
Risk Score: ${experiment.failureAnalysis.riskScore}/100

Potential Failure Modes:
${experiment.failureAnalysis.potentialFailures.map((f, i) => `
${i + 1}. ${f.description}
   Frequency: ${f.frequency}
   Impact: ${f.impact}
   Causes: ${f.causes.join(', ')}
   Preventions: ${f.preventions.join(', ')}
`).join('\n')}

Recommendations:
${experiment.failureAnalysis.recommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}

METADATA
--------
Estimated Duration: ${experiment.protocol.estimatedDuration}
Estimated Cost: $${experiment.protocol.estimatedCost || 'TBD'}
Protocol ID: ${experiment.protocol.id}

---
Generated with AI-Powered Clean Energy Research Platform
    `.trim()

    // Download as text file
    const blob = new Blob([doc], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `experiment_${experiment.protocol.id}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                <FlaskConical className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Experiment Designer</h1>
                <p className="text-sm text-foreground-muted mt-1">
                  AI-powered experiment protocol generation with failure analysis
                </p>
              </div>
            </div>

            {experiment && (
              <Button onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export Protocol
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <div className="p-6 rounded-xl bg-background-elevated border border-border">
                <h2 className="text-lg font-semibold text-foreground mb-4">Experiment Goal</h2>
                <ExperimentForm onSubmit={handleGenerateExperiment} isLoading={isLoading} />
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2">
            {/* Error State */}
            {error && (
              <div className="p-6 rounded-xl bg-red-50 border border-red-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-900 mb-1">Generation Error</h3>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="p-12 text-center rounded-xl bg-background-elevated border border-border">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <FlaskConical className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      AI is Designing Your Experiment
                    </h3>
                    <p className="text-sm text-foreground-muted">
                      Generating protocol and analyzing potential failure modes...
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Results */}
            {!isLoading && !error && experiment && (
              <Tabs
                tabs={[
                  {
                    value: 'protocol',
                    label: 'Protocol',
                    content: (
                      <ProtocolViewer protocol={experiment.protocol} onExport={handleExport} />
                    ),
                  },
                  {
                    value: 'failure-analysis',
                    label: 'Failure Analysis',
                    content: <FailureAnalysisComponent analysis={experiment.failureAnalysis} />,
                  },
                ]}
                defaultValue="protocol"
              />
            )}

            {/* Empty State */}
            {!isLoading && !error && !experiment && (
              <div className="p-12 text-center rounded-xl bg-background-elevated border border-border">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Design Your Experiment
                    </h3>
                    <p className="text-sm text-foreground-muted mb-4">
                      Describe your experiment goal and let AI generate a detailed protocol
                    </p>
                    <div className="text-xs text-foreground-muted space-y-1">
                      <p>• Automatic materials list generation</p>
                      <p>• Step-by-step procedures with safety warnings</p>
                      <p>• Comprehensive failure mode analysis</p>
                      <p>• Historical data from similar experiments</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
