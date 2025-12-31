/**
 * Centralized store exports
 */

export { useUIStore } from './ui-store'
export { useProjectsStore } from './projects-store'
export { useDiscoveriesStore } from './discoveries-store'
export { useExperimentsStore } from './experiments-store'
export { useSimulationsStore } from './simulations-store'
export {
  useWorkflowContext,
  extractParametersFromPapers,
  extractParametersFromProtocol,
  getNextSuggestedStep,
} from './workflow-context-store'
export type {
  SourcePaperContext,
  ExperimentProtocolContext,
  SimulationResultsContext,
  WorkflowContext,
} from './workflow-context-store'
