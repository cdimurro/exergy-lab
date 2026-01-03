/**
 * Team/Organization API
 *
 * GET: Get current user's organization
 * POST: Create a new organization (Enterprise tier only)
 */

import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, isSupabaseConfigured } from '@/lib/db/supabase'
import type { Organization, TeamMember, TeamStats, TeamInvitation } from '@/types/team'

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

    // Check if user belongs to an organization
    const { data: membership, error: memberError } = await supabase
      .from('organization_members')
      .select('org_id, role')
      .eq('user_id', userId)
      .single()

    if (memberError || !membership) {
      // User is not part of any organization
      return NextResponse.json({
        organization: null,
        members: [],
        stats: null,
        pendingInvitations: [],
      })
    }

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', membership.org_id)
      .single()

    if (orgError || !org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Get all members with user info
    const { data: membersData } = await supabase
      .from('organization_members')
      .select(`
        org_id,
        user_id,
        role,
        invited_at,
        joined_at
      `)
      .eq('org_id', membership.org_id)

    // Get user details for each member
    const members: TeamMember[] = []
    if (membersData) {
      for (const member of membersData) {
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
    }

    // Calculate stats
    const stats: TeamStats = {
      totalMembers: members.length,
      activeMembers: members.filter((m) => m.status === 'active').length,
      pendingInvitations: members.filter((m) => m.status === 'pending').length,
      workflowsThisMonth: 0, // Would query workflows table
      reportsThisMonth: 0, // Would query reports table
      storageUsedMB: 0,
      storageQuotaMB: 10000, // 10GB for enterprise
    }

    // Get pending invitations (would need invitations table)
    const pendingInvitations: TeamInvitation[] = []

    const organization: Organization = {
      ...org,
      members,
      currentUserRole: membership.role,
    }

    return NextResponse.json({
      organization,
      members,
      stats,
      pendingInvitations,
    })
  } catch (error) {
    console.error('[Team API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    // Check if user is enterprise tier
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('tier')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.tier !== 'enterprise') {
      return NextResponse.json(
        { error: 'Enterprise tier required to create an organization' },
        { status: 403 }
      )
    }

    // Check if user already belongs to an organization
    const { data: existingMembership } = await supabase
      .from('organization_members')
      .select('org_id')
      .eq('user_id', userId)
      .single()

    if (existingMembership) {
      return NextResponse.json(
        { error: 'User already belongs to an organization' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name } = body as { name: string }

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Organization name must be at least 2 characters' },
        { status: 400 }
      )
    }

    // Create organization
    const { data: org, error: createError } = await supabase
      .from('organizations')
      .insert({
        name: name.trim(),
        plan: 'enterprise',
        member_count: 1,
      })
      .select()
      .single()

    if (createError || !org) {
      console.error('[Team API] Failed to create organization:', createError)
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      )
    }

    // Add user as admin
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        org_id: org.id,
        user_id: userId,
        role: 'admin',
        joined_at: new Date().toISOString(),
      })

    if (memberError) {
      console.error('[Team API] Failed to add member:', memberError)
      // Rollback organization creation
      await supabase.from('organizations').delete().eq('id', org.id)
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      )
    }

    return NextResponse.json({ organization: org }, { status: 201 })
  } catch (error) {
    console.error('[Team API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
