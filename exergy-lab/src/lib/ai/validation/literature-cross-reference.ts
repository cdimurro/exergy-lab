/**
 * Literature Cross-Reference Validator
 *
 * Cross-references discovery findings against peer-reviewed literature
 * to ensure claims can be validated by third-party analysis.
 *
 * Key features:
 * - Extracts quantitative, mechanism, physical, and economic claims
 * - Queries existing research data (arXiv, OpenAlex, Semantic Scholar)
 * - Validates claims against found evidence
 * - Detects physically impossible predictions
 * - Provides confidence scores and recommendations
 * - Caches AI alignment analysis to reduce redundant LLM calls
 *
 * @see literature-benchmark.ts - Basic literature consistency checks
 * @see domain-benchmark.ts - Physics validation
 */

import crypto from 'crypto'
import { generateText } from '@/lib/ai/model-router'
import type { LiteratureSource, BenchmarkMetadata } from './types'

// ============================================================================
// Types
// ============================================================================

export interface LiteratureCrossRefConfig {
  /** Minimum supporting sources per claim */
  minSupportingEvidence: number
  /** Only consider papers from this year onward */
  recentThresholdYear: number
  /** Maximum sources to query per claim */
  maxSourcesPerClaim: number
  /** Enable physics validation against known limits */
  enablePhysicsValidation: boolean
  /** Strict mode fails on any contradiction */
  strictMode: boolean
}

export const DEFAULT_CROSSREF_CONFIG: LiteratureCrossRefConfig = {
  minSupportingEvidence: 2,
  recentThresholdYear: 2020,
  maxSourcesPerClaim: 10,
  enablePhysicsValidation: true,
  strictMode: false,
}

export interface ExtractedClaim {
  id: string
  text: string
  type: 'quantitative' | 'mechanism' | 'physical' | 'economic'
  value?: {
    value: number
    unit: string
    tolerance?: number
  }
  source: 'hypothesis' | 'validation' | 'tea' | 'simulation'
  context: string
}

export interface LiteratureEvidence {
  sourceId: string
  title: string
  authors: string[]
  year: number
  source: string
  doi?: string
  url?: string
  relevantExcerpt?: string
  alignmentType: 'supporting' | 'contradicting' | 'related'
  alignmentScore: number
  relevanceScore: number
}

export interface PhysicsValidationResult {
  isPhysicallyPossible: boolean
  violatedLimits: string[]
  reasoning: string
  benchmarkUsed?: string
}

export interface ClaimValidation {
  claimId: string
  claimText: string
  claimType: ExtractedClaim['type']
  claimValue?: ExtractedClaim['value']
  validationStatus: 'supported' | 'partial' | 'unsupported' | 'contradicted' | 'unverifiable'
  supportingEvidence: LiteratureEvidence[]
  contradictingEvidence: LiteratureEvidence[]
  physicsCheck?: PhysicsValidationResult
  confidence: number
  reasoning: string
  suggestions?: string[]
}

export interface CrossReferenceResult {
  totalClaims: number
  validatedClaims: number
  supportedClaims: number
  contradictedClaims: number
  unverifiableClaims: number
  physicsViolations: number
  overallConfidence: number
  passed: boolean
  claimValidations: ClaimValidation[]
  summary: string
  recommendations: string[]
  literatureSources: LiteratureEvidence[]
  metadata: BenchmarkMetadata
}

// ============================================================================
// Alignment Cache Types
// ============================================================================

interface CachedAlignment {
  type: 'supporting' | 'contradicting' | 'related'
  score: number
  timestamp: number
  hits: number
}

interface AlignmentCacheConfig {
  /** Maximum cached alignments (default: 500) */
  maxEntries: number
  /** Cache TTL in milliseconds (default: 4 hours) */
  ttlMs: number
  /** Enable/disable caching (default: true) */
  enabled: boolean
}

const DEFAULT_ALIGNMENT_CACHE_CONFIG: AlignmentCacheConfig = {
  maxEntries: 500,
  ttlMs: 4 * 60 * 60 * 1000, // 4 hours
  enabled: true,
}

// ============================================================================
// Physical Limits (for physics validation)
// ============================================================================

