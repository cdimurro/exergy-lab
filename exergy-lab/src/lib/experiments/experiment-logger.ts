/**
 * Experiment Logger
 *
 * Enhanced logging for stress test experiments with:
 * - Full event capture
 * - File system storage
 * - Multiple export formats (JSON, Markdown, CSV)
 * - AI-ready analysis prompts
 */

import * as fs from 'fs'
import * as path from 'path'
import type {
  ExperimentResult,
  DiscoveryTestResult,
  ExperimentSummary,
  StoredExperiment,
  ExperimentIndex,
  BulkAnalysis,
} from './types'

// =============================================================================
// Configuration
// =============================================================================

const EXPERIMENTS_DIR = process.cwd() + '/experiments/results'
const INDEX_FILE = 'experiments-index.json'

// =============================================================================
// Experiment Logger Class
// =============================================================================

export class ExperimentLogger {
  private experimentId: string
  private resultsDir: string

  constructor(experimentId: string) {
    this.experimentId = experimentId
    this.resultsDir = path.join(EXPERIMENTS_DIR, experimentId)
  }

  /**
   * Initialize the results directory
   */
  async initialize() {
    await ensureDir(EXPERIMENTS_DIR)
    await ensureDir(this.resultsDir)
  }

  /**
   * Save experiment result
   */
  async saveResult(result: ExperimentResult): Promise<string> {
    await this.initialize()

    const resultPath = path.join(this.resultsDir, 'result.json')
    await writeFile(resultPath, JSON.stringify(result, null, 2))

    // Also save summary as separate file
    if (result.summary) {
      const summaryPath = path.join(this.resultsDir, 'summary.json')
      await writeFile(summaryPath, JSON.stringify(result.summary, null, 2))
    }

    // Update index
    await this.updateIndex(result)

    console.log(`[ExperimentLogger] Saved result to: ${resultPath}`)
    return resultPath
  }

  /**
   * Export to Markdown (AI-readable format)
   */
  async exportMarkdown(result: ExperimentResult): Promise<string> {
    const markdown = generateMarkdownReport(result)
    const mdPath = path.join(this.resultsDir, 'report.md')
    await writeFile(mdPath, markdown)
    console.log(`[ExperimentLogger] Exported markdown to: ${mdPath}`)
    return mdPath
  }

  /**
   * Export to CSV (spreadsheet analysis)
   */
  async exportCsv(result: ExperimentResult): Promise<string> {
    const csv = generateCsvReport(result)
    const csvPath = path.join(this.resultsDir, 'results.csv')
    await writeFile(csvPath, csv)
    console.log(`[ExperimentLogger] Exported CSV to: ${csvPath}`)
    return csvPath
  }

  /**
   * Export AI analysis prompt
   */
  async exportAiPrompt(result: ExperimentResult, analysis?: BulkAnalysis): Promise<string> {
    const prompt = generateAiAnalysisPrompt(result, analysis)
    const promptPath = path.join(this.resultsDir, 'ai-analysis-prompt.md')
    await writeFile(promptPath, prompt)
    console.log(`[ExperimentLogger] Exported AI prompt to: ${promptPath}`)
    return promptPath
  }

  /**
   * Save individual discovery result
   */
  async saveDiscoveryResult(result: DiscoveryTestResult): Promise<string> {
    await this.initialize()
    const resultPath = path.join(this.resultsDir, `discovery-${result.promptId}.json`)
    await writeFile(resultPath, JSON.stringify(result, null, 2))
    return resultPath
  }

  /**
   * Update experiments index
   */
  private async updateIndex(result: ExperimentResult) {
    const indexPath = path.join(EXPERIMENTS_DIR, INDEX_FILE)
    let index: ExperimentIndex = { experiments: [], lastUpdated: Date.now() }

    try {
      const existing = await readFile(indexPath)
      if (existing) {
        index = JSON.parse(existing)
      }
    } catch {
      // Index doesn't exist yet
    }

    // Add or update experiment entry
    const existingIdx = index.experiments.findIndex(e => e.id === result.experimentId)
    const entry: StoredExperiment = {
      id: result.experimentId,
      name: result.name,
      startedAt: result.startTime,
      completedAt: result.endTime,
      config: result.config,
      resultFile: path.join(this.resultsDir, 'result.json'),
      summaryFile: path.join(this.resultsDir, 'summary.json'),
    }

    if (existingIdx >= 0) {
      index.experiments[existingIdx] = entry
    } else {
      index.experiments.push(entry)
    }

    index.lastUpdated = Date.now()
    await writeFile(indexPath, JSON.stringify(index, null, 2))
  }

  /**
   * Export all formats at once
   */
  async exportAll(result: ExperimentResult, analysis?: BulkAnalysis): Promise<{
    json: string
    markdown: string
    csv: string
    aiPrompt: string
  }> {
    const [json, markdown, csv, aiPrompt] = await Promise.all([
      this.saveResult(result),
      this.exportMarkdown(result),
      this.exportCsv(result),
      this.exportAiPrompt(result, analysis),
    ])
    return { json, markdown, csv, aiPrompt }
  }
}

