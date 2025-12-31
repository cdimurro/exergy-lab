'use client'

import * as React from 'react'
import { useState } from 'react'
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Download,
  Calendar,
  Quote,
  Users,
  BookOpen,
  Bookmark,
  Copy,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import type { Source } from '@/types/sources'
import type { PaperContent } from '@/lib/paper-content'
import { usePaperContent } from '@/hooks/use-paper-content'
import { useSearchUIStore } from '@/lib/store/search-ui-store'
import { PaperContentRenderer } from './PaperContentRenderer'
import { PdfViewerOverlay } from './PdfViewerOverlay'

/**
 * Format author names for display
 */
function formatAuthors(authors: string[] | undefined): string {
  if (!authors || authors.length === 0) return 'Unknown authors'
  if (authors.length <= 3) return authors.join(', ')
  return `${authors.slice(0, 3).join(', ')} +${authors.length - 3} more`
}

/**
 * Get source display name
 */
function getSourceDisplayName(source: string): string {
  const names: Record<string, string> = {
    'arxiv': 'arXiv',
    'semantic-scholar': 'Semantic Scholar',
    'openalex': 'OpenAlex',
    'pubmed': 'PubMed',
    'core': 'CORE',
    'crossref': 'Crossref',
    'ieee': 'IEEE',
  }
  return names[source] || source
}

/**
 * PaperViewerPanel props
 */
interface PaperViewerPanelProps {
  paper: Source
  onBack: () => void
}

/**
 * Full-width paper viewer panel
 * Displays paper content with professional formatting
 */
