/**
 * Breakthrough Engine Debug Formatter - v0.0.3
 *
 * Formats Breakthrough Engine debug sessions for export in formats
 * optimized for analysis by Claude/LLMs to identify improvements.
 *
 * Export Formats:
 * - Analysis: Structured analysis request optimized for Claude
 * - JSON: Full structured data
 * - detailed_json: Complete debug data with all metrics
 * - Markdown: Human-readable with LLM-friendly sections
 * - CSV: Tabular data for spreadsheet analysis
 *
 * Features (v0.0.3):
 * - 12-dimension breakthrough scoring (BC1-BC12)
 * - LLM call tracking and cost analysis
 * - Performance profiling
 * - Data source metrics
 * - UI state tracking
 * - SSE health monitoring
 * - Quality validation analysis
 *
 * @see types/breakthrough-debug.ts
 * @see lib/diagnostics/breakthrough-logger.ts
 */

import type {
  BreakthroughDebugSession,
  BreakthroughAnalysisRequest,
  BreakthroughExportOptions,
  HypothesisDebugLog,
  HypGenAgentType,
} from '@/types/breakthrough-debug'
import { BREAKTHROUGH_DIMENSIONS, IMPACT_DIMENSIONS, FEASIBILITY_DIMENSIONS } from '@/types/breakthrough-debug'

// ============================================================================
// Main Export Function
// ============================================================================

export function formatBreakthroughSession(
  session: BreakthroughDebugSession,
  analysisRequest: BreakthroughAnalysisRequest,
  options: BreakthroughExportOptions
): string {
  switch (options.format) {
    case 'analysis':
      return formatAsAnalysis(session, analysisRequest, options)
    case 'json':
      return formatAsJSON(session, analysisRequest, options)
    case 'detailed_json':
      return formatAsDetailedJSON(session, analysisRequest, options)
    case 'markdown':
      return formatAsMarkdown(session, analysisRequest, options)
    case 'csv':
      return formatAsCSV(session, analysisRequest, options)
    default:
      return formatAsAnalysis(session, analysisRequest, options)
  }
}

// ============================================================================
// Analysis Format (Optimized for Claude)
// ============================================================================

