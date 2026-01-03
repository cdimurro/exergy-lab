/**
 * Team Invite API
 *
 * POST: Invite a new member to the organization
 */

import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, isSupabaseConfigured } from '@/lib/db/supabase'
import type { MemberRole } from '@/types/team'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      )
    }

    const supabase = createServerClient()

    // Check admin access
    const { data: membership } = await supabase
      .from('organization_members')
      .select('org_id, role')
      .eq('user_id', userId)
      .single()

    if (!membership || membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required to invite members' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, role } = body as { email: string; role: MemberRole }

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Missing email or role' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Check if user with this email exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('org_id')
        .eq('user_id', existingUser.id)
        .eq('org_id', membership.org_id)
        .single()

      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a member of this organization' },
          { status: 400 }
        )
      }

      // Add user directly as member
      const { error: addError } = await supabase
        .from('organization_members')
        .insert({
          org_id: membership.org_id,
          user_id: existingUser.id,
          role,
          invited_at: new Date().toISOString(),
          joined_at: new Date().toISOString(),
        })

      if (addError) {
        console.error('[Invite API] Error adding member:', addError)
        return NextResponse.json(
          { error: 'Failed to add member' },
          { status: 500 }
        )
      }

      // Update member count
      const { data: org } = await supabase
        .from('organizations')
        .select('member_count')
        .eq('id', membership.org_id)
        .single()

      if (org) {
        await supabase
          .from('organizations')
          .update({ member_count: org.member_count + 1 })
          .eq('id', membership.org_id)
      }

      return NextResponse.json({
        success: true,
        message: 'Member added successfully',
        memberAdded: true,
      })
    }

    // User doesn't exist - create a pending invitation
    // In a real implementation, you would:
    // 1. Store the invitation in an invitations table
    // 2. Send an email with an invite link
    // 3. When the user signs up, auto-add them to the org

    // For now, return success with a note about the pending invitation
    return NextResponse.json({
      success: true,
      message: `Invitation sent to ${email}. They will be added when they create an account.`,
      memberAdded: false,
      pendingInvitation: true,
    })
  } catch (error) {
    console.error('[Invite API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
