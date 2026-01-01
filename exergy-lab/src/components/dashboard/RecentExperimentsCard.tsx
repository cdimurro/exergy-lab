/**
 * RecentExperimentsCard Component
 *
 * Displays the 3 most recent experiments with domain and status.
 */

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { FlaskConical, ArrowRight, Beaker } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useExperimentsStore } from '@/lib/store/experiments-store'

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  } catch {
    return timestamp
  }
}

function formatDomain(domain: string): string {
  return domain
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function RecentExperimentsCard() {
  const router = useRouter()
  const { savedExperiments } = useExperimentsStore()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Get top 3 most recent
  const recentItems = savedExperiments.slice(0, 3)

  if (!mounted) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-accent-purple" />
            <h3 className="font-semibold text-foreground">Recent Experiments</h3>
          </div>
        </div>
        <div className="text-sm text-foreground-muted">Loading...</div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-accent-purple" />
          <h3 className="font-semibold text-foreground">Recent Experiments</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/experiments')}
          className="text-xs"
        >
          View All
          <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>

      {recentItems.length === 0 ? (
        <div className="text-center py-6">
          <Beaker className="w-10 h-10 text-foreground-subtle mx-auto mb-2" />
          <p className="text-sm text-foreground-muted mb-3">No experiments yet</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push('/experiments')}
          >
            Design Experiment
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {recentItems.map((exp) => {
            // Use literature alignment confidence as the primary score
            const validationScore = exp.validation?.literatureAlignment?.confidence
            return (
              <div
                key={exp.id}
                className="p-3 rounded-lg bg-background-surface hover:bg-background-elevated transition-colors cursor-pointer group"
                onClick={() => router.push(`/experiments?load=${exp.id}`)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {exp.name}
                  </p>
                  <span className="text-xs text-foreground-muted shrink-0">
                    {formatTimestamp(exp.savedAt)}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" size="sm" className="text-xs">
                    {formatDomain(exp.domain)}
                  </Badge>
                  {validationScore !== undefined && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        validationScore >= 80
                          ? 'bg-green-500/10 text-green-500'
                          : validationScore >= 60
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-red-500/10 text-red-500'
                      }`}
                    >
                      Score: {validationScore}%
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
