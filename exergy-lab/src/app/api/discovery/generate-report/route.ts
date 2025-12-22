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
  _generatedFrom?: 'llm' | 'template' // Indicates source of content
  _notice?: string // Notice to display in UI when using fallback
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

    const usedFallback = !content
    return {
      title: 'Research Analysis',
      content: content || generateFallbackResearchContent(phase, query),
      _generatedFrom: usedFallback ? 'template' : 'llm',
      _notice: usedFallback ? 'Content generated from structured data (AI summary unavailable)' : undefined,
    }
  } catch (error) {
    console.error('Failed to generate research section:', error)
    return {
      title: 'Research Analysis',
      content: generateFallbackResearchContent(phase, query),
      _generatedFrom: 'template' as const,
      _notice: 'Content generated from structured data due to AI generation error',
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

async function generateHypothesisSection(phase: PhaseData, query: string): Promise<ReportSection> {
  const hypotheses = phase.finalOutput || []
  const hypothesesArray = Array.isArray(hypotheses) ? hypotheses : (hypotheses.hypotheses || [])

  const prompt = `You are a scientific report writer. Generate a well-structured, detailed hypothesis analysis section.

IMPORTANT: All hypotheses MUST be directly related to this research query:
"${query}"

Do NOT include any hypotheses about unrelated topics. Every hypothesis must address the specific domain and focus of the query above.

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

Generate a comprehensive hypothesis analysis with CLEAR MARKDOWN STRUCTURE:

## Overview
Write 2-3 sentences describing the hypothesis generation methodology and selection process.

## Primary Hypotheses

For EACH of the top 3 hypotheses, create a separate subsection:

### Hypothesis 1: [Short Title]
**Statement:** [The hypothesis statement]

**Rationale:** Write 2-3 sentences explaining the scientific basis.

**Feasibility Assessment:** Write 1-2 sentences on practical implementation.

**Expected Impact:** Write 1-2 sentences on potential outcomes.

(Repeat for Hypothesis 2 and 3)

## Scientific Basis
Write 2 paragraphs discussing:
- The theoretical foundations underlying these hypotheses
- How current literature supports or informs these directions

## Feasibility Assessment
Write 1-2 paragraphs analyzing:
- Technical feasibility of the proposed approaches
- Resource requirements and timeline considerations

## Key Insights
Provide 2-3 bullet points summarizing the most important takeaways.

IMPORTANT FORMATTING RULES:
- Use ## for main section headers
- Use ### for hypothesis subsections
- Use **bold** for labels like Statement:, Rationale:, etc.
- Add blank lines between sections for readability
- Write complete sentences, not fragments
- Be specific and cite data where available`

  try {
    const content = await generateText('discovery', prompt, {
      temperature: 0.4,
      maxTokens: 2500,
      model: 'fast', // Gemini 3 Flash - fast with good quality for report generation
    })

    const usedFallback = !content
    return {
      title: 'Hypothesis Analysis',
      content: content || generateFallbackHypothesisContent(phase),
      _generatedFrom: usedFallback ? 'template' : 'llm',
      _notice: usedFallback ? 'Content generated from structured data (AI summary unavailable)' : undefined,
    }
  } catch (error) {
    console.error('Failed to generate hypothesis section:', error)
    return {
      title: 'Hypothesis Analysis',
      content: generateFallbackHypothesisContent(phase),
      _generatedFrom: 'template' as const,
      _notice: 'Content generated from structured data due to AI generation error',
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

    const usedFallback = !content
    return {
      title: 'Experiment Design',
      content: content || generateFallbackExperimentContent(phase),
      _generatedFrom: usedFallback ? 'template' : 'llm',
      _notice: usedFallback ? 'Content generated from structured data (AI summary unavailable)' : undefined,
    }
  } catch (error) {
    console.error('Failed to generate experiment section:', error)
    return {
      title: 'Experiment Design',
      content: generateFallbackExperimentContent(phase),
      _generatedFrom: 'template' as const,
      _notice: 'Content generated from structured data due to AI generation error',
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

    const usedFallback = !content
    return {
      title: 'Simulation Results',
      content: content || generateFallbackSimulationContent(phase),
      _generatedFrom: usedFallback ? 'template' : 'llm',
      _notice: usedFallback ? 'Content generated from structured data (AI summary unavailable)' : undefined,
    }
  } catch (error) {
    console.error('Failed to generate simulation section:', error)
    return {
      title: 'Simulation Results',
      content: generateFallbackSimulationContent(phase),
      _generatedFrom: 'template' as const,
      _notice: 'Content generated from structured data due to AI generation error',
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

    const usedFallback = !content
    return {
      title: 'Technical & Economic Analysis',
      content: content || generateFallbackTechnicalContent(exergyPhase, teaPhase),
      _generatedFrom: usedFallback ? 'template' : 'llm',
      _notice: usedFallback ? 'Content generated from structured data (AI summary unavailable)' : undefined,
    }
  } catch (error) {
    console.error('Failed to generate technical section:', error)
    return {
      title: 'Technical & Economic Analysis',
      content: generateFallbackTechnicalContent(exergyPhase, teaPhase),
      _generatedFrom: 'template' as const,
      _notice: 'Content generated from structured data due to AI generation error',
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
  // Extract key findings from phases for richer context
  const researchPhase = request.phases.find(p => p.phase === 'research')
  const hypothesisPhase = request.phases.find(p => p.phase === 'hypothesis')
  const keyFindings = researchPhase?.finalOutput?.keyFindings?.slice(0, 3) || []
  const hypotheses = hypothesisPhase?.finalOutput?.hypotheses || (Array.isArray(hypothesisPhase?.finalOutput) ? hypothesisPhase?.finalOutput : [])

  const prompt = `You are a scientific report writer. Generate a comprehensive executive summary for a clean energy research discovery report.

DISCOVERY OVERVIEW:
- Query: "${request.query}"
- Domain: ${request.domain}
- Overall Score: ${request.overallScore.toFixed(1)}/10
- Quality Tier: ${request.discoveryQuality}
- Total Duration: ${Math.round(request.totalDuration / 60000)} minutes
- Phases Completed: ${request.phases.filter(p => p.passed).length}/${request.phases.length}

PHASE SCORES:
${request.phases.map(p => `- ${p.phase}: ${p.finalScore.toFixed(1)}/10 (${p.passed ? 'PASSED' : 'FAILED'})`).join('\n')}

KEY FINDINGS FROM RESEARCH:
${keyFindings.map((f: any, i: number) => `${i + 1}. ${typeof f === 'string' ? f : f.finding || f.title || 'Finding'}`).join('\n') || 'Research findings available in detailed sections.'}

TOP HYPOTHESES GENERATED:
${hypotheses.slice(0, 3).map((h: any, i: number) => `${i + 1}. ${h.statement || h.title || 'Hypothesis'}`).join('\n') || 'Hypotheses available in detailed sections.'}

RECOMMENDATIONS FROM DISCOVERY:
${request.recommendations.slice(0, 5).map((r, i) => `${i + 1}. ${r}`).join('\n')}

Generate a comprehensive executive summary with 5-6 well-developed paragraphs:

**Paragraph 1 - Research Context & Significance:**
Open with the research question and explain why this investigation matters for the clean energy field. Mention the domain and current challenges being addressed.

**Paragraph 2 - Methodology & Approach:**
Describe the systematic approach taken: literature synthesis across multiple databases, hypothesis generation, validation through simulation, and techno-economic analysis.

**Paragraph 3 - Key Findings:**
Summarize the most important discoveries from the research phase. Be specific about what was learned from analyzing the scientific literature.

**Paragraph 4 - Novel Hypotheses:**
Highlight the most promising hypotheses generated and their potential significance. Mention feasibility and expected impact.

**Paragraph 5 - Technical & Economic Insights:**
Discuss key technical results including thermodynamic efficiency findings, economic viability indicators, and any simulation results.

**Paragraph 6 - Conclusions & Recommendations:**
Conclude with the overall assessment and 2-3 specific, actionable recommendations for next steps.

FORMATTING:
- Write flowing, professional paragraphs
- Do NOT use markdown headers within the summary
- Each paragraph should be 3-5 sentences
- Be specific with data and findings where available
- Write for senior researchers and decision-makers`

  try {
    const summary = await generateText('discovery', prompt, {
      temperature: 0.4,
      maxTokens: 1800, // Increased for comprehensive summary
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
  const domain = request.domain?.replace(/-/g, ' ') || 'clean energy'

  return `This discovery report presents the findings from a comprehensive AI-assisted scientific investigation into "${request.query}" within the ${domain} domain. The investigation achieved an overall quality score of ${request.overallScore.toFixed(1)}/10, classified as "${request.discoveryQuality}" tier, with ${passedPhases} out of ${totalPhases} phases passing quality thresholds. This research addresses critical challenges in the clean energy sector and explores novel approaches that could accelerate technology development.

The investigation employed a systematic multi-phase approach combining automated literature synthesis across 14+ scientific databases, AI-powered hypothesis generation, computational validation, and techno-economic analysis. The research phase analyzed relevant publications, patents, and technical reports to establish the current state of the art and identify technological gaps. The hypothesis phase generated testable research directions based on this foundation.

Key findings from the literature review reveal important trends and opportunities in the field. The analysis identified several promising research directions that build upon recent advances while addressing persistent challenges. These findings provide a solid foundation for the hypotheses generated in subsequent phases.

The hypothesis generation phase produced multiple novel research directions, each evaluated for scientific validity, technical feasibility, and potential impact. The most promising hypotheses address identified gaps in current technology and propose innovative approaches that leverage recent breakthroughs in related fields.

Technical validation through computational simulation and thermodynamic analysis provided preliminary assessment of the proposed approaches. Economic viability was evaluated using standard techno-economic methods, considering capital costs, operating expenses, and expected returns. These analyses help prioritize which directions warrant further experimental investigation.

Based on the comprehensive analysis, this investigation recommends focusing resources on the highest-scoring hypotheses that demonstrate both technical feasibility and economic potential. The detailed recommendations section provides specific guidance for next steps, including priority areas for experimental validation, partnership opportunities, and potential funding mechanisms.`
}

async function generateConclusions(
  request: ReportRequest,
  sections: ReportSection[]
): Promise<string> {
  // Extract key data for richer conclusions
  const researchPhase = request.phases.find(p => p.phase === 'research')
  const hypothesisPhase = request.phases.find(p => p.phase === 'hypothesis')
  const validationPhase = request.phases.find(p => p.phase === 'validation')
  const passedPhases = request.phases.filter(p => p.passed).length
  const totalPhases = request.phases.length

  const prompt = `You are a scientific report writer. Generate comprehensive conclusions for a clean energy research discovery report.

DISCOVERY QUERY: "${request.query}"
OVERALL SCORE: ${request.overallScore.toFixed(1)}/10
QUALITY TIER: ${request.discoveryQuality}
PHASES PASSED: ${passedPhases}/${totalPhases}

PHASE RESULTS:
${request.phases.map(p => `- ${p.phase}: ${p.finalScore.toFixed(1)}/10 (${p.passed ? 'PASSED' : 'NEEDS WORK'})`).join('\n')}

KEY RECOMMENDATIONS:
${request.recommendations.slice(0, 3).map((r, i) => `${i + 1}. ${r}`).join('\n')}

Generate comprehensive conclusions with 4-5 well-developed paragraphs:

**Paragraph 1 - Summary of Achievements:**
Summarize what this investigation accomplished. Mention the scope of literature analyzed, number of hypotheses generated, and key validation results. Be specific about achievements.

**Paragraph 2 - Key Discoveries & Significance:**
Discuss the most important discoveries and their potential significance for the field. Explain how these findings could advance clean energy technology development.

**Paragraph 3 - Strengths of This Investigation:**
Highlight what went well in this discovery process. Discuss the quality of research synthesis, novelty of hypotheses, and strength of validation approaches.

**Paragraph 4 - Limitations & Considerations:**
Acknowledge limitations honestly. Discuss areas where the automated analysis has constraints, what additional work would strengthen the findings, and caveats for interpretation.

**Paragraph 5 - Future Directions & Impact:**
Provide a forward-looking perspective on how this research could be advanced. Discuss potential impact if the top hypotheses are validated experimentally. Connect to broader clean energy goals.

FORMATTING:
- Write flowing, professional paragraphs
- Do NOT use markdown headers within conclusions
- Each paragraph should be 3-5 sentences
- Be specific and reference actual results where available
- Balance optimism with scientific rigor`

  try {
    const conclusions = await generateText('discovery', prompt, {
      temperature: 0.4,
      maxTokens: 1500, // Increased for comprehensive conclusions
      model: 'fast', // Gemini 3 Flash - fast with good quality for conclusions
    })

    return conclusions || generateFallbackConclusions(request)
  } catch (error) {
    console.error('Failed to generate conclusions:', error)
    return generateFallbackConclusions(request)
  }
}

function generateFallbackConclusions(request: ReportRequest): string {
  const passedPhases = request.phases.filter(p => p.passed).length
  const totalPhases = request.phases.length
  const domain = request.domain?.replace(/-/g, ' ') || 'clean energy'

  return `This discovery investigation has systematically explored the research question "${request.query}" through a comprehensive 4-phase analysis pipeline encompassing literature synthesis, hypothesis generation, computational validation, and techno-economic analysis. The overall quality score of ${request.overallScore.toFixed(1)}/10 indicates a ${request.discoveryQuality}-tier discovery, with ${passedPhases} out of ${totalPhases} phases meeting quality thresholds. This investigation provides a solid foundation for targeted experimental research and technology development.

The investigation uncovered several significant findings that advance understanding in the ${domain} domain. The literature synthesis identified key technological gaps and emerging research directions, while the hypothesis generation phase produced novel research directions that address these gaps. These discoveries represent potentially valuable contributions to the field, particularly in areas where current approaches have shown limitations.

This discovery demonstrates the value of systematic, AI-assisted research synthesis for accelerating early-stage investigation. The multi-source literature analysis provided comprehensive coverage that would be challenging to achieve through manual review alone. The structured hypothesis generation and validation approach ensures scientific rigor while enabling rapid exploration of the solution space.

It is important to acknowledge certain limitations of this automated analysis. The hypotheses generated require experimental validation before implementation, and the economic projections are preliminary estimates based on analogous systems and literature values. Additionally, some nuanced aspects of the research domain may benefit from expert review and refinement. These limitations are common to computational research approaches and do not diminish the value of the findings.

Looking forward, this investigation positions the research for productive next steps. Experimental validation of the top-ranked hypotheses should be prioritized, particularly those with high feasibility scores and significant potential impact. The techno-economic analysis provides preliminary guidance for investment decisions, though detailed engineering studies would be warranted for promising candidates. If the leading hypotheses are validated, this research could contribute meaningfully to advancing ${domain} technology and supporting the broader transition to sustainable energy systems.`
}

// ============================================================================
// Key Findings & Score Summary
// ============================================================================

function generateKeyFindingsTable(request: ReportRequest): string {
  const researchPhase = request.phases.find(p => p.phase === 'research')
  const findings: { finding: string; confidence: string; impact: string }[] = []

  // Extract key findings from research phase
  if (researchPhase?.finalOutput?.keyFindings) {
    const keyFindings = researchPhase.finalOutput.keyFindings.slice(0, 5)
    for (const f of keyFindings) {
      const findingText = typeof f === 'string' ? f : f.finding || f.title || JSON.stringify(f)
      const confidence = f.confidence || f.evidenceStrength || 'Medium'
      const impact = f.impact || f.relevance || 'Medium'
      findings.push({
        finding: findingText.substring(0, 100) + (findingText.length > 100 ? '...' : ''),
        confidence: typeof confidence === 'number' ? (confidence > 0.7 ? 'High' : confidence > 0.4 ? 'Medium' : 'Low') : String(confidence),
        impact: typeof impact === 'number' ? (impact > 0.7 ? 'High' : impact > 0.4 ? 'Medium' : 'Low') : String(impact),
      })
    }
  }

  // Add hypothesis findings if available
  const hypothesisPhase = request.phases.find(p => p.phase === 'hypothesis')
  if (hypothesisPhase?.finalOutput) {
    const hypotheses = Array.isArray(hypothesisPhase.finalOutput)
      ? hypothesisPhase.finalOutput
      : hypothesisPhase.finalOutput.hypotheses || []

    for (const h of hypotheses.slice(0, 2)) {
      const title = h.title || h.hypothesis || 'Hypothesis'
      const novelty = h.noveltyScore || h.novelty || 'Medium'
      findings.push({
        finding: `Novel hypothesis: ${title.substring(0, 80)}${title.length > 80 ? '...' : ''}`,
        confidence: 'Research-based',
        impact: typeof novelty === 'number' ? (novelty > 7 ? 'High' : novelty > 5 ? 'Medium' : 'Low') : String(novelty),
      })
    }
  }

  if (findings.length === 0) {
    return ''
  }

  return `## Key Findings at a Glance

| Finding | Confidence | Impact |
|---------|------------|--------|
${findings.map(f => `| ${f.finding.replace(/\|/g, '\\|')} | ${f.confidence} | ${f.impact} |`).join('\n')}

`
}

function generateVisualScoreSummary(request: ReportRequest): string {
  const qualityLabel = request.discoveryQuality?.toUpperCase() || 'DISCOVERY'
  const overallScore = request.overallScore || 0

  // Create ASCII progress bars
  const createBar = (score: number): string => {
    const filled = Math.round(score)
    const empty = 10 - filled
    return '█'.repeat(filled) + '░'.repeat(empty)
  }

  let scoreSummary = `## Discovery Quality Summary

**${qualityLabel}** (${overallScore.toFixed(2)}/10)

\`\`\`
Overall Score: ${createBar(overallScore)} ${overallScore.toFixed(1)}/10
\`\`\`

### Phase Breakdown

`

  for (const phase of request.phases) {
    const score = phase.finalScore || 0
    const status = phase.passed ? '✓' : '○'
    const phaseName = phase.phase.charAt(0).toUpperCase() + phase.phase.slice(1)
    scoreSummary += `- ${status} **${phaseName}**: ${createBar(score)} ${score.toFixed(1)}/10\n`
  }

  return scoreSummary + '\n'
}

async function generateSectionInsights(sectionTitle: string, sectionContent: string, query: string): Promise<string[]> {
  const prompt = `You are a scientific insights generator. Based on the following section from a discovery report, generate 2-3 key insights that a researcher would find most valuable.

SECTION: ${sectionTitle}
RESEARCH QUERY: "${query}"

CONTENT:
${sectionContent.substring(0, 2000)}

Generate 2-3 bullet-point insights that:
1. Highlight the most important takeaway
2. Identify actionable opportunities
3. Point out critical considerations or risks

Format as a simple list, one insight per line starting with "-". Keep each insight to 1-2 sentences.`

  try {
    const insights = await generateText('discovery', prompt, {
      temperature: 0.5,
      maxTokens: 400,
      model: 'fast',
    })

    if (insights) {
      return insights
        .split('\n')
        .filter((line: string) => line.trim().startsWith('-'))
        .map((line: string) => line.trim().substring(1).trim())
        .slice(0, 3)
    }
  } catch (error) {
    console.error('Failed to generate section insights:', error)
  }

  return []
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
    sectionPromises.push(generateHypothesisSection(hypothesisPhase, request.query))
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

  // Add insights to each section (in parallel for speed)
  const sectionsWithInsights = await Promise.all(
    generatedSections.map(async (section) => {
      const insights = await generateSectionInsights(section.title, section.content, request.query)
      if (insights.length > 0) {
        const insightsMarkdown = `\n\n### Key Insights\n${insights.map(i => `- ${i}`).join('\n')}`
        return {
          ...section,
          content: section.content + insightsMarkdown,
        }
      }
      return section
    })
  )

  // Generate key findings table and score summary
  const keyFindingsSection = generateKeyFindingsTable(request)
  const scoreSummarySection = generateVisualScoreSummary(request)

  // Add overview section at the beginning with key findings and score summary
  if (keyFindingsSection || scoreSummarySection) {
    sections.push({
      title: 'Discovery Overview',
      content: `${scoreSummarySection}\n${keyFindingsSection}`,
    })
  }

  // Add the generated sections
  sections.push(...sectionsWithInsights)

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
