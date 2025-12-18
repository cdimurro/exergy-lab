/**
 * Literature Consistency Benchmark
 *
 * Validates discovery consistency with published research:
 * - Source coverage and quality
 * - Citation quality (peer-reviewed)
 * - Claim alignment with evidence
 * - Contradiction detection
 * - Novelty assessment
 * - Recency bias check (per Grok feedback: flag if >70% sources pre-2020)
 *
 * Weight: 0.15 (baseline validation)
 * Confidence: 0.8 (generally reliable)
 */

import type {
  BenchmarkResult,
  BenchmarkItemResult,
  BenchmarkMetadata,
  LiteratureSource,
  SourceRecency,
} from './types'

// ============================================================================
// Literature Benchmark Configuration
// ============================================================================

export interface LiteratureBenchmarkConfig {
  minSources: number
  minPeerReviewedRatio: number
  recentThresholdYear: number
  minRecentRatio: number
}

export const DEFAULT_LITERATURE_CONFIG: LiteratureBenchmarkConfig = {
  minSources: 3,
  minPeerReviewedRatio: 0.5,
  recentThresholdYear: 2020,
  minRecentRatio: 0.3, // At least 30% should be from 2020+
}

// ============================================================================
// Source Quality Tiers
// ============================================================================

export const SOURCE_QUALITY_TIERS = {
  tier1: {
    types: ['peer_reviewed_paper', 'nature', 'science', 'cell'],
    weight: 1.0,
    description: 'Top-tier peer-reviewed journals',
  },
  tier2: {
    types: ['paper', 'journal', 'conference'],
    weight: 0.8,
    description: 'Peer-reviewed publications',
  },
  tier3: {
    types: ['patent', 'government_report', 'technical_report'],
    weight: 0.6,
    description: 'Patents and official reports',
  },
  tier4: {
    types: ['preprint', 'arxiv', 'white_paper'],
    weight: 0.4,
    description: 'Pre-prints and white papers',
  },
  tier5: {
    types: ['website', 'blog', 'news', 'dataset'],
    weight: 0.2,
    description: 'Non-peer-reviewed sources',
  },
} as const

// ============================================================================
// Literature Benchmark Validator
// ============================================================================

export class LiteratureBenchmarkValidator {
  private config: LiteratureBenchmarkConfig
  private startTime: number = 0

  constructor(config: Partial<LiteratureBenchmarkConfig> = {}) {
    this.config = { ...DEFAULT_LITERATURE_CONFIG, ...config }
  }

  /**
   * Validate discovery against literature consistency criteria
   */
  async validate(
    discoveryOutput: any,
    sources: LiteratureSource[]
  ): Promise<BenchmarkResult> {
    this.startTime = Date.now()

    const items: BenchmarkItemResult[] = []

    // L1: Source coverage
    items.push(this.assessSourceCoverage(sources))

    // L2: Citation quality (peer-reviewed ratio)
    items.push(this.assessCitationQuality(sources))

    // L3: Claim alignment with evidence
    items.push(await this.assessClaimAlignment(discoveryOutput, sources))

    // L4: Contradiction detection
    items.push(await this.checkContradictions(discoveryOutput, sources))

    // L5: Novelty assessment
    items.push(await this.assessNovelty(discoveryOutput, sources))

    // L6: Recency bias check (per Grok feedback)
    items.push(this.checkRecencyBias(sources))

    // Calculate totals
    const totalScore = items.reduce((sum, item) => sum + item.score, 0)
    const maxScore = items.reduce((sum, item) => sum + item.maxScore, 0)

    const metadata: BenchmarkMetadata = {
      evaluationTimeMs: Date.now() - this.startTime,
      version: '1.0.0',
      checksRun: items.length,
    }

    return {
      benchmarkType: 'literature',
      score: this.normalizeScore(totalScore, maxScore),
      maxScore: 10,
      passed: totalScore >= maxScore * 0.7,
      weight: 0.15,
      confidence: 0.8,
      items,
      metadata,
    }
  }

  /**
   * L1: Assess source coverage - are there enough sources?
   */
  private assessSourceCoverage(sources: LiteratureSource[]): BenchmarkItemResult {
    const sourceCount = sources?.length || 0
    const minSources = this.config.minSources

    let score: number
    let passed: boolean
    let reasoning: string
    const suggestions: string[] = []

    if (sourceCount >= minSources * 2) {
      score = 2.0
      passed = true
      reasoning = `Excellent coverage: ${sourceCount} sources (>= ${minSources * 2} recommended)`
    } else if (sourceCount >= minSources) {
      score = 1.5
      passed = true
      reasoning = `Good coverage: ${sourceCount} sources (>= ${minSources} minimum)`
    } else if (sourceCount >= 2) {
      score = 0.75
      passed = false
      reasoning = `Limited coverage: ${sourceCount} sources (< ${minSources} minimum)`
      suggestions.push(`Add ${minSources - sourceCount} more sources to meet minimum coverage`)
    } else {
      score = 0.25
      passed = false
      reasoning = `Insufficient coverage: only ${sourceCount} source(s)`
      suggestions.push('Expand literature search to include more relevant sources')
    }

    return {
      id: 'L1',
      name: 'Source Coverage',
      score,
      maxScore: 2.0,
      passed,
      reasoning,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    }
  }

