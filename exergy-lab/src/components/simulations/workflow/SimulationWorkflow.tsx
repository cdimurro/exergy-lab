'use client'

/**
 * SimulationWorkflow Component
 *
 * Main orchestrating component for the AI-guided simulation workflow.
 * Handles the flow from setup -> plan generation -> review -> execution -> results.
 */

import { useState } from 'react'
import { AlertCircle, ArrowLeft, Download, RefreshCw } from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'
import { useSimulationWorkflow } from '@/hooks/useSimulationWorkflow'
import { TierSelector } from './TierSelector'
import { SimulationTypeSelector } from './SimulationTypeSelector'
import { GoalInput } from './GoalInput'
import { SimulationPlanCard } from './SimulationPlanCard'
import { KeyFindings } from './KeyFindings'
import { buildReportData } from '@/lib/simulation-report-builder'
import { ReportDownloadButton } from '../ReportDownloadButton'

export function SimulationWorkflow() {
  const workflow = useSimulationWorkflow()
  const [changeFeedback, setChangeFeedback] = useState('')

  // Phase-specific rendering
  const renderPhaseContent = () => {
    switch (workflow.phase) {
      case 'setup':
        return (
          <div className="space-y-6">
            {/* Tier Selection */}
            <TierSelector
              selectedTier={workflow.tier}
              onTierSelect={workflow.setTier}
            />

            {/* Simulation Type Selection */}
            <SimulationTypeSelector
              selectedType={workflow.simulationType}
              detectedType={workflow.detectedType}
              onTypeSelect={workflow.setSimulationType}
            />

            {/* Goal Input */}
            <GoalInput
              value={workflow.goal}
              onChange={workflow.setGoal}
              detectedType={workflow.detectedType}
            />

            {/* Generate Button */}
            <div className="flex justify-end">
              <Button
                onClick={workflow.generatePlan}
                disabled={!workflow.canGenerate}
                size="lg"
              >
                Generate Simulation Plan
              </Button>
            </div>
          </div>
        )

      case 'generating':
        return (
          <div className="space-y-6">
            <Card className="p-8 bg-card-dark border-border">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
                <h3 className="text-lg font-semibold text-white">
                  {workflow.isRegenerating ? 'Updating Plan...' : 'Generating Plan...'}
                </h3>
                <p className="text-foreground-subtle max-w-md">
                  {workflow.planProgress.currentStep || 'Analyzing your simulation goal...'}
                </p>
                <div className="w-full max-w-md">
                  <div className="h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${workflow.planProgress.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-foreground-subtle mt-2">
                    {workflow.planProgress.percentage}% complete
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )

      case 'review':
        return (
          <div className="space-y-6">
            {/* Back to Setup */}
            <Button
              variant="ghost"
              size="sm"
              onClick={workflow.reset}
              className="text-foreground-subtle"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Start Over
            </Button>

            {/* Plan Card */}
            {workflow.plan && (
              <SimulationPlanCard
                plan={workflow.plan}
                onParameterChange={workflow.updateParameter}
                onRequestChanges={(feedback) => {
                  setChangeFeedback(feedback)
                  workflow.regeneratePlan(feedback)
                }}
              />
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center">
              <Button
                variant="secondary"
                onClick={() => {
                  const feedback = prompt('Describe your changes:')
                  if (feedback) {
                    workflow.regeneratePlan(feedback)
                  }
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Request Changes
              </Button>

              <Button
                onClick={workflow.approvePlan}
                disabled={!workflow.canApprove}
                size="lg"
              >
                Accept Plan and Run
              </Button>
            </div>
          </div>
        )

      case 'executing':
        return (
          <div className="space-y-6">
            <Card className="p-8 bg-card-dark border-border">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
                <h3 className="text-lg font-semibold text-white">Running Simulation</h3>
                <p className="text-foreground-subtle max-w-md">
                  {workflow.executionProgress.message || 'Processing...'}
                </p>
                <div className="w-full max-w-md">
                  <div className="h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${workflow.executionProgress.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-foreground-subtle mt-2">
                    {workflow.executionProgress.percentage}% complete | Elapsed: {Math.floor(workflow.elapsedTime / 1000)}s
                  </p>
                </div>
              </div>
            </Card>

            {/* Plan Summary */}
            {workflow.plan && (
              <Card className="p-4 bg-card-dark border-border">
                <h4 className="text-sm font-medium text-foreground-subtle mb-2">
                  Running Plan
                </h4>
                <p className="text-white font-medium">{workflow.plan.title}</p>
                <p className="text-xs text-foreground-subtle mt-1">
                  Tier: {workflow.plan.tier.toUpperCase()} |
                  Type: {workflow.plan.simulationType}
                </p>
              </Card>
            )}
          </div>
        )

      case 'complete':
        return (
          <div className="space-y-6">
            {/* Success Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white">Simulation Complete</h3>
                <p className="text-foreground-subtle">
                  {workflow.plan?.title}
                </p>
              </div>
              <div className="flex gap-2">
                {workflow.results && workflow.plan && (
                  <ReportDownloadButton
                    reportData={buildReportData(workflow.results, {
                      tier: workflow.plan.tier,
                      title: workflow.plan.title,
                      description: workflow.plan.methodology,
                      parameters: workflow.plan.parameters.map(p => ({
                        name: p.name,
                        value: p.value,
                        unit: p.unit,
                        description: p.description,
                      })),
                    })}
                  />
                )}
                <Button variant="secondary" onClick={workflow.reset}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  New Simulation
                </Button>
              </div>
            </div>

            {/* Key Findings */}
            {workflow.results && (
              <KeyFindings
                results={workflow.results}
                plan={workflow.plan}
              />
            )}
          </div>
        )

      case 'error':
        return (
          <div className="space-y-6">
            <Card className="p-4 bg-red-500/10 border-red-500/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-red-400">Simulation Error</p>
                  <p className="text-sm text-foreground-subtle mt-1">{workflow.error}</p>
                </div>
              </div>
            </Card>

            <div className="flex gap-4">
              <Button variant="secondary" onClick={workflow.reset}>
                Start Over
              </Button>
              {workflow.plan && (
                <Button onClick={workflow.approvePlan}>
                  Retry Execution
                </Button>
              )}
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Phase Indicator */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          {['setup', 'generating', 'review', 'executing', 'complete'].map((phase, i) => (
            <div key={phase} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  phase === workflow.phase
                    ? 'bg-primary text-white'
                    : ['generating', 'review', 'executing', 'complete'].indexOf(workflow.phase) > i
                    ? 'bg-primary/30 text-primary'
                    : 'bg-border text-foreground-subtle'
                }`}
              >
                {i + 1}
              </div>
              {i < 4 && (
                <div
                  className={`w-12 h-0.5 ${
                    ['generating', 'review', 'executing', 'complete'].indexOf(workflow.phase) > i
                      ? 'bg-primary/30'
                      : 'bg-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-foreground-subtle">
          <span>Setup</span>
          <span>Generate</span>
          <span>Review</span>
          <span>Execute</span>
          <span>Complete</span>
        </div>
      </div>

      {/* Phase Content */}
      {renderPhaseContent()}
    </div>
  )
}

export default SimulationWorkflow
