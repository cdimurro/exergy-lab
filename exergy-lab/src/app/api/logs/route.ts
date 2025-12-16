/**
 * Activity Logs API Route
 * POST: Store activity logs
 * GET: Retrieve logs with filters
 */

import { NextRequest, NextResponse } from 'next/server'
import { logStore } from '@/lib/log-store'
import type { ActivityLog, LogFilters } from '@/types/activity-log'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/logs
 * Store activity logs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.logs || !Array.isArray(body.logs)) {
      return NextResponse.json({ error: 'Invalid logs format' }, { status: 400 })
    }

    const logs: ActivityLog[] = body.logs

    // Enrich logs with server-side data
    const enrichedLogs = logs.map((log) => ({
      ...log,
      userAgent: request.headers.get('user-agent') || undefined,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
    }))

    // Store logs
    logStore.addLogs(enrichedLogs)

    return NextResponse.json({
      success: true,
      count: logs.length
    })
  } catch (error) {
    console.error('Error storing logs:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to store logs' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/logs
 * Retrieve logs with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse filters from query parameters
    const filters: LogFilters = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      userId: searchParams.get('userId') || undefined,
      sessionId: searchParams.get('sessionId') || undefined,
      type: searchParams.get('type') as any || undefined,
      page: searchParams.get('page') || undefined,
      success: searchParams.get('success') === 'true' ? true : searchParams.get('success') === 'false' ? false : undefined,
      searchTerm: searchParams.get('searchTerm') || undefined,
    }

    // Get logs
    const logs = logStore.getLogs(filters)

    // Pagination
    const page = parseInt(searchParams.get('pageNum') || '1')
    const limit = parseInt(searchParams.get('limit') || '100')
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit

    const paginatedLogs = logs.slice(startIndex, endIndex)

    return NextResponse.json({
      logs: paginatedLogs,
      totalCount: logs.length,
      page,
      limit,
      totalPages: Math.ceil(logs.length / limit),
    })
  } catch (error) {
    console.error('Error retrieving logs:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to retrieve logs' },
      { status: 500 }
    )
  }
}
