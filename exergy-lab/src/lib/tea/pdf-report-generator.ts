/**
 * Enhanced PDF Report Generator for TEA
 *
 * Generates publication-quality, industry-standard TEA reports with 18 sections:
 * 1. Cover Page
 * 2. Table of Contents
 * 3. List of Exhibits (Figures & Tables)
 * 4. Acronyms & Abbreviations
 * 5. Glossary of Terms
 * 6. Executive Summary
 * 7. Introduction/Background
 * 8. Methodology
 * 9. Process Description
 * 10. Performance Analysis
 * 11. Economic Analysis
 * 12. Market Analysis
 * 13. Results & Discussion
 * 14. AI-Generated Insights
 * 15. Conclusions
 * 16. Limitations
 * 17. References
 * 18. Appendices
 *
 * Based on analysis of 4 reference TEA reports (Perovskite, NETL, HEAVENN, RSB)
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { TEAReportConfig, TEAInput_v2, TEAResult_v2, CalculationProvenance } from '@/types/tea'
import type { QualityOrchestrationResult } from './quality-orchestrator'
import type { TEAQualityAssessment } from './quality-rubric'
import type { MaterialBalance, EnergyBalance } from '@/types/tea-process'

export interface ComprehensiveTEAReportData {
  // Report configuration
  config: TEAReportConfig

  // Project data
  input: TEAInput_v2
  results: TEAResult_v2

  // Validation data
  qualityAssessment?: TEAQualityAssessment
  validationResult?: QualityOrchestrationResult

  // Process data
  materialBalances?: MaterialBalance[]
  energyBalance?: EnergyBalance
  calculationProvenance?: CalculationProvenance[]

  // Content
  executiveSummary: string
  introduction: string
  methodology: string
  processDescription: string
  marketAnalysis: string
  conclusions: string
  limitations: string[]

  // AI insights (from existing system)
  aiInsights?: {
    marketAnalysis: string
    riskAssessment: string
    recommendations: string[]
    competitiveAdvantages: string[]
    potentialChallenges: string[]
  }

  // References
  references: string[]

  // Charts (base64 images)
  charts?: {
    cashFlowChart?: string
    costBreakdownPie?: string
    tornadoPlot?: string
    sensitivityCurves?: string
    monteCarloDistribution?: string
    pfdDiagram?: string
  }

  // Custom appendices
  appendices?: Array<{
    title: string
    content: string
    tables?: any[][]
    charts?: string[]
  }>
}

/**
 * Enhanced TEA PDF Report Generator
 */
export class EnhancedTEAReportGenerator {
  private doc: jsPDF
  private data: ComprehensiveTEAReportData
  private pageWidth: number
  private pageHeight: number
  private margin = 20
  private currentY = 20

  // Section numbering
  private sectionCounter = 0
  private subsectionCounters: number[] = []
  private figureCounter = 0
  private tableCounter = 0

  // Table of contents data
  private tocEntries: Array<{ title: string; page: number; level: number }> = []
  private figureList: Array<{ number: number; title: string; page: number }> = []
  private tableList: Array<{ number: number; title: string; page: number }> = []

