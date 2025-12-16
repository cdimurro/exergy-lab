'use client'

import * as React from 'react'
import { ExternalLink, FileText, Download, BookmarkPlus, BookmarkCheck, Users, Calendar, Award } from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'
import type { Paper } from '@/types/search'

export interface PaperCardProps {
  paper: Paper
  onSave?: (paper: Paper) => void
  isSaved?: boolean
}

export function PaperCard({ paper, onSave, isSaved }: PaperCardProps) {
  const [saved, setSaved] = React.useState(isSaved || false)

  const handleSave = () => {
    setSaved(!saved)
    onSave?.(paper)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
  }

  const getSourceBadgeColor = () => {
    if (paper.id.startsWith('s2-')) return 'secondary'
    if (paper.id.startsWith('arxiv-')) return 'primary'
    if (paper.id.startsWith('pubmed-')) return 'success'
    return 'default'
  }

  const getSourceName = () => {
    if (paper.id.startsWith('s2-')) return 'Semantic Scholar'
    if (paper.id.startsWith('arxiv-')) return 'arXiv'
    if (paper.id.startsWith('pubmed-')) return 'PubMed'
    return 'Unknown'
  }

  return (
    <Card className="p-6 hover:shadow-md transition-shadow">
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
              {paper.publicationDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(paper.publicationDate)}
                </div>
              )}

              {paper.citationCount !== undefined && paper.citationCount > 0 && (
                <div className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  {paper.citationCount.toLocaleString()} citations
                </div>
              )}

              {paper.venue && (
                <div className="flex items-center gap-1">
                  <span>•</span>
                  <span className="line-clamp-1">{paper.venue}</span>
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
          {/* Tags and Source */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={getSourceBadgeColor()} size="sm">
              {getSourceName()}
            </Badge>

            {paper.fields && paper.fields.slice(0, 3).map((field) => (
              <Badge key={field} variant="secondary" size="sm">
                {field}
              </Badge>
            ))}
          </div>

          {/* Links */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              asChild
            >
              <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                View Paper
                <ExternalLink className="w-3 h-3" />
              </a>
            </Button>

            {paper.pdfUrl && (
              <Button
                variant="ghost"
                size="sm"
                asChild
              >
                <a
                  href={paper.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  PDF
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
