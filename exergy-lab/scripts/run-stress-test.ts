#!/usr/bin/env npx tsx

/**
 * CLI Script for Running Stress Tests
 *
 * Usage:
 *   npx tsx scripts/run-stress-test.ts [options]
 *
 * Options:
 *   --mode=quick|full|category|specific  Test mode (default: quick)
 *   --category=basic|standard|technical|edge|domain  Category for mode=category
 *   --ids=A1,B2,C3  Comma-separated prompt IDs for mode=specific
 *   --concurrency=2  Number of parallel discoveries (1-3)
 *   --timeout=300000  Timeout per discovery in ms (default: 5 min)
 *   --name="My Test"  Custom experiment name
 *   --export  Export results to all formats
 *
 * Examples:
 *   npx tsx scripts/run-stress-test.ts --mode=quick
 *   npx tsx scripts/run-stress-test.ts --mode=full --concurrency=3
 *   npx tsx scripts/run-stress-test.ts --mode=category --category=technical
 *   npx tsx scripts/run-stress-test.ts --mode=specific --ids=A1,B3,C2
 */

import { StressTestRunner } from '../src/lib/experiments/stress-test-runner'
import { ExperimentLogger } from '../src/lib/experiments/experiment-logger'
import { ExperimentAnalyzer } from '../src/lib/experiments/experiment-analyzer'
import {
  ALL_TEST_PROMPTS,
  getPromptsByCategory,
  getPromptsByIds,
  getQuickTestSet,
} from '../src/lib/experiments/test-prompts'
import type { PromptCategory } from '../src/lib/experiments/types'

