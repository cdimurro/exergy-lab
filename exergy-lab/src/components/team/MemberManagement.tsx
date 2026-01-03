'use client'

/**
 * MemberManagement Component
 *
 * List and manage team members with role changes and removal.
 */

import { useState } from 'react'
import { Card, Badge, Button } from '@/components/ui'
import {
  User,
  Crown,
  Shield,
  Eye,
  MoreVertical,
  UserMinus,
  ChevronDown,
  Check,
  Clock,
} from 'lucide-react'
import type { TeamMember, MemberRole } from '@/types/team'
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/types/team'

interface MemberManagementProps {
  members: TeamMember[]
  currentUserId: string
  currentUserRole: MemberRole
  onRoleChange: (memberId: string, newRole: MemberRole) => Promise<void>
  onRemoveMember: (memberId: string) => Promise<void>
}

const ROLE_ICONS: Record<MemberRole, React.ComponentType<{ className?: string }>> = {
  admin: Crown,
  member: Shield,
  viewer: Eye,
}

const ROLE_COLORS: Record<MemberRole, string> = {
  admin: 'bg-amber-100 text-amber-700',
  member: 'bg-blue-100 text-blue-700',
  viewer: 'bg-gray-100 text-gray-700',
}

export function MemberManagement({
  members,
  currentUserId,
  currentUserRole,
  onRoleChange,
  onRemoveMember,
}: MemberManagementProps) {
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [loadingMember, setLoadingMember] = useState<string | null>(null)

  const isAdmin = currentUserRole === 'admin'

  const handleRoleChange = async (memberId: string, newRole: MemberRole) => {
    setLoadingMember(memberId)
    try {
      await onRoleChange(memberId, newRole)
    } finally {
      setLoadingMember(null)
      setExpandedMember(null)
    }
  }

  const handleRemove = async (memberId: string, memberName: string | null) => {
    if (!window.confirm(`Remove ${memberName || 'this member'} from the team?`)) {
      return
    }

    setLoadingMember(memberId)
    try {
      await onRemoveMember(memberId)
    } finally {
      setLoadingMember(null)
    }
  }

  const formatDate = (isoString: string | null) => {
    if (!isoString) return 'Pending'
    return new Date(isoString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Sort: admins first, then by name
  const sortedMembers = [...members].sort((a, b) => {
    if (a.role === 'admin' && b.role !== 'admin') return -1
    if (b.role === 'admin' && a.role !== 'admin') return 1
    return (a.name || a.email).localeCompare(b.name || b.email)
  })

  return (
    <Card className="bg-background-surface border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Team Members</h2>
        <p className="text-sm text-foreground-muted">
          {members.length} member{members.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Member List */}
      <div className="divide-y divide-border">
        {sortedMembers.map((member) => {
          const RoleIcon = ROLE_ICONS[member.role]
          const isCurrentUser = member.userId === currentUserId
          const isExpanded = expandedMember === member.userId
          const isLoading = loadingMember === member.userId

          return (
            <div
              key={member.id}
              className={`p-4 ${isLoading ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>

                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">
                        {member.name || member.email}
                      </span>
                      {isCurrentUser && (
                        <Badge variant="secondary" className="text-xs">
                          You
                        </Badge>
                      )}
                      {member.status === 'pending' && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          Pending
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground-muted">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Role Badge */}
                  <Badge className={ROLE_COLORS[member.role]}>
                    <RoleIcon className="w-3 h-3 mr-1" />
                    {ROLE_LABELS[member.role]}
                  </Badge>

                  {/* Actions (Admin only, not for self) */}
                  {isAdmin && !isCurrentUser && (
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedMember(isExpanded ? null : member.userId)
                        }
                        disabled={isLoading}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>

                      {/* Dropdown Menu */}
                      {isExpanded && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-background-surface border border-border rounded-lg shadow-lg z-10">
                          <div className="p-2">
                            <p className="px-2 py-1 text-xs font-medium text-foreground-muted">
                              Change Role
                            </p>
                            {(['admin', 'member', 'viewer'] as MemberRole[]).map(
                              (role) => (
                                <button
                                  key={role}
                                  onClick={() => handleRoleChange(member.userId, role)}
                                  disabled={role === member.role}
                                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm ${
                                    role === member.role
                                      ? 'text-foreground-muted cursor-not-allowed'
                                      : 'text-foreground hover:bg-background-hover'
                                  }`}
                                >
                                  {role === member.role && (
                                    <Check className="w-3 h-3" />
                                  )}
                                  <span className={role === member.role ? 'ml-5' : 'ml-5'}>
                                    {ROLE_LABELS[role]}
                                  </span>
                                </button>
                              )
                            )}
                          </div>
                          <div className="border-t border-border p-2">
                            <button
                              onClick={() => handleRemove(member.userId, member.name)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm text-red-600 hover:bg-red-50"
                            >
                              <UserMinus className="w-4 h-4" />
                              Remove from Team
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Member Details */}
              <div className="mt-2 ml-13 flex items-center gap-4 text-xs text-foreground-muted">
                <span>Joined: {formatDate(member.joinedAt)}</span>
                {member.lastActive && (
                  <span>Last active: {formatDate(member.lastActive)}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {members.length === 0 && (
        <div className="p-8 text-center text-foreground-muted">
          <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No team members yet</p>
        </div>
      )}
    </Card>
  )
}

export default MemberManagement