  /**
   * L2: Assess citation quality - peer-reviewed ratio
   */
  private assessCitationQuality(sources: LiteratureSource[]): BenchmarkItemResult {
    if (!sources || sources.length === 0) {
      return {
        id: 'L2',
        name: 'Citation Quality',
        score: 0,
        maxScore: 2.0,
        passed: false,
        reasoning: 'No sources provided',
        suggestions: ['Add peer-reviewed sources to support claims'],
      }
    }

    const peerReviewedCount = sources.filter(s =>
      s.peerReviewed ||
      s.type === 'paper' ||
      this.isPeerReviewedType(s.type)
    ).length

    const peerReviewedRatio = peerReviewedCount / sources.length
    const minRatio = this.config.minPeerReviewedRatio

    let score: number
    let passed: boolean
    let reasoning: string
    const suggestions: string[] = []

    if (peerReviewedRatio >= 0.8) {
      score = 2.0
      passed = true
      reasoning = `Excellent quality: ${Math.round(peerReviewedRatio * 100)}% peer-reviewed (${peerReviewedCount}/${sources.length})`
    } else if (peerReviewedRatio >= minRatio) {
      score = 1.5
      passed = true
      reasoning = `Good quality: ${Math.round(peerReviewedRatio * 100)}% peer-reviewed (${peerReviewedCount}/${sources.length})`
    } else if (peerReviewedCount >= 2) {
      score = 0.75
      passed = false
      reasoning = `Limited quality: only ${Math.round(peerReviewedRatio * 100)}% peer-reviewed (${peerReviewedCount}/${sources.length})`
      suggestions.push('Replace non-peer-reviewed sources with journal publications')
    } else {
      score = 0.25
      passed = false
      reasoning = `Poor quality: only ${peerReviewedCount} peer-reviewed source(s)`
      suggestions.push('Add peer-reviewed journal articles as primary sources')
    }

    return {
      id: 'L2',
      name: 'Citation Quality',
      score,
      maxScore: 2.0,
      passed,
      reasoning,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    }
  }

  /**
   * L3: Assess claim alignment with evidence
   */
  private async assessClaimAlignment(
    discoveryOutput: any,
    sources: LiteratureSource[]
  ): Promise<BenchmarkItemResult> {
    const claims = this.extractClaims(discoveryOutput)
    const sourceCount = sources?.length || 0

    if (claims.length === 0) {
      return {
        id: 'L3',
        name: 'Claim-Evidence Alignment',
        score: 0.5,
        maxScore: 2.0,
        passed: false,
        reasoning: 'No explicit claims found to validate',
        suggestions: ['Make claims more explicit with supporting evidence'],
      }
    }

    // Simple heuristic: check if claims reference sources
    const supportedClaims = claims.filter(claim =>
      claim.citation ||
      claim.source ||
      (claim.evidence && claim.evidence.length > 0)
    )

    const supportRatio = supportedClaims.length / claims.length

    let score: number
    let passed: boolean
    let reasoning: string
    const suggestions: string[] = []

    if (supportRatio >= 0.8) {
      score = 2.0
      passed = true
      reasoning = `Excellent alignment: ${Math.round(supportRatio * 100)}% claims supported (${supportedClaims.length}/${claims.length})`
    } else if (supportRatio >= 0.6) {
      score = 1.5
      passed = true
      reasoning = `Good alignment: ${Math.round(supportRatio * 100)}% claims supported`
    } else if (supportRatio >= 0.4) {
      score = 0.75
      passed = false
      reasoning = `Partial alignment: ${Math.round(supportRatio * 100)}% claims supported`
      suggestions.push('Add citations for unsupported claims')
    } else {
      score = 0.25
      passed = false
      reasoning = `Poor alignment: only ${Math.round(supportRatio * 100)}% claims have evidence`
      suggestions.push('Most claims lack supporting evidence - strengthen citations')
    }

    return {
      id: 'L3',
      name: 'Claim-Evidence Alignment',
      score,
      maxScore: 2.0,
      passed,
      reasoning,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    }
  }

