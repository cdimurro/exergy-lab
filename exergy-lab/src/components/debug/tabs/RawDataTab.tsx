'use client'

/**
 * RawDataTab Component
 *
 * Displays full JSON state dump with search functionality.
 */

import * as React from 'react'
import { Search, Copy, Check, Download, Expand, Shrink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { DebugSession } from '@/types/debug'

// ============================================================================
// Props
// ============================================================================

interface RawDataTabProps {
  session: DebugSession
}

// ============================================================================
// Main Component
// ============================================================================

export function RawDataTab({ session }: RawDataTabProps) {
  const [searchTerm, setSearchTerm] = React.useState('')
  const [copied, setCopied] = React.useState(false)
  const [collapsed, setCollapsed] = React.useState(true)

  // Format JSON with optional collapsing
  const formattedJSON = React.useMemo(() => {
    if (collapsed) {
      // Create a collapsed view
      return JSON.stringify(
        {
          sessionId: session.sessionId,
          discoveryId: session.discoveryId,
          status: session.status,
          query: session.query,
          startTime: new Date(session.startTime).toISOString(),
          endTime: session.endTime ? new Date(session.endTime).toISOString() : null,
          eventsCount: session.events.length,
          apiCallsCount: session.apiCalls.length,
          errorsCount: session.errors.length,
          events: `[${session.events.length} items]`,
          apiCalls: `[${session.apiCalls.length} items]`,
          errors: `[${session.errors.length} items]`,
          finalResult: session.finalResult ? '[object]' : null,
          metadata: session.metadata,
        },
        null,
        2
      )
    }
    return JSON.stringify(session, null, 2)
  }, [session, collapsed])

  // Highlight search matches
  const highlightedJSON = React.useMemo(() => {
    if (!searchTerm) return formattedJSON

    const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi')
    return formattedJSON.replace(
      regex,
      '<mark class="bg-yellow-300 text-black">$1</mark>'
    )
  }, [formattedJSON, searchTerm])

  // Count matches
  const matchCount = React.useMemo(() => {
    if (!searchTerm) return 0
    const regex = new RegExp(escapeRegex(searchTerm), 'gi')
    const matches = formattedJSON.match(regex)
    return matches ? matches.length : 0
  }, [formattedJSON, searchTerm])

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(session, null, 2))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Ignore copy errors
    }
  }

  // Download as file
  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(session, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `debug-session-${session.sessionId}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="shrink-0 p-3 border-b border-border space-y-2">
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative flex-1">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="text"
              placeholder="Search JSON..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-8 text-sm"
            />
          </div>

          {/* Toggle collapse */}
          <Button
            size="sm"
            variant={collapsed ? 'outline' : 'secondary'}
            onClick={() => setCollapsed(!collapsed)}
            className="h-8"
            title={collapsed ? 'Expand all' : 'Collapse'}
          >
            {collapsed ? <Expand size={14} /> : <Shrink size={14} />}
          </Button>

          {/* Copy */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopy}
            className="h-8"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check size={14} className="text-green-500" />
            ) : (
              <Copy size={14} />
            )}
          </Button>

          {/* Download */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            className="h-8"
            title="Download JSON"
          >
            <Download size={14} />
          </Button>
        </div>

        {/* Search results */}
        {searchTerm && (
          <div className="text-xs text-muted-foreground">
            {matchCount} match{matchCount !== 1 ? 'es' : ''} found
          </div>
        )}
      </div>

      {/* JSON Display */}
      <div className="flex-1 overflow-auto p-3">
        <pre
          className="text-xs font-mono text-muted-foreground whitespace-pre-wrap break-words"
          dangerouslySetInnerHTML={{ __html: highlightedJSON }}
        />
      </div>

      {/* Footer Info */}
      <div className="shrink-0 px-3 py-2 border-t border-border text-[10px] text-muted-foreground flex items-center justify-between">
        <span>
          {collapsed ? 'Collapsed view' : 'Full JSON'} |{' '}
          {(JSON.stringify(session).length / 1024).toFixed(1)} KB
        </span>
        <span>
          {session.events.length} events | {session.apiCalls.length} API calls |{' '}
          {session.errors.length} errors
        </span>
      </div>
    </div>
  )
}

// ============================================================================
// Helper Functions
// ============================================================================

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export default RawDataTab
