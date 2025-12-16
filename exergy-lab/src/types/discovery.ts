/**
 * Discovery Engine Types - Multi-Domain Novel Idea Discovery
 */

export type Domain =
  | 'solar-energy'
  | 'wind-energy'
  | 'battery-storage'
  | 'hydrogen-fuel'
  | 'geothermal'
  | 'biomass'
  | 'carbon-capture'
  | 'energy-efficiency'
  | 'grid-optimization'
  | 'materials-science'
  | 'other'

export type SourceType = 'academic-paper' | 'patent' | 'technical-report' | 'news-article' | 'database'

export interface DiscoveryPrompt {
  description: string
  domains: Domain[]
  goals: string[] // e.g., ["Improve efficiency", "Reduce cost", "Increase scalability"]
  constraints?: string[] // e.g., ["Must use existing infrastructure", "Budget < $1M"]
  timeframe?: string // e.g., "0-5 years", "5-10 years", "10+ years"
}

export interface Source {
  id: string
  type: SourceType
  title: string
  authors?: string[]
  organization?: string
  publicationDate: string
  url: string
  abstract?: string
  relevanceScore: number // 0-100
  citationCount?: number
}

export interface CrossDomainInsight {
  description: string
  sourceDomains: Domain[]
  novelty: string // What makes this insight unique
  evidence: Source[]
}

export interface NovelIdea {
  id: string
  title: string
  description: string
  noveltyScore: number // 0-100, how novel/unique the idea is
  feasibilityScore: number // 0-100, how feasible it is to implement
  impactScore: number // 0-100, potential impact on clean energy
  domains: Domain[]
  crossDomainInsights: CrossDomainInsight[]
  supportingEvidence: Source[]
  potentialChallenges: string[]
  estimatedCost?: string // e.g., "$100K - $1M"
  estimatedTimeframe?: string // e.g., "2-3 years"
  nextSteps: string[]
}

export interface Pattern {
  description: string
  frequency: 'emerging' | 'growing' | 'established' | 'declining'
  relatedIdeas: string[] // IDs of related NovelIdea
  implication: string
}

export interface DiscoveryReport {
  id: string
  createdAt: string
  prompt: DiscoveryPrompt
  ideas: NovelIdea[]
  patterns: Pattern[]
  recommendations: string[]
  searchStats: {
    totalSourcesAnalyzed: number
    academicPapers: number
    patents: number
    technicalReports: number
    newsArticles: number
    domainsSearched: Domain[]
    searchDuration: number // seconds
  }
  aiModel: string // Which AI model generated the report
}

export type NextStepAction =
  | 'create-experiment'
  | 'generate-tea'
  | 'run-simulation'
  | 'search-more'
  | 'export-report'

export interface NextStep {
  action: NextStepAction
  label: string
  description: string
  ideaId?: string // Which idea this action relates to
  enabled: boolean
}

export interface SavedDiscovery {
  reportId: string
  savedAt: string
  notes?: string
  tags?: string[]
  selectedIdeas: string[] // IDs of ideas user found most interesting
}

export interface DiscoveryFilters {
  domains?: Domain[]
  minNoveltyScore?: number
  minFeasibilityScore?: number
  minImpactScore?: number
  sourceTypes?: SourceType[]
  timeframe?: string
}
