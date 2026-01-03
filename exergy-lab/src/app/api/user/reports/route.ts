/**
 * User Reports API
 *
 * GET: List all reports for authenticated user
 * POST: Create a new report
 */

import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, isSupabaseConfigured } from '@/lib/db/supabase'
import type { ReportType, ReportSection } from '@/types/database'

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
      .from('reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Filter by type
    const type = searchParams.get('type') as ReportType | null
    if (type) {
      query = query.eq('type', type)
    }

    // Pagination
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    query = query.range(offset, offset + limit - 1)

    const { data: reports, error } = await query

    if (error) {
      console.error('[Reports API] Error fetching reports:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reports' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reports })
  } catch (error) {
    console.error('[Reports API] Unexpected error:', error)
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

    const { type, title, summary, sections, workflow_id, metadata } = body as {
      type: ReportType
      title: string
      summary?: string
      sections: ReportSection[]
      workflow_id?: string
      metadata?: Record<string, unknown>
    }

    if (!type || !title || !sections) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, sections' },
        { status: 400 }
      )
    }

    const { data: report, error } = await supabase
      .from('reports')
      .insert({
        user_id: userId,
        type,
        title,
        summary: summary || null,
        sections,
        workflow_id: workflow_id || null,
        metadata: metadata || {},
      })
      .select()
      .single()

    if (error) {
      console.error('[Reports API] Error creating report:', error)
      return NextResponse.json(
        { error: 'Failed to create report' },
        { status: 500 }
      )
    }

    return NextResponse.json({ report }, { status: 201 })
  } catch (error) {
    console.error('[Reports API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
