/**
 * Citation Module (v0.0.5)
 *
 * Comprehensive citation management system supporting multiple styles
 * and formats for academic references.
 */

export {
  CitationManager,
  getCitationManager,
  saveCitationManager,
  type CitationStyle,
  type SourceType,
  type Author,
  type SourceCitation,
  type CitationLibrary,
  type FormattedCitation,
} from './citation-manager'

export {
  formatCitationAPA,
  formatCitationIEEE,
  formatCitationNature,
  formatCitationChicago,
  formatCitationMLA,
} from './citation-styles'
