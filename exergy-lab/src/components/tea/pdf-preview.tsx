'use client'

import * as React from 'react'
import { Download, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'
import { Button, Modal } from '@/components/ui'

export interface PDFPreviewProps {
  isOpen: boolean
  onClose: () => void
  pdfDataUrl: string | null
  filename?: string
}

export function PDFPreview({ isOpen, onClose, pdfDataUrl, filename = 'report.pdf' }: PDFPreviewProps) {
  const [currentPage, setCurrentPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [zoom, setZoom] = React.useState(100)

  const handleDownload = () => {
    if (!pdfDataUrl) return

    // Create download link
    const link = document.createElement('a')
    link.href = pdfDataUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(200, prev + 10))
  }

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(50, prev - 10))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full" title="PDF Preview">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-foreground">{filename}</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Page Navigation */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-background-surface border border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="text-sm text-foreground">
              {currentPage} / {totalPages}
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-background-surface border border-border">
            <Button variant="ghost" size="sm" onClick={handleZoomOut} disabled={zoom <= 50}>
              <ZoomOut className="w-4 h-4" />
            </Button>

            <span className="text-sm text-foreground w-12 text-center">{zoom}%</span>

            <Button variant="ghost" size="sm" onClick={handleZoomIn} disabled={zoom >= 200}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          {/* Download Button */}
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>

          {/* Close Button */}
          <Button variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-background-surface rounded-lg">
        {pdfDataUrl ? (
          <div
            className="flex items-center justify-center p-8"
            style={{ minHeight: '600px' }}
          >
            <iframe
              src={pdfDataUrl}
              className="w-full h-full rounded-lg border border-border"
              style={{
                minHeight: '600px',
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'top center',
              }}
              title="PDF Preview"
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-96">
            <p className="text-foreground-muted">No PDF to preview</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
