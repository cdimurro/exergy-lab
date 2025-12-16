/**
 * Enhanced Relevance Scoring Algorithm
 *
 * Multi-factor scoring system for ranking search results:
 * - Citation count (0-25 points)
 * - Recency (0-20 points)
 * - Keyword relevance (0-20 points)
 * - Source quality (0-15 points)
 * - Author reputation (0-10 points)
 * - Cross-domain novelty (0-10 points)
 *
 * Total: 0-100 points
 */

import { Source, DataSourceType } from '@/types/sources'
import { Domain } from '@/types/discovery'

/**
 * Scoring factors breakdown
 */
export interface ScoringFactors {
  citationScore: number // 0-25
  recencyScore: number // 0-20
  keywordRelevance: number // 0-20
  sourceQuality: number // 0-15
  authorReputation: number // 0-10
  crossDomainNovelty: number // 0-10
}

/**
 * Source quality weights by type
 */
const SOURCE_QUALITY_WEIGHTS: Record<DataSourceType, number> = {
  'peer-reviewed': 15,
  'academic-paper': 15,
  'preprint': 12,
  'patent': 13,
  'dataset': 14,
  'news': 8,
  'report': 11,
  'standard': 15,
  'consensus': 15,
}

/**
 * Calculate comprehensive relevance score
 */
export function calculateRelevanceScore(
  source: Source,
  query: string,
  domains: Domain[] = []
): number {
  const factors = calculateScoringFactors(source, query, domains)

  const total =
    factors.citationScore +
    factors.recencyScore +
    factors.keywordRelevance +
    factors.sourceQuality +
    factors.authorReputation +
    factors.crossDomainNovelty

  return Math.min(100, Math.max(0, total))
}

/**
 * Calculate all scoring factors
 */
export function calculateScoringFactors(
  source: Source,
  query: string,
  domains: Domain[] = []
): ScoringFactors {
  return {
    citationScore: calculateCitationScore(source),
    recencyScore: calculateRecencyScore(source),
    keywordRelevance: calculateKeywordRelevance(source, query),
    sourceQuality: calculateSourceQualityScore(source),
    authorReputation: calculateAuthorScore(source),
    crossDomainNovelty: calculateCrossDomainScore(source, domains),
  }
}

/**
 * Citation score (0-25 points)
 * Logarithmic scale to handle wide citation ranges
 */
function calculateCitationScore(source: Source): number {
  const citations = source.metadata.citationCount || 0

  if (citations === 0) return 0
  if (citations >= 1000) return 25
  if (citations >= 500) return 22
  if (citations >= 250) return 20
  if (citations >= 100) return 18
  if (citations >= 50) return 15
  if (citations >= 25) return 12
  if (citations >= 10) return 10
  if (citations >= 5) return 7
  if (citations >= 1) return 5

  return 0
}

/**
 * Recency score (0-20 points)
 * Newer papers score higher
 */
function calculateRecencyScore(source: Source): number {
  if (!source.metadata.publicationDate) return 0

  const pubDate = new Date(source.metadata.publicationDate)
  const now = new Date()
  const ageInDays = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60 * 24)

  // Very recent (< 6 months): 20 points
  if (ageInDays <= 180) return 20

  // Recent (< 1 year): 18 points
  if (ageInDays <= 365) return 18

  // 1-2 years: 15 points
  if (ageInDays <= 730) return 15

  // 2-3 years: 12 points
  if (ageInDays <= 1095) return 12

  // 3-5 years: 8 points
  if (ageInDays <= 1825) return 8

  // 5-10 years: 4 points
  if (ageInDays <= 3650) return 4

  // Older: 0 points
  return 0
}

/**
 * Keyword relevance (0-20 points)
 * TF-IDF-inspired scoring
 */
function calculateKeywordRelevance(source: Source, query: string): number {
  const queryTerms = tokenize(query.toLowerCase())
  const titleTokens = tokenize(source.title.toLowerCase())
  const abstractTokens = source.abstract ? tokenize(source.abstract.toLowerCase()) : []

  let score = 0

  // Check title matches (more weight)
  const titleMatches = queryTerms.filter(term =>
    titleTokens.some(token => token.includes(term) || term.includes(token))
  ).length

  score += Math.min(12, titleMatches * 4) // Max 12 points for title

  // Check abstract matches (less weight)
  const abstractMatches = queryTerms.filter(term =>
    abstractTokens.some(token => token.includes(term) || term.includes(token))
  ).length

  score += Math.min(8, abstractMatches * 2) // Max 8 points for abstract

  return Math.min(20, score)
}

/**
 * Source quality score (0-15 points)
 * Based on source type and verification status
 */
function calculateSourceQualityScore(source: Source): number {
  let score = SOURCE_QUALITY_WEIGHTS[source.metadata.sourceType] || 10

  // Boost for peer-reviewed
  if (source.metadata.verificationStatus === 'peer-reviewed') {
    score += 2
  }

  // Boost for open access
  if (source.metadata.accessType === 'open') {
    score += 1
  }

  return Math.min(15, score)
}

/**
 * Author reputation score (0-10 points)
 * Based on author count and patterns
 */
