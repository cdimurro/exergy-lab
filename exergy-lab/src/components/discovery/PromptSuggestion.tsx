'use client'

/**
 * PromptSuggestion Component
 *
 * Displays an AI-suggested improved prompt based on rubric feedback.
 * Allows users to use the suggestion as-is, edit it, or enter their own.
 */

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Edit3,
  RotateCcw,
  Loader2,
  Lightbulb,
  ArrowRight,
} from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface PromptSuggestionProps {
  originalQuery: string
  suggestion: {
    improvedPrompt: string
    explanation: string
    keyChanges: string[]
  } | null
  isLoading: boolean
  error?: string | null
  onUseSuggestion: (prompt: string) => void
  onRetryWithOriginal: () => void
  className?: string
}

export function PromptSuggestion({
  originalQuery,
  suggestion,
  isLoading,
  error,
  onUseSuggestion,
  onRetryWithOriginal,
  className,
}: PromptSuggestionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedPrompt, setEditedPrompt] = useState('')
  const [showChanges, setShowChanges] = useState(true)
  const [copied, setCopied] = useState(false)

  // Update edited prompt when suggestion loads
  useEffect(() => {
    if (suggestion?.improvedPrompt) {
      setEditedPrompt(suggestion.improvedPrompt)
    }
  }, [suggestion?.improvedPrompt])

  const handleCopy = async () => {
    const textToCopy = isEditing ? editedPrompt : suggestion?.improvedPrompt
    if (textToCopy) {
      await navigator.clipboard.writeText(textToCopy)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleUse = () => {
    const promptToUse = isEditing ? editedPrompt : suggestion?.improvedPrompt
    if (promptToUse) {
      onUseSuggestion(promptToUse)
    }
  }

  const handleReset = () => {
    if (suggestion?.improvedPrompt) {
      setEditedPrompt(suggestion.improvedPrompt)
      setIsEditing(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('border rounded-xl p-5 bg-card', className)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Loader2 className="text-muted-foreground animate-spin" size={20} />
          </div>
          <div>
            <span className="text-base font-semibold text-foreground">
              Analyzing Feedback...
            </span>
            <p className="text-sm text-muted-foreground">
              Generating an improved prompt based on rubric criteria
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn('border rounded-xl p-5 bg-card', className)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Sparkles className="text-muted-foreground" size={20} />
          </div>
          <div className="flex-1">
            <span className="text-base font-semibold text-foreground">
              Couldn't Generate Suggestion
            </span>
            <p className="text-sm text-muted-foreground">
              You can still retry with your original query or modify it manually.
            </p>
          </div>
          <Button variant="outline" onClick={onRetryWithOriginal}>
            <RotateCcw size={16} className="mr-2" />
            Retry Original
          </Button>
        </div>
      </div>
    )
  }

  // No suggestion yet - show a placeholder encouraging retry
  if (!suggestion) {
    return (
      <div className={cn('border rounded-xl p-5 bg-card', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Sparkles className="text-muted-foreground" size={20} />
            </div>
            <div>
              <span className="text-base font-semibold text-foreground">
                Try an Improved Prompt
              </span>
              <p className="text-sm text-muted-foreground">
                Retry with your original query or edit it to improve results
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={onRetryWithOriginal}>
            <RotateCcw size={16} className="mr-2" />
            Retry Original
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('border rounded-xl overflow-hidden bg-card', className)}>
      {/* Header - With green accent */}
      <div className="flex items-center justify-between p-5 border-b bg-muted/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Sparkles className="text-emerald-600" size={20} />
          </div>
          <div>
            <span className="text-base font-semibold text-foreground">
              Suggested Improved Prompt
            </span>
            <p className="text-sm text-muted-foreground">
              {suggestion.explanation}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-2 rounded-md hover:bg-muted transition-colors"
            title="Copy prompt"
          >
            {copied ? (
              <Check size={16} className="text-foreground" />
            ) : (
              <Copy size={16} className="text-muted-foreground" />
            )}
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={cn(
              'p-2 rounded-md hover:bg-muted transition-colors',
              isEditing && 'bg-muted'
            )}
            title={isEditing ? 'View suggestion' : 'Edit prompt'}
          >
            <Edit3 size={16} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Key Changes - Collapsible */}
      {suggestion.keyChanges.length > 0 && (
        <div className="border-b">
          <button
            onClick={() => setShowChanges(!showChanges)}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Lightbulb size={14} />
              Key Improvements ({suggestion.keyChanges.length})
            </span>
            {showChanges ? (
              <ChevronUp size={16} className="text-muted-foreground" />
            ) : (
              <ChevronDown size={16} className="text-muted-foreground" />
            )}
          </button>
          {showChanges && (
            <div className="px-4 pb-4 space-y-2">
              {suggestion.keyChanges.map((change, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-sm text-foreground"
                >
                  <ArrowRight
                    size={14}
                    className="text-muted-foreground mt-0.5 shrink-0"
                  />
                  <span>{change}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Prompt Display/Edit */}
      <div className="p-5">
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editedPrompt}
              onChange={(e) => setEditedPrompt(e.target.value)}
              className="min-h-[150px] text-base leading-relaxed resize-none bg-muted/30"
              placeholder="Enter your modified prompt..."
            />
            <div className="flex items-center justify-between">
              <button
                onClick={handleReset}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <RotateCcw size={14} />
                Reset to suggestion
              </button>
              <span className="text-xs text-muted-foreground">
                {editedPrompt.length} characters
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-muted/30 rounded-lg p-4">
            <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
              {suggestion.improvedPrompt}
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-5 pt-0 flex gap-3">
        <Button
          onClick={handleUse}
          className="flex-1"
          disabled={isEditing && !editedPrompt.trim()}
        >
          <Sparkles size={16} className="mr-2" />
          {isEditing ? 'Use Edited Prompt' : 'Try This Prompt'}
        </Button>
        <Button variant="outline" onClick={onRetryWithOriginal}>
          <RotateCcw size={16} className="mr-2" />
          Use Original
        </Button>
      </div>

      {/* Original Query Reference */}
      <div className="px-5 pb-5">
        <details className="text-sm">
          <summary className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
            View original query
          </summary>
          <div className="mt-2 p-3 bg-muted/20 rounded-lg">
            <p className="text-muted-foreground">{originalQuery}</p>
          </div>
        </details>
      </div>
    </div>
  )
}

export default PromptSuggestion
