/**
 * Discovery Components Module
 *
 * Exports all FrontierScience discovery UI components.
 */

// Quality indicators
export { QualityBadge, QualityScoreDisplay, CompactQualityIndicator } from './QualityBadge'

// Phase timeline
export { PhaseTimeline } from './PhaseTimeline'

// Iteration tracking
export { IterationBadge, IterationDots, IterationHistory } from './IterationBadge'

// Thinking/activity indicators
export { ThinkingIndicator, ActivityIndicator, PulsingBrain } from './ThinkingIndicator'

// Rubric scoring
export { RubricScoreCard, CompactRubricSummary, RubricProgressBar } from './RubricScoreCard'
export { RubricTable } from './RubricTable'

// Main cards
export { FrontierScienceProgressCard, MinimalProgress } from './FrontierScienceProgressCard'
export { FrontierScienceResultsCard, CompactResultsSummary } from './FrontierScienceResultsCard'
export { PartialResultsCard } from './PartialResultsCard'

// Multi-benchmark validation
export { MultiBenchmarkCard } from './MultiBenchmarkCard'

// User feedback
export { FeedbackPanel, ItemFeedback, QuickRating } from './FeedbackPanel'

// Recommendations
export { RecommendationsList, CompactRecommendations } from './RecommendationsList'

// Configuration panel (deprecated - use DiscoveryOptionsModal instead)
// export { DiscoveryConfigPanel } from './DiscoveryConfigPanel'

// Tier selectors
export { ExperimentTierSelector, ExperimentTierBadge } from './ExperimentTierSelector'
export { SimulationTierSelector, SimulationTierBadge, TierEscalationBanner } from './SimulationTierSelector'

// Phase intervention
export { PhaseInterventionCard, InterventionBanner } from './PhaseInterventionCard'

// Hypothesis management
export { HypothesisSelector, HypothesisBadgeList } from './HypothesisSelector'

// Export functionality
export { ExportPanel, QuickExportButton } from './ExportPanel'

// Phase results display
export { PhaseResultsDropdown, generatePhaseKeyFindings } from './PhaseResultsDropdown'
export type { PhaseKeyFindings, PhaseResultsDropdownProps } from './PhaseResultsDropdown'

// Phase detail panel (context-aware details for each phase status)
export { PhaseDetailPanel } from './PhaseDetailPanel'
export type { PhaseStatus, PhaseResult } from './PhaseDetailPanel'

// Failure recovery (intelligent failure handling with recommendations)
export { FailureRecoveryPanel, FailureAlert } from './FailureRecoveryPanel'

// Prompt improvement suggestion
export { PromptSuggestion } from './PromptSuggestion'

// Discovery mode selection
export { DiscoveryModeSelector, ModeBadge } from './DiscoveryModeSelector'

// Discovery options modal
export { DiscoveryOptionsModal, DiscoveryOptionsButton } from './DiscoveryOptionsModal'
export type { DiscoveryAdvancedOptions } from './DiscoveryOptionsModal'

// Live insights feed (real-time streaming)
export { LiveInsightsFeed, InsightFilterBar } from './LiveInsightsFeed'
export type { InsightItem, InsightType } from './LiveInsightsFeed'

// Research insights (comprehensive research value display)
export { ResearchInsightsCard, ResearchInsightsSummary } from './ResearchInsightsCard'
export type {
  ResearchInsightsData,
  ResearchSource,
  KeyFinding,
  TechnologicalGap,
  CrossDomainInsight,
  StateOfArt,
} from './ResearchInsightsCard'

// Refinement visualization (iteration progress display)
export { RefinementVisualization, CompactRefinementProgress } from './RefinementVisualization'
export type { IterationData, CriterionScore } from './RefinementVisualization'

// Expert review (human-in-the-loop validation)
export { ExpertReviewPanel } from './ExpertReviewPanel'
export type { ExpertDecision, ExpertReview, ExpertReviewPanelProps } from './ExpertReviewPanel'
export { ExpertApprovalBadge, VerifiedBadge } from './ExpertApprovalBadge'
export type { ExpertApprovalBadgeProps, VerifiedBadgeProps } from './ExpertApprovalBadge'
export { HypothesisFeedbackForm } from './HypothesisFeedbackForm'
export type { StructuredFeedback, HypothesisFeedbackFormProps } from './HypothesisFeedbackForm'

// Success rate tracking (hypothesis approval analytics)
export { SuccessRateTracker, SuccessRateCompact } from './SuccessRateTracker'
