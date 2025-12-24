/**
 * Novelty Tracker (v0.0.5.0)
 *
 * Tracks and measures novelty of hypotheses using multiple dimensions:
 * - Embedding distance: Semantic distance from existing literature
 * - Cross-domain score: Number of distinct domains combined
 * - SOTA delta: Quantified improvement over state-of-art
 * - Citation distance: How far apart combined concepts are in citation networks
 * - Experimental validation rate: Track which hypotheses get lab-tested
 *
 * @see hypothesis-racer.ts - Integration with breakthrough engine
 * @see hypothesis-history.ts - Historical hypothesis tracking
 */

import type { RacingHypothesis, HypGenAgentType } from '../agents/hypgen'
import type { ResearchResult, Source } from '../agents/research-agent'

// ============================================================================
// Types
// ============================================================================

export interface NoveltyMetrics {
  /** Overall novelty score (0-100) */
  overallScore: number
  /** Semantic distance from nearest literature cluster */
  embeddingDistance: number
  /** Number of distinct domains combined */
  crossDomainCount: number
  /** Distance between combined domains in embedding space */
  crossDomainDistance: number
  /** Improvement over current SOTA (percentage) */
  sotaDelta: number
  /** Citation network distance between combined concepts */
  citationDistance: number
  /** Concept recombination score */
  recombinationScore: number
  /** Has this hypothesis been validated experimentally? */
  experimentallyValidated: boolean
  /** Confidence in novelty assessment */
  confidence: number
  /** Detailed breakdown by dimension */
  dimensions: NoveltyDimension[]
}

export interface NoveltyDimension {
  name: string
  score: number
  weight: number
  evidence: string
}

export interface NoveltyHistory {
  hypothesisId: string
  title: string
  agentSource: HypGenAgentType
  generatedAt: number
  metrics: NoveltyMetrics
  breakthrough: boolean
  experimentalValidation?: {
    validated: boolean
    validatedAt?: number
    validatedBy?: string
    outcome?: 'confirmed' | 'partially_confirmed' | 'refuted'
  }
}

export interface DomainCluster {
  id: string
  name: string
  keywords: string[]
  centroid: number[] // Embedding centroid
  papers: number
}

export interface NoveltyTrackerConfig {
  /** Weight for embedding distance in overall score */
  embeddingWeight: number
  /** Weight for cross-domain combination */
  crossDomainWeight: number
  /** Weight for SOTA improvement */
  sotaWeight: number
  /** Weight for citation distance */
  citationWeight: number
  /** Minimum embedding distance to be considered novel */
  minNovelDistance: number
  /** Enable experimental validation tracking */
  trackExperimentalValidation: boolean
}

export interface NoveltyStats {
  totalHypotheses: number
  averageNoveltyScore: number
  highNoveltyCount: number // Score > 80
  mediumNoveltyCount: number // Score 50-80
  lowNoveltyCount: number // Score < 50
  experimentalValidationRate: number
  byAgent: Record<HypGenAgentType, {
    count: number
    averageNovelty: number
    highNoveltyRate: number
  }>
  topNovelConcepts: string[]
}

// ============================================================================
// Default Configuration
// ============================================================================

export const DEFAULT_NOVELTY_CONFIG: NoveltyTrackerConfig = {
  embeddingWeight: 0.30,
  crossDomainWeight: 0.25,
  sotaWeight: 0.25,
  citationWeight: 0.20,
  minNovelDistance: 0.3,
  trackExperimentalValidation: true,
}

// ============================================================================
// Domain Definitions
// ============================================================================

