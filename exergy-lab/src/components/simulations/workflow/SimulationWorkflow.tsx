'use client'

/**
 * SimulationWorkflow Component
 *
 * Main orchestrating component for the AI-guided simulation workflow.
 * Handles the flow from setup -> plan generation -> review -> execution -> results.
 */

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle, ArrowLeft, Download, RefreshCw, Lightbulb, Check, Settings, Target } from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'
import { useSimulationWorkflow } from '@/hooks/useSimulationWorkflow'
import { TierSelector } from './TierSelector'
import { SimulationTypeSelector } from './SimulationTypeSelector'
import { GoalInput } from './GoalInput'
import { SimulationPlanCard } from './SimulationPlanCard'
import { KeyFindings } from './KeyFindings'
import { SampleSimulations } from '../SampleSimulations'
import {
  WorkflowStepper,
  WorkflowLayout,
  WorkflowSectionCard,
  GuidanceSidebar,
} from '@/components/shared/workflow'
import { buildReportData, extractGoalsFromDescription } from '@/lib/simulation-report-builder'
import { ReportDownloadButton } from '../ReportDownloadButton'
import { SaveWorkflowButton } from './SaveWorkflowButton'
import { useSimulationsStore } from '@/lib/store/simulations-store'
import type { SampleSimulation } from '@/data/sample-simulations'
import type { ExperimentDomain } from '@/types/exergy-experiment'
import type { RecommendationAction } from '@/types/simulation-workflow'

// Workflow steps configuration
const WORKFLOW_STEPS = [
  { id: 'setup', label: 'Setup', description: 'Configure simulation' },
  { id: 'generating', label: 'Generate', description: 'AI creates plan' },
  { id: 'review', label: 'Review', description: 'Adjust parameters' },
  { id: 'executing', label: 'Execute', description: 'Run simulation' },
  { id: 'complete', label: 'Complete', description: 'View results' },
]

// Guidance sidebar content
const HOW_IT_WORKS = [
  { step: 1, title: 'Choose Your Tier', description: 'Start with T1 for quick checks, use T2 for detailed analysis, or T3 for publication-grade results.' },
  { step: 2, title: 'Describe Your Goal', description: 'Provide operating conditions, materials, and expected outputs. The AI will auto-detect the simulation type.' },
  { step: 3, title: 'Review & Run', description: 'The AI generates a detailed plan with parameters. Review, adjust, and execute.' },
]

const TIPS = [
  'Include specific numbers (temperatures, pressures, flow rates)',
  'Mention materials and working fluids when relevant',
  'State what outputs you care about most',
  'Try the Quick Start examples above to see best practices',
]

