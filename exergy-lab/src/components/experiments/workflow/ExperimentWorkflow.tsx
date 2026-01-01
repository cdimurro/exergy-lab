/**
 * Experiment Workflow Component
 *
 * Main orchestrator for the AI-guided experiment design workflow.
 * Phases: Setup → Generating → Review → Validating → Complete
 */

'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useExperimentWorkflow } from '@/hooks/useExperimentWorkflow'
import { useExperimentsStore } from '@/lib/store/experiments-store'
import { WorkflowStepper } from '@/components/shared/workflow'
import { SetupPhase } from './SetupPhase'
import { GeneratingPhase } from './GeneratingPhase'
import { ReviewPhase } from './ReviewPhase'
import { ValidatingPhase } from './ValidatingPhase'
import { CompletePhase } from './CompletePhase'

// Workflow steps configuration
const WORKFLOW_STEPS = [
  { id: 'setup', label: 'Setup', description: 'Define experiment goal' },
  { id: 'generating', label: 'Generating', description: 'AI creates protocol' },
  { id: 'review', label: 'Review', description: 'Edit and approve' },
  { id: 'validating', label: 'Validating', description: 'Check accuracy' },
  { id: 'complete', label: 'Complete', description: 'View results' },
]

export function ExperimentWorkflow() {
  const workflow = useExperimentWorkflow()
  const searchParams = useSearchParams()

  // Calculate current step index
  const currentStepIndex = WORKFLOW_STEPS.findIndex((s) => s.id === workflow.phase)

  // Load saved experiment or import from Search
  useEffect(() => {
    // Load saved experiment
    const loadId = searchParams.get('load')
    if (loadId) {
      // TODO: Get experiment from store
      console.log('Loading experiment:', loadId)
    }

    // Rerun saved experiment
    const rerunId = searchParams.get('rerun')
    if (rerunId) {
      // TODO: Load and reset to setup phase
      console.log('Rerunning experiment:', rerunId)
    }

    // Import from Search
    const importFlag = searchParams.get('import')
    const goalParam = searchParams.get('goal')
    if (importFlag === 'true' && goalParam) {
      workflow.setGoal(decodeURIComponent(goalParam))

      // If there's source paper data in sessionStorage
      const sourcePapersJson = sessionStorage.getItem('experiment-source-papers')
      if (sourcePapersJson) {
        try {
          const sourcePapers = JSON.parse(sourcePapersJson)
          workflow.setSourcePapers(sourcePapers)
          sessionStorage.removeItem('experiment-source-papers')
        } catch (error) {
          console.error('Failed to parse source papers:', error)
        }
      }
    }

    // Import from experiment file
    const experimentFileJson = sessionStorage.getItem('experiment-import-file')
    if (experimentFileJson) {
      try {
        const experimentFile = JSON.parse(experimentFileJson)
        // TODO: Load experiment file data
        console.log('Importing experiment file:', experimentFile)
        sessionStorage.removeItem('experiment-import-file')
      } catch (error) {
        console.error('Failed to parse experiment file:', error)
      }
    }
  }, [searchParams])

  // Render phase-specific content
  const renderPhaseContent = () => {
    switch (workflow.phase) {
      case 'setup':
        return <SetupPhase workflow={workflow} />

      case 'generating':
        return <GeneratingPhase progress={workflow.planProgress} />

      case 'review':
        return (
          <ReviewPhase
            plan={workflow.plan}
            onUpdateMaterial={workflow.updateMaterial}
            onUpdateStep={workflow.updateStep}
            onAddMaterial={workflow.addMaterial}
            onRemoveMaterial={workflow.removeMaterial}
            onAddStep={workflow.addStep}
            onRemoveStep={workflow.removeStep}
            onApprove={workflow.approvePlan}
            onBack={() => workflow.reset()}
          />
        )

      case 'validating':
        return (
          <ValidatingPhase
            progress={workflow.validationProgress}
            onStart={workflow.validateProtocol}
            canStart={workflow.canValidate}
          />
        )

      case 'complete':
        return (
          <CompletePhase
            plan={workflow.plan}
            validation={workflow.validation}
            failureAnalysis={workflow.failureAnalysis}
            keyFindings={workflow.keyFindings}
            onReset={workflow.reset}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Error Display */}
      {workflow.error && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
          <div className="flex items-start gap-2">
            <span className="font-medium">Error:</span>
            <span>{workflow.error}</span>
          </div>
        </div>
      )}

      {/* Workflow Stepper */}
      <WorkflowStepper
        steps={WORKFLOW_STEPS}
        currentStepIndex={currentStepIndex}
        disabledSteps={['generating', 'validating']}
      />

      {/* Phase Content */}
      {renderPhaseContent()}
    </div>
  )
}
