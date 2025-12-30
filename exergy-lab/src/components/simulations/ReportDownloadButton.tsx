'use client'

import * as React from 'react'
import { Download, FileText, Loader2, Check, AlertCircle, ChevronDown } from 'lucide-react'
import { Button, Badge } from '@/components/ui'
import type { SimulationReportData } from '@/types/simulation-report'

interface ReportDownloadButtonProps {
  reportData: SimulationReportData
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  showFormatSelector?: boolean
  className?: string
}

type DownloadState = 'idle' | 'generating' | 'success' | 'error'
type ReportFormat = 'pdf' | 'html' | 'json'

export function ReportDownloadButton({
  reportData,
  variant = 'primary',
  size = 'md',
  showFormatSelector = true,
  className,
}: ReportDownloadButtonProps) {
  const [state, setState] = React.useState<DownloadState>('idle')
  const [format, setFormat] = React.useState<ReportFormat>('pdf')
  const [showFormats, setShowFormats] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const formatLabels: Record<ReportFormat, string> = {
    pdf: 'PDF Report',
    html: 'HTML Report',
    json: 'JSON Data',
  }

  const handleDownload = React.useCallback(async () => {
    setState('generating')
    setError(null)

    try {
      const response = await fetch('/api/simulations/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportData,
          format,
        }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate report')
      }

      // Download the file
      let blob: Blob
      let filename = result.filename

      if (format === 'pdf') {
        // Decode base64 PDF
        const binaryString = atob(result.data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        blob = new Blob([bytes], { type: 'application/pdf' })
      } else {
        // HTML or JSON - use text directly
        blob = new Blob([result.data], { type: result.contentType })
      }

      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setState('success')
      setTimeout(() => setState('idle'), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed')
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }, [reportData, format])

  const handleFormatChange = React.useCallback((newFormat: ReportFormat) => {
    setFormat(newFormat)
    setShowFormats(false)
  }, [])

  return (
    <div className={`relative inline-flex ${className}`}>
      {/* Main Download Button */}
      <Button
        variant={variant}
        size={size}
        onClick={handleDownload}
        disabled={state === 'generating'}
        className={`${showFormatSelector ? 'rounded-r-none' : ''}`}
      >
        {state === 'idle' && (
          <>
            <Download className="w-4 h-4 mr-2" />
            Download {formatLabels[format]}
          </>
        )}
        {state === 'generating' && (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Generating...
          </>
        )}
        {state === 'success' && (
          <>
            <Check className="w-4 h-4 mr-2" />
            Downloaded!
          </>
        )}
        {state === 'error' && (
          <>
            <AlertCircle className="w-4 h-4 mr-2" />
            {error || 'Failed'}
          </>
        )}
      </Button>

      {/* Format Selector */}
      {showFormatSelector && (
        <div className="relative">
          <Button
            variant={variant}
            size={size}
            onClick={() => setShowFormats(!showFormats)}
            disabled={state === 'generating'}
            className="rounded-l-none border-l-0 px-2"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>

          {showFormats && (
            <div className="absolute right-0 top-full mt-1 bg-background-elevated border border-border rounded-lg shadow-lg z-10 min-w-[140px]">
              {(Object.keys(formatLabels) as ReportFormat[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => handleFormatChange(f)}
                  className={`
                    w-full px-4 py-2 text-left text-sm hover:bg-background-surface first:rounded-t-lg last:rounded-b-lg
                    ${f === format ? 'text-primary font-medium' : 'text-foreground'}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {formatLabels[f]}
                    {f === format && <Check className="w-4 h-4 ml-auto" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
