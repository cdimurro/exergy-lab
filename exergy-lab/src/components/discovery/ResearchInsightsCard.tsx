'use client'

/**
 * ResearchInsightsCard Component
 *
 * Comprehensive display of research findings, sources, gaps, and cross-domain insights.
 * Surfaces all research value regardless of downstream phase outcomes.
 *
 * Key features:
 * - Filterable key findings grid
 * - Source database with relevance/recency scores
 * - Technological gap cards with impact levels
 * - Cross-domain connection visualization
 * - State-of-the-art benchmarks
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  FileText,
  Lightbulb,
  AlertTriangle,
  Zap,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  BarChart2,
  Clock,
  Star,
  BookOpen,
  Target,
  TrendingUp,
  Database,
  Microscope,
  Award,
  Link2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// ============================================================================
// Types
// ============================================================================

export interface ResearchSource {
  id: string
  type: 'paper' | 'patent' | 'dataset' | 'materials' | 'other'
  title: string
  authors?: string[]
  source: string
  publishedDate?: string | Date
  doi?: string
  url?: string
  abstract?: string
  relevanceScore: number
  citationCount?: number
}

export interface KeyFinding {
  finding: string
  confidence: number
  category: 'performance' | 'cost' | 'efficiency' | 'safety' | 'environmental' | 'other'
  source: ResearchSource
  quantitativeValue?: {
    value: number
    unit: string
  }
}

export interface TechnologicalGap {
  description: string
  impact: 'high' | 'medium' | 'low'
  potentialSolutions: string[]
  relatedSources: ResearchSource[]
}

export interface CrossDomainInsight {
  domains: string[]
  insight: string
  noveltyScore?: number
  transferableTechniques: string[]
  supportingEvidence: string[]
}

export interface StateOfArt {
  metric: string
  bestValue: number
  unit: string
  source: string
  year: number
  context?: string
}

export interface ResearchInsightsData {
  sources: ResearchSource[]
  keyFindings: KeyFinding[]
  technologicalGaps: TechnologicalGap[]
  crossDomainInsights: CrossDomainInsight[]
  stateOfTheArt: StateOfArt[]
  materialsData?: any[]
  methodology?: {
    queriesUsed: string[]
    databasesSearched: string[]
    filteringCriteria: string
    timestamp: Date
  }
}

interface ResearchInsightsCardProps {
  /** Research data to display */
  data: ResearchInsightsData
  /** Show in expanded mode */
  expanded?: boolean
  /** Additional CSS classes */
  className?: string
}

// ============================================================================
// Main Component
// ============================================================================

