/**
 * TEA File Upload API Route
 * Handles file uploads for TEA analysis
 */

import { NextRequest, NextResponse } from 'next/server'
import { validateFile, processFile, type ExtractedData } from '@/lib/file-upload'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/tea/upload
 * Upload and process files for TEA analysis
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
    }

    const results: Array<{
      file: string
      success: boolean
      data?: ExtractedData
      error?: string
    }> = []

    for (const file of files) {
      try {
        // Validate file
        const validation = validateFile(file)
        if (!validation.valid) {
          results.push({
            file: file.name,
            success: false,
            error: validation.error,
          })
          continue
        }

        // Process file
        const extractedData = await processFile(file)
        results.push({
          file: file.name,
          success: true,
          data: extractedData,
        })
      } catch (error) {
        results.push({
          file: file.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    return NextResponse.json({
      message: `Processed ${results.length} file(s)`,
      results,
    })
  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/tea/upload
 * Returns upload configuration
 */
export async function GET() {
  return NextResponse.json({
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['pdf', 'xlsx', 'csv', 'docx', 'png', 'jpg', 'jpeg'],
    maxFiles: 5,
  })
}
