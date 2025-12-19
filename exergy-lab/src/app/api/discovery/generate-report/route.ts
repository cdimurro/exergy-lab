/**
 * AI Report Generation API
 *
 * Generates comprehensive, detailed reports from discovery results using AI.
 * Creates multi-section reports with executive summaries, detailed analysis,
 * and actionable recommendations.
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/ai/model-router'

// ============================================================================
// Types
// ============================================================================

interface PhaseData {
  phase: string
  finalOutput: any
  finalScore: number
  passed: boolean
  iterations: any[]
  durationMs: number
}

interface ReportRequest {
  discoveryId: string
  query: string
  domain: string
  overallScore: number
  discoveryQuality: string
  phases: PhaseData[]
  recommendations: string[]
  totalDuration: number
  includeRawData?: boolean
  reportStyle?: 'executive' | 'technical' | 'comprehensive'
}

interface ReportSection {
  title: string
  content: string
  subsections?: { title: string; content: string }[]
}

interface GeneratedReport {
  title: string
  executiveSummary: string
  sections: ReportSection[]
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

// ============================================================================
// Phase-specific report generators
// ============================================================================

async function generateResearchSection(phase: PhaseData, query: string): Promise<ReportSection> {
  const output = phase.finalOutput || {}
  const sources = output.sources || []
  const findings = output.keyFindings || []
  const gaps = output.technologicalGaps || []
  const materials = output.materialsData || []

  const prompt = `You are a scientific report writer. Generate a detailed research analysis section for a discovery report.

RESEARCH QUERY: "${query}"

RESEARCH DATA:
- Sources found: ${sources.length}
- Key findings: ${findings.length}
- Technology gaps identified: ${gaps.length}
- Materials analyzed: ${materials.length}
- Phase score: ${phase.finalScore}/10

KEY FINDINGS (summarize these):
${findings.slice(0, 8).map((f: any, i: number) => `${i + 1}. ${typeof f === 'string' ? f : f.finding || JSON.stringify(f)}`).join('\n')}

TECHNOLOGY GAPS:
${gaps.slice(0, 5).map((g: any, i: number) => `${i + 1}. ${typeof g === 'string' ? g : g.description || JSON.stringify(g)}`).join('\n')}

Generate a comprehensive research analysis with these components:
1. Overview paragraph (2-3 sentences about the research scope and approach)
2. Key Findings section (3-4 paragraphs analyzing the most important discoveries)
3. State of the Art (1-2 paragraphs on current technology landscape)
4. Research Gaps (1-2 paragraphs on identified gaps and opportunities)
5. Materials & Methods (1 paragraph on relevant materials identified)

Write in a professional scientific tone. Be specific and cite findings where relevant.
Format as markdown with ## headers for each section.`

  try {
    const content = await generateText('discovery', prompt, {
      temperature: 0.4,
      maxTokens: 2000,
      model: 'fast', // Gemini 3 Flash - fast with good quality for report generation
    })

    return {
      title: 'Research Analysis',
      content: content || generateFallbackResearchContent(phase, query),
    }
  } catch (error) {
    console.error('Failed to generate research section:', error)
    return {
      title: 'Research Analysis',
      content: generateFallbackResearchContent(phase, query),
    }
  }
}

function generateFallbackResearchContent(phase: PhaseData, query: string): string {
  const output = phase.finalOutput || {}
  const sources = output.sources || []
  const findings = output.keyFindings || []

  return `## Overview

This research phase investigated "${query}" by analyzing ${sources.length} scientific sources and extracting ${findings.length} key findings. The research achieved a score of ${phase.finalScore.toFixed(1)}/10.

## Key Findings

${findings.slice(0, 5).map((f: any, i: number) => {
  const finding = typeof f === 'string' ? f : f.finding || JSON.stringify(f)
  return `### Finding ${i + 1}\n${finding}\n`
}).join('\n')}

## Research Gaps

${(output.technologicalGaps || []).slice(0, 3).map((g: any) => {
  const gap = typeof g === 'string' ? g : g.description || JSON.stringify(g)
  return `- ${gap}`
}).join('\n') || 'No significant research gaps identified.'}
`
}

async function generateHypothesisSection(phase: PhaseData): Promise<ReportSection> {
  const hypotheses = phase.finalOutput || []
  const hypothesesArray = Array.isArray(hypotheses) ? hypotheses : (hypotheses.hypotheses || [])

  const prompt = `You are a scientific report writer. Generate a detailed hypothesis analysis section.

HYPOTHESES GENERATED: ${hypothesesArray.length}
PHASE SCORE: ${phase.finalScore}/10
ITERATIONS: ${phase.iterations?.length || 1}

HYPOTHESIS DATA:
${hypothesesArray.slice(0, 5).map((h: any, i: number) => `
Hypothesis ${i + 1}:
- Statement: ${h.statement || h.title || 'N/A'}
- Rationale: ${h.rationale || 'N/A'}
- Feasibility Score: ${h.feasibilityScore || 'N/A'}/10
- Expected Impact: ${h.expectedImpact || h.impactScore || 'N/A'}
- Required Materials: ${(h.requiredMaterials || []).join(', ') || 'Not specified'}
`).join('\n')}

Generate a comprehensive hypothesis analysis with:
1. Overview (1 paragraph on hypothesis generation approach)
2. Primary Hypotheses (detailed analysis of top 3 hypotheses - 2-3 paragraphs each)
3. Scientific Basis (1-2 paragraphs on the scientific foundations)
4. Feasibility Assessment (1 paragraph on practical implementation)
5. Potential Impact (1 paragraph on expected outcomes)

Write in a professional scientific tone. Be specific about each hypothesis.
Format as markdown with ## headers.`

  try {
    const content = await generateText('discovery', prompt, {
      temperature: 0.4,
      maxTokens: 2500,
      model: 'fast', // Gemini 3 Flash - fast with good quality for report generation
    })

    return {
      title: 'Hypothesis Analysis',
      content: content || generateFallbackHypothesisContent(phase),
    }
  } catch (error) {
    console.error('Failed to generate hypothesis section:', error)
    return {
      title: 'Hypothesis Analysis',
      content: generateFallbackHypothesisContent(phase),
    }
  }
}

function generateFallbackHypothesisContent(phase: PhaseData): string {
  const hypotheses = phase.finalOutput || []
  const hypothesesArray = Array.isArray(hypotheses) ? hypotheses : (hypotheses.hypotheses || [])

  return `## Overview

The hypothesis generation phase produced ${hypothesesArray.length} testable hypotheses with a quality score of ${phase.finalScore.toFixed(1)}/10. The hypotheses were refined over ${phase.iterations?.length || 1} iteration(s).

## Generated Hypotheses

${hypothesesArray.slice(0, 5).map((h: any, i: number) => `
### Hypothesis ${i + 1}: ${h.title || h.statement?.substring(0, 50) || 'Untitled'}

**Statement:** ${h.statement || 'N/A'}

**Rationale:** ${h.rationale || 'N/A'}

**Feasibility Score:** ${h.feasibilityScore || 'N/A'}/10

**Required Materials:** ${(h.requiredMaterials || []).join(', ') || 'Not specified'}
`).join('\n')}
`
}

async function generateExperimentSection(phase: PhaseData): Promise<ReportSection> {
  const experiments = phase.finalOutput || []
  const experimentsArray = Array.isArray(experiments) ? experiments : (experiments.experiments || [])

  const prompt = `You are a scientific report writer. Generate a detailed experiment design analysis.

EXPERIMENTS DESIGNED: ${experimentsArray.length}
PHASE SCORE: ${phase.finalScore}/10

EXPERIMENT DATA:
${experimentsArray.slice(0, 3).map((e: any, i: number) => `
Experiment ${i + 1}: ${e.title || e.objective || 'Untitled'}
- Type: ${e.type || 'N/A'}
- Objective: ${e.objective || 'N/A'}
- Materials: ${(e.materials || []).slice(0, 5).join(', ')}
- Equipment: ${(e.equipment || []).slice(0, 5).join(', ')}
- Procedure Steps: ${(e.procedure || []).length}
- Safety Requirements: ${(e.safetyRequirements || []).length}
- Expected Outputs: ${(e.expectedOutputs || []).map((o: any) => o.name).join(', ')}
`).join('\n')}

Generate a comprehensive experiment design section with:
1. Overview (1 paragraph on experimental approach and methodology)
2. Detailed Experiment Designs (2-3 paragraphs per experiment covering objectives, methods, and expected outcomes)
3. Materials and Equipment (1-2 paragraphs on required resources)
4. Safety Considerations (1 paragraph on safety protocols)
5. Expected Outcomes (1-2 paragraphs on anticipated results)

Write in a professional scientific tone appropriate for a research proposal.
Format as markdown with ## headers.`

  try {
    const content = await generateText('discovery', prompt, {
      temperature: 0.4,
      maxTokens: 2500,
      model: 'fast', // Gemini 3 Flash - fast with good quality for report generation
    })

    return {
      title: 'Experiment Design',
      content: content || generateFallbackExperimentContent(phase),
    }
  } catch (error) {
    console.error('Failed to generate experiment section:', error)
    return {
      title: 'Experiment Design',
      content: generateFallbackExperimentContent(phase),
    }
  }
}

function generateFallbackExperimentContent(phase: PhaseData): string {
  const experiments = phase.finalOutput || []
  const experimentsArray = Array.isArray(experiments) ? experiments : (experiments.experiments || [])

  return `## Overview

The experiment design phase created ${experimentsArray.length} detailed experimental protocols with a quality score of ${phase.finalScore.toFixed(1)}/10.

## Designed Experiments

${experimentsArray.slice(0, 3).map((e: any, i: number) => `
### Experiment ${i + 1}: ${e.title || e.objective || 'Untitled'}

**Type:** ${e.type || 'N/A'}

**Objective:** ${e.objective || 'N/A'}

**Materials Required:**
${(e.materials || []).slice(0, 8).map((m: any) => `- ${typeof m === 'string' ? m : m.name || JSON.stringify(m)}`).join('\n') || '- Not specified'}

**Procedure Overview:**
${(e.procedure || []).slice(0, 5).map((p: any, j: number) => `${j + 1}. ${typeof p === 'string' ? p : p.description || p.step || JSON.stringify(p)}`).join('\n') || 'Procedure not specified'}
`).join('\n')}
`
}

async function generateSimulationSection(phase: PhaseData): Promise<ReportSection> {
  const simData = phase.finalOutput || {}
  const results = simData.results || []

  const prompt = `You are a scientific report writer. Generate a detailed simulation results analysis.

SIMULATIONS RUN: ${results.length}
PHASE SCORE: ${phase.finalScore}/10

SIMULATION RESULTS:
${results.slice(0, 3).map((r: any, i: number) => `
Simulation ${i + 1}: ${r.experimentId || 'Untitled'}
- Converged: ${r.convergenceMetrics?.converged ? 'Yes' : 'No'}
- Iterations: ${r.convergenceMetrics?.iterations || 'N/A'}
- Key Outputs: ${(r.outputs || []).slice(0, 3).map((o: any) => `${o.name}: ${o.value} ${o.unit}`).join(', ')}
- Exergy Efficiency: ${r.exergy?.secondLawEfficiency ? (r.exergy.secondLawEfficiency * 100).toFixed(1) + '%' : 'N/A'}
- Exergy Destruction: ${r.exergy?.exergyDestruction ? r.exergy.exergyDestruction.toFixed(1) + ' kJ' : 'N/A'}
`).join('\n')}

Generate a comprehensive simulation analysis with:
1. Overview (1-2 paragraphs on simulation methodology and convergence)
2. Simulation Results (detailed analysis of key outputs - 2-3 paragraphs)
3. Thermodynamic Analysis (1-2 paragraphs on energy/exergy findings)
4. Model Validation (1 paragraph on convergence and accuracy)
5. Key Insights (1-2 paragraphs on important discoveries from simulations)

Write in a professional scientific tone with specific numerical results.
Format as markdown with ## headers.`

  try {
    const content = await generateText('discovery', prompt, {
      temperature: 0.4,
      maxTokens: 2000,
      model: 'fast', // Gemini 3 Flash - fast with good quality for report generation
    })

    return {
      title: 'Simulation Results',
      content: content || generateFallbackSimulationContent(phase),
    }
  } catch (error) {
    console.error('Failed to generate simulation section:', error)
    return {
      title: 'Simulation Results',
      content: generateFallbackSimulationContent(phase),
    }
  }
}

function generateFallbackSimulationContent(phase: PhaseData): string {
  const simData = phase.finalOutput || {}
  const results = simData.results || []

  return `## Overview

The simulation phase executed ${results.length} computational simulations with a quality score of ${phase.finalScore.toFixed(1)}/10.

## Results Summary

${results.slice(0, 3).map((r: any, i: number) => `
### Simulation ${i + 1}: ${r.experimentId || 'Untitled'}

**Convergence:** ${r.convergenceMetrics?.converged ? 'Achieved' : 'Not achieved'} in ${r.convergenceMetrics?.iterations || 'N/A'} iterations

**Key Outputs:**
${(r.outputs || []).slice(0, 5).map((o: any) => `- ${o.name}: ${o.value?.toFixed?.(2) || o.value} ${o.unit}`).join('\n') || '- No outputs recorded'}

**Exergy Analysis:**
- Second-law efficiency: ${r.exergy?.secondLawEfficiency ? (r.exergy.secondLawEfficiency * 100).toFixed(1) + '%' : 'N/A'}
- Exergy destruction: ${r.exergy?.exergyDestruction ? r.exergy.exergyDestruction.toFixed(1) + ' kJ' : 'N/A'}
`).join('\n')}
`
}

async function generateTechnicalAnalysisSection(
  exergyPhase: PhaseData | undefined,
  teaPhase: PhaseData | undefined
): Promise<ReportSection> {
  const exergyData = exergyPhase?.finalOutput || {}
  const teaData = teaPhase?.finalOutput || {}

  const prompt = `You are a scientific report writer. Generate a detailed technical and economic analysis section.

EXERGY ANALYSIS:
- Overall second-law efficiency: ${exergyData.overallSecondLawEfficiency ? (exergyData.overallSecondLawEfficiency * 100).toFixed(1) + '%' : 'N/A'}
- Total exergy destruction: ${exergyData.totalExergyDestruction ? exergyData.totalExergyDestruction.toFixed(1) + ' kJ' : 'N/A'}
- Score: ${exergyPhase?.finalScore || 'N/A'}/10

TECHNO-ECONOMIC ANALYSIS:
- Capital Cost: $${teaData.capitalCost?.toLocaleString() || 'N/A'}
- Operating Cost: $${teaData.operatingCost?.toLocaleString() || 'N/A'}/year
- NPV: $${teaData.npv?.toLocaleString() || 'N/A'}
- IRR: ${teaData.irr ? (teaData.irr * 100).toFixed(1) + '%' : 'N/A'}
- Payback Period: ${teaData.paybackPeriod || 'N/A'} years
- LCOE: ${teaData.lcoe ? '$' + teaData.lcoe.toFixed(4) + '/kWh' : 'N/A'}
- Score: ${teaPhase?.finalScore || 'N/A'}/10

Generate a comprehensive technical analysis with:
1. Thermodynamic Efficiency Analysis (2 paragraphs on exergy findings)
2. Economic Viability (2-3 paragraphs on financial metrics and market potential)
3. Cost-Benefit Analysis (1-2 paragraphs)
4. Risk Assessment (1 paragraph on technical and economic risks)
5. Comparison to Industry Standards (1 paragraph)

Write in a professional tone suitable for investment decisions.
Format as markdown with ## headers.`

  try {
    const content = await generateText('discovery', prompt, {
      temperature: 0.4,
      maxTokens: 2000,
      model: 'fast', // Gemini 3 Flash - fast with good quality for report generation
    })

    return {
      title: 'Technical & Economic Analysis',
      content: content || generateFallbackTechnicalContent(exergyPhase, teaPhase),
    }
  } catch (error) {
    console.error('Failed to generate technical section:', error)
    return {
      title: 'Technical & Economic Analysis',
      content: generateFallbackTechnicalContent(exergyPhase, teaPhase),
    }
  }
}

function generateFallbackTechnicalContent(
  exergyPhase: PhaseData | undefined,
  teaPhase: PhaseData | undefined
): string {
  const exergyData = exergyPhase?.finalOutput || {}
  const teaData = teaPhase?.finalOutput || {}

  return `## Thermodynamic Analysis

${exergyPhase ? `
The exergy analysis achieved a score of ${exergyPhase.finalScore.toFixed(1)}/10.

**Key Metrics:**
- Overall second-law efficiency: ${exergyData.overallSecondLawEfficiency ? (exergyData.overallSecondLawEfficiency * 100).toFixed(1) + '%' : 'Not calculated'}
- Total exergy destruction: ${exergyData.totalExergyDestruction ? exergyData.totalExergyDestruction.toFixed(1) + ' kJ' : 'Not calculated'}

**Recommendations:**
${(exergyData.recommendations || []).map((r: string) => `- ${r}`).join('\n') || '- No specific recommendations'}
` : 'Exergy analysis was not performed in this discovery.'}

## Economic Analysis

${teaPhase ? `
The techno-economic analysis achieved a score of ${teaPhase.finalScore.toFixed(1)}/10.

**Financial Metrics:**
- Capital Cost: $${teaData.capitalCost?.toLocaleString() || 'N/A'}
- Annual Operating Cost: $${teaData.operatingCost?.toLocaleString() || 'N/A'}
- Net Present Value (NPV): $${teaData.npv?.toLocaleString() || 'N/A'}
- Internal Rate of Return (IRR): ${teaData.irr ? (teaData.irr * 100).toFixed(1) + '%' : 'N/A'}
- Payback Period: ${teaData.paybackPeriod || 'N/A'} years
- Levelized Cost of Energy: ${teaData.lcoe ? '$' + teaData.lcoe.toFixed(4) + '/kWh' : 'N/A'}

**Recommendations:**
${(teaData.recommendations || []).map((r: string) => `- ${r}`).join('\n') || '- No specific recommendations'}
` : 'Techno-economic analysis was not performed in this discovery.'}
`
}

async function generateExecutiveSummary(
  request: ReportRequest,
  sections: ReportSection[]
): Promise<string> {
  const prompt = `You are a scientific report writer. Generate an executive summary for a clean energy research discovery report.

DISCOVERY OVERVIEW:
- Query: "${request.query}"
- Domain: ${request.domain}
- Overall Score: ${request.overallScore.toFixed(1)}/10
- Quality Tier: ${request.discoveryQuality}
- Total Duration: ${Math.round(request.totalDuration / 60000)} minutes
- Phases Completed: ${request.phases.filter(p => p.passed).length}/${request.phases.length}

PHASE SCORES:
${request.phases.map(p => `- ${p.phase}: ${p.finalScore.toFixed(1)}/10 (${p.passed ? 'PASSED' : 'FAILED'})`).join('\n')}

RECOMMENDATIONS FROM DISCOVERY:
${request.recommendations.slice(0, 5).map((r, i) => `${i + 1}. ${r}`).join('\n')}

Generate a comprehensive executive summary (3-4 paragraphs) that:
1. Opens with the research question and its significance
2. Summarizes key findings and achievements
3. Highlights the most important technical results
4. Concludes with actionable recommendations

Write in a professional tone for senior researchers and decision-makers.
Do not use markdown headers - write flowing paragraphs.`

  try {
    const summary = await generateText('discovery', prompt, {
      temperature: 0.4,
      maxTokens: 1000,
      model: 'fast', // Gemini 3 Flash - fast with good quality for executive summary
    })

    return summary || generateFallbackExecutiveSummary(request)
  } catch (error) {
    console.error('Failed to generate executive summary:', error)
    return generateFallbackExecutiveSummary(request)
  }
}

function generateFallbackExecutiveSummary(request: ReportRequest): string {
  const passedPhases = request.phases.filter(p => p.passed).length
  const totalPhases = request.phases.length

  return `This discovery report presents the findings from an automated scientific investigation into "${request.query}" within the ${request.domain} domain. The investigation achieved an overall quality score of ${request.overallScore.toFixed(1)}/10, classified as "${request.discoveryQuality}" tier, with ${passedPhases} out of ${totalPhases} phases passing quality thresholds.

The discovery process involved comprehensive literature research, hypothesis generation, experiment design, computational simulation, and technical-economic analysis. Key findings include novel research directions, validated experimental protocols, and preliminary economic viability assessments.

Based on the analysis, the investigation identified several promising avenues for further research and development. The recommendations section provides specific guidance for next steps, including priority areas for experimental validation and opportunities for technology improvement.`
}

async function generateConclusions(
  request: ReportRequest,
  sections: ReportSection[]
): Promise<string> {
  const prompt = `You are a scientific report writer. Generate conclusions for a clean energy research discovery report.

DISCOVERY QUERY: "${request.query}"
OVERALL SCORE: ${request.overallScore.toFixed(1)}/10
QUALITY: ${request.discoveryQuality}

PHASE RESULTS:
${request.phases.map(p => `- ${p.phase}: ${p.finalScore.toFixed(1)}/10 (${p.passed ? 'PASSED' : 'FAILED'})`).join('\n')}

Generate conclusions (2-3 paragraphs) that:
1. Summarize the main achievements and discoveries
2. Discuss the significance and implications
3. Acknowledge limitations and areas for improvement
4. Provide a forward-looking perspective

Write in a professional scientific tone.
Do not use markdown headers - write flowing paragraphs.`

  try {
    const conclusions = await generateText('discovery', prompt, {
      temperature: 0.4,
      maxTokens: 800,
      model: 'fast', // Gemini 3 Flash - fast with good quality for conclusions
    })

    return conclusions || generateFallbackConclusions(request)
  } catch (error) {
    console.error('Failed to generate conclusions:', error)
    return generateFallbackConclusions(request)
  }
}

function generateFallbackConclusions(request: ReportRequest): string {
  return `This automated discovery investigation has successfully explored the research question "${request.query}" through a systematic 4-step analysis pipeline. The overall quality score of ${request.overallScore.toFixed(1)}/10 indicates a ${request.discoveryQuality}-tier discovery with solid foundations for further research.

The investigation identified promising research directions, generated testable hypotheses, and provided preliminary validation through computational simulation. While the automated process has limitations compared to traditional experimental research, it provides valuable initial insights and prioritization guidance for resource allocation.

Future work should focus on experimental validation of the top-ranked hypotheses and refinement of the technical-economic models based on real-world data. The recommendations provided in this report offer specific actionable steps for advancing this research toward practical implementation.`
}

// ============================================================================
// Main Report Generator
// ============================================================================

async function generateFullReport(request: ReportRequest): Promise<GeneratedReport> {
  const sections: ReportSection[] = []

  // Handle partial results (no phases completed)
  if (!request.phases || request.phases.length === 0) {
    return generatePartialReport(request)
  }

  // Find specific phases
  const researchPhase = request.phases.find(p => p.phase === 'research')
  const hypothesisPhase = request.phases.find(p => p.phase === 'hypothesis')
  const experimentPhase = request.phases.find(p => p.phase === 'experiment')
  const simulationPhase = request.phases.find(p => p.phase === 'simulation')
  const exergyPhase = request.phases.find(p => p.phase === 'exergy')
  const teaPhase = request.phases.find(p => p.phase === 'tea')
  const validationPhase = request.phases.find(p => p.phase === 'validation')

  // Generate sections in parallel for speed
  const sectionPromises: Promise<ReportSection>[] = []

  if (researchPhase) {
    sectionPromises.push(generateResearchSection(researchPhase, request.query))
  }

  if (hypothesisPhase) {
    sectionPromises.push(generateHypothesisSection(hypothesisPhase))
  }

  if (experimentPhase) {
    sectionPromises.push(generateExperimentSection(experimentPhase))
  }

  if (simulationPhase) {
    sectionPromises.push(generateSimulationSection(simulationPhase))
  }

  if (exergyPhase || teaPhase) {
    sectionPromises.push(generateTechnicalAnalysisSection(exergyPhase, teaPhase))
  }

  // Wait for all sections to generate
  const generatedSections = await Promise.all(sectionPromises)
  sections.push(...generatedSections)

  // Generate executive summary and conclusions
  const [executiveSummary, conclusions] = await Promise.all([
    generateExecutiveSummary(request, sections),
    generateConclusions(request, sections),
  ])

  // Generate next steps from recommendations
  const nextSteps = request.recommendations.slice(0, 5)

  return {
    title: `Discovery Report: ${request.query.substring(0, 100)}`,
    executiveSummary,
    sections,
    conclusions,
    nextSteps,
    generatedAt: new Date().toISOString(),
    metadata: {
      discoveryId: request.discoveryId,
      query: request.query,
      overallScore: request.overallScore || 0,
      totalDuration: request.totalDuration || 0,
      phasesCompleted: request.phases.filter(p => p.passed).length,
    },
  }
}

/**
 * Generate a minimal report for partial results (when discovery was interrupted or failed early)
 */
