'use client'

import * as React from 'react'
import { ArrowLeft, Download, ExternalLink, Loader2 } from 'lucide-react'

/**
 * PdfViewerOverlay props
 */
interface PdfViewerOverlayProps {
  url: string
  onClose: () => void
}

/**
 * PDF Viewer Overlay
 * Displays PDF in an iframe with controls
 */
export function PdfViewerOverlay({ url, onClose }: PdfViewerOverlayProps) {
  const [isLoading, setIsLoading] = React.useState(true)
  const [hasError, setHasError] = React.useState(false)

  // Construct the PDF URL with viewer options
  // Using #view=FitH for horizontal fit
  const pdfUrl = `${url}#view=FitH`

  const handleOpenInNewTab = () => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleDownload = () => {
    // Create a temporary link to trigger download
    const link = document.createElement('a')
    link.href = url
    link.download = ''
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
      {/* Header Bar */}
      <header className="sticky top-0 z-10 bg-elevated border-b border-border px-6 py-3 flex items-center justify-between">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Paper</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium
                     bg-muted/10 text-muted hover:text-foreground hover:bg-muted/20
                     rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Download PDF
          </button>

          <button
            onClick={handleOpenInNewTab}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium
                     bg-muted/10 text-muted hover:text-foreground hover:bg-muted/20
                     rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Open in New Tab
          </button>
        </div>
      </header>

      {/* PDF Content */}
      <div className="flex-1 relative bg-muted/5">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
              <p className="text-muted">Loading PDF...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="text-center max-w-md px-4">
              <p className="text-foreground font-medium mb-2">
                Unable to display PDF in browser
              </p>
              <p className="text-muted text-sm mb-4">
                The PDF may be blocked by the publisher or your browser settings.
                Try opening it in a new tab or downloading it.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleOpenInNewTab}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white
                           rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in New Tab
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-muted/20 text-foreground
                           rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PDF Iframe */}
        <iframe
          src={pdfUrl}
          className="w-full h-full border-0"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false)
            setHasError(true)
          }}
          title="PDF Viewer"
          sandbox="allow-same-origin allow-scripts allow-popups"
        />
      </div>
    </div>
  )
}
