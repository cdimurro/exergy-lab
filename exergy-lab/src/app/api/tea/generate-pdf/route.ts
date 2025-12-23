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
    const data = await request.json()

    console.log('[PDF Generation] Received data:', {
      hasProjectName: !!data.projectName,
      hasTechnology: !!data.technology,
      hasInput: !!data.input,
      hasResults: !!data.results
    })

    // Handle both field name formats (snake_case and camelCase)
    const projectName = data.projectName || data.input?.project_name || 'Unnamed Project'
    const technology = data.technology || data.input?.technology_type || 'generic'

    // Validate required fields
    if (!projectName || !technology) {
      console.error('[PDF Generation] Missing required fields:', { projectName, technology })
      return NextResponse.json(
        { error: 'Project name and technology are required', received: data },
        { status: 400 }
      )
    }

    // Extract results (handle both nested and flat structures)
    const results = data.results || {}

    // Build report data matching TEAReportData interface
    const reportData: TEAReportData = {
      projectName,
      technology,
      generatedDate: new Date().toISOString(),
      generatedBy: 'Exergy Lab TEA System v0.0.3.1',
      location: data.input?.location || data.location,
      projectDescription: data.input?.project_description || data.description,

      // Executive Summary
      executiveSummary: data.input?.project_description || data.description || 'No description provided',

      // Key Metrics (flatten from results)
      lcoe: results.lcoe || 0,
      npv: results.npv || 0,
      irr: results.irr || 0,
      paybackPeriod: results.payback_years || 0,
      roi: results.extendedMetrics?.roi || 0,

      // Cost Breakdown
      capitalCosts: {
        equipment: results.capex_breakdown?.equipment || 0,
        installation: results.capex_breakdown?.installation || 0,
        infrastructure: (results.capex_breakdown?.land || 0) + (results.capex_breakdown?.grid_connection || 0),
        other: 0,
        total: results.total_capex || 0,
      },

      operationalCosts: {
        maintenance: results.opex_breakdown?.capacity_based || 0,
        labor: results.opex_breakdown?.fixed || 0,
        materials: results.opex_breakdown?.variable || 0,
        utilities: 0,
        other: results.opex_breakdown?.insurance || 0,
        annual: results.annual_opex || 0,
      },

      // Cash Flow (transform if available)
      cashFlow: (results.cash_flows || []).map((cf: any) => ({
        year: cf.year,
        revenue: results.annual_revenue || 0,
        expenses: results.annual_opex || 0,
        netCashFlow: cf.cashFlow || 0,
        cumulativeCashFlow: cf.cumulativeCashFlow || 0,
      })),

      // Assumptions
      assumptions: {
        projectLifetime: data.input?.project_lifetime_years || 25,
        discountRate: data.input?.discount_rate || 8,
        capacity: data.input?.capacity_mw || 0,
        capacityUnit: 'MW',
        annualProduction: results.annual_production_mwh || 0,
        productionUnit: 'MWh',
      },

      // AI Insights (if available)
      aiInsights: data.insights,
    } as TEAReportData

    console.log('[PDF Generation] Generating PDF for:', {
      projectName,
      technology,
      lcoe: reportData.lcoe,
      npv: reportData.npv
    })

    // Generate PDF
    const generator = generateTEAPDF(reportData)
    const pdfBlob = generator.getPDFBlob()

    // Convert blob to buffer for Next.js response
    const arrayBuffer = await pdfBlob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Return PDF as downloadable file
    const filename = `TEA_${projectName.replace(/\s+/g, '_')}_${Date.now()}.pdf`

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
