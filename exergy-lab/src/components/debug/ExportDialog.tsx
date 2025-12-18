'use client'

/**
 * ExportDialog Component
 *
 * Dialog for selecting export format and options.
 */

import * as React from 'react'
import { Download, Copy, Check, FileJson, FileText, FileCode } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { ExportFormat, ExportOptions } from '@/types/debug'

// ============================================================================
// Props
// ============================================================================

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  onExport: (options: ExportOptions) => string
  onCopyToClipboard: (content: string) => Promise<boolean>
}

// ============================================================================
// Format Options
// ============================================================================

const FORMAT_OPTIONS: {
  value: ExportFormat
  label: string
  description: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}[] = [
  {
    value: 'markdown',
    label: 'Markdown',
    description: 'Best for pasting into Claude or chat',
    icon: FileText,
  },
  {
    value: 'json',
    label: 'JSON',
    description: 'Complete data for programmatic use',
    icon: FileJson,
  },
  {
    value: 'text',
    label: 'Plain Text',
    description: 'Simple format for logs',
    icon: FileCode,
  },
]

// ============================================================================
// Main Component
// ============================================================================

export function ExportDialog({
  isOpen,
  onClose,
  onExport,
  onCopyToClipboard,
}: ExportDialogProps) {
  const [format, setFormat] = React.useState<ExportFormat>('markdown')
  const [includeEvents, setIncludeEvents] = React.useState(true)
  const [includeApiCalls, setIncludeApiCalls] = React.useState(true)
  const [includeErrors, setIncludeErrors] = React.useState(true)
  const [includeRawData, setIncludeRawData] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [preview, setPreview] = React.useState('')

  // Generate preview when options change
  React.useEffect(() => {
    if (!isOpen) return

    const options: ExportOptions = {
      format,
      includeEvents,
      includeApiCalls,
      includeErrors,
      includeRawData,
      maxEvents: 10, // Limited for preview
    }

    setPreview(onExport(options))
  }, [isOpen, format, includeEvents, includeApiCalls, includeErrors, includeRawData, onExport])

  // Handle copy
  const handleCopy = async () => {
    const options: ExportOptions = {
      format,
      includeEvents,
      includeApiCalls,
      includeErrors,
      includeRawData,
    }

    const content = onExport(options)
    const success = await onCopyToClipboard(content)

    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  // Handle download
  const handleDownload = () => {
    const options: ExportOptions = {
      format,
      includeEvents,
      includeApiCalls,
      includeErrors,
      includeRawData,
    }

    const content = onExport(options)
    const mimeType =
      format === 'json'
        ? 'application/json'
        : format === 'markdown'
          ? 'text/markdown'
          : 'text/plain'
    const extension = format === 'json' ? 'json' : format === 'markdown' ? 'md' : 'txt'

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `debug-export.${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-background border border-border rounded-xl shadow-xl z-50 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Export Debug Session</h2>
          <p className="text-sm text-muted-foreground">
            Choose format and options for export
          </p>
        </div>

        {/* Content */}
        <div className="p-4 grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
          {/* Left: Options */}
          <div className="space-y-4">
            {/* Format Selection */}
            <div>
              <div className="text-sm font-medium text-foreground mb-2">Format</div>
              <div className="space-y-2">
                {FORMAT_OPTIONS.map((option) => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.value}
                      onClick={() => setFormat(option.value)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                        format === option.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/50'
                      )}
                    >
                      <Icon
                        size={18}
                        className={cn(
                          format === option.value ? 'text-primary' : 'text-muted-foreground'
                        )}
                      />
                      <div>
                        <div className="text-sm font-medium">{option.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {option.description}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Include Options */}
            <div>
              <div className="text-sm font-medium text-foreground mb-2">Include</div>
              <div className="space-y-2">
                <Checkbox
                  label="SSE Events"
                  checked={includeEvents}
                  onChange={setIncludeEvents}
                />
                <Checkbox
                  label="API Calls"
                  checked={includeApiCalls}
                  onChange={setIncludeApiCalls}
                />
                <Checkbox
                  label="Errors"
                  checked={includeErrors}
                  onChange={setIncludeErrors}
                />
                <Checkbox
                  label="Raw Data / Final Result"
                  checked={includeRawData}
                  onChange={setIncludeRawData}
                />
              </div>
            </div>
          </div>

          {/* Right: Preview */}
          <div>
            <div className="text-sm font-medium text-foreground mb-2">Preview</div>
            <pre className="h-64 p-3 bg-muted rounded-lg overflow-auto text-[10px] font-mono text-muted-foreground whitespace-pre-wrap">
              {preview.substring(0, 2000)}
              {preview.length > 2000 && '\n\n... (preview truncated)'}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex items-center justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleCopy}>
            {copied ? (
              <>
                <Check size={14} className="mr-2 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy size={14} className="mr-2" />
                Copy to Clipboard
              </>
            )}
          </Button>
          <Button onClick={handleDownload}>
            <Download size={14} className="mr-2" />
            Download
          </Button>
        </div>
      </div>
    </>
  )
}

// ============================================================================
// Checkbox Component
// ============================================================================

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
      />
      <span className="text-sm text-foreground">{label}</span>
    </label>
  )
}

export default ExportDialog
