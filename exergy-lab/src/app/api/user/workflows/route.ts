/**
 * User Workflows API
 *
 * GET: List all workflows for authenticated user
 * POST: Create a new workflow
 */

import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, isSupabaseConfigured } from '@/lib/db/supabase'
import type { WorkflowType, WorkflowStatus } from '@/types/database'

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url)

    // Build query with optional filters
    let query = supabase
      .from('workflows')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Filter by type
    const type = searchParams.get('type') as WorkflowType | null
    if (type) {
      query = query.eq('type', type)
    }

    // Filter by status
    const status = searchParams.get('status') as WorkflowStatus | null
    if (status) {
      query = query.eq('status', status)
    }

    // Pagination
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    query = query.range(offset, offset + limit - 1)

    const { data: workflows, error } = await query

    if (error) {
      console.error('[Workflows API] Error fetching workflows:', error)
      return NextResponse.json(
        { error: 'Failed to fetch workflows' },
        { status: 500 }
      )
    }

    return NextResponse.json({ workflows })
  } catch (error) {
    console.error('[Workflows API] Unexpected error:', error)
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
    const body = await request.json()

    const { type, name, input } = body as {
      type: WorkflowType
      name?: string
      input: Record<string, unknown>
    }

    if (!type || !input) {
      return NextResponse.json(
        { error: 'Missing required fields: type, input' },
        { status: 400 }
      )
    }

    const { data: workflow, error } = await supabase
      .from('workflows')
      .insert({
        user_id: userId,
        type,
        name: name || null,
        status: 'pending',
        input,
        progress: {},
      })
      .select()
      .single()

    if (error) {
      console.error('[Workflows API] Error creating workflow:', error)
      return NextResponse.json(
        { error: 'Failed to create workflow' },
        { status: 500 }
      )
    }

    return NextResponse.json({ workflow }, { status: 201 })
  } catch (error) {
    console.error('[Workflows API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
