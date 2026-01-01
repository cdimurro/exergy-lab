'use client'

/**
 * SimulationPlanCard Component
 *
 * Displays the AI-generated simulation plan with editable parameters
 * and natural language change request capability.
 */

import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Edit2,
  Check,
  X,
  RefreshCw,
  HelpCircle,
  Settings,
  Target,
  Clock,
  DollarSign,
} from 'lucide-react'
import { Card, Badge, Button } from '@/components/ui'
import type { SimulationPlan, SimulationPlanParameter, ParameterCategory } from '@/types/simulation-workflow'

const CATEGORY_COLORS: Record<ParameterCategory, { bg: string; text: string; label: string }> = {
  input: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    label: 'Input',
  },
  boundary: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    label: 'Boundary',
  },
  operational: {
    bg: 'bg-green-500/10',
    text: 'text-green-400',
    label: 'Operational',
  },
}

export interface SimulationPlanCardProps {
  plan: SimulationPlan
  onParameterChange: (id: string, value: number | string) => void
  onRequestChanges: (feedback: string) => void
}

export function SimulationPlanCard({
  plan,
  onParameterChange,
  onRequestChanges,
}: SimulationPlanCardProps) {
  const [expandedSections, setExpandedSections] = useState({
    methodology: false,
    parameters: true,
    outputs: false,
  })
  const [editingParam, setEditingParam] = useState<string | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const [showChangeFeedback, setShowChangeFeedback] = useState(false)
  const [changeFeedback, setChangeFeedback] = useState('')

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const startEditing = (param: SimulationPlanParameter) => {
    setEditingParam(param.id)
    setEditValue(String(param.value))
  }

  const saveEdit = (param: SimulationPlanParameter) => {
    const numValue = parseFloat(editValue)
    if (!isNaN(numValue)) {
      // Validate against min/max
      if (param.min !== undefined && numValue < param.min) {
        return // Don't save if below min
      }
      if (param.max !== undefined && numValue > param.max) {
        return // Don't save if above max
      }
      onParameterChange(param.id, numValue)
    } else {
      onParameterChange(param.id, editValue)
    }
    setEditingParam(null)
  }

  const cancelEdit = () => {
    setEditingParam(null)
    setEditValue('')
  }

  const handleSubmitChanges = () => {
    if (changeFeedback.trim()) {
      onRequestChanges(changeFeedback)
      setChangeFeedback('')
      setShowChangeFeedback(false)
    }
  }

  // Group parameters by category
  const paramsByCategory = plan.parameters.reduce(
    (acc, param) => {
      const category = param.category || 'input'
      if (!acc[category]) acc[category] = []
      acc[category].push(param)
      return acc
    },
    {} as Record<ParameterCategory, SimulationPlanParameter[]>
  )

  return (
    <Card className="bg-card-dark border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="primary" size="sm">
                {plan.simulationType}
              </Badge>
              <Badge variant="secondary" size="sm">
                v{plan.version}
              </Badge>
            </div>
            <h3 className="text-lg font-semibold text-foreground">{plan.title}</h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{Math.round(plan.estimatedDuration / 1000)}s</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5" />
              <span>${plan.estimatedCost.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Methodology Section */}
      <div className="border-b border-border">
        <button
          onClick={() => toggleSection('methodology')}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-page-background/50"
        >
          <span className="text-sm font-medium text-foreground">Methodology</span>
          {expandedSections.methodology ? (
            <ChevronUp className="w-4 h-4 text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted" />
          )}
        </button>
        {expandedSections.methodology && (
          <div className="px-4 pb-4">
            <p className="text-sm text-muted whitespace-pre-wrap">
              {plan.methodology}
            </p>
          </div>
        )}
      </div>

      {/* Parameters Section */}
      <div className="border-b border-border">
        <button
          onClick={() => toggleSection('parameters')}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-page-background/50"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-muted" />
            <span className="text-sm font-medium text-foreground">
              Parameters ({plan.parameters.length})
            </span>
          </div>
          {expandedSections.parameters ? (
            <ChevronUp className="w-4 h-4 text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted" />
          )}
        </button>
        {expandedSections.parameters && (
          <div className="px-4 pb-4 space-y-4">
            {/* Category Legend */}
            <div className="flex items-center gap-4 text-xs">
              {Object.entries(CATEGORY_COLORS).map(([cat, colors]) => (
                <div key={cat} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${colors.bg} border ${colors.text.replace('text-', 'border-')}`} />
                  <span className="text-muted">{colors.label}</span>
                </div>
              ))}
            </div>

            {/* Parameters by Category */}
            {(['input', 'boundary', 'operational'] as ParameterCategory[]).map((category) => {
              const params = paramsByCategory[category] || []
              if (params.length === 0) return null

              const colors = CATEGORY_COLORS[category]

              return (
                <div key={category}>
                  <h4 className={`text-xs font-medium ${colors.text} mb-2`}>
                    {colors.label} Parameters
                  </h4>
                  <div className="space-y-2">
                    {params.map((param) => (
                      <div
                        key={param.id}
                        className={`p-3 rounded-lg ${colors.bg} border ${colors.text.replace('text-', 'border-')}/20`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-foreground">
                                {param.name}
                              </span>
                              {param.description && (
                                <span title={param.description}>
                                  <HelpCircle className="w-3.5 h-3.5 text-muted cursor-help" />
                                </span>
                              )}
                            </div>
                            {param.min !== undefined && param.max !== undefined && (
                              <span className="text-xs text-muted">
                                Range: {param.min} - {param.max} {param.unit}
                              </span>
                            )}
                          </div>

                          {/* Value Editor */}
                          <div className="flex items-center gap-2">
                            {editingParam === param.id ? (
                              <>
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="w-24 h-8 px-2 rounded bg-page-background border border-border text-foreground text-sm"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEdit(param)
                                    if (e.key === 'Escape') cancelEdit()
                                  }}
                                />
                                <span className="text-sm text-muted">
                                  {param.unit}
                                </span>
                                <button
                                  onClick={() => saveEdit(param)}
                                  className="p-1 rounded hover:bg-primary/20 text-primary"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="p-1 rounded hover:bg-red-500/20 text-red-400"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="text-base font-mono text-foreground">
                                  {typeof param.value === 'number'
                                    ? param.value.toFixed(2)
                                    : param.value}
                                </span>
                                <span className="text-sm text-muted">
                                  {param.unit}
                                </span>
                                {param.isEditable && (
                                  <button
                                    onClick={() => startEditing(param)}
                                    className="p-1 rounded hover:bg-primary/20 text-muted hover:text-primary"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Expected Outputs Section */}
      <div className="border-b border-border">
        <button
          onClick={() => toggleSection('outputs')}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-page-background/50"
        >
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-muted" />
            <span className="text-sm font-medium text-foreground">
              Expected Outputs ({plan.expectedOutputs.length})
            </span>
          </div>
          {expandedSections.outputs ? (
            <ChevronUp className="w-4 h-4 text-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted" />
          )}
        </button>
        {expandedSections.outputs && (
          <div className="px-4 pb-4">
            <div className="space-y-2">
              {plan.expectedOutputs.map((output, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg bg-page-background border border-border"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{output.name}</span>
                    <Badge variant="secondary" size="sm">
                      {output.unit}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted">{output.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Request Changes Panel */}
      <div className="p-4">
        {showChangeFeedback ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Request Changes</span>
              <button
                onClick={() => setShowChangeFeedback(false)}
                className="text-muted hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-muted">
              Describe what you would like to change in natural language:
            </p>
            <ul className="text-xs text-muted list-disc list-inside space-y-1">
              <li>&quot;Increase the reservoir temperature to 200C&quot;</li>
              <li>&quot;Add exergy analysis to the outputs&quot;</li>
              <li>&quot;Use R134a instead of R245fa as working fluid&quot;</li>
              <li>&quot;Include sensitivity analysis for flow rate&quot;</li>
            </ul>
            <textarea
              value={changeFeedback}
              onChange={(e) => setChangeFeedback(e.target.value)}
              placeholder="What would you like to change?"
              rows={3}
              className="w-full p-3 rounded-lg bg-page-background border border-border text-foreground text-sm resize-none
                         placeholder:text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowChangeFeedback(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmitChanges} disabled={!changeFeedback.trim()}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Regenerate Plan
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowChangeFeedback(true)}
            className="w-full py-2 px-4 rounded-lg border border-dashed border-border text-sm text-muted
                       hover:border-primary/50 hover:text-primary transition-colors"
          >
            Need changes? Click here to describe what you would like modified
          </button>
        )}
      </div>
    </Card>
  )
}

export default SimulationPlanCard
