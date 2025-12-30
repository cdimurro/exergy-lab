/**
 * Literature Feeds Module (v0.0.5)
 *
 * Real-time literature feeds from arXiv, PubMed, and patent databases.
 * Provides personalized research updates for clean energy domains.
 *
 * @example
 * ```typescript
 * import {
 *   createArxivDigest,
 *   createArxivConfigForDomain,
 *   useFeedsStore
 * } from '@/lib/feeds'
 *
 * // Create a solar-focused arXiv feed
 * const config = createArxivConfigForDomain('solar')
 * const digest = await createArxivDigest('my-feed', config)
 *
 * // Use the store to manage feeds
 * const { createFeed, addItems } = useFeedsStore()
 * const feedId = createFeed({
 *   name: 'Solar Research',
 *   type: 'arxiv-daily',
 *   enabled: true,
 *   config,
 * })
 * ```
 */

// Types
export * from './feed-types'

// arXiv Feed
export {
  fetchArxivDailyDigest,
  generateArxivDigestSummary,
  createArxivDigest,
  getArxivEnergyCategories,
  createArxivConfigForDomain,
} from './arxiv-feed'

// PubMed Feed
export {
  fetchPubMedAlerts,
  generatePubMedDigestSummary,
  createPubMedDigest,
  getPubMedEnergyMeshTerms,
  createPubMedConfigForDomain,
} from './pubmed-alerts'

// Feeds Store
export { useFeedsStore } from './feeds-store'

// ============================================================================
// Convenience Functions
// ============================================================================

import { createArxivDigest, createArxivConfigForDomain } from './arxiv-feed'
import { createPubMedDigest, createPubMedConfigForDomain } from './pubmed-alerts'
import type { FeedDigest, FeedType } from './feed-types'

/**
 * Create a digest for any feed type and domain
 */
export async function createDomainDigest(
  feedId: string,
  feedType: FeedType,
  domain: 'solar' | 'battery' | 'hydrogen' | 'wind' | 'catalysis' | 'materials'
): Promise<FeedDigest> {
  switch (feedType) {
    case 'arxiv-daily':
      return createArxivDigest(feedId, createArxivConfigForDomain(domain as 'solar' | 'battery' | 'hydrogen' | 'wind' | 'materials'))
    case 'pubmed-alerts':
      return createPubMedDigest(feedId, createPubMedConfigForDomain(domain as 'solar' | 'battery' | 'hydrogen' | 'catalysis' | 'materials'))
    default:
      throw new Error(`Feed type ${feedType} not supported`)
  }
}

/**
 * Get recommended feed types for a domain
 */
export function getRecommendedFeedsForDomain(
  domain: string
): Array<{ type: FeedType; priority: 'high' | 'medium' | 'low'; reason: string }> {
  const recommendations: Array<{ type: FeedType; priority: 'high' | 'medium' | 'low'; reason: string }> = []

  // arXiv is good for all domains
  recommendations.push({
    type: 'arxiv-daily',
    priority: 'high',
    reason: 'Latest preprints in materials science and physics',
  })

  // PubMed is better for some domains
  if (['battery', 'hydrogen', 'catalysis', 'materials'].includes(domain)) {
    recommendations.push({
      type: 'pubmed-alerts',
      priority: domain === 'catalysis' ? 'high' : 'medium',
      reason: 'Peer-reviewed research with MeSH indexing',
    })
  }

  // Patents are important for applied research
  if (['solar', 'battery', 'hydrogen'].includes(domain)) {
    recommendations.push({
      type: 'patent-filings',
      priority: 'medium',
      reason: 'Track industry innovations and IP trends',
    })
  }

  return recommendations
}

/**
 * Get total unread count across all feeds
 */
export function getTotalUnreadCount(): number {
  // This would typically use the store, but we provide a utility
  // For actual implementation, use useFeedsStore().unreadCounts
  return 0
}
