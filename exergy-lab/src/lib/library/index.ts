/**
 * Personal Library Module (v0.6.0)
 *
 * Personal library system for saving papers, reports, discoveries,
 * experiments, and simulations with folder organization.
 *
 * @example
 * ```typescript
 * import { useLibraryStore } from '@/lib/library'
 *
 * // Create a folder
 * const { createFolder, saveItem } = useLibraryStore()
 * const folder = createFolder('Solar Research')
 *
 * // Save a paper to the library
 * const item = saveItem('paper', 'Perovskite Solar Cells Review', {
 *   type: 'paper',
 *   title: 'Perovskite Solar Cells Review',
 *   authors: [{ name: 'John Doe' }],
 *   year: 2024,
 *   doi: '10.1234/example',
 * }, { folderId: folder.id, tags: ['perovskite', 'review'] })
 * ```
 */

// Types
export * from './library-types'

// Store
export { useLibraryStore } from './library-store'

// ============================================================================
// Convenience Functions
// ============================================================================

import { useLibraryStore } from './library-store'
import type {
  LibraryItem,
  LibraryItemType,
  LibraryItemData,
  PaperData,
  ReportData,
  DiscoveryData,
  ExperimentData,
  SimulationData,
  SaveToLibraryOptions,
} from './library-types'

/**
 * Quick save a paper to the library
 */
export function savePaperToLibrary(
  paper: Omit<PaperData, 'type'>,
  options?: SaveToLibraryOptions
): LibraryItem {
  const store = useLibraryStore.getState()
  return store.saveItem('paper', paper.title, { ...paper, type: 'paper' }, options)
}

/**
 * Quick save a report to the library
 */
export function saveReportToLibrary(
  report: Omit<ReportData, 'type'>,
  options?: SaveToLibraryOptions
): LibraryItem {
  const store = useLibraryStore.getState()
  return store.saveItem('report', report.title, { ...report, type: 'report' }, options)
}

/**
 * Quick save a discovery to the library
 */
export function saveDiscoveryToLibrary(
  discovery: Omit<DiscoveryData, 'type'>,
  title: string,
  options?: SaveToLibraryOptions
): LibraryItem {
  const store = useLibraryStore.getState()
  return store.saveItem('discovery', title, { ...discovery, type: 'discovery' }, options)
}

/**
 * Quick save an experiment to the library
 */
export function saveExperimentToLibrary(
  experiment: Omit<ExperimentData, 'type'>,
  title: string,
  options?: SaveToLibraryOptions
): LibraryItem {
  const store = useLibraryStore.getState()
  return store.saveItem('experiment', title, { ...experiment, type: 'experiment' }, options)
}

/**
 * Quick save a simulation to the library
 */
export function saveSimulationToLibrary(
  simulation: Omit<SimulationData, 'type'>,
  title: string,
  options?: SaveToLibraryOptions
): LibraryItem {
  const store = useLibraryStore.getState()
  return store.saveItem('simulation', title, { ...simulation, type: 'simulation' }, options)
}

/**
 * Check if an item with given metadata already exists
 */
export function itemExistsInLibrary(
  type: LibraryItemType,
  identifier: { doi?: string; arxivId?: string; pubmedId?: string; id?: string }
): boolean {
  const store = useLibraryStore.getState()
  const items = store.items

  for (const item of items) {
    if (item.type !== type) continue

    if (type === 'paper' && item.data.type === 'paper') {
      const paperData = item.data as PaperData
      if (identifier.doi && paperData.doi === identifier.doi) return true
      if (identifier.arxivId && paperData.arxivId === identifier.arxivId) return true
      if (identifier.pubmedId && paperData.pubmedId === identifier.pubmedId) return true
    }

    if (type === 'discovery' && item.data.type === 'discovery') {
      const discoveryData = item.data as DiscoveryData
      if (identifier.id && discoveryData.discoveryId === identifier.id) return true
    }

    if (type === 'experiment' && item.data.type === 'experiment') {
      const experimentData = item.data as ExperimentData
      if (identifier.id && experimentData.experimentId === identifier.id) return true
    }

    if (type === 'simulation' && item.data.type === 'simulation') {
      const simulationData = item.data as SimulationData
      if (identifier.id && simulationData.simulationId === identifier.id) return true
    }
  }

  return false
}

/**
 * Get library statistics summary
 */
export function getLibrarySummary(): {
  total: number
  papers: number
  reports: number
  discoveries: number
  experiments: number
  simulations: number
  folders: number
  tags: string[]
} {
  const store = useLibraryStore.getState()
  const stats = store.getStatistics()

  return {
    total: stats.totalItems,
    papers: stats.byType.paper,
    reports: stats.byType.report,
    discoveries: stats.byType.discovery,
    experiments: stats.byType.experiment,
    simulations: stats.byType.simulation,
    folders: stats.totalFolders,
    tags: store.getAllTags(),
  }
}

/**
 * Get item type icon name (for use with lucide-react)
 */
export function getItemTypeIcon(type: LibraryItemType): string {
  switch (type) {
    case 'paper':
      return 'FileText'
    case 'report':
      return 'FileSpreadsheet'
    case 'discovery':
      return 'Lightbulb'
    case 'experiment':
      return 'FlaskConical'
    case 'simulation':
      return 'Cpu'
    case 'note':
      return 'StickyNote'
    default:
      return 'File'
  }
}

/**
 * Get item type color (for badges/indicators)
 */
export function getItemTypeColor(type: LibraryItemType): string {
  switch (type) {
    case 'paper':
      return '#3B82F6' // blue
    case 'report':
      return '#22C55E' // green
    case 'discovery':
      return '#A855F7' // purple
    case 'experiment':
      return '#F97316' // orange
    case 'simulation':
      return '#06B6D4' // cyan
    case 'note':
      return '#EAB308' // yellow
    default:
      return '#6B7280' // gray
  }
}
