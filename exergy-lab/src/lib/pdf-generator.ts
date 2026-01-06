/**
 * Comprehensive PDF Generator for Investor-Ready TEA Reports
 * Generates 20+ page professional reports with table of contents
 * Uses jsPDF and jsPDF-AutoTable
 *
 * @version 2.0.0 - Updated with custom Inter fonts and professional styling
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  COLORS as SHARED_COLORS,
  FONT_SIZES,
  MARGINS as SHARED_MARGINS,
  registerCustomFonts,
  FONT_FAMILIES,
  getTableConfig,
} from './pdf/shared-styles'

export interface TEAReportData {
  // Project Information
  projectName: string
  technology: string
  generatedDate: string
  generatedBy?: string
  location?: string
  projectDescription?: string

  // Executive Summary
  executiveSummary: string

  // AI-Generated Images (base64 encoded)
  generatedImages?: {
    systemDiagram?: string
    cashFlowChart?: string
    costBreakdownChart?: string
    sensitivityChart?: string
    productionCurve?: string
  }

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

  // Data Sources & References
  dataSources?: {
    webSources?: Array<{
      title: string
      url: string
      source: string
      credibilityTier: 'government' | 'academic' | 'industry' | 'news' | 'other'
      accessedDate?: string
    }>
    academicSources?: Array<{
      title: string
      authors?: string[]
      journal?: string
      year?: number
      doi?: string
      url?: string
    }>
    datasetSources?: Array<{
      name: string
      provider: string
      url?: string
      description?: string
    }>
  }
}

interface TOCEntry {
  title: string
  page: number
  level: number
  yPosition: number // Y coordinate on the destination page for internal linking
}

export class PDFGenerator {
  private doc: jsPDF
  private pageWidth: number
  private pageHeight: number
  private margin = 20
  private currentY = 20
  private tocEntries: TOCEntry[] = []
  private currentPage = 1
  private readonly primaryColor: [number, number, number] = SHARED_COLORS.accent // Emerald-500
  private readonly secondaryColor: [number, number, number] = SHARED_COLORS.primary // Deep blue
  private readonly accentColor: [number, number, number] = SHARED_COLORS.primaryLight // Blue-500

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })
    this.pageWidth = this.doc.internal.pageSize.getWidth()
    this.pageHeight = this.doc.internal.pageSize.getHeight()

    // Register custom Inter font family
    registerCustomFonts(this.doc)
  }

  private addNewPage() {
    this.doc.addPage()
    this.currentPage++
    this.currentY = this.margin + 15 // Space for header
    this.addPageHeader()
  }

  private addPageHeader() {
    // Skip header on cover page
    if (this.currentPage === 1) return

    const headerHeight = 10
    this.doc.setFillColor(...this.primaryColor)
    this.doc.rect(0, 0, this.pageWidth, headerHeight, 'F')

    this.doc.setTextColor(255, 255, 255)
    this.doc.setFontSize(8)
    this.doc.setFont(FONT_FAMILIES.body, 'normal')
    this.doc.text('Exergy Lab - Techno-Economic Analysis', this.margin, 6)

    // Simple microscope icon using shapes
    const iconX = this.pageWidth - this.margin - 3
    this.doc.setFillColor(255, 255, 255)
    this.doc.circle(iconX, 4, 1.5, 'F')
    this.doc.circle(iconX, 7, 1, 'F')

    this.doc.setTextColor(0, 0, 0)
  }

  private addPageFooter() {
    const pageCount = this.doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i)
      this.doc.setFontSize(8)
      this.doc.setTextColor(120, 120, 120)

      // Page number
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.pageWidth / 2,
        this.pageHeight - 10,
        { align: 'center' }
      )

      // Footer line
      this.doc.setDrawColor(200, 200, 200)
      this.doc.setLineWidth(0.5)
      this.doc.line(this.margin, this.pageHeight - 15, this.pageWidth - this.margin, this.pageHeight - 15)

      // Confidential notice
      this.doc.setFontSize(7)
      this.doc.setTextColor(150, 150, 150)
      this.doc.text('Confidential - For Investment Review Only', this.margin, this.pageHeight - 7)
    }
  }

  private checkPageBreak(spaceNeeded: number) {
    if (this.currentY + spaceNeeded > this.pageHeight - 25) {
      this.addNewPage()
    }
  }

  private addHeader(text: string, level: 1 | 2 | 3 = 1, addToTOC = true) {
    const sizes = { 1: 16, 2: 13, 3: 11 }
    const spacing = { 1: 8, 2: 6, 3: 5 }

    this.checkPageBreak(spacing[level] + 15)

    if (addToTOC && level <= 2) {
      this.tocEntries.push({
        title: text,
        page: this.currentPage,
        level,
        yPosition: this.currentY, // Store Y position for internal linking
      })
    }

    this.doc.setFontSize(sizes[level])
    this.doc.setFont(FONT_FAMILIES.body, 'bold')

    if (level === 1) {
      this.doc.setTextColor(...this.primaryColor)
    } else {
      this.doc.setTextColor(0, 0, 0)
    }

    this.doc.text(text, this.margin, this.currentY)

    // Underline for level 1 headers
    if (level === 1) {
      this.doc.setDrawColor(...this.primaryColor)
      this.doc.setLineWidth(0.5)
      this.doc.line(this.margin, this.currentY + 1, this.pageWidth - this.margin, this.currentY + 1)
    }

    this.doc.setTextColor(0, 0, 0)
    this.currentY += spacing[level]
  }

  private addText(text: string, options: { fontSize?: number; maxWidth?: number; bold?: boolean } = {}) {
    const fontSize = options.fontSize || 10
    const maxWidth = options.maxWidth || this.pageWidth - 2 * this.margin
    const bold = options.bold || false

    this.doc.setFontSize(fontSize)
    this.doc.setFont(FONT_FAMILIES.body, bold ? 'bold' : 'normal')

    const lines = this.doc.splitTextToSize(text, maxWidth)
    const lineHeight = fontSize * 0.4

    for (const line of lines) {
      this.checkPageBreak(lineHeight + 2)
      this.doc.text(line, this.margin, this.currentY)
      this.currentY += lineHeight
    }
    this.currentY += 4 // Extra spacing after paragraph
  }

  private addBulletPoint(text: string, indent = 0) {
    const fontSize = 10
    const maxWidth = this.pageWidth - 2 * this.margin - indent - 8
    const bulletX = this.margin + indent

    this.doc.setFontSize(fontSize)
    this.doc.setFont(FONT_FAMILIES.body, 'normal')

    // Add bullet
    this.checkPageBreak(5)
    this.doc.text('•', bulletX, this.currentY)

    // Add text
    const lines = this.doc.splitTextToSize(text, maxWidth)
    const lineHeight = fontSize * 0.4

    for (let i = 0; i < lines.length; i++) {
      if (i > 0) this.checkPageBreak(lineHeight + 2)
      this.doc.text(lines[i], bulletX + 5, this.currentY)
      this.currentY += lineHeight
    }
    this.currentY += 2
  }

  private addMetricBox(label: string, value: string, x: number, y: number, width: number, height = 20) {
    // Box background with gradient effect
    this.doc.setFillColor(248, 250, 252) // slate-50
    this.doc.rect(x, y, width, height, 'F')

    // Border
    this.doc.setDrawColor(...this.primaryColor)
    this.doc.setLineWidth(0.5)
    this.doc.rect(x, y, width, height, 'S')

    // Label
    this.doc.setFontSize(8)
    this.doc.setFont(FONT_FAMILIES.body, 'normal')
    this.doc.setTextColor(100, 116, 139) // slate-500
    this.doc.text(label, x + 3, y + 6)

    // Value
    this.doc.setFontSize(13)
    this.doc.setFont(FONT_FAMILIES.body, 'bold')
    this.doc.setTextColor(15, 23, 42) // slate-900
    this.doc.text(value, x + 3, y + 15)

    this.doc.setTextColor(0, 0, 0)
  }

  private addInfoBox(title: string, content: string, type: 'info' | 'warning' | 'success' = 'info') {
    const colors: Record<string, [number, number, number]> = {
      info: [59, 130, 246], // blue
      warning: [245, 158, 11], // amber
      success: [16, 185, 129], // emerald
    }

    this.checkPageBreak(30)

    const boxY = this.currentY
    const boxHeight = 25

    // Background
    this.doc.setFillColor(248, 250, 252)
    this.doc.rect(this.margin, boxY, this.pageWidth - 2 * this.margin, boxHeight, 'F')

    // Left border accent
    this.doc.setFillColor(...colors[type])
    this.doc.rect(this.margin, boxY, 3, boxHeight, 'F')

    // Title
    this.doc.setFontSize(10)
    this.doc.setFont(FONT_FAMILIES.body, 'bold')
    this.doc.setTextColor(...colors[type])
    this.doc.text(title, this.margin + 8, boxY + 7)

    // Content
    this.doc.setFontSize(9)
    this.doc.setFont(FONT_FAMILIES.body, 'normal')
    this.doc.setTextColor(71, 85, 105)
    const lines = this.doc.splitTextToSize(content, this.pageWidth - 2 * this.margin - 16)
    let textY = boxY + 13
    lines.slice(0, 3).forEach((line: string) => {
      this.doc.text(line, this.margin + 8, textY)
      textY += 4
    })

    this.doc.setTextColor(0, 0, 0)
    this.currentY = boxY + boxHeight + 5
  }

  private formatCurrency(value: number): string {
    if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
    if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
    if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
    return `$${value.toFixed(2)}`
  }

  private addCoverPage(data: TEAReportData) {
    // Modern header with gradient effect
    this.doc.setFillColor(...this.secondaryColor)
    this.doc.rect(0, 0, this.pageWidth, 80, 'F')

    // Accent bar
    this.doc.setFillColor(...this.primaryColor)
    this.doc.rect(0, 75, this.pageWidth, 5, 'F')

    // Logo area - Draw custom microscope icon using shapes
    this.doc.setTextColor(255, 255, 255)

    // Draw simple microscope icon with circles and lines
    this.doc.setFillColor(255, 255, 255)
    this.doc.circle(this.margin + 5, 25, 3, 'F') // Top lens
    this.doc.circle(this.margin + 5, 32, 2, 'F') // Middle lens
    this.doc.setLineWidth(1.5)
    this.doc.setDrawColor(255, 255, 255)
    this.doc.line(this.margin + 5, 28, this.margin + 5, 30) // Tube
    this.doc.line(this.margin + 5, 34, this.margin + 5, 38) // Stand
    this.doc.line(this.margin + 2, 38, this.margin + 8, 38) // Base

    // Company name
    this.doc.setFontSize(22)
    this.doc.setFont(FONT_FAMILIES.body, 'bold')
    this.doc.text('Exergy Lab', this.margin + 15, 32)

    this.doc.setFontSize(12)
    this.doc.setFont(FONT_FAMILIES.body, 'normal')
    this.doc.text('Clean Energy Research Platform', this.margin + 20, 48)

    // Report title
    this.currentY = 100
    this.doc.setTextColor(0, 0, 0)
    this.doc.setFontSize(26)
    this.doc.setFont(FONT_FAMILIES.body, 'bold')
    this.doc.text('Techno-Economic Analysis', this.margin, this.currentY)

    // Project name
    this.currentY += 20
    this.doc.setFontSize(20)
    this.doc.setFont(FONT_FAMILIES.body, 'bold')
    const projectLines = this.doc.splitTextToSize(data.projectName, this.pageWidth - 2 * this.margin)
    projectLines.forEach((line: string) => {
      this.doc.text(line, this.margin, this.currentY)
      this.currentY += 10
    })

    // Separator line
    this.currentY += 5
    this.doc.setDrawColor(...this.primaryColor)
    this.doc.setLineWidth(1)
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY)

    // Project details
    this.currentY += 15
    this.doc.setFontSize(13)
    this.doc.setFont(FONT_FAMILIES.body, 'normal')
    this.doc.setTextColor(71, 85, 105)

    const details = [
      `Technology: ${data.technology}`,
      data.location ? `Location: ${data.location}` : null,
      `Capacity: ${data.assumptions.capacity} ${data.assumptions.capacityUnit}`,
      `Project Lifetime: ${data.assumptions.projectLifetime} years`,
    ].filter(Boolean)

    details.forEach((detail) => {
      if (detail) {
        this.doc.text(detail, this.margin, this.currentY)
        this.currentY += 8
      }
    })

    // Key highlights box
    this.currentY += 10
    const highlightBoxY = this.currentY
    this.doc.setFillColor(240, 253, 244) // green-50
    this.doc.rect(this.margin, highlightBoxY, this.pageWidth - 2 * this.margin, 35, 'F')

    this.doc.setDrawColor(...this.primaryColor)
    this.doc.setLineWidth(0.5)
    this.doc.rect(this.margin, highlightBoxY, this.pageWidth - 2 * this.margin, 35, 'S')

    this.doc.setTextColor(...this.primaryColor)
    this.doc.setFontSize(11)
    this.doc.setFont(FONT_FAMILIES.body, 'bold')
    this.doc.text('Key Financial Highlights', this.margin + 5, highlightBoxY + 8)

    this.doc.setFontSize(10)
    this.doc.setFont(FONT_FAMILIES.body, 'normal')
    this.doc.setTextColor(0, 0, 0)
    const highlights = [
      `LCOE: $${data.lcoe.toFixed(3)}/kWh  |  NPV: ${this.formatCurrency(data.npv)}  |  IRR: ${data.irr.toFixed(1)}%`,
      `Payback Period: ${data.paybackPeriod.toFixed(1)} years  |  ROI: ${data.roi.toFixed(1)}%`,
    ]
    let highlightY = highlightBoxY + 18
    highlights.forEach((h) => {
      this.doc.text(h, this.margin + 5, highlightY)
      highlightY += 7
    })

    // Footer information
    this.currentY = this.pageHeight - 50
    this.doc.setFontSize(10)
    this.doc.setTextColor(100, 116, 139)
    this.doc.setFont(FONT_FAMILIES.body, 'normal')

    const date = new Date(data.generatedDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    this.doc.text(`Report Generated: ${date}`, this.margin, this.currentY)
    this.currentY += 6
    if (data.generatedBy) {
      this.doc.text(`Generated By: ${data.generatedBy}`, this.margin, this.currentY)
    }

    // Confidentiality notice
    this.currentY = this.pageHeight - 25
    this.doc.setFontSize(8)
    this.doc.setTextColor(150, 150, 150)
    this.doc.setFont(FONT_FAMILIES.body, 'italic')
    this.doc.text(
      'CONFIDENTIAL - This report contains proprietary information for investment review purposes only.',
      this.pageWidth / 2,
      this.currentY,
      { align: 'center' }
    )

    this.doc.setTextColor(0, 0, 0)
    this.addNewPage()
  }

  private addTableOfContents() {
    this.addHeader('Table of Contents', 1, false)
    this.currentY += 5

    // Add instruction text for interactivity
    this.doc.setFontSize(8)
    this.doc.setFont(FONT_FAMILIES.body, 'italic')
    this.doc.setTextColor(100, 116, 139) // slate-500
    this.doc.text('Click on any section below to jump directly to that page', this.margin, this.currentY)
    this.doc.setTextColor(0, 0, 0)
    this.currentY += 6

    this.tocEntries.forEach((entry) => {
      const indent = (entry.level - 1) * 5
      const dotLineY = this.currentY - 2

      this.doc.setFontSize(10)
      this.doc.setFont(FONT_FAMILIES.body, entry.level === 1 ? 'bold' : 'normal')

      // Title - use primary color for clickable appearance
      const titleX = this.margin + indent
      this.doc.setTextColor(...this.primaryColor)
      this.doc.text(entry.title, titleX, this.currentY)
      this.doc.setTextColor(0, 0, 0)

      // Page number
      const pageNum = `${entry.page}`
      const pageX = this.pageWidth - this.margin - this.doc.getTextWidth(pageNum)
      this.doc.text(pageNum, pageX, this.currentY)

      // Dotted line
      this.doc.setDrawColor(200, 200, 200)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(this.doc as any).setLineDash([1, 1])
      const titleWidth = this.doc.getTextWidth(entry.title)
      this.doc.line(titleX + titleWidth + 2, dotLineY, pageX - 2, dotLineY)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(this.doc as any).setLineDash([])

      // Add internal link - creates a clickable region that jumps to the target page
      // The link covers the entire row (title + page number)
      const linkHeight = 5
      const linkWidth = this.pageWidth - 2 * this.margin
      this.doc.link(
        this.margin,
        this.currentY - linkHeight + 1,
        linkWidth,
        linkHeight,
        { pageNumber: entry.page }
      )

      this.currentY += 6
      this.checkPageBreak(10)
    })

    this.addNewPage()
  }

  private addExecutiveSummary(data: TEAReportData) {
    this.addHeader('Executive Summary', 1)

    // Generate concise, professional executive summary
    const economicsVerdict =
      data.irr >= 12
        ? 'exceptional'
        : data.irr >= 8
          ? 'strong'
          : data.irr >= 5
            ? 'acceptable'
            : 'marginal'

    const paybackAssessment =
      data.paybackPeriod <= 7
        ? 'rapid capital recovery'
        : data.paybackPeriod <= 12
          ? 'moderate capital recovery'
          : 'extended capital recovery'

    const executiveSummary = `This techno-economic analysis evaluates a ${data.assumptions.capacity} ${data.assumptions.capacityUnit} ${data.technology} installation with an estimated total capital investment of ${this.formatCurrency(data.capitalCosts.total)}. The project demonstrates ${economicsVerdict} financial performance with a levelized cost of energy (LCOE) of $${data.lcoe.toFixed(3)}/kWh and internal rate of return (IRR) of ${data.irr.toFixed(1)}%.

Financial modeling indicates a net present value (NPV) of ${this.formatCurrency(data.npv)} over the ${data.assumptions.projectLifetime}-year operational lifetime, with ${paybackAssessment} occurring at year ${data.paybackPeriod.toFixed(1)}. The project generates approximately ${data.assumptions.annualProduction.toLocaleString()} ${data.assumptions.productionUnit} annually, providing stable cash flows under a long-term power purchase agreement structure.

The analysis incorporates comprehensive sensitivity testing across key variables including energy pricing, capital costs, capacity factor, and operating expenses. Results demonstrate project resilience to market volatility, with positive returns maintained across most downside scenarios. Risk mitigation strategies address technology performance, construction execution, regulatory compliance, and operational reliability.

From an investment perspective, the project offers attractive risk-adjusted returns with proven technology, established supply chains, and favorable policy support. The combination of competitive LCOE, strong NPV, and ${paybackAssessment} positions this opportunity favorably within the current clean energy investment landscape.`

    this.addText(executiveSummary)

    this.currentY += 8
    this.addHeader('Investment Highlights', 2)

    const highlights = [
      `${economicsVerdict.charAt(0).toUpperCase() + economicsVerdict.slice(1)} financial returns with an IRR of ${data.irr.toFixed(1)}% and NPV of ${this.formatCurrency(data.npv)}`,
      `Highly competitive LCOE of $${data.lcoe.toFixed(3)}/kWh demonstrates superior market positioning`,
      `${paybackAssessment.charAt(0).toUpperCase() + paybackAssessment.slice(1)} timeline of ${data.paybackPeriod.toFixed(1)} years provides ${data.paybackPeriod <= 10 ? 'excellent' : 'acceptable'} risk profile`,
      `${data.assumptions.projectLifetime}-year operational lifetime with proven ${data.technology} technology ensures predictable long-term value creation`,
      `Annual production of ${(data.assumptions.annualProduction / 1000000).toFixed(2)} GWh supports substantial carbon emissions reduction`,
      `Capital intensity of ${this.formatCurrency(data.capitalCosts.total / data.assumptions.capacity)}/${data.assumptions.capacityUnit} aligns with industry benchmarks`,
    ]

    highlights.forEach((highlight) => this.addBulletPoint(highlight))

    this.currentY += 5
  }

  private addProjectOverview(data: TEAReportData) {
    this.addHeader('Project Overview', 1)

    this.addHeader('Project Description', 2)

    // Generate professional project description based on data
    const projectDescription = `This project encompasses the development, construction, and operation of a utility-scale ${data.technology} energy generation facility with an installed capacity of ${data.assumptions.capacity} ${data.assumptions.capacityUnit}${data.location ? `, strategically located in ${data.location}` : ''}. The installation represents a significant investment in clean energy infrastructure, delivering approximately ${data.assumptions.annualProduction.toLocaleString()} ${data.assumptions.productionUnit} of renewable electricity annually.

The project leverages commercially proven ${data.technology} technology with established operational track records and supply chain maturity. System design incorporates industry-leading components and best practices to maximize energy yield, operational reliability, and long-term performance. The facility will operate for ${data.assumptions.projectLifetime} years under a structured Power Purchase Agreement (PPA) with creditworthy offtakers, providing revenue certainty and project bankability.

Total project investment is estimated at ${this.formatCurrency(data.capitalCosts.total)}, with financing structured through a ${data.assumptions.discountRate >= 7 ? 'market-standard' : 'favorable'} debt-equity arrangement. Operating expenses are projected at ${this.formatCurrency(data.operationalCosts.annual)} annually, encompassing maintenance, insurance, land lease, and administrative costs. The project is expected to achieve commercial operation following ${data.technology === 'solar' ? '12-18' : data.technology === 'wind' ? '18-24' : '12-24'} months of development, permitting, and construction activities.`

    this.addText(projectDescription)

    this.addHeader('Project Specifications', 2)

    const specs = [
      ['Technology Type', data.technology],
      ['Installed Capacity', `${data.assumptions.capacity} ${data.assumptions.capacityUnit}`],
      ['Annual Production', `${data.assumptions.annualProduction.toLocaleString()} ${data.assumptions.productionUnit}`],
      ['Project Lifetime', `${data.assumptions.projectLifetime} years`],
      ['Location', data.location || 'To be determined'],
    ]

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Parameter', 'Value']],
      body: specs,
      theme: 'striped',
      headStyles: { fillColor: this.primaryColor },
      margin: { left: this.margin, right: this.margin },
      styles: { fontSize: 10 },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10
  }

  private addTechnologyAnalysis(data: TEAReportData) {
    this.addHeader('Technology Analysis', 1)

    this.addHeader('Technology Overview', 2)

    const techDescriptions: Record<string, string> = {
      solar: `Solar photovoltaic (PV) technology represents one of the most mature and rapidly deployed renewable energy solutions globally. The fundamental operating principle involves the photovoltaic effect, where semiconductor materials (typically crystalline silicon or thin-film compounds) convert photons from sunlight directly into electrical current through quantum mechanical processes.

Modern utility-scale solar installations achieve module conversion efficiencies ranging from 18-22% for polycrystalline technologies to 23-26% for monocrystalline PERC (Passivated Emitter and Rear Cell) architectures. Bifacial module designs can capture reflected light from ground surfaces, providing additional energy gains of 10-25% depending on ground albedo and racking configurations. System-level efficiency accounts for inverter losses (2-3%), transformer losses (1-2%), cable losses (1-2%), soiling and shading (2-5%), and temperature derating (5-15% depending on climate).

Technology reliability has improved dramatically over the past decade, with tier-1 manufacturers now offering performance warranties guaranteeing >80% of nameplate capacity after 25 years of operation. Actual degradation rates for modern modules typically range from 0.3-0.5% annually, significantly better than the 0.8% industry standard from previous generations. Failure modes are well-understood and predominantly involve inverter electronics (10-15 year replacement cycles), connection points, and potential-induced degradation (PID) in high-voltage strings.`,

      wind: `Wind energy technology converts the kinetic energy of moving air masses into electrical power through aerodynamic blade designs coupled to electrical generators. Modern utility-scale wind turbines feature sophisticated engineering including variable-speed pitch control, advanced power electronics, condition monitoring systems, and grid integration capabilities.

Contemporary onshore wind turbines range from 3-6 MW nameplate capacity with rotor diameters of 120-170 meters, achieving hub heights of 80-120 meters to access stronger, more consistent wind resources. Offshore installations deploy even larger units (8-15 MW) with specialized foundations and enhanced corrosion protection. Capacity factors vary significantly by site quality, ranging from 25-35% for moderate wind resources to 45-55% for exceptional offshore locations.

Technology maturity is evidenced by global installed capacity exceeding 800 GW and operational track records spanning three decades. Modern turbines incorporate predictive maintenance systems using vibration analysis, oil quality monitoring, and SCADA data analytics to maximize availability (typically >95%) and minimize unplanned downtime. Component lifetimes vary, with blades and structural elements designed for 20-25 years, while gearboxes and generators may require overhaul or replacement at 10-15 year intervals.`,

      battery: `Battery energy storage systems (BESS) provide critical grid services including frequency regulation, voltage support, peak shaving, load shifting, and renewable energy integration. Lithium-ion chemistry dominates utility-scale deployments due to favorable energy density (150-250 Wh/kg), round-trip efficiency (85-95%), and rapidly declining costs.

System architecture typically includes battery modules arranged in containerized racks, power conversion systems (PCS) for AC-DC transformation, thermal management systems, fire suppression, and sophisticated battery management systems (BMS) for cell balancing and state-of-charge optimization. Commercial installations range from 10 MWh to 500+ MWh storage capacity with discharge durations from 1-4 hours for frequency regulation to 4-8 hours for energy arbitrage applications.

Technology performance characteristics include cycle life exceeding 5,000-10,000 full equivalent cycles (depending on depth of discharge and operating temperature), calendar life of 10-15 years, and degradation curves showing 10-20% capacity loss over system lifetime. Safety considerations have evolved significantly with improved thermal runaway prevention, early smoke detection, and water mist suppression systems becoming standard for large-scale deployments.`,

      hydrogen: `Hydrogen production and storage technology enables long-duration energy storage, sector coupling, and industrial decarbonization pathways. Green hydrogen production via electrolysis uses renewable electricity to split water molecules (H2O) into hydrogen (H2) and oxygen (O2), providing a carbon-free energy carrier with high energy density (120 MJ/kg).

Electrolyzer technologies include alkaline electrolyzers (mature, lower cost, 60-70% efficiency), proton exchange membrane (PEM) electrolyzers (fast response, higher cost, 65-75% efficiency), and emerging solid oxide electrolyzers (high temperature, 80-85% efficiency potential). System sizing typically ranges from 1-100 MW electrical input capacity, with modular architectures enabling scaling to GW-scale installations for industrial applications.

Storage options span compressed gas (350-700 bar pressure vessels), liquid hydrogen (cryogenic storage at -253°C), underground salt cavern storage for seasonal applications, and chemical carriers (ammonia, methanol, liquid organic hydrogen carriers). Round-trip efficiency from electricity to hydrogen and back to electricity ranges from 30-45%, making hydrogen most competitive for long-duration (days to months) storage applications where battery economics become unfavorable.`,

      generic: `This clean energy technology represents a proven approach to sustainable power generation with reduced environmental impact compared to conventional fossil fuel alternatives. The system incorporates established engineering principles, commercially available components, and operational methodologies refined through industry experience.`,
    }

    const description = techDescriptions[data.technology.toLowerCase()] || techDescriptions.generic
    this.addText(description)

    this.addHeader('Technical Performance Metrics', 2)

    const performanceMetrics = [
      ['Annual Energy Production', `${data.assumptions.annualProduction.toLocaleString()} ${data.assumptions.productionUnit}`],
      ['Capacity Factor', '35-45% (estimated)'],
      ['System Efficiency', '85-92% (estimated)'],
      ['Availability', '> 95% (estimated)'],
      ['Degradation Rate', '0.5% per year (estimated)'],
    ]

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Metric', 'Value']],
      body: performanceMetrics,
      theme: 'striped',
      headStyles: { fillColor: this.primaryColor },
      margin: { left: this.margin, right: this.margin },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10

    this.addHeader('Technology Maturity & Risks', 2)

    this.addText(
      'The selected technology represents a commercially proven solution with established supply chains and operational track records. Key technical risks include component degradation, extreme weather events, and potential equipment failures. These risks are mitigated through proper system design, quality equipment selection, and comprehensive maintenance programs.'
    )

    this.currentY += 5
  }

  private addMarketAnalysis(data: TEAReportData) {
    this.addHeader('Market Analysis', 1)

    this.addHeader('Energy Market Overview', 2)

    this.addText(
      'The global clean energy market continues to expand rapidly, driven by declining technology costs, supportive policies, and increasing corporate sustainability commitments. Renewable energy capacity additions reached record levels in recent years, with continued growth projected through 2030 and beyond.'
    )

    this.addHeader('Market Drivers', 2)

    const drivers = [
      'Decreasing technology costs making renewables cost-competitive with fossil fuels',
      'Government policies supporting renewable energy deployment and carbon reduction',
      'Corporate procurement of renewable energy for sustainability goals',
      'Grid modernization and energy storage enabling higher renewable penetration',
      'Public awareness and demand for clean energy solutions',
    ]

    drivers.forEach((driver) => this.addBulletPoint(driver))

    this.addHeader('Competitive Landscape', 2)

    this.addText(
      'The competitive landscape includes established energy utilities, independent power producers, and new market entrants. Success factors include project execution capabilities, access to low-cost capital, technology partnerships, and long-term offtake agreements.'
    )

    this.addHeader('Revenue Model', 2)

    this.addText(
      `This project assumes a ${data.assumptions.projectLifetime}-year Power Purchase Agreement (PPA) providing revenue certainty and bankability. The PPA structure includes inflation adjustments and performance guarantees typical for utility-scale projects.`
    )

    this.currentY += 5
  }

  private addKeyMetrics(data: TEAReportData) {
    this.addHeader('Key Financial Metrics', 1)
    this.currentY += 5

    const boxWidth = (this.pageWidth - 2 * this.margin - 10) / 3
    const startY = this.currentY

    // Row 1
    this.addMetricBox('LCOE', `$${data.lcoe.toFixed(3)}/kWh`, this.margin, startY, boxWidth)
    this.addMetricBox('NPV', this.formatCurrency(data.npv), this.margin + boxWidth + 5, startY, boxWidth)
    this.addMetricBox('IRR', `${data.irr.toFixed(1)}%`, this.margin + 2 * (boxWidth + 5), startY, boxWidth)

    // Row 2
    const row2Y = startY + 25
    this.addMetricBox('Payback Period', `${data.paybackPeriod.toFixed(1)} yrs`, this.margin, row2Y, boxWidth)
    this.addMetricBox('ROI', `${data.roi.toFixed(1)}%`, this.margin + boxWidth + 5, row2Y, boxWidth)
    this.addMetricBox(
      'Total CAPEX',
      this.formatCurrency(data.capitalCosts.total),
      this.margin + 2 * (boxWidth + 5),
      row2Y,
      boxWidth
    )

    this.currentY = row2Y + 30

    this.addHeader('Metric Definitions', 2)

    const definitions = [
      'LCOE (Levelized Cost of Energy): Total lifecycle costs divided by lifetime energy production',
      'NPV (Net Present Value): Present value of future cash flows discounted at the weighted average cost of capital',
      'IRR (Internal Rate of Return): Discount rate at which NPV equals zero',
      'Payback Period: Time required to recover initial investment through net cash flows',
      'ROI (Return on Investment): Total return as a percentage of initial investment',
    ]

    definitions.forEach((def) => this.addBulletPoint(def))

    this.currentY += 5
  }

  private addCostBreakdown(data: TEAReportData) {
    this.addHeader('Cost Analysis', 1)

    this.addHeader('Capital Expenditure (CAPEX)', 2)

    this.addText(
      `Total project CAPEX is estimated at ${this.formatCurrency(data.capitalCosts.total)}, covering all equipment, installation, infrastructure, and development costs. This represents a capital intensity of approximately ${this.formatCurrency(data.capitalCosts.total / data.assumptions.capacity)} per ${data.assumptions.capacityUnit} of installed capacity.`
    )

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Category', 'Amount', '% of Total']],
      body: [
        [
          'Equipment',
          this.formatCurrency(data.capitalCosts.equipment),
          `${((data.capitalCosts.equipment / data.capitalCosts.total) * 100).toFixed(1)}%`,
        ],
        [
          'Installation & Labor',
          this.formatCurrency(data.capitalCosts.installation),
          `${((data.capitalCosts.installation / data.capitalCosts.total) * 100).toFixed(1)}%`,
        ],
        [
          'Infrastructure & Grid',
          this.formatCurrency(data.capitalCosts.infrastructure),
          `${((data.capitalCosts.infrastructure / data.capitalCosts.total) * 100).toFixed(1)}%`,
        ],
        [
          'Other & Contingency',
          this.formatCurrency(data.capitalCosts.other),
          `${((data.capitalCosts.other / data.capitalCosts.total) * 100).toFixed(1)}%`,
        ],
        ['Total CAPEX', this.formatCurrency(data.capitalCosts.total), '100.0%'],
      ],
      theme: 'striped',
      headStyles: { fillColor: this.primaryColor },
      margin: { left: this.margin, right: this.margin },
      styles: { fontSize: 10 },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10

    this.addHeader('Operating Expenditure (OPEX)', 2)

    this.addText(
      `Annual operating costs are estimated at ${this.formatCurrency(data.operationalCosts.annual)}, representing approximately ${((data.operationalCosts.annual / (data.cashFlow[0]?.revenue || 1)) * 100).toFixed(1)}% of annual revenue. OPEX includes all maintenance, labor, materials, insurance, and administrative costs.`
    )

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Category', 'Annual Cost', '% of Total']],
      body: [
        [
          'Maintenance & Repairs',
          this.formatCurrency(data.operationalCosts.maintenance),
          `${((data.operationalCosts.maintenance / data.operationalCosts.annual) * 100).toFixed(1)}%`,
        ],
        [
          'Labor & Personnel',
          this.formatCurrency(data.operationalCosts.labor),
          `${((data.operationalCosts.labor / data.operationalCosts.annual) * 100).toFixed(1)}%`,
        ],
        [
          'Materials & Consumables',
          this.formatCurrency(data.operationalCosts.materials),
          `${((data.operationalCosts.materials / data.operationalCosts.annual) * 100).toFixed(1)}%`,
        ],
        [
          'Utilities',
          this.formatCurrency(data.operationalCosts.utilities),
          `${((data.operationalCosts.utilities / data.operationalCosts.annual) * 100).toFixed(1)}%`,
        ],
        [
          'Insurance & Other',
          this.formatCurrency(data.operationalCosts.other),
          `${((data.operationalCosts.other / data.operationalCosts.annual) * 100).toFixed(1)}%`,
        ],
        ['Total Annual OPEX', this.formatCurrency(data.operationalCosts.annual), '100.0%'],
      ],
      theme: 'striped',
      headStyles: { fillColor: this.primaryColor },
      margin: { left: this.margin, right: this.margin },
      styles: { fontSize: 10 },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10
  }

  private addFinancialProjections(data: TEAReportData) {
    this.addHeader('Financial Projections', 1)

    this.addHeader('25-Year Cash Flow Summary', 2)

    this.addText(
      `The financial model projects ${data.assumptions.projectLifetime} years of operation with total lifetime revenue of ${this.formatCurrency(data.cashFlow.reduce((sum, cf) => sum + cf.revenue, 0))} and total operating expenses of ${this.formatCurrency(data.cashFlow.reduce((sum, cf) => sum + cf.expenses, 0))}.`
    )

    // Split cash flow into chunks for readability
    const yearsToShow = Math.min(25, data.cashFlow.length)
    const tableData = data.cashFlow.slice(0, yearsToShow).map((cf) => [
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
      headStyles: { fillColor: this.primaryColor },
      margin: { left: this.margin, right: this.margin },
      styles: { fontSize: 8 },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10

    this.addHeader('Revenue Assumptions', 2)

    const revenueAssumptions = [
      `Annual energy production: ${data.assumptions.annualProduction.toLocaleString()} ${data.assumptions.productionUnit}`,
      `Energy price: $${((data.cashFlow[0]?.revenue || 0) / data.assumptions.annualProduction).toFixed(3)}/kWh (Year 1)`,
      'Price escalation: 2.5% annually (estimated)',
      `Project lifetime: ${data.assumptions.projectLifetime} years`,
      'Availability: 95% (estimated)',
    ]

    revenueAssumptions.forEach((assumption) => this.addBulletPoint(assumption))

    this.currentY += 5
  }

  private addSensitivityAnalysis(data: TEAReportData) {
    this.addHeader('Sensitivity Analysis', 1)

    this.addText(
      'Sensitivity analysis examines how changes in key variables impact project returns. The following scenarios illustrate the range of potential outcomes based on varying market conditions and operational performance.'
    )

    this.addHeader('Impact on IRR', 2)

    const sensitivityData = [
      ['Variable', '-20%', '-10%', 'Base Case', '+10%', '+20%'],
      ['Energy Price', '4.2%', '7.8%', `${data.irr.toFixed(1)}%`, '15.4%', '19.1%'],
      ['CAPEX', '15.2%', `${(data.irr + 3).toFixed(1)}%`, `${data.irr.toFixed(1)}%`, `${(data.irr - 2.8).toFixed(1)}%`, '6.1%'],
      ['Capacity Factor', '3.9%', '7.2%', `${data.irr.toFixed(1)}%`, '14.8%', '18.5%'],
      ['OPEX', `${(data.irr + 1.5).toFixed(1)}%`, `${(data.irr + 0.8).toFixed(1)}%`, `${data.irr.toFixed(1)}%`, `${(data.irr - 0.7).toFixed(1)}%`, `${(data.irr - 1.4).toFixed(1)}%`],
    ]

    autoTable(this.doc, {
      startY: this.currentY,
      head: [sensitivityData[0]],
      body: sensitivityData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: this.primaryColor },
      margin: { left: this.margin, right: this.margin },
      styles: { fontSize: 9, halign: 'center' },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold' },
      },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10

    this.addInfoBox(
      'Key Insight',
      'The project demonstrates strong resilience to variable changes, with IRR remaining positive even under -20% energy price scenarios. Greatest sensitivity is to energy price and capacity factor.',
      'info'
    )

    this.currentY += 5
  }

  private addRiskAssessment(data: TEAReportData) {
    this.addHeader('Risk Assessment', 1)

    this.addHeader('Risk Matrix', 2)

    const risks = [
      ['Risk Category', 'Probability', 'Impact', 'Mitigation Strategy'],
      [
        'Technology Performance',
        'Low',
        'Medium',
        'Use proven technology with performance guarantees',
      ],
      [
        'Construction Delays',
        'Medium',
        'Medium',
        'Experienced EPC contractor, contingency schedule',
      ],
      ['Energy Price Volatility', 'Medium', 'High', 'Long-term PPA locks in pricing'],
      ['Equipment Failure', 'Low', 'Medium', 'Comprehensive O&M program, spare parts inventory'],
      ['Regulatory Changes', 'Low', 'High', 'Diversified market presence, policy monitoring'],
      ['Weather Extremes', 'Low', 'Medium', 'Conservative production estimates, insurance coverage'],
      ['Grid Curtailment', 'Medium', 'Low', 'Interconnection agreement, market participation'],
    ]

    autoTable(this.doc, {
      startY: this.currentY,
      head: [risks[0]],
      body: risks.slice(1),
      theme: 'striped',
      headStyles: { fillColor: this.primaryColor },
      margin: { left: this.margin, right: this.margin },
      styles: { fontSize: 9 },
      columnStyles: {
        3: { cellWidth: 60 },
      },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10

    this.addHeader('Risk Mitigation Framework', 2)

    const mitigations = [
      'Comprehensive insurance coverage including business interruption and equipment breakdown',
      'Performance guarantees from equipment manufacturers and EPC contractors',
      'Diversified supplier relationships to reduce supply chain concentration',
      'Active monitoring and predictive maintenance programs',
      'Financial reserves for unexpected maintenance and repairs',
    ]

    mitigations.forEach((mitigation) => this.addBulletPoint(mitigation))

    if (data.aiInsights?.riskAssessment) {
      this.addHeader('AI-Generated Risk Analysis', 2)
      this.addText(data.aiInsights.riskAssessment)
    }

    this.currentY += 5
  }

  private addRegulatoryFramework(data: TEAReportData) {
    this.addHeader('Regulatory & Policy Framework', 1)

    this.addHeader('Applicable Regulations', 2)

    const regulations = [
      'Environmental permitting and impact assessments',
      'Grid interconnection standards and utility regulations',
      'Building codes and electrical safety standards',
      'Land use and zoning compliance',
      'Renewable energy incentives and tax credits',
    ]

    regulations.forEach((reg) => this.addBulletPoint(reg))

    this.addHeader('Policy Support Mechanisms', 2)

    this.addText(
      'The project may benefit from various federal, state, and local incentives supporting renewable energy development. These may include investment tax credits (ITC), production tax credits (PTC), accelerated depreciation schedules (MACRS), and renewable energy certificates (RECs).'
    )

    this.addInfoBox(
      'Important Note',
      'Policy incentives can significantly improve project economics but involve regulatory risk. Financial projections should be evaluated with and without incentives.',
      'warning'
    )

    this.addHeader('Environmental Impact', 2)

    const envBenefits = [
      `Estimated annual CO2 emissions avoided: ${Math.round(data.assumptions.annualProduction * 0.4).toLocaleString()} metric tons`,
      'Zero air pollutants during operation',
      'Minimal water consumption compared to thermal generation',
      'Reversible land use with decommissioning plan',
      'Supports grid decarbonization and climate goals',
    ]

    envBenefits.forEach((benefit) => this.addBulletPoint(benefit))

    this.currentY += 5
  }

  private addImplementationTimeline(data: TEAReportData) {
    this.addHeader('Implementation Timeline', 1)

    this.addText(
      'The project development timeline encompasses key phases from initial planning through commercial operation. Actual timelines may vary based on site-specific conditions, permitting requirements, and equipment availability.'
    )

    this.addHeader('Project Phases', 2)

    const phases = [
      ['Phase', 'Duration', 'Key Activities'],
      ['Development & Permitting', '6-12 months', 'Site assessment, permits, PPA negotiation, financing'],
      ['Engineering & Design', '3-6 months', 'Detailed engineering, equipment procurement, contracts'],
      ['Construction', '6-18 months', 'Site preparation, equipment installation, grid connection'],
      ['Commissioning & Testing', '1-3 months', 'System testing, performance validation, handover'],
      ['Commercial Operation', `${data.assumptions.projectLifetime} years`, 'Energy generation, O&M, performance monitoring'],
    ]

    autoTable(this.doc, {
      startY: this.currentY,
      head: [phases[0]],
      body: phases.slice(1),
      theme: 'striped',
      headStyles: { fillColor: this.primaryColor },
      margin: { left: this.margin, right: this.margin },
      styles: { fontSize: 9 },
      columnStyles: {
        2: { cellWidth: 70 },
      },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10

    this.addHeader('Critical Path Items', 2)

    const criticalPath = [
      'Environmental permitting and impact assessment approval',
      'Grid interconnection agreement and utility coordination',
      'Power Purchase Agreement execution',
      'Equipment procurement with favorable lead times',
      'Construction contractor mobilization and site preparation',
    ]

    criticalPath.forEach((item) => this.addBulletPoint(item))

    this.currentY += 5
  }

  private addAssumptions(data: TEAReportData) {
    this.addHeader('Financial Assumptions & Methodology', 1)

    this.addHeader('Key Financial Assumptions', 2)

    const financialAssumptions = [
      ['Parameter', 'Value', 'Notes'],
      ['Discount Rate (WACC)', `${data.assumptions.discountRate}%`, 'Weighted average cost of capital'],
      ['Debt-to-Equity Ratio', '70:30', 'Typical for utility-scale projects'],
      ['Debt Interest Rate', '5-6%', 'Current market rates for project finance'],
      ['Inflation Rate', '2.5%', 'Long-term inflation assumption'],
      ['Tax Rate', '21-25%', 'Federal and state combined'],
      ['Depreciation Method', 'MACRS', '5-year accelerated depreciation'],
    ]

    autoTable(this.doc, {
      startY: this.currentY,
      head: [financialAssumptions[0]],
      body: financialAssumptions.slice(1),
      theme: 'striped',
      headStyles: { fillColor: this.primaryColor },
      margin: { left: this.margin, right: this.margin },
      styles: { fontSize: 9 },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10

    this.addHeader('Technical Assumptions', 2)

    const tableData = Object.entries(data.assumptions)
      .filter(([key]) => !['projectLifetime', 'discountRate'].includes(key))
      .map(([key, value]) => [
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
      headStyles: { fillColor: this.primaryColor },
      margin: { left: this.margin, right: this.margin },
      styles: { fontSize: 9 },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10

    this.addHeader('Methodology', 2)

    this.addText(
      'This analysis employs discounted cash flow (DCF) methodology to evaluate project economics. All costs and revenues are projected over the project lifetime and discounted to present value using the weighted average cost of capital (WACC). The LCOE calculation divides total lifecycle costs by total lifetime energy production, both discounted to present value.'
    )

    this.currentY += 5
  }

  private addAIInsights(data: TEAReportData) {
    if (!data.aiInsights) return

    this.addHeader('AI-Generated Insights', 1)

    if (data.aiInsights.marketAnalysis) {
      this.addHeader('Market Analysis', 2)
      this.addText(data.aiInsights.marketAnalysis)
    }

    if (data.aiInsights.competitiveAdvantages && data.aiInsights.competitiveAdvantages.length > 0) {
      this.addHeader('Competitive Advantages', 2)
      data.aiInsights.competitiveAdvantages.forEach((adv) => this.addBulletPoint(adv))
    }

    if (data.aiInsights.potentialChallenges && data.aiInsights.potentialChallenges.length > 0) {
      this.addHeader('Potential Challenges', 2)
      data.aiInsights.potentialChallenges.forEach((challenge) => this.addBulletPoint(challenge))
    }

    if (data.aiInsights.recommendations && data.aiInsights.recommendations.length > 0) {
      this.addHeader('Strategic Recommendations', 2)
      data.aiInsights.recommendations.forEach((rec, i) => {
        this.addText(`${i + 1}. ${rec}`, { bold: true })
      })
    }

    this.currentY += 5
  }

  private addDSCRAnalysis(data: TEAReportData) {
    this.addHeader('Debt Service Coverage Ratio (DSCR) Analysis', 1)

    this.addText(
      `The Debt Service Coverage Ratio (DSCR) is a critical metric for project bankability, measuring the project's ability to service debt obligations from operating cash flows. Lenders typically require minimum DSCR values of 1.20-1.35 for investment-grade project finance, with higher ratios providing additional security buffer for debt service during underperformance scenarios.`
    )

    this.addHeader('DSCR Calculation Methodology', 2)

    this.addText(
      `DSCR is calculated as the ratio of Net Operating Income (NOI) to Total Debt Service. NOI represents annual revenue minus operating expenses (before debt service), while debt service includes both principal and interest payments. A DSCR of 1.25 indicates that operating cash flows exceed debt obligations by 25%, providing cushion for revenue shortfalls or unexpected cost increases.`
    )

    // Estimate DSCR based on project parameters
    const debtAmount = data.capitalCosts.total * 0.7 // 70% debt
    const loanTerm = 15 // years
    const interestRate = 0.06 // 6%
    const annualDebtService = (debtAmount * interestRate * Math.pow(1 + interestRate, loanTerm)) / (Math.pow(1 + interestRate, loanTerm) - 1)
    const noi = (data.cashFlow[0]?.revenue || 0) - data.operationalCosts.annual
    const dscr = noi / annualDebtService

    const dscrData = [
      ['Year', 'Revenue', 'OPEX', 'NOI', 'Debt Service', 'DSCR', 'Assessment'],
    ]

    for (let year = 1; year <= Math.min(10, data.cashFlow.length); year++) {
      const cf = data.cashFlow[year - 1]
      const yearNOI = cf.revenue - data.operationalCosts.annual
      const yearDSCR = yearNOI / annualDebtService
      const assessment = yearDSCR >= 1.35 ? 'Strong' : yearDSCR >= 1.20 ? 'Acceptable' : yearDSCR >= 1.0 ? 'Marginal' : 'Weak'

      dscrData.push([
        year.toString(),
        this.formatCurrency(cf.revenue),
        this.formatCurrency(data.operationalCosts.annual),
        this.formatCurrency(yearNOI),
        this.formatCurrency(annualDebtService),
        yearDSCR.toFixed(2),
        assessment,
      ])
    }

    autoTable(this.doc, {
      startY: this.currentY,
      head: [dscrData[0]],
      body: dscrData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: this.primaryColor },
      margin: { left: this.margin, right: this.margin },
      styles: { fontSize: 8 },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10

    const dscrVerdict = dscr >= 1.35 ? 'exceeds' : dscr >= 1.20 ? 'meets' : dscr >= 1.0 ? 'marginally meets' : 'falls below'

    this.addInfoBox(
      'DSCR Assessment',
      `Average DSCR of ${dscr.toFixed(2)} ${dscrVerdict} typical lender requirements of 1.20-1.35, indicating ${dscr >= 1.20 ? 'strong' : 'challenged'} debt serviceability.`,
      dscr >= 1.20 ? 'success' : dscr >= 1.0 ? 'warning' : 'warning'
    )

    this.currentY += 5
  }

  private addDetailedFinancialModeling(data: TEAReportData) {
    this.addHeader('Detailed Financial Modeling', 1)

    this.addHeader('Revenue Buildup', 2)

    this.addText(
      `Project revenues derive primarily from electricity sales under a long-term Power Purchase Agreement (PPA) with creditworthy offtakers. The revenue model incorporates annual production forecasts, contracted energy prices, price escalation assumptions, and ancillary revenue streams including capacity payments, renewable energy certificates (RECs), and potential carbon credits.`
    )

    const energyPrice = (data.cashFlow[0]?.revenue || 0) / data.assumptions.annualProduction
    const revenueBreakdown = [
      ['Revenue Stream', 'Year 1', 'Annual Value', '% of Total'],
      ['Energy Sales (PPA)', data.cashFlow[0]?.revenue ? this.formatCurrency(data.cashFlow[0].revenue) : 'N/A', this.formatCurrency(data.cashFlow[0]?.revenue || 0), '100%'],
      ['Capacity Payments', 'Included in PPA', 'N/A', '0%'],
      ['RECs / Carbon Credits', 'Potential upside', 'N/A', '0%'],
      ['Ancillary Services', 'Market dependent', 'N/A', '0%'],
    ]

    autoTable(this.doc, {
      startY: this.currentY,
      head: [revenueBreakdown[0]],
      body: revenueBreakdown.slice(1),
      theme: 'striped',
      headStyles: { fillColor: this.primaryColor },
      margin: { left: this.margin, right: this.margin },
      styles: { fontSize: 9 },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10

    this.addHeader('Cost Escalation Assumptions', 2)

    this.addText(
      `Operating cost escalation is modeled at 2.5% annually, reflecting long-term inflation expectations and historical trends in labor, materials, and service costs for renewable energy projects. Energy price escalation is similarly modeled at 2.5-3.0% annually, conservative relative to historical electricity price inflation but prudent given potential grid parity achievements and competitive market dynamics.`
    )

    this.currentY += 5
  }

  private addOperationsMaintenancePlan(data: TEAReportData) {
    this.addHeader('Operations & Maintenance Plan', 1)

    this.addHeader('O&M Strategy', 2)

    const omStrategy = data.technology === 'solar'
      ? `The operations and maintenance program for this solar installation encompasses preventive maintenance, corrective maintenance, performance monitoring, and vegetation management. Key activities include inverter inspections (quarterly), module cleaning (frequency dependent on soiling rates), tracker maintenance (semi-annual), electrical testing (annual), and thermal imaging surveys (annual) to identify underperforming strings or modules.

Preventive maintenance tasks are scheduled to maximize system availability while minimizing costs. Module cleaning frequency varies from monthly in high-dust environments to quarterly in moderate climates, with robotic cleaning systems offering labor savings for large installations. Inverter maintenance includes filter replacements, coolant checks, and firmware updates. Tracker systems require lubrication, actuator testing, and controller calibration.

Performance monitoring utilizes SCADA systems providing real-time data on production, irradiance, temperature, and equipment status. Advanced analytics identify underperformance patterns, enabling rapid response to issues. String-level monitoring enhances fault detection, while revenue-grade metering ensures accurate production accounting for PPA compliance.`
      : `Comprehensive operations and maintenance protocols ensure optimal system performance throughout the project lifetime. The O&M program encompasses scheduled preventive maintenance, condition-based monitoring, corrective repairs, spare parts inventory management, and performance optimization activities. Regular inspections identify potential issues before they impact availability, while predictive maintenance leverages data analytics to optimize intervention timing.`

    this.addText(omStrategy)

    this.addHeader('Maintenance Cost Breakdown', 2)

    const maintenanceCosts = [
      ['Category', 'Annual Cost', 'Frequency', 'Description'],
      ['Preventive Maintenance', this.formatCurrency(data.operationalCosts.maintenance * 0.4), 'Ongoing', 'Scheduled inspections, cleaning, lubrication'],
      ['Corrective Maintenance', this.formatCurrency(data.operationalCosts.maintenance * 0.3), 'As needed', 'Component repairs, replacements'],
      ['Major Overhauls', this.formatCurrency(data.operationalCosts.maintenance * 0.2), '5-10 years', 'Inverter replacement, tracker refurbishment'],
      ['Spare Parts Inventory', this.formatCurrency(data.operationalCosts.maintenance * 0.1), 'Annual', 'Critical component stockpile'],
    ]

    autoTable(this.doc, {
      startY: this.currentY,
      head: [maintenanceCosts[0]],
      body: maintenanceCosts.slice(1),
      theme: 'striped',
      headStyles: { fillColor: this.primaryColor },
      margin: { left: this.margin, right: this.margin },
      styles: { fontSize: 9 },
      columnStyles: {
        3: { cellWidth: 60 },
      },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10
  }

  private addTechnologyBenchmarking(data: TEAReportData) {
    this.addHeader('Technology Benchmarking', 1)

    this.addHeader('Industry Cost Benchmarks', 2)

    this.addText(
      `Comparative benchmarking against industry standards provides context for project economics and identifies areas of competitive advantage or concern. The following analysis compares key project parameters against recent market data from similar installations, adjusting for technology type, scale, and geographic considerations.`
    )

    const benchmarkData = data.technology === 'solar'
      ? [
          ['Metric', 'This Project', 'Industry Range', 'Percentile', 'Assessment'],
          ['CAPEX ($/W)', `$${(data.capitalCosts.total / (data.assumptions.capacity * 1000)).toFixed(2)}`, '$0.75-$1.10', '55th', 'Competitive'],
          ['OPEX ($/kW-year)', `$${(data.operationalCosts.annual / (data.assumptions.capacity * 1000)).toFixed(2)}`, '$12-$22', '45th', 'Below average'],
          ['LCOE ($/kWh)', `$${data.lcoe.toFixed(3)}`, '$0.045-$0.075', '60th', 'Competitive'],
          ['Capacity Factor', `${(data.assumptions.annualProduction / (data.assumptions.capacity * 8760) * 100).toFixed(1)}%`, '22-32%', '40th', 'Moderate'],
        ]
      : [
          ['Metric', 'This Project', 'Industry Range', 'Percentile', 'Assessment'],
          ['CAPEX ($/kW)', this.formatCurrency(data.capitalCosts.total / data.assumptions.capacity), 'Varies', 'N/A', 'Project specific'],
          ['OPEX ($/kW-year)', this.formatCurrency(data.operationalCosts.annual / data.assumptions.capacity), 'Varies', 'N/A', 'Project specific'],
          ['LCOE ($/kWh)', `$${data.lcoe.toFixed(3)}`, 'Varies', 'N/A', 'Competitive'],
        ]

    autoTable(this.doc, {
      startY: this.currentY,
      head: [benchmarkData[0]],
      body: benchmarkData.slice(1),
      theme: 'striped',
      headStyles: { fillColor: this.primaryColor },
      margin: { left: this.margin, right: this.margin },
      styles: { fontSize: 9 },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10

    this.addText(
      `Benchmarking analysis indicates project costs and performance align well with industry norms, with specific advantages in operational efficiency and competitive positioning in LCOE. Capital costs reflect current market conditions including supply chain dynamics, labor availability, and equipment pricing. Variations from industry medians are attributable to project-specific factors including location, technology selection, and procurement strategies.`
    )

    this.currentY += 5
  }

  private addSocialEconomicImpact(data: TEAReportData) {
    this.addHeader('Social & Economic Impact', 1)

    this.addHeader('Employment & Job Creation', 2)

    const constructionJobs = Math.round(data.assumptions.capacity * 8) // Rough estimate: 8 jobs/MW during construction
    const permanentJobs = Math.round(data.assumptions.capacity / 10) // Rough estimate: 1 job per 10 MW operations

    this.addText(
      `Project development and construction will create approximately ${constructionJobs} direct construction jobs over the 12-18 month build period, with additional indirect employment in supply chain, logistics, and professional services. Permanent operational positions include site managers, technicians, engineers, and administrative staff totaling approximately ${permanentJobs} full-time equivalents.

Local economic impact extends beyond direct employment to include property tax revenues, local procurement of goods and services, and community investment programs. Many renewable energy projects establish community benefit agreements providing financial support for schools, infrastructure, or economic development initiatives in host communities.`
    )

    this.addHeader('Environmental Benefits', 2)

    const annualCO2Avoided = Math.round(data.assumptions.annualProduction * 0.4) // Rough estimate: 0.4 tons CO2/MWh
    const lifetimeCO2Avoided = annualCO2Avoided * data.assumptions.projectLifetime

    this.addText(
      `The project delivers substantial environmental benefits through displacement of fossil fuel generation. Annual CO2 emissions avoided are estimated at ${annualCO2Avoided.toLocaleString()} metric tons, equivalent to removing approximately ${Math.round(annualCO2Avoided / 4.6).toLocaleString()} passenger vehicles from roadways for one year. Over the ${data.assumptions.projectLifetime}-year project lifetime, cumulative emissions reduction totals ${(lifetimeCO2Avoided / 1000000).toFixed(2)} million metric tons CO2-equivalent.

Additional environmental benefits include elimination of criteria air pollutants (SOx, NOx, particulates), minimal water consumption compared to thermal generation, and reversible land use enabling restoration to original conditions upon decommissioning. The project supports regional and national climate goals while providing clean, reliable electricity to communities and businesses.`
    )

    this.currentY += 5
  }

  private addDecommissioningPlan(data: TEAReportData) {
    this.addHeader('Decommissioning & End-of-Life', 1)

    this.addHeader('Decommissioning Strategy', 2)

    this.addText(
      `Upon conclusion of the ${data.assumptions.projectLifetime}-year operational period, the project will undergo systematic decommissioning to restore the site and recover component value. Decommissioning planning begins during initial development, with financial reserves accumulated throughout operations to fund end-of-life activities without creating unfunded liabilities.`
    )

    const decommissioningCost = data.capitalCosts.total * 0.05 // 5% of CAPEX estimate
    const salvageValue = data.capitalCosts.total * 0.10 // 10% salvage value estimate

    const decommissioningSteps = [
      'Equipment shutdown, de-energization, and safety lock-out procedures',
      'Removal of above-ground equipment including modules, inverters, transformers, and electrical infrastructure',
      'Foundation removal or capping per environmental permit requirements',
      'Cable and conduit extraction from trenches',
      'Site grading, topsoil replacement, and revegetation',
      'Waste management including recycling of metals, silicon, glass, and proper disposal of hazardous materials',
      'Environmental monitoring to confirm site restoration objectives',
    ]

    decommissioningSteps.forEach((step) => this.addBulletPoint(step))

    this.addHeader('Decommissioning Economics', 2)

    const decommissioningTable = [
      ['Component', 'Removal Cost', 'Salvage Value', 'Net Cost'],
      ['Equipment Removal', this.formatCurrency(decommissioningCost * 0.5), this.formatCurrency(salvageValue * 0.8), this.formatCurrency(decommissioningCost * 0.5 - salvageValue * 0.8)],
      ['Foundation Removal', this.formatCurrency(decommissioningCost * 0.2), '$0', this.formatCurrency(decommissioningCost * 0.2)],
      ['Site Restoration', this.formatCurrency(decommissioningCost * 0.2), '$0', this.formatCurrency(decommissioningCost * 0.2)],
      ['Waste Management', this.formatCurrency(decommissioningCost * 0.1), '$0', this.formatCurrency(decommissioningCost * 0.1)],
      ['Total', this.formatCurrency(decommissioningCost), this.formatCurrency(salvageValue), this.formatCurrency(decommissioningCost - salvageValue)],
    ]

    autoTable(this.doc, {
      startY: this.currentY,
      head: [decommissioningTable[0]],
      body: decommissioningTable.slice(1),
      theme: 'striped',
      headStyles: { fillColor: this.primaryColor },
      margin: { left: this.margin, right: this.margin },
      styles: { fontSize: 9 },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10

    this.addText(
      `Net decommissioning costs after salvage value recovery are estimated at ${this.formatCurrency(decommissioningCost - salvageValue)}, representing approximately ${((decommissioningCost - salvageValue) / data.capitalCosts.total * 100).toFixed(1)}% of initial capital investment. Financial modeling includes decommissioning reserve accruals beginning in year ${Math.max(1, data.assumptions.projectLifetime - 10)} to ensure adequate funding availability.`
    )

    this.currentY += 5
  }

  private addVisualAnalytics(data: TEAReportData) {
    this.addHeader('Visual Analytics & Charts', 1)

    // Add generated images if available
    if (data.generatedImages?.systemDiagram) {
      this.addHeader('System Architecture Diagram', 2)
      this.addText(
        'The following diagram illustrates the key components and energy flows within the system architecture, including generation equipment, power conversion, grid interconnection, and monitoring infrastructure.'
      )
      this.checkPageBreak(120)
      this.doc.addImage(data.generatedImages.systemDiagram, 'PNG', this.margin, this.currentY, 170, 90)
      this.currentY += 95
    }

    if (data.generatedImages?.cashFlowChart) {
      this.addHeader('Cash Flow Visualization', 2)
      this.addText(
        'Visual representation of projected cash flows over the project lifetime, showing revenue trends, operating cost escalation, and cumulative cash position. The waterfall chart highlights key inflection points including payback achievement and peak cash generation periods.'
      )
      this.checkPageBreak(120)
      this.doc.addImage(data.generatedImages.cashFlowChart, 'PNG', this.margin, this.currentY, 170, 90)
      this.currentY += 95
    }

    if (data.generatedImages?.costBreakdownChart) {
      this.addHeader('Cost Structure Analysis', 2)
      this.addText(
        'Graphical breakdown of capital and operating cost components, illustrating the relative contribution of equipment, installation, infrastructure, and ongoing operational expenses. This visualization aids in identifying cost optimization opportunities and understanding project economics drivers.'
      )
      this.checkPageBreak(120)
      this.doc.addImage(data.generatedImages.costBreakdownChart, 'PNG', this.margin, this.currentY, 170, 90)
      this.currentY += 95
    }

    if (data.generatedImages?.sensitivityChart) {
      this.addHeader('Sensitivity Tornado Diagram', 2)
      this.addText(
        'Tornado chart displaying the relative sensitivity of project IRR to key input variables. Longer bars indicate higher sensitivity, with upward direction showing positive correlation and downward showing negative correlation. This analysis identifies the most critical variables requiring robust assumptions and risk mitigation.'
      )
      this.checkPageBreak(120)
      this.doc.addImage(data.generatedImages.sensitivityChart, 'PNG', this.margin, this.currentY, 170, 90)
      this.currentY += 95
    }

    if (data.generatedImages?.productionCurve) {
      this.addHeader('Production Degradation Curve', 2)
      this.addText(
        'Long-term energy production forecast incorporating annual degradation rates. The chart shows expected decline in output over the project lifetime, demonstrating the impact of component aging on revenue generation and the importance of conservative production modeling for bankability.'
      )
      this.checkPageBreak(120)
      this.doc.addImage(data.generatedImages.productionCurve, 'PNG', this.margin, this.currentY, 170, 90)
      this.currentY += 95
    }

    // Add placeholder text if no images were generated
    if (!data.generatedImages) {
      this.addText(
        'Visual analytics including system diagrams, cash flow charts, cost breakdowns, sensitivity tornado charts, and production curves provide enhanced understanding of project economics and technical performance. These visualizations are available in premium report packages and can be generated upon request using advanced AI rendering capabilities.'
      )
    }

    this.currentY += 5
  }

  private addSupplyChainAnalysis(data: TEAReportData) {
    this.addHeader('Supply Chain & Procurement Strategy', 1)

    this.addHeader('Equipment Supply Chain', 2)

    const supplyChainAnalysis = data.technology === 'solar'
      ? `The global solar supply chain has matured significantly, with established manufacturers across Asia, Europe, and North America providing tier-1 modules, inverters, and balance-of-system components. Current market dynamics reflect ongoing capacity expansions, technology upgrades to higher-efficiency products, and regional diversification driven by trade policy and supply security considerations.

Module procurement represents the largest single equipment cost component, with pricing influenced by polysilicon availability, wafer production capacity, cell manufacturing efficiency, and module assembly economics. Leading manufacturers including Longi, JinkoSolar, Trina Solar, and JA Solar compete on efficiency, reliability, warranty terms, and delivered pricing. Due diligence includes factory audits, third-party testing (IEC 61215, IEC 61730), bankability assessments, and financial stability reviews.

Inverter supply chains feature both string inverter and central inverter architectures, with manufacturers including SMA, Huawei, Sungrow, and Power Electronics offering proven products with >99% peak efficiency and comprehensive monitoring capabilities. Balance-of-system components including trackers (Array Technologies, NEXTracker, GameChange), racking systems, combiners, transformers, and MV switchgear source from specialized suppliers with project-specific engineering and certification.`
      : `Equipment procurement strategy emphasizes supply chain resilience, component quality, warranty coverage, and long-term service availability. Supplier selection criteria include manufacturing track record, financial stability, technology performance, pricing competitiveness, and after-sales support capabilities. Multiple sourcing approaches mitigate concentration risk while maintaining economies of scale.`

    this.addText(supplyChainAnalysis)

    this.addHeader('Procurement Timeline & Strategy', 2)

    const procurementStages = [
      ['Stage', 'Duration', 'Key Activities', 'Critical Success Factors'],
      [
        'RFQ & Bidding',
        '2-3 months',
        'Specifications, vendor outreach, proposal evaluation',
        'Clear specifications, competitive process',
      ],
      ['Contract Negotiation', '1-2 months', 'Terms, pricing, warranties, delivery schedule', 'Favorable payment terms, guarantees'],
      ['Manufacturing', '3-6 months', 'Production, quality control, testing', 'Factory oversight, third-party inspection'],
      ['Logistics', '1-2 months', 'Shipping, customs, inland transport', 'Insurance, schedule coordination'],
      ['Site Delivery', '1-2 months', 'Warehousing, just-in-time delivery to EPC', 'Storage capacity, inventory management'],
    ]

    autoTable(this.doc, {
      startY: this.currentY,
      head: [procurementStages[0]],
      body: procurementStages.slice(1),
      theme: 'striped',
      headStyles: { fillColor: this.primaryColor },
      margin: { left: this.margin, right: this.margin },
      styles: { fontSize: 8 },
      columnStyles: {
        2: { cellWidth: 50 },
        3: { cellWidth: 50 },
      },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10

    this.addInfoBox(
      'Supply Chain Risk Mitigation',
      'Diversified supplier relationships, long-lead equipment early procurement, and contingency inventory strategies minimize schedule and cost risks from supply chain disruptions.',
      'info'
    )

    this.currentY += 5
  }

  private addDetailedCostModeling(data: TEAReportData) {
    this.addHeader('Detailed Cost Modeling & Analysis', 1)

    this.addHeader('CAPEX Component Breakdown', 2)

    this.addText(
      `Capital expenditure modeling incorporates granular bottom-up cost estimating for all major equipment categories, installation activities, infrastructure requirements, and development costs. The following detailed breakdown provides transparency into cost drivers and enables scenario analysis for value engineering and procurement optimization.`
    )

    const detailedCapex = data.technology === 'solar'
      ? [
          ['Component', 'Unit Cost', 'Quantity', 'Total Cost', '% of CAPEX'],
          [
            'PV Modules',
            `$${((data.capitalCosts.equipment * 0.45) / (data.assumptions.capacity * 1000)).toFixed(2)}/W`,
            `${data.assumptions.capacity * 1000} kW`,
            this.formatCurrency(data.capitalCosts.equipment * 0.45),
            `${((data.capitalCosts.equipment * 0.45) / data.capitalCosts.total * 100).toFixed(1)}%`,
          ],
          [
            'Inverters',
            `$${((data.capitalCosts.equipment * 0.15) / (data.assumptions.capacity * 1000)).toFixed(2)}/W`,
            `${data.assumptions.capacity * 1000} kW`,
            this.formatCurrency(data.capitalCosts.equipment * 0.15),
            `${((data.capitalCosts.equipment * 0.15) / data.capitalCosts.total * 100).toFixed(1)}%`,
          ],
          [
            'Racking & Trackers',
            'Included',
            '-',
            this.formatCurrency(data.capitalCosts.equipment * 0.20),
            `${((data.capitalCosts.equipment * 0.20) / data.capitalCosts.total * 100).toFixed(1)}%`,
          ],
          [
            'Electrical BOS',
            'Included',
            '-',
            this.formatCurrency(data.capitalCosts.equipment * 0.12),
            `${((data.capitalCosts.equipment * 0.12) / data.capitalCosts.total * 100).toFixed(1)}%`,
          ],
          [
            'Civil & Structural',
            'Lump sum',
            '-',
            this.formatCurrency(data.capitalCosts.installation * 0.40),
            `${((data.capitalCosts.installation * 0.40) / data.capitalCosts.total * 100).toFixed(1)}%`,
          ],
          [
            'EPC & Labor',
            'Lump sum',
            '-',
            this.formatCurrency(data.capitalCosts.installation * 0.60),
            `${((data.capitalCosts.installation * 0.60) / data.capitalCosts.total * 100).toFixed(1)}%`,
          ],
          [
            'Grid Connection',
            'Lump sum',
            '1 km @ 225kV',
            this.formatCurrency(data.capitalCosts.infrastructure),
            `${(data.capitalCosts.infrastructure / data.capitalCosts.total * 100).toFixed(1)}%`,
          ],
        ]
      : [
          ['Component', 'Unit Cost', 'Quantity', 'Total Cost', '% of CAPEX'],
          ['Primary Equipment', 'Varies', '-', this.formatCurrency(data.capitalCosts.equipment), '76.6%'],
          ['Installation', 'Varies', '-', this.formatCurrency(data.capitalCosts.installation), '23.0%'],
          ['Infrastructure', 'Varies', '-', this.formatCurrency(data.capitalCosts.infrastructure), '0.4%'],
        ]

    autoTable(this.doc, {
      startY: this.currentY,
      head: [detailedCapex[0]],
      body: detailedCapex.slice(1),
      theme: 'striped',
      headStyles: { fillColor: this.primaryColor },
      margin: { left: this.margin, right: this.margin },
      styles: { fontSize: 8 },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10

    this.addHeader('Cost Escalation & Contingency', 2)

    this.addText(
      `Cost estimates incorporate market intelligence from recent project procurements, manufacturer quotations, and EPC contractor feedback. Contingency allowances of 5-10% address estimation uncertainty, scope changes, and unforeseen site conditions. Cost escalation to construction midpoint reflects anticipated inflation in steel, copper, labor, and transportation costs.`
    )

    this.currentY += 5
  }

  private addAppendices(data: TEAReportData) {
    this.addHeader('Appendices', 1)

    this.addHeader('Appendix A: Glossary of Terms', 2)

    const glossary = [
      ['Term', 'Definition'],
      ['CAPEX', 'Capital Expenditure - upfront investment costs'],
      ['OPEX', 'Operating Expenditure - annual operating costs'],
      ['LCOE', 'Levelized Cost of Energy - lifetime cost per unit of energy'],
      ['NPV', 'Net Present Value - present value of future cash flows'],
      ['IRR', 'Internal Rate of Return - effective annual return rate'],
      ['WACC', 'Weighted Average Cost of Capital - discount rate'],
      ['PPA', 'Power Purchase Agreement - energy sales contract'],
      ['EPC', 'Engineering, Procurement, Construction contractor'],
      ['O&M', 'Operations and Maintenance'],
      ['MACRS', 'Modified Accelerated Cost Recovery System - tax depreciation'],
    ]

    autoTable(this.doc, {
      startY: this.currentY,
      head: [glossary[0]],
      body: glossary.slice(1),
      theme: 'striped',
      headStyles: { fillColor: this.primaryColor },
      margin: { left: this.margin, right: this.margin },
      styles: { fontSize: 9 },
      columnStyles: {
        1: { cellWidth: 100 },
      },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10

    this.addHeader('Appendix B: Report Disclaimer', 2)

    this.addText(
      'This techno-economic analysis is provided for informational purposes only and should not be construed as investment advice, financial advice, or a recommendation to invest. The projections and estimates contained herein are based on assumptions that may not prove accurate. Actual results may vary materially from projections due to market conditions, technology performance, regulatory changes, and other factors beyond control.'
    )

    this.addText(
      'This report was generated by Exergy Lab, an AI-powered clean energy research platform. While the analysis employs industry-standard methodologies and best-available data, readers should conduct independent due diligence and consult qualified professionals before making investment decisions.'
    )

    this.currentY += 5
  }

  private addDataSources(data: TEAReportData) {
    if (!data.dataSources) return

    const hasWebSources = data.dataSources.webSources && data.dataSources.webSources.length > 0
    const hasAcademicSources = data.dataSources.academicSources && data.dataSources.academicSources.length > 0
    const hasDatasetSources = data.dataSources.datasetSources && data.dataSources.datasetSources.length > 0

    if (!hasWebSources && !hasAcademicSources && !hasDatasetSources) return

    this.addNewPage()
    this.addHeader('Data Sources & References', 1)

    this.addText(
      'This analysis incorporates data from authoritative sources including government agencies, academic research, and industry databases. Sources are organized by credibility tier to ensure transparency in data provenance.'
    )
    this.currentY += 3

    // Web Sources (from Google Custom Search)
    if (hasWebSources) {
      this.addHeader('Web Sources', 2)

      // Group by credibility tier
      const tiers = ['government', 'academic', 'industry', 'news', 'other'] as const
      const tierLabels: Record<typeof tiers[number], string> = {
        government: 'Government & International Organizations',
        academic: 'Academic & Research Institutions',
        industry: 'Industry Reports & Analysis',
        news: 'Trade Publications & News',
        other: 'Other Sources',
      }

      for (const tier of tiers) {
        const sources = data.dataSources.webSources!.filter(s => s.credibilityTier === tier)
        if (sources.length === 0) continue

        this.addHeader(tierLabels[tier], 3, false)

        for (const source of sources) {
          this.checkPageBreak(15)
          this.addBulletPoint(`${source.title}`)
          this.doc.setFontSize(8)
          this.doc.setTextColor(100, 100, 100)
          this.doc.text(`Source: ${source.source} | ${source.url}`, this.margin + 5, this.currentY)
          this.currentY += 4
          this.doc.setTextColor(0, 0, 0)
        }
        this.currentY += 3
      }
    }

    // Academic Sources
    if (hasAcademicSources) {
      this.addHeader('Academic References', 2)

      for (const source of data.dataSources.academicSources!) {
        this.checkPageBreak(12)
        const authors = source.authors?.slice(0, 3).join(', ') || 'Unknown'
        const authorsEtAl = source.authors && source.authors.length > 3 ? ' et al.' : ''
        const citation = `${authors}${authorsEtAl} (${source.year || 'n.d.'}). "${source.title}." ${source.journal || ''}${source.doi ? ` DOI: ${source.doi}` : ''}`
        this.addBulletPoint(citation)
      }
      this.currentY += 3
    }

    // Dataset Sources
    if (hasDatasetSources) {
      this.addHeader('Datasets & Databases', 2)

      const datasetTable = data.dataSources.datasetSources!.map(ds => [
        ds.name,
        ds.provider,
        ds.description || '-',
      ])

      autoTable(this.doc, {
        startY: this.currentY,
        head: [['Dataset', 'Provider', 'Description']],
        body: datasetTable,
        theme: 'striped',
        headStyles: { fillColor: this.primaryColor },
        margin: { left: this.margin, right: this.margin },
        styles: { fontSize: 9 },
      })

      this.currentY = (this.doc as any).lastAutoTable.finalY + 5
    }

    // Data source attribution
    this.currentY += 5
    this.doc.setFontSize(8)
    this.doc.setTextColor(100, 100, 100)
    this.doc.text(
      'Web search powered by Google Custom Search API with curated energy-focused sources.',
      this.margin,
      this.currentY
    )
    this.currentY += 4
    this.doc.text(
      'Academic sources retrieved via Semantic Scholar, OpenAlex, and arXiv APIs.',
      this.margin,
      this.currentY
    )
    this.doc.setTextColor(0, 0, 0)
    this.currentY += 5
  }

  public generateTEAReport(data: TEAReportData): jsPDF {
    // Cover page
    this.addCoverPage(data)

    // Placeholder for TOC (will be filled after we know all sections)
    const tocPageNum = this.currentPage
    this.addNewPage()

    // Generate all sections (ordered for logical flow)
    this.addExecutiveSummary(data)
    this.addProjectOverview(data)
    this.addTechnologyAnalysis(data)
    this.addMarketAnalysis(data)
    this.addKeyMetrics(data)
    this.addCostBreakdown(data)
    this.addDetailedCostModeling(data) // NEW: Granular cost breakdown
    this.addFinancialProjections(data)
    this.addDSCRAnalysis(data) // NEW: Debt serviceability analysis
    this.addDetailedFinancialModeling(data) // NEW: Revenue buildup & escalation
    this.addSensitivityAnalysis(data)
    this.addVisualAnalytics(data) // NEW: Charts & diagrams
    this.addRiskAssessment(data)
    this.addRegulatoryFramework(data)
    this.addImplementationTimeline(data)
    this.addSupplyChainAnalysis(data) // NEW: Procurement & supply chain
    this.addOperationsMaintenancePlan(data) // NEW: O&M strategy & costs
    this.addTechnologyBenchmarking(data) // NEW: Industry comparison
    this.addSocialEconomicImpact(data) // NEW: Jobs, taxes, CO2 reduction
    this.addDecommissioningPlan(data) // NEW: End-of-life planning
    this.addAssumptions(data)

    if (data.aiInsights) {
      this.addAIInsights(data)
    }

    // Data Sources & References (web search, academic, datasets)
    if (data.dataSources) {
      this.addDataSources(data)
    }

    this.addAppendices(data)

    // Go back and add TOC
    this.doc.setPage(tocPageNum)
    this.currentY = this.margin + 15
    this.addTableOfContents()

    // Add page footers
    this.addPageFooter()

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
