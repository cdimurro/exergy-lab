/**
 * Paper Content API Route
 *
 * Server-side API for fetching paper content from various sources.
 * Handles PDF parsing and other server-side operations.
 *
 * POST /api/papers/content
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { Source } from '@/types/sources'
import {
  fetchPaperContent,
  getPaperPdfUrl,
  getPaperExternalUrl,
  getContentTier,
} from '@/lib/paper-content'
import type { PaperContentResponse, FetchContentOptions } from '@/lib/paper-content'

// Request validation schema - permissive to accept various paper formats
const RequestSchema = z.object({
  paper: z.object({
    id: z.string(),
    title: z.string(),
    url: z.string().optional(),
    abstract: z.string().optional(),
    authors: z.array(z.string()).optional(),
    doi: z.string().optional(),
    metadata: z.object({
      source: z.string(),
      sourceType: z.string().optional(),
      quality: z.number().optional(),
      publicationDate: z.string().optional(),
      citationCount: z.number().optional(),
      verificationStatus: z.string().optional(),
      accessType: z.string().optional(),
    }).passthrough(),
  }),
  options: z.object({
    parsePdf: z.boolean().optional(),
    includeReferences: z.boolean().optional(),
    includeFigures: z.boolean().optional(),
    timeout: z.number().optional(),
  }).optional(),
})

/**
 * Convert validated request paper to Source type with proper defaults
 */
function toSource(paper: z.infer<typeof RequestSchema>['paper']): Source {
  return {
    id: paper.id,
    title: paper.title,
    url: paper.url,
    abstract: paper.abstract,
    doi: paper.doi,
    authors: paper.authors || [],
    metadata: {
      source: paper.metadata.source as Source['metadata']['source'],
      sourceType: (paper.metadata.sourceType || 'academic-paper') as Source['metadata']['sourceType'],
      quality: paper.metadata.quality || 75,
      verificationStatus: (paper.metadata.verificationStatus || 'unverified') as Source['metadata']['verificationStatus'],
      accessType: (paper.metadata.accessType || 'open') as Source['metadata']['accessType'],
      publicationDate: paper.metadata.publicationDate,
      citationCount: paper.metadata.citationCount,
    },
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<PaperContentResponse>> {
  try {
    // Parse request body
    const body = await request.json()

    // Validate request
    const validationResult = RequestSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validationResult.error.message,
          },
        },
        { status: 400 }
      )
    }

    const { paper, options } = validationResult.data

    // Convert to properly typed Source
    const source = toSource(paper)

    // Log request
    console.log(`[api/papers/content] Fetching content for ${source.id} from ${source.metadata.source}`)

    // Fetch content
    const startTime = Date.now()
    const content = await fetchPaperContent(source, options as FetchContentOptions)
    const duration = Date.now() - startTime

    console.log(
      `[api/papers/content] Fetched ${paper.id}: ` +
      `availability=${content.availability}, ` +
      `sections=${content.sections?.length || 0}, ` +
      `duration=${duration}ms`
    )

    return NextResponse.json({
      success: true,
      content,
    })
  } catch (error) {
    console.error('[api/papers/content] Error:', error)

    const message = error instanceof Error ? error.message : 'Unknown error'
    const isTimeout = message.includes('timeout') || message.includes('abort')
    const isRateLimit = message.includes('rate limit') || message.includes('429')

    return NextResponse.json(
      {
        success: false,
        error: {
          code: isTimeout ? 'TIMEOUT' : isRateLimit ? 'RATE_LIMITED' : 'FETCH_ERROR',
          message,
        },
      },
      { status: isRateLimit ? 429 : isTimeout ? 504 : 500 }
    )
  }
}

/**
 * GET endpoint for simple queries
 *
 * GET /api/papers/content?source=arxiv&id=2401.12345
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url)

  const source = searchParams.get('source')
  const id = searchParams.get('id')
  const title = searchParams.get('title') || 'Unknown'
  const url = searchParams.get('url')

  if (!source || !id) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'MISSING_PARAMS',
          message: 'Both source and id parameters are required',
        },
      },
      { status: 400 }
    )
  }

  // Construct minimal paper object
  const paper: Source = {
    id,
    title,
    url: url || '',
    authors: [],
    metadata: {
      source: source as Source['metadata']['source'],
      sourceType: 'academic-paper',
      quality: 75,
      verificationStatus: 'unverified',
      accessType: 'open',
    },
  }

  try {
    const content = await fetchPaperContent(paper)

    return NextResponse.json({
      success: true,
      content,
    })
  } catch (error) {
    console.error('[api/papers/content] GET Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS endpoint for CORS
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