export function ResearchInsightsCard({
  data,
  expanded = false,
  className,
}: ResearchInsightsCardProps) {
  const [activeTab, setActiveTab] = React.useState<'findings' | 'sources' | 'gaps' | 'domains' | 'sota'>('findings')
  const [isExpanded, setIsExpanded] = React.useState(expanded)
  const [searchQuery, setSearchQuery] = React.useState('')
  const [categoryFilter, setCategoryFilter] = React.useState<string | null>(null)

  // Stats summary
  const stats = React.useMemo(() => ({
    totalSources: data.sources.length,
    papers: data.sources.filter(s => s.type === 'paper').length,
    patents: data.sources.filter(s => s.type === 'patent').length,
    findings: data.keyFindings.length,
    gaps: data.technologicalGaps.length,
    crossDomain: data.crossDomainInsights.length,
    highImpactGaps: data.technologicalGaps.filter(g => g.impact === 'high').length,
  }), [data])

  return (
    <div className={cn(
      'rounded-xl border border-border bg-card overflow-hidden',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Research Insights</h3>
            <p className="text-xs text-muted-foreground">
              {stats.totalSources} sources | {stats.findings} findings | {stats.gaps} gaps
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" />
              Collapse
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" />
              Expand
            </>
          )}
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-px bg-border">
        <StatBox
          icon={FileText}
          label="Sources"
          value={stats.totalSources}
          sublabel={`${stats.papers} papers, ${stats.patents} patents`}
        />
        <StatBox
          icon={Lightbulb}
          label="Key Findings"
          value={stats.findings}
          sublabel="actionable insights"
        />
        <StatBox
          icon={AlertTriangle}
          label="Tech Gaps"
          value={stats.gaps}
          sublabel={`${stats.highImpactGaps} high-impact`}
        />
        <StatBox
          icon={Zap}
          label="Cross-Domain"
          value={stats.crossDomain}
          sublabel="connections"
        />
      </div>

      {isExpanded && (
        <>
          {/* Tab Navigation */}
          <div className="flex items-center gap-1 p-2 border-b border-border overflow-x-auto">
            {(['findings', 'sources', 'gaps', 'domains', 'sota'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                  activeTab === tab
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {tab === 'findings' && 'Key Findings'}
                {tab === 'sources' && 'Sources'}
                {tab === 'gaps' && 'Tech Gaps'}
                {tab === 'domains' && 'Cross-Domain'}
                {tab === 'sota' && 'State of Art'}
              </button>
            ))}
          </div>

          {/* Search and Filter */}
          <div className="flex items-center gap-2 p-3 border-b border-border">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search insights..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-1">
              <Filter className="w-3 h-3" />
              Filter
            </Button>
          </div>

          {/* Tab Content */}
          <div className="p-4 max-h-[500px] overflow-y-auto">
            {activeTab === 'findings' && (
              <KeyFindingsGrid
                findings={data.keyFindings}
                searchQuery={searchQuery}
              />
            )}
            {activeTab === 'sources' && (
              <SourcesTable
                sources={data.sources}
                searchQuery={searchQuery}
              />
            )}
            {activeTab === 'gaps' && (
              <TechGapsGrid
                gaps={data.technologicalGaps}
                searchQuery={searchQuery}
              />
            )}
            {activeTab === 'domains' && (
              <CrossDomainGrid
                insights={data.crossDomainInsights}
                searchQuery={searchQuery}
              />
            )}
            {activeTab === 'sota' && (
              <StateOfArtTable
                benchmarks={data.stateOfTheArt}
                searchQuery={searchQuery}
              />
            )}
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================================
// Stat Box Component
// ============================================================================

interface StatBoxProps {
  icon: React.ElementType
  label: string
  value: number
  sublabel: string
}

function StatBox({ icon: Icon, label, value, sublabel }: StatBoxProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-card">
      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-foreground">{value}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      </div>
    </div>
  )
}

// ============================================================================
// Key Findings Grid
// ============================================================================

interface KeyFindingsGridProps {
  findings: KeyFinding[]
  searchQuery: string
}

function KeyFindingsGrid({ findings, searchQuery }: KeyFindingsGridProps) {
  const filtered = React.useMemo(() => {
    if (!searchQuery) return findings
    const query = searchQuery.toLowerCase()
    return findings.filter(f =>
      f.finding.toLowerCase().includes(query) ||
      f.category.toLowerCase().includes(query)
    )
  }, [findings, searchQuery])

  const categoryColors: Record<string, string> = {
    performance: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    cost: 'bg-green-500/10 text-green-600 border-green-500/20',
    efficiency: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    safety: 'bg-red-500/10 text-red-600 border-red-500/20',
    environmental: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    other: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No findings match your search
      </div>
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {filtered.map((finding, i) => (
        <div
          key={i}
          className={cn(
            'p-3 rounded-lg border',
            categoryColors[finding.category] || categoryColors.other
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-medium uppercase px-1.5 py-0.5 rounded bg-current/10">
              {finding.category}
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.round(finding.confidence * 100)}% conf
            </span>
          </div>
          <p className="mt-2 text-sm text-foreground leading-relaxed">
            {finding.finding}
          </p>
          {finding.quantitativeValue && (
            <div className="mt-2 flex items-center gap-1 text-sm font-medium">
              <BarChart2 className="w-3 h-3" />
              {finding.quantitativeValue.value} {finding.quantitativeValue.unit}
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground truncate">
            Source: {finding.source.title}
          </p>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Sources Table
// ============================================================================

interface SourcesTableProps {
  sources: ResearchSource[]
  searchQuery: string
}

function SourcesTable({ sources, searchQuery }: SourcesTableProps) {
  const filtered = React.useMemo(() => {
    if (!searchQuery) return sources
    const query = searchQuery.toLowerCase()
    return sources.filter(s =>
      s.title.toLowerCase().includes(query) ||
      s.authors?.some(a => a.toLowerCase().includes(query)) ||
      s.source.toLowerCase().includes(query)
    )
  }, [sources, searchQuery])

  const typeIcons: Record<string, React.ElementType> = {
    paper: FileText,
    patent: Award,
    dataset: Database,
    materials: Microscope,
    other: FileText,
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No sources match your search
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {filtered.map((source, i) => {
        const Icon = typeIcons[source.type] || FileText
        const year = source.publishedDate
          ? new Date(source.publishedDate).getFullYear()
          : null

        return (
          <div
            key={source.id || i}
            className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
          >
            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm text-foreground line-clamp-2">
                {source.title}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {source.authors?.slice(0, 3).join(', ')}
                {source.authors && source.authors.length > 3 && ' et al.'}
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <span>{source.source}</span>
                {year && <span>{year}</span>}
                {source.citationCount !== undefined && (
                  <span>{source.citationCount} citations</span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1 text-xs">
                <Star className="w-3 h-3 text-amber-500" />
                <span className="font-medium">{Math.round(source.relevanceScore * 100)}%</span>
              </div>
              {source.url && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// Tech Gaps Grid
// ============================================================================

interface TechGapsGridProps {
  gaps: TechnologicalGap[]
  searchQuery: string
}

function TechGapsGrid({ gaps, searchQuery }: TechGapsGridProps) {
  const filtered = React.useMemo(() => {
    if (!searchQuery) return gaps
    const query = searchQuery.toLowerCase()
    return gaps.filter(g =>
      g.description.toLowerCase().includes(query) ||
      g.potentialSolutions.some(s => s.toLowerCase().includes(query))
    )
  }, [gaps, searchQuery])

  const impactColors = {
    high: 'bg-red-500/10 border-red-500/20 text-red-600',
    medium: 'bg-amber-500/10 border-amber-500/20 text-amber-600',
    low: 'bg-slate-500/10 border-slate-500/20 text-slate-600',
  }

  if (filtered.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No gaps match your search
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {filtered.map((gap, i) => (
        <div
          key={i}
          className={cn(
            'p-4 rounded-lg border',
            impactColors[gap.impact]
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="text-xs font-medium uppercase">
                {gap.impact} Impact Gap
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {gap.relatedSources.length} related sources
            </span>
          </div>
          <p className="mt-2 text-sm text-foreground">
            {gap.description}
          </p>
          {gap.potentialSolutions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-current/10">
              <p className="text-xs font-medium mb-1.5">Potential Solutions:</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {gap.potentialSolutions.slice(0, 3).map((solution, j) => (
                  <li key={j} className="flex items-start gap-1.5">
                    <Target className="w-3 h-3 mt-0.5 shrink-0" />
                    {solution}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Cross-Domain Grid
// ============================================================================

interface CrossDomainGridProps {
  insights: CrossDomainInsight[]
  searchQuery: string
}

function CrossDomainGrid({ insights, searchQuery }: CrossDomainGridProps) {
  const filtered = React.useMemo(() => {
    if (!searchQuery) return insights
    const query = searchQuery.toLowerCase()
    return insights.filter(i =>
      i.insight.toLowerCase().includes(query) ||
      i.domains.some(d => d.toLowerCase().includes(query))
    )
  }, [insights, searchQuery])

  if (filtered.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No cross-domain insights match your search
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {filtered.map((insight, i) => (
        <div
          key={i}
          className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5"
        >
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-emerald-600" />
            <div className="flex items-center gap-1">
              {insight.domains.map((domain, j) => (
                <React.Fragment key={domain}>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                    {domain}
                  </span>
                  {j < insight.domains.length - 1 && (
                    <Link2 className="w-3 h-3 text-emerald-500" />
                  )}
                </React.Fragment>
              ))}
            </div>
            {insight.noveltyScore !== undefined && (
              <span className="ml-auto text-xs text-muted-foreground">
                Novelty: {Math.round(insight.noveltyScore)}%
              </span>
            )}
          </div>
          <p className="text-sm text-foreground">
            {insight.insight}
          </p>
          {insight.transferableTechniques.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {insight.transferableTechniques.map((tech, j) => (
                <span
                  key={j}
                  className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                >
                  {tech}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// State of Art Table
// ============================================================================

interface StateOfArtTableProps {
  benchmarks: StateOfArt[]
  searchQuery: string
}

function StateOfArtTable({ benchmarks, searchQuery }: StateOfArtTableProps) {
  const filtered = React.useMemo(() => {
    if (!searchQuery) return benchmarks
    const query = searchQuery.toLowerCase()
    return benchmarks.filter(b =>
      b.metric.toLowerCase().includes(query) ||
      b.source.toLowerCase().includes(query)
    )
  }, [benchmarks, searchQuery])

  if (filtered.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No benchmarks match your search
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Metric</th>
            <th className="text-right py-2 px-3 font-medium text-muted-foreground">Best Value</th>
            <th className="text-left py-2 px-3 font-medium text-muted-foreground">Source</th>
            <th className="text-center py-2 px-3 font-medium text-muted-foreground">Year</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((benchmark, i) => (
            <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
              <td className="py-2.5 px-3 font-medium text-foreground">
                {benchmark.metric}
              </td>
              <td className="py-2.5 px-3 text-right">
                <span className="font-mono font-medium text-foreground">
                  {benchmark.bestValue}
                </span>
                <span className="text-muted-foreground ml-1">
                  {benchmark.unit}
                </span>
              </td>
              <td className="py-2.5 px-3 text-muted-foreground">
                {benchmark.source}
              </td>
              <td className="py-2.5 px-3 text-center text-muted-foreground">
                {benchmark.year}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================================
// Compact Summary Component
// ============================================================================

interface ResearchInsightsSummaryProps {
  data: ResearchInsightsData
  className?: string
}

export function ResearchInsightsSummary({ data, className }: ResearchInsightsSummaryProps) {
  const topFindings = data.keyFindings.slice(0, 3)
  const topGaps = data.technologicalGaps.filter(g => g.impact === 'high').slice(0, 2)

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileText className="w-4 h-4" />
        <span>{data.sources.length} sources analyzed</span>
        <span className="text-border">|</span>
        <Lightbulb className="w-4 h-4" />
        <span>{data.keyFindings.length} key findings</span>
      </div>

      {topFindings.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Top Findings:</p>
          {topFindings.map((f, i) => (
            <p key={i} className="text-sm text-foreground line-clamp-1">
              {f.finding}
            </p>
          ))}
        </div>
      )}

      {topGaps.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">High-Impact Gaps:</p>
          {topGaps.map((g, i) => (
            <p key={i} className="text-sm text-amber-600 line-clamp-1">
              {g.description}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

export default ResearchInsightsCard
