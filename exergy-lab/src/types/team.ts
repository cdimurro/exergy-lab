/**
 * Team/Organization Types
 *
 * Extended types for team management functionality.
 */

import type { DbOrganization, DbOrganizationMember } from './database'

// Re-export database types
export type { DbOrganization, DbOrganizationMember }

// Member roles
export type MemberRole = 'admin' | 'member' | 'viewer'

// Role permissions
export const ROLE_PERMISSIONS: Record<MemberRole, string[]> = {
  admin: [
    'manage_team',
    'invite_members',
    'remove_members',
    'change_roles',
    'view_all_workflows',
    'run_workflows',
    'view_reports',
    'export_data',
    'manage_billing',
  ],
  member: [
    'view_team',
    'view_all_workflows',
    'run_workflows',
    'view_reports',
    'export_data',
  ],
  viewer: [
    'view_team',
    'view_all_workflows',
    'view_reports',
  ],
}

// Role display names
export const ROLE_LABELS: Record<MemberRole, string> = {
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
}

// Role descriptions
export const ROLE_DESCRIPTIONS: Record<MemberRole, string> = {
  admin: 'Full access to team settings, billing, and member management',
  member: 'Can run workflows, view reports, and export data',
  viewer: 'Read-only access to team workflows and reports',
}

// Extended member with user info
export interface TeamMember {
  id: string
  userId: string
  orgId: string
  email: string
  name: string | null
  role: MemberRole
  invitedAt: string
  joinedAt: string | null
  status: 'active' | 'pending' | 'inactive'
  lastActive?: string
}

// Organization with members
export interface Organization extends DbOrganization {
  members?: TeamMember[]
  currentUserRole?: MemberRole
}

// Invitation
export interface TeamInvitation {
  id: string
  orgId: string
  email: string
  role: MemberRole
  invitedBy: string
  invitedAt: string
  expiresAt: string
  status: 'pending' | 'accepted' | 'expired' | 'cancelled'
  token?: string
}

// Team activity log
export interface TeamActivity {
  id: string
  orgId: string
  userId: string
  userName: string
  action: TeamActivityAction
  targetType?: 'member' | 'workflow' | 'report' | 'settings'
  targetId?: string
  targetName?: string
  metadata?: Record<string, unknown>
  timestamp: string
}

export type TeamActivityAction =
  | 'member_invited'
  | 'member_joined'
  | 'member_removed'
  | 'member_role_changed'
  | 'workflow_started'
  | 'workflow_completed'
  | 'report_generated'
  | 'report_shared'
  | 'settings_updated'

// Team statistics
export interface TeamStats {
  totalMembers: number
  activeMembers: number
  pendingInvitations: number
  workflowsThisMonth: number
  reportsThisMonth: number
  storageUsedMB: number
  storageQuotaMB: number
}

// Create organization request
export interface CreateOrganizationRequest {
  name: string
}

// Invite member request
export interface InviteMemberRequest {
  email: string
  role: MemberRole
}

// Update member request
export interface UpdateMemberRequest {
  role?: MemberRole
}

// API response types
export interface TeamApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface OrganizationResponse {
  organization: Organization
  members: TeamMember[]
  stats: TeamStats
  pendingInvitations: TeamInvitation[]
}