function generatePartialReport(request: ReportRequest): GeneratedReport {
  const executiveSummary = `This is a partial discovery report for the query: "${request.query}". The discovery process was interrupted before completing any phases, or the results data was not available. The query has been recorded for reference.`

  const sections: ReportSection[] = [
    {
      title: 'Discovery Status',
      content: `## Status: Partial Results

This discovery did not complete any phases successfully. This may have occurred due to:
- Discovery was interrupted or stopped early
- Initial validation did not pass required thresholds
- Results data was not properly captured

### Original Query
"${request.query}"

### Domain
${request.domain || 'Clean Energy'}

### Recommendations
To obtain complete results, consider:
1. Re-running the discovery with a more specific query
2. Checking if the query meets the scientific validity requirements
3. Reviewing the Discovery Criteria page for guidance on query formulation`,
    },
  ]

  const recommendations = request.recommendations?.length > 0
    ? request.recommendations.slice(0, 5)
    : [
        'Consider re-running the discovery with a more specific query',
        'Review the Discovery Criteria for query guidelines',
        'Try breaking down complex queries into focused sub-questions',
      ]

  return {
    title: `Partial Discovery Report: ${request.query.substring(0, 100)}`,
    executiveSummary,
    sections,
    conclusions: 'This discovery did not produce complete results. Please review the recommendations above and consider re-running the discovery with an improved query.',
    nextSteps: recommendations,
    generatedAt: new Date().toISOString(),
    metadata: {
      discoveryId: request.discoveryId || 'unknown',
      query: request.query,
      overallScore: request.overallScore || 0,
      totalDuration: request.totalDuration || 0,
      phasesCompleted: 0,
    },
  }
}

// ============================================================================
// API Route Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body: ReportRequest = await request.json()

    // Validate required fields - query is required, phases can be empty for partial results
    if (!body.query) {
      return NextResponse.json(
        { error: 'Invalid request: query is required' },
        { status: 400 }
      )
    }

    // Ensure phases array exists (default to empty for partial results)
    if (!body.phases) {
      body.phases = []
    }

    console.log(`[ReportGenerator] Generating report for discovery: ${body.discoveryId}, phases: ${body.phases.length}`)

    // Generate report (handles both complete and partial results)
    const report = await generateFullReport(body)

    console.log(`[ReportGenerator] Report generated with ${report.sections.length} sections`)

    return NextResponse.json(report)
  } catch (error) {
    console.error('[ReportGenerator] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to generate report',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
