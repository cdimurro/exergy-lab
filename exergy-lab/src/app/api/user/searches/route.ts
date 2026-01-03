/**
 * User Searches API
 *
 * GET: List search history for authenticated user
 * POST: Save a new search
 */

import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, isSupabaseConfigured } from '@/lib/db/supabase'

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

    // Pagination
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data: searches, error } = await supabase
      .from('searches')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('[Searches API] Error fetching searches:', error)
      return NextResponse.json(
        { error: 'Failed to fetch searches' },
        { status: 500 }
      )
    }

    return NextResponse.json({ searches })
  } catch (error) {
    console.error('[Searches API] Unexpected error:', error)
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

    const { query, filters, results, result_count } = body as {
      query: string
      filters?: Record<string, unknown>
      results?: Record<string, unknown>
      result_count?: number
    }

    if (!query) {
      return NextResponse.json(
        { error: 'Missing required field: query' },
        { status: 400 }
      )
    }

    const { data: search, error } = await supabase
      .from('searches')
      .insert({
        user_id: userId,
        query,
        filters: filters || {},
        results: results || null,
        result_count: result_count || 0,
      })
      .select()
      .single()

    if (error) {
      console.error('[Searches API] Error saving search:', error)
      return NextResponse.json(
        { error: 'Failed to save search' },
        { status: 500 }
      )
    }

    return NextResponse.json({ search }, { status: 201 })
  } catch (error) {
    console.error('[Searches API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