const PHYSICAL_LIMITS = {
  solar_efficiency: { max: 0.867, unit: '%', name: 'Concentrated solar thermal limit' },
  pv_single_junction: { max: 0.337, unit: '%', name: 'Shockley-Queisser limit' },
  pv_multi_junction: { max: 0.68, unit: '%', name: 'Multi-junction theoretical limit' },
  wind_efficiency: { max: 0.593, unit: '%', name: 'Betz limit' },
  electrolyzer_voltage: { min: 1.23, unit: 'V', name: 'Thermodynamic minimum' },
  electrolyzer_efficiency: { max: 0.95, unit: '%', name: 'HHV efficiency limit' },
  fuel_cell_efficiency: { max: 0.83, unit: '%', name: 'Thermodynamic limit at 25°C' },
  battery_energy_density: { max: 500, unit: 'Wh/kg', name: 'Lithium-air theoretical' },
  battery_cycle_efficiency: { max: 0.99, unit: '%', name: 'Theoretical round-trip' },
  hydrogen_storage_gravimetric: { max: 0.055, unit: 'kg/kg', name: 'DOE ultimate target' },
  carnot_efficiency: { formula: '(T_hot - T_cold) / T_hot', name: 'Carnot efficiency' },
} as const

// ============================================================================
// Literature Cross-Reference Validator
// ============================================================================

export class LiteratureCrossReferenceValidator {
  private config: LiteratureCrossRefConfig
  private cacheConfig: AlignmentCacheConfig
  private startTime: number = 0

  // Alignment analysis cache (keyed by claim+source hash)
  private alignmentCache: Map<string, CachedAlignment> = new Map()
  private cacheStats = { hits: 0, misses: 0, llmCalls: 0 }

  constructor(
    config: Partial<LiteratureCrossRefConfig> = {},
    cacheConfig: Partial<AlignmentCacheConfig> = {}
  ) {
    this.config = { ...DEFAULT_CROSSREF_CONFIG, ...config }
    this.cacheConfig = { ...DEFAULT_ALIGNMENT_CACHE_CONFIG, ...cacheConfig }
  }

  // ============================================================================
  // Alignment Cache Methods
  // ============================================================================

  /**
   * Generate cache key for claim-source alignment
   * Uses semantic hashing of claim text + source title/DOI
   */
  private getAlignmentCacheKey(claim: ExtractedClaim, source: LiteratureEvidence): string {
    const keyData = {
      // Claim identifiers
      claimText: claim.text.slice(0, 200).toLowerCase().trim(),
      claimType: claim.type,
      claimValue: claim.value ? `${claim.value.value}${claim.value.unit}` : null,
      // Source identifiers (prefer DOI for stability)
      sourceId: source.doi || source.sourceId,
      sourceTitle: source.title.slice(0, 100).toLowerCase().trim(),
      sourceYear: source.year,
    }

    return crypto.createHash('md5').update(JSON.stringify(keyData)).digest('hex')
  }

  /**
   * Get cached alignment result
   */
  private getCachedAlignment(key: string): CachedAlignment | null {
    if (!this.cacheConfig.enabled) return null

    const cached = this.alignmentCache.get(key)
    if (!cached) {
      this.cacheStats.misses++
      return null
    }

    // Check TTL
    if (Date.now() - cached.timestamp > this.cacheConfig.ttlMs) {
      this.alignmentCache.delete(key)
      this.cacheStats.misses++
      return null
    }

    cached.hits++
    this.cacheStats.hits++
    return cached
  }

  /**
   * Store alignment in cache
   */
  private setCachedAlignment(
    key: string,
    alignment: { type: 'supporting' | 'contradicting' | 'related'; score: number }
  ): void {
    if (!this.cacheConfig.enabled) return

    // Enforce max entries (evict oldest)
    if (this.alignmentCache.size >= this.cacheConfig.maxEntries) {
      this.evictOldestAlignments()
    }

    this.alignmentCache.set(key, {
      ...alignment,
      timestamp: Date.now(),
      hits: 0,
    })
  }

