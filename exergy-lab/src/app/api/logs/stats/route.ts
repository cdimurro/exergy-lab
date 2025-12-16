/**
 * Activity Logs Stats API Route
 * GET: Retrieve statistics and analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { logStore } from '@/lib/log-store'
import type { LogFilters } from '@/types/activity-log'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/logs/stats
 * Get activity log statistics
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse filters from query parameters
    const filters: LogFilters = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      userId: searchParams.get('userId') || undefined,
      type: searchParams.get('type') as any || undefined,
      page: searchParams.get('page') || undefined,
    }

    // Get stats
    const stats = logStore.getStats(filters)

    // Get sessions
    const sessions = logStore.getSessions(filters)

    return NextResponse.json({
      stats,
      recentSessions: sessions.slice(0, 10), // Last 10 sessions
    })
  } catch (error) {
    console.error('Error retrieving stats:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retrieve stats' },
      { status: 500 }
    )
  }
}
