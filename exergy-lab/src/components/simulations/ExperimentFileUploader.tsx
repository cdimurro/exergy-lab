'use client'

import * as React from 'react'
import {
  Upload,
  FileJson,
  Check,
  X,
  AlertCircle,
  AlertTriangle,
  Loader2,
  FlaskConical,
} from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'
import type { ExergyExperimentFile } from '@/types/exergy-experiment'

interface ExperimentFileUploaderProps {
  onFileImported: (file: ExergyExperimentFile) => void
  onError?: (error: string) => void
}

type UploadState = 'idle' | 'dragging' | 'validating' | 'success' | 'error'

interface ValidationResult {
  valid: boolean
  file?: ExergyExperimentFile
  errors?: Array<{ path: string; message: string }>
  warnings?: Array<{ path: string; message: string }>
}

export function ExperimentFileUploader({
  onFileImported,
  onError,
}: ExperimentFileUploaderProps) {
  const [state, setState] = React.useState<UploadState>('idle')
  const [validationResult, setValidationResult] = React.useState<ValidationResult | null>(null)
  const [fileName, setFileName] = React.useState<string>('')
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setState('dragging')
  }, [])

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setState('idle')
  }, [])

  const validateFile = React.useCallback(async (file: File) => {
    setState('validating')
    setFileName(file.name)

    try {
      // Check file type
      if (!file.name.endsWith('.json') && !file.name.endsWith('.exergy-experiment.json')) {
        throw new Error('Invalid file type. Please upload a .exergy-experiment.json file.')
      }

      // Read file content
      const content = await file.text()
      let parsed: unknown

      try {
        parsed = JSON.parse(content)
      } catch {
        throw new Error('Invalid JSON format')
      }

      // Validate via API
      const response = await fetch('/api/simulations/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file: parsed,
          validateOnly: false,
        }),
      })

      const result = await response.json()

      if (!result.success || !result.valid) {
        setValidationResult({
          valid: false,
          errors: result.errors,
          warnings: result.warnings,
        })
        setState('error')
        onError?.(result.errors?.[0]?.message || 'Validation failed')
        return
      }

      setValidationResult({
        valid: true,
        file: result.file,
        warnings: result.warnings,
      })
      setState('success')

      // Notify parent
      if (result.file) {
        onFileImported(result.file)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to process file'
      setValidationResult({
        valid: false,
        errors: [{ path: 'file', message }],
      })
      setState('error')
      onError?.(message)
    }
  }, [onFileImported, onError])

  const handleDrop = React.useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const files = e.dataTransfer.files
      if (files.length > 0) {
        await validateFile(files[0])
      } else {
        setState('idle')
      }
    },
    [validateFile]
  )

  const handleFileSelect = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        await validateFile(files[0])
      }
    },
    [validateFile]
  )

  const handleReset = React.useCallback(() => {
    setState('idle')
    setValidationResult(null)
    setFileName('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  const handleBrowseClick = React.useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // Check for pending import from localStorage
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('import') === 'pending') {
      const pendingFile = localStorage.getItem('pendingExperimentFile')
      if (pendingFile) {
        try {
          const parsed = JSON.parse(pendingFile)
          setFileName('Imported from Experiments')
          setValidationResult({ valid: true, file: parsed })
          setState('success')
          onFileImported(parsed)
          localStorage.removeItem('pendingExperimentFile')
          // Clean up URL
          window.history.replaceState({}, '', window.location.pathname)
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [onFileImported])

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.exergy-experiment.json"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center transition-all
          ${state === 'dragging' ? 'border-primary bg-primary/5' : ''}
          ${state === 'idle' ? 'border-border hover:border-primary/50 hover:bg-background-surface' : ''}
          ${state === 'validating' ? 'border-primary bg-primary/5' : ''}
          ${state === 'success' ? 'border-green-500 bg-green-50' : ''}
          ${state === 'error' ? 'border-red-500 bg-red-50' : ''}
        `}
      >
        {/* Idle State */}
        {state === 'idle' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">
                Drag and drop your experiment file
              </p>
              <p className="text-sm text-foreground-muted mt-1">
                or{' '}
                <button
                  type="button"
                  onClick={handleBrowseClick}
                  className="text-primary hover:underline font-medium"
                >
                  browse
                </button>{' '}
                to select a file
              </p>
            </div>
            <div className="flex justify-center gap-2">
              <Badge variant="secondary" size="sm">
                <FileJson className="w-3 h-3 mr-1" />
                .exergy-experiment.json
              </Badge>
            </div>
          </div>
        )}

        {/* Dragging State */}
        {state === 'dragging' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                <Upload className="h-8 w-8 text-primary" />
              </div>
            </div>
            <p className="text-lg font-medium text-primary">Drop file to import</p>
          </div>
        )}

        {/* Validating State */}
        {state === 'validating' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">Validating experiment file...</p>
              <p className="text-sm text-foreground-muted mt-1">{fileName}</p>
            </div>
          </div>
        )}

        {/* Success State */}
        {state === 'success' && validationResult?.file && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div>
              <p className="text-lg font-medium text-green-700">File imported successfully</p>
              <p className="text-sm text-foreground-muted mt-1">{fileName}</p>
            </div>

            {/* Experiment Preview */}
            <Card className="mx-auto max-w-md bg-white border-green-200 text-left">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FlaskConical className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate">
                    {validationResult.file.metadata.title}
                  </h4>
                  <p className="text-sm text-foreground-muted truncate">
                    {validationResult.file.metadata.description}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge size="sm" variant="secondary">
                      {validationResult.file.metadata.domain}
                    </Badge>
                    <Badge size="sm" variant="secondary">
                      {validationResult.file.simulation.suggestedType}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>

            {/* Warnings */}
            {validationResult.warnings && validationResult.warnings.length > 0 && (
              <div className="mx-auto max-w-md p-3 rounded-lg bg-amber-50 border border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      {validationResult.warnings.length} warning(s)
                    </p>
                    <ul className="text-xs text-amber-700 mt-1 space-y-0.5">
                      {validationResult.warnings.slice(0, 3).map((w, i) => (
                        <li key={i}>{w.message}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <Button variant="ghost" size="sm" onClick={handleReset}>
              <X className="w-4 h-4 mr-2" />
              Import Different File
            </Button>
          </div>
        )}

        {/* Error State */}
        {state === 'error' && validationResult && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <div>
              <p className="text-lg font-medium text-red-700">Validation failed</p>
              <p className="text-sm text-foreground-muted mt-1">{fileName}</p>
            </div>

            {/* Errors */}
            {validationResult.errors && validationResult.errors.length > 0 && (
              <div className="mx-auto max-w-md p-3 rounded-lg bg-red-50 border border-red-200">
                <ul className="text-sm text-red-700 space-y-1">
                  {validationResult.errors.map((e, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <X className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        {e.path !== 'file' && <code className="text-xs">{e.path}:</code>}{' '}
                        {e.message}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <Button variant="secondary" onClick={handleReset}>
              Try Again
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
