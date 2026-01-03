/**
 * Saved Items API
 *
 * GET: List all saved items for authenticated user
 * POST: Save a new item (paper, idea, hypothesis)
 */

import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, isSupabaseConfigured } from '@/lib/db/supabase'
import type { SavedItemType } from '@/types/database'

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
      .from('saved_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    // Filter by type
    const type = searchParams.get('type') as SavedItemType | null
    if (type) {
      query = query.eq('type', type)
    }

    // Filter by tag
    const tag = searchParams.get('tag')
    if (tag) {
      query = query.contains('tags', [tag])
    }

    // Pagination
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    query = query.range(offset, offset + limit - 1)

    const { data: items, error } = await query

    if (error) {
      console.error('[Saved API] Error fetching saved items:', error)
      return NextResponse.json(
        { error: 'Failed to fetch saved items' },
        { status: 500 }
      )
    }

    return NextResponse.json({ items })
  } catch (error) {
    console.error('[Saved API] Unexpected error:', error)
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

    const { type, data, tags, notes } = body as {
      type: SavedItemType
      data: Record<string, unknown>
      tags?: string[]
      notes?: string
    }

    if (!type || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: type, data' },
        { status: 400 }
      )
    }

    const { data: item, error } = await supabase
      .from('saved_items')
      .insert({
        user_id: userId,
        type,
        data,
        tags: tags || [],
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error('[Saved API] Error saving item:', error)
      return NextResponse.json(
        { error: 'Failed to save item' },
        { status: 500 }
      )
    }

    return NextResponse.json({ item }, { status: 201 })
  } catch (error) {
    console.error('[Saved API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
