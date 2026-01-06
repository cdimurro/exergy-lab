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
import { registerCustomFonts, FONTS, TYPOGRAPHY } from '../fonts'

/**
 * Professional color palette for TEA reports
 * Based on Exergy Lab design system with blue primary and emerald accent
 */
const COLORS = {
  // Primary palette
  primary: [30, 58, 138] as [number, number, number],      // Deep blue (#1e3a8a)
  primaryLight: [59, 130, 246] as [number, number, number], // Light blue (#3b82f6)
  accent: [16, 185, 129] as [number, number, number],      // Emerald (#10b981)

  // Semantic colors
  success: [34, 197, 94] as [number, number, number],      // Green (#22c55e)
  warning: [245, 158, 11] as [number, number, number],     // Amber (#f59e0b)
  error: [239, 68, 68] as [number, number, number],        // Red (#ef4444)

  // Neutral palette
  text: [17, 24, 39] as [number, number, number],          // Gray-900 (#111827)
  textSecondary: [75, 85, 99] as [number, number, number], // Gray-600 (#4b5563)
  textMuted: [156, 163, 175] as [number, number, number],  // Gray-400 (#9ca3af)
  border: [229, 231, 235] as [number, number, number],     // Gray-200 (#e5e7eb)
  background: [249, 250, 251] as [number, number, number], // Gray-50 (#f9fafb)
  backgroundAlt: [243, 244, 246] as [number, number, number], // Gray-100 (#f3f4f6)
  white: [255, 255, 255] as [number, number, number],
} as const

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

  // PDF Outline/Bookmarks tracking
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private bookmarkStack: any[] = []

  constructor(data: ComprehensiveTEAReportData) {
    this.data = data
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    // Register custom Inter font family for professional typography
    registerCustomFonts(this.doc)

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
   * Section 1: Cover Page - Professional design with metrics summary
   */
  private addCoverPage() {
    const branding = this.data.config.branding

    // Full-bleed header with primary color
    this.doc.setFillColor(...COLORS.primary)
    this.doc.rect(0, 0, this.pageWidth, 65, 'F')

    // Accent stripe below header
    this.doc.setFillColor(...COLORS.accent)
    this.doc.rect(0, 65, this.pageWidth, 3, 'F')

    // Logo if provided, otherwise show "Exergy Lab" text
    if (branding?.logo) {
      try {
        this.doc.addImage(branding.logo, 'PNG', this.margin, 12, 35, 35)
      } catch {
        // Fallback to text
        this.doc.setTextColor(...COLORS.white)
        this.doc.setFontSize(18)
        this.doc.setFont(FONTS.body, 'bold')
        this.doc.text('Exergy Lab', this.margin, 28)
      }
    } else {
      this.doc.setTextColor(...COLORS.white)
      this.doc.setFontSize(18)
      this.doc.setFont(FONTS.body, 'bold')
      this.doc.text('Exergy Lab', this.margin, 28)
      this.doc.setFontSize(9)
      this.doc.setFont(FONTS.body, 'normal')
      this.doc.text('AI-Powered Clean Energy Research', this.margin, 36)
    }

    // Report type badge (top right)
    const badgeWidth = 55
    const badgeX = this.pageWidth - this.margin - badgeWidth
    this.doc.setFillColor(...COLORS.white)
    this.doc.roundedRect(badgeX, 18, badgeWidth, 18, 2, 2, 'F')
    this.doc.setTextColor(...COLORS.primary)
    this.doc.setFontSize(9)
    this.doc.setFont(FONTS.body, 'bold')
    this.doc.text(this.data.config.reportType.toUpperCase(), badgeX + badgeWidth / 2, 29, {
      align: 'center',
    })

    // Main title section
    this.doc.setTextColor(...COLORS.white)
    this.doc.setFontSize(22)
    this.doc.setFont(FONTS.body, 'bold')
    this.doc.text('Techno-Economic Analysis', this.pageWidth / 2, 52, { align: 'center' })

    // Project title
    this.currentY = 85
    this.doc.setTextColor(...COLORS.text)
    this.doc.setFontSize(20)
    this.doc.setFont(FONTS.body, 'bold')
    const titleLines = this.doc.splitTextToSize(this.data.config.title, this.pageWidth - 2 * this.margin)
    titleLines.forEach((line: string) => {
      this.doc.text(line, this.pageWidth / 2, this.currentY, { align: 'center' })
      this.currentY += 9
    })

    // Technology type
    this.currentY += 5
    this.doc.setFontSize(13)
    this.doc.setFont(FONTS.body, 'normal')
    this.doc.setTextColor(...COLORS.textSecondary)
    this.doc.text(
      `Technology: ${this.data.input.technology_type.replace(/_/g, ' ').toUpperCase()}`,
      this.pageWidth / 2,
      this.currentY,
      { align: 'center' }
    )

    // Key metrics summary box
    this.currentY += 20
    const boxHeight = 55
    this.doc.setFillColor(...COLORS.backgroundAlt)
    this.doc.roundedRect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, boxHeight, 4, 4, 'F')

    // Draw accent left border on metrics box
    this.doc.setFillColor(...COLORS.accent)
    this.doc.rect(this.margin, this.currentY, 4, boxHeight, 'F')

    // Metrics grid (3 columns)
    const metricsBoxPadding = 12
    const colWidth = (this.pageWidth - 2 * this.margin - 2 * metricsBoxPadding) / 3
    const metricsY = this.currentY + 15

    const metrics = [
      { label: 'LCOE', value: `$${this.data.results.lcoe.toFixed(3)}/kWh` },
      { label: 'NPV', value: this.formatCurrency(this.data.results.npv) },
      { label: 'IRR', value: `${this.data.results.irr.toFixed(1)}%` },
    ]

    metrics.forEach((metric, i) => {
      const x = this.margin + metricsBoxPadding + i * colWidth

      // Label
      this.doc.setFont(FONTS.body, 'normal')
      this.doc.setFontSize(9)
      this.doc.setTextColor(...COLORS.textMuted)
      this.doc.text(metric.label, x, metricsY)

      // Value
      this.doc.setFont(FONTS.body, 'bold')
      this.doc.setFontSize(16)
      this.doc.setTextColor(...COLORS.primary)
      this.doc.text(metric.value, x, metricsY + 14)
    })

    // Secondary metrics row
    const secondaryMetrics = [
      { label: 'Payback Period', value: `${this.data.results.payback_years.toFixed(1)} years` },
      { label: 'Total CAPEX', value: this.formatCurrency(this.data.results.total_capex) },
      { label: 'Annual OPEX', value: this.formatCurrency(this.data.results.annual_opex) },
    ]

    const secondaryY = metricsY + 28
    secondaryMetrics.forEach((metric, i) => {
      const x = this.margin + metricsBoxPadding + i * colWidth

      this.doc.setFont(FONTS.body, 'normal')
      this.doc.setFontSize(8)
      this.doc.setTextColor(...COLORS.textMuted)
      this.doc.text(metric.label, x, secondaryY)

      this.doc.setFont(FONTS.body, 'bold')
      this.doc.setFontSize(11)
      this.doc.setTextColor(...COLORS.textSecondary)
      this.doc.text(metric.value, x, secondaryY + 8)
    })

    this.currentY += boxHeight + 15

    // Authors
    if (this.data.config.authors && this.data.config.authors.length > 0) {
      this.doc.setFontSize(10)
      this.doc.setFont(FONTS.body, 'normal')
      this.doc.setTextColor(...COLORS.textMuted)
      this.doc.text('Prepared by:', this.pageWidth / 2, this.currentY, { align: 'center' })
      this.currentY += 6
      this.doc.setTextColor(...COLORS.text)
      this.doc.text(this.data.config.authors.join(', '), this.pageWidth / 2, this.currentY, {
        align: 'center',
      })
      this.currentY += 8
    }

    // Organization
    if (this.data.config.organization) {
      this.doc.setTextColor(...COLORS.textSecondary)
      this.doc.text(this.data.config.organization, this.pageWidth / 2, this.currentY, {
        align: 'center',
      })
    }

    // Footer section
    this.currentY = this.pageHeight - 35
    this.doc.setFontSize(9)
    this.doc.setTextColor(...COLORS.textMuted)
    const dateStr = this.data.config.date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    this.doc.text(`Generated: ${dateStr}`, this.margin, this.currentY)
    this.doc.text(`Version ${this.data.config.version}`, this.pageWidth - this.margin, this.currentY, {
      align: 'right',
    })

    // Confidentiality badge
    if (this.data.config.confidential) {
      this.currentY += 12
      const confBadgeWidth = 70
      this.doc.setFillColor(...COLORS.error)
      this.doc.roundedRect(this.pageWidth / 2 - confBadgeWidth / 2, this.currentY - 4, confBadgeWidth, 12, 2, 2, 'F')
      this.doc.setTextColor(...COLORS.white)
      this.doc.setFont(FONTS.body, 'bold')
      this.doc.setFontSize(8)
      this.doc.text('CONFIDENTIAL', this.pageWidth / 2, this.currentY + 4, { align: 'center' })
    }

    // Reset colors
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
    this.doc.setFont(FONTS.body, 'bold')
    this.doc.text('Key Findings:', this.margin + 5, this.currentY)

    this.currentY += 7
    this.doc.setFontSize(10)
    this.doc.setFont(FONTS.body, 'normal')
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

    // Exergy Analysis (Second-Law Efficiency)
    if (this.data.results.extendedMetrics?.exergy) {
      this.addExergyAnalysisSection()
    }
  }

  /**
   * Exergy Analysis Subsection (Second-Law Thermodynamic Efficiency)
   */
  private addExergyAnalysisSection() {
    const exergy = this.data.results.extendedMetrics?.exergy
    if (!exergy) return

    this.checkPageBreak(80)
    this.addSectionHeader('Exergy Analysis (Second-Law Efficiency)', 2)

    // Introduction text
    this.doc.setFontSize(10)
    this.doc.setFont(FONTS.body, 'normal')
    this.doc.setTextColor(60, 60, 60)
    const introText =
      'Exergy analysis evaluates energy quality rather than just quantity. ' +
      'While first-law efficiency measures energy conservation, second-law efficiency ' +
      'measures how well the system converts available work potential (exergy) from input to output.'
    const introLines = this.doc.splitTextToSize(introText, this.pageWidth - 2 * this.margin)
    introLines.forEach((line: string) => {
      this.doc.text(line, this.margin, this.currentY)
      this.currentY += 5
    })
    this.currentY += 5

    // Exergy metrics table
    const exergyData = [
      [
        'Applied Exergy Leverage',
        exergy.appliedExergyLeverage.toFixed(3),
        'Combined efficiency and output quality score',
      ],
      [
        'Second-Law Efficiency',
        `${(exergy.secondLawEfficiency * 100).toFixed(1)}%`,
        'Exergy output / Exergy input',
      ],
      [
        'First-Law Efficiency',
        `${(exergy.firstLawEfficiency * 100).toFixed(1)}%`,
        'Energy output / Energy input',
      ],
      [
        'Exergy Destruction',
        `${(exergy.exergyDestructionRatio * 100).toFixed(1)}%`,
        'Fraction of exergy lost to irreversibilities',
      ],
      [
        'Fossil Comparison',
        `${exergy.fossilComparisonMultiple.toFixed(2)}x`,
        `vs. ${exergy.fossilEquivalentTechnology}`,
      ],
    ]

    this.addTable(
      'Device-Level Exergy Metrics',
      ['Metric', 'Value', 'Description'],
      exergyData,
      { fontSize: 9 }
    )

    // Fossil comparison callout box
    this.checkPageBreak(30)
    this.currentY += 5
    const boxStartY = this.currentY

    // Draw callout box with green left border
    this.doc.setDrawColor(34, 197, 94) // Green border
    this.doc.setLineWidth(1.5)
    this.doc.line(this.margin, boxStartY, this.margin, boxStartY + 20)

    // Light green background
    this.doc.setFillColor(240, 253, 244)
    this.doc.rect(this.margin + 2, boxStartY, this.pageWidth - 2 * this.margin - 2, 20, 'F')

    // Statement text
    this.doc.setTextColor(22, 101, 52) // Dark green text
    this.doc.setFontSize(10)
    this.doc.setFont(FONTS.body, 'normal')
    const statementLines = this.doc.splitTextToSize(
      exergy.fossilComparisonStatement,
      this.pageWidth - 2 * this.margin - 10
    )
    let textY = boxStartY + 7
    statementLines.forEach((line: string) => {
      this.doc.text(line, this.margin + 5, textY)
      textY += 5
    })

    this.currentY = boxStartY + 25

    // Confidence indicator
    this.doc.setTextColor(100, 100, 100)
    this.doc.setFontSize(8)
    this.doc.setFont(FONTS.body, 'normal')
    const confidenceLabel =
      exergy.confidence === 'high'
        ? 'High Confidence'
        : exergy.confidence === 'medium'
          ? 'Medium Confidence'
          : 'Low Confidence'
    this.doc.text(`Data Confidence: ${confidenceLabel}`, this.margin, this.currentY)
    this.currentY += 4
    this.doc.text(`Source: ${exergy.dataSource}`, this.margin, this.currentY)

    // Reset text color
    this.doc.setTextColor(0, 0, 0)
    this.currentY += 10
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
      this.doc.setFont(FONTS.body, 'normal')
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

    // Add PDF bookmark for level 1 and 2 headers (visible in PDF reader sidebar)
    if (level <= 2) {
      this.addBookmark(title, level)
    }

    this.doc.setFontSize(sizes[level])
    this.doc.setFont(FONTS.body, 'bold')
    this.doc.setTextColor(30, 58, 138)
    this.doc.text(title, this.margin, this.currentY)
    this.doc.setTextColor(0, 0, 0)
    this.currentY += spacing[level]
  }

  /**
   * Add a PDF bookmark/outline entry for navigation in PDF readers
   */
  private addBookmark(title: string, level: number) {
    const pageNumber = this.doc.getNumberOfPages()

    try {
      // Access jsPDF outline API (may not exist in all versions)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docWithOutline = this.doc as any

      if (typeof docWithOutline.outline?.add === 'function') {
        if (level === 1) {
          // Top-level bookmark (no parent)
          const bookmark = docWithOutline.outline.add(null, title, { pageNumber })
          this.bookmarkStack = [bookmark]
        } else {
          // Nested bookmark (child of most recent level 1)
          const parent = this.bookmarkStack.length > 0 ? this.bookmarkStack[0] : null
          docWithOutline.outline.add(parent, title, { pageNumber })
        }
      }
    } catch {
      // Outline API not available, silently skip
    }
  }

  private addText(text: string, options: { fontSize?: number; maxWidth?: number } = {}) {
    const fontSize = options.fontSize || 10
    const maxWidth = options.maxWidth || this.pageWidth - 2 * this.margin

    this.doc.setFontSize(fontSize)
    this.doc.setFont(FONTS.body, 'normal')

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

    // Table title with accent color
    this.doc.setFontSize(10)
    this.doc.setFont(FONTS.body, 'bold')
    this.doc.setTextColor(...COLORS.text)
    this.doc.text(tableTitle, this.margin, this.currentY)
    this.currentY += 5

    autoTable(this.doc, {
      startY: this.currentY,
      head: [headers],
      body: data,
      theme: 'plain',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontSize: options.fontSize || 10,
        fontStyle: 'bold',
        halign: 'left',
        cellPadding: 4,
      },
      bodyStyles: {
        fontSize: options.fontSize || 9,
        cellPadding: 3,
        textColor: COLORS.text,
      },
      alternateRowStyles: {
        fillColor: COLORS.backgroundAlt,
      },
      styles: {
        font: FONTS.body,
        overflow: 'linebreak',
        lineWidth: 0.1,
        lineColor: COLORS.border,
      },
      margin: { left: this.margin, right: this.margin },
      tableLineColor: COLORS.border,
      tableLineWidth: 0.1,
    })

    this.currentY = (this.doc as any).lastAutoTable.finalY + 10
    this.doc.setTextColor(0, 0, 0)
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
    this.doc.setFont(FONTS.body, 'bold')
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
      this.doc.setFont(FONTS.body, 'normal')
      this.doc.setTextColor(100, 100, 100)
      this.doc.text(metric.label, xOffset + 3, this.currentY + 7)

      // Value
      this.doc.setFontSize(12)
      this.doc.setFont(FONTS.body, 'bold')
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

  /**
   * Insert Table of Contents at the specified page position.
   * Uses two-pass approach: insert pages, shift references, then render content.
   */
  private insertTableOfContents(insertAfterPage: number) {
    // Calculate how many pages we need for the TOC
    const entriesPerPage = 35 // Approximate TOC entries per page
    const tocPageCount = Math.max(1, Math.ceil(this.tocEntries.length / entriesPerPage))

    // Insert blank pages at the specified position
    for (let i = 0; i < tocPageCount; i++) {
      this.doc.insertPage(insertAfterPage + i)
    }

    // Shift all page references by the number of inserted pages
    this.tocEntries.forEach(entry => {
      if (entry.page >= insertAfterPage) {
        entry.page += tocPageCount
      }
    })
    this.figureList.forEach(fig => {
      if (fig.page >= insertAfterPage) {
        fig.page += tocPageCount
      }
    })
    this.tableList.forEach(tbl => {
      if (tbl.page >= insertAfterPage) {
        tbl.page += tocPageCount
      }
    })

    // Render TOC content onto the inserted pages
    let currentPage = insertAfterPage
    this.doc.setPage(currentPage)
    let tocY = this.margin + 10

    // TOC Header
    this.doc.setFontSize(20)
    this.doc.setFont(FONTS.body, 'bold')
    this.doc.setTextColor(30, 58, 138)
    this.doc.text('Table of Contents', this.margin, tocY)
    tocY += 15

    // Reset text color
    this.doc.setTextColor(0, 0, 0)

    // Render TOC entries with dot leaders and clickable links
    let entryCount = 0
    for (const entry of this.tocEntries) {
      // Check if we need a new page
      if (tocY > this.pageHeight - 30) {
        currentPage++
        if (currentPage <= insertAfterPage + tocPageCount - 1) {
          this.doc.setPage(currentPage)
          tocY = this.margin + 10
        } else {
          break // Ran out of TOC pages
        }
      }

      this.renderTOCEntry(entry, tocY)
      tocY += entry.level === 1 ? 7 : 5
      entryCount++
    }
  }

  /**
   * Render a single TOC entry with dot leader and internal link
   */
  private renderTOCEntry(entry: { title: string; page: number; level: number }, y: number) {
    const indent = (entry.level - 1) * 8
    const fontSize = entry.level === 1 ? 11 : 10
    const fontWeight = entry.level === 1 ? 'bold' : 'normal'

    this.doc.setFont(FONTS.body, fontWeight)
    this.doc.setFontSize(fontSize)
    this.doc.setTextColor(0, 0, 0)

    // Title (left side)
    const titleX = this.margin + indent
    const maxTitleWidth = this.pageWidth - 2 * this.margin - 20 - indent
    const truncatedTitle = this.truncateText(entry.title, maxTitleWidth)
    this.doc.text(truncatedTitle, titleX, y)

    // Page number (right side)
    const pageNumX = this.pageWidth - this.margin
    this.doc.text(entry.page.toString(), pageNumX, y, { align: 'right' })

    // Dot leader
    const titleWidth = this.doc.getTextWidth(truncatedTitle)
    const pageNumWidth = this.doc.getTextWidth(entry.page.toString())
    const dotsStartX = titleX + titleWidth + 3
    const dotsEndX = pageNumX - pageNumWidth - 3

    this.doc.setTextColor(180, 180, 180)
    this.doc.setFontSize(8)
    let dotX = dotsStartX
    while (dotX < dotsEndX) {
      this.doc.text('.', dotX, y)
      dotX += 2
    }
    this.doc.setTextColor(0, 0, 0)

    // Add clickable internal link
    const linkHeight = 5
    const linkWidth = this.pageWidth - 2 * this.margin
    this.doc.link(
      this.margin,
      y - linkHeight + 1,
      linkWidth,
      linkHeight,
      { pageNumber: entry.page }
    )
  }

  /**
   * Truncate text to fit within maxWidth
   */
  private truncateText(text: string, maxWidth: number): string {
    let truncated = text
    while (this.doc.getTextWidth(truncated) > maxWidth && truncated.length > 10) {
      truncated = truncated.substring(0, truncated.length - 4) + '...'
    }
    return truncated
  }

  /**
   * Insert List of Exhibits (Figures and Tables) at the specified page position.
   */
  private insertListOfExhibits(insertAfterPage: number) {
    const totalExhibits = this.figureList.length + this.tableList.length
    if (totalExhibits === 0) return

    // Calculate pages needed
    const exhibitsPerPage = 30
    const exhibitPageCount = Math.max(1, Math.ceil(totalExhibits / exhibitsPerPage))

    // Insert blank pages
    for (let i = 0; i < exhibitPageCount; i++) {
      this.doc.insertPage(insertAfterPage + i)
    }

    // Shift page references again
    this.tocEntries.forEach(entry => {
      if (entry.page >= insertAfterPage) {
        entry.page += exhibitPageCount
      }
    })
    this.figureList.forEach(fig => {
      if (fig.page >= insertAfterPage) {
        fig.page += exhibitPageCount
      }
    })
    this.tableList.forEach(tbl => {
      if (tbl.page >= insertAfterPage) {
        tbl.page += exhibitPageCount
      }
    })

    // Render exhibits content
    let currentPage = insertAfterPage
    this.doc.setPage(currentPage)
    let exhibitY = this.margin + 10

    // List of Figures
    if (this.figureList.length > 0) {
      this.doc.setFontSize(16)
      this.doc.setFont(FONTS.body, 'bold')
      this.doc.setTextColor(30, 58, 138)
      this.doc.text('List of Figures', this.margin, exhibitY)
      exhibitY += 10

      this.doc.setTextColor(0, 0, 0)
      for (const fig of this.figureList) {
        if (exhibitY > this.pageHeight - 30) {
          currentPage++
          this.doc.setPage(currentPage)
          exhibitY = this.margin + 10
        }

        this.doc.setFont(FONTS.body, 'normal')
        this.doc.setFontSize(10)
        const figText = `Figure ${fig.number}: ${fig.title}`
        this.doc.text(this.truncateText(figText, this.pageWidth - 2 * this.margin - 20), this.margin + 5, exhibitY)
        this.doc.text(fig.page.toString(), this.pageWidth - this.margin, exhibitY, { align: 'right' })
        this.doc.link(this.margin, exhibitY - 4, this.pageWidth - 2 * this.margin, 5, { pageNumber: fig.page })
        exhibitY += 5
      }
      exhibitY += 10
    }

    // List of Tables
    if (this.tableList.length > 0) {
      if (exhibitY > this.pageHeight - 50) {
        currentPage++
        this.doc.setPage(currentPage)
        exhibitY = this.margin + 10
      }

      this.doc.setFontSize(16)
      this.doc.setFont(FONTS.body, 'bold')
      this.doc.setTextColor(30, 58, 138)
      this.doc.text('List of Tables', this.margin, exhibitY)
      exhibitY += 10

      this.doc.setTextColor(0, 0, 0)
      for (const tbl of this.tableList) {
        if (exhibitY > this.pageHeight - 30) {
          currentPage++
          this.doc.setPage(currentPage)
          exhibitY = this.margin + 10
        }

        this.doc.setFont(FONTS.body, 'normal')
        this.doc.setFontSize(10)
        const tblText = `Table ${tbl.number}: ${tbl.title}`
        this.doc.text(this.truncateText(tblText, this.pageWidth - 2 * this.margin - 20), this.margin + 5, exhibitY)
        this.doc.text(tbl.page.toString(), this.pageWidth - this.margin, exhibitY, { align: 'right' })
        this.doc.link(this.margin, exhibitY - 4, this.pageWidth - 2 * this.margin, 5, { pageNumber: tbl.page })
        exhibitY += 5
      }
    }
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