function formatAsAnalysis(
  session: BreakthroughDebugSession,
  analysis: BreakthroughAnalysisRequest,
  options: BreakthroughExportOptions
): string {
  const lines: string[] = []

  // Header with clear instructions for Claude
  lines.push('# BREAKTHROUGH ENGINE DEBUG ANALYSIS')
  lines.push('')
  lines.push('## ANALYSIS INSTRUCTIONS FOR CLAUDE')
  lines.push('')
  lines.push('This is a structured debug export from the Exergy Lab Breakthrough Engine v0.0.3.')
  lines.push('Please analyze this data to identify:')
  lines.push('1. **Performance Issues**: Bottlenecks, slow phases, inefficient LLM operations')
  lines.push('2. **Quality Issues**: Why hypotheses failed to reach breakthrough status')
  lines.push('3. **Agent Effectiveness**: Which HypGen agents are underperforming')
  lines.push('4. **Dimension Weaknesses**: Which of the 12 breakthrough dimensions are hardest to satisfy')
  lines.push('5. **Feasibility Assessment**: Evaluate BC9-BC12 (Technical, Literature, Infrastructure, Capital)')
  lines.push('6. **Cost Optimization**: Identify opportunities to reduce LLM costs')
  lines.push('7. **Improvement Recommendations**: Specific, actionable suggestions')
  lines.push('')
  lines.push('---')
  lines.push('')

  // Session Overview
  lines.push('## 1. SESSION OVERVIEW')
  lines.push('')
  lines.push('```yaml')
  lines.push(`session_id: ${analysis.session.id}`)
  lines.push(`query: "${analysis.session.query}"`)
  lines.push(`domain: ${analysis.session.domain}`)
  lines.push(`status: ${analysis.session.status}`)
  lines.push(`engine_version: ${analysis.version}`)
  lines.push(`exported_at: ${analysis.exportedAt}`)
  lines.push('```')
  lines.push('')

  // Duration Breakdown
  lines.push('### Duration Breakdown')
  lines.push('')
  lines.push('| Phase | Duration | % of Total |')
  lines.push('|-------|----------|------------|')
  const totalMs = analysis.session.duration.total
  for (const [phase, duration] of Object.entries(analysis.session.duration.byPhase)) {
    if (duration > 0) {
      const pct = ((duration / totalMs) * 100).toFixed(1)
      lines.push(`| ${phase} | ${formatDuration(duration)} | ${pct}% |`)
    }
  }
  lines.push(`| **TOTAL** | **${formatDuration(totalMs)}** | **100%** |`)
  lines.push('')

  // Performance Metrics
  lines.push('## 2. PERFORMANCE METRICS')
  lines.push('')
  lines.push('```yaml')
  lines.push(`breakthrough_rate: ${(analysis.performance.breakthroughRate * 100).toFixed(1)}%`)
  lines.push(`average_final_score: ${analysis.performance.averageFinalScore.toFixed(2)}/10`)
  lines.push(`top_score: ${analysis.performance.topScore.toFixed(2)}/10`)
  lines.push(`elimination_rate: ${(analysis.performance.eliminationRate * 100).toFixed(1)}%`)
  lines.push(`iterations_to_breakthrough: ${analysis.performance.iterationsToBreakthrough?.toFixed(1) || 'N/A'}`)
  lines.push('```')
  lines.push('')

  // Performance Assessment
  lines.push('### Performance Assessment')
  lines.push('')
  if (analysis.performance.breakthroughRate === 0) {
    lines.push('- **CRITICAL**: No breakthroughs achieved. Review hypothesis quality and evaluation criteria.')
  } else if (analysis.performance.breakthroughRate < 0.1) {
    lines.push('- **WARNING**: Low breakthrough rate (<10%). Consider improving initial hypothesis quality.')
  } else {
    lines.push('- **OK**: Breakthrough rate is acceptable.')
  }

  if (analysis.performance.eliminationRate > 0.7) {
    lines.push('- **WARNING**: High elimination rate (>70%). Initial hypotheses may be too weak.')
  }

  if (analysis.performance.averageFinalScore < 6.0) {
    lines.push('- **WARNING**: Low average score (<6.0). Refinement process may need improvement.')
  }
  lines.push('')

  // Agent Effectiveness
  lines.push('## 3. HYPGEN AGENT EFFECTIVENESS')
  lines.push('')
  lines.push('| Agent | Hypotheses | Avg Score | Breakthroughs | Elim. Rate | Status |')
  lines.push('|-------|------------|-----------|---------------|------------|--------|')

  const agentTypes: HypGenAgentType[] = ['novel', 'feasible', 'economic', 'cross-domain', 'paradigm']
  for (const agentType of agentTypes) {
    const agent = analysis.performance.agentEffectiveness[agentType]
    if (agent) {
      let status = '✓ Good'
      if (agent.averageScore < 6.0) status = '⚠ Weak'
      if (agent.eliminationRate > 0.8) status = '✗ Poor'
      if (agent.breakthroughs > 0) status = '★ Excellent'

      lines.push(`| ${agentType} | ${agent.hypothesesGenerated} | ${agent.averageScore.toFixed(2)} | ${agent.breakthroughs} | ${(agent.eliminationRate * 100).toFixed(0)}% | ${status} |`)
    }
  }
  lines.push('')

  // Agent-specific recommendations
  lines.push('### Agent Recommendations')
  lines.push('')
  for (const agentType of agentTypes) {
    const agent = analysis.performance.agentEffectiveness[agentType]
    if (agent && agent.hypothesesGenerated > 0) {
      if (agent.averageScore < 6.0) {
        lines.push(`- **${agentType}**: Average score too low (${agent.averageScore.toFixed(2)}). Review generation strategy and prompt engineering.`)
      }
      if (agent.eliminationRate > 0.8 && agent.breakthroughs === 0) {
        lines.push(`- **${agentType}**: High elimination rate with no breakthroughs. Consider adjusting focus or removing from pool.`)
      }
    }
  }
  lines.push('')

  // Dimension Analysis
  lines.push('## 4. BREAKTHROUGH DIMENSION ANALYSIS (12 DIMENSIONS)')
  lines.push('')

  // Impact Dimensions (BC1-BC8)
  lines.push('### Impact Dimensions (BC1-BC8) - 8.0 points max')
  lines.push('')
  lines.push('| Dimension | Pass Rate | Avg Score | Required | Status |')
  lines.push('|-----------|-----------|-----------|----------|--------|')

  const impactDimIds = ['bc1_performance', 'bc2_cost', 'bc3_capabilities', 'bc4_applications', 'bc5_societal', 'bc6_scale', 'bc7_problem_solving', 'bc8_trajectory']
  for (const dimId of impactDimIds) {
    const passRate = analysis.dimensions.passRates[dimId] || 0
    const avgScore = analysis.dimensions.averageScores[dimId] || 0
    const isRequired = dimId === 'bc1_performance' || dimId === 'bc8_trajectory'
    let status = '✓ Good'
    if (passRate < 0.3) status = '✗ Critical'
    else if (passRate < 0.5) status = '⚠ Weak'
    else if (passRate >= 0.8) status = '★ Strong'

    const dimConfig = BREAKTHROUGH_DIMENSIONS.find(d => d.id === dimId)
    const dimName = dimConfig?.name || dimId.replace('bc', 'BC').replace(/_/g, ' ')
    lines.push(`| ${dimName} | ${(passRate * 100).toFixed(0)}% | ${(avgScore * 100).toFixed(0)}% | ${isRequired ? '✓' : ''} | ${status} |`)
  }
  lines.push('')

  // Feasibility Dimensions (BC9-BC12)
  lines.push('### Feasibility Dimensions (BC9-BC12) - 2.0 points max')
  lines.push('')
  lines.push('| Dimension | Pass Rate | Avg Score | Status |')
  lines.push('|-----------|-----------|-----------|--------|')

  const feasibilityDimIds = ['bc9_feasibility', 'bc10_literature', 'bc11_infrastructure', 'bc12_capital']
  for (const dimId of feasibilityDimIds) {
    const passRate = analysis.dimensions.passRates[dimId] || 0
    const avgScore = analysis.dimensions.averageScores[dimId] || 0
    let status = '✓ Good'
    if (passRate < 0.3) status = '✗ Critical'
    else if (passRate < 0.5) status = '⚠ Weak'
    else if (passRate >= 0.8) status = '★ Strong'

    const dimConfig = BREAKTHROUGH_DIMENSIONS.find(d => d.id === dimId)
    const dimName = dimConfig?.name || dimId.replace('bc', 'BC').replace(/_/g, ' ')
    lines.push(`| ${dimName} | ${(passRate * 100).toFixed(0)}% | ${(avgScore * 100).toFixed(0)}% | ${status} |`)
  }
  lines.push('')

  // Feasibility confidence
  if (analysis.dimensions.feasibilityConfidence) {
    lines.push(`**Feasibility Confidence**: ${analysis.dimensions.feasibilityConfidence.toUpperCase()}`)
    lines.push(`- Impact Score: ${analysis.dimensions.impactDimensionScore?.toFixed(2) || 'N/A'}/8.0`)
    lines.push(`- Feasibility Score: ${analysis.dimensions.feasibilityDimensionScore?.toFixed(2) || 'N/A'}/2.0`)
    lines.push('')
  }

  lines.push('### Most Challenging Dimensions')
  lines.push('')
  for (const dimId of analysis.dimensions.mostChallenging) {
    const passRate = analysis.dimensions.passRates[dimId] || 0
    const dimConfig = BREAKTHROUGH_DIMENSIONS.find(d => d.id === dimId)
    const dimName = dimConfig?.name || dimId
    lines.push(`- **${dimName}**: Only ${(passRate * 100).toFixed(0)}% pass rate - needs attention`)
  }
  lines.push('')

  // Hypothesis Analysis
  lines.push('## 5. HYPOTHESIS ANALYSIS')
  lines.push('')

  // Breakthroughs
  if (analysis.hypotheses.breakthroughs.length > 0) {
    lines.push('### Breakthroughs Achieved')
    lines.push('')
    for (const hyp of analysis.hypotheses.breakthroughs) {
      lines.push(`#### ${hyp.title}`)
      lines.push('')
      lines.push(`- **Score**: ${hyp.finalScore.toFixed(2)}/10`)
      lines.push(`- **Agent**: ${hyp.agentSource}`)
      lines.push(`- **Iterations**: ${hyp.totalIterations}`)
      if (hyp.breakthroughAchievedAt) {
        lines.push(`- **Breakthrough at iteration**: ${hyp.breakthroughAchievedAt}`)
      }
      lines.push('')
    }
  } else {
    lines.push('### Breakthroughs Achieved')
    lines.push('')
    lines.push('**None** - No hypotheses reached the 9.0 breakthrough threshold.')
    lines.push('')
  }

  // Top Performers
  lines.push('### Top Performers (Non-Eliminated)')
  lines.push('')
  for (const hyp of analysis.hypotheses.topPerformers.slice(0, 5)) {
    lines.push(`- **${hyp.title}**: ${hyp.finalScore.toFixed(2)}/10 (${hyp.agentSource}, ${hyp.totalIterations} iterations)`)
  }
  lines.push('')

  // Elimination Analysis
  lines.push('### Elimination Analysis')
  lines.push('')
  lines.push(`- **Total eliminated**: ${analysis.hypotheses.eliminated.count}`)
  lines.push(`- **Common reasons**:`)
  for (const reason of analysis.hypotheses.eliminated.commonReasons) {
    lines.push(`  - ${reason}`)
  }
  lines.push('')

  // Refinement Effectiveness
  lines.push('## 6. REFINEMENT EFFECTIVENESS')
  lines.push('')
  lines.push('```yaml')
  lines.push(`avg_iterations_to_breakthrough: ${analysis.refinement.averageIterationsToBreakthrough.toFixed(2)}`)
  lines.push(`score_improvement_per_iteration: ${analysis.refinement.scoreImprovementPerIteration.toFixed(3)}`)
  lines.push(`stagnation_points: [${analysis.refinement.stagnationPoints.join(', ')}]`)
  lines.push('```')
  lines.push('')

  if (analysis.refinement.stagnationPoints.length > 0) {
    lines.push('**Stagnation Detected**: Score improvements flatten at iterations: ' +
      analysis.refinement.stagnationPoints.join(', '))
    lines.push('Consider implementing more aggressive refinement strategies after these points.')
    lines.push('')
  }

  // Issues and Errors
  if (analysis.issues.errors.length > 0 || analysis.issues.warnings.length > 0) {
    lines.push('## 7. ISSUES AND ERRORS')
    lines.push('')

    if (analysis.issues.errors.length > 0) {
      lines.push('### Errors')
      lines.push('')
      for (const error of analysis.issues.errors) {
        lines.push(`- **[${error.phase || 'unknown'}]** ${error.message}`)
        if (error.context) {
          lines.push(`  Context: ${JSON.stringify(error.context)}`)
        }
      }
      lines.push('')
    }

    if (analysis.issues.warnings.length > 0) {
      lines.push('### Warnings')
      lines.push('')
      for (const warning of analysis.issues.warnings) {
        lines.push(`- ${warning}`)
      }
      lines.push('')
    }

    if (analysis.issues.performanceBottlenecks.length > 0) {
      lines.push('### Performance Bottlenecks')
      lines.push('')
      for (const bottleneck of analysis.issues.performanceBottlenecks) {
        lines.push(`- **${bottleneck.phase}**: ${formatDuration(bottleneck.duration)}`)
        if (bottleneck.cause) {
          lines.push(`  Cause: ${bottleneck.cause}`)
        }
      }
      lines.push('')
    }
  }

  // Suggested Improvements
  lines.push('## 8. SUGGESTED IMPROVEMENTS')
  lines.push('')
  if (analysis.suggestedImprovements.length > 0) {
    for (let i = 0; i < analysis.suggestedImprovements.length; i++) {
      lines.push(`${i + 1}. ${analysis.suggestedImprovements[i]}`)
    }
  } else {
    lines.push('No specific improvements identified.')
  }
  lines.push('')

  // LLM Analysis (v0.0.3)
  if (options.includeLLMCalls && analysis.llmAnalysis) {
    lines.push('## 9. LLM USAGE ANALYSIS')
    lines.push('')
    lines.push('```yaml')
    lines.push(`total_calls: ${analysis.llmAnalysis.totalCalls}`)
    lines.push(`total_tokens: ${analysis.llmAnalysis.totalTokens.toLocaleString()}`)
    lines.push(`total_cost_usd: $${analysis.llmAnalysis.totalCostUSD.toFixed(4)}`)
    lines.push(`avg_latency_ms: ${analysis.llmAnalysis.avgLatencyMs.toFixed(0)}`)
    lines.push(`error_rate: ${(analysis.llmAnalysis.errorRate * 100).toFixed(1)}%`)
    lines.push(`retry_rate: ${(analysis.llmAnalysis.retryRate * 100).toFixed(1)}%`)
    lines.push(`fallback_rate: ${(analysis.llmAnalysis.fallbackRate * 100).toFixed(1)}%`)
    lines.push('```')
    lines.push('')

    if (analysis.llmAnalysis.modelUsage) {
      lines.push('### Model Usage')
      lines.push('')
      lines.push('| Model | Calls | Tokens | Cost | Avg Latency |')
      lines.push('|-------|-------|--------|------|-------------|')
      for (const [model, usage] of Object.entries(analysis.llmAnalysis.modelUsage)) {
        lines.push(`| ${model} | ${usage.calls} | ${usage.tokens.toLocaleString()} | $${usage.costUSD.toFixed(4)} | ${usage.avgLatencyMs.toFixed(0)}ms |`)
      }
      lines.push('')
    }

    if (analysis.llmAnalysis.slowestCalls && analysis.llmAnalysis.slowestCalls.length > 0) {
      lines.push('### Slowest LLM Calls')
      lines.push('')
      for (const call of analysis.llmAnalysis.slowestCalls.slice(0, 5)) {
        lines.push(`- **${call.purpose}** (${call.model}): ${call.latencyMs.toFixed(0)}ms`)
      }
      lines.push('')
    }
  }

  // Cost Analysis (v0.0.3)
  if (options.includeCostAnalysis && analysis.costAnalysis) {
    lines.push('## 10. COST ANALYSIS')
    lines.push('')
    lines.push('```yaml')
    lines.push(`total_cost_usd: $${analysis.costAnalysis.totalCostUSD.toFixed(4)}`)
    lines.push(`cost_per_hypothesis: $${analysis.costAnalysis.costPerHypothesis.toFixed(4)}`)
    lines.push(`cost_per_breakthrough: ${analysis.costAnalysis.costPerBreakthrough ? '$' + analysis.costAnalysis.costPerBreakthrough.toFixed(4) : 'N/A'}`)
    lines.push(`cost_efficiency: ${analysis.costAnalysis.costEfficiency}`)
    lines.push('```')
    lines.push('')

    lines.push('### Cost by Phase')
    lines.push('')
    lines.push('| Phase | Cost |')
    lines.push('|-------|------|')
    for (const [phase, cost] of Object.entries(analysis.costAnalysis.costByPhase)) {
      if (cost > 0) {
        lines.push(`| ${phase} | $${cost.toFixed(4)} |`)
      }
    }
    lines.push('')

    lines.push('### Cost by Agent')
    lines.push('')
    lines.push('| Agent | Cost |')
    lines.push('|-------|------|')
    for (const [agent, cost] of Object.entries(analysis.costAnalysis.costByAgent)) {
      if (cost > 0) {
        lines.push(`| ${agent} | $${cost.toFixed(4)} |`)
      }
    }
    lines.push('')
  }

  // Data Source Analysis (v0.0.3)
  if (options.includeDataSourceLogs && analysis.dataSourceAnalysis) {
    lines.push('## 11. DATA SOURCE ANALYSIS')
    lines.push('')
    lines.push('```yaml')
    lines.push(`total_calls: ${analysis.dataSourceAnalysis.totalCalls}`)
    lines.push(`success_rate: ${(analysis.dataSourceAnalysis.overallSuccessRate * 100).toFixed(1)}%`)
    lines.push(`cache_hit_rate: ${(analysis.dataSourceAnalysis.overallCacheHitRate * 100).toFixed(1)}%`)
    lines.push(`avg_latency_ms: ${analysis.dataSourceAnalysis.avgLatencyMs.toFixed(0)}`)
    lines.push('```')
    lines.push('')

    if (analysis.dataSourceAnalysis.sourcePerformance) {
      lines.push('### Source Performance')
      lines.push('')
      lines.push('| Source | Calls | Success | Latency | Cache |')
      lines.push('|--------|-------|---------|---------|-------|')
      for (const [source, perf] of Object.entries(analysis.dataSourceAnalysis.sourcePerformance)) {
        lines.push(`| ${source} | ${perf.calls} | ${(perf.successRate * 100).toFixed(0)}% | ${perf.avgLatencyMs.toFixed(0)}ms | ${(perf.cacheHitRate * 100).toFixed(0)}% |`)
      }
      lines.push('')
    }

    if (analysis.dataSourceAnalysis.failingSources && analysis.dataSourceAnalysis.failingSources.length > 0) {
      lines.push('### Failing Sources (Action Required)')
      lines.push('')
      for (const source of analysis.dataSourceAnalysis.failingSources) {
        lines.push(`- **${source.source}**: ${(source.failureRate * 100).toFixed(0)}% failure rate`)
      }
      lines.push('')
    }
  }

  // Quality Analysis (v0.0.3)
  if (options.includeQualityValidation && analysis.qualityAnalysis) {
    lines.push('## 12. QUALITY VALIDATION ANALYSIS')
    lines.push('')
    lines.push('```yaml')
    lines.push(`frontierscience_pass_rate: ${(analysis.qualityAnalysis.frontierSciencePassRate * 100).toFixed(1)}%`)
    lines.push(`avg_frontierscience_score: ${analysis.qualityAnalysis.avgFrontierScienceScore.toFixed(2)}/10`)
    lines.push(`breakthrough_pass_rate: ${(analysis.qualityAnalysis.breakthroughPassRate * 100).toFixed(1)}%`)
    lines.push(`avg_breakthrough_score: ${analysis.qualityAnalysis.avgBreakthroughScore.toFixed(2)}/10`)
    lines.push('```')
    lines.push('')

    if (analysis.qualityAnalysis.weakestCriteria && analysis.qualityAnalysis.weakestCriteria.length > 0) {
      lines.push('### Weakest Criteria')
      lines.push('')
      for (const criteria of analysis.qualityAnalysis.weakestCriteria) {
        lines.push(`- **${criteria.id}**: ${(criteria.passRate * 100).toFixed(0)}% pass rate`)
      }
      lines.push('')
    }

    if (analysis.qualityAnalysis.academicRigorStats) {
      lines.push('### Academic Rigor Statistics')
      lines.push('')
      lines.push(`- **Avg Citations**: ${analysis.qualityAnalysis.academicRigorStats.avgCitations.toFixed(1)}`)
      lines.push(`- **Avg Peer-Reviewed Sources**: ${analysis.qualityAnalysis.academicRigorStats.avgPeerReviewedSources.toFixed(1)}`)
      lines.push(`- **Avg Recent Sources (2020+)**: ${analysis.qualityAnalysis.academicRigorStats.avgRecentSources.toFixed(1)}`)
      lines.push('')
    }
  }

  // SSE Health (v0.0.3)
  if (options.includeSSEHealth && analysis.sseAnalysis) {
    lines.push('## 13. SSE CONNECTION HEALTH')
    lines.push('')
    lines.push('```yaml')
    lines.push(`connection_stability: ${analysis.sseAnalysis.connectionStability}`)
    lines.push(`reconnections: ${analysis.sseAnalysis.reconnections}`)
    lines.push(`missed_heartbeats: ${analysis.sseAnalysis.missedHeartbeats}`)
    lines.push(`avg_latency_ms: ${analysis.sseAnalysis.avgLatencyMs.toFixed(0)}`)
    lines.push('```')
    lines.push('')

    if (analysis.sseAnalysis.connectionStability !== 'stable') {
      lines.push('**WARNING**: SSE connection instability detected. This may affect real-time updates.')
      lines.push('')
    }
  }

  // Score History (if included)
  if (options.includeScoreHistory && analysis.hypotheses.topPerformers.length > 0) {
    lines.push('## 14. SCORE PROGRESSION DATA')
    lines.push('')
    lines.push('### Top Hypotheses Score History')
    lines.push('')
    for (const hyp of analysis.hypotheses.topPerformers.slice(0, 3)) {
      lines.push(`#### ${hyp.title}`)
      lines.push('')
      lines.push('| Iteration | Score | Delta | Classification |')
      lines.push('|-----------|-------|-------|----------------|')
      for (const entry of hyp.scoreHistory) {
        const deltaStr = entry.delta >= 0 ? `+${entry.delta.toFixed(2)}` : entry.delta.toFixed(2)
        lines.push(`| ${entry.iteration} | ${entry.score.toFixed(2)} | ${deltaStr} | ${entry.classification} |`)
      }
      lines.push('')
    }
  }

  // Footer
  lines.push('---')
  lines.push('')
  lines.push('## ANALYSIS REQUEST')
  lines.push('')
  lines.push('Based on the data above, please provide:')
  lines.push('')
  lines.push('1. **Root Cause Analysis**: What are the primary reasons this session did/didn\'t achieve breakthroughs?')
  lines.push('2. **Agent Optimization**: Which agents should be improved and how?')
  lines.push('3. **Dimension Improvements**: How can we improve performance on the weakest dimensions (especially feasibility)?')
  lines.push('4. **Refinement Strategy**: How can we improve the hypothesis refinement process?')
  lines.push('5. **Cost Optimization**: How can we reduce LLM costs while maintaining quality?')
  lines.push('6. **Data Source Improvements**: Which data sources need attention?')
  lines.push('7. **Code Changes**: Specific code changes that would address the issues found.')
  lines.push('')
  lines.push('*Generated by Exergy Lab Breakthrough Engine v0.0.3*')

  return lines.join('\n')
}

