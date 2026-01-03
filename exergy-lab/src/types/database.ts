/**
 * Database Types
 *
 * TypeScript types for Supabase database tables.
 */

export type UserTier = 'free' | 'pro' | 'enterprise'

export type WorkflowType =
  | 'discovery'
  | 'breakthrough'
  | 'experiment'
  | 'simulation'
  | 'tea'
  | 'search'

export type WorkflowStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'

export type ReportType =
  | 'discovery'
  | 'breakthrough'
  | 'experiment'
  | 'simulation'
  | 'tea'

export type SavedItemType = 'paper' | 'idea' | 'hypothesis'

export type GapType = 'knowledge' | 'technology' | 'market' | 'regulatory'

export type Priority = 'critical' | 'high' | 'medium' | 'low'

// Database row types
export interface DbUser {
  id: string
  email: string
  name: string | null
  tier: UserTier
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  created_at: string
  updated_at: string
}

export interface DbWorkflow {
  id: string
  user_id: string
  type: WorkflowType
  name: string | null
  status: WorkflowStatus
  phase: string | null
  progress: Record<string, unknown>
  input: Record<string, unknown>
  result: Record<string, unknown> | null
  error: string | null
  started_at: string
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface DbReport {
  id: string
  user_id: string
  workflow_id: string | null
  type: ReportType
  title: string
  summary: string | null
  sections: ReportSection[]
  metadata: Record<string, unknown>
  pdf_url: string | null
  created_at: string
}

export interface DbSearch {
  id: string
  user_id: string
  query: string
  filters: Record<string, unknown>
  results: Record<string, unknown> | null
  result_count: number
  created_at: string
}

export interface DbSavedItem {
  id: string
  user_id: string
  type: SavedItemType
  data: Record<string, unknown>
  tags: string[]
  notes: string | null
  created_at: string
}

export interface DbOrganization {
  id: string
  name: string
  plan: 'enterprise'
  member_count: number
  created_at: string
}

export interface DbOrganizationMember {
  org_id: string
  user_id: string
  role: 'admin' | 'member' | 'viewer'
  invited_at: string
  joined_at: string | null
}

// Report section structure
export interface ReportSection {
  id: string
  title: string
  type: 'text' | 'table' | 'chart' | 'list' | 'metrics'
  content: unknown
  subsections?: ReportSection[]
}

// Comprehensive report structure
export interface ComprehensiveReport {
  id: string
  workflowId: string
  type: ReportType

  // Header
  title: string
  subtitle: string
  generatedAt: string
  workflowDuration: number

  // Executive Summary
  executiveSummary: {
    overview: string
    keyFindings: string[]
    recommendations: string[]
    confidence: number
  }

  // Main Sections
  sections: ReportSection[]

  // Research Analysis
  researchAnalysis?: {
    sourcesAnalyzed: number
    keyPapers: Array<{
      title: string
      relevance: number
      citation: string
    }>
    knowledgeGaps: string[]
    emergingTrends: string[]
  }

  // Findings
  findings: Array<{
    category: string
    title: string
    description: string
    evidence: string[]
    confidence: number
    implications: string[]
  }>

  // Gaps & Opportunities
  gaps: Array<{
    type: GapType
    description: string
    impact: 'high' | 'medium' | 'low'
    suggestedActions: string[]
  }>

  // Recommendations
  recommendations: Array<{
    priority: Priority
    category: string
    title: string
    description: string
    rationale: string
    nextSteps: string[]
    resources: string[]
  }>

  // Technical Details
  technicalDetails?: {
    methodology: string
    assumptions: string[]
    limitations: string[]
    validationResults: unknown
  }

  // Appendices
  appendices: Array<{
    title: string
    content: unknown
  }>

  // Metadata
  metadata: {
    workflowInput: unknown
    phasesCompleted: string[]
    qualityScores: Record<string, number>
    aiModelsUsed: string[]
  }
}

// Supabase database schema type
export interface Database {
  public: {
    Tables: {
      users: {
        Row: DbUser
        Insert: Omit<DbUser, 'created_at' | 'updated_at'> & {
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<DbUser, 'id'>>
      }
      workflows: {
        Row: DbWorkflow
        Insert: Omit<DbWorkflow, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<DbWorkflow, 'id'>>
      }
      reports: {
        Row: DbReport
        Insert: Omit<DbReport, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<DbReport, 'id'>>
      }
      searches: {
        Row: DbSearch
        Insert: Omit<DbSearch, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<DbSearch, 'id'>>
      }
      saved_items: {
        Row: DbSavedItem
        Insert: Omit<DbSavedItem, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<DbSavedItem, 'id'>>
      }
      organizations: {
        Row: DbOrganization
        Insert: Omit<DbOrganization, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<DbOrganization, 'id'>>
      }
      organization_members: {
        Row: DbOrganizationMember
        Insert: Omit<DbOrganizationMember, 'invited_at'> & {
          invited_at?: string
        }
        Update: Partial<DbOrganizationMember>
      }
    }
  }
}
