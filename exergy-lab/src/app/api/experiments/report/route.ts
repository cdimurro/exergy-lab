/**
 * Experiments Report API
 *
 * POST /api/experiments/report
 *
 * Generates a comprehensive PDF report for a validated experiment protocol.
 * Returns the report as a base64-encoded PDF.
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateExperimentPDF } from '@/lib/experiment-report-builder'
import type { ExperimentReportData, ExperimentReportConfig } from '@/types/experiment-report'

// ============================================================================
// Request/Response Types
// ============================================================================

interface ReportRequest {
  reportData: ExperimentReportData
  config?: Partial<ExperimentReportConfig>
  format?: 'pdf' | 'json'
  filename?: string
}

interface ReportResponse {
  success: boolean
  format: string
  filename: string
  data?: string // Base64 encoded PDF or raw JSON
  contentType?: string
  size?: number
  error?: string
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Generate a filename for the report
 */
function generateFilename(reportData: ExperimentReportData, format: string): string {
  const title = reportData.metadata.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)

  const date = new Date().toISOString().split('T')[0]
  return `exergy-experiment-${title}-${date}.${format}`
}

/**
 * Validate the report data structure
 */
function validateReportData(data: unknown): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Report data must be an object' }
  }

  const reportData = data as Record<string, unknown>

  if (!reportData.metadata) {
    return { valid: false, error: 'Missing metadata section' }
  }

  const metadata = reportData.metadata as Record<string, unknown>
  if (!metadata.title || typeof metadata.title !== 'string') {
    return { valid: false, error: 'Missing or invalid metadata.title' }
  }

  if (!metadata.domain || typeof metadata.domain !== 'string') {
    return { valid: false, error: 'Missing or invalid metadata.domain' }
  }

  if (!reportData.protocol) {
    return { valid: false, error: 'Missing protocol section' }
  }

  if (!reportData.validation) {
    return { valid: false, error: 'Missing validation section' }
  }

  return { valid: true }
}

// ============================================================================
// POST Handler
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ReportRequest
    const { reportData, config, format = 'pdf', filename } = body

    // Validate report data
    const validation = validateReportData(reportData)
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error,
        } as ReportResponse,
        { status: 400 }
      )
    }

    // Generate filename
    const outputFilename = filename || generateFilename(reportData, format)

    // Handle different formats
    if (format === 'json') {
      // Return raw JSON data
      const jsonData = JSON.stringify(reportData, null, 2)
      return NextResponse.json({
        success: true,
        format: 'json',
        filename: outputFilename,
        data: jsonData,
        contentType: 'application/json',
        size: jsonData.length,
      } as ReportResponse)
    }

    // Generate PDF
    const pdfBlob = await generateExperimentPDF(reportData, config)
    const arrayBuffer = await pdfBlob.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString('base64')

    return NextResponse.json({
      success: true,
      format: 'pdf',
      filename: outputFilename,
      data: base64Data,
      contentType: 'application/pdf',
      size: arrayBuffer.byteLength,
    } as ReportResponse)
  } catch (error) {
    console.error('[ExperimentReport] Error generating report:', error)

    return NextResponse.json(
      {
        success: false,
        format: 'pdf',
        filename: 'error.pdf',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      } as ReportResponse,
      { status: 500 }
    )
  }
}

// ============================================================================
// GET Handler - API Documentation
// ============================================================================

export async function GET() {
  return NextResponse.json({
    name: 'Experiment Report API',
    version: '1.0.0',
    description: 'Generate comprehensive PDF reports for validated experiment protocols',
    endpoints: {
      'POST /api/experiments/report': {
        description: 'Generate a PDF report',
        body: {
          reportData: {
            type: 'ExperimentReportData',
            required: true,
            description: 'The experiment data to include in the report',
          },
          config: {
            type: 'ExperimentReportConfig',
            required: false,
            description: 'Optional configuration for report generation',
          },
          format: {
            type: "'pdf' | 'json'",
            required: false,
            default: 'pdf',
            description: 'Output format',
          },
          filename: {
            type: 'string',
            required: false,
            description: 'Custom filename for the report',
          },
        },
        response: {
          success: 'boolean',
          format: 'string',
          filename: 'string',
          data: 'string (base64 encoded)',
          contentType: 'string',
          size: 'number (bytes)',
        },
      },
    },
    reportSections: [
      '1. Overview - Experiment goals and objectives',
      '2. Experimental Protocol - Materials, equipment, and procedure',
      '3. Safety Information - Hazards, PPE, handling requirements',
      '4. Validation Results - Literature alignment, equipment tier, cost breakdown',
      '5. Recommendations - Priority-ranked suggestions',
      '6. Conclusions - Summary findings',
      '7. Limitations - Known constraints',
      '8. References - Source citations',
    ],
  })
}