export function SimulationWorkflow() {
  const workflow = useSimulationWorkflow()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [changeFeedback, setChangeFeedback] = useState('')
  const { toggleComparison, getSimulationById } = useSimulationsStore()

  // Calculate current step index
  const currentStepIndex = WORKFLOW_STEPS.findIndex((s) => s.id === workflow.phase)

  // Sample selection handler
  const handleSampleSelect = (sample: SampleSimulation) => {
    workflow.setTier(sample.tier)
    workflow.setSimulationType(sample.type)
    workflow.setGoal(sample.goal)
    // Auto-trigger generation after a brief delay
    setTimeout(() => {
      workflow.generatePlan()
    }, 500)
  }

  // Recommendation action handler
  const handleActionClick = (action: RecommendationAction) => {
    switch (action.type) {
      case 'tier-upgrade':
        // Upgrade tier and regenerate plan with same goal
        if (action.targetTier) {
          workflow.setTier(action.targetTier)
          // Keep current goal and parameters
          setTimeout(() => {
            workflow.generatePlan()
          }, 300)
        }
        break

      case 'sensitivity-analysis':
        // Augment goal with sensitivity analysis request
        if (action.targetGoal) {
          workflow.setGoal(action.targetGoal)
          setTimeout(() => {
            workflow.generatePlan()
          }, 300)
        }
        break

      case 'parametric-study':
        // Similar to sensitivity - augment goal
        if (action.targetGoal) {
          workflow.setGoal(action.targetGoal)
          setTimeout(() => {
            workflow.generatePlan()
          }, 300)
        }
        break

      case 'optimization':
        // Augment goal with optimization request
        if (action.targetGoal) {
          workflow.setGoal(action.targetGoal)
          setTimeout(() => {
            workflow.generatePlan()
          }, 300)
        }
        break

      case 'comparison':
        // Navigate to comparison mode or enable it
        if (action.navigateTo) {
          router.push(action.navigateTo)
        } else {
          toggleComparison()
        }
        break

      case 'validation':
      case 'experiment-design':
        // Navigate to experiments page
        if (action.navigateTo) {
          router.push(action.navigateTo)
        }
        break

      default:
        console.warn('[SimulationWorkflow] Unknown action type:', action.type)
    }
  }

  // URL-based loading of saved simulations
  useEffect(() => {
    const loadId = searchParams.get('load')
    const rerunId = searchParams.get('rerun')

    if (loadId) {
      // Load complete saved simulation
      const saved = getSimulationById(loadId)
      if (saved) {
        // Dispatch LOAD_SAVED action to workflow
        workflow.dispatch({
          type: 'LOAD_SAVED',
          payload: {
            plan: saved.plan,
            results: saved.results,
          },
        })

        // Clear URL params
        router.replace('/simulations')
      } else {
        console.warn('[SimulationWorkflow] Saved simulation not found:', loadId)
      }
    } else if (rerunId) {
      // Load parameters and regenerate plan
      const saved = getSimulationById(rerunId)
      if (saved) {
        workflow.setTier(saved.tier)
        workflow.setSimulationType(saved.simulationType)
        workflow.setGoal(saved.goal)

        // Trigger plan generation after a brief delay
        setTimeout(() => {
          workflow.generatePlan()
        }, 500)

        // Clear URL params
        router.replace('/simulations')
      } else {
        console.warn('[SimulationWorkflow] Saved simulation not found:', rerunId)
      }
    }
  }, [searchParams, getSimulationById, workflow, router])

  // Keyboard shortcuts for navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (workflow.phase !== 'setup' && workflow.phase !== 'review') return

      // Alt+Left: Go back
      if (e.altKey && e.key === 'ArrowLeft' && workflow.canNavigateBack) {
        e.preventDefault()
        workflow.navigateBack()
      }

      // Alt+Right: Go next
      if (e.altKey && e.key === 'ArrowRight' && workflow.canNavigateNext) {
        e.preventDefault()
        workflow.navigateNext()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [workflow.phase, workflow.canNavigateBack, workflow.canNavigateNext, workflow.navigateBack, workflow.navigateNext])

  // Phase-specific rendering
  const renderPhaseContent = () => {
    switch (workflow.phase) {
      case 'setup':
        return (
          <WorkflowLayout sidebar={<GuidanceSidebar howItWorks={HOW_IT_WORKS} tips={TIPS} />}>
            <WorkflowSectionCard title="Select Computational Tier" icon={Settings}>
              <TierSelector
                selectedTier={workflow.tier}
                onTierSelect={workflow.setTier}
              />
            </WorkflowSectionCard>

            <WorkflowSectionCard title="Simulation Type" icon={Target}>
              <SimulationTypeSelector
                selectedType={workflow.simulationType}
                detectedType={workflow.detectedType}
                onTypeSelect={workflow.setSimulationType}
              />
            </WorkflowSectionCard>

            <WorkflowSectionCard title="Describe Your Simulation Goal" icon={Target}>
              <GoalInput
                value={workflow.goal}
                onChange={workflow.setGoal}
                detectedType={workflow.detectedType}
              />
            </WorkflowSectionCard>

            <div className="flex justify-end">
              <Button
                onClick={workflow.generatePlan}
                disabled={!workflow.canGenerate}
                size="lg"
              >
                Generate Simulation Plan
              </Button>
            </div>
          </WorkflowLayout>
        )

      case 'generating':
        return (
          <div className="space-y-6">
            <Card className="p-8 bg-card-dark border-border">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary" />
                <h3 className="text-lg font-semibold text-foreground">
                  {workflow.isRegenerating ? 'Updating Plan...' : 'Generating Plan...'}
                </h3>
                <p className="text-muted max-w-md">
                  {workflow.planProgress.currentStep || 'Analyzing your simulation goal...'}
                </p>
                <div className="w-full max-w-md">
                  <div className="h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${workflow.planProgress.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted mt-2">
                    {workflow.planProgress.percentage}% complete
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )

      case 'review':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2/3: Plan Details */}
            <div className="lg:col-span-2">
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
            </div>

            {/* Right 1/3: Review Checklist + Actions */}
            <div className="space-y-4">
              {/* Review Checklist */}
              <Card className="p-4 bg-elevated border-border">
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Review Checklist
                </h3>
                <div className="space-y-2 text-xs text-muted">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>Verify all parameters match your system specifications</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>Check that operating conditions are realistic and safe</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>Confirm expected outputs align with your goals</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>Review methodology for physics accuracy</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>Verify estimated duration and cost are acceptable</span>
                  </div>
                </div>
              </Card>

              {/* Need Changes Card */}
              <Card className="p-4 bg-primary/5 border-primary/20">
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  Need Changes?
                </h3>
                <p className="text-xs text-muted mb-3">
                  The plan can be regenerated with your feedback. You can request changes in natural language or edit parameters directly.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
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
              </Card>

              {/* Accept and Run Card */}
              <Card className="p-4 bg-elevated border-border">
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  Ready to Run?
                </h3>
                <p className="text-xs text-muted mb-3">
                  Once you approve, the simulation will execute with physics validation and uncertainty quantification.
                </p>
                <Button
                  onClick={workflow.approvePlan}
                  disabled={!workflow.canApprove}
                  size="lg"
                  className="w-full"
                >
                  Accept Plan and Run
                </Button>
              </Card>

              {/* Start Over Option */}
              <Button
                variant="ghost"
                size="sm"
                onClick={workflow.reset}
                className="w-full text-muted"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Start Over
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
                <h3 className="text-lg font-semibold text-foreground">Running Simulation</h3>
                <p className="text-muted max-w-md">
                  {workflow.executionProgress.message || 'Processing...'}
                </p>
                <div className="w-full max-w-md">
                  <div className="h-2 bg-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${workflow.executionProgress.percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted mt-2">
                    {workflow.executionProgress.percentage}% complete | Elapsed: {Math.floor(workflow.elapsedTime / 1000)}s
                  </p>
                </div>
              </div>
            </Card>

            {/* Plan Summary */}
            {workflow.plan && (
              <Card className="p-4 bg-card-dark border-border">
                <h4 className="text-sm font-medium text-muted mb-2">
                  Running Plan
                </h4>
                <p className="text-foreground font-medium">{workflow.plan.title}</p>
                <p className="text-xs text-muted mt-1">
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
                <h3 className="text-lg font-semibold text-foreground">Simulation Complete</h3>
                <p className="text-muted">
                  {workflow.plan?.title}
                </p>
              </div>
              <div className="flex gap-2">
                <SaveWorkflowButton onSave={workflow.saveCurrentSimulation} />
                {workflow.results && workflow.plan && (
                  <ReportDownloadButton
                    reportData={buildReportData(workflow.results, {
                      tier: workflow.plan.tier,
                      title: workflow.plan.title,
                      description: workflow.plan.methodology,
                      domain: workflow.plan.simulationType as ExperimentDomain,
                      goals: extractGoalsFromDescription(workflow.goal),
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
                onActionClick={handleActionClick}
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
                  <p className="text-sm text-muted mt-1">{workflow.error}</p>
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
    <div className="w-full space-y-6">
      {/* Workflow Stepper */}
      <WorkflowStepper
        steps={WORKFLOW_STEPS}
        currentStepIndex={currentStepIndex}
        disabledSteps={['generating', 'executing']}
      />

      {/* Phase Content */}
      {renderPhaseContent()}
    </div>
  )
}

export default SimulationWorkflow
