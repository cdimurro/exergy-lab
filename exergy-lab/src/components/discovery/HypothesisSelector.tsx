'use client'

/**
 * HypothesisSelector Component
 *
 * A comprehensive hypothesis selection and management interface that allows:
 * - Multi-select hypotheses from AI-generated candidates
 * - Edit hypothesis statements and details inline
 * - Add custom user-defined hypotheses
 * - Reorder hypotheses by priority
 * - View detailed scores and supporting evidence
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  GripVertical,
  Lightbulb,
  Plus,
  Save,
  Trash2,
  X,
  BookOpen,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react'

// ============================================================================
// Types - Simplified for UI use
// ============================================================================

export interface HypothesisSummary {
  id: string
  title: string
  statement: string
  mechanism?: string
  noveltyScore?: number
  feasibilityScore?: number
  impactScore?: number
  supportingEvidenceCount?: number
  isUserCreated?: boolean
  isUserModified?: boolean
  predictions?: string[]
  constraints?: string[]
  variables?: {
    independent?: string
    dependent?: string
    controls?: string[]
  }
}

// ============================================================================
// Props
// ============================================================================

interface HypothesisSelectorProps {
  hypotheses: HypothesisSummary[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onHypothesisEdit?: (hypothesis: HypothesisSummary) => void
  onHypothesisAdd?: (hypothesis: Partial<HypothesisSummary>) => void
  onHypothesisRemove?: (id: string) => void
  maxSelections?: number
  minSelections?: number
  showScores?: boolean
  showEvidence?: boolean
  allowEdit?: boolean
  allowAdd?: boolean
  allowRemove?: boolean
  allowReorder?: boolean
  className?: string
}

// ============================================================================
// Score Color Mapping
// ============================================================================

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-blue-600'
  if (score >= 40) return 'text-amber-600'
  return 'text-red-600'
}

// ============================================================================
// Hypothesis Card Component
// ============================================================================

interface HypothesisCardProps {
  hypothesis: HypothesisSummary
  index: number
  isSelected: boolean
  isEditing: boolean
  onSelect: () => void
  onEdit: () => void
  onSave: (updated: HypothesisSummary) => void
  onCancel: () => void
  onRemove?: () => void
  showScores: boolean
  showEvidence: boolean
  allowEdit: boolean
  allowRemove: boolean
  allowReorder: boolean
}

function HypothesisCard({
  hypothesis,
  index,
  isSelected,
  isEditing,
  onSelect,
  onEdit,
  onSave,
  onCancel,
  onRemove,
  showScores,
  showEvidence,
  allowEdit,
  allowRemove,
  allowReorder,
}: HypothesisCardProps) {
  const [expanded, setExpanded] = React.useState(false)
  const [editedStatement, setEditedStatement] = React.useState(hypothesis.statement)
  const [editedMechanism, setEditedMechanism] = React.useState(hypothesis.mechanism || '')

  // Reset edit fields when hypothesis changes
  React.useEffect(() => {
    setEditedStatement(hypothesis.statement)
    setEditedMechanism(hypothesis.mechanism || '')
  }, [hypothesis])

  const handleSave = () => {
    onSave({
      ...hypothesis,
      statement: editedStatement,
      mechanism: editedMechanism,
      isUserModified: true,
    })
  }

  return (
    <div
      className={cn(
        'rounded-lg border-2 transition-all',
        isSelected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-border hover:border-border-subtle',
        isEditing && 'ring-2 ring-primary/30'
      )}
    >
      {/* Main Row */}
      <div className="flex items-start gap-3 p-4">
        {/* Drag Handle */}
        {allowReorder && (
          <div className="cursor-grab text-muted-foreground hover:text-foreground mt-1">
            <GripVertical className="w-4 h-4" />
          </div>
        )}

        {/* Selection Checkbox */}
        <button
          onClick={onSelect}
          className={cn(
            'shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5',
            isSelected
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-muted-foreground/50 hover:border-primary'
          )}
        >
          {isSelected && <Check className="w-3 h-3" />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            /* Edit Mode */
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Hypothesis Statement
                </label>
                <textarea
                  value={editedStatement}
                  onChange={(e) => setEditedStatement(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">
                  Proposed Mechanism
                </label>
                <textarea
                  value={editedMechanism}
                  onChange={(e) => setEditedMechanism(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  rows={2}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={onCancel}>
                  Cancel
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSave}
                  disabled={!editedStatement.trim()}
                  className="gap-1"
                >
                  <Save className="w-3 h-3" />
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            /* View Mode */
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">
                      H{index + 1}
                    </Badge>
                    {hypothesis.isUserCreated && (
                      <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-600">
                        Custom
                      </Badge>
                    )}
                    {hypothesis.isUserModified && (
                      <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600">
                        Edited
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {hypothesis.statement}
                  </p>
                </div>

                {/* Scores */}
                {showScores && (
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {hypothesis.noveltyScore !== undefined && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Novel:</span>
                        <span className={cn('text-sm font-semibold', getScoreColor(hypothesis.noveltyScore))}>
                          {hypothesis.noveltyScore}
                        </span>
                      </div>
                    )}
                    {hypothesis.feasibilityScore !== undefined && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">Feasible:</span>
                        <span className={cn('text-sm font-semibold', getScoreColor(hypothesis.feasibilityScore))}>
                          {hypothesis.feasibilityScore}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Mechanism */}
              {hypothesis.mechanism && (
                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                  {hypothesis.mechanism}
                </p>
              )}

              {/* Expandable Details */}
              {(hypothesis.predictions?.length || hypothesis.variables || hypothesis.constraints?.length) && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 mt-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {expanded ? 'Hide Details' : 'Show Details'}
                </button>
              )}

              {expanded && (
                <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                  {/* Variables */}
                  {hypothesis.variables && (
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block">Independent</span>
                        <span className="text-foreground">{hypothesis.variables.independent || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Dependent</span>
                        <span className="text-foreground">{hypothesis.variables.dependent || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Controls</span>
                        <span className="text-foreground">
                          {hypothesis.variables.controls?.join(', ') || 'N/A'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Predictions */}
                  {hypothesis.predictions && hypothesis.predictions.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                        <TrendingUp size={12} />
                        Predictions
                      </span>
                      <ul className="space-y-1">
                        {hypothesis.predictions.map((pred, i) => (
                          <li key={i} className="text-xs text-foreground flex items-start gap-2">
                            <span className="w-4 text-muted-foreground">{i + 1}.</span>
                            <span>{pred}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Evidence count */}
                  {showEvidence && hypothesis.supportingEvidenceCount !== undefined && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <BookOpen size={12} />
                      <span>{hypothesis.supportingEvidenceCount} supporting sources</span>
                    </div>
                  )}

                  {/* Constraints */}
                  {hypothesis.constraints && hypothesis.constraints.length > 0 && (
                    <div>
                      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                        <AlertTriangle size={12} />
                        Constraints
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {hypothesis.constraints.map((c, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Actions */}
        {!isEditing && (
          <div className="flex flex-col gap-1">
            {allowEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="h-8 w-8 p-0"
                title="Edit hypothesis"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            )}
            {allowRemove && hypothesis.isUserCreated && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRemove}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                title="Remove hypothesis"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Add Hypothesis Form
// ============================================================================

interface AddHypothesisFormProps {
  onAdd: (hypothesis: Partial<HypothesisSummary>) => void
  onCancel: () => void
}

function AddHypothesisForm({ onAdd, onCancel }: AddHypothesisFormProps) {
  const [statement, setStatement] = React.useState('')
  const [mechanism, setMechanism] = React.useState('')
  const [independentVar, setIndependentVar] = React.useState('')
  const [dependentVar, setDependentVar] = React.useState('')

  const handleSubmit = () => {
    if (!statement.trim()) return

    onAdd({
      id: `custom-${Date.now()}`,
      title: statement.slice(0, 50),
      statement: statement.trim(),
      mechanism: mechanism.trim() || undefined,
      variables: independentVar || dependentVar ? {
        independent: independentVar || undefined,
        dependent: dependentVar || undefined,
        controls: [],
      } : undefined,
      isUserCreated: true,
      noveltyScore: 50,  // Default score for custom hypotheses
      feasibilityScore: 50,
    })
  }

  return (
    <div className="rounded-lg border-2 border-dashed border-primary/50 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center gap-2 text-primary">
        <Lightbulb className="w-5 h-5" />
        <span className="font-semibold">Add Custom Hypothesis</span>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          Hypothesis Statement *
        </label>
        <textarea
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          placeholder="If [independent variable] is changed, then [dependent variable] will [change], because [mechanism]..."
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          rows={3}
        />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground block mb-1">
          Proposed Mechanism (optional)
        </label>
        <textarea
          value={mechanism}
          onChange={(e) => setMechanism(e.target.value)}
          placeholder="Explain the causal mechanism..."
          className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Independent Variable
          </label>
          <input
            type="text"
            value={independentVar}
            onChange={(e) => setIndependentVar(e.target.value)}
            placeholder="e.g., Temperature"
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">
            Dependent Variable
          </label>
          <input
            type="text"
            value={dependentVar}
            onChange={(e) => setDependentVar(e.target.value)}
            placeholder="e.g., Efficiency"
            className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSubmit}
          disabled={!statement.trim()}
          className="gap-1"
        >
          <Plus className="w-3 h-3" />
          Add Hypothesis
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function HypothesisSelector({
  hypotheses,
  selectedIds,
  onSelectionChange,
  onHypothesisEdit,
  onHypothesisAdd,
  onHypothesisRemove,
  maxSelections,
  minSelections = 1,
  showScores = true,
  showEvidence = false,
  allowEdit = true,
  allowAdd = true,
  allowRemove = true,
  allowReorder = false,
  className,
}: HypothesisSelectorProps) {
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [showAddForm, setShowAddForm] = React.useState(false)

  const selectedSet = React.useMemo(() => new Set(selectedIds), [selectedIds])

  const handleToggleSelection = (id: string) => {
    const newSelected = new Set(selectedSet)

    if (newSelected.has(id)) {
      // Don't deselect if at minimum
      if (newSelected.size > minSelections) {
        newSelected.delete(id)
      }
    } else {
      // Don't select if at maximum
      if (!maxSelections || newSelected.size < maxSelections) {
        newSelected.add(id)
      }
    }

    onSelectionChange(Array.from(newSelected))
  }

  const handleSelectAll = () => {
    const allIds = hypotheses.map((h) => h.id)
    const limited = maxSelections ? allIds.slice(0, maxSelections) : allIds
    onSelectionChange(limited)
  }

  const handleClearSelection = () => {
    // Keep minimum selections
    const toKeep = hypotheses.slice(0, minSelections).map((h) => h.id)
    onSelectionChange(toKeep)
  }

  const handleEdit = (id: string) => {
    setEditingId(id)
  }

  const handleSave = (updated: HypothesisSummary) => {
    if (onHypothesisEdit) {
      onHypothesisEdit(updated)
    }
    setEditingId(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

  const handleAddHypothesis = (hypothesis: Partial<HypothesisSummary>) => {
    if (onHypothesisAdd) {
      onHypothesisAdd(hypothesis)
      // Auto-select the new hypothesis
      if (hypothesis.id) {
        onSelectionChange([...selectedIds, hypothesis.id])
      }
    }
    setShowAddForm(false)
  }

  const handleRemoveHypothesis = (id: string) => {
    if (onHypothesisRemove) {
      onHypothesisRemove(id)
      // Remove from selection
      onSelectionChange(selectedIds.filter((sid) => sid !== id))
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <span className="font-semibold text-foreground">
            Hypotheses ({hypotheses.length})
          </span>
          <Badge variant="secondary">
            {selectedSet.size} selected
            {maxSelections && ` / ${maxSelections} max`}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            disabled={!maxSelections || selectedSet.size >= maxSelections}
          >
            Select All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearSelection}
            disabled={selectedSet.size <= minSelections}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Hypothesis List */}
      <div className="space-y-3">
        {hypotheses.map((hypothesis, index) => (
          <HypothesisCard
            key={hypothesis.id}
            hypothesis={hypothesis}
            index={index}
            isSelected={selectedSet.has(hypothesis.id)}
            isEditing={editingId === hypothesis.id}
            onSelect={() => handleToggleSelection(hypothesis.id)}
            onEdit={() => handleEdit(hypothesis.id)}
            onSave={handleSave}
            onCancel={handleCancelEdit}
            onRemove={allowRemove ? () => handleRemoveHypothesis(hypothesis.id) : undefined}
            showScores={showScores}
            showEvidence={showEvidence}
            allowEdit={allowEdit}
            allowRemove={allowRemove}
            allowReorder={allowReorder}
          />
        ))}
      </div>

      {/* Add Form / Button */}
      {allowAdd && (
        showAddForm ? (
          <AddHypothesisForm
            onAdd={handleAddHypothesis}
            onCancel={() => setShowAddForm(false)}
          />
        ) : (
          <Button
            variant="outline"
            className="w-full gap-2 border-dashed"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="w-4 h-4" />
            Add Custom Hypothesis
          </Button>
        )
      )}

      {/* Selection Validation */}
      {minSelections > 0 && selectedSet.size < minSelections && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertTriangle size={12} />
          Please select at least {minSelections} hypothesis{minSelections > 1 ? 'es' : ''}
        </p>
      )}
    </div>
  )
}

// ============================================================================
// Compact Hypothesis Badge List
// ============================================================================

interface HypothesisBadgeListProps {
  hypotheses: HypothesisSummary[]
  maxDisplay?: number
  className?: string
}

export function HypothesisBadgeList({
  hypotheses,
  maxDisplay = 3,
  className,
}: HypothesisBadgeListProps) {
  const displayed = hypotheses.slice(0, maxDisplay)
  const remaining = hypotheses.length - maxDisplay

  return (
    <div className={cn('flex flex-wrap gap-1', className)}>
      {displayed.map((h, i) => (
        <Badge key={h.id} variant="secondary" className="text-xs">
          H{i + 1}
          {h.noveltyScore !== undefined && (
            <span className={cn('ml-1', getScoreColor(h.noveltyScore))}>
              {h.noveltyScore}
            </span>
          )}
        </Badge>
      ))}
      {remaining > 0 && (
        <Badge variant="secondary" className="text-xs">
          +{remaining} more
        </Badge>
      )}
    </div>
  )
}

export default HypothesisSelector
