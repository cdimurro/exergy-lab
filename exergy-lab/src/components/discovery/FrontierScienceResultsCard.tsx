'use client'

/**
 * FrontierScienceResultsCard Component
 *
 * Displays the final discovery results with AI-generated written reports,
 * key findings, and actionable recommendations. Focuses on researcher-valuable
 * insights rather than raw rubric scores.
 */

import { cn } from '@/lib/utils'
import type { DiscoveryResult, DiscoveryPhase, PhaseResult } from '@/types/frontierscience'
import { getPhaseMetadata } from '@/types/frontierscience'
import { QualityBadge } from './QualityBadge'
import {
  Check,
  Clock,
  Download,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  BookOpen,
  Beaker,
  TrendingUp,
  FileText,
  Sparkles,
  Target,
  FlaskConical,
  Zap,
  BarChart3,
  Loader2,
  AlertCircle,
  ArrowRight,
  Cpu,
} from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'

/**
 * MarkdownContent component with improved styling for report sections
 * Provides proper spacing, typography, and readability for markdown content
 */
function MarkdownContent({ children }: { children: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none
      prose-headings:font-semibold prose-headings:text-foreground
      prose-h2:text-base prose-h2:mt-6 prose-h2:mb-3 prose-h2:pb-2 prose-h2:border-b prose-h2:border-border/50
      prose-h3:text-sm prose-h3:mt-4 prose-h3:mb-2 prose-h3:text-foreground/90
      prose-p:text-sm prose-p:leading-relaxed prose-p:text-foreground/80 prose-p:mb-3
      prose-strong:text-foreground prose-strong:font-semibold
      prose-ul:my-2 prose-ul:text-sm prose-li:text-foreground/80 prose-li:my-1
      prose-ol:my-2 prose-ol:text-sm
      prose-table:text-sm prose-th:text-left prose-th:font-semibold prose-th:pb-2
      prose-td:py-2 prose-td:align-top
      prose-code:text-xs prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
      prose-pre:bg-muted prose-pre:text-xs prose-pre:p-4 prose-pre:rounded-lg prose-pre:overflow-x-auto
      [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
    >
      <ReactMarkdown>{children}</ReactMarkdown>
    </div>
  )
}

interface FrontierScienceResultsCardProps {
  result: DiscoveryResult
  onExport?: () => void
  className?: string
}

interface GeneratedReport {
  title: string
  executiveSummary: string
  sections: { title: string; content: string }[]
  conclusions: string
  nextSteps: string[]
  generatedAt: string
  metadata: {
    discoveryId: string
    query: string
    overallScore: number
    totalDuration: number
    phasesCompleted: number
  }
}

export function FrontierScienceResultsCard({
  result,
  onExport,
  className,
}: FrontierScienceResultsCardProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['executive-summary']))
  const [report, setReport] = useState<GeneratedReport | null>(null)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

  // Calculate summary stats
  const passedPhases = result.phases.filter(p => p.passed).length
  const totalPhases = result.phases.length

  // Format duration
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  // Generate the AI report on mount
  const generateReport = useCallback(async () => {
    if (isGeneratingReport || report) return

    setIsGeneratingReport(true)
    setReportError(null)

    try {
      const response = await fetch('/api/discovery/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discoveryId: result.id || 'unknown',
          query: result.query,
          domain: result.domain,
          overallScore: result.overallScore,
          discoveryQuality: result.discoveryQuality,
          phases: result.phases.map(p => ({
            phase: p.phase,
            finalOutput: p.finalOutput,
            finalScore: p.finalScore,
            passed: p.passed,
            iterations: p.iterations,
            durationMs: p.durationMs,
          })),
          recommendations: result.recommendations,
          totalDuration: result.totalDurationMs,
          reportStyle: 'comprehensive',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate report')
      }

      const reportData: GeneratedReport = await response.json()
      setReport(reportData)
    } catch (error) {
      console.error('Error generating report:', error)
      setReportError('Unable to generate detailed report. Showing summary view.')
    } finally {
      setIsGeneratingReport(false)
    }
  }, [result, report, isGeneratingReport])

  useEffect(() => {
    generateReport()
  }, [generateReport])

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const expandAll = () => {
    const allSections = new Set(['executive-summary', 'conclusions', 'next-steps'])
    if (report?.sections) {
      report.sections.forEach((_, i) => allSections.add(`section-${i}`))
    }
    result.phases.forEach(p => allSections.add(`phase-${p.phase}`))
    setExpandedSections(allSections)
  }

  const collapseAll = () => {
    setExpandedSections(new Set())
  }

  // Phase icons
  const getPhaseIcon = (phase: DiscoveryPhase) => {
    const icons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
      research: BookOpen,
      hypothesis: Lightbulb,
      validation: FlaskConical,
      output: FileText,
    }
    return icons[phase] || FileText
  }

  return (
    <div className={cn('border rounded-xl overflow-hidden bg-card flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-6 border-b bg-gradient-to-r from-emerald-500/5 to-teal-500/5">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
              <Sparkles size={24} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-1">
                Discovery Complete
              </h2>
              <p className="text-sm text-muted-foreground max-w-xl">
                {result.query}
              </p>
            </div>
          </div>
          {onExport && (
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors text-sm font-medium"
            >
              <Download size={16} />
              Export Report
            </button>
          )}
        </div>

        {/* Quality and Stats Row */}
        <div className="flex flex-wrap items-center gap-6">
          {/* Quality Badge with colored background */}
          <div className="flex items-center gap-3">
            <QualityBadge
              quality={result.discoveryQuality}
              showDescription={false}
              size="lg"
            />
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {result.overallScore.toFixed(1)}
                <span className="text-lg text-muted-foreground font-normal">/10</span>
              </div>
              <div className="text-xs text-muted-foreground">Overall Score</div>
            </div>
          </div>

          <div className="h-8 w-px bg-border hidden sm:block" />

          {/* Stats */}
          <div className="flex items-center gap-6">
            <StatItem
              icon={Clock}
              label="Duration"
              value={formatDuration(result.totalDurationMs)}
            />
            <StatItem
              icon={Check}
              label="Phases Passed"
              value={`${passedPhases}/${totalPhases}`}
              highlight={passedPhases === totalPhases}
            />
            <StatItem
              icon={Cpu}
              label="Domain"
              value={result.domain.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        {/* Report Loading State */}
        {isGeneratingReport && (
          <div className="p-8 flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Generating Research Report
            </h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Our AI is synthesizing your discovery results into a comprehensive research report with detailed findings and recommendations...
            </p>
          </div>
        )}

        {/* Report Error State */}
        {reportError && !isGeneratingReport && (
          <div className="p-4 mx-6 mt-6 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-foreground font-medium">Report Generation Notice</p>
                <p className="text-sm text-muted-foreground mt-1">{reportError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Generated Report Content */}
        {report && !isGeneratingReport && (
          <div className="p-6 space-y-6">
            {/* Section Controls */}
            <div className="flex items-center justify-end gap-2 text-sm">
              <button
                onClick={expandAll}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Expand All
              </button>
              <span className="text-muted-foreground">/</span>
              <button
                onClick={collapseAll}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Collapse All
              </button>
            </div>

            {/* Executive Summary */}
            <ReportSection
              id="executive-summary"
              title="Executive Summary"
              icon={FileText}
              accentColor="emerald"
              isExpanded={expandedSections.has('executive-summary')}
              onToggle={() => toggleSection('executive-summary')}
            >
              <MarkdownContent>{report.executiveSummary}</MarkdownContent>
            </ReportSection>

            {/* Main Report Sections */}
            {report.sections.map((section, index) => {
              const sectionId = `section-${index}`
              const sectionIcon = getSectionIcon(section.title)
              const sectionColor = getSectionColor(section.title)

              return (
                <ReportSection
                  key={sectionId}
                  id={sectionId}
                  title={section.title}
                  icon={sectionIcon}
                  accentColor={sectionColor}
                  isExpanded={expandedSections.has(sectionId)}
                  onToggle={() => toggleSection(sectionId)}
                >
                  <MarkdownContent>{section.content}</MarkdownContent>
                </ReportSection>
              )
            })}

            {/* Conclusions */}
            <ReportSection
              id="conclusions"
              title="Conclusions"
              icon={Target}
              accentColor="blue"
              isExpanded={expandedSections.has('conclusions')}
              onToggle={() => toggleSection('conclusions')}
            >
              <MarkdownContent>{report.conclusions}</MarkdownContent>
            </ReportSection>

            {/* Next Steps / Recommendations */}
            {report.nextSteps.length > 0 && (
              <ReportSection
                id="next-steps"
                title="Recommended Next Steps"
                icon={ArrowRight}
                accentColor="teal"
                isExpanded={expandedSections.has('next-steps')}
                onToggle={() => toggleSection('next-steps')}
              >
                <div className="space-y-3">
                  {report.nextSteps.map((step, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 rounded-lg bg-teal-500/5 border border-teal-500/10"
                    >
                      <div className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center shrink-0 text-teal-600 text-sm font-medium">
                        {index + 1}
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </ReportSection>
            )}

            {/* Phase Details - Collapsible summary */}
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
                Phase Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.phases.map(phase => {
                  const meta = getPhaseMetadata(phase.phase)
                  const PhaseIcon = getPhaseIcon(phase.phase)

                  return (
                    <PhaseCard
                      key={phase.phase}
                      phase={phase}
                      meta={meta}
                      icon={PhaseIcon}
                      isExpanded={expandedSections.has(`phase-${phase.phase}`)}
                      onToggle={() => toggleSection(`phase-${phase.phase}`)}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Fallback Summary View (when report generation fails or is loading) */}
        {!report && !isGeneratingReport && (
          <div className="p-6 space-y-6">
            {/* Recommendations */}
            {result.recommendations.length > 0 && (
              <div className="rounded-xl border bg-gradient-to-r from-emerald-500/5 to-transparent p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Lightbulb size={18} className="text-emerald-600" />
                  </div>
                  <span className="text-base font-semibold text-foreground">
                    Key Recommendations
                  </span>
                </div>
                <ul className="space-y-3">
                  {result.recommendations.map((rec, index) => (
                    <li
                      key={index}
                      className="flex items-start gap-3 text-sm"
                    >
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 text-xs font-medium shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <span className="text-foreground">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Phase Summary Cards */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
                Phase Results Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.phases.map(phase => {
                  const meta = getPhaseMetadata(phase.phase)
                  const PhaseIcon = getPhaseIcon(phase.phase)

                  return (
                    <PhaseCard
                      key={phase.phase}
                      phase={phase}
                      meta={meta}
                      icon={PhaseIcon}
                      isExpanded={expandedSections.has(`phase-${phase.phase}`)}
                      onToggle={() => toggleSection(`phase-${phase.phase}`)}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Stat item display
 */
function StatItem({
  icon: Icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={16} className={cn(
        highlight ? 'text-emerald-600' : 'text-muted-foreground'
      )} />
      <div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div
          className={cn(
            'text-sm font-medium',
            highlight ? 'text-emerald-600' : 'text-foreground'
          )}
        >
          {value}
        </div>
      </div>
    </div>
  )
}

/**
 * Collapsible report section
 */
interface ReportSectionProps {
  id: string
  title: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  accentColor: 'emerald' | 'blue' | 'teal' | 'purple' | 'amber'
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}

const accentColorClasses = {
  emerald: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
    icon: 'text-emerald-600',
    gradient: 'from-emerald-500/5',
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    icon: 'text-blue-600',
    gradient: 'from-blue-500/5',
  },
  teal: {
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/20',
    icon: 'text-teal-600',
    gradient: 'from-teal-500/5',
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    icon: 'text-purple-600',
    gradient: 'from-purple-500/5',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: 'text-amber-600',
    gradient: 'from-amber-500/5',
  },
}

function ReportSection({
  id,
  title,
  icon: Icon,
  accentColor,
  isExpanded,
  onToggle,
  children,
}: ReportSectionProps) {
  const colors = accentColorClasses[accentColor]

  return (
    <div
      className={cn(
        'rounded-xl border overflow-hidden transition-all duration-200',
        isExpanded ? colors.border : 'border-border'
      )}
    >
      <button
        onClick={onToggle}
        className={cn(
          'w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left',
          isExpanded && `bg-gradient-to-r ${colors.gradient} to-transparent`
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', colors.bg)}>
            <Icon size={18} className={colors.icon} />
          </div>
          <span className="text-base font-semibold text-foreground">{title}</span>
        </div>
        {isExpanded ? (
          <ChevronDown size={18} className="text-muted-foreground" />
        ) : (
          <ChevronRight size={18} className="text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 pt-2">
          {children}
        </div>
      )}
    </div>
  )
}

/**
 * Phase summary card
 */
interface PhaseCardProps {
  phase: PhaseResult
  meta: { name: string; shortName: string; description: string }
  icon: React.ComponentType<{ size?: number; className?: string }>
  isExpanded: boolean
  onToggle: () => void
}

function PhaseCard({ phase, meta, icon: Icon, isExpanded, onToggle }: PhaseCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border overflow-hidden transition-all',
        phase.passed
          ? 'border-emerald-500/20 bg-emerald-500/5'
          : 'border-border bg-muted/30'
      )}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            phase.passed ? 'bg-emerald-500/20' : 'bg-muted'
          )}>
            <Icon size={16} className={phase.passed ? 'text-emerald-600' : 'text-muted-foreground'} />
          </div>
          <div>
            <div className="text-sm font-medium text-foreground">{meta.name}</div>
            <div className="text-xs text-muted-foreground">
              Score: {phase.finalScore.toFixed(1)}/10 • {phase.iterations.length} iteration{phase.iterations.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {phase.passed ? (
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-600 font-medium">
              Passed
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium">
              Needs Work
            </span>
          )}
          {isExpanded ? (
            <ChevronDown size={16} className="text-muted-foreground" />
          ) : (
            <ChevronRight size={16} className="text-muted-foreground" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">{meta.description}</p>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">
              Duration: {Math.round(phase.durationMs / 1000)}s
            </span>
            <span className="text-muted-foreground">
              Final Score: <span className={phase.passed ? 'text-emerald-600 font-medium' : 'text-foreground'}>{phase.finalScore.toFixed(2)}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Get appropriate icon for report section
 */
function getSectionIcon(title: string): React.ComponentType<{ size?: number; className?: string }> {
  const lowerTitle = title.toLowerCase()
  if (lowerTitle.includes('research') || lowerTitle.includes('literature')) return BookOpen
  if (lowerTitle.includes('hypothesis') || lowerTitle.includes('hypothes')) return Lightbulb
  if (lowerTitle.includes('experiment') || lowerTitle.includes('validation')) return FlaskConical
  if (lowerTitle.includes('simulation')) return BarChart3
  if (lowerTitle.includes('technical') || lowerTitle.includes('economic')) return TrendingUp
  if (lowerTitle.includes('overview') || lowerTitle.includes('discovery')) return Sparkles
  return FileText
}

/**
 * Get accent color for report section
 */
function getSectionColor(title: string): 'emerald' | 'blue' | 'teal' | 'purple' | 'amber' {
  const lowerTitle = title.toLowerCase()
  if (lowerTitle.includes('research') || lowerTitle.includes('literature')) return 'blue'
  if (lowerTitle.includes('hypothesis')) return 'purple'
  if (lowerTitle.includes('experiment') || lowerTitle.includes('simulation')) return 'teal'
  if (lowerTitle.includes('technical') || lowerTitle.includes('economic')) return 'amber'
  return 'emerald'
}

/**
 * Compact results summary for inline use
 */
interface CompactResultsSummaryProps {
  result: DiscoveryResult
  className?: string
}

export function CompactResultsSummary({
  result,
  className,
}: CompactResultsSummaryProps) {
  const passedPhases = result.phases.filter(p => p.passed).length

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <QualityBadge quality={result.discoveryQuality} size="sm" />
      <div className="flex items-center gap-1 text-sm">
        <span className="font-medium text-emerald-600">{result.overallScore.toFixed(1)}</span>
        <span className="text-muted-foreground">/10</span>
      </div>
      <div className="text-xs text-muted-foreground">
        {passedPhases}/{result.phases.length} phases passed
      </div>
    </div>
  )
}

export default FrontierScienceResultsCard
