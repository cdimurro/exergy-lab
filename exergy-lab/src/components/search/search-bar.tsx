'use client'

import * as React from 'react'
import { Search, Sparkles, Loader2 } from 'lucide-react'
import { Input, Button } from '@/components/ui'

export interface SearchBarProps {
  onSearch: (query: string) => void
  isLoading?: boolean
  expandedQuery?: string
  placeholder?: string
}

export function SearchBar({ onSearch, isLoading, expandedQuery, placeholder }: SearchBarProps) {
  const [query, setQuery] = React.useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      onSearch(query.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e)
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          {/* Search Icon */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
            {isLoading ? (
              <Loader2 className="w-5 h-5 text-foreground-muted animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-foreground-muted" />
            )}
          </div>

          {/* Input */}
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              placeholder || 'Search for research papers, articles, and publications...'
            }
            disabled={isLoading}
            className="w-full h-14 pl-12 pr-32 rounded-xl border-2 border-border bg-background-elevated text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          />

          {/* Search Button */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="h-10 px-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* AI Expanded Query Display */}
      {expandedQuery && expandedQuery !== query && (
        <div className="mt-3 px-4 py-3 rounded-lg bg-background-surface border border-border">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground-muted mb-1">
                AI-Enhanced Search Query
              </p>
              <p className="text-sm text-foreground">{expandedQuery}</p>
            </div>
          </div>
        </div>
      )}

      {/* Search Tips */}
      {!query && !isLoading && (
        <div className="mt-4 px-4">
          <p className="text-xs text-foreground-muted mb-2">Search tips:</p>
          <ul className="text-xs text-foreground-muted space-y-1">
            <li>• Use specific keywords related to your research topic</li>
            <li>• Try author names, paper titles, or technical terms</li>
            <li>• AI will automatically expand your query for better results</li>
          </ul>
        </div>
      )}
    </div>
  )
}