// ============================================================================
// JSON Format
// ============================================================================

function formatAsJSON(
  session: BreakthroughDebugSession,
  analysis: BreakthroughAnalysisRequest,
  options: BreakthroughExportOptions
): string {
  const output: any = {
    metadata: {
      engineVersion: session.engineVersion,
      exportedAt: new Date().toISOString(),
      format: 'json',
      dimensionCount: 12,
    },
    session: {
      id: session.sessionId,
      query: session.query,
      domain: session.domain,
      status: session.status,
      config: session.config,
      duration: analysis.session.duration,
      systemInfo: options.includeSystemInfo ? session.systemInfo : undefined,
    },
    performance: analysis.performance,
    dimensions: analysis.dimensions,
    refinement: analysis.refinement,
    issues: analysis.issues,
    suggestedImprovements: analysis.suggestedImprovements,
  }

  if (options.includeFullHypotheses) {
    output.hypotheses = {
      breakthroughs: analysis.hypotheses.breakthroughs,
      topPerformers: analysis.hypotheses.topPerformers,
      eliminatedCount: analysis.hypotheses.eliminated.count,
      commonEliminationReasons: analysis.hypotheses.eliminated.commonReasons,
    }
  }

  if (options.includeErrors) {
    output.errors = session.errors
  }

  if (options.includeRawEvents) {
    output.events = session.events
  }

  // v0.0.3 additions
  if (options.includeLLMCalls && analysis.llmAnalysis) {
    output.llmAnalysis = analysis.llmAnalysis
  }

  if (options.includeCostAnalysis && analysis.costAnalysis) {
    output.costAnalysis = analysis.costAnalysis
  }

  if (options.includeDataSourceLogs && analysis.dataSourceAnalysis) {
    output.dataSourceAnalysis = analysis.dataSourceAnalysis
  }

  if (options.includeQualityValidation && analysis.qualityAnalysis) {
    output.qualityAnalysis = analysis.qualityAnalysis
  }

  if (options.includeSSEHealth && analysis.sseAnalysis) {
    output.sseAnalysis = analysis.sseAnalysis
  }

  return JSON.stringify(output, null, 2)
}