export function PaperViewerPanel({ paper, onBack }: PaperViewerPanelProps) {
  const [copied, setCopied] = useState<string | null>(null)
  const { content, isLoading, error, refresh } = usePaperContent({ autoFetch: true })
  const { openPdfViewer, showPdfViewer, pdfUrl, closePdfViewer } = useSearchUIStore()

  const handleCopy = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const handleViewPdf = () => {
    const url = content?.pdfUrl || paper.url
    if (url) {
      openPdfViewer(url)
    }
  }

  const handleOpenExternal = () => {
    const url = content?.externalUrl || paper.url
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  // Generate BibTeX citation
  const generateBibTeX = () => {
    const authors = (content?.authors || paper.authors || [])
      .map((a) => (typeof a === 'string' ? a : a.name))
      .join(' and ')

    const year = content?.publicationDate?.slice(0, 4) || new Date().getFullYear()
    const key = `${(content?.authors?.[0]?.name || paper.authors?.[0] || 'unknown')
      .toString()
      .split(' ')
      .pop()
      ?.toLowerCase()}${year}`

    return `@article{${key},
  title={${content?.title || paper.title}},
  author={${authors}},
  year={${year}},
  journal={${content?.journal || 'Unknown'}},
  doi={${content?.doi || paper.doi || ''}}
}`
  }

  // Show PDF viewer overlay if active
  if (showPdfViewer && pdfUrl) {
    return <PdfViewerOverlay url={pdfUrl} onClose={closePdfViewer} />
  }

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
      {/* Header Bar */}
      <header className="sticky top-0 z-10 bg-elevated border-b border-border px-6 py-3 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Results</span>
        </button>

        <div className="flex items-center gap-2">
          {content?.pdfAvailable && (
            <button
              onClick={handleViewPdf}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium
                       bg-primary/10 text-primary hover:bg-primary/20
                       rounded-lg transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              View PDF
            </button>
          )}

          <button
            onClick={handleOpenExternal}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium
                     bg-muted/10 text-muted hover:text-foreground hover:bg-muted/20
                     rounded-lg transition-colors cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" />
            Open Original
          </button>
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-8">
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
              <p className="text-muted">Loading paper content...</p>
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center py-16">
              <AlertCircle className="w-8 h-8 text-error mb-4" />
              <p className="text-foreground font-medium mb-2">Failed to load content</p>
              <p className="text-muted text-sm mb-4">{error}</p>
              <button
                onClick={refresh}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Paper Content */}
          {!isLoading && !error && (
            <article className="space-y-8">
              {/* Header Section */}
              <header className="space-y-4">
                {/* Source Badge */}
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded">
                    {getSourceDisplayName(paper.metadata.source)}
                  </span>
                  {content?.availability === 'full' && (
                    <span className="px-2 py-1 text-xs font-medium bg-success/10 text-success rounded">
                      Full Text Available
                    </span>
                  )}
                  {paper.metadata.accessType === 'open' && (
                    <span className="px-2 py-1 text-xs font-medium bg-info/10 text-info rounded">
                      Open Access
                    </span>
                  )}
                </div>

                {/* Title */}
                <h1 className="text-2xl font-bold text-foreground leading-tight">
                  {content?.title || paper.title}
                </h1>

                {/* Authors */}
                <p className="text-base text-muted">
                  {content?.authors?.length
                    ? content.authors.map((a) => a.name).join(', ')
                    : formatAuthors(paper.authors)}
                </p>

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted">
                  {(content?.publicationDate || paper.metadata.publicationDate) && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {content?.publicationDate || paper.metadata.publicationDate}
                    </span>
                  )}
                  {(content?.citationCount ?? paper.metadata.citationCount) !== undefined && (
                    <span className="flex items-center gap-1.5">
                      <Quote className="w-4 h-4" />
                      {content?.citationCount ?? paper.metadata.citationCount} citations
                    </span>
                  )}
                  {(content?.doi || paper.doi) && (
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" />
                      DOI: {content?.doi || paper.doi}
                    </span>
                  )}
                </div>
              </header>

              {/* Divider */}
              <hr className="border-border" />

              {/* Abstract */}
              <section className="bg-background-subtle p-6 rounded-lg border border-border">
                <h2 className="text-lg font-semibold text-foreground mb-4">Abstract</h2>
                <p className="text-base text-foreground leading-relaxed">
                  {content?.abstract || paper.abstract || 'No abstract available.'}
                </p>
              </section>

              {/* Full Content Sections (when available) */}
              {content?.sections && content.sections.length > 0 && (
                <PaperContentRenderer
                  sections={content.sections}
                  figures={content.figures}
                  tables={content.tables}
                />
              )}

              {/* Metadata-only notice */}
              {content?.availability === 'metadata_only' && (
                <section className="bg-warning/10 p-6 rounded-lg border border-warning/30">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
                    <div>
                      <h3 className="font-medium text-foreground mb-1">
                        Full text not available from this source
                      </h3>
                      <p className="text-sm text-muted mb-4">
                        This paper's full content requires access through the publisher.
                        Use the buttons above to view the original publication.
                      </p>
                      <button
                        onClick={handleOpenExternal}
                        className="flex items-center gap-2 px-4 py-2 bg-foreground text-background
                                 rounded-lg hover:bg-foreground/90 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open Original Publication
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* References */}
              {content?.references && content.references.length > 0 && (
                <section>
                  <hr className="border-border mb-8" />
                  <h2 className="text-lg font-semibold text-foreground mb-4">
                    References ({content.references.length})
                  </h2>
                  <ol className="space-y-3">
                    {content.references.slice(0, 20).map((ref, index) => (
                      <li key={ref.index || index} className="text-sm text-muted pl-6 relative">
                        <span className="absolute left-0 text-foreground font-medium">
                          [{ref.index || index + 1}]
                        </span>
                        <span>{ref.text}</span>
                        {ref.doi && (
                          <a
                            href={`https://doi.org/${ref.doi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-primary hover:underline"
                          >
                            DOI
                          </a>
                        )}
                      </li>
                    ))}
                    {content.references.length > 20 && (
                      <li className="text-sm text-muted italic">
                        ...and {content.references.length - 20} more references
                      </li>
                    )}
                  </ol>
                </section>
              )}
            </article>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <footer className="sticky bottom-0 bg-elevated border-t border-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleCopy(generateBibTeX(), 'bibtex')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm
                     bg-muted/10 text-muted hover:text-foreground hover:bg-muted/20
                     rounded-lg transition-colors"
          >
            {copied === 'bibtex' ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            Copy BibTeX
          </button>

          <button
            className="flex items-center gap-2 px-3 py-1.5 text-sm
                     bg-muted/10 text-muted hover:text-foreground hover:bg-muted/20
                     rounded-lg transition-colors"
          >
            <Bookmark className="w-4 h-4" />
            Save
          </button>
        </div>

        <div className="text-sm text-muted">
          {content?.availability === 'full' && 'Full content loaded'}
          {content?.availability === 'partial' && 'Abstract and metadata loaded'}
          {content?.availability === 'metadata_only' && 'Metadata only'}
        </div>
      </footer>
    </div>
  )
}
