'use client'

/**
 * Team Page
 *
 * Main team management page for Enterprise tier users.
 * Shows organization dashboard, member management, and invitations.
 */

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { Card, Button, Badge } from '@/components/ui'
import { PageHeader } from '@/components/shared'
import {
  Users,
  Crown,
  AlertCircle,
  RefreshCw,
  Building2,
  UserPlus,
  Sparkles,
} from 'lucide-react'
import { TeamDashboard, MemberManagement, InviteMembers } from '@/components/team'
import type {
  Organization,
  TeamMember,
  TeamStats,
  TeamInvitation,
  MemberRole,
  OrganizationResponse,
} from '@/types/team'
import Link from 'next/link'

export default function TeamPage() {
  const { user, isLoaded: isUserLoaded } = useUser()

  // Data state
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [stats, setStats] = useState<TeamStats | null>(null)
  const [pendingInvitations, setPendingInvitations] = useState<TeamInvitation[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<MemberRole | null>(null)

  // UI state
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [isCreatingOrg, setIsCreatingOrg] = useState(false)
  const [newOrgName, setNewOrgName] = useState('')

  // Fetch team data
  const fetchTeamData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/team')

      if (!response.ok) {
        if (response.status === 503) {
          setError('Database not configured. Team features require Supabase setup.')
          return
        }
        throw new Error('Failed to fetch team data')
      }

      const data: OrganizationResponse = await response.json()

      setOrganization(data.organization)
      setMembers(data.members || [])
      setStats(data.stats)
      setPendingInvitations(data.pendingInvitations || [])
      setCurrentUserRole(data.organization?.currentUserRole || null)
    } catch (err) {
      console.error('[Team] Fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load team data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isUserLoaded) {
      fetchTeamData()
    }
  }, [isUserLoaded, fetchTeamData])

  // Create organization
  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newOrgName.trim()) return

    setIsCreatingOrg(true)
    setError(null)

    try {
      const response = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newOrgName.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create organization')
      }

      await fetchTeamData()
      setNewOrgName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create organization')
    } finally {
      setIsCreatingOrg(false)
    }
  }

  // Handle role change
  const handleRoleChange = async (memberId: string, newRole: MemberRole) => {
    try {
      const response = await fetch('/api/team/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, role: newRole }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update role')
      }

      // Update local state
      setMembers((prev) =>
        prev.map((m) => (m.userId === memberId ? { ...m, role: newRole } : m))
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update role')
      throw err
    }
  }

  // Handle member removal
  const handleRemoveMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/team/members?memberId=${memberId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to remove member')
      }

      // Update local state
      setMembers((prev) => prev.filter((m) => m.userId !== memberId))
      if (stats) {
        setStats({
          ...stats,
          totalMembers: stats.totalMembers - 1,
          activeMembers: stats.activeMembers - 1,
        })
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to remove member')
      throw err
    }
  }

  // Handle invitation
  const handleInvite = async (email: string, role: MemberRole) => {
    try {
      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation')
      }

      // Refresh data to show new member or pending invitation
      await fetchTeamData()

      return { success: true, message: data.message }
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Failed to send invitation',
      }
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader
          icon={Users}
          title="Team"
          description="Manage your organization and team members"
        />
        <div className="flex-1 p-6">
          <Card className="p-12 bg-background-elevated border-border">
            <div className="flex flex-col items-center text-center space-y-4">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              <p className="text-foreground-muted">Loading team data...</p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader
          icon={Users}
          title="Team"
          description="Manage your organization and team members"
        />
        <div className="flex-1 p-6">
          <Card className="p-6 bg-red-50 border-red-200">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // No organization - show create form or upgrade prompt
  if (!organization) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader
          icon={Users}
          title="Team"
          description="Create an organization to collaborate with your team"
        />
        <div className="flex-1 p-6 flex items-center justify-center">
        <Card className="p-8 bg-background-elevated border-border max-w-2xl">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Team Collaboration
            </h1>
            <p className="text-foreground-muted mb-6 max-w-md mx-auto">
              Create an organization to collaborate with your team. Share workflows,
              reports, and research across your organization.
            </p>

            {/* Create Organization Form */}
            <form onSubmit={handleCreateOrganization} className="max-w-sm mx-auto">
              <div className="mb-4">
                <input
                  type="text"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="Organization name"
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                  minLength={2}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={isCreatingOrg || !newOrgName.trim()}
              >
                {isCreatingOrg ? 'Creating...' : 'Create Organization'}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-foreground-muted">
                Team features are available on the{' '}
                <Badge className="bg-amber-100 text-amber-700">
                  <Crown className="w-3 h-3 mr-1" />
                  Enterprise
                </Badge>{' '}
                plan.
              </p>
              <Link href="/pricing">
                <Button variant="ghost" className="mt-2">
                  <Sparkles className="w-4 h-4 mr-2" />
                  View Plans
                </Button>
              </Link>
            </div>
          </div>
        </Card>
        </div>
      </div>
    )
  }

  // Has organization - show team dashboard and management
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={Users}
        title="Team"
        description="Manage your organization and team members"
        actions={
          <Button variant="outline" onClick={fetchTeamData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        }
      />

      <div className="flex-1 p-6 space-y-6">
      {/* Dashboard */}
      {stats && currentUserRole && (
        <TeamDashboard
          organization={organization}
          stats={stats}
          currentUserRole={currentUserRole}
          onInviteClick={() => setShowInviteModal(true)}
        />
      )}

      {/* Member Management */}
      {user && currentUserRole && (
        <MemberManagement
          members={members}
          currentUserId={user.id}
          currentUserRole={currentUserRole}
          onRoleChange={handleRoleChange}
          onRemoveMember={handleRemoveMember}
        />
      )}
      </div>

      {/* Invite Modal */}
      <InviteMembers
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
      />
    </div>
  )
}
