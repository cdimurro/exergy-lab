/**
 * ExecutionPlanViewer Component
 *
 * Displays workflow execution plan with:
 * - Plan overview with statistics
 * - Expandable phase timeline
 * - Inline parameter editing
 * - Approve/Modify/Reject actions
 * - Dependency visualization
 */

'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { PhaseCard } from './phase-card'
import type { ExecutionPlan, PhaseModification } from '@/types/workflow'

interface ExecutionPlanViewerProps {
  plan: ExecutionPlan
  workflowId: string
  onApprove: (modifications: PhaseModification[]) => void
  onReject: (reason?: string) => void
  isLoading?: boolean
}

export function ExecutionPlanViewer({
  plan,
  workflowId,
  onApprove,
  onReject,
  isLoading = false,
}: ExecutionPlanViewerProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set([plan.phases[0]?.id]))
  const [modifications, setModifications] = useState<PhaseModification[]>([])
  const [showDependencies, setShowDependencies] = useState(false)

  // Toggle phase expansion
  const togglePhaseExpansion = (phaseId: string) => {
    const newExpanded = new Set(expandedPhases)
    if (newExpanded.has(phaseId)) {
      newExpanded.delete(phaseId)
    } else {
      newExpanded.add(phaseId)
    }
    setExpandedPhases(newExpanded)
  }

  // Expand all phases
  const expandAll = () => {
    setExpandedPhases(new Set(plan.phases.map((p) => p.id)))
  }

  // Collapse all phases
  const collapseAll = () => {
    setExpandedPhases(new Set())
  }

  // Handle phase modification
  const handlePhaseModify = (modification: PhaseModification) => {
    setModifications((prev) => {
      const existingIndex = prev.findIndex((m) => m.phaseId === modification.phaseId)
      if (existingIndex >= 0) {
        const updated = [...prev]
        updated[existingIndex] = modification
        return updated
      }
      return [...prev, modification]
    })
  }

  // Handle approve
  const handleApprove = () => {
    onApprove(modifications)
  }

  // Handle reject
  const handleReject = () => {
    onReject('User rejected plan')
  }

  // Format duration
  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000)
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m`
  }

  // Calculate total tools
  const totalTools = plan.phases.reduce((sum, phase) => sum + phase.tools.length, 0)

  // Count optional phases
  const optionalPhases = plan.phases.filter((p) => p.optional).length

  return (
    <div className="space-y-6">
      {/* Plan Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-2">Execution Plan</h2>
          <p className="text-muted-foreground max-w-2xl">{plan.overview}</p>
        </div>

        {/* Plan Actions */}
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="secondary" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
      </div>

      {/* Plan Statistics Card */}
      <Card className="p-6 bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-blue-500/20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {/* Total Phases */}
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{plan.phases.length}</div>
            <div className="text-sm text-muted-foreground mt-1">
              Phase{plan.phases.length !== 1 ? 's' : ''}
            </div>
            {optionalPhases > 0 && (
              <div className="text-xs text-muted-foreground mt-1">
                ({optionalPhases} optional)
              </div>
            )}
          </div>

          {/* Total Tools */}
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{totalTools}</div>
            <div className="text-sm text-muted-foreground mt-1">Tool Calls</div>
          </div>

          {/* Estimated Duration */}
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {formatDuration(plan.estimatedDuration)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Est. Duration</div>
          </div>

          {/* Estimated Cost */}
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-600">
              ${plan.estimatedCost.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground mt-1">Est. Cost</div>
          </div>
        </div>

        {/* Required Tools */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Required Tools</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDependencies(!showDependencies)}
            >
              {showDependencies ? 'Hide' : 'Show'} Dependencies
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {plan.requiredTools.map((tool) => (
              <Badge key={tool} variant="secondary" className="font-mono text-xs">
                {tool}
              </Badge>
            ))}
          </div>
        </div>

        {/* Dependencies Visualization */}
        {showDependencies && plan.dependencies.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-semibold mb-3">Phase Dependencies</h4>
            <div className="space-y-2 text-sm">
              {plan.dependencies.map((dep, idx) => {
                const phase = plan.phases.find((p) => p.id === dep.phaseId)
                const dependsOnPhases = dep.dependsOn
                  .map((id) => plan.phases.find((p) => p.id === id)?.title)
                  .filter(Boolean)

                return (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-muted-foreground">→</span>
                    <div>
                      <span className="font-medium">{phase?.title}</span>
                      <span className="text-muted-foreground"> depends on </span>
                      <span className="font-medium">{dependsOnPhases.join(', ')}</span>
                      {dep.dataFlow && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {dep.dataFlow}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>

      {/* Phase Timeline */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-xl font-semibold">Execution Phases</h3>
          {modifications.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {modifications.length} modification{modifications.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>

        <div className="space-y-4">
          {plan.phases.map((phase, index) => (
            <div key={phase.id} className="relative">
              {/* Connection Line to Next Phase */}
              {index < plan.phases.length - 1 && (
                <div className="absolute left-6 top-full h-4 w-0.5 bg-border" />
              )}

              <PhaseCard
                phase={phase}
                index={index}
                isExpanded={expandedPhases.has(phase.id)}
                onToggleExpand={() => togglePhaseExpansion(phase.id)}
                onModify={handlePhaseModify}
                showModifyControls={true}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <Card className="p-6 bg-muted/50">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground">
            {modifications.length === 0 ? (
              <span>Review the plan above and approve to start execution</span>
            ) : (
              <span>
                You have made {modifications.length} modification
                {modifications.length !== 1 ? 's' : ''}. Approve to execute with changes.
              </span>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleReject} disabled={isLoading}>
              Reject Plan
            </Button>

            <Button
              onClick={handleApprove}
              disabled={isLoading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Starting Execution...
                </span>
              ) : modifications.length > 0 ? (
                'Approve with Modifications'
              ) : (
                'Approve & Execute'
              )}
            </Button>
          </div>
        </div>

        {/* Modification Summary */}
        {modifications.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-semibold mb-2">Modifications Summary</h4>
            <div className="space-y-2">
              {modifications.map((mod, idx) => {
                const phase = plan.phases.find((p) => p.id === mod.phaseId)
                const changedParams = Object.keys(mod.parameterChanges)

                return (
                  <div key={idx} className="text-sm flex gap-2">
                    <span className="text-yellow-600">⚠️</span>
                    <div>
                      <span className="font-medium">{phase?.title}:</span>
                      <span className="text-muted-foreground">
                        {' '}
                        Modified {changedParams.length} parameter
                        {changedParams.length !== 1 ? 's' : ''} (
                        {changedParams.join(', ')})
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
