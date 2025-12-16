/**
 * PDF Generator for Investor-Ready TEA Reports
 * Uses jsPDF and jsPDF-AutoTable for professional document generation
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface TEAReportData {
  // Project Information
  projectName: string
  technology: string
  generatedDate: string
  generatedBy?: string

  // Executive Summary
  executiveSummary: string

  // Key Metrics
  lcoe: number // Levelized Cost of Energy ($/kWh)
  npv: number // Net Present Value ($)
  irr: number // Internal Rate of Return (%)
  paybackPeriod: number // years
  roi: number // Return on Investment (%)

  // Cost Breakdown
  capitalCosts: {
    equipment: number
    installation: number
    infrastructure: number
    other: number
    total: number
  }
  operationalCosts: {
    maintenance: number
    labor: number
    materials: number
    utilities: number
    other: number
    annual: number
  }

  // Financial Projections
  cashFlow: Array<{
    year: number
    revenue: number
    expenses: number
    netCashFlow: number
    cumulativeCashFlow: number
  }>

  // Assumptions
  assumptions: {
    projectLifetime: number // years
    discountRate: number // percentage
    capacity: number
    capacityUnit: string
    annualProduction: number
    productionUnit: string
    [key: string]: string | number
  }

  // AI-Generated Insights
  aiInsights?: {
    marketAnalysis: string
    riskAssessment: string
    recommendations: string[]
    competitiveAdvantages: string[]
    potentialChallenges: string[]
  }

  // Charts (as data URLs from html2canvas)
  charts?: {
    cashFlowChart?: string // base64 image
    costBreakdownChart?: string // base64 image
  }
}

export class PDFGenerator {
  private doc: jsPDF
  private pageWidth: number
  private pageHeight: number
  private margin = 20
  private currentY = 20

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })
    this.pageWidth = this.doc.internal.pageSize.getWidth()
    this.pageHeight = this.doc.internal.pageSize.getHeight()
  }

  private addNewPage() {
    this.doc.addPage()
    this.currentY = this.margin
  }

  private checkPageBreak(spaceNeeded: number) {
    if (this.currentY + spaceNeeded > this.pageHeight - this.margin) {
      this.addNewPage()
    }
  }

  private addHeader(text: string, level: 1 | 2 | 3 = 1) {
    const sizes = { 1: 18, 2: 14, 3: 12 }
    const spacing = { 1: 10, 2: 8, 3: 6 }

    this.checkPageBreak(spacing[level] + 10)
    this.doc.setFontSize(sizes[level])
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(text, this.margin, this.currentY)
    this.currentY += spacing[level]
  }

  private addText(text: string, options: { fontSize?: number; maxWidth?: number } = {}) {
    const fontSize = options.fontSize || 10
    const maxWidth = options.maxWidth || this.pageWidth - 2 * this.margin

    this.doc.setFontSize(fontSize)
    this.doc.setFont('helvetica', 'normal')

    const lines = this.doc.splitTextToSize(text, maxWidth)
    const lineHeight = fontSize * 0.35

    for (const line of lines) {
      this.checkPageBreak(lineHeight + 2)
      this.doc.text(line, this.margin, this.currentY)
      this.currentY += lineHeight
    }
    this.currentY += 3 // Extra spacing after paragraph
  }

  private addMetricBox(label: string, value: string, x: number, y: number, width: number) {
    // Box background
    this.doc.setFillColor(240, 240, 240)
    this.doc.rect(x, y, width, 20, 'F')

    // Label
    this.doc.setFontSize(9)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(100, 100, 100)
    this.doc.text(label, x + 3, y + 6)

    // Value
    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(0, 0, 0)
    this.doc.text(value, x + 3, y + 15)
  }

  private formatCurrency(value: number): string {
    if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
    if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
    if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
    return `$${value.toFixed(2)}`
  }

  private addCoverPage(data: TEAReportData) {
    // Logo/Branding area
    this.doc.setFillColor(30, 58, 138) // Primary blue
    this.doc.rect(0, 0, this.pageWidth, 60, 'F')

    this.doc.setTextColor(255, 255, 255)
    this.doc.setFontSize(24)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Techno-Economic Analysis', this.margin, 30)

    this.doc.setFontSize(16)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text('Clean Energy Research Platform', this.margin, 45)

    // Reset text color
    this.doc.setTextColor(0, 0, 0)

    // Project Information
    this.currentY = 80
    this.doc.setFontSize(22)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(data.projectName, this.margin, this.currentY)

    this.currentY += 15
    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(`Technology: ${data.technology}`, this.margin, this.currentY)

    // Date
    this.currentY = this.pageHeight - 40
    this.doc.setFontSize(10)
    this.doc.setTextColor(100, 100, 100)
    this.doc.text(`Generated: ${data.generatedDate}`, this.margin, this.currentY)
    if (data.generatedBy) {
      this.doc.text(`By: ${data.generatedBy}`, this.margin, this.currentY + 5)
    }

    this.doc.setTextColor(0, 0, 0)
    this.addNewPage()
  }

  private addExecutiveSummary(summary: string) {
    this.addHeader('Executive Summary', 1)
    this.addText(summary)
    this.currentY += 5
  }

  private addKeyMetrics(data: TEAReportData) {
    this.addHeader('Key Financial Metrics', 1)
    this.currentY += 5

    const boxWidth = (this.pageWidth - 2 * this.margin - 10) / 3
    const startY = this.currentY

    // Row 1
    this.addMetricBox('LCOE', `$${data.lcoe.toFixed(3)}/kWh`, this.margin, startY, boxWidth)
    this.addMetricBox(
      'NPV',
      this.formatCurrency(data.npv),
      this.margin + boxWidth + 5,
      startY,
      boxWidth
    )
    this.addMetricBox(
      'IRR',
      `${data.irr.toFixed(1)}%`,
      this.margin + 2 * (boxWidth + 5),
      startY,
      boxWidth
    )

    // Row 2
    const row2Y = startY + 25
    this.addMetricBox(
      'Payback',
      `${data.paybackPeriod.toFixed(1)} yrs`,
      this.margin,
      row2Y,
      boxWidth
    )
    this.addMetricBox(
      'ROI',
      `${data.roi.toFixed(1)}%`,
      this.margin + boxWidth + 5,
      row2Y,
      boxWidth
    )

    this.currentY = row2Y + 30
  }

  private addCostBreakdown(data: TEAReportData) {
    this.addHeader('Cost Breakdown', 1)

    // Capital Costs Table
    this.addHeader('Capital Costs (CAPEX)', 2)
    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Category', 'Amount']],
      body: [
        ['Equipment', this.formatCurrency(data.capitalCosts.equipment)],
        ['Installation', this.formatCurrency(data.capitalCosts.installation)],
        ['Infrastructure', this.formatCurrency(data.capitalCosts.infrastructure)],
        ['Other', this.formatCurrency(data.capitalCosts.other)],
        ['Total CAPEX', this.formatCurrency(data.capitalCosts.total)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 138] },
      margin: { left: this.margin, right: this.margin },
    })
    this.currentY = (this.doc as any).lastAutoTable.finalY + 10

    // Operational Costs Table
    this.addHeader('Operational Costs (OPEX)', 2)
    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Category', 'Annual Amount']],
      body: [
        ['Maintenance', this.formatCurrency(data.operationalCosts.maintenance)],
        ['Labor', this.formatCurrency(data.operationalCosts.labor)],
        ['Materials', this.formatCurrency(data.operationalCosts.materials)],
        ['Utilities', this.formatCurrency(data.operationalCosts.utilities)],
        ['Other', this.formatCurrency(data.operationalCosts.other)],
        ['Total Annual OPEX', this.formatCurrency(data.operationalCosts.annual)],
      ],
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 138] },
      margin: { left: this.margin, right: this.margin },
    })
    this.currentY = (this.doc as any).lastAutoTable.finalY + 10
  }

  private addCashFlowProjections(data: TEAReportData) {
    this.checkPageBreak(50)
    this.addHeader('Cash Flow Projections', 1)

    const tableData = data.cashFlow.map((cf) => [
      cf.year.toString(),
      this.formatCurrency(cf.revenue),
      this.formatCurrency(cf.expenses),
      this.formatCurrency(cf.netCashFlow),
      this.formatCurrency(cf.cumulativeCashFlow),
    ])

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Year', 'Revenue', 'Expenses', 'Net Cash Flow', 'Cumulative']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 138] },
      margin: { left: this.margin, right: this.margin },
      styles: { fontSize: 8 },
    })
    this.currentY = (this.doc as any).lastAutoTable.finalY + 10
  }

  private addAssumptions(assumptions: TEAReportData['assumptions']) {
    this.checkPageBreak(50)
    this.addHeader('Assumptions & Methodology', 1)

    const tableData = Object.entries(assumptions).map(([key, value]) => [
      key
        .split(/(?=[A-Z])/)
        .join(' ')
        .replace(/^\w/, (c) => c.toUpperCase()),
      typeof value === 'number' ? value.toLocaleString() : value,
    ])

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Parameter', 'Value']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 138] },
      margin: { left: this.margin, right: this.margin },
    })
    this.currentY = (this.doc as any).lastAutoTable.finalY + 10
  }

  private addAIInsights(insights: NonNullable<TEAReportData['aiInsights']>) {
    this.checkPageBreak(50)
    this.addHeader('AI-Generated Insights', 1)

    this.addHeader('Market Analysis', 2)
    this.addText(insights.marketAnalysis)

    this.addHeader('Risk Assessment', 2)
    this.addText(insights.riskAssessment)

    this.addHeader('Recommendations', 2)
    insights.recommendations.forEach((rec, i) => {
      this.addText(`${i + 1}. ${rec}`)
    })

    this.addHeader('Competitive Advantages', 2)
    insights.competitiveAdvantages.forEach((adv, i) => {
      this.addText(`${i + 1}. ${adv}`)
    })

    this.addHeader('Potential Challenges', 2)
    insights.potentialChallenges.forEach((challenge, i) => {
      this.addText(`${i + 1}. ${challenge}`)
    })
  }

  private addCharts(charts: NonNullable<TEAReportData['charts']>) {
    if (charts.cashFlowChart) {
      this.checkPageBreak(100)
      this.addHeader('Cash Flow Visualization', 2)
      this.doc.addImage(charts.cashFlowChart, 'PNG', this.margin, this.currentY, 170, 80)
      this.currentY += 85
    }

    if (charts.costBreakdownChart) {
      this.checkPageBreak(100)
      this.addHeader('Cost Breakdown Visualization', 2)
      this.doc.addImage(charts.costBreakdownChart, 'PNG', this.margin, this.currentY, 170, 80)
      this.currentY += 85
    }
  }

  public generateTEAReport(data: TEAReportData): jsPDF {
    this.addCoverPage(data)
    this.addExecutiveSummary(data.executiveSummary)
    this.addKeyMetrics(data)
    this.addCostBreakdown(data)
    this.addCashFlowProjections(data)

    if (data.charts) {
      this.addCharts(data.charts)
    }

    this.addAssumptions(data.assumptions)

    if (data.aiInsights) {
      this.addAIInsights(data.aiInsights)
    }

    // Add page numbers
    const pageCount = this.doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i)
      this.doc.setFontSize(8)
      this.doc.setTextColor(150, 150, 150)
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth / 2,
        this.pageHeight - 10,
        { align: 'center' }
      )
    }

    return this.doc
  }

  public downloadPDF(filename: string = 'tea-report.pdf') {
    this.doc.save(filename)
  }

  public getPDFBlob(): Blob {
    return this.doc.output('blob')
  }

  public getPDFDataURL(): string {
    return this.doc.output('dataurlstring')
  }
}

// Utility function for easy use
export function generateTEAPDF(data: TEAReportData): PDFGenerator {
  const generator = new PDFGenerator()
  generator.generateTEAReport(data)
  return generator
}