export const DOMAIN_DEFINITIONS: DomainCluster[] = [
  {
    id: 'solar_pv',
    name: 'Solar Photovoltaics',
    keywords: ['solar cell', 'photovoltaic', 'perovskite', 'silicon', 'tandem', 'module'],
    centroid: [],
    papers: 250000,
  },
  {
    id: 'battery',
    name: 'Battery Technology',
    keywords: ['battery', 'lithium', 'electrode', 'cathode', 'anode', 'electrolyte'],
    centroid: [],
    papers: 180000,
  },
  {
    id: 'hydrogen',
    name: 'Hydrogen & Fuel Cells',
    keywords: ['hydrogen', 'fuel cell', 'electrolyzer', 'pem', 'sofc', 'electrolysis'],
    centroid: [],
    papers: 95000,
  },
  {
    id: 'wind',
    name: 'Wind Energy',
    keywords: ['wind turbine', 'wind farm', 'offshore wind', 'blade', 'nacelle'],
    centroid: [],
    papers: 85000,
  },
  {
    id: 'thermal',
    name: 'Thermal Systems',
    keywords: ['heat exchanger', 'thermal storage', 'solar thermal', 'csp', 'heat pump'],
    centroid: [],
    papers: 120000,
  },
  {
    id: 'materials',
    name: 'Advanced Materials',
    keywords: ['nanomaterial', 'catalyst', 'polymer', 'composite', 'coating', 'alloy'],
    centroid: [],
    papers: 500000,
  },
  {
    id: 'ai_ml',
    name: 'AI & Machine Learning',
    keywords: ['machine learning', 'neural network', 'optimization', 'prediction', 'model'],
    centroid: [],
    papers: 400000,
  },
  {
    id: 'biology',
    name: 'Biological Systems',
    keywords: ['biomass', 'enzyme', 'photosynthesis', 'biofuel', 'microbial', 'algae'],
    centroid: [],
    papers: 150000,
  },
  {
    id: 'grid',
    name: 'Power Grid & Storage',
    keywords: ['grid', 'storage', 'inverter', 'power electronics', 'transmission'],
    centroid: [],
    papers: 110000,
  },
  {
    id: 'ccs',
    name: 'Carbon Capture',
    keywords: ['carbon capture', 'co2', 'dac', 'sequestration', 'negative emissions'],
    centroid: [],
    papers: 45000,
  },
]

// ============================================================================
// Novelty Tracker Implementation
// ============================================================================

export class NoveltyTracker {
  private config: NoveltyTrackerConfig
  private history: NoveltyHistory[] = []
  private embeddings: Map<string, number[]> = new Map()

  constructor(config: Partial<NoveltyTrackerConfig> = {}) {
    this.config = { ...DEFAULT_NOVELTY_CONFIG, ...config }
  }

  /**
   * Calculate novelty metrics for a hypothesis
   */
  async calculateNovelty(
    hypothesis: RacingHypothesis,
    research?: ResearchResult
  ): Promise<NoveltyMetrics> {
    const dimensions: NoveltyDimension[] = []

    // 1. Embedding distance (semantic novelty)
    const embeddingDistance = await this.calculateEmbeddingDistance(hypothesis, research)
    dimensions.push({
      name: 'Semantic Distance',
      score: this.normalizeDistance(embeddingDistance) * 100,
      weight: this.config.embeddingWeight,
      evidence: `Embedding distance: ${embeddingDistance.toFixed(3)}`,
    })

    // 2. Cross-domain combination
    const { count: crossDomainCount, distance: crossDomainDistance } =
      this.calculateCrossDomainMetrics(hypothesis)
    dimensions.push({
      name: 'Cross-Domain Fusion',
      score: this.scoreCrossDomain(crossDomainCount, crossDomainDistance) * 100,
      weight: this.config.crossDomainWeight,
      evidence: `${crossDomainCount} domains combined, distance ${crossDomainDistance.toFixed(2)}`,
    })

    // 3. SOTA delta
    const sotaDelta = this.calculateSOTADelta(hypothesis)
    dimensions.push({
      name: 'SOTA Improvement',
      score: this.scoreSOTADelta(sotaDelta) * 100,
      weight: this.config.sotaWeight,
      evidence: `${sotaDelta > 0 ? '+' : ''}${(sotaDelta * 100).toFixed(1)}% vs current SOTA`,
    })

    // 4. Citation distance
    const citationDistance = this.calculateCitationDistance(hypothesis)
    dimensions.push({
      name: 'Citation Distance',
      score: this.normalizeCitationDistance(citationDistance) * 100,
      weight: this.config.citationWeight,
      evidence: `Citation network distance: ${citationDistance.toFixed(1)}`,
    })

    // 5. Recombination score
    const recombinationScore = this.calculateRecombinationScore(hypothesis)

    // Calculate overall score
    const overallScore = dimensions.reduce(
      (sum, d) => sum + d.score * d.weight,
      0
    )

    // Calculate confidence
    const confidence = this.calculateConfidence(research, dimensions)

    return {
      overallScore,
      embeddingDistance,
      crossDomainCount,
      crossDomainDistance,
      sotaDelta,
      citationDistance,
      recombinationScore,
      experimentallyValidated: false,
      confidence,
      dimensions,
    }
  }

