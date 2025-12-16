/**
 * TEA PDF Generation API Route
 * Generates investor-ready PDF reports
 */

import { NextRequest, NextResponse } from 'next/server'
import { generateTEAPDF, type TEAReportData } from '@/lib/pdf-generator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/tea/generate-pdf
 * Generate PDF report from TEA data
 */
export async function POST(request: NextRequest) {
  try {
    const reportData = (await request.json()) as TEAReportData

    // Validate required fields
    if (!reportData.projectName || !reportData.technology) {
      return NextResponse.json(
        { error: 'Project name and technology are required' },
        { status: 400 }
      )
    }

    // Generate PDF
    const generator = generateTEAPDF(reportData)
    const pdfBlob = generator.getPDFBlob()

    // Convert blob to buffer for Next.js response
    const arrayBuffer = await pdfBlob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Return PDF as downloadable file
    const filename = `TEA_${reportData.projectName.replace(/\s+/g, '_')}_${Date.now()}.pdf`

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'PDF generation failed' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/tea/generate-pdf
 * Returns PDF generation configuration
 */
export async function GET() {
  return NextResponse.json({
    supportedFormats: ['pdf'],
    maxReportSize: 10 * 1024 * 1024, // 10MB
    features: [
      'Executive summary',
      'Key metrics visualization',
      'Cost breakdown analysis',
      'Cash flow projections',
      'AI-generated insights',
      'Professional formatting',
    ],
  })
}
