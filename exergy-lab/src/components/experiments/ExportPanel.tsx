'use client'

import * as React from 'react'
import {
  Download,
  Copy,
  ExternalLink,
  FileJson,
  Check,
  Loader2,
  Cpu,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'
import { SimulationSuggestionsPanel } from './SimulationSuggestionsPanel'
import type { ExperimentProtocol, FailureAnalysis } from '@/types/experiment'
import type { ExergyExperimentFile, SimulationSuggestion } from '@/types/exergy-experiment'
import type { SimulationTier } from '@/lib/simulation/types'

interface ExportPanelProps {
  protocol: ExperimentProtocol
  failureAnalysis?: FailureAnalysis
  onOpenInSimulations?: (file: ExergyExperimentFile) => void
}

type ExportState = 'idle' | 'generating' | 'ready' | 'error'

export function ExportPanel({
  protocol,
  failureAnalysis,
  onOpenInSimulations,
}: ExportPanelProps) {
  const [exportState, setExportState] = React.useState<ExportState>('idle')
  const [exportedFile, setExportedFile] = React.useState<ExergyExperimentFile | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)
  const [showSimParams, setShowSimParams] = React.useState(false)
  const [targetTier, setTargetTier] = React.useState<SimulationTier>('tier1')

  const generateExportFile = React.useCallback(async () => {
    setExportState('generating')
    setError(null)

    try {
      const response = await fetch('/api/experiments/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol,
          failureAnalysis,
          targetTier,
          generateSimulationSuggestions: true,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Export failed')
      }

      const data = await response.json()
      if (!data.success || !data.file) {
        throw new Error(data.error || 'Export failed')
      }

      setExportedFile(data.file)
      setExportState('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
      setExportState('error')
    }
  }, [protocol, failureAnalysis, targetTier])

  const handleDownload = React.useCallback(() => {
    if (!exportedFile) return

    const blob = new Blob([JSON.stringify(exportedFile, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${protocol.title.toLowerCase().replace(/\s+/g, '-')}.exergy-experiment.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [exportedFile, protocol.title])

  const handleCopyToClipboard = React.useCallback(async () => {
    if (!exportedFile) return

    try {
      await navigator.clipboard.writeText(JSON.stringify(exportedFile, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textarea = document.createElement('textarea')
      textarea.value = JSON.stringify(exportedFile, null, 2)
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [exportedFile])

  const handleOpenInSimulations = React.useCallback(() => {
    if (!exportedFile) return

    if (onOpenInSimulations) {
      onOpenInSimulations(exportedFile)
    } else {
      // Store file in localStorage and navigate
      localStorage.setItem('pendingExperimentFile', JSON.stringify(exportedFile))
      window.location.href = '/simulations?import=pending'
    }
  }, [exportedFile, onOpenInSimulations])

  return (
    <Card className="bg-background-surface border-border">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <FileJson className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-foreground">Export Experiment</h3>
          <p className="text-sm text-foreground-muted">
            Generate a simulation-compatible experiment file
          </p>
        </div>
      </div>

      {/* Tier Selection */}
      {exportState === 'idle' && (
        <div className="mb-4">
          <label className="text-sm font-medium text-foreground mb-2 block">
            Target Simulation Tier
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['tier1', 'tier2', 'tier3'] as const).map((tier) => {
              const tierLabels = {
                tier1: { label: 'Browser', desc: 'Fast, free' },
                tier2: { label: 'Local', desc: 'GPU T4' },
                tier3: { label: 'Cloud', desc: 'High-fidelity' },
              }
              return (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setTargetTier(tier)}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    targetTier === tier
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background-elevated text-foreground hover:border-primary/50'
                  }`}
                >
                  <div className="text-sm font-medium">{tierLabels[tier].label}</div>
                  <div className="text-xs text-foreground-muted">{tierLabels[tier].desc}</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Generate Button */}
      {exportState === 'idle' && (
        <Button onClick={generateExportFile} className="w-full">
          <Cpu className="w-4 h-4 mr-2" />
          Generate Simulation File
        </Button>
      )}

      {/* Loading State */}
      {exportState === 'generating' && (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-3" />
          <span className="text-sm text-foreground-muted">
            Generating AI simulation parameters...
          </span>
        </div>
      )}

      {/* Error State */}
      {exportState === 'error' && (
        <div className="space-y-3">
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error || 'Failed to generate export file'}
          </div>
          <Button variant="secondary" onClick={generateExportFile} className="w-full">
            Try Again
          </Button>
        </div>
      )}

      {/* Ready State - Export Options */}
      {exportState === 'ready' && exportedFile && (
        <div className="space-y-4">
          {/* Success Message */}
          <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-700">
              Experiment file generated successfully
            </span>
          </div>

          {/* File Info */}
          <div className="p-3 rounded-lg bg-background-elevated border border-border">
            <div className="flex items-center justify-between text-sm">
              <span className="text-foreground-muted">Filename:</span>
              <code className="text-xs bg-background-surface px-2 py-1 rounded">
                {protocol.title.toLowerCase().replace(/\s+/g, '-')}.exergy-experiment.json
              </code>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-foreground-muted">File size:</span>
              <span className="text-foreground">
                ~{(JSON.stringify(exportedFile).length / 1024).toFixed(1)} KB
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-foreground-muted">Version:</span>
              <Badge size="sm" variant="secondary">v{exportedFile.version}</Badge>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleDownload}>
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="secondary" onClick={handleCopyToClipboard}>
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy JSON
                </>
              )}
            </Button>
          </div>

          {/* Open in Simulations */}
          <Button
            variant="secondary"
            onClick={handleOpenInSimulations}
            className="w-full"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open in Simulations Page
          </Button>

          {/* Toggle Simulation Parameters */}
          <button
            type="button"
            onClick={() => setShowSimParams(!showSimParams)}
            className="w-full flex items-center justify-between p-3 rounded-lg bg-background-elevated border border-border hover:bg-background-surface transition-colors"
          >
            <span className="text-sm font-medium text-foreground">
              View AI Simulation Parameters
            </span>
            {showSimParams ? (
              <ChevronUp className="w-4 h-4 text-foreground-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-foreground-muted" />
            )}
          </button>

          {/* Simulation Suggestions Panel */}
          {showSimParams && (
            <SimulationSuggestionsPanel
              suggestion={exportedFile.simulation}
              compact={false}
            />
          )}

          {/* Regenerate Option */}
          <div className="pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setExportState('idle')
                setExportedFile(null)
              }}
              className="w-full text-foreground-muted"
            >
              Generate New File with Different Settings
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