  /**
   * Track a hypothesis in history
   */
  trackHypothesis(
    hypothesis: RacingHypothesis,
    metrics: NoveltyMetrics,
    breakthrough: boolean
  ): void {
    const entry: NoveltyHistory = {
      hypothesisId: hypothesis.id,
      title: hypothesis.title,
      agentSource: hypothesis.agentSource,
      generatedAt: Date.now(),
      metrics,
      breakthrough,
    }

    this.history.push(entry)

    console.log(
      `[NoveltyTracker] Tracked hypothesis ${hypothesis.id.slice(-8)}: ` +
      `novelty=${metrics.overallScore.toFixed(1)}, breakthrough=${breakthrough}`
    )
  }

  /**
   * Record experimental validation for a hypothesis
   */
  recordExperimentalValidation(
    hypothesisId: string,
    validated: boolean,
    validatedBy?: string,
    outcome?: 'confirmed' | 'partially_confirmed' | 'refuted'
  ): void {
    const entry = this.history.find(h => h.hypothesisId === hypothesisId)
    if (entry && this.config.trackExperimentalValidation) {
      entry.metrics.experimentallyValidated = validated
      entry.experimentalValidation = {
        validated,
        validatedAt: Date.now(),
        validatedBy,
        outcome,
      }

      console.log(
        `[NoveltyTracker] Experimental validation recorded for ${hypothesisId.slice(-8)}: ` +
        `${outcome || (validated ? 'validated' : 'not validated')}`
      )
    }
  }

  /**
   * Get novelty statistics
   */
  getStats(): NoveltyStats {
    if (this.history.length === 0) {
      return {
        totalHypotheses: 0,
        averageNoveltyScore: 0,
        highNoveltyCount: 0,
        mediumNoveltyCount: 0,
        lowNoveltyCount: 0,
        experimentalValidationRate: 0,
        byAgent: {} as Record<HypGenAgentType, any>,
        topNovelConcepts: [],
      }
    }

    const scores = this.history.map(h => h.metrics.overallScore)
    const averageNoveltyScore = scores.reduce((a, b) => a + b, 0) / scores.length

    const highNoveltyCount = scores.filter(s => s > 80).length
    const mediumNoveltyCount = scores.filter(s => s >= 50 && s <= 80).length
    const lowNoveltyCount = scores.filter(s => s < 50).length

    const validatedCount = this.history.filter(h => h.metrics.experimentallyValidated).length
    const experimentalValidationRate = validatedCount / this.history.length

    // Stats by agent
    const byAgent: Record<string, { count: number; totalNovelty: number; highNovelty: number }> = {}
    for (const entry of this.history) {
      if (!byAgent[entry.agentSource]) {
        byAgent[entry.agentSource] = { count: 0, totalNovelty: 0, highNovelty: 0 }
      }
      byAgent[entry.agentSource].count++
      byAgent[entry.agentSource].totalNovelty += entry.metrics.overallScore
      if (entry.metrics.overallScore > 80) {
        byAgent[entry.agentSource].highNovelty++
      }
    }

    const agentStats: Record<HypGenAgentType, { count: number; averageNovelty: number; highNoveltyRate: number }> =
      {} as Record<HypGenAgentType, { count: number; averageNovelty: number; highNoveltyRate: number }>

    for (const [agent, stats] of Object.entries(byAgent)) {
      agentStats[agent as HypGenAgentType] = {
        count: stats.count,
        averageNovelty: stats.totalNovelty / stats.count,
        highNoveltyRate: stats.highNovelty / stats.count,
      }
    }

    // Top novel concepts (from high-novelty hypotheses)
    const topNovelConcepts = this.history
      .filter(h => h.metrics.overallScore > 75)
      .slice(0, 10)
      .map(h => h.title)

    return {
      totalHypotheses: this.history.length,
      averageNoveltyScore,
      highNoveltyCount,
      mediumNoveltyCount,
      lowNoveltyCount,
      experimentalValidationRate,
      byAgent: agentStats,
      topNovelConcepts,
    }
  }

  /**
   * Get history for a specific hypothesis
   */
  getHypothesisHistory(hypothesisId: string): NoveltyHistory | undefined {
    return this.history.find(h => h.hypothesisId === hypothesisId)
  }

  /**
   * Get all high-novelty hypotheses
   */
  getHighNoveltyHypotheses(threshold: number = 80): NoveltyHistory[] {
    return this.history.filter(h => h.metrics.overallScore >= threshold)
  }