// ============================================================================
// Detailed JSON Format (Complete Debug Data)
// ============================================================================

function formatAsDetailedJSON(
  session: BreakthroughDebugSession,
  analysis: BreakthroughAnalysisRequest,
  options: BreakthroughExportOptions
): string {
  const output: any = {
    metadata: {
      engineVersion: session.engineVersion,
      exportedAt: new Date().toISOString(),
      format: 'detailed_json',
      dimensionCount: 12,
      exportOptions: options,
    },
    session: {
      id: session.sessionId,
      discoveryId: session.discoveryId,
      query: session.query,
      domain: session.domain,
      status: session.status,
      mode: session.mode,
      config: session.config,
      startTime: session.startTime,
      endTime: session.endTime,
      phaseTiming: session.phaseTiming,
      systemInfo: session.systemInfo,
    },
    analysis,
    // Full session data
    agentLogs: session.agentLogs,
    hypotheses: session.hypotheses,
    finalRaceStats: session.finalRaceStats,
    finalResult: session.finalResult,
    // v0.0.3 comprehensive data
    llmCalls: options.includeLLMCalls ? session.llmCalls : undefined,
    performanceSnapshots: options.includePerformanceSnapshots ? session.performanceSnapshots : undefined,
    performanceMetrics: session.performanceMetrics,
    uiStateTransitions: options.includeUITransitions ? session.uiStateTransitions : undefined,
    uiPerformanceMetrics: session.uiPerformanceMetrics,
    dataSourceLogs: options.includeDataSourceLogs ? session.dataSourceLogs : undefined,
    dataSourceMetrics: session.dataSourceMetrics,
    qualityValidationLogs: options.includeQualityValidation ? session.qualityValidationLogs : undefined,
    sseHealth: session.sseHealth,
    costSummary: session.costSummary,
    // Raw events (if requested)
    events: options.includeRawEvents ? session.events : undefined,
    apiCalls: options.includeRawEvents ? session.apiCalls : undefined,
    errors: options.includeErrors ? session.errors : undefined,
  }

  // Remove undefined values for cleaner output
  const cleanOutput = JSON.parse(JSON.stringify(output))

  return JSON.stringify(cleanOutput, null, 2)
}