  /**
   * Evict oldest cache entries
   */
  private evictOldestAlignments(): void {
    // Find 10% oldest entries by timestamp
    const entries = Array.from(this.alignmentCache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp)

    const toEvict = Math.max(1, Math.floor(entries.length * 0.1))
    for (let i = 0; i < toEvict; i++) {
      this.alignmentCache.delete(entries[i][0])
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number
    hits: number
    misses: number
    llmCalls: number
    hitRate: number
    llmSavings: number
  } {
    const total = this.cacheStats.hits + this.cacheStats.misses
    return {
      size: this.alignmentCache.size,
      hits: this.cacheStats.hits,
      misses: this.cacheStats.misses,
      llmCalls: this.cacheStats.llmCalls,
      hitRate: total > 0 ? this.cacheStats.hits / total : 0,
      llmSavings: this.cacheStats.hits, // Each hit saved an LLM call
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.alignmentCache.clear()
    this.cacheStats = { hits: 0, misses: 0, llmCalls: 0 }
  }

  /**
   * Validate discovery outputs against peer-reviewed literature
   */
  async validate(inputs: {
    hypothesis: any
    validation: any
    research: any
  }): Promise<CrossReferenceResult> {
    this.startTime = Date.now()

    // Step 1: Extract key claims from inputs
    const claims = this.extractClaims(inputs)

    // Step 2: Get existing literature from research phase
    const existingSources = this.extractExistingSources(inputs.research)

    // Step 3: Validate each claim
    const claimValidations: ClaimValidation[] = []

    for (const claim of claims) {
      const validation = await this.validateClaim(claim, existingSources, inputs.research)
      claimValidations.push(validation)
    }

    // Step 4: Calculate statistics
    const supported = claimValidations.filter(v => v.validationStatus === 'supported').length
    const partial = claimValidations.filter(v => v.validationStatus === 'partial').length
    const contradicted = claimValidations.filter(v => v.validationStatus === 'contradicted').length
    const unverifiable = claimValidations.filter(v => v.validationStatus === 'unverifiable').length
    const physicsViolations = claimValidations.filter(v => v.physicsCheck && !v.physicsCheck.isPhysicallyPossible).length

    const overallConfidence = claims.length > 0
      ? (supported + partial * 0.5) / claims.length
      : 0

    // Step 5: Generate summary and recommendations
    const summary = this.generateSummary(claimValidations, supported, contradicted, unverifiable)
    const recommendations = this.generateRecommendations(claimValidations)

    // Collect all literature sources
    const allSources = new Map<string, LiteratureEvidence>()
    for (const validation of claimValidations) {
      for (const evidence of [...validation.supportingEvidence, ...validation.contradictingEvidence]) {
        allSources.set(evidence.sourceId, evidence)
      }
    }

    const metadata: BenchmarkMetadata = {
      evaluationTimeMs: Date.now() - this.startTime,
      version: '1.0.0',
      checksRun: claims.length,
    }

    return {
      totalClaims: claims.length,
      validatedClaims: claimValidations.filter(v => v.validationStatus !== 'unverifiable').length,
      supportedClaims: supported,
      contradictedClaims: contradicted,
      unverifiableClaims: unverifiable,
      physicsViolations,
      overallConfidence,
      passed: overallConfidence >= 0.7 && contradicted === 0 && physicsViolations === 0,
      claimValidations,
      summary,
      recommendations,
      literatureSources: Array.from(allSources.values()),
      metadata,
    }
  }

  /**
   * Validate a single hypothesis (for Breakthrough Engine BC10)
   */
  async validateHypothesis(hypothesis: any): Promise<CrossReferenceResult> {
    return this.validate({
      hypothesis,
      validation: null,
      research: null,
    })
  }

  // ============================================================================
  // Claim Extraction
  // ============================================================================

  /**
   * Extract key claims from discovery outputs
   */
  private extractClaims(inputs: { hypothesis: any; validation: any; research: any }): ExtractedClaim[] {
    const claims: ExtractedClaim[] = []
    let claimId = 0

    // Extract from hypothesis
    if (inputs.hypothesis) {
      const hyp = inputs.hypothesis.hypothesis || inputs.hypothesis

      // Quantitative predictions
      if (hyp.predictions) {
        for (const pred of hyp.predictions) {
          if (pred.expectedValue !== undefined) {
            claims.push({
              id: `claim-${++claimId}`,
              text: pred.statement || pred.description || 'Quantitative prediction',
              type: 'quantitative',
              value: this.parseValue(pred.expectedValue, pred.unit),
              source: 'hypothesis',
              context: hyp.title || 'Hypothesis prediction',
            })
          }
        }
      }

      // Mechanism claims
      if (hyp.mechanism) {
        const mechanismText = typeof hyp.mechanism === 'string'
          ? hyp.mechanism
          : hyp.mechanism.description || JSON.stringify(hyp.mechanism)

        claims.push({
          id: `claim-${++claimId}`,
          text: mechanismText.slice(0, 500),
          type: 'mechanism',
          source: 'hypothesis',
          context: 'Proposed mechanism',
        })
      }

      // Main hypothesis statement
      if (hyp.statement) {
        claims.push({
          id: `claim-${++claimId}`,
          text: hyp.statement,
          type: 'physical',
          source: 'hypothesis',
          context: hyp.title || 'Main hypothesis',
        })
      }
    }

    // Extract from validation results
    if (inputs.validation) {
      // TEA/economic claims
      if (inputs.validation.economics) {
        const econ = inputs.validation.economics

        if (econ.lcoe !== undefined) {
          claims.push({
            id: `claim-${++claimId}`,
            text: `Levelized cost of energy: ${econ.lcoe} $/MWh`,
            type: 'economic',
            value: { value: econ.lcoe, unit: '$/MWh' },
            source: 'tea',
            context: 'Techno-economic analysis',
          })
        }

        if (econ.npv !== undefined) {
          claims.push({
            id: `claim-${++claimId}`,
            text: `Net present value: $${econ.npv}`,
            type: 'economic',
            value: { value: econ.npv, unit: '$' },
            source: 'tea',
            context: 'Techno-economic analysis',
          })
        }
      }

      // Simulation results
      if (inputs.validation.simulation?.results) {
        for (const sim of inputs.validation.simulation.results) {
          if (sim.outputs) {
            for (const [key, val] of Object.entries(sim.outputs)) {
              if (typeof val === 'number') {
                claims.push({
                  id: `claim-${++claimId}`,
                  text: `Simulation output: ${key} = ${val}`,
                  type: 'quantitative',
                  value: { value: val as number, unit: '' },
                  source: 'simulation',
                  context: `Simulation: ${sim.type || 'unknown'}`,
                })
              }
            }
          }
        }
      }

      // Exergy efficiency claims
      if (inputs.validation.exergy?.efficiency !== undefined) {
        claims.push({
          id: `claim-${++claimId}`,
          text: `Exergy efficiency: ${(inputs.validation.exergy.efficiency * 100).toFixed(1)}%`,
          type: 'physical',
          value: { value: inputs.validation.exergy.efficiency, unit: '%' },
          source: 'validation',
          context: 'Exergy analysis',
        })
      }
    }

    return claims
  }

  /**
   * Parse a value into standardized format
   */
  private parseValue(value: any, unit?: string): ExtractedClaim['value'] | undefined {
    if (value === undefined || value === null) return undefined

    if (typeof value === 'number') {
      return { value, unit: unit || '' }
    }

    if (typeof value === 'string') {
      const parsed = parseFloat(value)
      if (!isNaN(parsed)) {
        return { value: parsed, unit: unit || '' }
      }
    }

    return undefined
  }

  // ============================================================================
  // Literature Search
  // ============================================================================

  /**
   * Extract existing sources from research phase
   */
  private extractExistingSources(research: any): LiteratureEvidence[] {
    const sources: LiteratureEvidence[] = []

    if (!research) return sources

    // From research.sources array
    if (research.sources) {
      for (const src of research.sources) {
        sources.push({
          sourceId: src.id || src.doi || `src-${sources.length}`,
          title: src.title || 'Unknown',
          authors: src.authors || [],
          year: src.year || src.publicationDate?.split('-')[0] || 2020,
          source: src.source || src.type || 'unknown',
          doi: src.doi,
          url: src.url,
          relevantExcerpt: src.abstract?.slice(0, 300),
          alignmentType: 'related',
          alignmentScore: 0.5,
          relevanceScore: src.relevanceScore || 0.5,
        })
      }
    }

    // From synthesis.keyPapers
    if (research.synthesis?.keyPapers) {
      for (const paper of research.synthesis.keyPapers) {
        sources.push({
          sourceId: paper.doi || `paper-${sources.length}`,
          title: paper.title || 'Unknown',
          authors: paper.authors || [],
          year: paper.year || 2020,
          source: paper.venue || 'journal',
          doi: paper.doi,
          relevantExcerpt: paper.summary?.slice(0, 300),
          alignmentType: 'related',
          alignmentScore: 0.6,
          relevanceScore: paper.relevance || 0.6,
        })
      }
    }

    return sources
  }

  // ============================================================================
  // Claim Validation
  // ============================================================================

  /**
   * Validate a single claim against literature
   */
  private async validateClaim(
    claim: ExtractedClaim,
    existingSources: LiteratureEvidence[],
    research: any
  ): Promise<ClaimValidation> {
    const supportingEvidence: LiteratureEvidence[] = []
    const contradictingEvidence: LiteratureEvidence[] = []

    // Step 1: Search existing sources for relevant matches
    const relevantSources = this.findRelevantSources(claim, existingSources)

    // Step 2: Analyze alignment using AI
    for (const source of relevantSources.slice(0, this.config.maxSourcesPerClaim)) {
      const alignment = await this.analyzeAlignment(claim, source)
      source.alignmentType = alignment.type
      source.alignmentScore = alignment.score

      if (alignment.type === 'supporting') {
        supportingEvidence.push(source)
      } else if (alignment.type === 'contradicting') {
        contradictingEvidence.push(source)
      }
    }

    // Step 3: Physics validation if enabled
    let physicsCheck: PhysicsValidationResult | undefined
    if (this.config.enablePhysicsValidation && (claim.type === 'quantitative' || claim.type === 'physical')) {
      physicsCheck = this.validatePhysics(claim)
    }

    // Step 4: Determine validation status
    let validationStatus: ClaimValidation['validationStatus']
    let confidence: number
    let reasoning: string

    if (physicsCheck && !physicsCheck.isPhysicallyPossible) {
      validationStatus = 'contradicted'
      confidence = 0.1
      reasoning = `Physics violation: ${physicsCheck.reasoning}`
    } else if (contradictingEvidence.length > 0) {
      if (this.config.strictMode) {
        validationStatus = 'contradicted'
        confidence = 0.2
        reasoning = `${contradictingEvidence.length} source(s) contradict this claim`
      } else if (supportingEvidence.length > contradictingEvidence.length) {
        validationStatus = 'partial'
        confidence = 0.5
        reasoning = `Mixed evidence: ${supportingEvidence.length} supporting vs ${contradictingEvidence.length} contradicting`
      } else {
        validationStatus = 'contradicted'
        confidence = 0.3
        reasoning = `More contradicting than supporting evidence found`
      }
    } else if (supportingEvidence.length >= this.config.minSupportingEvidence) {
      validationStatus = 'supported'
      confidence = Math.min(0.95, 0.6 + supportingEvidence.length * 0.1)
      reasoning = `${supportingEvidence.length} peer-reviewed source(s) support this claim`
    } else if (supportingEvidence.length > 0) {
      validationStatus = 'partial'
      confidence = 0.5 + supportingEvidence.length * 0.1
      reasoning = `Limited supporting evidence (${supportingEvidence.length} source(s))`
    } else if (relevantSources.length === 0) {
      validationStatus = 'unverifiable'
      confidence = 0.3
      reasoning = 'No relevant literature found to validate this claim'
    } else {
      validationStatus = 'unsupported'
      confidence = 0.4
      reasoning = 'Found related literature but no direct support'
    }

    return {
      claimId: claim.id,
      claimText: claim.text,
      claimType: claim.type,
      claimValue: claim.value,
      validationStatus,
      supportingEvidence,
      contradictingEvidence,
      physicsCheck,
      confidence,
      reasoning,
      suggestions: this.generateClaimSuggestions(claim, validationStatus, supportingEvidence, contradictingEvidence),
    }
  }

  /**
   * Find relevant sources for a claim using keyword matching
   */
  private findRelevantSources(claim: ExtractedClaim, sources: LiteratureEvidence[]): LiteratureEvidence[] {
    // Extract keywords from claim text
    const claimWords = claim.text.toLowerCase().split(/\W+/).filter(w => w.length > 3)

    return sources
      .map(source => {
        const titleWords = source.title.toLowerCase().split(/\W+/)
        const excerptWords = (source.relevantExcerpt || '').toLowerCase().split(/\W+/)
        const allWords = [...titleWords, ...excerptWords]

        // Calculate keyword overlap
        const matchCount = claimWords.filter(w => allWords.includes(w)).length
        const relevanceScore = claimWords.length > 0 ? matchCount / claimWords.length : 0

        return { ...source, relevanceScore }
      })
      .filter(s => s.relevanceScore > 0.1)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
  }

  /**
   * Analyze alignment between claim and source using AI
   * Results are cached to avoid redundant LLM calls for the same claim-source pairs
   */
  private async analyzeAlignment(
    claim: ExtractedClaim,
    source: LiteratureEvidence
  ): Promise<{ type: 'supporting' | 'contradicting' | 'related'; score: number }> {
    // Check cache first
    const cacheKey = this.getAlignmentCacheKey(claim, source)
    const cached = this.getCachedAlignment(cacheKey)

    if (cached) {
      return { type: cached.type, score: cached.score }
    }

    // Cache miss - make LLM call
    try {
      this.cacheStats.llmCalls++

      const prompt = `Analyze if this source supports, contradicts, or is merely related to the claim.

CLAIM: ${claim.text}
${claim.value ? `VALUE: ${claim.value.value} ${claim.value.unit}` : ''}

SOURCE TITLE: ${source.title}
SOURCE EXCERPT: ${source.relevantExcerpt || 'No excerpt available'}
YEAR: ${source.year}

Respond with JSON only:
{
  "alignment": "supporting" | "contradicting" | "related",
  "score": 0.0-1.0,
  "reasoning": "brief explanation"
}`

      const response = await generateText(
        'discovery',
        prompt,
        { model: 'fast', maxTokens: 200 }
      )

      const parsed = JSON.parse(response.replace(/```json\n?|\n?```/g, ''))

      const result = {
        type: parsed.alignment || 'related',
        score: Math.min(1, Math.max(0, parsed.score || 0.5)),
      } as { type: 'supporting' | 'contradicting' | 'related'; score: number }

      // Cache the successful result
      this.setCachedAlignment(cacheKey, result)

      return result
    } catch (error) {
      // Default to related on parsing errors (don't cache errors)
      return { type: 'related', score: 0.5 }
    }
  }

  // ============================================================================
  // Physics Validation
  // ============================================================================

  /**
   * Validate claim against known physical limits
   */
  private validatePhysics(claim: ExtractedClaim): PhysicsValidationResult {
    const violations: string[] = []
    const claimText = claim.text.toLowerCase()

    // Check efficiency claims
    if (claim.value && (claimText.includes('efficiency') || claimText.includes('conversion'))) {
      const value = claim.value.value

      // Check if value is a percentage (0-100) or decimal (0-1)
      const normalizedValue = value > 1 ? value / 100 : value

      // Solar PV
      if (claimText.includes('solar') || claimText.includes('photovoltaic') || claimText.includes('pv')) {
        if (claimText.includes('multi') || claimText.includes('tandem')) {
          if (normalizedValue > PHYSICAL_LIMITS.pv_multi_junction.max) {
            violations.push(`Exceeds multi-junction PV theoretical limit (${PHYSICAL_LIMITS.pv_multi_junction.max * 100}%)`)
          }
        } else if (normalizedValue > PHYSICAL_LIMITS.pv_single_junction.max) {
          violations.push(`Exceeds Shockley-Queisser single-junction limit (${PHYSICAL_LIMITS.pv_single_junction.max * 100}%)`)
        }
      }

      // Wind
      if (claimText.includes('wind') || claimText.includes('turbine')) {
        if (normalizedValue > PHYSICAL_LIMITS.wind_efficiency.max) {
          violations.push(`Exceeds Betz limit for wind turbines (${PHYSICAL_LIMITS.wind_efficiency.max * 100}%)`)
        }
      }

      // Electrolysis
      if (claimText.includes('electroly') || claimText.includes('hydrogen production')) {
        if (normalizedValue > PHYSICAL_LIMITS.electrolyzer_efficiency.max) {
          violations.push(`Exceeds thermodynamic electrolyzer efficiency limit (${PHYSICAL_LIMITS.electrolyzer_efficiency.max * 100}%)`)
        }
      }

      // Fuel cells
      if (claimText.includes('fuel cell')) {
        if (normalizedValue > PHYSICAL_LIMITS.fuel_cell_efficiency.max) {
          violations.push(`Exceeds thermodynamic fuel cell limit (${PHYSICAL_LIMITS.fuel_cell_efficiency.max * 100}%)`)
        }
      }

      // Battery
      if (claimText.includes('battery') && claimText.includes('round')) {
        if (normalizedValue > PHYSICAL_LIMITS.battery_cycle_efficiency.max) {
          violations.push(`Exceeds theoretical battery round-trip efficiency (${PHYSICAL_LIMITS.battery_cycle_efficiency.max * 100}%)`)
        }
      }
    }

    // Check energy density claims
    if (claim.value && claimText.includes('energy density')) {
      if (claimText.includes('battery') || claimText.includes('lithium')) {
        if (claim.value.value > PHYSICAL_LIMITS.battery_energy_density.max) {
          violations.push(`Exceeds theoretical lithium-air energy density (${PHYSICAL_LIMITS.battery_energy_density.max} Wh/kg)`)
        }
      }
    }

    return {
      isPhysicallyPossible: violations.length === 0,
      violatedLimits: violations,
      reasoning: violations.length > 0
        ? `Claim violates ${violations.length} physical limit(s): ${violations.join('; ')}`
        : 'Claim is within known physical limits',
    }
  }

  // ============================================================================
  // Summary & Recommendations
  // ============================================================================

  /**
   * Generate summary of validation results
   */
  private generateSummary(
    validations: ClaimValidation[],
    supported: number,
    contradicted: number,
    unverifiable: number
  ): string {
    const total = validations.length

    if (total === 0) {
      return 'No claims were extracted for validation.'
    }

    const parts: string[] = []

    if (supported > 0) {
      parts.push(`${supported}/${total} claims supported by peer-reviewed literature`)
    }

    if (contradicted > 0) {
      parts.push(`${contradicted} claim(s) contradict existing research`)
    }

    if (unverifiable > 0) {
      parts.push(`${unverifiable} claim(s) could not be verified`)
    }

    const physicsViolations = validations.filter(v => v.physicsCheck && !v.physicsCheck.isPhysicallyPossible)
    if (physicsViolations.length > 0) {
      parts.push(`${physicsViolations.length} claim(s) violate physical limits`)
    }

    return parts.join('. ') + '.'
  }

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(validations: ClaimValidation[]): string[] {
    const recommendations: string[] = []

    // Check for contradictions
    const contradicted = validations.filter(v => v.validationStatus === 'contradicted')
    if (contradicted.length > 0) {
      recommendations.push(`Review ${contradicted.length} contradicted claim(s) - these may need revision or additional justification`)
    }

    // Check for physics violations
    const physicsViolations = validations.filter(v => v.physicsCheck && !v.physicsCheck.isPhysicallyPossible)
    if (physicsViolations.length > 0) {
      recommendations.push(`${physicsViolations.length} claim(s) exceed known physical limits - verify calculations or revise expectations`)
    }

    // Check for unverifiable claims
    const unverifiable = validations.filter(v => v.validationStatus === 'unverifiable')
    if (unverifiable.length > 0) {
      recommendations.push(`Consider adding literature support for ${unverifiable.length} unverified claim(s)`)
    }

    // Check for partial support
    const partial = validations.filter(v => v.validationStatus === 'partial')
    if (partial.length > 0) {
      recommendations.push(`${partial.length} claim(s) have limited support - strengthen with additional references`)
    }

    if (recommendations.length === 0) {
      recommendations.push('All claims are well-supported by existing literature')
    }

    return recommendations
  }

  /**
   * Generate suggestions for a specific claim
   */
  private generateClaimSuggestions(
    claim: ExtractedClaim,
    status: ClaimValidation['validationStatus'],
    supporting: LiteratureEvidence[],
    contradicting: LiteratureEvidence[]
  ): string[] {
    const suggestions: string[] = []

    switch (status) {
      case 'contradicted':
        if (contradicting.length > 0) {
          suggestions.push(`Review contradicting source: "${contradicting[0].title}" (${contradicting[0].year})`)
        }
        suggestions.push('Consider revising the claim or providing additional experimental evidence')
        break

      case 'unsupported':
      case 'unverifiable':
        suggestions.push('Search for additional peer-reviewed sources to support this claim')
        suggestions.push('Consider citing recent publications (2020+) for stronger validation')
        break

      case 'partial':
        suggestions.push('Add more peer-reviewed references to strengthen validation')
        if (supporting.length > 0) {
          suggestions.push(`Current support: "${supporting[0].title}"`)
        }
        break

      case 'supported':
        // No suggestions needed for well-supported claims
        break
    }

    return suggestions
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createLiteratureCrossReferenceValidator(
  config?: Partial<LiteratureCrossRefConfig>
): LiteratureCrossReferenceValidator {
  return new LiteratureCrossReferenceValidator(config)
}