  /**
   * Get hypotheses awaiting experimental validation
   */
  getPendingValidation(): NoveltyHistory[] {
    return this.history.filter(
      h => h.breakthrough && !h.metrics.experimentallyValidated
    )
  }

  /**
   * Clear tracking history
   */
  clearHistory(): void {
    this.history = []
    this.embeddings.clear()
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Calculate embedding distance (simplified - would use real embeddings in production)
   */
  private async calculateEmbeddingDistance(
    hypothesis: RacingHypothesis,
    research?: ResearchResult
  ): Promise<number> {
    // In production, this would use a real embedding model (e.g., OpenAI, Sentence-BERT)
    // For now, we simulate based on keyword overlap and domain detection

    const hypothesisText = `${hypothesis.title} ${hypothesis.statement}`.toLowerCase()

    // Calculate novelty based on keyword rarity and combination
    let totalKeywordScore = 0
    let matchedDomains = 0

    for (const domain of DOMAIN_DEFINITIONS) {
      const domainMatches = domain.keywords.filter(kw => hypothesisText.includes(kw)).length
      if (domainMatches > 0) {
        matchedDomains++
        // Rarer domains (fewer papers) contribute more to novelty
        const rarityBonus = 1 - Math.log10(domain.papers) / 6
        totalKeywordScore += domainMatches * (1 + rarityBonus)
      }
    }

    // Base distance from keyword matching
    const baseDistance = totalKeywordScore > 0 ? 0.5 + (1 / (1 + totalKeywordScore)) * 0.3 : 0.3

    // Bonus for multi-domain combinations
    const domainBonus = matchedDomains > 2 ? 0.2 : matchedDomains > 1 ? 0.1 : 0

    // Reduce distance if hypothesis overlaps heavily with research sources
    let overlapPenalty = 0
    if (research?.sources) {
      const researchText = research.sources.map(s => s.title.toLowerCase()).join(' ')
      const overlapScore = this.calculateTextOverlap(hypothesisText, researchText)
      overlapPenalty = overlapScore * 0.3
    }

    return Math.max(0, Math.min(1, baseDistance + domainBonus - overlapPenalty))
  }

  /**
   * Calculate cross-domain metrics
   */
  private calculateCrossDomainMetrics(hypothesis: RacingHypothesis): {
    count: number
    distance: number
  } {
    const text = `${hypothesis.title} ${hypothesis.statement}`.toLowerCase()
    const matchedDomains: DomainCluster[] = []

    for (const domain of DOMAIN_DEFINITIONS) {
      const matches = domain.keywords.filter(kw => text.includes(kw)).length
      if (matches >= 2) {
        matchedDomains.push(domain)
      }
    }

    const count = matchedDomains.length

    // Calculate "distance" between domains based on paper count ratio (proxy for field distance)
    let totalDistance = 0
    if (count >= 2) {
      for (let i = 0; i < matchedDomains.length; i++) {
        for (let j = i + 1; j < matchedDomains.length; j++) {
          const d1 = matchedDomains[i]
          const d2 = matchedDomains[j]
          // Fields with very different paper counts are more "distant"
          const paperRatio = Math.max(d1.papers, d2.papers) / Math.min(d1.papers, d2.papers)
          totalDistance += Math.log10(paperRatio)
        }
      }
      totalDistance /= (count * (count - 1)) / 2
    }

    return { count, distance: totalDistance }
  }

  /**
   * Calculate SOTA delta
   */
  private calculateSOTADelta(hypothesis: RacingHypothesis): number {
    // Extract predicted improvement from hypothesis
    if (!hypothesis.predictions || hypothesis.predictions.length === 0) {
      return 0
    }

    // Look for efficiency, cost, or performance improvements
    for (const prediction of hypothesis.predictions) {
      const statement = prediction.statement?.toLowerCase() || ''

      if (statement.includes('efficiency') || statement.includes('improvement') ||
          statement.includes('increase')) {
        const expectedValue = prediction.expectedValue
        if (typeof expectedValue === 'number') {
          // Assume percentage improvement
          return expectedValue > 1 ? expectedValue / 100 : expectedValue
        }
      }

      if (statement.includes('cost') || statement.includes('reduction') ||
          statement.includes('decrease')) {
        const expectedValue = prediction.expectedValue
        if (typeof expectedValue === 'number') {
          return expectedValue > 1 ? expectedValue / 100 : expectedValue
        }
      }
    }

    // Fallback: estimate from feasibility and impact scores
    const feasibility = hypothesis.feasibilityScore || 50
    const impact = hypothesis.scores?.overall || 5

    return (impact / 10) * (feasibility / 100) * 0.3 // Max 30% improvement estimate
  }

  /**
   * Calculate citation network distance
   */
  private calculateCitationDistance(hypothesis: RacingHypothesis): number {
    // This would use a real citation graph in production (e.g., Semantic Scholar API)
    // For now, estimate based on cross-domain metrics

    const { count, distance } = this.calculateCrossDomainMetrics(hypothesis)

    // More domains = higher citation distance potential
    const domainContribution = Math.min(count, 4) * 1.5

    // Distance between domains adds to citation distance
    const distanceContribution = distance * 2

    return domainContribution + distanceContribution
  }

  /**
   * Calculate recombination score (how creatively concepts are combined)
   */
  private calculateRecombinationScore(hypothesis: RacingHypothesis): number {
    const text = `${hypothesis.title} ${hypothesis.statement}`.toLowerCase()

    // Look for combination indicators
    const combinationIndicators = [
      'combining', 'integrating', 'hybrid', 'fusion', 'novel combination',
      'cross-domain', 'interdisciplinary', 'synergistic', 'leveraging',
      'adapting', 'transferring', 'applying', 'inspired by',
    ]

    const indicatorMatches = combinationIndicators.filter(i => text.includes(i)).length

    // Look for "X meets Y" or "X + Y" patterns
    const meetsPattern = text.includes(' meets ') || text.includes(' + ') ||
                        text.includes(' with ') || text.includes(' and ')

    const baseScore = indicatorMatches * 15 + (meetsPattern ? 20 : 0)

    // Add cross-domain bonus
    const { count } = this.calculateCrossDomainMetrics(hypothesis)
    const crossDomainBonus = count >= 3 ? 30 : count === 2 ? 15 : 0

    return Math.min(100, baseScore + crossDomainBonus)
  }

  /**
   * Calculate text overlap between two strings
   */
  private calculateTextOverlap(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 3))
    const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 3))

    if (words1.size === 0 || words2.size === 0) return 0

    let overlap = 0
    for (const word of words1) {
      if (words2.has(word)) overlap++
    }

    return overlap / Math.min(words1.size, words2.size)
  }

  /**
   * Normalize embedding distance to 0-1 score
   */
  private normalizeDistance(distance: number): number {
    // Higher distance = more novel
    if (distance < this.config.minNovelDistance) return distance / this.config.minNovelDistance * 0.5
    return 0.5 + (distance - this.config.minNovelDistance) / (1 - this.config.minNovelDistance) * 0.5
  }

  /**
   * Score cross-domain combination
   */
  private scoreCrossDomain(count: number, distance: number): number {
    if (count <= 1) return 0.2
    if (count === 2) return 0.4 + distance * 0.1
    if (count === 3) return 0.7 + distance * 0.1
    return Math.min(1, 0.85 + count * 0.03 + distance * 0.05)
  }

  /**
   * Score SOTA delta
   */
  private scoreSOTADelta(delta: number): number {
    // Map delta to 0-1 score
    if (delta <= 0) return 0.1
    if (delta < 0.05) return 0.3
    if (delta < 0.1) return 0.5
    if (delta < 0.2) return 0.7
    if (delta < 0.5) return 0.85
    return 0.95
  }

  /**
   * Normalize citation distance to 0-1 score
   */
  private normalizeCitationDistance(distance: number): number {
    // Higher distance = more novel
    return Math.min(1, distance / 10)
  }

  /**
   * Calculate confidence in novelty assessment
   */
  private calculateConfidence(
    research: ResearchResult | undefined,
    dimensions: NoveltyDimension[]
  ): number {
    let confidence = 0.5

    // More research sources = higher confidence in novelty assessment
    if (research?.sources) {
      confidence += Math.min(0.2, research.sources.length * 0.02)
    }

    // Consistent scores across dimensions = higher confidence
    const scores = dimensions.map(d => d.score)
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length
    const variance = scores.reduce((sum, s) => sum + (s - avgScore) ** 2, 0) / scores.length
    const stdDev = Math.sqrt(variance)

    // Lower variance = higher confidence
    confidence += 0.3 * (1 - Math.min(1, stdDev / 30))

    return Math.min(1, confidence)
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createNoveltyTracker(config?: Partial<NoveltyTrackerConfig>): NoveltyTracker {
  return new NoveltyTracker(config)
}
