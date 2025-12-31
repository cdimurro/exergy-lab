'use client'

import * as React from 'react'
import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Building2, Globe, Calendar, BarChart3 } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface YearlyTrend {
  year: number
  count: number
  growthRate?: number
}

export interface TopInstitution {
  name: string
  country?: string
  paperCount: number
  citationCount: number
}

export interface TopAuthor {
  name: string
  affiliation?: string
  paperCount: number
  hIndex?: number
}

export interface ResearchTrendData {
  topic: string
  totalPapers: number
  yearlyTrends: YearlyTrend[]
  topInstitutions: TopInstitution[]
  topAuthors: TopAuthor[]
  relatedTopics?: string[]
  citationMomentum?: 'rising' | 'stable' | 'declining'
  avgCitationsPerPaper?: number
}

interface TrendAnalyticsPanelProps {
  data: ResearchTrendData | null
  isLoading?: boolean
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function TrendAnalyticsPanel({
  data,
  isLoading = false,
  className = '',
}: TrendAnalyticsPanelProps) {
  // Calculate trend statistics
  const trendStats = useMemo(() => {
    if (!data || data.yearlyTrends.length === 0) return null

    const trends = data.yearlyTrends.sort((a, b) => a.year - b.year)
    const firstYear = trends[0]
    const lastYear = trends[trends.length - 1]
    const peakYear = trends.reduce((max, t) => (t.count > max.count ? t : max), trends[0])

    // Calculate compound annual growth rate (CAGR)
    const years = lastYear.year - firstYear.year
    const cagr =
      years > 0 ? Math.pow(lastYear.count / Math.max(1, firstYear.count), 1 / years) - 1 : 0

    // Recent trend (last 3 years vs previous 3 years)
    const recent = trends.slice(-3)
    const previous = trends.slice(-6, -3)
    const recentAvg = recent.reduce((sum, t) => sum + t.count, 0) / Math.max(1, recent.length)
    const previousAvg =
      previous.reduce((sum, t) => sum + t.count, 0) / Math.max(1, previous.length)
    const recentGrowth = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0

    return {
      totalPapers: trends.reduce((sum, t) => sum + t.count, 0),
      firstYear: firstYear.year,
      lastYear: lastYear.year,
      peakYear: peakYear.year,
      peakCount: peakYear.count,
      cagr: cagr * 100,
      recentGrowth,
      isGrowing: recentGrowth > 10,
      isDeclining: recentGrowth < -10,
    }
  }, [data])

  // Find max count for chart scaling
  const maxCount = useMemo(() => {
    if (!data) return 100
    return Math.max(...data.yearlyTrends.map((t) => t.count), 1)
  }, [data])

  if (isLoading) {
    return (
      <div className={`bg-zinc-800 rounded-lg p-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-zinc-700 rounded w-1/3" />
          <div className="h-32 bg-zinc-700 rounded" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-20 bg-zinc-700 rounded" />
            <div className="h-20 bg-zinc-700 rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className={`bg-zinc-800 rounded-lg p-6 text-center ${className}`}>
        <BarChart3 className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <p className="text-sm text-zinc-400">Search to see research trends</p>
      </div>
    )
  }

  return (
    <div className={`bg-zinc-800 rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-medium text-white">Research Trends</h3>
          </div>
          {data.citationMomentum && (
            <span
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                data.citationMomentum === 'rising'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : data.citationMomentum === 'declining'
                    ? 'bg-red-500/10 text-red-400'
                    : 'bg-zinc-700 text-zinc-400'
              }`}
            >
              {data.citationMomentum === 'rising' ? (
                <TrendingUp className="w-3 h-3" />
              ) : data.citationMomentum === 'declining' ? (
                <TrendingDown className="w-3 h-3" />
              ) : null}
              {data.citationMomentum}
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          {data.topic} • {data.totalPapers.toLocaleString()} papers
        </p>
      </div>

      <div className="p-4 space-y-6">
        {/* Publication Trend Chart */}
        <div>
          <h4 className="text-xs font-medium text-zinc-400 uppercase mb-3 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Publications Over Time
          </h4>

          {/* Simple bar chart using divs */}
          <div className="h-32 flex items-end gap-1">
            {data.yearlyTrends.map((trend, idx) => {
              const height = (trend.count / maxCount) * 100
              const isRecent = idx >= data.yearlyTrends.length - 3

              return (
                <div key={trend.year} className="flex-1 flex flex-col items-center group">
                  <div
                    className={`w-full rounded-t transition-all ${
                      isRecent ? 'bg-emerald-500' : 'bg-zinc-600'
                    } group-hover:bg-emerald-400`}
                    style={{ height: `${Math.max(2, height)}%` }}
                    title={`${trend.year}: ${trend.count} papers`}
                  />
                </div>
              )
            })}
          </div>

          {/* Year labels */}
          <div className="flex justify-between mt-2 text-xs text-zinc-500">
            {data.yearlyTrends.length > 0 && (
              <>
                <span>{data.yearlyTrends[0].year}</span>
                <span>{data.yearlyTrends[data.yearlyTrends.length - 1].year}</span>
              </>
            )}
          </div>
        </div>

        {/* Statistics Grid */}
        {trendStats && (
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-zinc-900 rounded-lg">
              <div className="text-xs text-zinc-400 mb-1">Growth Rate (CAGR)</div>
              <div
                className={`text-xl font-bold ${
                  trendStats.cagr > 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {trendStats.cagr > 0 ? '+' : ''}
                {trendStats.cagr.toFixed(1)}%
              </div>
            </div>

            <div className="p-3 bg-zinc-900 rounded-lg">
              <div className="text-xs text-zinc-400 mb-1">Recent Trend (3yr)</div>
              <div
                className={`text-xl font-bold flex items-center gap-1 ${
                  trendStats.recentGrowth > 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {trendStats.recentGrowth > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {trendStats.recentGrowth.toFixed(0)}%
              </div>
            </div>

            <div className="p-3 bg-zinc-900 rounded-lg">
              <div className="text-xs text-zinc-400 mb-1">Peak Year</div>
              <div className="text-lg font-bold text-white">{trendStats.peakYear}</div>
              <div className="text-xs text-zinc-500">
                {trendStats.peakCount.toLocaleString()} papers
              </div>
            </div>

            <div className="p-3 bg-zinc-900 rounded-lg">
              <div className="text-xs text-zinc-400 mb-1">Avg Citations</div>
              <div className="text-lg font-bold text-white">
                {data.avgCitationsPerPaper?.toFixed(1) ?? 'N/A'}
              </div>
              <div className="text-xs text-zinc-500">per paper</div>
            </div>
          </div>
        )}

        {/* Top Institutions */}
        {data.topInstitutions.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-zinc-400 uppercase mb-3 flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              Top Institutions
            </h4>
            <div className="space-y-2">
              {data.topInstitutions.slice(0, 5).map((inst, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-zinc-900 rounded"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-zinc-700 text-xs text-zinc-400
                                   flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-sm text-zinc-300">{inst.name}</div>
                      {inst.country && (
                        <div className="text-xs text-zinc-500">{inst.country}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-white">{inst.paperCount}</div>
                    <div className="text-xs text-zinc-500">papers</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Authors */}
        {data.topAuthors.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-zinc-400 uppercase mb-3 flex items-center gap-1">
              <Globe className="w-3 h-3" />
              Top Authors
            </h4>
            <div className="flex flex-wrap gap-2">
              {data.topAuthors.slice(0, 8).map((author, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-zinc-900 text-zinc-300 text-sm rounded
                           hover:bg-zinc-700 cursor-pointer transition-colors"
                  title={`${author.paperCount} papers${author.hIndex ? `, h-index: ${author.hIndex}` : ''}`}
                >
                  {author.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Related Topics */}
        {data.relatedTopics && data.relatedTopics.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-zinc-400 uppercase mb-3">
              Related Topics
            </h4>
            <div className="flex flex-wrap gap-2">
              {data.relatedTopics.map((topic, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded
                           hover:bg-blue-500/20 cursor-pointer transition-colors"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
