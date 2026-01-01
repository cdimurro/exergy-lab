#!/usr/bin/env node

/**
 * Context Validation Script
 *
 * Validates the session context files (ACTIVE.md and HANDOFF.md) for:
 * - Required sections present
 * - Timestamp freshness (warns if >2 hours stale)
 * - Structural integrity
 *
 * Usage: node .claude/scripts/validate-context.js
 * Exit codes: 0 = pass, 1 = fail
 */

const fs = require('fs')
const path = require('path')

// ============================================================================
// Configuration
// ============================================================================

const BASE_PATH = process.cwd()
const ACTIVE_PATH = path.join(BASE_PATH, '.claude/session/ACTIVE.md')
const HANDOFF_PATH = path.join(BASE_PATH, '.claude/session/HANDOFF.md')
const INDEX_PATH = path.join(BASE_PATH, '.claude/context/index.md')

const STALE_THRESHOLD_HOURS = 2
const REQUIRED_ACTIVE_SECTIONS = [
  'Session Metadata',
  'Current Task',
  'Test Status',
]

const REQUIRED_METADATA_FIELDS = [
  'Session ID',
  'Started',
  'Last Updated',
  'Branch',
]

// ============================================================================
// Validation Functions
// ============================================================================

function validateFileExists(filePath, name) {
  if (!fs.existsSync(filePath)) {
    return { valid: false, error: `${name} not found at: ${filePath}` }
  }
  return { valid: true }
}

function validateSections(content, requiredSections, fileName) {
  const errors = []

  for (const section of requiredSections) {
    const regex = new RegExp(`##\\s*${section}`, 'i')
    if (!regex.test(content)) {
      errors.push(`Missing required section: "${section}"`)
    }
  }

  return errors.length > 0
    ? { valid: false, errors, fileName }
    : { valid: true, fileName }
}

function validateMetadataFields(content, requiredFields) {
  const errors = []

  for (const field of requiredFields) {
    const regex = new RegExp(`\\*\\*${field}:\\*\\*\\s*\\S+`, 'i')
    if (!regex.test(content)) {
      errors.push(`Missing or empty metadata field: "${field}"`)
    }
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true }
}

function validateTimestampFreshness(content) {
  const warnings = []

  // Extract Last Updated timestamp
  const lastUpdatedMatch = content.match(/Last Updated:\*?\*?\s*(\d{4}-\d{2}-\d{2}T[\d:.]+Z?)/i)

  if (!lastUpdatedMatch) {
    warnings.push('Could not find Last Updated timestamp')
    return { warnings }
  }

  try {
    const lastUpdated = new Date(lastUpdatedMatch[1])
    const now = new Date()
    const hoursSince = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60)

    if (hoursSince > STALE_THRESHOLD_HOURS) {
      warnings.push(
        `ACTIVE.md is ${hoursSince.toFixed(1)} hours stale (threshold: ${STALE_THRESHOLD_HOURS}h)`
      )
    }
  } catch (e) {
    warnings.push(`Invalid timestamp format: ${lastUpdatedMatch[1]}`)
  }

  return { warnings }
}

