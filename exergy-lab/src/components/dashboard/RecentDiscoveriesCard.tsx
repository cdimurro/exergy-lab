/**
 * RecentDiscoveriesCard Component
 *
 * Displays the 3 most recent discoveries with novelty/feasibility/impact scores.
 */

'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Cpu, ArrowRight, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useDiscoveriesStore } from '@/lib/store/discoveries-store'

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

function ScoreBadge({ label, score }: { label: string; score: number }) {
  const getColorClass = (score: number) => {
    if (score >= 80) return 'bg-green-500/10 text-green-500'
    if (score >= 60) return 'bg-amber-500/10 text-amber-500'
    return 'bg-slate-500/10 text-slate-400'
  }

  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${getColorClass(score)}`}>
      {label}: {score}
    </span>
  )
}

export function RecentDiscoveriesCard() {
  const router = useRouter()
  const { savedDiscoveries } = useDiscoveriesStore()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Get top 3 most recent
  const recentItems = savedDiscoveries.slice(0, 3)

  if (!mounted) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-foreground-muted" />
            <h3 className="font-semibold text-foreground">Recent Discoveries</h3>
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
          <Cpu className="w-5 h-5 text-foreground-muted" />
          <h3 className="font-semibold text-foreground">Recent Discoveries</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/discovery')}
          className="text-xs"
        >
          View All
          <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>

      {recentItems.length === 0 ? (
        <div className="text-center py-6">
          <Sparkles className="w-10 h-10 text-foreground-subtle mx-auto mb-2" />
          <p className="text-sm text-foreground-muted mb-3">No discoveries yet</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => router.push('/discovery')}
          >
            Start Discovering
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {recentItems.map((discovery) => {
            const topIdea = discovery.report.ideas[0]
            return (
              <div
                key={discovery.id}
                className="p-3 rounded-lg bg-background-surface hover:bg-background-elevated transition-colors cursor-pointer group"
                onClick={() => router.push(`/discovery?load=${discovery.id}`)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {topIdea?.title || discovery.report.prompt.description}
                  </p>
                  <span className="text-xs text-foreground-muted shrink-0">
                    {formatTimestamp(discovery.savedAt)}
                  </span>
                </div>

                {topIdea && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <ScoreBadge label="N" score={topIdea.noveltyScore} />
                    <ScoreBadge label="F" score={topIdea.feasibilityScore} />
                    <ScoreBadge label="I" score={topIdea.impactScore} />
                  </div>
                )}

                {discovery.tags && discovery.tags.length > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    {discovery.tags.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="secondary" size="sm" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
