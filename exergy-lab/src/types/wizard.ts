/**
 * Feature Wizard Types
 *
 * Type definitions for the two-page wizard system:
 * Page 1: Form inputs for configuring the AI agent
 * Page 2: Chat interface for execution
 */

import type { Domain } from './discovery'

// ============================================================================
// Common Form Data
// ============================================================================

export interface BaseFormData {
  domain: Domain | null
  description: string
}

// ============================================================================
// Feature-Specific Form Data
// ============================================================================

export interface DiscoveryFormData extends BaseFormData {
  goals: string[]
  focusAreas: string[]
}

export interface SearchFormData extends BaseFormData {
  query: string
  sourceTypes: ('papers' | 'patents' | 'datasets')[]
  dateRange: {
    from: string
    to: string
  } | null
}

export interface ExperimentsFormData extends BaseFormData {
  objectives: string[]
  safetyRequirements: string
  constraints: string[]
}

export interface SimulationsFormData extends BaseFormData {
  tier: 'browser' | 'local' | 'cloud'
  parameters: Record<string, string | number>
  systemType: string
}

export interface TEAFormData extends BaseFormData {
  files: File[]
  scale: 'small' | 'medium' | 'large'
  region: string
  projectLifespan: number
}

// ============================================================================
// Unified Form Data Type
// ============================================================================

export type FeatureFormData =
  | { type: 'discovery'; data: DiscoveryFormData }
  | { type: 'search'; data: SearchFormData }
  | { type: 'experiments'; data: ExperimentsFormData }
  | { type: 'simulations'; data: SimulationsFormData }
  | { type: 'tea'; data: TEAFormData }

// ============================================================================
// Wizard Props
// ============================================================================

export type PageType = 'discovery' | 'search' | 'experiments' | 'simulations' | 'tea'
export type WizardPage = 'form' | 'chat'

export interface FeatureWizardProps {
  pageType: PageType
  pageTitle: string
  pageSubtitle: string
  pageIcon: React.ReactNode
  domains: Domain[]
}

export interface FormPageProps<T extends BaseFormData> {
  pageTitle: string
  pageSubtitle: string
  pageIcon: React.ReactNode
  domains: Domain[]
  onSubmit: (data: T) => void
  isSubmitting?: boolean
}

// ============================================================================
// Button Labels
// ============================================================================

export const ACTION_BUTTON_LABELS: Record<PageType, string> = {
  discovery: 'Discover Solutions',
  search: 'Search Literature',
  experiments: 'Design Experiments',
  simulations: 'Run Simulation',
  tea: 'Generate TEA Report',
}

// ============================================================================
// Form Validation
// ============================================================================

export interface FormValidation {
  isValid: boolean
  errors: Record<string, string>
}

export function validateBaseForm(data: BaseFormData): FormValidation {
  const errors: Record<string, string> = {}

  if (!data.domain) {
    errors.domain = 'Please select a domain'
  }

  if (!data.description || data.description.trim().length < 10) {
    errors.description = 'Please provide a description (at least 10 characters)'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

// ============================================================================
// Form Data to Prompt Conversion
// ============================================================================

export function buildPromptFromFormData(
  pageType: PageType,
  formData: any
): string {
  const parts: string[] = []

  // Always include domain and description
  if (formData.domain) {
    parts.push(`Domain: ${formatDomainLabel(formData.domain)}`)
  }

  if (formData.description) {
    parts.push(`Goal: ${formData.description}`)
  }

  // Add feature-specific fields
  switch (pageType) {
    case 'discovery':
      if (formData.goals?.length > 0) {
        parts.push(`Research Goals: ${formData.goals.join(', ')}`)
      }
      if (formData.focusAreas?.length > 0) {
        parts.push(`Focus Areas: ${formData.focusAreas.join(', ')}`)
      }
      break

    case 'search':
      if (formData.query) {
        parts.push(`Search Query: ${formData.query}`)
      }
      if (formData.sourceTypes?.length > 0) {
        parts.push(`Source Types: ${formData.sourceTypes.join(', ')}`)
      }
      if (formData.dateRange) {
        parts.push(`Date Range: ${formData.dateRange.from} to ${formData.dateRange.to}`)
      }
      break

    case 'experiments':
      if (formData.objectives?.length > 0) {
        parts.push(`Objectives:\n${formData.objectives.map((o: string, i: number) => `  ${i + 1}. ${o}`).join('\n')}`)
      }
      if (formData.safetyRequirements) {
        parts.push(`Safety Requirements: ${formData.safetyRequirements}`)
      }
      if (formData.constraints?.length > 0) {
        parts.push(`Constraints: ${formData.constraints.join(', ')}`)
      }
      break

    case 'simulations':
      parts.push(`Simulation Tier: ${formData.tier}`)
      if (formData.systemType) {
        parts.push(`System Type: ${formData.systemType}`)
      }
      if (formData.parameters && Object.keys(formData.parameters).length > 0) {
        const paramStr = Object.entries(formData.parameters)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')
        parts.push(`Parameters: ${paramStr}`)
      }
      break

    case 'tea':
      parts.push(`Scale: ${formData.scale}`)
      if (formData.region) {
        parts.push(`Region: ${formData.region}`)
      }
      if (formData.projectLifespan) {
        parts.push(`Project Lifespan: ${formData.projectLifespan} years`)
      }
      if (formData.files?.length > 0) {
        parts.push(`Attached Files: ${formData.files.map((f: File) => f.name).join(', ')}`)
      }
      break
  }

  return parts.join('\n\n')
}

// ============================================================================
// Helper Functions
// ============================================================================

export function formatDomainLabel(domain: Domain): string {
  return domain
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export function getInitialFormData(pageType: PageType): any {
  const base = {
    domain: null,
    description: '',
  }

  switch (pageType) {
    case 'discovery':
      return { ...base, goals: [], focusAreas: [] }
    case 'search':
      return { ...base, query: '', sourceTypes: ['papers'], dateRange: null }
    case 'experiments':
      return { ...base, objectives: [''], safetyRequirements: '', constraints: [] }
    case 'simulations':
      return { ...base, tier: 'browser', parameters: {}, systemType: '' }
    case 'tea':
      return { ...base, files: [], scale: 'medium', region: '', projectLifespan: 25 }
    default:
      return base
  }
}