  /**
   * L4: Check for contradictions with established literature
   */
  private async checkContradictions(
    discoveryOutput: any,
    sources: LiteratureSource[]
  ): Promise<BenchmarkItemResult> {
    // Extract any contradiction indicators from the output
    const contradictions = this.extractContradictions(discoveryOutput)

    let score: number
    let passed: boolean
    let reasoning: string
    const suggestions: string[] = []

    if (contradictions.length === 0) {
      score = 1.5
      passed = true
      reasoning = 'No contradictions detected with established literature'
    } else if (contradictions.length === 1 && contradictions[0].acknowledged) {
      score = 1.0
      passed = true
      reasoning = 'Minor contradiction acknowledged and addressed'
    } else if (contradictions.every(c => c.acknowledged)) {
      score = 0.75
      passed = false
      reasoning = `${contradictions.length} contradictions found but acknowledged`
      suggestions.push('Provide stronger justification for deviations from literature')
    } else {
      score = 0.25
      passed = false
      reasoning = `${contradictions.filter(c => !c.acknowledged).length} unacknowledged contradiction(s)`
      suggestions.push('Address contradictions with established research findings')
    }

    return {
      id: 'L4',
      name: 'Contradiction Check',
      score,
      maxScore: 1.5,
      passed,
      reasoning,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
      evidence: contradictions.map(c => c.description),
    }
  }

  /**
   * L5: Assess novelty of the discovery
   */
  private async assessNovelty(
    discoveryOutput: any,
    sources: LiteratureSource[]
  ): Promise<BenchmarkItemResult> {
    // Extract novelty claims
    const noveltyIndicators = this.extractNoveltyIndicators(discoveryOutput)

    let score: number
    let passed: boolean
    let reasoning: string
    const suggestions: string[] = []

    if (noveltyIndicators.hasNovelCombination && noveltyIndicators.hasNovelMechanism) {
      score = 1.5
      passed = true
      reasoning = 'Strong novelty: new combination and mechanism proposed'
    } else if (noveltyIndicators.hasNovelCombination || noveltyIndicators.hasNovelMechanism) {
      score = 1.0
      passed = true
      reasoning = noveltyIndicators.hasNovelCombination
        ? 'Novel combination of existing concepts'
        : 'Novel mechanism or approach'
    } else if (noveltyIndicators.hasIncrementalImprovement) {
      score = 0.5
      passed = false
      reasoning = 'Incremental improvement on existing work'
      suggestions.push('Highlight unique aspects that differentiate from prior work')
    } else {
      score = 0.25
      passed = false
      reasoning = 'Limited novelty detected'
      suggestions.push('Clarify what makes this discovery novel compared to existing literature')
    }

    return {
      id: 'L5',
      name: 'Novelty Assessment',
      score,
      maxScore: 1.5,
      passed,
      reasoning,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    }
  }

