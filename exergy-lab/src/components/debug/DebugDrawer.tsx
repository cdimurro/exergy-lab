'use client'

/**
 * DebugDrawer Component
 *
 * Slide-out panel containing the debug viewer tabs and controls.
 */

import * as React from 'react'
import {
  X,
  Copy,
  Check,
  Download,
  Trash2,
  Activity,
  AlertCircle,
  Radio,
  Clock,
  Layers,
  Code2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SSEEventsTab } from './tabs/SSEEventsTab'
import { PhaseActivityTab } from './tabs/PhaseActivityTab'
import { ErrorsTab } from './tabs/ErrorsTab'
import { APICallsTab } from './tabs/APICallsTab'
import { RawDataTab } from './tabs/RawDataTab'
import type { DebugSession, DebugStats, DebugTabId, ExportOptions } from '@/types/debug'

// ============================================================================
// Props
// ============================================================================

interface DebugDrawerProps {
  isOpen: boolean
  onClose: () => void
  session: DebugSession | null
  stats: DebugStats
  onClear: () => void
  onExport: (options?: Partial<ExportOptions>) => string
  onCopyToClipboard: () => Promise<void>
  copied: boolean
}

// ============================================================================
// Tab Configuration
// ============================================================================

const TABS: { id: DebugTabId; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'events', label: 'SSE Events', icon: Radio },
  { id: 'phases', label: 'Phases', icon: Layers },
  { id: 'errors', label: 'Errors', icon: AlertCircle },
  { id: 'api', label: 'API Calls', icon: Activity },
  { id: 'raw', label: 'Raw Data', icon: Code2 },
]

// ============================================================================
// Main Component
// ============================================================================

export function DebugDrawer({
  isOpen,
  onClose,
  session,
  stats,
  onClear,
  onExport,
  onCopyToClipboard,
  copied,
}: DebugDrawerProps) {
  const [activeTab, setActiveTab] = React.useState<DebugTabId>('events')

  // Format elapsed time
  const formatElapsed = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    }
    return `${seconds}s`
  }

  // Handle download
  const handleDownload = () => {
    const content = onExport({ format: 'json', includeRawData: true })
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `debug-session-${session?.sessionId || 'unknown'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 right-0 h-full w-full max-w-3xl bg-background border-l border-border shadow-xl z-50',
          'transform transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Activity size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Debug Viewer</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {session ? (
                  <>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {formatElapsed(stats.elapsedTime)}
                    </span>
                    <span>|</span>
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-medium',
                        session.status === 'running'
                          ? 'bg-blue-500/10 text-blue-600'
                          : session.status === 'completed'
                            ? 'bg-green-500/10 text-green-600'
                            : session.status === 'failed'
                              ? 'bg-red-500/10 text-red-600'
                              : 'bg-gray-500/10 text-gray-600'
                      )}
                    >
                      {session.status}
                    </span>
                  </>
                ) : (
                  <span>No active session</span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onCopyToClipboard()}
              disabled={!session}
              title="Copy to clipboard"
            >
              {copied ? (
                <Check size={14} className="text-green-500" />
              ) : (
                <Copy size={14} />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDownload}
              disabled={!session}
              title="Download JSON"
            >
              <Download size={14} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onClear}
              disabled={!session}
              title="Clear session"
            >
              <Trash2 size={14} />
            </Button>
            <Button size="sm" variant="ghost" onClick={onClose}>
              <X size={14} />
            </Button>
          </div>
        </div>

        {/* Stats Bar */}
        {session && (
          <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-muted/20 text-xs">
            <StatBadge label="Events" value={stats.totalEvents} />
            <StatBadge
              label="Errors"
              value={stats.totalErrors}
              variant={stats.totalErrors > 0 ? 'error' : 'default'}
            />
            <StatBadge label="API Calls" value={stats.totalApiCalls} />
            <StatBadge
              label="Avg API"
              value={`${Math.round(stats.averageApiDuration)}ms`}
            />
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-border">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const count =
              tab.id === 'events'
                ? stats.totalEvents
                : tab.id === 'errors'
                  ? stats.totalErrors
                  : tab.id === 'api'
                    ? stats.totalApiCalls
                    : undefined

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors',
                  'border-b-2 -mb-px',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon size={12} />
                <span>{tab.label}</span>
                {count !== undefined && count > 0 && (
                  <Badge
                    variant={tab.id === 'errors' && count > 0 ? 'error' : 'secondary'}
                    className="h-4 min-w-[16px] px-1 text-[10px]"
                  >
                    {count > 99 ? '99+' : count}
                  </Badge>
                )}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden h-[calc(100vh-180px)]">
          {!session ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Activity size={48} className="mb-4 opacity-20" />
              <p className="text-sm">No active debug session</p>
              <p className="text-xs mt-1">Start a discovery to capture events</p>
            </div>
          ) : (
            <>
              {activeTab === 'events' && <SSEEventsTab events={session.events} />}
              {activeTab === 'phases' && <PhaseActivityTab events={session.events} />}
              {activeTab === 'errors' && <ErrorsTab errors={session.errors} />}
              {activeTab === 'api' && <APICallsTab apiCalls={session.apiCalls} />}
              {activeTab === 'raw' && <RawDataTab session={session} />}
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ============================================================================
// Stat Badge
// ============================================================================

function StatBadge({
  label,
  value,
  variant = 'default',
}: {
  label: string
  value: number | string
  variant?: 'default' | 'error'
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-muted-foreground">{label}:</span>
      <Badge
        variant={variant === 'error' ? 'error' : 'secondary'}
        className="h-5 text-[10px]"
      >
        {value}
      </Badge>
    </div>
  )
}

export default DebugDrawer