// ============================================================================
// Markdown Format
// ============================================================================

function formatAsMarkdown(
  session: BreakthroughDebugSession,
  analysis: BreakthroughAnalysisRequest,
  options: BreakthroughExportOptions
): string {
  const lines: string[] = []

  lines.push('# Breakthrough Engine Debug Report')
  lines.push('')
  lines.push(`**Session ID**: ${session.sessionId}`)
  lines.push(`**Query**: ${session.query}`)
  lines.push(`**Domain**: ${session.domain}`)
  lines.push(`**Status**: ${session.status}`)
  lines.push(`**Duration**: ${formatDuration(analysis.session.duration.total)}`)
  lines.push(`**Exported**: ${new Date().toISOString()}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  // Summary
  lines.push('## Summary')
  lines.push('')
  lines.push(`- **Breakthroughs**: ${analysis.hypotheses.breakthroughs.length}`)
  lines.push(`- **Top Score**: ${analysis.performance.topScore.toFixed(2)}/10`)
  lines.push(`- **Average Score**: ${analysis.performance.averageFinalScore.toFixed(2)}/10`)
  lines.push(`- **Elimination Rate**: ${(analysis.performance.eliminationRate * 100).toFixed(0)}%`)
  lines.push('')

  // Top Hypotheses
  lines.push('## Top Hypotheses')
  lines.push('')
  for (const hyp of analysis.hypotheses.topPerformers.slice(0, 5)) {
    lines.push(`### ${hyp.title}`)
    lines.push('')
    lines.push(`- **Score**: ${hyp.finalScore.toFixed(2)}/10 (${hyp.classification})`)
    lines.push(`- **Agent**: ${hyp.agentSource}`)
    lines.push(`- **Iterations**: ${hyp.totalIterations}`)
    if (hyp.description) {
      lines.push(`- **Description**: ${hyp.description}`)
    }
    lines.push('')
  }

  // Improvements
  lines.push('## Suggested Improvements')
  lines.push('')
  for (const improvement of analysis.suggestedImprovements) {
    lines.push(`- ${improvement}`)
  }
  lines.push('')

  lines.push('---')
  lines.push('*Generated by Exergy Lab Breakthrough Engine v0.0.3*')

  return lines.join('\n')
}

// ============================================================================
// CSV Format
// ============================================================================

function formatAsCSV(
  session: BreakthroughDebugSession,
  analysis: BreakthroughAnalysisRequest,
  _options: BreakthroughExportOptions
): string {
  const lines: string[] = []

  // Hypothesis data
  lines.push('hypothesis_id,title,agent_source,initial_score,final_score,classification,status,iterations,breakthrough_at')

  for (const hyp of [...analysis.hypotheses.breakthroughs, ...analysis.hypotheses.topPerformers]) {
    const title = hyp.title.replace(/,/g, ';').replace(/"/g, '""')
    lines.push([
      hyp.id,
      `"${title}"`,
      hyp.agentSource,
      hyp.initialScore.toFixed(2),
      hyp.finalScore.toFixed(2),
      hyp.classification,
      hyp.status,
      hyp.totalIterations,
      hyp.breakthroughAchievedAt || '',
    ].join(','))
  }

  return lines.join('\n')
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

export default formatBreakthroughSession