// =============================================================================
// Report Generators
// =============================================================================

/**
 * Generate Markdown report
 */
function generateMarkdownReport(result: ExperimentResult): string {
  const summary = result.summary!
  const lines: string[] = []

  lines.push(`# Experiment Results: ${result.experimentId}`)
  lines.push('')
  lines.push(`**Name:** ${result.name}`)
  lines.push(`**Date:** ${new Date(result.startTime).toISOString()}`)
  lines.push(`**Duration:** ${(result.totalDuration / 1000 / 60).toFixed(1)} minutes`)
  lines.push('')

  // Summary
  lines.push(`## Summary`)
  lines.push('')
  lines.push(`| Metric | Value |`)
  lines.push(`|--------|-------|`)
  lines.push(`| Total Prompts | ${summary.totalPrompts} |`)
  lines.push(`| Success | ${summary.success} (${(summary.successRate * 100).toFixed(1)}%) |`)
  lines.push(`| Partial Success | ${summary.partial} (${(summary.partialSuccessRate * 100).toFixed(1)}%) |`)
  lines.push(`| Failed | ${summary.failed} (${(summary.failureRate * 100).toFixed(1)}%) |`)
  lines.push(`| Timeout | ${summary.timeout} (${(summary.timeoutRate * 100).toFixed(1)}%) |`)
  lines.push(`| Avg Duration | ${(summary.avgDuration / 1000).toFixed(1)}s |`)
  lines.push(`| Avg Score | ${summary.avgScore.toFixed(2)} |`)
  lines.push('')

  // Category Breakdown
  lines.push(`## Category Performance`)
  lines.push('')
  lines.push(`| Category | Success Rate | Count |`)
  lines.push(`|----------|-------------|-------|`)
  for (const [cat, stats] of Object.entries(summary.categoryStats)) {
    lines.push(`| ${cat} | ${(stats.successRate * 100).toFixed(1)}% | ${stats.total} |`)
  }
  lines.push('')

  // Phase Stats
  lines.push(`## Phase Performance`)
  lines.push('')
  lines.push(`| Phase | Pass Rate | Runs |`)
  lines.push(`|-------|-----------|------|`)
  for (const [phase, stats] of Object.entries(summary.phaseStats)) {
    lines.push(`| ${phase} | ${(stats.passRate * 100).toFixed(1)}% | ${stats.runs} |`)
  }
  lines.push('')

  // Errors
  if (Object.keys(summary.errorsByType).length > 0) {
    lines.push(`## Error Summary`)
    lines.push('')
    for (const [type, data] of Object.entries(summary.errorsByType)) {
      lines.push(`### ${type} (${data.count} occurrences)`)
      lines.push(`Affected prompts: ${data.affectedPrompts.join(', ')}`)
      lines.push('')
    }
  }

  // Detailed Results
  lines.push(`## Detailed Results`)
  lines.push('')
  for (const res of result.results) {
    const emoji = getStatusEmoji(res.status)
    lines.push(`### ${emoji} ${res.promptId}: ${res.prompt.query.substring(0, 60)}...`)
    lines.push('')
    lines.push(`- **Status:** ${res.status}`)
    lines.push(`- **Score:** ${res.finalScore ?? 'N/A'}`)
    lines.push(`- **Duration:** ${(res.duration / 1000).toFixed(1)}s`)
    lines.push(`- **Category:** ${res.prompt.category}`)
    lines.push(`- **Difficulty:** ${res.prompt.difficultyLevel}`)

    if (res.errors.length > 0) {
      lines.push(`- **Errors:**`)
      for (const err of res.errors) {
        lines.push(`  - ${err.message}`)
      }
    }

    if (res.phases.length > 0) {
      lines.push(`- **Phases:**`)
      for (const phase of res.phases) {
        lines.push(`  - ${phase.phase}: ${phase.status}${phase.score ? ` (score: ${phase.score})` : ''}`)
      }
    }
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Generate CSV report
 */
function generateCsvReport(result: ExperimentResult): string {
  const headers = [
    'Prompt ID',
    'Category',
    'Difficulty',
    'Status',
    'Score',
    'Duration (s)',
    'Error Count',
    'Phase Count',
    'Query',
  ]

  const rows = result.results.map(res => [
    res.promptId,
    res.prompt.category,
    res.prompt.difficultyLevel.toString(),
    res.status,
    res.finalScore?.toString() ?? '',
    (res.duration / 1000).toFixed(1),
    res.errors.length.toString(),
    res.phases.length.toString(),
    `"${res.prompt.query.replace(/"/g, '""')}"`,
  ])

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
}

/**
 * Generate AI analysis prompt
 */
function generateAiAnalysisPrompt(result: ExperimentResult, analysis?: BulkAnalysis): string {
  const prompt = `# Discovery Engine Stress Test Analysis Request

You are analyzing stress test results from a FrontierScience Discovery Engine.
The system runs 4-step research discoveries with AI-powered rubric validation.

## Experiment Metadata
- Experiment ID: ${result.experimentId}
- Name: ${result.name}
- Total Prompts: ${result.config.prompts.length}
- Concurrency: ${result.config.concurrency}
- Timeout: ${result.config.timeoutPerDiscovery / 1000}s per discovery
- Duration: ${(result.totalDuration / 1000 / 60).toFixed(1)} minutes

## Summary Statistics
${JSON.stringify(result.summary, null, 2)}

## Full Results
${JSON.stringify(result.results.map(r => ({
  id: r.promptId,
  query: r.prompt.query,
  category: r.prompt.category,
  difficulty: r.prompt.difficultyLevel,
  status: r.status,
  score: r.finalScore,
  duration: r.duration,
  errors: r.errors.map(e => e.message),
  phases: r.phases.map(p => ({ phase: p.phase, status: p.status, score: p.score })),
})), null, 2)}

${analysis ? `## Bulk Analysis
${JSON.stringify(analysis, null, 2)}` : ''}

## Your Analysis Task

Analyze these results in excruciating detail:

1. **Error Classification**: Categorize every error by root cause
2. **Pattern Detection**: Find correlations between query types and failures
3. **Phase Analysis**: Which phases fail most? Why?
4. **Timeout Analysis**: What causes timeouts? Are they recoverable?
5. **Edge Cases**: How does the system handle unusual inputs?
6. **API Issues**: Are there rate limits, timeouts, or connectivity problems?
7. **Data Quality**: Are fallback mechanisms working correctly?
8. **Scoring Accuracy**: Do scores reflect actual quality?

## Output Format

Provide:
1. **Executive Summary** (5 key findings)
2. **Critical Bugs** (must fix immediately)
3. **High-Priority Improvements** (fix soon)
4. **Medium-Priority Enhancements** (nice to have)
5. **Low-Priority Nice-to-Haves** (future consideration)
6. **Specific Code Changes** (with file paths and descriptions)
7. **Recommended Next Experiments** (follow-up tests to run)
`

  return prompt
}

// =============================================================================
// Helper Functions
// =============================================================================

function getStatusEmoji(status: string): string {
  const emojis: Record<string, string> = {
    success: '✅',
    partial: '⚠️',
    failed: '❌',
    timeout: '⏱️',
    error: '💥',
  }
  return emojis[status] || '❓'
}

async function ensureDir(dir: string): Promise<void> {
  try {
    await fs.promises.mkdir(dir, { recursive: true })
  } catch {
    // Already exists
  }
}

async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.promises.writeFile(filePath, content, 'utf-8')
}

async function readFile(filePath: string): Promise<string | null> {
  try {
    return await fs.promises.readFile(filePath, 'utf-8')
  } catch {
    return null
  }
}

// =============================================================================
// Static Utility Functions
// =============================================================================

/**
 * Load experiment by ID
 */
export async function loadExperiment(experimentId: string): Promise<ExperimentResult | null> {
  const resultPath = path.join(EXPERIMENTS_DIR, experimentId, 'result.json')
  const content = await readFile(resultPath)
  return content ? JSON.parse(content) : null
}

/**
 * List all experiments
 */
export async function listExperiments(): Promise<StoredExperiment[]> {
  const indexPath = path.join(EXPERIMENTS_DIR, INDEX_FILE)
  const content = await readFile(indexPath)
  if (!content) return []
  const index: ExperimentIndex = JSON.parse(content)
  return index.experiments
}

/**
 * Load experiment index
 */
export async function loadExperimentIndex(): Promise<ExperimentIndex> {
  const indexPath = path.join(EXPERIMENTS_DIR, INDEX_FILE)
  const content = await readFile(indexPath)
  if (!content) return { experiments: [], lastUpdated: Date.now() }
  return JSON.parse(content)
}

/**
 * Delete experiment by ID
 */
export async function deleteExperiment(experimentId: string): Promise<boolean> {
  const experimentDir = path.join(EXPERIMENTS_DIR, experimentId)
  try {
    await fs.promises.rm(experimentDir, { recursive: true, force: true })

    // Update index
    const indexPath = path.join(EXPERIMENTS_DIR, INDEX_FILE)
    const content = await readFile(indexPath)
    if (content) {
      const index: ExperimentIndex = JSON.parse(content)
      index.experiments = index.experiments.filter(e => e.id !== experimentId)
      index.lastUpdated = Date.now()
      await writeFile(indexPath, JSON.stringify(index, null, 2))
    }

    return true
  } catch {
    return false
  }
}

export { ExperimentLogger as default }