function validateTaskStatus(content) {
  const errors = []
  const warnings = []

  // Check for status field
  const statusMatch = content.match(/\*\*Status:\*\*\s*(\S+)/i)
  if (!statusMatch) {
    errors.push('Missing task status')
  } else {
    const validStatuses = ['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'HANDED_OFF']
    if (!validStatuses.includes(statusMatch[1])) {
      warnings.push(`Unknown task status: "${statusMatch[1]}"`)
    }
  }

  // Check for empty task breakdown
  const breakdownMatch = content.match(/### Task Breakdown[\s\S]*?(?=###|##|$)/)
  if (breakdownMatch) {
    const hasItems = /^\d+\.\s*\[[ x]\]/m.test(breakdownMatch[0])
    if (!hasItems) {
      warnings.push('Task breakdown has no items')
    }
  }

  return { errors, warnings }
}

function validateTestStatus(content) {
  const warnings = []

  const testSection = content.match(/## Test Status[\s\S]*?(?=##|$)/)?.[0] || ''

  const tests = ['Build', 'TypeScript', 'Lint']
  for (const test of tests) {
    const regex = new RegExp(`${test}:\\s*(PASSING|FAILING|UNKNOWN)`, 'i')
    if (!regex.test(testSection)) {
      warnings.push(`Missing or invalid test status for: ${test}`)
    }
  }

  return { warnings }
}

function validateContextIndex() {
  const errors = []
  const warnings = []

  if (!fs.existsSync(INDEX_PATH)) {
    warnings.push('Context index not found (optional)')
    return { errors, warnings }
  }

  const content = fs.readFileSync(INDEX_PATH, 'utf-8')

  // Check for module definitions
  const moduleMatches = content.match(/\|\s*\[[\w-]+\.md\]/g)
  if (!moduleMatches || moduleMatches.length === 0) {
    warnings.push('Context index has no module entries')
  }

  return { errors, warnings }
}

// ============================================================================
// Main Validation Runner
// ============================================================================

function runValidation() {
  console.log('Context Validation\n')
  console.log('==================\n')

  const results = {
    errors: [],
    warnings: [],
    passed: true,
  }

  // 1. Check ACTIVE.md exists
  console.log('Checking ACTIVE.md...')
  const activeExists = validateFileExists(ACTIVE_PATH, 'ACTIVE.md')
  if (!activeExists.valid) {
    results.errors.push(activeExists.error)
    results.passed = false
    console.log(`  ERROR: ${activeExists.error}\n`)
  } else {
    console.log('  File exists\n')

    // Read and validate ACTIVE.md content
    const activeContent = fs.readFileSync(ACTIVE_PATH, 'utf-8')

    // Check required sections
    const sectionsResult = validateSections(
      activeContent,
      REQUIRED_ACTIVE_SECTIONS,
      'ACTIVE.md'
    )
    if (!sectionsResult.valid) {
      results.errors.push(...sectionsResult.errors)
      results.passed = false
      sectionsResult.errors.forEach((e) => console.log(`  ERROR: ${e}`))
    } else {
      console.log('  Required sections present')
    }

    // Check metadata fields
    const metadataResult = validateMetadataFields(activeContent, REQUIRED_METADATA_FIELDS)
    if (!metadataResult.valid) {
      results.errors.push(...metadataResult.errors)
      results.passed = false
      metadataResult.errors.forEach((e) => console.log(`  ERROR: ${e}`))
    } else {
      console.log('  Metadata fields valid')
    }

    // Check timestamp freshness
    const freshnessResult = validateTimestampFreshness(activeContent)
    if (freshnessResult.warnings.length > 0) {
      results.warnings.push(...freshnessResult.warnings)
      freshnessResult.warnings.forEach((w) => console.log(`  WARN: ${w}`))
    } else {
      console.log('  Timestamp is fresh')
    }

    // Check task status
    const taskResult = validateTaskStatus(activeContent)
    if (taskResult.errors.length > 0) {
      results.errors.push(...taskResult.errors)
      results.passed = false
      taskResult.errors.forEach((e) => console.log(`  ERROR: ${e}`))
    }
    if (taskResult.warnings.length > 0) {
      results.warnings.push(...taskResult.warnings)
      taskResult.warnings.forEach((w) => console.log(`  WARN: ${w}`))
    }

    // Check test status
    const testResult = validateTestStatus(activeContent)
    if (testResult.warnings.length > 0) {
      results.warnings.push(...testResult.warnings)
      testResult.warnings.forEach((w) => console.log(`  WARN: ${w}`))
    }
  }

  console.log('')

  // 2. Check context index (optional)
  console.log('Checking context index...')
  const indexResult = validateContextIndex()
  if (indexResult.warnings.length > 0) {
    results.warnings.push(...indexResult.warnings)
    indexResult.warnings.forEach((w) => console.log(`  WARN: ${w}`))
  } else {
    console.log('  Context index valid')
  }

  console.log('')

  // 3. Summary
  console.log('==================')
  console.log('Summary')
  console.log('==================\n')

  if (results.errors.length > 0) {
    console.log(`Errors: ${results.errors.length}`)
    results.errors.forEach((e) => console.log(`  - ${e}`))
  }

  if (results.warnings.length > 0) {
    console.log(`Warnings: ${results.warnings.length}`)
    results.warnings.forEach((w) => console.log(`  - ${w}`))
  }

  console.log('')

  if (results.passed && results.errors.length === 0) {
    console.log('RESULT: PASSED')
    if (results.warnings.length > 0) {
      console.log(`(with ${results.warnings.length} warning(s))`)
    }
    process.exit(0)
  } else {
    console.log('RESULT: FAILED')
    process.exit(1)
  }
}

// ============================================================================
// Run
// ============================================================================

runValidation()
