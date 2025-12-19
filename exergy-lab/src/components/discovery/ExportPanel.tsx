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

type ExportFormat = 'pdf' | 'json' | 'latex' | 'bibtex' | 'markdown' | 'ai-report'

interface ExportOption {
  format: ExportFormat
  label: string
  description: string
  icon: React.ReactNode
  extension: string
  mimeType: string
  isAIEnhanced?: boolean
}

interface AIGeneratedReport {
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
    format: 'ai-report',
    label: 'AI-Enhanced Report',
    description: 'Comprehensive AI-written analysis with detailed sections',
    icon: <FileText className="w-5 h-5" />,
    extension: '.md',
    mimeType: 'text/markdown',
    isAIEnhanced: true,
  },
  {
    format: 'pdf',
    label: 'PDF Report',
    description: 'Formatted PDF document for sharing',
    icon: <FileText className="w-5 h-5" />,
    extension: '.pdf',
    mimeType: 'application/pdf',
    isAIEnhanced: true,
  },
  {
    format: 'markdown',
    label: 'Markdown (Basic)',
    description: 'Quick summary for documentation',
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

/**
 * Phase names for consolidated 4-phase model
 */
const PHASE_NAMES: Record<DiscoveryPhase, string> = {
  research: 'Multi-Source Research',
  hypothesis: 'Hypothesis & Protocol',
  validation: 'Validation & Analysis',
  output: 'Final Report',
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

        // Hypothesis phase - includes experiments in consolidated model
        if (phase.phase === 'hypothesis') {
          const experiments = output.experiments || output.experiment?.experiments || []
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

        // Validation phase - includes simulation, TEA, exergy in consolidated model
        if (phase.phase === 'validation') {
          // Simulation results
          const simResults = output.simulation?.results || output.results
          if (simResults) {
            lines.push('#### Simulation Results')
            lines.push('')
            const results = Array.isArray(simResults) ? simResults : [simResults]
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

          // TEA results
          const teaData = output.economics || output.tea
          if (teaData) {
            lines.push('#### Economic Analysis')
            lines.push('')
            const econ = teaData
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

          // Exergy results
          const exergyData = output.exergy || output
          if (exergyData.overallSecondLawEfficiency !== undefined) {
            lines.push('#### Exergy Analysis')
            lines.push('')
            lines.push(`- **Second Law Efficiency:** ${(exergyData.overallSecondLawEfficiency * 100).toFixed(1)}%`)
            if (exergyData.totalExergyDestruction !== undefined) {
              lines.push(`- **Total Exergy Destruction:** ${exergyData.totalExergyDestruction.toFixed(1)} ${exergyData.unit || 'kJ'}`)
            }
            if (exergyData.recommendations && exergyData.recommendations.length > 0) {
              lines.push('')
              lines.push('*Recommendations:*')
              for (const rec of exergyData.recommendations.slice(0, 3)) {
                lines.push(`- ${rec}`)
              }
            }
            lines.push('')
          }
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

/**
 * Fetch AI-generated comprehensive report from API
 */
async function fetchAIReport(
  result: DiscoveryResult,
  query: string,
  discoveryId: string
): Promise<AIGeneratedReport> {
  const response = await fetch('/api/discovery/generate-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      discoveryId,
      query,
      domain: result.domain || 'clean-energy',
      overallScore: result.overallScore,
      discoveryQuality: result.discoveryQuality,
      phases: result.phases?.map(p => ({
        phase: p.phase,
        finalOutput: p.finalOutput,
        finalScore: p.finalScore,
        passed: p.passed,
        iterations: p.iterations || [],
        durationMs: p.durationMs || 0,
      })) || [],
      recommendations: result.recommendations || [],
      totalDuration: result.totalDurationMs || 0,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to generate AI report')
  }

  return response.json()
}

/**
 * Convert AI report to markdown format
 */
function aiReportToMarkdown(report: AIGeneratedReport, includeRawData?: boolean, result?: DiscoveryResult): string {
  const lines: string[] = []

  // Title
  lines.push(`# ${report.title}`)
  lines.push('')
  lines.push(`**Generated:** ${new Date(report.generatedAt).toLocaleString()}`)
  lines.push(`**Discovery ID:** ${report.metadata.discoveryId}`)
  lines.push(`**Overall Score:** ${report.metadata.overallScore.toFixed(1)}/10`)
  lines.push(`**Phases Completed:** ${report.metadata.phasesCompleted}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  // Executive Summary
  lines.push('## Executive Summary')
  lines.push('')
  lines.push(report.executiveSummary)
  lines.push('')
  lines.push('---')
  lines.push('')

  // Main Sections
  for (const section of report.sections) {
    lines.push(`## ${section.title}`)
    lines.push('')
    lines.push(section.content)
    lines.push('')
    lines.push('---')
    lines.push('')
  }

  // Conclusions
  lines.push('## Conclusions')
  lines.push('')
  lines.push(report.conclusions)
  lines.push('')

  // Next Steps
  if (report.nextSteps && report.nextSteps.length > 0) {
    lines.push('## Recommended Next Steps')
    lines.push('')
    for (let i = 0; i < report.nextSteps.length; i++) {
      lines.push(`${i + 1}. ${report.nextSteps[i]}`)
    }
    lines.push('')
  }

  // Raw data section if requested
  if (includeRawData && result) {
    lines.push('---')
    lines.push('')
    lines.push('## Appendix: Raw Discovery Data')
    lines.push('')
    lines.push('```json')
    lines.push(JSON.stringify(result, null, 2))
    lines.push('```')
    lines.push('')
  }

  // Footer
  lines.push('---')
  lines.push('')
  lines.push('*This report was generated using AI-powered analysis by Exergy Lab Discovery Engine.*')
  lines.push(`*Report generated at ${new Date().toLocaleString()}*`)

  return lines.join('\n')
}

/**
 * Generate PDF from markdown content using browser APIs
 * Creates a styled HTML document and triggers print/save as PDF
 */
function generatePDFFromMarkdown(markdown: string, filename: string): void {
  // Convert markdown to HTML (basic conversion)
  let html = markdown
    // Headers
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Lists
    .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/^✓ (.*$)/gm, '<li class="success">✓ $1</li>')
    .replace(/^⚠ (.*$)/gm, '<li class="warning">⚠ $1</li>')
    // Blockquotes
    .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
    // Code blocks
    .replace(/```json([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`(.*?)`/g, '<code>$1</code>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')

  // Wrap list items in ul
  html = html.replace(/(<li[^>]*>.*?<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)

  // Create styled HTML document
  const styledHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${filename}</title>
  <style>
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      color: #333;
    }
    h1 {
      color: #1a1a1a;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    h2 {
      color: #1f2937;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 8px;
      margin-top: 30px;
    }
    h3 {
      color: #374151;
      margin-top: 20px;
    }
    p {
      margin: 10px 0;
    }
    ul {
      margin: 10px 0;
      padding-left: 25px;
    }
    li {
      margin: 5px 0;
    }
    li.success {
      color: #059669;
    }
    li.warning {
      color: #d97706;
    }
    blockquote {
      border-left: 4px solid #3b82f6;
      padding-left: 15px;
      margin: 15px 0;
      color: #4b5563;
      font-style: italic;
      background: #f3f4f6;
      padding: 10px 15px;
      border-radius: 0 8px 8px 0;
    }
    pre {
      background: #1f2937;
      color: #e5e7eb;
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
      font-size: 12px;
    }
    code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.9em;
    }
    pre code {
      background: none;
      padding: 0;
    }
    hr {
      border: none;
      border-top: 1px solid #e5e7eb;
      margin: 30px 0;
    }
    strong {
      color: #111827;
    }
    .metadata {
      background: #f9fafb;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <p>${html}</p>
</body>
</html>
`

  // Open in new window for printing
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(styledHtml)
    printWindow.document.close()

    // Wait for content to load, then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  } else {
    // Fallback: download as HTML
    const blob = new Blob([styledHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.replace('.pdf', '.html')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
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
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground">{option.label}</span>
          <Badge variant="secondary" className="text-xs">
            {option.extension}
          </Badge>
          {option.isAIEnhanced && (
            <Badge variant="default" className="text-xs bg-gradient-to-r from-blue-500 to-purple-500">
              AI Enhanced
            </Badge>
          )}
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
    // Consolidated 4-phase model
    includePhases: new Set(['research', 'hypothesis', 'validation', 'output'] as DiscoveryPhase[]),
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
        case 'ai-report': {
          // Fetch AI-generated comprehensive report
          const aiReport = await fetchAIReport(result, query, discoveryId)
          data = aiReportToMarkdown(aiReport, config.includeRawData, result)
          break
        }
        case 'pdf': {
          // Generate AI report then convert to PDF
          const aiReport = await fetchAIReport(result, query, discoveryId)
          const markdown = aiReportToMarkdown(aiReport, config.includeRawData, result)
          // Use PDF generation with print dialog
          generatePDFFromMarkdown(markdown, `discovery-${discoveryId}.pdf`)
          setIsExporting(false)
          return // Early return - PDF uses print dialog
        }
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

      // Trigger download (for non-PDF formats)
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
      // Show error to user (could add toast notification here)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleCopyToClipboard = async () => {
    try {
      let data: string

      switch (selectedFormat) {
        case 'ai-report':
        case 'pdf': {
          // For AI-enhanced formats, fetch the AI report first
          const aiReport = await fetchAIReport(result, query, discoveryId)
          data = aiReportToMarkdown(aiReport, config.includeRawData, result)
          break
        }
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
      alert('Copy failed. Please try again.')
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
        // Consolidated 4-phase model
        includePhases: new Set(['research', 'hypothesis', 'validation', 'output'] as DiscoveryPhase[]),
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
