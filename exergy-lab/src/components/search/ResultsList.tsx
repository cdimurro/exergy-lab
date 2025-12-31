'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import {
  FileText,
  ExternalLink,
  Quote,
  Calendar,
  Bookmark,
  BookmarkCheck,
  Check,
  Minus,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Filter,
  Download,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface SearchResult {
  id: string
  title: string
  authors: Array<{ name: string; affiliation?: string }>
  year: number
  venue?: string
  abstract?: string
  citationCount?: number
  url?: string
  doi?: string
  isOpenAccess?: boolean
  sources: string[]
  relevanceScore?: number
  tldr?: string
  fieldsOfStudy?: string[]
}

interface ResultsListProps {
  results: SearchResult[]
  isLoading?: boolean
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onResultClick: (result: SearchResult) => void
  onSaveResult?: (result: SearchResult) => void
  savedIds?: string[]
  totalCount?: number
  currentPage?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  sortBy?: 'relevance' | 'date' | 'citations'
  onSortChange?: (sort: 'relevance' | 'date' | 'citations') => void
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function ResultsList({
  results,
  isLoading = false,
  selectedIds,
  onSelectionChange,
  onResultClick,
  onSaveResult,
  savedIds = [],
  totalCount,
  currentPage = 1,
  pageSize = 20,
  onPageChange,
  sortBy = 'relevance',
  onSortChange,
  className = '',
}: ResultsListProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Calculate pagination
  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 1
  const displayCount = totalCount ?? results.length

  // Check if all visible results are selected
  const allSelected = useMemo(() => {
    return results.length > 0 && results.every((r) => selectedIds.includes(r.id))
  }, [results, selectedIds])

  const someSelected = useMemo(() => {
    return results.some((r) => selectedIds.includes(r.id)) && !allSelected
  }, [results, selectedIds, allSelected])

  // Toggle all selection
  const handleToggleAll = () => {
    if (allSelected) {
      // Deselect all visible
      onSelectionChange(selectedIds.filter((id) => !results.find((r) => r.id === id)))
    } else {
      // Select all visible
      const newIds = [...new Set([...selectedIds, ...results.map((r) => r.id)])]
      onSelectionChange(newIds)
    }
  }

  // Toggle single selection
  const handleToggleOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((i) => i !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  // Format author list
  const formatAuthors = (authors: SearchResult['authors'], maxCount = 3) => {
    if (authors.length <= maxCount) {
      return authors.map((a) => a.name).join(', ')
    }
    return `${authors
      .slice(0, maxCount)
      .map((a) => a.name)
      .join(', ')} +${authors.length - maxCount} more`
  }

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={`space-y-3 ${className}`}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-zinc-800 rounded-lg p-4 animate-pulse">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-zinc-700 rounded" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-zinc-700 rounded w-3/4" />
                <div className="h-4 bg-zinc-700 rounded w-1/2" />
                <div className="h-3 bg-zinc-700 rounded w-1/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Empty state
  if (results.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <FileText className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400">No results found</p>
        <p className="text-sm text-zinc-500 mt-1">Try adjusting your search query or filters</p>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header bar */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Select all checkbox */}
          <button
            onClick={handleToggleAll}
            className={`
              w-5 h-5 rounded border flex items-center justify-center transition-colors
              ${allSelected || someSelected ? 'bg-emerald-600 border-emerald-600' : 'border-zinc-600 hover:border-zinc-500'}
            `}
          >
            {allSelected && <Check className="w-3 h-3 text-white" />}
            {someSelected && <Minus className="w-3 h-3 text-white" />}
          </button>

          <span className="text-sm text-zinc-400">
            {displayCount.toLocaleString()} results
            {selectedIds.length > 0 && (
              <span className="ml-2 text-emerald-400">
                ({selectedIds.length} selected)
              </span>
            )}
          </span>
        </div>

        {/* Sort dropdown */}
        {onSortChange && (
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-zinc-500" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as typeof sortBy)}
              className="bg-zinc-700 text-sm text-zinc-300 rounded px-2 py-1 border-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="relevance">Relevance</option>
              <option value="date">Date (Newest)</option>
              <option value="citations">Citations</option>
            </select>
          </div>
        )}
      </div>

      {/* Results list */}
      <div className="space-y-2">
        {results.map((result) => {
          const isSelected = selectedIds.includes(result.id)
          const isSaved = savedIds.includes(result.id)
          const isHovered = hoveredId === result.id

          return (
            <div
              key={result.id}
              className={`
                group bg-zinc-800 rounded-lg p-4 cursor-pointer transition-all
                ${isSelected ? 'ring-2 ring-emerald-500/50 bg-zinc-750' : 'hover:bg-zinc-750'}
              `}
              onMouseEnter={() => setHoveredId(result.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => onResultClick(result)}
            >
              <div className="flex items-start gap-3">
                {/* Selection checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleToggleOne(result.id)
                  }}
                  className={`
                    w-5 h-5 rounded border flex-shrink-0 mt-0.5
                    flex items-center justify-center transition-colors
                    ${isSelected ? 'bg-emerald-600 border-emerald-600' : 'border-zinc-600 hover:border-zinc-500'}
                  `}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </button>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <h3 className="text-sm font-medium text-white leading-snug line-clamp-2 group-hover:text-emerald-400 transition-colors">
                    {result.title}
                  </h3>

                  {/* Authors and venue */}
                  <p className="text-xs text-zinc-400 mt-1 truncate">
                    {formatAuthors(result.authors)}
                    {result.venue && (
                      <>
                        <span className="mx-1 text-zinc-600">|</span>
                        <span className="text-zinc-500">{result.venue}</span>
                      </>
                    )}
                  </p>

                  {/* Meta info */}
                  <div className="flex items-center gap-3 mt-2 text-xs">
                    <span className="flex items-center gap-1 text-zinc-500">
                      <Calendar className="w-3 h-3" />
                      {result.year}
                    </span>

                    {result.citationCount !== undefined && (
                      <span className="flex items-center gap-1 text-zinc-500">
                        <Quote className="w-3 h-3" />
                        {result.citationCount.toLocaleString()}
                      </span>
                    )}

                    {result.isOpenAccess && (
                      <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-xs">
                        Open Access
                      </span>
                    )}

                    {result.relevanceScore !== undefined && (
                      <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-xs">
                        {(result.relevanceScore * 10).toFixed(1)}
                      </span>
                    )}
                  </div>

                  {/* Sources */}
                  {result.sources.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <span className="text-xs text-zinc-600">Found in:</span>
                      {result.sources.slice(0, 3).map((source) => (
                        <span
                          key={source}
                          className="px-1.5 py-0.5 bg-zinc-700 text-zinc-400 rounded text-xs"
                        >
                          {source}
                        </span>
                      ))}
                      {result.sources.length > 3 && (
                        <span className="text-xs text-zinc-600">
                          +{result.sources.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* TLDR if available */}
                  {result.tldr && isHovered && (
                    <p className="text-xs text-zinc-400 mt-2 line-clamp-2 bg-zinc-900 rounded p-2">
                      {result.tldr}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onSaveResult && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onSaveResult(result)
                      }}
                      className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                      title={isSaved ? 'Saved' : 'Save to library'}
                    >
                      {isSaved ? (
                        <BookmarkCheck className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Bookmark className="w-4 h-4 text-zinc-400" />
                      )}
                    </button>
                  )}

                  {result.url && (
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1.5 hover:bg-zinc-700 rounded transition-colors"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-4 h-4 text-zinc-400" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-700">
          <p className="text-sm text-zinc-400">
            Page {currentPage} of {totalPages}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className={`
                p-2 rounded transition-colors
                ${currentPage <= 1 ? 'text-zinc-600 cursor-not-allowed' : 'text-zinc-400 hover:bg-zinc-700'}
              `}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                let pageNum: number
                if (totalPages <= 5) {
                  pageNum = i + 1
                } else if (currentPage <= 3) {
                  pageNum = i + 1
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i
                } else {
                  pageNum = currentPage - 2 + i
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`
                      w-8 h-8 rounded text-sm transition-colors
                      ${pageNum === currentPage
                        ? 'bg-emerald-600 text-white'
                        : 'text-zinc-400 hover:bg-zinc-700'}
                    `}
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className={`
                p-2 rounded transition-colors
                ${currentPage >= totalPages ? 'text-zinc-600 cursor-not-allowed' : 'text-zinc-400 hover:bg-zinc-700'}
              `}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
