'use client'

/**
 * ExportPanel Component
 *
 * Provides export functionality for discovery results:
 * - PDF: Formatted research report
 * - JSON: Raw data for programmatic use
 * - LaTeX: Publication-ready document
 * - BibTeX: Citations for references
 * - Markdown: Human-readable summary
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Download,
  FileText,
  FileJson,
  FileCode,
  BookOpen,
  Copy,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  Settings2,
  Share2,
  ExternalLink,
} from 'lucide-react'
import type { DiscoveryResult, PhaseResult } from '@/types/frontierscience'
import type { DiscoveryPhase } from '@/types/frontierscience'

// ============================================================================
// Types
// ============================================================================

type ExportFormat = 'pdf' | 'json' | 'latex' | 'bibtex' | 'markdown'

interface ExportOption {
  format: ExportFormat
  label: string
  description: string
  icon: React.ReactNode
  extension: string
  mimeType: string
}

interface ExportConfig {
  includePhases: Set<DiscoveryPhase>
  includeRubricScores: boolean
  includeIterationHistory: boolean
  includeRawData: boolean
  includeCitations: boolean
  includeVisualizations: boolean
  paperFormat?: 'letter' | 'a4'
  citationStyle?: 'apa' | 'ieee' | 'nature' | 'bibtex'
}

interface ExportPanelProps {
  result: DiscoveryResult
  discoveryId: string
  query: string
  onExport?: (format: ExportFormat, data: string | Blob) => void
  compact?: boolean
  className?: string
}

// ============================================================================
// Export Options
// ============================================================================

const EXPORT_OPTIONS: ExportOption[] = [
  {
    format: 'pdf',
    label: 'PDF Report',
    description: 'Formatted research report with visualizations',
    icon: <FileText className="w-5 h-5" />,
    extension: '.pdf',
    mimeType: 'application/pdf',
  },
  {
    format: 'markdown',
    label: 'Markdown',
    description: 'Human-readable summary for documentation',
    icon: <FileText className="w-5 h-5" />,
    extension: '.md',
    mimeType: 'text/markdown',
  },
  {
    format: 'json',
    label: 'JSON Data',
    description: 'Raw data for programmatic use',
    icon: <FileJson className="w-5 h-5" />,
    extension: '.json',
    mimeType: 'application/json',
  },
  {
    format: 'latex',
    label: 'LaTeX Document',
    description: 'Publication-ready document template',
    icon: <FileCode className="w-5 h-5" />,
    extension: '.tex',
    mimeType: 'application/x-tex',
  },
  {
    format: 'bibtex',
    label: 'BibTeX Citations',
    description: 'Bibliography entries for references',
    icon: <BookOpen className="w-5 h-5" />,
    extension: '.bib',
    mimeType: 'application/x-bibtex',
  },
]

const PHASE_NAMES: Record<DiscoveryPhase, string> = {
  research: 'Research',
  synthesis: 'Synthesis',
  hypothesis: 'Hypotheses',
  screening: 'Screening',
  experiment: 'Experiments',
  simulation: 'Simulations',
  exergy: 'Exergy Analysis',
  tea: 'TEA Analysis',
  patent: 'Patent Analysis',
  validation: 'Validation',
  rubric_eval: 'Rubric Evaluation',
  publication: 'Publication',
}

// ============================================================================
// Export Generators
// ============================================================================

function generateMarkdown(
  result: DiscoveryResult,
  query: string,
  discoveryId: string,
  config: ExportConfig
): string {
  const lines: string[] = []

  // Header
  lines.push('# Discovery Report')
  lines.push('')
  lines.push(`**Query:** ${query}`)
  lines.push(`**Discovery ID:** ${discoveryId}`)
  lines.push(`**Generated:** ${new Date().toISOString()}`)
  lines.push(`**Overall Score:** ${result.overallScore?.toFixed(1) || 'N/A'}/10`)
  lines.push(`**Quality:** ${result.discoveryQuality || 'Unknown'}`)
  lines.push('')

  // Executive Summary
  lines.push('## Executive Summary')
  lines.push('')
  const passedPhases = result.phases?.filter(p => p.passed).length || 0
  const totalPhases = result.phases?.length || 0
  lines.push(`This discovery completed ${passedPhases}/${totalPhases} phases successfully with an overall score of ${result.overallScore?.toFixed(1) || 'N/A'}/10.`)
  lines.push('')
  lines.push('---')
  lines.push('')

  // Phase Results
  lines.push('## Detailed Phase Results')
  lines.push('')

  if (result.phases) {
    for (const phase of result.phases) {
      if (!config.includePhases.has(phase.phase as DiscoveryPhase)) continue

      lines.push(`### ${PHASE_NAMES[phase.phase as DiscoveryPhase] || phase.phase}`)
      lines.push('')

      if (config.includeRubricScores && phase.finalScore !== undefined) {
        lines.push(`**Score:** ${phase.finalScore.toFixed(1)}/10 (${phase.passed ? '✓ Passed' : '✗ Needs Improvement'})`)
        lines.push('')
      }

      // Iteration history with details
      if (config.includeIterationHistory && phase.iterations && phase.iterations.length > 0) {
        lines.push('#### Iteration History')
        lines.push('')
        for (const iter of phase.iterations) {
          lines.push(`**Iteration ${iter.iteration}:** Score ${iter.judgeResult?.totalScore?.toFixed(1) || 'N/A'}/10`)

          // What worked (passed items)
          const passedItems = iter.judgeResult?.passedItems || iter.judgeResult?.itemScores?.filter((s: any) => s.passed) || []
          if (passedItems.length > 0) {
            lines.push('')
            lines.push('*What Worked:*')
            for (const item of passedItems.slice(0, 5)) {
              const itemAny = item as any
              lines.push(`- ✓ ${itemAny.description || itemAny.id || itemAny.itemId || String(item)}`)
            }
          }

          // Challenges (failed items)
          const failedItems = iter.judgeResult?.failedItems || iter.judgeResult?.itemScores?.filter((s: any) => !s.passed) || []
          if (failedItems.length > 0) {
            lines.push('')
            lines.push('*Challenges:*')
            for (const item of failedItems.slice(0, 5)) {
              const itemAny = item as any
              lines.push(`- ⚠ ${itemAny.description || itemAny.id || itemAny.itemId || String(item)}${itemAny.reasoning ? `: ${itemAny.reasoning}` : ''}`)
            }
          }

          // Refinements applied
          if (iter.hints?.specificGuidance) {
            lines.push('')
            lines.push('*Refinements Applied:*')
            lines.push(`- → ${iter.hints.specificGuidance}`)
          }

          lines.push('')
        }
      }

      // Phase-specific content
      if (phase.finalOutput) {
        const output = phase.finalOutput

        // Research phase
        if (phase.phase === 'research' && output.sources) {
          lines.push('#### Key Findings')
          lines.push('')
          lines.push(`**Sources Found:** ${output.sources.length}`)
          lines.push('')
          if (output.keyFindings) {
            for (const finding of output.keyFindings.slice(0, 5)) {
              const findingText = typeof finding === 'string' ? finding : finding.summary || finding.finding || JSON.stringify(finding)
              lines.push(`- ${findingText}`)
            }
            lines.push('')
          }
          if (output.gaps && output.gaps.length > 0) {
            lines.push('**Identified Gaps:**')
            for (const gap of output.gaps.slice(0, 3)) {
              lines.push(`- ${typeof gap === 'string' ? gap : gap.description || JSON.stringify(gap)}`)
            }
            lines.push('')
          }
        }

        // Hypothesis phase
        if (phase.phase === 'hypothesis') {
          const hypotheses = output.hypotheses || output
          if (Array.isArray(hypotheses) && hypotheses.length > 0) {
            lines.push('#### Generated Hypotheses')
            lines.push('')
            for (let i = 0; i < Math.min(hypotheses.length, 5); i++) {
              const h = hypotheses[i]
              lines.push(`**${i + 1}. ${h.title || `Hypothesis ${i + 1}`}**`)
              lines.push('')
              lines.push(`> ${h.statement}`)
              lines.push('')
              if (h.noveltyScore !== undefined || h.feasibilityScore !== undefined) {
                lines.push(`- Novelty Score: ${h.noveltyScore || 'N/A'}`)
                lines.push(`- Feasibility Score: ${h.feasibilityScore || 'N/A'}`)
                if (h.impactScore !== undefined) lines.push(`- Impact Score: ${h.impactScore}`)
              }
              if (h.predictions && h.predictions.length > 0) {
                lines.push('')
                lines.push('*Predictions:*')
                for (const p of h.predictions.slice(0, 3)) {
                  lines.push(`- ${p.statement}${p.expectedValue ? ` (Expected: ${p.expectedValue}${p.unit || ''})` : ''}`)
                }
              }
              lines.push('')
            }
          }
        }

        // Experiment phase
        if (phase.phase === 'experiment') {
          const experiments = output.experiments || output
          if (Array.isArray(experiments) && experiments.length > 0) {
            lines.push('#### Designed Experiments')
            lines.push('')
            for (let i = 0; i < Math.min(experiments.length, 3); i++) {
              const e = experiments[i]
              lines.push(`**${e.title || `Experiment ${i + 1}`}**`)
              lines.push('')
              lines.push(`- Type: ${e.type || 'N/A'}`)
              lines.push(`- Difficulty: ${e.difficulty || 'N/A'}`)
              lines.push(`- Duration: ${e.estimatedDuration || 'N/A'}`)
              if (e.estimatedCost) lines.push(`- Cost: $${e.estimatedCost.toLocaleString()}`)
              lines.push('')
            }
          }
        }

        // Simulation phase
        if (phase.phase === 'simulation' && output.results) {
          lines.push('#### Simulation Results')
          lines.push('')
          const results = Array.isArray(output.results) ? output.results : [output.results]
          for (const r of results.slice(0, 3)) {
            lines.push(`**${r.experimentId || 'Simulation'}**`)
            lines.push('')
            if (r.convergenceMetrics) {
              lines.push(`- Converged: ${r.convergenceMetrics.converged ? 'Yes' : 'No'}`)
              lines.push(`- Iterations: ${r.convergenceMetrics.iterations}`)
            }
            if (r.outputs && Array.isArray(r.outputs)) {
              lines.push('')
              lines.push('*Key Outputs:*')
              for (const o of r.outputs.slice(0, 5)) {
                lines.push(`- ${o.name}: ${typeof o.value === 'number' ? o.value.toFixed(3) : o.value} ${o.unit || ''}`)
              }
            }
            lines.push('')
          }
        }

        // TEA phase
        if (phase.phase === 'tea' && output.economics) {
          lines.push('#### Economic Analysis')
          lines.push('')
          const econ = output.economics
          if (econ.npv !== undefined) lines.push(`- **NPV:** $${econ.npv.toLocaleString()}`)
          if (econ.irr !== undefined) lines.push(`- **IRR:** ${(econ.irr * 100).toFixed(1)}%`)
          if (econ.lcoe !== undefined) lines.push(`- **LCOE:** $${econ.lcoe.toFixed(4)}/kWh`)
          if (econ.paybackPeriod !== undefined) lines.push(`- **Payback Period:** ${econ.paybackPeriod.toFixed(1)} years`)
          lines.push('')
          if (econ.risks && econ.risks.length > 0) {
            lines.push('*Identified Risks:*')
            for (const risk of econ.risks.slice(0, 3)) {
              lines.push(`- ⚠ ${risk}`)
            }
            lines.push('')
          }
        }

        // Exergy phase
        if (phase.phase === 'exergy') {
          lines.push('#### Exergy Analysis')
          lines.push('')
          if (output.overallSecondLawEfficiency !== undefined) {
            lines.push(`- **Second Law Efficiency:** ${(output.overallSecondLawEfficiency * 100).toFixed(1)}%`)
          }
          if (output.totalExergyDestruction !== undefined) {
            lines.push(`- **Total Exergy Destruction:** ${output.totalExergyDestruction.toFixed(1)} ${output.unit || 'kJ'}`)
          }
          if (output.recommendations && output.recommendations.length > 0) {
            lines.push('')
            lines.push('*Recommendations:*')
            for (const rec of output.recommendations.slice(0, 3)) {
              lines.push(`- ${rec}`)
            }
          }
          lines.push('')
        }
      }

      lines.push('---')
      lines.push('')
    }
  }

  // Recommendations
  if (result.recommendations && result.recommendations.length > 0) {
    lines.push('## Recommendations & Next Steps')
    lines.push('')
    lines.push('### Immediate Actions')
    lines.push('')
    for (const rec of result.recommendations.slice(0, 3)) {
      lines.push(`1. ${rec}`)
    }
    lines.push('')
    if (result.recommendations.length > 3) {
      lines.push('### Future Considerations')
      lines.push('')
      for (const rec of result.recommendations.slice(3)) {
        lines.push(`- ${rec}`)
      }
      lines.push('')
    }
  }

  // Raw data section
  if (config.includeRawData) {
    lines.push('## Raw Data')
    lines.push('')
    lines.push('```json')
    lines.push(JSON.stringify(result, null, 2))
    lines.push('```')
    lines.push('')
  }

  // Footer
  lines.push('---')
  lines.push('')
  lines.push('*Generated by Exergy Lab Discovery Engine*')
  lines.push(`*Report generated at ${new Date().toLocaleString()}*`)

  return lines.join('\n')
}

function generateJSON(result: DiscoveryResult, config: ExportConfig): string {
  const exportData: any = {
    metadata: {
      exportedAt: new Date().toISOString(),
      version: '1.0',
    },
    overallScore: result.overallScore,
    discoveryQuality: result.discoveryQuality,
    recommendations: result.recommendations,
  }

  if (config.includePhases.size > 0) {
    exportData.phases = result.phases?.filter(
      (p) => config.includePhases.has(p.phase as DiscoveryPhase)
    )
  }

  if (!config.includeRubricScores) {
    // Remove rubric scores from phases
    exportData.phases = exportData.phases?.map((p: any) => {
      const { judgeResult, ...rest } = p
      return rest
    })
  }

  if (!config.includeIterationHistory) {
    exportData.phases = exportData.phases?.map((p: any) => {
      const { iterations, ...rest } = p
      return rest
    })
  }

  return JSON.stringify(exportData, null, 2)
}

function generateBibTeX(result: DiscoveryResult): string {
  const entries: string[] = []
  const processedDois = new Set<string>()

  // Extract citations from research phase
  const researchPhase = result.phases?.find((p) => p.phase === 'research')
  if (researchPhase?.finalOutput?.sources) {
    for (const source of researchPhase.finalOutput.sources) {
      if (source.doi && !processedDois.has(source.doi)) {
        processedDois.add(source.doi)

        const key = source.doi.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)
        const entry = [
          `@article{${key},`,
          `  title = {${source.title || 'Unknown Title'}},`,
          `  author = {${source.authors?.join(' and ') || 'Unknown'}},`,
          `  journal = {${source.journal || 'Unknown Journal'}},`,
          `  year = {${source.year || new Date().getFullYear()}},`,
          `  doi = {${source.doi}},`,
          `  url = {https://doi.org/${source.doi}}`,
          `}`,
        ]
        entries.push(entry.join('\n'))
      }
    }
  }

  if (entries.length === 0) {
    return '% No citations found in discovery results\n'
  }

  return [
    '% Bibliography generated by Exergy Lab Discovery Engine',
    `% Generated: ${new Date().toISOString()}`,
    '',
    ...entries,
  ].join('\n\n')
}

function generateLaTeX(
  result: DiscoveryResult,
  query: string,
  config: ExportConfig
): string {
  const paperSize = config.paperFormat === 'a4' ? 'a4paper' : 'letterpaper'

  const lines = [
    `\\documentclass[${paperSize},11pt]{article}`,
    '',
    '% Packages',
    '\\usepackage[utf8]{inputenc}',
    '\\usepackage{amsmath}',
    '\\usepackage{graphicx}',
    '\\usepackage{hyperref}',
    '\\usepackage{booktabs}',
    '\\usepackage[margin=1in]{geometry}',
    '',
    '\\title{Discovery Report}',
    `\\author{Generated by Exergy Lab}`,
    `\\date{${new Date().toLocaleDateString()}}`,
    '',
    '\\begin{document}',
    '',
    '\\maketitle',
    '',
    '\\begin{abstract}',
    `This report summarizes the findings from an automated scientific discovery workflow.`,
    `Query: ${query.replace(/[_#$%&{}]/g, '\\$&')}`,
    `Overall Score: ${result.overallScore?.toFixed(1) || 'N/A'}/10.`,
    '\\end{abstract}',
    '',
    '\\section{Introduction}',
    '',
    'This document presents the results of an AI-assisted scientific discovery process.',
    '',
  ]

  // Add phase sections
  if (result.phases) {
    for (const phase of result.phases) {
      if (!config.includePhases.has(phase.phase as DiscoveryPhase)) continue

      const phaseName = PHASE_NAMES[phase.phase as DiscoveryPhase] || phase.phase
      lines.push(`\\section{${phaseName}}`)
      lines.push('')

      if (config.includeRubricScores && phase.finalScore !== undefined) {
        lines.push(`Score: ${phase.finalScore.toFixed(1)}/10 (${phase.passed ? 'Passed' : 'Failed'})`)
        lines.push('')
      }

      // Add placeholder for phase content
      lines.push(`% Add ${phaseName.toLowerCase()} content here`)
      lines.push('')
    }
  }

  // Recommendations
  if (result.recommendations && result.recommendations.length > 0) {
    lines.push('\\section{Recommendations}')
    lines.push('')
    lines.push('\\begin{itemize}')
    for (const rec of result.recommendations) {
      lines.push(`  \\item ${rec.replace(/[_#$%&{}]/g, '\\$&')}`)
    }
    lines.push('\\end{itemize}')
    lines.push('')
  }

  lines.push('\\end{document}')

  return lines.join('\n')
}

// ============================================================================
// Export Format Card
// ============================================================================

interface FormatCardProps {
  option: ExportOption
  isSelected: boolean
  onSelect: () => void
  isExporting: boolean
}

function FormatCard({ option, isSelected, onSelect, isExporting }: FormatCardProps) {
  return (
    <button
      onClick={onSelect}
      disabled={isExporting}
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all',
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-border-subtle',
        isExporting && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className={cn(
        'shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
        isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
      )}>
        {option.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{option.label}</span>
          <Badge variant="secondary" className="text-xs">
            {option.extension}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{option.description}</p>
      </div>
      {isSelected && <Check className="w-5 h-5 text-primary shrink-0" />}
    </button>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function ExportPanel({
  result,
  discoveryId,
  query,
  onExport,
  compact = false,
  className,
}: ExportPanelProps) {
  const [selectedFormat, setSelectedFormat] = React.useState<ExportFormat>('markdown')
  const [isExporting, setIsExporting] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  const [showConfig, setShowConfig] = React.useState(false)
  const [config, setConfig] = React.useState<ExportConfig>({
    includePhases: new Set([
      'research', 'hypothesis', 'experiment', 'simulation',
      'exergy', 'tea', 'validation'
    ]),
    includeRubricScores: true,
    includeIterationHistory: false,
    includeRawData: false,
    includeCitations: true,
    includeVisualizations: true,
    paperFormat: 'letter',
    citationStyle: 'apa',
  })

  const handleExport = async () => {
    setIsExporting(true)

    try {
      let data: string | Blob
      const selectedOption = EXPORT_OPTIONS.find((o) => o.format === selectedFormat)!

      switch (selectedFormat) {
        case 'markdown':
          data = generateMarkdown(result, query, discoveryId, config)
          break
        case 'json':
          data = generateJSON(result, config)
          break
        case 'bibtex':
          data = generateBibTeX(result)
          break
        case 'latex':
          data = generateLaTeX(result, query, config)
          break
        case 'pdf':
          // PDF generation would require server-side processing
          // For now, generate markdown and note that PDF is coming
          data = generateMarkdown(result, query, discoveryId, config)
          break
        default:
          data = generateJSON(result, config)
      }

      // Trigger download
      const blob = new Blob([data], { type: selectedOption.mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `discovery-${discoveryId}${selectedOption.extension}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      if (onExport) {
        onExport(selectedFormat, data)
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopyToClipboard = async () => {
    try {
      let data: string

      switch (selectedFormat) {
        case 'markdown':
          data = generateMarkdown(result, query, discoveryId, config)
          break
        case 'json':
          data = generateJSON(result, config)
          break
        case 'bibtex':
          data = generateBibTeX(result)
          break
        case 'latex':
          data = generateLaTeX(result, query, config)
          break
        default:
          data = generateJSON(result, config)
      }

      await navigator.clipboard.writeText(data)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Copy failed:', error)
    }
  }

  const togglePhase = (phase: DiscoveryPhase) => {
    setConfig((prev) => {
      const newPhases = new Set(prev.includePhases)
      if (newPhases.has(phase)) {
        newPhases.delete(phase)
      } else {
        newPhases.add(phase)
      }
      return { ...prev, includePhases: newPhases }
    })
  }

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <select
          value={selectedFormat}
          onChange={(e) => setSelectedFormat(e.target.value as ExportFormat)}
          className="px-3 py-2 rounded-md border border-border bg-background text-sm"
        >
          {EXPORT_OPTIONS.map((option) => (
            <option key={option.format} value={option.format}>
              {option.label}
            </option>
          ))}
        </select>
        <Button
          onClick={handleExport}
          disabled={isExporting}
          size="sm"
          className="gap-2"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export
        </Button>
        <Button
          onClick={handleCopyToClipboard}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          {copied ? (
            <Check className="w-4 h-4 text-emerald-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border border-border bg-card p-6 space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">Export Results</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowConfig(!showConfig)}
          className="gap-1"
        >
          <Settings2 className="w-4 h-4" />
          {showConfig ? 'Hide Options' : 'Options'}
          {showConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </Button>
      </div>

      {/* Configuration Panel */}
      {showConfig && (
        <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-4">
          <div>
            <span className="text-sm font-medium text-foreground block mb-2">
              Include Phases
            </span>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PHASE_NAMES) as DiscoveryPhase[]).map((phase) => (
                <button
                  key={phase}
                  onClick={() => togglePhase(phase)}
                  className={cn(
                    'px-3 py-1 rounded-md text-sm transition-colors',
                    config.includePhases.has(phase)
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {PHASE_NAMES[phase]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.includeRubricScores}
                onChange={(e) => setConfig((p) => ({ ...p, includeRubricScores: e.target.checked }))}
                className="rounded"
              />
              Include rubric scores
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.includeIterationHistory}
                onChange={(e) => setConfig((p) => ({ ...p, includeIterationHistory: e.target.checked }))}
                className="rounded"
              />
              Include iteration history
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.includeRawData}
                onChange={(e) => setConfig((p) => ({ ...p, includeRawData: e.target.checked }))}
                className="rounded"
              />
              Include raw JSON data
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.includeCitations}
                onChange={(e) => setConfig((p) => ({ ...p, includeCitations: e.target.checked }))}
                className="rounded"
              />
              Include citations
            </label>
          </div>

          <div className="flex gap-4">
            <div>
              <span className="text-xs text-muted-foreground block mb-1">Paper Format</span>
              <select
                value={config.paperFormat}
                onChange={(e) => setConfig((p) => ({ ...p, paperFormat: e.target.value as 'letter' | 'a4' }))}
                className="px-2 py-1 rounded border border-border bg-background text-sm"
              >
                <option value="letter">US Letter</option>
                <option value="a4">A4</option>
              </select>
            </div>
            <div>
              <span className="text-xs text-muted-foreground block mb-1">Citation Style</span>
              <select
                value={config.citationStyle}
                onChange={(e) => setConfig((p) => ({ ...p, citationStyle: e.target.value as any }))}
                className="px-2 py-1 rounded border border-border bg-background text-sm"
              >
                <option value="apa">APA</option>
                <option value="ieee">IEEE</option>
                <option value="nature">Nature</option>
                <option value="bibtex">BibTeX</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Format Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {EXPORT_OPTIONS.map((option) => (
          <FormatCard
            key={option.format}
            option={option}
            isSelected={selectedFormat === option.format}
            onSelect={() => setSelectedFormat(option.format)}
            isExporting={isExporting}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex gap-2">
          <Button
            onClick={handleCopyToClipboard}
            variant="outline"
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy to Clipboard
              </>
            )}
          </Button>
        </div>
        <Button
          onClick={handleExport}
          disabled={isExporting}
          className="gap-2"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Download {EXPORT_OPTIONS.find((o) => o.format === selectedFormat)?.extension}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ============================================================================
// Quick Export Button
// ============================================================================

interface QuickExportButtonProps {
  result: DiscoveryResult
  discoveryId: string
  query: string
  format?: ExportFormat
  className?: string
}

export function QuickExportButton({
  result,
  discoveryId,
  query,
  format = 'markdown',
  className,
}: QuickExportButtonProps) {
  const [isExporting, setIsExporting] = React.useState(false)

  const handleQuickExport = async () => {
    setIsExporting(true)

    try {
      const config: ExportConfig = {
        includePhases: new Set([
          'research', 'hypothesis', 'experiment', 'simulation',
          'exergy', 'tea', 'validation'
        ]),
        includeRubricScores: true,
        includeIterationHistory: false,
        includeRawData: false,
        includeCitations: true,
        includeVisualizations: false,
      }

      const data = format === 'json'
        ? generateJSON(result, config)
        : generateMarkdown(result, query, discoveryId, config)

      const option = EXPORT_OPTIONS.find((o) => o.format === format)!
      const blob = new Blob([data], { type: option.mimeType })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `discovery-${discoveryId}${option.extension}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Button
      onClick={handleQuickExport}
      disabled={isExporting}
      variant="outline"
      size="sm"
      className={cn('gap-2', className)}
    >
      {isExporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      Export
    </Button>
  )
}

export default ExportPanel
