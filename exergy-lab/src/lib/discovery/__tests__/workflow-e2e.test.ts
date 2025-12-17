/**
 * End-to-End Workflow Test
 *
 * Tests the complete workflow pipeline:
 * 1. Research phase - Multi-source search
 * 2. Hypothesis generation
 * 3. Experiment design
 * 4. Simulation execution
 * 5. TEA calculations
 * 6. Result validation
 *
 * Run with: npx tsx src/lib/discovery/__tests__/workflow-e2e.test.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local from the project root
config({ path: resolve(__dirname, '../../../../.env.local') })

// Example user input from discovery page
const EXAMPLE_USER_INPUT = {
  query: 'Develop a novel perovskite solar cell with efficiency above 25% using sustainable materials',
  domains: ['solar-energy', 'materials-science'] as const,
  goals: [
    'Identify promising perovskite compositions',
    'Evaluate stability and efficiency trade-offs',
    'Design experiments to validate performance',
    'Calculate economic viability',
  ],
}

async function runWorkflowTest() {
  console.log('\n' + '='.repeat(80))
  console.log('🧪 EXERGY LAB - END-TO-END WORKFLOW TEST')
  console.log('='.repeat(80))
  console.log('\n📝 User Input:')
  console.log(`   Query: "${EXAMPLE_USER_INPUT.query}"`)
  console.log(`   Domains: ${EXAMPLE_USER_INPUT.domains.join(', ')}`)
  console.log(`   Goals: ${EXAMPLE_USER_INPUT.goals.length} goals`)

  const results: Record<string, any> = {}
  const errors: string[] = []

  // ============================================================================
  // PHASE 1: Research - Multi-source Search
  // ============================================================================
  console.log('\n' + '-'.repeat(80))
  console.log('📚 PHASE 1: Research - Multi-source Search')
  console.log('-'.repeat(80))

  try {
    const { SearchOrchestrator } = await import('../search-apis')
    const orchestrator = new SearchOrchestrator()

    console.log('\n🔍 Searching across all data sources...')
    const startTime = Date.now()

    const searchResults = await orchestrator.searchAllSources({
      description: EXAMPLE_USER_INPUT.query,
      domains: EXAMPLE_USER_INPUT.domains as any,
      goals: EXAMPLE_USER_INPUT.goals,
    })

    console.log(`\n✅ Research complete in ${Date.now() - startTime}ms`)
    console.log(`   Total sources: ${searchResults.totalSources}`)
    console.log(`   Papers: ${searchResults.papers}`)
    console.log(`   Patents: ${searchResults.patents}`)
    console.log(`   Reports: ${searchResults.reports}`)
    console.log(`   News: ${searchResults.news}`)
    console.log(`   Datasets: ${searchResults.datasets || 0}`)

    if (searchResults.bySource) {
      console.log('\n   Source breakdown:')
      for (const [source, data] of Object.entries(searchResults.bySource)) {
        const status = (data as any).success ? '✓' : '✗'
        console.log(`     ${status} ${source}: ${(data as any).count} results`)
      }
    }

    // Show sample papers
    if (searchResults.sources.length > 0) {
      console.log('\n   Sample papers:')
      searchResults.sources.slice(0, 3).forEach((s, i) => {
        console.log(`     ${i + 1}. "${s.title?.slice(0, 60)}..."`)
        console.log(`        Score: ${s.relevanceScore}, Type: ${s.type}`)
      })
    }

    results.research = searchResults
  } catch (error) {
    console.error('❌ Research phase failed:', error)
    errors.push(`Research: ${error}`)
  }

  // ============================================================================
  // PHASE 2: Hypothesis Generation
  // ============================================================================
  console.log('\n' + '-'.repeat(80))
  console.log('💡 PHASE 2: Hypothesis Generation')
  console.log('-'.repeat(80))

  try {
    const { generateHypothesesTool } = await import('../../ai/tools/implementations')

    // Prepare research findings for hypothesis generation
    const researchFindings = results.research?.sources?.slice(0, 5).map((s: any) => ({
      title: s.title,
      keyInsights: [s.abstract?.slice(0, 200) || 'No abstract available'],
      gaps: ['Efficiency improvements needed', 'Stability challenges'],
    })) || []

    if (researchFindings.length === 0) {
      // Create mock findings if no research results
      researchFindings.push({
        title: 'Perovskite Solar Cell Research',
        keyInsights: ['High efficiency potential', 'Stability challenges'],
        gaps: ['Long-term stability', 'Lead-free alternatives'],
      })
    }

    console.log(`\n🧠 Generating hypotheses from ${researchFindings.length} findings...`)

    const hypothesesResult = await generateHypothesesTool.handler({
      researchFindings,
      domain: 'solar-energy',
      goals: EXAMPLE_USER_INPUT.goals,
      constraints: {
        maxHypotheses: 3,
        focusAreas: ['efficiency', 'stability', 'cost'],
      },
    })

    console.log(`\n✅ Generated ${hypothesesResult.hypotheses.length} hypotheses`)

    hypothesesResult.hypotheses.forEach((h: any, i: number) => {
      console.log(`\n   Hypothesis ${i + 1}: ${h.statement?.slice(0, 80)}...`)
      console.log(`     Feasibility: ${h.feasibilityScore}/100`)
      console.log(`     Novelty: ${h.noveltyScore}/100`)
      console.log(`     Impact: ${h.impactScore}/100`)
    })

    results.hypotheses = hypothesesResult
  } catch (error) {
    console.error('❌ Hypothesis generation failed:', error)
    errors.push(`Hypothesis: ${error}`)
  }

  // ============================================================================
  // PHASE 3: Experiment Design
  // ============================================================================
  console.log('\n' + '-'.repeat(80))
  console.log('🔬 PHASE 3: Experiment Design')
  console.log('-'.repeat(80))

  try {
    const { designExperimentTool } = await import('../../ai/tools/implementations')

    const hypothesis = results.hypotheses?.hypotheses?.[0]
    const experimentGoal = hypothesis?.statement || 'Test perovskite solar cell efficiency'

    console.log(`\n📋 Designing experiment for: "${experimentGoal.slice(0, 60)}..."`)

    const experimentResult = await designExperimentTool.handler({
      goal: {
        description: experimentGoal,
        objectives: ['Measure power conversion efficiency', 'Assess long-term stability'],
        domain: 'solar-energy',
      },
      referenceResearch: results.research?.sources?.slice(0, 2).map((s: any) => ({
        title: s.title,
        methodology: s.abstract?.slice(0, 150) || 'Standard characterization',
      })) || [],
      constraints: {
        budget: 50000,
        timeline: '3 months',
        safetyLevel: 'standard',
      },
    })

    console.log(`\n✅ Experiment designed`)
    console.log(`   Title: ${experimentResult.protocol?.title}`)
    console.log(`   Difficulty: ${experimentResult.protocol?.difficulty}`)
    console.log(`   Est. Cost: $${experimentResult.protocol?.estimatedCost}`)
    console.log(`   Duration: ${experimentResult.protocol?.duration}`)
    console.log(`   Materials: ${experimentResult.protocol?.materials?.length || 0} items`)
    console.log(`   Procedure steps: ${experimentResult.protocol?.procedure?.length || 0}`)
    console.log(`   Confidence: ${experimentResult.confidence}%`)

    results.experiment = experimentResult
  } catch (error) {
    console.error('❌ Experiment design failed:', error)
    errors.push(`Experiment: ${error}`)
  }

  // ============================================================================
  // PHASE 4: Simulation
  // ============================================================================
  console.log('\n' + '-'.repeat(80))
  console.log('⚡ PHASE 4: Simulation')
  console.log('-'.repeat(80))

  try {
    const { runSimulationTool } = await import('../../ai/tools/implementations')

    console.log('\n🔄 Running solar PV simulation...')
    const startTime = Date.now()

    const simResult = await runSimulationTool.handler({
      tier: 'tier1',
      simulationType: 'solar_pv',
      parameters: {
        capacity: 10, // 10 kW system
        panelEfficiency: 0.25, // 25% target efficiency
        latitude: 35,
        irradiance: 5.5, // kWh/m²/day
        ambientTemperature: 25,
        systemLosses: 0.14,
      },
      timeHorizon: 8760, // 1 year
    })

    console.log(`\n✅ Simulation complete in ${simResult.executionTimeMs}ms`)
    console.log(`   Success: ${simResult.success}`)
    console.log(`   Converged: ${simResult.convergenceMetrics?.converged}`)

    if (simResult.outputs) {
      console.log('\n   Outputs:')
      simResult.outputs.forEach((o: any) => {
        console.log(`     ${o.name}: ${o.value} ${o.unit} (confidence: ${o.confidence}%)`)
      })
    }

    if (simResult.monthlyProduction) {
      console.log('\n   Monthly production (kWh):')
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      simResult.monthlyProduction.forEach((m: any, i: number) => {
        const bar = '█'.repeat(Math.round(m.production / 500))
        console.log(`     ${months[i]}: ${bar} ${m.production}`)
      })
    }

    results.simulation = simResult
  } catch (error) {
    console.error('❌ Simulation failed:', error)
    errors.push(`Simulation: ${error}`)
  }

  // ============================================================================
  // PHASE 5: TEA Calculations
  // ============================================================================
  console.log('\n' + '-'.repeat(80))
  console.log('💰 PHASE 5: Techno-Economic Analysis')
  console.log('-'.repeat(80))

  try {
    const { calculateMetricsTool } = await import('../../ai/tools/implementations')

    // Get energy production from simulation
    const annualProduction = results.simulation?.outputs?.find(
      (o: any) => o.name === 'Annual Production'
    )?.value || 15000

    console.log(`\n📊 Calculating TEA metrics...`)
    console.log(`   Using annual production: ${annualProduction} kWh`)

    const teaResult = await calculateMetricsTool.handler({
      type: 'tea',
      data: {
        capitalCost: 25000, // $25k for 10 kW system
        operatingCost: 500, // $500/year maintenance
        annualEnergyProduction: annualProduction,
        energyPrice: 0.12, // $0.12/kWh
      },
      parameters: {
        discountRate: 0.08,
        projectLifetime: 25,
      },
    })

    console.log(`\n✅ TEA Analysis complete`)
    console.log(`   NPV: $${teaResult.npv?.toLocaleString()}`)
    console.log(`   IRR: ${teaResult.irrPercentage}%`)
    console.log(`   Simple Payback: ${teaResult.simplePaybackPeriod} years`)
    console.log(`   LCOE: $${teaResult.lcoe}/kWh`)
    console.log(`   ROI: ${teaResult.roi}%`)
    console.log(`   Is Viable: ${teaResult.isViable ? 'Yes ✓' : 'No ✗'}`)

    if (teaResult.sensitivityAnalysis) {
      console.log('\n   Sensitivity Analysis (LCOE variation):')
      for (const [param, values] of Object.entries(teaResult.sensitivityAnalysis)) {
        const v = values as any
        console.log(`     ${param}: $${v.low?.toFixed(4)} - $${v.high?.toFixed(4)}`)
      }
    }

    results.tea = teaResult
  } catch (error) {
    console.error('❌ TEA calculation failed:', error)
    errors.push(`TEA: ${error}`)
  }

  // ============================================================================
  // PHASE 6: Result Validation
  // ============================================================================
  console.log('\n' + '-'.repeat(80))
  console.log('✓ PHASE 6: Result Validation')
  console.log('-'.repeat(80))

  try {
    const { validateSimulationResults, validateTEAResults, quickPlausibilityCheck } = await import('../result-validator')

    console.log('\n🔍 Validating results against scientific benchmarks...')

    // Validate simulation results
    if (results.simulation) {
      const simValidation = validateSimulationResults(
        [results.simulation],
        'solar-energy'
      )

      console.log(`\n   Simulation Validation:`)
      console.log(`     Valid: ${simValidation.isValid ? 'Yes ✓' : 'No ✗'}`)
      console.log(`     Score: ${simValidation.overallScore}/100`)
      console.log(`     Checks: ${simValidation.checks.filter(c => c.passed).length}/${simValidation.checks.length} passed`)

      if (simValidation.warnings.length > 0) {
        console.log(`     Warnings:`)
        simValidation.warnings.forEach(w => {
          console.log(`       ⚠ ${w.message}`)
        })
      }

      results.simValidation = simValidation
    }

    // Validate TEA results
    if (results.tea) {
      const teaValidation = validateTEAResults(results.tea, 'solar-energy')

      console.log(`\n   TEA Validation:`)
      console.log(`     Valid: ${teaValidation.isValid ? 'Yes ✓' : 'No ✗'}`)
      console.log(`     Score: ${teaValidation.overallScore}/100`)
      console.log(`     Checks: ${teaValidation.checks.filter(c => c.passed).length}/${teaValidation.checks.length} passed`)

      if (teaValidation.recommendations.length > 0) {
        console.log(`     Recommendations:`)
        teaValidation.recommendations.forEach(r => {
          console.log(`       → ${r}`)
        })
      }

      results.teaValidation = teaValidation
    }

    // Quick plausibility checks
    console.log('\n   Quick Plausibility Checks:')
    const checksToRun = [
      { param: 'efficiency', value: 0.25, domain: 'solar-energy' },
      { param: 'capacity factor', value: 0.18, domain: 'solar-energy' },
      { param: 'LCOE', value: results.tea?.lcoe || 0.08, domain: 'solar-energy' },
    ]

    checksToRun.forEach(check => {
      const result = quickPlausibilityCheck(check.param, check.value, check.domain)
      console.log(`     ${check.param}: ${check.value} → ${result.plausible ? '✓ Plausible' : `✗ ${result.reason}`}`)
    })

  } catch (error) {
    console.error('❌ Validation failed:', error)
    errors.push(`Validation: ${error}`)
  }

  // ============================================================================
  // PHASE 7: Quality Gate Assessment
  // ============================================================================
  console.log('\n' + '-'.repeat(80))
  console.log('🚪 PHASE 7: Quality Gate Assessment')
  console.log('-'.repeat(80))

  try {
    const { evaluateQuality, shouldIterate } = await import('../quality-gates')
    const { extractKeyFindings } = await import('../workflow-context')

    // Create research findings structure
    const sources = results.research?.sources || []
    const keyFindings = extractKeyFindings(sources)

    const researchFindings = {
      sources,
      keyFindings,
      technologicalGaps: ['Stability improvements', 'Cost reduction'],
      emergingTrends: ['Lead-free perovskites', 'Tandem cells'],
      controversies: [],
      establishedFacts: [],
      summary: `Found ${sources.length} sources on perovskite solar cells`,
    }

    console.log('\n📋 Evaluating quality gates...')

    // Research quality
    const researchQuality = evaluateQuality('research', researchFindings)
    console.log(`\n   Research Phase:`)
    console.log(`     Score: ${researchQuality.overallScore}/100`)
    console.log(`     Passed: ${researchQuality.passed ? 'Yes ✓' : 'No ✗'}`)

    // Check if iteration needed
    const iterationCheck = shouldIterate('research', researchFindings, 1)
    console.log(`     Needs Iteration: ${iterationCheck.iterate ? `Yes (${iterationCheck.reason})` : 'No'}`)

    // Simulation quality
    if (results.simulation) {
      const simQuality = evaluateQuality('simulation', [results.simulation])
      console.log(`\n   Simulation Phase:`)
      console.log(`     Score: ${simQuality.overallScore}/100`)
      console.log(`     Passed: ${simQuality.passed ? 'Yes ✓' : 'No ✗'}`)
    }

    results.qualityGates = {
      research: researchQuality,
    }

  } catch (error) {
    console.error('❌ Quality gate assessment failed:', error)
    errors.push(`Quality Gates: ${error}`)
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n' + '='.repeat(80))
  console.log('📊 WORKFLOW TEST SUMMARY')
  console.log('='.repeat(80))

  const phases = [
    { name: 'Research', success: !!results.research },
    { name: 'Hypothesis', success: !!results.hypotheses },
    { name: 'Experiment', success: !!results.experiment },
    { name: 'Simulation', success: !!results.simulation },
    { name: 'TEA', success: !!results.tea },
    { name: 'Validation', success: !!results.simValidation || !!results.teaValidation },
    { name: 'Quality Gates', success: !!results.qualityGates },
  ]

  console.log('\n   Phase Results:')
  phases.forEach(p => {
    console.log(`     ${p.success ? '✅' : '❌'} ${p.name}`)
  })

  const successCount = phases.filter(p => p.success).length
  const totalPhases = phases.length

  console.log(`\n   Overall: ${successCount}/${totalPhases} phases completed`)
  console.log(`   Success Rate: ${Math.round((successCount / totalPhases) * 100)}%`)

  if (errors.length > 0) {
    console.log('\n   Errors encountered:')
    errors.forEach(e => console.log(`     ❌ ${e}`))
  }

  // Key metrics summary
  if (results.simulation && results.tea) {
    console.log('\n   Key Metrics:')
    console.log(`     Annual Production: ${results.simulation.outputs?.find((o: any) => o.name === 'Annual Production')?.value?.toLocaleString()} kWh`)
    console.log(`     Capacity Factor: ${results.simulation.outputs?.find((o: any) => o.name === 'Capacity Factor')?.value}%`)
    console.log(`     LCOE: $${results.tea.lcoe}/kWh`)
    console.log(`     NPV: $${results.tea.npv?.toLocaleString()}`)
    console.log(`     Payback: ${results.tea.simplePaybackPeriod} years`)
  }

  console.log('\n' + '='.repeat(80))
  console.log('🏁 TEST COMPLETE')
  console.log('='.repeat(80) + '\n')

  return {
    success: successCount === totalPhases,
    successCount,
    totalPhases,
    results,
    errors,
  }
}

// Run the test
runWorkflowTest()
  .then(result => {
    process.exit(result.success ? 0 : 1)
  })
  .catch(error => {
    console.error('Test failed with error:', error)
    process.exit(1)
  })
