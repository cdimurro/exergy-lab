/**
 * Review Phase Component
 *
 * Allows users to review and edit the AI-generated experiment protocol.
 */

'use client'

import type { ExperimentPlan, Material, ExperimentStep } from '@/types/experiment-workflow'
import { Card, Button, Badge } from '@/components/ui'
import { CheckCircle, Edit, Plus, Trash2, AlertTriangle, ArrowRight, ArrowLeft } from 'lucide-react'
import { useState } from 'react'

interface ReviewPhaseProps {
  plan: ExperimentPlan | null
  onUpdateMaterial: (index: number, material: Material) => void
  onUpdateStep: (index: number, step: ExperimentStep) => void
  onAddMaterial: (material: Material) => void
  onRemoveMaterial: (index: number) => void
  onAddStep: (step: ExperimentStep) => void
  onRemoveStep: (index: number) => void
  onApprove: () => void
  onBack: () => void
}

export function ReviewPhase({
  plan,
  onUpdateMaterial,
  onUpdateStep,
  onAddMaterial,
  onRemoveMaterial,
  onAddStep,
  onRemoveStep,
  onApprove,
  onBack,
}: ReviewPhaseProps) {
  const [activeTab, setActiveTab] = useState<'materials' | 'steps' | 'safety'>('materials')

  if (!plan) {
    return (
      <div className="text-center text-muted py-12">
        <p>No protocol available. Please generate a new protocol.</p>
        <Button onClick={onBack} variant="outline" className="mt-4">
          Back to Setup
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card className="p-6 bg-card-dark border-border">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground mb-2">{plan.title}</h2>
            <div className="flex items-center gap-4 text-sm text-muted">
              <span>Domain: {plan.domain}</span>
              <span>•</span>
              <span>Duration: {plan.estimatedDuration}</span>
              <span>•</span>
              <span>Cost: ${plan.estimatedCost.toFixed(2)}</span>
            </div>
          </div>
          <Badge variant="info">Draft</Badge>
        </div>

        {/* Methodology */}
        <div className="mt-4 p-4 rounded-lg bg-background border border-border">
          <h4 className="text-sm font-medium text-foreground mb-2">Methodology</h4>
          <p className="text-sm text-muted">{plan.methodology}</p>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <TabButton
          active={activeTab === 'materials'}
          onClick={() => setActiveTab('materials')}
          label="Materials"
          count={plan.materials.length}
        />
        <TabButton
          active={activeTab === 'steps'}
          onClick={() => setActiveTab('steps')}
          label="Procedure"
          count={plan.steps.length}
        />
        <TabButton
          active={activeTab === 'safety'}
          onClick={() => setActiveTab('safety')}
          label="Safety"
          count={plan.safetyWarnings.length}
          variant="warning"
        />
      </div>

      {/* Tab Content */}
      {activeTab === 'materials' && (
        <MaterialsTab
          materials={plan.materials}
          onUpdate={onUpdateMaterial}
          onAdd={onAddMaterial}
          onRemove={onRemoveMaterial}
        />
      )}

      {activeTab === 'steps' && (
        <StepsTab
          steps={plan.steps}
          onUpdate={onUpdateStep}
          onAdd={onAddStep}
          onRemove={onRemoveStep}
        />
      )}

      {activeTab === 'safety' && (
        <SafetyTab warnings={plan.safetyWarnings} />
      )}

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 bg-card-dark border-border">
          <h4 className="text-sm font-medium text-foreground mb-2">Assumptions</h4>
          <ul className="text-sm text-muted space-y-1 list-disc list-inside">
            {plan.assumptions.map((assumption, i) => (
              <li key={i}>{assumption}</li>
            ))}
          </ul>
        </Card>

        <Card className="p-4 bg-card-dark border-border">
          <h4 className="text-sm font-medium text-foreground mb-2">Limitations</h4>
          <ul className="text-sm text-muted space-y-1 list-disc list-inside">
            {plan.limitations.map((limitation, i) => (
              <li key={i}>{limitation}</li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-border">
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Setup
        </Button>

        <Button onClick={onApprove} size="lg">
          Approve & Validate
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

// Sub-components

interface TabButtonProps {
  active: boolean
  onClick: () => void
  label: string
  count: number
  variant?: 'default' | 'warning'
}

function TabButton({ active, onClick, label, count, variant = 'default' }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 text-sm font-medium transition-colors border-b-2
        ${
          active
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted hover:text-foreground'
        }
      `}
    >
      {label} ({count})
      {variant === 'warning' && count > 0 && (
        <AlertTriangle className="inline-block w-3 h-3 ml-1 text-amber-400" />
      )}
    </button>
  )
}

interface MaterialsTabProps {
  materials: Material[]
  onUpdate: (index: number, material: Material) => void
  onAdd: (material: Material) => void
  onRemove: (index: number) => void
}

function MaterialsTab({ materials, onUpdate, onRemove }: MaterialsTabProps) {
  return (
    <Card className="p-6 bg-card-dark border-border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted border-b border-border">
              <th className="pb-2 font-medium">Material</th>
              <th className="pb-2 font-medium">Quantity</th>
              <th className="pb-2 font-medium">Unit</th>
              <th className="pb-2 font-medium text-right">Cost</th>
              <th className="pb-2 font-medium w-16"></th>
            </tr>
          </thead>
          <tbody>
            {materials.map((material, index) => (
              <tr key={index} className="border-b border-border/50 hover:bg-background/50">
                <td className="py-3">
                  <input
                    type="text"
                    value={material.name}
                    onChange={(e) =>
                      onUpdate(index, { ...material, name: e.target.value })
                    }
                    className="w-full bg-transparent border-none text-foreground focus:outline-none"
                  />
                </td>
                <td className="py-3">
                  <input
                    type="text"
                    value={material.quantity}
                    onChange={(e) =>
                      onUpdate(index, { ...material, quantity: e.target.value })
                    }
                    className="w-20 bg-transparent border-none text-foreground focus:outline-none"
                  />
                </td>
                <td className="py-3">
                  <input
                    type="text"
                    value={material.unit}
                    onChange={(e) =>
                      onUpdate(index, { ...material, unit: e.target.value })
                    }
                    className="w-16 bg-transparent border-none text-foreground focus:outline-none"
                  />
                </td>
                <td className="py-3 text-right font-mono">
                  ${material.cost?.toFixed(2) || '0.00'}
                </td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => onRemove(index)}
                    className="p-1 hover:bg-background-hover rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between items-center text-sm">
        <span className="text-muted">{materials.length} materials</span>
        <span className="font-mono text-foreground">
          Total: ${materials.reduce((sum, m) => sum + (m.cost || 0), 0).toFixed(2)}
        </span>
      </div>
    </Card>
  )
}

interface StepsTabProps {
  steps: ExperimentStep[]
  onUpdate: (index: number, step: ExperimentStep) => void
  onAdd: (step: ExperimentStep) => void
  onRemove: (index: number) => void
}

function StepsTab({ steps }: StepsTabProps) {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <Card key={index} className="p-4 bg-card-dark border-border">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">{step.step}</span>
            </div>
            <div className="flex-1 space-y-2">
              <h4 className="text-sm font-semibold text-foreground">{step.title}</h4>
              <p className="text-sm text-muted">{step.description}</p>
              <div className="flex gap-4 text-xs text-muted">
                {step.duration && <span>Duration: {step.duration}</span>}
                {step.temperature && <span>Temp: {step.temperature}</span>}
                {step.pressure && <span>Pressure: {step.pressure}</span>}
              </div>
              {step.safety && step.safety.length > 0 && (
                <div className="flex items-start gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-400 space-y-0.5">
                    {step.safety.map((s: string, i: number) => (
                      <div key={i}>{s}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

interface SafetyTabProps {
  warnings: Array<{
    level: 'low' | 'medium' | 'high' | 'critical'
    category: string
    description: string
    mitigation: string
  }>
}

function SafetyTab({ warnings }: SafetyTabProps) {
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'border-red-500/30 bg-red-500/10 text-red-400'
      case 'high':
        return 'border-amber-500/30 bg-amber-500/10 text-amber-400'
      case 'medium':
        return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400'
      default:
        return 'border-blue-500/30 bg-blue-500/10 text-blue-400'
    }
  }

  return (
    <div className="space-y-4">
      {warnings.length === 0 ? (
        <Card className="p-12 bg-card-dark border-border text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <p className="text-muted">No safety warnings identified</p>
        </Card>
      ) : (
        warnings.map((warning, index) => (
          <Card key={index} className={`p-4 border ${getLevelColor(warning.level)}`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="warning" size="sm">
                    {warning.level.toUpperCase()}
                  </Badge>
                  <span className="text-sm font-semibold">{warning.category}</span>
                </div>
                <p className="text-sm">{warning.description}</p>
                <div className="p-3 rounded bg-background/50">
                  <p className="text-xs font-medium mb-1">Mitigation:</p>
                  <p className="text-xs text-muted">{warning.mitigation}</p>
                </div>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}