// Parse command line arguments
function parseArgs(): {
  mode: 'quick' | 'full' | 'category' | 'specific'
  category?: PromptCategory
  ids?: string[]
  concurrency: number
  timeout: number
  name?: string
  export: boolean
} {
  const args = process.argv.slice(2)
  const parsed: any = {
    mode: 'quick',
    concurrency: 2,
    timeout: 5 * 60 * 1000,
    export: false,
  }

  for (const arg of args) {
    if (arg.startsWith('--mode=')) {
      parsed.mode = arg.split('=')[1]
    } else if (arg.startsWith('--category=')) {
      parsed.category = arg.split('=')[1]
    } else if (arg.startsWith('--ids=')) {
      parsed.ids = arg.split('=')[1].split(',')
    } else if (arg.startsWith('--concurrency=')) {
      parsed.concurrency = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--timeout=')) {
      parsed.timeout = parseInt(arg.split('=')[1], 10)
    } else if (arg.startsWith('--name=')) {
      parsed.name = arg.split('=')[1]
    } else if (arg === '--export') {
      parsed.export = true
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
  }

  return parsed
}

function printHelp() {
  console.log(`
Discovery Engine Stress Test CLI

Usage:
  npx tsx scripts/run-stress-test.ts [options]

Options:
  --mode=MODE       Test mode: quick, full, category, specific (default: quick)
  --category=CAT    Category for mode=category: basic, standard, technical, edge, domain
  --ids=IDS         Comma-separated prompt IDs for mode=specific (e.g., A1,B2,C3)
  --concurrency=N   Number of parallel discoveries, 1-3 (default: 2)
  --timeout=MS      Timeout per discovery in milliseconds (default: 300000 / 5 min)
  --name=NAME       Custom experiment name
  --export          Export results to JSON, Markdown, CSV, and AI prompt
  --help, -h        Show this help message

Modes:
  quick     Run 5 prompts (one from each category) - ~15 min
  full      Run all 25 prompts - ~45 min
  category  Run all prompts from a specific category - ~15 min
  specific  Run specific prompts by ID - varies

Prompt Categories:
  basic      A1-A5: Basic/vague queries (difficulty 1-2)
  standard   B1-B5: Standard research queries (difficulty 2-3)
  technical  C1-C5: Professional-grade technical prompts (difficulty 4-5)
  edge       D1-D5: Edge cases and stress tests (difficulty 4-5)
  domain     E1-E5: Domain-specific deep dives (difficulty 4-5)

Examples:
  npx tsx scripts/run-stress-test.ts --mode=quick
  npx tsx scripts/run-stress-test.ts --mode=full --concurrency=3 --export
  npx tsx scripts/run-stress-test.ts --mode=category --category=technical
  npx tsx scripts/run-stress-test.ts --mode=specific --ids=A1,B3,C2,D1
`)
}

async function main() {
  const args = parseArgs()

  console.log('\n' + '='.repeat(60))
  console.log('Discovery Engine Stress Test CLI')
  console.log('='.repeat(60) + '\n')

  // Determine prompts based on mode
  let prompts = ALL_TEST_PROMPTS
  let modeName = 'Full'

  switch (args.mode) {
    case 'quick':
      prompts = getQuickTestSet()
      modeName = 'Quick'
      break
    case 'category':
      if (!args.category) {
        console.error('Error: --category is required for mode=category')
        process.exit(1)
      }
      prompts = getPromptsByCategory(args.category)
      modeName = `Category: ${args.category}`
      break
    case 'specific':
      if (!args.ids || args.ids.length === 0) {
        console.error('Error: --ids is required for mode=specific')
        process.exit(1)
      }
      prompts = getPromptsByIds(args.ids)
      modeName = `Specific: ${args.ids.join(', ')}`
      break
    case 'full':
      // Use all prompts
      break
    default:
      console.error(`Error: Invalid mode "${args.mode}"`)
      process.exit(1)
  }

  if (prompts.length === 0) {
    console.error('Error: No prompts match the specified criteria')
    process.exit(1)
  }

  console.log(`Mode: ${modeName}`)
  console.log(`Prompts: ${prompts.length}`)
  console.log(`Concurrency: ${args.concurrency}`)
  console.log(`Timeout: ${args.timeout / 1000}s per discovery`)
  console.log(`Estimated duration: ${Math.ceil(prompts.length * 3 / args.concurrency)} minutes\n`)

  // Create and run experiment
  const runner = new StressTestRunner({
    name: args.name || `CLI ${modeName} Test - ${new Date().toISOString()}`,
    prompts,
    concurrency: Math.min(Math.max(args.concurrency, 1), 3),
    timeoutPerDiscovery: args.timeout,
    captureFullLogs: true,
    stopOnCriticalFailure: false,
  })

  // Set up progress tracking
  runner.setProgressCallback((progress) => {
    const pct = ((progress.completed / progress.total) * 100).toFixed(0)
    const elapsed = (progress.elapsedMs / 1000 / 60).toFixed(1)
    process.stdout.write(`\r[${pct}%] ${progress.completed}/${progress.total} completed | ${elapsed}m elapsed | Running: ${progress.currentPrompts.join(', ')}   `)
  })

  console.log('Starting experiment...\n')

  try {
    const result = await runner.run()

    console.log('\n')

    // Print summary
    const summary = result.summary!
    console.log('='.repeat(60))
    console.log('EXPERIMENT COMPLETE')
    console.log('='.repeat(60))
    console.log('')
    console.log(`Experiment ID: ${result.experimentId}`)
    console.log(`Duration: ${(result.totalDuration / 1000 / 60).toFixed(1)} minutes`)
    console.log('')
    console.log('Results:')
    console.log(`  Success:  ${summary.success}/${summary.totalPrompts} (${(summary.successRate * 100).toFixed(1)}%)`)
    console.log(`  Partial:  ${summary.partial}/${summary.totalPrompts} (${(summary.partialSuccessRate * 100).toFixed(1)}%)`)
    console.log(`  Failed:   ${summary.failed}/${summary.totalPrompts} (${(summary.failureRate * 100).toFixed(1)}%)`)
    console.log(`  Timeout:  ${summary.timeout}/${summary.totalPrompts} (${(summary.timeoutRate * 100).toFixed(1)}%)`)
    console.log('')
    console.log(`Average Score: ${summary.avgScore.toFixed(2)}`)
    console.log(`Average Duration: ${(summary.avgDuration / 1000).toFixed(1)}s`)
    console.log('')

    // Analyze results
    const analyzer = new ExperimentAnalyzer(result)
    const analysis = analyzer.analyze()

    // Print issues
    if (analysis.issues.length > 0) {
      console.log('Issues Found:')
      for (const issue of analysis.issues) {
        const emoji = {
          critical: '🔴',
          high: '🟠',
          medium: '🟡',
          low: '🟢',
        }[issue.severity]
        console.log(`  ${emoji} [${issue.severity.toUpperCase()}] ${issue.description}`)
      }
      console.log('')
    }

    // Export if requested
    if (args.export) {
      console.log('Exporting results...')
      const logger = new ExperimentLogger(result.experimentId)
      const paths = await logger.exportAll(result, analysis)
      console.log(`  JSON: ${paths.json}`)
      console.log(`  Markdown: ${paths.markdown}`)
      console.log(`  CSV: ${paths.csv}`)
      console.log(`  AI Prompt: ${paths.aiPrompt}`)
      console.log('')
    } else {
      // Save just the JSON result
      const logger = new ExperimentLogger(result.experimentId)
      await logger.saveResult(result)
      console.log(`Results saved to: experiments/results/${result.experimentId}/`)
      console.log('Use --export flag to generate Markdown, CSV, and AI analysis prompts')
      console.log('')
    }

    console.log('Done!')

  } catch (error) {
    console.error('\nExperiment failed:', error)
    process.exit(1)
  }
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