function calculateAuthorScore(source: Source): number {
  const authorCount = source.authors.length

  // No authors: 0 points
  if (authorCount === 0) return 0

  // 1-3 authors (typical high-quality papers): 10 points
  if (authorCount >= 1 && authorCount <= 3) return 10

  // 4-6 authors: 8 points
  if (authorCount <= 6) return 8

  // 7-10 authors: 6 points
  if (authorCount <= 10) return 6

  // 11-20 authors: 4 points (large collaborations)
  if (authorCount <= 20) return 4

  // More than 20 authors: 2 points (very large collaborations)
  return 2
}

/**
 * Cross-domain novelty score (0-10 points)
 * Rewards papers that combine multiple domains
 */
function calculateCrossDomainScore(source: Source, domains: Domain[]): number {
  if (domains.length === 0) return 5 // Default score if no domains specified

  // Check if source appears to span multiple domains
  // This is simplified - in production, you'd extract topics from the source
  const title = source.title.toLowerCase()
  const abstract = source.abstract?.toLowerCase() || ''

  const matchedDomains = domains.filter(domain => {
    const keywords = getDomainKeywords(domain)
    return keywords.some(keyword =>
      title.includes(keyword) || abstract.includes(keyword)
    )
  })

  // Score based on number of matched domains
  if (matchedDomains.length >= 3) return 10 // Highly cross-domain
  if (matchedDomains.length === 2) return 8 // Cross-domain
  if (matchedDomains.length === 1) return 5 // Single domain
  return 0 // No domain match
}

/**
 * Get keywords for a domain
 */
function getDomainKeywords(domain: Domain): string[] {
  const keywords: Record<Domain, string[]> = {
    'solar-energy': ['solar', 'photovoltaic', 'pv', 'solar cell', 'solar panel'],
    'wind-energy': ['wind', 'wind turbine', 'wind power', 'wind farm'],
    'battery-storage': ['battery', 'energy storage', 'lithium', 'electrochemical'],
    'hydrogen-fuel-cells': ['hydrogen', 'fuel cell', 'electrolysis', 'h2'],
    'nuclear-energy': ['nuclear', 'fission', 'fusion', 'reactor'],
    'carbon-capture': ['carbon capture', 'ccs', 'co2', 'sequestration'],
    'bioenergy': ['bioenergy', 'biomass', 'biofuel', 'biogas'],
    'geothermal': ['geothermal', 'ground source', 'heat pump'],
    'hydropower': ['hydropower', 'hydro', 'dam', 'turbine'],
    'grid-optimization': ['grid', 'smart grid', 'distribution', 'transmission'],
    'energy-efficiency': ['efficiency', 'optimization', 'performance'],
    'electric-vehicles': ['electric vehicle', 'ev', 'charging', 'battery'],
    'heat-storage': ['thermal storage', 'heat', 'latent', 'sensible'],
    'building-efficiency': ['building', 'hvac', 'insulation', 'retrofit'],
    'industrial-process': ['industrial', 'process', 'manufacturing'],
    'sustainable-transport': ['transport', 'mobility', 'transit'],
    'marine-energy': ['marine', 'ocean', 'tidal', 'wave'],
    'energy-policy': ['policy', 'regulation', 'carbon', 'emissions'],
    'smart-city': ['smart city', 'urban', 'iot', 'sensors'],
    'demand-response': ['demand response', 'load', 'flexibility'],
    'microgrids': ['microgrid', 'distributed', 'islanding'],
    'power-electronics': ['power electronics', 'inverter', 'converter'],
    'energy-markets': ['energy market', 'trading', 'pricing'],
    'circular-economy': ['circular economy', 'recycling', 'lifecycle'],
    'green-hydrogen': ['green hydrogen', 'renewable', 'electrolysis'],
    'power-to-x': ['power-to-x', 'p2x', 'e-fuels'],
  }

  return keywords[domain] || []
}

/**
 * Tokenize text into searchable terms
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter(token => token.length > 2) // Remove short tokens
}

/**
 * Rank sources by relevance
 */
export function rankSources(
  sources: Source[],
  query: string,
  domains: Domain[] = []
): Source[] {
  // Calculate scores for all sources
  const scored = sources.map(source => ({
    source,
    score: calculateRelevanceScore(source, query, domains),
    factors: calculateScoringFactors(source, query, domains),
  }))

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score)

  // Update relevanceScore on sources and return
  return scored.map(({ source, score }) => ({
    ...source,
    relevanceScore: score,
  }))
}

/**
 * Get top N sources
 */
export function getTopSources(
  sources: Source[],
  query: string,
  domains: Domain[] = [],
  limit: number = 20
): Source[] {
  const ranked = rankSources(sources, query, domains)
  return ranked.slice(0, limit)
}

/**
 * Filter sources by minimum score
 */
export function filterByMinimumScore(
  sources: Source[],
  query: string,
  domains: Domain[] = [],
  minScore: number = 50
): Source[] {
  return rankSources(sources, query, domains).filter(
    source => (source.relevanceScore || 0) >= minScore
  )
}
