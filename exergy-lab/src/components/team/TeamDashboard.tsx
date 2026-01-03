'use client'

/**
 * TeamDashboard Component
 *
 * Overview of team/organization including stats, quick actions,
 * and recent activity.
 */

import { Card, Badge, Button } from '@/components/ui'
import {
  Users,
  UserPlus,
  BarChart3,
  FileText,
  HardDrive,
  Crown,
  Clock,
} from 'lucide-react'
import type { Organization, TeamStats, MemberRole } from '@/types/team'

interface TeamDashboardProps {
  organization: Organization
  stats: TeamStats
  currentUserRole: MemberRole
  onInviteClick: () => void
}

export function TeamDashboard({
  organization,
  stats,
  currentUserRole,
  onInviteClick,
}: TeamDashboardProps) {
  const isAdmin = currentUserRole === 'admin'

  // Format storage
  const formatStorage = (mb: number): string => {
    if (mb >= 1000) {
      return `${(mb / 1000).toFixed(1)} GB`
    }
    return `${mb} MB`
  }

  // Calculate storage percentage
  const storagePercent = Math.round(
    (stats.storageUsedMB / stats.storageQuotaMB) * 100
  )

  return (
    <div className="space-y-6">
      {/* Organization Header */}
      <Card className="p-6 bg-background-surface border-border">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-7 h-7 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-foreground">
                  {organization.name}
                </h1>
                <Badge className="bg-amber-100 text-amber-700">
                  <Crown className="w-3 h-3 mr-1" />
                  Enterprise
                </Badge>
              </div>
              <p className="text-sm text-foreground-muted">
                {stats.totalMembers} member{stats.totalMembers !== 1 ? 's' : ''} |
                Created {new Date(organization.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>

          {isAdmin && (
            <Button onClick={onInviteClick}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          )}
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Members */}
        <Card className="p-4 bg-background-surface border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {stats.activeMembers}
              </p>
              <p className="text-xs text-foreground-muted">Active Members</p>
            </div>
          </div>
          {stats.pendingInvitations > 0 && (
            <p className="text-xs text-amber-600">
              {stats.pendingInvitations} pending invitation
              {stats.pendingInvitations !== 1 ? 's' : ''}
            </p>
          )}
        </Card>

        {/* Workflows */}
        <Card className="p-4 bg-background-surface border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {stats.workflowsThisMonth}
              </p>
              <p className="text-xs text-foreground-muted">Workflows This Month</p>
            </div>
          </div>
        </Card>

        {/* Reports */}
        <Card className="p-4 bg-background-surface border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {stats.reportsThisMonth}
              </p>
              <p className="text-xs text-foreground-muted">Reports Generated</p>
            </div>
          </div>
        </Card>

        {/* Storage */}
        <Card className="p-4 bg-background-surface border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {formatStorage(stats.storageUsedMB)}
              </p>
              <p className="text-xs text-foreground-muted">
                of {formatStorage(stats.storageQuotaMB)} used
              </p>
            </div>
          </div>
          <div className="w-full h-2 bg-background-elevated rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                storagePercent > 90
                  ? 'bg-red-500'
                  : storagePercent > 70
                  ? 'bg-amber-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${storagePercent}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6 bg-background-surface border-border">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="justify-start h-auto py-3">
            <Users className="w-5 h-5 mr-3 text-primary" />
            <div className="text-left">
              <p className="font-medium">View All Members</p>
              <p className="text-xs text-foreground-muted">Manage team access</p>
            </div>
          </Button>

          <Button variant="outline" className="justify-start h-auto py-3">
            <FileText className="w-5 h-5 mr-3 text-primary" />
            <div className="text-left">
              <p className="font-medium">Shared Reports</p>
              <p className="text-xs text-foreground-muted">View team reports</p>
            </div>
          </Button>

          <Button variant="outline" className="justify-start h-auto py-3">
            <Clock className="w-5 h-5 mr-3 text-primary" />
            <div className="text-left">
              <p className="font-medium">Activity Log</p>
              <p className="text-xs text-foreground-muted">Recent team activity</p>
            </div>
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default TeamDashboard
