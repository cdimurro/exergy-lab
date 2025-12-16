/**
 * PhaseCard Component
 *
 * Displays a single workflow phase with:
 * - Phase title and description
 * - Tool calls and parameters
 * - Expected outputs
 * - Inline parameter editing (when canModify=true)
 * - Duration and cost estimates
 * - Expandable/collapsible details
 */

'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { PlanPhase, PhaseModification } from '@/types/workflow'

interface PhaseCardProps {
  phase: PlanPhase
  index: number
  isExpanded?: boolean
  onToggleExpand?: () => void
  onModify?: (modification: PhaseModification) => void
  showModifyControls?: boolean
}

export function PhaseCard({
  phase,
  index,
  isExpanded = false,
  onToggleExpand,
  onModify,
  showModifyControls = true,
}: PhaseCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedParams, setEditedParams] = useState(phase.parameters)

  // Format duration in human-readable format
  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `~${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `~${minutes} min`
    const hours = Math.floor(minutes / 60)
    return `~${hours}h ${minutes % 60}m`
  }

  // Get phase icon based on type
  const getPhaseIcon = (type: PlanPhase['type']): string => {
    switch (type) {
      case 'research':
        return '📚'
      case 'experiment_design':
        return '🧪'
      case 'simulation':
        return '⚙️'
      case 'tea_analysis':
        return '💰'
      default:
        return '📋'
    }
  }

  // Get phase color based on type
  const getPhaseColor = (type: PlanPhase['type']): string => {
    switch (type) {
      case 'research':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      case 'experiment_design':
        return 'bg-purple-500/10 text-purple-600 border-purple-500/20'
      case 'simulation':
        return 'bg-green-500/10 text-green-600 border-green-500/20'
      case 'tea_analysis':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
    }
  }

  // Handle parameter edit
  const handleParamChange = (key: string, value: any) => {
    setEditedParams({ ...editedParams, [key]: value })
  }

  // Save modifications
  const handleSaveModifications = () => {
    if (onModify) {
      onModify({
        phaseId: phase.id,
        parameterChanges: editedParams,
        reason: 'User modified parameters',
      })
    }
    setIsEditing(false)
  }

  // Cancel editing
  const handleCancelEdit = () => {
    setEditedParams(phase.parameters)
    setIsEditing(false)
  }

  return (
    <Card className={`p-4 border-l-4 ${getPhaseColor(phase.type)}`}>
      {/* Phase Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{getPhaseIcon(phase.type)}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  PHASE {index + 1}
                </span>
                {phase.optional && (
                  <Badge variant="secondary" className="text-xs">
                    Optional
                  </Badge>
                )}
              </div>
              <h3 className="text-lg font-semibold">{phase.title}</h3>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">{phase.description}</p>
        </div>

        {/* Expand/Collapse Button */}
        <Button variant="ghost" size="sm" onClick={onToggleExpand}>
          {isExpanded ? '▼' : '▶'}
        </Button>
      </div>

      {/* Phase Metadata */}
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span>⏱️</span>
          <span>{formatDuration(phase.estimatedDuration)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>💵</span>
          <span>${phase.estimatedCost.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span>🔧</span>
          <span>{phase.tools.length} tool{phase.tools.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 space-y-4 pt-4 border-t">
          {/* Tools Section */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Tools</h4>
            <div className="space-y-2">
              {phase.tools.map((tool, idx) => (
                <div
                  key={idx}
                  className="text-sm bg-muted/50 rounded p-2 font-mono"
                >
                  {tool.toolName}
                </div>
              ))}
            </div>
          </div>

          {/* Parameters Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Parameters</h4>
              {phase.canModify && showModifyControls && !isEditing && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  ✏️ Edit
                </Button>
              )}
            </div>

            <div className="space-y-2">
              {Object.entries(editedParams).map(([key, value]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-32 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}:
                  </span>
                  {isEditing ? (
                    <Input
                      type={typeof value === 'number' ? 'number' : 'text'}
                      value={value as string | number}
                      onChange={(e) =>
                        handleParamChange(
                          key,
                          typeof value === 'number'
                            ? parseFloat(e.target.value)
                            : e.target.value
                        )
                      }
                      className="flex-1 h-8 text-sm"
                    />
                  ) : (
                    <span className="text-sm font-mono">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Edit Controls */}
            {isEditing && (
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={handleSaveModifications}>
                  Save Changes
                </Button>
                <Button variant="secondary" size="sm" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </div>
            )}
          </div>

          {/* Expected Outputs Section */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Expected Outputs</h4>
            <ul className="space-y-1">
              {phase.expectedOutputs.map((output, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-green-500">✓</span>
                  {output}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Card>
  )
}
