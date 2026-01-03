'use client'

/**
 * InviteMembers Component
 *
 * Modal/dialog for inviting new members to the team.
 */

import { useState } from 'react'
import { Card, Button, Badge } from '@/components/ui'
import { X, Mail, UserPlus, Check, AlertCircle, Crown, Shield, Eye } from 'lucide-react'
import type { MemberRole } from '@/types/team'
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/types/team'

interface InviteMembersProps {
  isOpen: boolean
  onClose: () => void
  onInvite: (email: string, role: MemberRole) => Promise<{ success: boolean; message?: string }>
}

const ROLE_ICONS: Record<MemberRole, React.ComponentType<{ className?: string }>> = {
  admin: Crown,
  member: Shield,
  viewer: Eye,
}

export function InviteMembers({ isOpen, onClose, onInvite }: InviteMembersProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('member')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim()) return

    setIsLoading(true)
    setResult(null)

    try {
      const response = await onInvite(email.trim().toLowerCase(), role)
      setResult({
        success: response.success,
        message: response.message || (response.success ? 'Invitation sent!' : 'Failed to invite'),
      })

      if (response.success) {
        setEmail('')
        // Keep dialog open to show success message or invite more
      }
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to send invitation',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setEmail('')
    setRole('member')
    setResult(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <Card className="relative max-w-md w-full mx-4 bg-background p-6">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-background-elevated text-foreground-muted hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Invite Team Member</h2>
            <p className="text-sm text-foreground-muted">
              Send an invitation to join your organization
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                required
                className="w-full pl-10 pr-4 py-2 bg-background-surface border border-border rounded-lg text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Role
            </label>
            <div className="space-y-2">
              {(['member', 'viewer', 'admin'] as MemberRole[]).map((r) => {
                const Icon = ROLE_ICONS[r]
                const isSelected = role === r

                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30 hover:bg-background-hover'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-primary/10' : 'bg-background-elevated'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 ${
                          isSelected ? 'text-primary' : 'text-foreground-muted'
                        }`}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <p
                        className={`font-medium ${
                          isSelected ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        {ROLE_LABELS[r]}
                      </p>
                      <p className="text-xs text-foreground-muted">
                        {ROLE_DESCRIPTIONS[r]}
                      </p>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Result Message */}
          {result && (
            <div
              className={`flex items-center gap-2 p-3 rounded-lg ${
                result.success
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {result.success ? (
                <Check className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <p className="text-sm">{result.message}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleClose}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading || !email.trim()}>
              {isLoading ? 'Sending...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default InviteMembers
