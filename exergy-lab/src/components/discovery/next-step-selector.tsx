/**
 * NextStepSelector Component
 *
 * Displays AI-powered next-step recommendations after workflow completion.
 * Allows users to choose between refining the workflow or proceeding to TEA.
 */

'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { NextStepSuggestion, NextStepType, WorkflowResults } from '@/types/workflow'

interface NextStepSelectorProps {
  suggestions: NextStepSuggestion[]
  results: WorkflowResults
  onSelectAction: (type: NextStepType, parameters?: Record<string, any>) => void
}

export function NextStepSelector({
  suggestions,
  results,
  onSelectAction,
}: NextStepSelectorProps) {
  // Get icon for suggestion type
  const getTypeIcon = (type: NextStepType): string => {
    switch (type) {
      case 'refine_search':
        return '🔍'
      case 'modify_experiments':
        return '🧪'
      case 'optimize_simulations':
        return '⚙️'
      case 'generate_tea':
        return '💰'
      case 'export_results':
        return '📥'
      case 'repeat_workflow':
        return '🔄'
      default:
        return '📋'
    }
  }

  // Get priority color
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-600 border-red-500/20'
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
      case 'low':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20'
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20'
    }
  }

  // Get priority badge variant
  const getPriorityVariant = (priority: string): 'default' | 'secondary' | 'info' => {
    switch (priority) {
      case 'high':
        return 'default'
      case 'medium':
        return 'secondary'
      default:
        return 'info'
    }
  }

  // Separate TEA suggestions from others
  const teaSuggestions = suggestions.filter((s) => s.type === 'generate_tea')
  const otherSuggestions = suggestions.filter((s) => s.type !== 'generate_tea')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Next Steps</h2>
        <p className="text-muted-foreground">
          Based on your workflow results, here are AI-recommended actions
        </p>
      </div>

      {/* TEA Recommendation (if ready) */}
      {teaSuggestions.length > 0 && (
        <Card className="p-6 bg-gradient-to-br from-green-500/5 to-emerald-500/5 border-green-500/20">
          <div className="flex items-start gap-4">
            <div className="text-4xl">✅</div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold mb-2 text-green-700 dark:text-green-400">
                Ready for Economic Analysis
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {teaSuggestions[0].reason}
              </p>

              <Button
                onClick={() =>
                  onSelectAction('generate_tea', teaSuggestions[0].action.parameters)
                }
                className="bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"
              >
                💰 {teaSuggestions[0].action.label}
              </Button>

              <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {teaSuggestions[0].action.description}
                </span>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span>⏱️ ~{teaSuggestions[0].action.estimatedTime} min</span>
                  {teaSuggestions[0].action.estimatedCost !== undefined && (
                    <span>💵 ${teaSuggestions[0].action.estimatedCost.toFixed(2)}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Improvement Suggestions */}
      {otherSuggestions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">
            {teaSuggestions.length > 0
              ? 'Or Refine Your Workflow First'
              : 'Suggested Improvements'}
          </h3>

          <div className="space-y-3">
            {otherSuggestions.map((suggestion, idx) => (
              <Card
                key={idx}
                className={`p-4 border-l-4 ${getPriorityColor(suggestion.priority)}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-2xl">{getTypeIcon(suggestion.type)}</span>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold">{suggestion.action.label}</h4>
                        <Badge variant={getPriorityVariant(suggestion.priority)} className="text-xs">
                          {suggestion.priority.toUpperCase()}
                        </Badge>
                      </div>

                      <p className="text-sm text-muted-foreground mb-2">{suggestion.reason}</p>

                      <p className="text-sm mb-3">{suggestion.action.description}</p>

                      {suggestion.estimatedImpact && (
                        <div className="inline-block px-3 py-1 bg-muted rounded text-xs font-medium mb-3">
                          📈 Impact: {suggestion.estimatedImpact}
                        </div>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>⏱️ ~{suggestion.action.estimatedTime} minutes</span>
                        {suggestion.action.estimatedCost !== undefined && (
                          <span>💵 ${suggestion.action.estimatedCost.toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onSelectAction(suggestion.type, suggestion.action.parameters)}
                  >
                    Apply
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No Suggestions */}
      {suggestions.length === 0 && (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="text-6xl">✨</div>
            <div>
              <h3 className="text-lg font-medium mb-2">Workflow Complete!</h3>
              <p className="text-sm text-muted-foreground">
                All phases executed successfully. No improvements needed.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Export Options */}
      <Card className="p-4 bg-muted/50">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-sm mb-1">Export Results</h4>
            <p className="text-xs text-muted-foreground">
              Download your workflow results in various formats
            </p>
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => onSelectAction('export_results')}>
              📄 PDF
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onSelectAction('export_results')}>
              📊 JSON
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