  /**
   * L6: Recency bias check (per Grok feedback)
   * Flag if >70% sources are pre-2020
   */
  private checkRecencyBias(sources: LiteratureSource[]): BenchmarkItemResult {
    const recency = this.analyzeSourceRecency(sources)

    let score: number
    let passed: boolean
    let reasoning: string
    const suggestions: string[] = []

    if (recency.totalSources === 0) {
      return {
        id: 'L6',
        name: 'Recency Balance',
        score: 0,
        maxScore: 1.0,
        passed: false,
        reasoning: 'No sources to analyze for recency',
        suggestions: ['Add dated sources to enable recency analysis'],
      }
    }

    if (!recency.hasRecencyBias) {
      // Good recency balance
      if (recency.recentRatio >= 0.5) {
        score = 1.0
        passed = true
        reasoning = `Excellent recency: ${Math.round(recency.recentRatio * 100)}% sources from 2020+ (${recency.recentSources}/${recency.totalSources})`
      } else {
        score = 0.75
        passed = true
        reasoning = `Good recency balance: ${Math.round(recency.recentRatio * 100)}% sources from 2020+ (${recency.recentSources}/${recency.totalSources})`
      }
    } else {
      // Has recency bias - majority of sources are old
      score = 0.25
      passed = false
      reasoning = `Recency bias detected: only ${Math.round(recency.recentRatio * 100)}% sources from 2020+ (${recency.recentSources}/${recency.totalSources})`
      suggestions.push('Add more recent sources (2020+) to capture latest developments in the field')
      suggestions.push('Recent literature may contain important advances or corrections')
    }

    return {
      id: 'L6',
      name: 'Recency Balance',
      score,
      maxScore: 1.0,
      passed,
      reasoning,
      suggestions: suggestions.length > 0 ? suggestions : undefined,
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Analyze source recency distribution
   */
  analyzeSourceRecency(sources: LiteratureSource[]): SourceRecency {
    const totalSources = sources?.length || 0

    if (totalSources === 0) {
      return {
        totalSources: 0,
        recentSources: 0,
        recentRatio: 0,
        hasRecencyBias: false,
      }
    }

    const recentSources = sources.filter(s => {
      const year = this.extractYear(s)
      return year !== null && year >= this.config.recentThresholdYear
    }).length

    const recentRatio = recentSources / totalSources
    const hasRecencyBias = recentRatio < this.config.minRecentRatio

    return {
      totalSources,
      recentSources,
      recentRatio,
      hasRecencyBias,
    }
  }

  /**
   * Extract year from source
   */
  private extractYear(source: LiteratureSource): number | null {
    if (source.year) return source.year
    if (source.publicationYear) return source.publicationYear

    if (source.date) {
      const match = source.date.match(/\d{4}/)
      return match ? parseInt(match[0]) : null
    }

    return null
  }

  /**
   * Check if source type is peer-reviewed
   */
  private isPeerReviewedType(type?: string): boolean {
    if (!type) return false
    const peerReviewedTypes = ['paper', 'journal', 'conference', 'peer_reviewed_paper']
    return peerReviewedTypes.includes(type.toLowerCase())
  }

  /**
   * Extract claims from discovery output
   */
  private extractClaims(output: any): Array<{
    text?: string
    citation?: string
    source?: string
    evidence?: string[]
  }> {
    const claims: any[] = []

    // Check hypothesis evidence
    if (output.hypothesis?.evidence) {
      claims.push(...output.hypothesis.evidence)
    }

    // Check simulation claims
    if (output.simulation?.findings) {
      claims.push(...output.simulation.findings.map((f: any) => ({
        text: f.description || f.finding,
        evidence: f.supporting_data ? [f.supporting_data] : [],
      })))
    }

    // Check research findings
    if (output.research?.keyFindings) {
      claims.push(...output.research.keyFindings.map((f: any) => ({
        text: f,
        citation: output.research.sources?.[0]?.id,
      })))
    }

    return claims
  }

  /**
   * Extract contradiction indicators
   */
  private extractContradictions(output: any): Array<{
    description: string
    acknowledged: boolean
  }> {
    const contradictions: Array<{ description: string; acknowledged: boolean }> = []

    // Check for explicitly mentioned contradictions
    if (output.hypothesis?.contradictions) {
      contradictions.push(...output.hypothesis.contradictions.map((c: any) => ({
        description: c.description || c,
        acknowledged: c.acknowledged !== false,
      })))
    }

    // Check for limitation mentions
    if (output.limitations) {
      const contradictionKeywords = ['contrary', 'conflict', 'disagree', 'oppose', 'contradict']
      for (const limitation of output.limitations) {
        const text = typeof limitation === 'string' ? limitation : limitation.description
        if (contradictionKeywords.some(kw => text?.toLowerCase().includes(kw))) {
          contradictions.push({
            description: text,
            acknowledged: true,
          })
        }
      }
    }

    return contradictions
  }

  /**
   * Extract novelty indicators
   */
  private extractNoveltyIndicators(output: any): {
    hasNovelCombination: boolean
    hasNovelMechanism: boolean
    hasIncrementalImprovement: boolean
  } {
    const noveltyKeywords = {
      combination: ['novel combination', 'new approach', 'first to combine', 'unique integration'],
      mechanism: ['new mechanism', 'novel pathway', 'unprecedented', 'first demonstration'],
      incremental: ['improvement', 'enhancement', 'optimization', 'refinement'],
    }

    const outputText = JSON.stringify(output).toLowerCase()

    return {
      hasNovelCombination: noveltyKeywords.combination.some(kw => outputText.includes(kw)),
      hasNovelMechanism: noveltyKeywords.mechanism.some(kw => outputText.includes(kw)),
      hasIncrementalImprovement: noveltyKeywords.incremental.some(kw => outputText.includes(kw)),
    }
  }

  /**
   * Normalize score to 0-10 scale
   */
  private normalizeScore(score: number, maxScore: number): number {
    if (maxScore === 0) return 0
    return (score / maxScore) * 10
  }

  /**
   * Get source quality tier
   */
  getSourceQualityTier(source: LiteratureSource): keyof typeof SOURCE_QUALITY_TIERS | null {
    const sourceType = source.type?.toLowerCase() || ''

    for (const [tier, config] of Object.entries(SOURCE_QUALITY_TIERS)) {
      if (config.types.some(t => sourceType.includes(t))) {
        return tier as keyof typeof SOURCE_QUALITY_TIERS
      }
    }

    return 'tier5' // Default to lowest tier
  }

  /**
   * Calculate weighted source quality score
   */
  calculateWeightedQuality(sources: LiteratureSource[]): number {
    if (!sources || sources.length === 0) return 0

    let totalWeight = 0
    let weightedSum = 0

    for (const source of sources) {
      const tier = this.getSourceQualityTier(source)
      const weight = tier ? SOURCE_QUALITY_TIERS[tier].weight : 0.2
      weightedSum += weight
      totalWeight += 1.0
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const literatureBenchmarkValidator = new LiteratureBenchmarkValidator()
