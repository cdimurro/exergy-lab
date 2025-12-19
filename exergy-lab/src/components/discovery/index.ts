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

// Configuration panel
export { DiscoveryConfigPanel } from './DiscoveryConfigPanel'

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
