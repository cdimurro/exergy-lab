'use client'

import * as React from 'react'
import { ExternalLink, FileText, Download, BookmarkPlus, BookmarkCheck, Users, Calendar, Award } from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'
import type { Source, DataSourceName } from '@/types/sources'

// Source display names mapping
const SOURCE_DISPLAY_NAMES: Record<DataSourceName, string> = {
  'semantic-scholar': 'Semantic Scholar',
  'openalex': 'OpenAlex',
  'arxiv': 'arXiv',
  'pubmed': 'PubMed',
  'crossref': 'Crossref',
  'core': 'CORE',
  'consensus': 'Consensus',
  'google-patents': 'Google Patents',
  'uspto': 'USPTO',
  'epo': 'EPO',
  'chemrxiv': 'ChemRxiv',
  'biorxiv': 'bioRxiv',
  'medrxiv': 'medRxiv',
  'nrel': 'NREL',
  'ieee': 'IEEE Xplore',
  'iea': 'IEA',
  'eia': 'EIA',
  'materials-project': 'Materials Project',
  'zenodo': 'Zenodo',
  'inspire': 'INSPIRE',
  'newsapi': 'NewsAPI',
  'web-search': 'Web Search',
}

// Source badge color mapping
const SOURCE_BADGE_COLORS: Record<DataSourceName, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'> = {
  'semantic-scholar': 'secondary',
  'openalex': 'secondary',
  'arxiv': 'primary',
  'pubmed': 'success',
  'crossref': 'secondary',
  'core': 'secondary',
  'consensus': 'primary',
  'google-patents': 'warning',
  'uspto': 'warning',
  'epo': 'warning',
  'chemrxiv': 'primary',
  'biorxiv': 'success',
  'medrxiv': 'success',
  'nrel': 'primary',
  'ieee': 'secondary',
  'iea': 'secondary',
  'eia': 'secondary',
  'materials-project': 'primary',
  'zenodo': 'secondary',
  'inspire': 'secondary',
  'newsapi': 'default',
  'web-search': 'default',
}

export interface PaperCardProps {
  paper: Source
  onSave?: (paper: Source) => void
  isSaved?: boolean
  onClick?: () => void
}

export function PaperCard({ paper, onSave, isSaved, onClick }: PaperCardProps) {
  const [saved, setSaved] = React.useState(isSaved || false)

  const handleSave = () => {
    setSaved(!saved)
    onSave?.(paper)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
  }

  const sourceName = SOURCE_DISPLAY_NAMES[paper.metadata.source] || paper.metadata.source
  const sourceBadgeColor = SOURCE_BADGE_COLORS[paper.metadata.source] || 'default'
  const citationCount = paper.metadata.citationCount || 0
  const publicationDate = paper.metadata.publicationDate

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on a button or link
    const target = e.target as HTMLElement
    if (target.closest('a') || target.closest('button')) {
      return
    }
    onClick?.()
  }

  return (
    <Card
      className={`p-6 hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={handleCardClick}
    >
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-2">
              <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {paper.title}
              </a>
            </h3>

            {/* Authors */}
            {paper.authors && paper.authors.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-foreground-muted mb-2">
                <Users className="w-4 h-4 shrink-0" />
                <p className="line-clamp-1">
                  {paper.authors.slice(0, 3).join(', ')}
                  {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
                </p>
              </div>
            )}

            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-foreground-muted">
              {publicationDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(publicationDate)}
                </div>
              )}

              {citationCount > 0 && (
                <div className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  {citationCount.toLocaleString()} citations
                </div>
              )}

              {/* Show verification status */}
              {paper.metadata.verificationStatus !== 'unverified' && (
                <div className="flex items-center gap-1">
                  <span>•</span>
                  <span className="capitalize">{paper.metadata.verificationStatus}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-start gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className="shrink-0"
            >
              {saved ? (
                <BookmarkCheck className="w-4 h-4 text-primary" />
              ) : (
                <BookmarkPlus className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Abstract */}
        {paper.abstract && (
          <p className="text-sm text-foreground-muted line-clamp-3">
            {paper.abstract}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
          {/* Source Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={sourceBadgeColor} size="sm">
              {sourceName}
            </Badge>

            {/* Access type badge */}
            {paper.metadata.accessType === 'open' && (
              <Badge variant="success" size="sm">
                Open Access
              </Badge>
            )}
          </div>

          {/* Links */}
          <div className="flex items-center gap-2 shrink-0">
            {paper.url && (
              <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-background-elevated rounded-md transition-colors"
              >
                <FileText className="w-4 h-4" />
                View Paper
                <ExternalLink className="w-3 h-3" />
              </a>
            )}

            {(() => {
              const pdfUrl = 'pdfUrl' in paper ? paper.pdfUrl : undefined
              if (typeof pdfUrl === 'string') {
                return (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground-muted hover:text-foreground hover:bg-background-elevated rounded-md transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </a>
                )
              }
              return null
            })()}
          </div>
        </div>
      </div>
    </Card>
  )
}
