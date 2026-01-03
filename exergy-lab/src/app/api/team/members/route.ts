/**
 * Team Members API
 *
 * GET: List all members of current user's organization
 * PATCH: Update a member's role
 * DELETE: Remove a member from the organization
 */

import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, isSupabaseConfigured } from '@/lib/db/supabase'
import type { MemberRole } from '@/types/team'

// Helper to check if user has admin role
async function checkAdminAccess(
  supabase: ReturnType<typeof createServerClient>,
  userId: string
): Promise<{ orgId: string } | null> {
  const { data: membership } = await supabase
    .from('organization_members')
    .select('org_id, role')
    .eq('user_id', userId)
    .single()

  if (!membership || membership.role !== 'admin') {
    return null
  }

  return { orgId: membership.org_id }
}

export async function GET() {
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

    // Get user's organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('org_id')
      .eq('user_id', userId)
      .single()

    if (!membership) {
      return NextResponse.json({ members: [] })
    }

    // Get all members
    const { data: membersData, error: membersError } = await supabase
      .from('organization_members')
      .select('*')
      .eq('org_id', membership.org_id)

    if (membersError) {
      console.error('[Members API] Error fetching members:', membersError)
      return NextResponse.json(
        { error: 'Failed to fetch members' },
        { status: 500 }
      )
    }

    // Enrich with user data
    const members = []
    for (const member of membersData || []) {
      const { data: userData } = await supabase
        .from('users')
        .select('email, name')
        .eq('id', member.user_id)
        .single()

      members.push({
        id: `${member.org_id}-${member.user_id}`,
        userId: member.user_id,
        orgId: member.org_id,
        email: userData?.email || 'unknown',
        name: userData?.name || null,
        role: member.role,
        invitedAt: member.invited_at,
        joinedAt: member.joined_at,
        status: member.joined_at ? 'active' : 'pending',
      })
    }

    return NextResponse.json({ members })
  } catch (error) {
    console.error('[Members API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
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
    const access = await checkAdminAccess(supabase, userId)
    if (!access) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { memberId, role } = body as { memberId: string; role: MemberRole }

    if (!memberId || !role) {
      return NextResponse.json(
        { error: 'Missing memberId or role' },
        { status: 400 }
      )
    }

    if (!['admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Prevent demoting self if only admin
    if (memberId === userId && role !== 'admin') {
      const { data: admins } = await supabase
        .from('organization_members')
        .select('user_id')
        .eq('org_id', access.orgId)
        .eq('role', 'admin')

      if (admins && admins.length <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the only admin' },
          { status: 400 }
        )
      }
    }

    // Update role
    const { error: updateError } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('org_id', access.orgId)
      .eq('user_id', memberId)

    if (updateError) {
      console.error('[Members API] Error updating role:', updateError)
      return NextResponse.json(
        { error: 'Failed to update member role' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Members API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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
    const access = await checkAdminAccess(supabase, userId)
    if (!access) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const memberId = searchParams.get('memberId')

    if (!memberId) {
      return NextResponse.json(
        { error: 'Missing memberId' },
        { status: 400 }
      )
    }

    // Cannot remove yourself
    if (memberId === userId) {
      return NextResponse.json(
        { error: 'Cannot remove yourself from the organization' },
        { status: 400 }
      )
    }

    // Remove member
    const { error: deleteError } = await supabase
      .from('organization_members')
      .delete()
      .eq('org_id', access.orgId)
      .eq('user_id', memberId)

    if (deleteError) {
      console.error('[Members API] Error removing member:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove member' },
        { status: 500 }
      )
    }

    // Update member count
    await supabase
      .from('organizations')
      .update({ member_count: supabase.rpc('decrement_member_count') })
      .eq('id', access.orgId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Members API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