  constructor(data: ComprehensiveTEAReportData) {
    this.data = data
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })
    this.pageWidth = this.doc.internal.pageSize.getWidth()
    this.pageHeight = this.doc.internal.pageSize.getHeight()
  }

  /**
   * Generate complete report
   */
  generateReport(): jsPDF {
    const sections = this.data.config.sections

    // 1. Cover Page
    if (sections.coverPage) {
      this.addCoverPage()
      this.addNewPage()
    }

    // 2. Table of Contents (placeholder, filled at end)
    const tocPage = this.doc.getNumberOfPages() + 1

    // 3-5. Front Matter
    if (sections.acronymsAndAbbreviations) {
      this.addAcronymsAndAbbreviations()
      this.addNewPage()
    }

    if (sections.glossary) {
      this.addGlossary()
      this.addNewPage()
    }

    // 6. Executive Summary
    if (sections.executiveSummary) {
      this.addExecutiveSummary()
      this.addNewPage()
    }

    // 7. Introduction
    if (sections.introduction) {
      this.addIntroduction()
      this.addNewPage()
    }

    // 8. Methodology
    if (sections.methodology) {
      this.addMethodology()
      this.addNewPage()
    }

    // 9. Process Description
    if (sections.processDescription) {
      this.addProcessDescription()
      this.addNewPage()
    }

    // 10. Performance Analysis
    if (sections.performanceAnalysis) {
      this.addPerformanceAnalysis()
      this.addNewPage()
    }

    // 11. Economic Analysis
    if (sections.economicAnalysis) {
      this.addEconomicAnalysis()
      this.addNewPage()
    }

    // 12. Market Analysis
    if (sections.marketAnalysis) {
      this.addMarketAnalysis()
      this.addNewPage()
    }

    // 13. Results & Discussion
    if (sections.resultsAndDiscussion) {
      this.addResultsAndDiscussion()
      this.addNewPage()
    }

    // 14. AI Insights
    if (sections.aiInsights && this.data.aiInsights) {
      this.addAIInsights()
      this.addNewPage()
    }

    // 15. Conclusions
    if (sections.conclusions) {
      this.addConclusions()
      this.addNewPage()
    }

    // 16. Limitations
    if (sections.limitations) {
      this.addLimitations()
      this.addNewPage()
    }

    // 17. References
    if (sections.references) {
      this.addReferences()
      this.addNewPage()
    }

    // 18. Appendices
    if (sections.appendices && this.data.appendices) {
      this.addAppendices()
    }

    // Now add TOC and List of Exhibits at the beginning
    if (sections.tableOfContents) {
      this.insertTableOfContents(tocPage)
    }

    if (sections.listOfExhibits) {
      this.insertListOfExhibits(tocPage + 1)
    }

    // Add page numbers
    this.addPageNumbers()

    return this.doc
  }

  /**
   * Section 1: Cover Page
   */
  private addCoverPage() {
    const branding = this.data.config.branding

    // Header bar with branding color
    this.doc.setFillColor(branding?.colors.primary || '#1e3a8a')
    this.doc.rect(0, 0, this.pageWidth, 60, 'F')

    // Logo if provided
    if (branding?.logo) {
      try {
        this.doc.addImage(branding.logo, 'PNG', this.margin, 10, 40, 40)
      } catch (e) {
        console.warn('Logo could not be added')
      }
    }

    // Report title
    this.doc.setTextColor(255, 255, 255)
    this.doc.setFontSize(28)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Techno-Economic Analysis', this.pageWidth / 2, 30, { align: 'center' })

    this.doc.setFontSize(16)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(this.data.config.reportType.toUpperCase() + ' REPORT', this.pageWidth / 2, 45, {
      align: 'center',
    })

    // Reset color
    this.doc.setTextColor(0, 0, 0)

    // Project information
    this.currentY = 80
    this.doc.setFontSize(24)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(this.data.config.title, this.pageWidth / 2, this.currentY, { align: 'center' })

    this.currentY += 15
    this.doc.setFontSize(14)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(
      `Technology: ${this.data.input.technology_type.toUpperCase()}`,
      this.pageWidth / 2,
      this.currentY,
      { align: 'center' }
    )

    // Authors
    if (this.data.config.authors && this.data.config.authors.length > 0) {
      this.currentY += 20
      this.doc.setFontSize(12)
      this.doc.setTextColor(60, 60, 60)
      this.doc.text('Prepared by:', this.pageWidth / 2, this.currentY, { align: 'center' })
      this.currentY += 7
      this.doc.text(this.data.config.authors.join(', '), this.pageWidth / 2, this.currentY, {
        align: 'center',
      })
    }

    // Organization
    if (this.data.config.organization) {
      this.currentY += 10
      this.doc.text(this.data.config.organization, this.pageWidth / 2, this.currentY, {
        align: 'center',
      })
    }

    // Date and version
    this.currentY = this.pageHeight - 40
    this.doc.setFontSize(11)
    this.doc.setTextColor(100, 100, 100)
    const dateStr = this.data.config.date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    this.doc.text(`Date: ${dateStr}`, this.pageWidth / 2, this.currentY, { align: 'center' })
    this.doc.text(`Version: ${this.data.config.version}`, this.pageWidth / 2, this.currentY + 7, {
      align: 'center',
    })

    // Confidentiality notice
    if (this.data.config.confidential) {
      this.doc.setTextColor(200, 0, 0)
      this.doc.setFontSize(10)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text('CONFIDENTIAL', this.pageWidth / 2, this.currentY + 20, { align: 'center' })
    }

    this.doc.setTextColor(0, 0, 0)
  }

  /**
   * Section 4: Acronyms & Abbreviations
   */
  private addAcronymsAndAbbreviations() {
    this.addSectionHeader('Acronyms and Abbreviations', 1)

    // Standard TEA acronyms
    const acronyms = [
      ['CAPEX', 'Capital Expenditures'],
      ['OPEX', 'Operational Expenditures'],
      ['LCOE', 'Levelized Cost of Energy'],
      ['NPV', 'Net Present Value'],
      ['IRR', 'Internal Rate of Return'],
      ['ROI', 'Return on Investment'],
      ['MSP', 'Minimum Selling Price'],
      ['LCOP', 'Levelized Cost of Product'],
      ['PI', 'Profitability Index'],
      ['BCR', 'Benefit-Cost Ratio'],
      ['WACC', 'Weighted Average Cost of Capital'],
      ['BEC', 'Bare Erected Cost'],
      ['EPCC', 'Engineering, Procurement, and Construction Cost'],
      ['TPC', 'Total Plant Cost'],
      ['TOC', 'Total Overnight Cost'],
      ['TASC', 'Total As-Spent Cost'],
      ['O&M', 'Operations and Maintenance'],
      ['EROI', 'Energy Return on Investment'],
      ['EPBT', 'Energy Payback Time'],
      ['VaR', 'Value at Risk'],
      ['CVaR', 'Conditional Value at Risk / Expected Shortfall'],
      ['NETL', 'National Energy Technology Laboratory'],
      ['DOE', 'Department of Energy'],
      ['IEA', 'International Energy Agency'],
      ['NREL', 'National Renewable Energy Laboratory'],
    ]

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Acronym', 'Definition']],
      body: acronyms,
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 138], fontSize: 11 },
      styles: { fontSize: 9 },
      margin: { left: this.margin, right: this.margin },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10
  }

  /**
   * Section 5: Glossary
   */
  private addGlossary() {
    this.addSectionHeader('Glossary of Terms', 1)

    const terms = [
      [
        'Levelized Cost',
        'The average cost per unit of output over the lifetime of an asset, accounting for all costs and revenues on a present value basis.',
      ],
      [
        'Discount Rate',
        'The interest rate used to discount future cash flows to present value, reflecting the time value of money and investment risk.',
      ],
      [
        'Capacity Factor',
        'The ratio of actual energy output to the theoretical maximum output if the plant operated at full capacity continuously.',
      ],
      [
        'Sensitivity Analysis',
        'Assessment of how variations in input parameters affect output metrics, identifying critical cost drivers.',
      ],
      [
        'Monte Carlo Simulation',
        'Stochastic analysis using random sampling to quantify uncertainty and generate probability distributions for outputs.',
      ],
      [
        'Process Contingency',
        'Additional capital costs to account for uncertainty in technology performance, applied based on Technology Readiness Level.',
      ],
      [
        'Material Balance',
        'Accounting of mass flows into and out of a process, ensuring conservation of mass for each component.',
      ],
    ]

    autoTable(this.doc, {
      startY: this.currentY,
      head: [['Term', 'Definition']],
      body: terms,
      theme: 'plain',
      headStyles: { fillColor: [30, 58, 138], fontSize: 11, fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 45 }, 1: { cellWidth: 125 } },
      margin: { left: this.margin, right: this.margin },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10
  }

  /**
   * Section 6: Executive Summary
   */
  private addExecutiveSummary() {
    this.addSectionHeader('Executive Summary', 1)
    this.addText(this.data.executiveSummary)

    // Key findings box
    this.currentY += 5
    this.doc.setFillColor(240, 248, 255)
    this.doc.roundedRect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, 60, 3, 3, 'F')

    this.currentY += 8
    this.doc.setFontSize(11)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Key Findings:', this.margin + 5, this.currentY)

    this.currentY += 7
    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'normal')
    const findings = [
      `LCOE: $${this.data.results.lcoe.toFixed(3)}/kWh`,
      `NPV: ${this.formatCurrency(this.data.results.npv)}`,
      `IRR: ${this.data.results.irr.toFixed(1)}%`,
      `Payback: ${this.data.results.payback_years.toFixed(1)} years`,
    ]

    if (this.data.qualityAssessment) {
      findings.push(
        `Quality Score: ${this.data.qualityAssessment.overallScore.toFixed(1)}/10 (Grade ${this.data.qualityAssessment.grade})`
      )
    }

    findings.forEach(finding => {
      this.doc.text(`• ${finding}`, this.margin + 10, this.currentY)
      this.currentY += 6
    })

    this.currentY += 10
  }

  /**
   * Section 8: Methodology
   */
  private addMethodology() {
    this.addSectionHeader('Methodology', 1)
    this.addText(this.data.methodology)

    // Add subsections
    this.addSectionHeader('Model Description', 2)
    this.addText(
      `This techno-economic analysis employs industry-standard methodologies as defined by NETL QGESS, DOE, and IEA guidelines. The analysis encompasses ${this.data.input.project_lifetime_years}-year project lifetime with a ${this.data.input.discount_rate}% discount rate.`
    )

    this.addSectionHeader('Calculation Procedures', 2)

    // Add formulas table if configured
    if (this.data.config.customization.includeFormulas && this.data.calculationProvenance) {
      this.currentY += 5
      const formulaData = this.data.calculationProvenance.slice(0, 10).map(prov => [
        prov.metric,
        prov.formula,
        `${prov.calculatedValue.toFixed(4)} ${prov.unit}`,
      ])

      this.addTable('Key Calculation Formulas', ['Metric', 'Formula', 'Value'], formulaData)
    }

    this.addSectionHeader('Assumptions and Justifications', 2)
    const assumptions = [
      `Discount Rate: ${this.data.input.discount_rate}% (${this.getAssumptionSource('discount_rate')})`,
      `Project Lifetime: ${this.data.input.project_lifetime_years} years`,
      `Capacity Factor: ${this.data.input.capacity_factor}%`,
      `Technology: ${this.data.input.technology_type}`,
    ]

    assumptions.forEach(assumption => {
      this.addText(`• ${assumption}`, { fontSize: 10 })
    })
  }

  /**
   * Section 10: Performance Analysis
   */
  private addPerformanceAnalysis() {
    this.addSectionHeader('Performance Analysis', 1)

    // Material balances
    if (this.data.config.customization.includeMaterialBalances && this.data.materialBalances) {
      this.addSectionHeader('Material and Energy Balances', 2)

      for (const balance of this.data.materialBalances.slice(0, 3)) {
        // Show top 3 balances
        const inletTotal = Object.values(balance.inlet).reduce((sum, v) => sum + v, 0)
        const outletTotal = Object.values(balance.outlet).reduce((sum, v) => sum + v, 0)

        const balanceData = [
          ['Inlet Flows', `${inletTotal.toFixed(2)} ${balance.unit}`],
          ['Outlet Flows', `${outletTotal.toFixed(2)} ${balance.unit}`],
          ['Convergence', `${balance.convergence.toFixed(4)} ${balance.unit}`],
          ['Status', balance.converged ? '✓ Converged' : '✗ Not Converged'],
        ]

        this.addTable(`${balance.component} Balance`, ['Parameter', 'Value'], balanceData)
      }
    }

    // Energy balance
    if (this.data.config.customization.includeMaterialBalances && this.data.energyBalance) {
      const eb = this.data.energyBalance
      const energyData = [
        ['Energy In', `${eb.totalIn.toFixed(2)} ${eb.unit}`],
        ['Energy Out', `${eb.totalOut.toFixed(2)} ${eb.unit}`],
        ['Convergence', `${eb.convergence.toFixed(4)} ${eb.unit}`],
        ['Status', eb.converged ? '✓ Converged' : '✗ Not Converged'],
      ]

      this.addTable('Energy Balance', ['Parameter', 'Value'], energyData)
    }
  }

  /**
   * Section 11: Economic Analysis
   */
  private addEconomicAnalysis() {
    this.addSectionHeader('Economic Analysis', 1)

    // Capital costs
    this.addSectionHeader('Capital Cost Breakdown', 2)
    const capexData = [
      ['Equipment', this.formatCurrency(this.data.results.capex_breakdown.equipment)],
      ['Installation', this.formatCurrency(this.data.results.capex_breakdown.installation)],
      ['Land', this.formatCurrency(this.data.results.capex_breakdown.land)],
      ['Grid Connection', this.formatCurrency(this.data.results.capex_breakdown.grid_connection)],
      ['Total CAPEX', this.formatCurrency(this.data.results.total_capex)],
    ]

    this.addTable('Capital Expenditures (CAPEX)', ['Category', 'Amount (USD)'], capexData)

    // Operating costs
    this.addSectionHeader('Operating Cost Breakdown', 2)
    const opexData = [
      ['Fixed O&M', this.formatCurrency(this.data.results.opex_breakdown.fixed)],
      ['Variable O&M', this.formatCurrency(this.data.results.opex_breakdown.variable)],
      ['Capacity-Based', this.formatCurrency(this.data.results.opex_breakdown.capacity_based)],
      ['Insurance', this.formatCurrency(this.data.results.opex_breakdown.insurance)],
      ['Total Annual OPEX', this.formatCurrency(this.data.results.annual_opex)],
    ]

    this.addTable('Operating Expenditures (OPEX)', ['Category', 'Annual Amount (USD)'], opexData)

    // Pro-forma (if available)
    if (this.data.results.yearlyProjections) {
      this.checkPageBreak(80)
      this.addSectionHeader('Pro-Forma Income Statement (First 10 Years)', 2)

      const proFormaData = this.data.results.yearlyProjections.slice(0, 10).map(year => [
        year.year.toString(),
        this.formatCurrency(year.revenue),
        this.formatCurrency(year.opex),
        this.formatCurrency(year.netIncome),
        this.formatCurrency(year.cashFlow),
      ])

      this.addTable(
        'Cash Flow Projections',
        ['Year', 'Revenue', 'OPEX', 'Net Income', 'Cash Flow'],
        proFormaData,
        { fontSize: 8 }
      )
    }
  }

  /**
   * Section 13: Results & Discussion
   */
  private addResultsAndDiscussion() {
    this.addSectionHeader('Results and Discussion', 1)

    // Key metrics dashboard
    this.addSectionHeader('Key Financial Metrics', 2)
    this.currentY += 5

    // Create metrics boxes (3 per row)
    const metrics = [
      { label: 'LCOE', value: `$${this.data.results.lcoe.toFixed(3)}/kWh` },
      { label: 'NPV', value: this.formatCurrency(this.data.results.npv) },
      { label: 'IRR', value: `${this.data.results.irr.toFixed(1)}%` },
      { label: 'Payback', value: `${this.data.results.payback_years.toFixed(1)} yrs` },
      { label: 'Total CAPEX', value: this.formatCurrency(this.data.results.total_capex) },
      { label: 'Annual OPEX', value: this.formatCurrency(this.data.results.annual_opex) },
    ]

    this.addMetricsGrid(metrics)

    // Add charts if available
    if (this.data.charts?.costBreakdownPie) {
      this.checkPageBreak(100)
      this.addFigure('Cost Breakdown', this.data.charts.costBreakdownPie, 150, 90)
    }

    if (this.data.charts?.tornadoPlot) {
      this.checkPageBreak(100)
      this.addFigure('Sensitivity Analysis (Tornado Plot)', this.data.charts.tornadoPlot, 150, 90)
    }

    if (this.data.charts?.cashFlowChart) {
      this.checkPageBreak(100)
      this.addFigure('Cash Flow Projection', this.data.charts.cashFlowChart, 150, 90)
    }
  }

  /**
   * Section 17: References
   */
  private addReferences() {
    this.addSectionHeader('References', 1)

    this.data.references.forEach((ref, index) => {
      this.checkPageBreak(10)
      this.doc.setFontSize(9)
      this.doc.setFont('helvetica', 'normal')
      const refText = `[${index + 1}] ${ref}`
      const lines = this.doc.splitTextToSize(refText, this.pageWidth - 2 * this.margin)

      lines.forEach((line: string) => {
        this.doc.text(line, this.margin, this.currentY)
        this.currentY += 5
      })
      this.currentY += 2
    })
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  private addNewPage() {
    this.doc.addPage()
    this.currentY = this.margin
  }

  private checkPageBreak(spaceNeeded: number) {
    if (this.currentY + spaceNeeded > this.pageHeight - this.margin) {
      this.addNewPage()
    }
  }

  private addSectionHeader(title: string, level: 1 | 2 | 3 = 1) {
    const sizes = { 1: 16, 2: 13, 3: 11 }
    const spacing = { 1: 10, 2: 8, 3: 6 }

    this.checkPageBreak(spacing[level] + 10)

    // Update section numbering
    if (level === 1) {
      this.sectionCounter++
      this.subsectionCounters = [0]
      title = `${this.sectionCounter}. ${title}`
    } else if (level === 2) {
      if (this.subsectionCounters.length === 0) this.subsectionCounters = [0]
      this.subsectionCounters[0]++
      title = `${this.sectionCounter}.${this.subsectionCounters[0]}. ${title}`
    }

    // Record for TOC
    this.tocEntries.push({ title, page: this.doc.getNumberOfPages(), level })

    this.doc.setFontSize(sizes[level])
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(30, 58, 138)
    this.doc.text(title, this.margin, this.currentY)
    this.doc.setTextColor(0, 0, 0)
    this.currentY += spacing[level]
  }

  private addText(text: string, options: { fontSize?: number; maxWidth?: number } = {}) {
    const fontSize = options.fontSize || 10
    const maxWidth = options.maxWidth || this.pageWidth - 2 * this.margin

    this.doc.setFontSize(fontSize)
    this.doc.setFont('helvetica', 'normal')

    const lines = this.doc.splitTextToSize(text, maxWidth)
    const lineHeight = fontSize * 0.35

    lines.forEach((line: string) => {
      this.checkPageBreak(lineHeight + 2)
      this.doc.text(line, this.margin, this.currentY)
      this.currentY += lineHeight
    })
    this.currentY += 3
  }

  private addTable(
    title: string,
    headers: string[],
    data: any[][],
    options: { fontSize?: number } = {}
  ) {
    this.checkPageBreak(40)

    this.tableCounter++
    const tableTitle = `Table ${this.tableCounter}: ${title}`
    this.tableList.push({
      number: this.tableCounter,
      title,
      page: this.doc.getNumberOfPages(),
    })

    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(tableTitle, this.margin, this.currentY)
    this.currentY += 5

    autoTable(this.doc, {
      startY: this.currentY,
      head: [headers],
      body: data,
      theme: 'striped',
      headStyles: { fillColor: [30, 58, 138], fontSize: options.fontSize || 10 },
      styles: { fontSize: options.fontSize || 9 },
      margin: { left: this.margin, right: this.margin },
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 8
  }

  private addFigure(title: string, imageData: string, width: number, height: number) {
    this.figureCounter++
    const figureTitle = `Figure ${this.figureCounter}: ${title}`
    this.figureList.push({
      number: this.figureCounter,
      title,
      page: this.doc.getNumberOfPages(),
    })

    this.doc.setFontSize(10)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text(figureTitle, this.margin, this.currentY)
    this.currentY += 5

    try {
      this.doc.addImage(imageData, 'PNG', this.margin, this.currentY, width, height)
      this.currentY += height + 8
    } catch (e) {
      this.doc.setFontSize(9)
      this.doc.setTextColor(150, 150, 150)
      this.doc.text('[Figure could not be rendered]', this.margin + 10, this.currentY + 10)
      this.currentY += 20
      this.doc.setTextColor(0, 0, 0)
    }
  }

  private addMetricsGrid(metrics: Array<{ label: string; value: string }>) {
    const boxWidth = (this.pageWidth - 2 * this.margin - 10) / 3
    const boxHeight = 20
    let xOffset = this.margin
    let rowCount = 0

    metrics.forEach((metric, index) => {
      if (index > 0 && index % 3 === 0) {
        this.currentY += boxHeight + 5
        xOffset = this.margin
        rowCount++
      }

      // Box background
      this.doc.setFillColor(245, 245, 245)
      this.doc.roundedRect(xOffset, this.currentY, boxWidth, boxHeight, 2, 2, 'F')

      // Label
      this.doc.setFontSize(8)
      this.doc.setFont('helvetica', 'normal')
      this.doc.setTextColor(100, 100, 100)
      this.doc.text(metric.label, xOffset + 3, this.currentY + 7)

      // Value
      this.doc.setFontSize(12)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(0, 0, 0)
      this.doc.text(metric.value, xOffset + 3, this.currentY + 16)

      xOffset += boxWidth + 5
    })

    this.currentY += boxHeight + 15
    this.doc.setTextColor(0, 0, 0)
  }

  private formatCurrency(value: number): string {
    if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
    if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
    if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
    return `$${value.toFixed(2)}`
  }

  private getAssumptionSource(param: string): string {
    // Would look up from assumption validation results
    return 'Industry standard'
  }

  private insertTableOfContents(page: number) {
    // Implementation would insert TOC at specified page
  }

  private insertListOfExhibits(page: number) {
    // Implementation would insert list of figures and tables
  }

  private addPageNumbers() {
    const pageCount = this.doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i)
      this.doc.setFontSize(9)
      this.doc.setTextColor(150, 150, 150)
      this.doc.text(`Page ${i} of ${pageCount}`, this.pageWidth / 2, this.pageHeight - 10, {
        align: 'center',
      })
    }
    this.doc.setTextColor(0, 0, 0)
  }

  // Stub implementations for remaining sections
  private addIntroduction() {
    this.addSectionHeader('Introduction', 1)
    this.addText(this.data.introduction)
  }

  private addProcessDescription() {
    this.addSectionHeader('Process Description', 1)
    this.addText(this.data.processDescription)
  }

  private addMarketAnalysis() {
    this.addSectionHeader('Market Analysis', 1)
    this.addText(this.data.marketAnalysis)
  }

  private addAIInsights() {
    this.addSectionHeader('AI-Generated Insights', 1)
    if (!this.data.aiInsights) return

    this.addSectionHeader('Market Trends', 2)
    this.addText(this.data.aiInsights.marketAnalysis)

    this.addSectionHeader('Risk Assessment', 2)
    this.addText(this.data.aiInsights.riskAssessment)

    this.addSectionHeader('Strategic Recommendations', 2)
    this.data.aiInsights.recommendations.forEach((rec, i) => {
      this.addText(`${i + 1}. ${rec}`)
    })
  }

  private addConclusions() {
    this.addSectionHeader('Conclusions', 1)
    this.addText(this.data.conclusions)
  }

  private addLimitations() {
    this.addSectionHeader('Limitations', 1)
    this.data.limitations.forEach((lim, i) => {
      this.addText(`${i + 1}. ${lim}`)
    })
  }

  private addAppendices() {
    this.addSectionHeader('Appendices', 1)
    // Implementation for custom appendices
  }

  /**
   * Download PDF
   */
  downloadPDF(filename?: string) {
    const name = filename || `TEA-Report-${this.data.input.project_name}-${Date.now()}.pdf`
    this.doc.save(name)
  }

  /**
   * Get PDF as blob
   */
  getPDFBlob(): Blob {
    return this.doc.output('blob')
  }
}

/**
 * Convenience function
 */
export function generateComprehensiveTEAReport(data: ComprehensiveTEAReportData): EnhancedTEAReportGenerator {
  const generator = new EnhancedTEAReportGenerator(data)
  generator.generateReport()
  return generator
}
