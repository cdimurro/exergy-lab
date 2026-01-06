/**
 * Simulation PDF Report Generator
 *
 * Generates comprehensive 18+ section PDF reports for simulation results.
 * Follows the pattern of the TEA report generator with simulation-specific sections.
 *
 * @version 2.0.0 - Updated with custom Inter fonts and professional styling
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type {
  SimulationReportData,
  SimulationReportConfig,
  ReportGenerationOptions,
  SimulationVisualization,
  SimulationMetric,
  DataTable,
  DEFAULT_REPORT_CONFIG,
} from '@/types/simulation-report'
import {
  COLORS,
  FONT_SIZES,
  MARGINS,
  registerCustomFonts,
  FONT_FAMILIES,
  getTableConfig,
} from './pdf/shared-styles'

// Re-export FONTS for backward compatibility
const FONTS = FONT_SIZES

// ============================================================================
// Main Generator Class
// ============================================================================

export class SimulationPDFGenerator {
  private doc: jsPDF
  private data: SimulationReportData
  private config: SimulationReportConfig
  private pageNumber: number = 1
  private tocEntries: Array<{ title: string; page: number; level: number }> = []
  private figureCount: number = 0
  private tableCount: number = 0

  constructor(data: SimulationReportData, config?: Partial<SimulationReportConfig>) {
    this.data = data
    this.config = {
      includeExecutiveSummary: true,
      includeMethodology: true,
      includeResults: true,
      includeVisualizations: true,
      includeExergyAnalysis: true,
      includeAIInsights: true,
      includeSensitivityAnalysis: true,
      includeValidation: true,
      includeConclusions: true,
      includeLimitations: true,
      includeRecommendations: true,
      includeReferences: true,
      includeAppendix: true,
      detailLevel: 'comprehensive',
      visualizationOptions: {
        colorScheme: 'default',
        chartStyle: 'professional',
        resolution: 'print',
      },
      ...config,
    }
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    // Register custom Inter font family
    registerCustomFonts(this.doc)
  }

  /**
   * Generate the complete PDF report
   */
  async generate(): Promise<Blob> {
    // Cover page
    this.addCoverPage()

    // Table of Contents (placeholder - will be filled after all pages)
    this.addNewPage()
    const tocPage = this.pageNumber

    // Main content sections
    if (this.config.includeExecutiveSummary) {
      this.addNewPage()
      this.addExecutiveSummary()
    }

    this.addNewPage()
    this.addIntroduction()

    if (this.data.sourceExperiment) {
      this.addNewPage()
      this.addExperimentSource()
    }

    if (this.config.includeMethodology) {
      this.addNewPage()
      this.addMethodology()
    }

    if (this.config.includeResults) {
      this.addNewPage()
      this.addResults()
    }

    if (this.config.includeVisualizations && this.data.visualizations.length > 0) {
      this.addNewPage()
      this.addVisualizations()
    }

    if (this.config.includeExergyAnalysis && this.data.exergyAnalysis) {
      this.addNewPage()
      this.addExergyAnalysis()
    }

    if (this.config.includeAIInsights && this.data.aiInsights) {
      this.addNewPage()
      this.addAIInsights()
    }

    if (this.config.includeSensitivityAnalysis && this.data.sensitivityAnalysis) {
      this.addNewPage()
      this.addSensitivityAnalysis()
    }

    if (this.config.includeValidation && this.data.validation) {
      this.addNewPage()
      this.addValidation()
    }

    if (this.config.includeConclusions) {
      this.addNewPage()
      this.addConclusions()
    }

    if (this.config.includeLimitations) {
      this.addNewPage()
      this.addLimitations()
    }

    if (this.config.includeRecommendations) {
      this.addNewPage()
      this.addRecommendations()
    }

    if (this.config.includeReferences && this.data.references.length > 0) {
      this.addNewPage()
      this.addReferences()
    }

    if (this.config.includeAppendix && this.data.appendix) {
      this.addNewPage()
      this.addAppendix()
    }

    // Go back and fill in Table of Contents
    this.doc.setPage(tocPage)
    this.fillTableOfContents()

    // Add page numbers to all pages
    this.addPageNumbers()

    return this.doc.output('blob')
  }

  /**
   * Download the PDF
   */
  async download(filename?: string): Promise<void> {
    const blob = await this.generate()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `Simulation_Report_${this.data.metadata.id}.pdf`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ============================================================================
  // Cover Page
  // ============================================================================

  private addCoverPage(): void {
    const pageWidth = this.doc.internal.pageSize.getWidth()
    const pageHeight = this.doc.internal.pageSize.getHeight()

    // Background gradient effect (using rectangles)
    this.doc.setFillColor(...COLORS.primary)
    this.doc.rect(0, 0, pageWidth, 80, 'F')

    // Title
    this.doc.setTextColor(...COLORS.white)
    this.doc.setFontSize(FONTS.title)
    this.doc.setFont(FONT_FAMILIES.body, 'bold')
    this.doc.text('SIMULATION REPORT', pageWidth / 2, 35, { align: 'center' })

    // Subtitle
    this.doc.setFontSize(FONTS.h2)
    this.doc.setFont(FONT_FAMILIES.body, 'normal')
    this.doc.text(this.data.metadata.title, pageWidth / 2, 50, { align: 'center' })

    // Domain badge
    this.doc.setFontSize(FONTS.body)
    const domainText = this.data.metadata.domain.replace(/-/g, ' ').toUpperCase()
    this.doc.text(domainText, pageWidth / 2, 65, { align: 'center' })

    // Main content area
    let y = 100

    // Project info box
    this.doc.setFillColor(...COLORS.background)
    this.doc.roundedRect(MARGINS.left, y, pageWidth - MARGINS.left * 2, 60, 3, 3, 'F')

    y += 15
    this.doc.setTextColor(...COLORS.text)
    this.doc.setFontSize(FONTS.h3)
    this.doc.setFont(FONT_FAMILIES.body, 'bold')
    this.doc.text('Project Details', MARGINS.left + 10, y)

    y += 10
    this.doc.setFontSize(FONTS.body)
    this.doc.setFont(FONT_FAMILIES.body, 'normal')
    this.doc.text(`Simulation Type: ${this.data.methodology.simulationType}`, MARGINS.left + 10, y)
    y += 7
    this.doc.text(`Provider: ${this.data.methodology.provider}`, MARGINS.left + 10, y)
    y += 7
    this.doc.text(`Tier: ${this.data.methodology.tier.toUpperCase()}`, MARGINS.left + 10, y)
    y += 7
    this.doc.text(`Duration: ${this.formatDuration(this.data.executionMetadata.duration)}`, MARGINS.left + 10, y)

    // Date and version
    y = 180
    this.doc.setFontSize(FONTS.body)
    this.doc.text(`Generated: ${new Date(this.data.metadata.createdAt).toLocaleDateString()}`, MARGINS.left, y)
    this.doc.text(`Version: ${this.data.metadata.version}`, pageWidth - MARGINS.right - 30, y)

    // Author/Organization
    if (this.data.metadata.author || this.data.metadata.organization) {
      y += 10
      const authorText = [this.data.metadata.author, this.data.metadata.organization]
        .filter(Boolean)
        .join(' - ')
      this.doc.text(authorText, MARGINS.left, y)
    }

    // Exergy Lab branding
    y = pageHeight - 30
    this.doc.setTextColor(...COLORS.primary)
    this.doc.setFontSize(FONTS.h3)
    this.doc.setFont(FONT_FAMILIES.body, 'bold')
    this.doc.text('Exergy Lab', pageWidth / 2, y, { align: 'center' })
    this.doc.setFontSize(FONTS.small)
    this.doc.setFont(FONT_FAMILIES.body, 'normal')
    this.doc.setTextColor(...COLORS.textMuted)
    this.doc.text('AI-Powered Clean Energy Research Platform', pageWidth / 2, y + 6, { align: 'center' })

    // Confidential notice if applicable
    if (this.data.metadata.confidential) {
      this.doc.setTextColor(...COLORS.error)
      this.doc.setFontSize(FONTS.small)
      this.doc.text('CONFIDENTIAL', pageWidth / 2, pageHeight - 15, { align: 'center' })
    }
  }

  // ============================================================================
  // Table of Contents
  // ============================================================================

  private fillTableOfContents(): void {
    const pageWidth = this.doc.internal.pageSize.getWidth()

    this.doc.setTextColor(...COLORS.text)
    this.doc.setFontSize(FONTS.h1)
    this.doc.setFont(FONT_FAMILIES.body, 'bold')
    this.doc.text('Table of Contents', MARGINS.left, 40)

    let y = 55

    this.tocEntries.forEach((entry) => {
      this.doc.setFontSize(FONTS.body)
      this.doc.setFont(FONT_FAMILIES.body, entry.level === 1 ? 'bold' : 'normal')

      const indent = entry.level === 1 ? 0 : 10
      const titleX = MARGINS.left + indent
      const pageX = pageWidth - MARGINS.right

      // Title
      this.doc.text(entry.title, titleX, y)

      // Dots
      const titleWidth = this.doc.getTextWidth(entry.title)
      const pageNumWidth = this.doc.getTextWidth(entry.page.toString())
      const dotsStart = titleX + titleWidth + 5
      const dotsEnd = pageX - pageNumWidth - 5

      this.doc.setTextColor(...COLORS.textMuted)
      let dotX = dotsStart
      while (dotX < dotsEnd) {
        this.doc.text('.', dotX, y)
        dotX += 2
      }

      // Page number
      this.doc.setTextColor(...COLORS.text)
      this.doc.text(entry.page.toString(), pageX, y, { align: 'right' })

      y += 7
    })
  }

  // ============================================================================
  // Executive Summary
  // ============================================================================

  private addExecutiveSummary(): void {
    this.addSectionHeader('Executive Summary')
    let y = 50

    // Key metrics summary box
    this.doc.setFillColor(...COLORS.accent)
    this.doc.setDrawColor(...COLORS.accent)
    this.doc.roundedRect(MARGINS.left, y, this.getContentWidth(), 40, 3, 3, 'FD')

    this.doc.setTextColor(...COLORS.white)
    this.doc.setFontSize(FONTS.h3)
    this.doc.setFont(FONT_FAMILIES.body, 'bold')
    this.doc.text('Key Findings', MARGINS.left + 10, y + 12)

    // Top 3 metrics
    const topMetrics = this.data.results.metrics
      .filter((m) => m.significance === 'high')
      .slice(0, 3)

    if (topMetrics.length > 0) {
      const metricWidth = (this.getContentWidth() - 20) / topMetrics.length
      topMetrics.forEach((metric, i) => {
        const x = MARGINS.left + 10 + i * metricWidth
        this.doc.setFontSize(FONTS.h2)
        this.doc.text(this.formatValue(metric.value, metric.unit), x, y + 28)
        this.doc.setFontSize(FONTS.small)
        this.doc.text(metric.name, x, y + 35)
      })
    }

    y += 55

    // Overview text
    this.doc.setTextColor(...COLORS.text)
    this.doc.setFontSize(FONTS.body)
    this.doc.setFont(FONT_FAMILIES.body, 'normal')

    const overview = this.data.overview.description || 'No description provided.'
    const lines = this.doc.splitTextToSize(overview, this.getContentWidth())
    this.doc.text(lines, MARGINS.left, y)
    y += lines.length * 5 + 10

    // Goals
    if (this.data.overview.goals.length > 0) {
      this.doc.setFont(FONT_FAMILIES.body, 'bold')
      this.doc.text('Simulation Goals:', MARGINS.left, y)
      y += 7

      this.doc.setFont(FONT_FAMILIES.body, 'normal')
      this.data.overview.goals.forEach((goal) => {
        this.doc.text(`• ${goal}`, MARGINS.left + 5, y)
        y += 6
      })
    }

    // Convergence status
    if (this.data.results.convergence) {
      y += 10
      const status = this.data.results.convergence.converged ? 'Converged' : 'Not Converged'
      const statusColor = this.data.results.convergence.converged ? COLORS.success : COLORS.error

      this.doc.setFont(FONT_FAMILIES.body, 'bold')
      this.doc.text('Simulation Status: ', MARGINS.left, y)
      this.doc.setTextColor(...statusColor)
      this.doc.text(status, MARGINS.left + 35, y)
    }
  }

  // ============================================================================
  // Introduction
  // ============================================================================

  private addIntroduction(): void {
    this.addSectionHeader('Introduction')
    let y = 50

    this.doc.setTextColor(...COLORS.text)
    this.doc.setFontSize(FONTS.body)

    // Background context
    if (this.data.overview.backgroundContext) {
      this.doc.setFont(FONT_FAMILIES.body, 'bold')
      this.doc.text('Background', MARGINS.left, y)
      y += 7

      this.doc.setFont(FONT_FAMILIES.body, 'normal')
      const lines = this.doc.splitTextToSize(
        this.data.overview.backgroundContext,
        this.getContentWidth()
      )
      this.doc.text(lines, MARGINS.left, y)
      y += lines.length * 5 + 10
    }

    // Domain description
    this.doc.setFont(FONT_FAMILIES.body, 'bold')
    this.doc.text('Research Domain', MARGINS.left, y)
    y += 7

    this.doc.setFont(FONT_FAMILIES.body, 'normal')
    const domainDesc = this.getDomainDescription(this.data.metadata.domain)
    const domainLines = this.doc.splitTextToSize(domainDesc, this.getContentWidth())
    this.doc.text(domainLines, MARGINS.left, y)
    y += domainLines.length * 5 + 10

    // Simulation objectives
    this.doc.setFont(FONT_FAMILIES.body, 'bold')
    this.doc.text('Objectives', MARGINS.left, y)
    y += 7

    this.doc.setFont(FONT_FAMILIES.body, 'normal')
    this.data.overview.goals.forEach((goal, i) => {
      this.doc.text(`${i + 1}. ${goal}`, MARGINS.left + 5, y)
      y += 6
    })
  }

  // ============================================================================
  // Experiment Source
  // ============================================================================

  private addExperimentSource(): void {
    this.addSectionHeader('Experiment Source')
    let y = 50

    if (!this.data.sourceExperiment) return

    const exp = this.data.sourceExperiment

    // Source info box
    this.doc.setFillColor(...COLORS.background)
    this.doc.roundedRect(MARGINS.left, y, this.getContentWidth(), 35, 3, 3, 'F')

    y += 12
    this.doc.setTextColor(...COLORS.text)
    this.doc.setFontSize(FONTS.h3)
    this.doc.setFont(FONT_FAMILIES.body, 'bold')
    this.doc.text(exp.metadata.title, MARGINS.left + 10, y)

    y += 8
    this.doc.setFontSize(FONTS.small)
    this.doc.setFont(FONT_FAMILIES.body, 'normal')
    this.doc.setTextColor(...COLORS.textMuted)
    this.doc.text(`ID: ${exp.metadata.id}`, MARGINS.left + 10, y)
    this.doc.text(
      `Created: ${new Date(exp.metadata.createdAt).toLocaleDateString()}`,
      MARGINS.left + 80,
      y
    )

    y += 25

    // Protocol summary
    this.doc.setTextColor(...COLORS.text)
    this.doc.setFontSize(FONTS.h3)
    this.doc.setFont(FONT_FAMILIES.body, 'bold')
    this.doc.text('Experiment Protocol Summary', MARGINS.left, y)
    y += 10

    // Materials table
    if (exp.protocol.materials.length > 0) {
      autoTable(this.doc, {
        startY: y,
        head: [['Material', 'Quantity', 'Unit']],
        body: exp.protocol.materials.map((m) => [m.name, m.quantity, m.unit]),
        theme: 'striped',
        headStyles: { fillColor: COLORS.primary },
        margin: { left: MARGINS.left, right: MARGINS.right },
      })
      y = (this.doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
    }

    // Steps count
    this.doc.setFontSize(FONTS.body)
    this.doc.setFont(FONT_FAMILIES.body, 'normal')
    this.doc.text(
      `Experiment contains ${exp.protocol.steps.length} steps`,
      MARGINS.left,
      y
    )

    // Risk score
    y += 10
    const riskColor =
      exp.failureAnalysis.riskScore > 70
        ? COLORS.error
        : exp.failureAnalysis.riskScore > 40
          ? COLORS.warning
          : COLORS.success

    this.doc.text('Risk Score: ', MARGINS.left, y)
    this.doc.setTextColor(...riskColor)
    this.doc.text(`${exp.failureAnalysis.riskScore}/100`, MARGINS.left + 25, y)
  }

  // ============================================================================
  // Methodology
  // ============================================================================

  private addMethodology(): void {
    this.addSectionHeader('Methodology')
    let y = 50

    const method = this.data.methodology

    // Simulation type and provider
    this.doc.setTextColor(...COLORS.text)
    this.doc.setFontSize(FONTS.h3)
    this.doc.setFont(FONT_FAMILIES.body, 'bold')
    this.doc.text('Simulation Configuration', MARGINS.left, y)
    y += 10

    const configData = [
      ['Simulation Type', method.simulationType],
      ['Provider', method.provider],
      ['Tier', method.tier.toUpperCase()],
    ]

    autoTable(this.doc, {
      startY: y,
      head: [['Parameter', 'Value']],
      body: configData,
      theme: 'grid',
      headStyles: { fillColor: COLORS.primary },
      margin: { left: MARGINS.left, right: MARGINS.right },
      tableWidth: 100,
    })
    y = (this.doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15

    // Parameters
    if (method.parameters.length > 0) {
      this.doc.setFontSize(FONTS.h3)
      this.doc.setFont(FONT_FAMILIES.body, 'bold')
      this.doc.text('Input Parameters', MARGINS.left, y)
      y += 8

      autoTable(this.doc, {
        startY: y,
        head: [['Parameter', 'Value', 'Unit', 'Description']],
        body: method.parameters.map((p) => [
          p.name,
          p.value.toString(),
          p.unit,
          p.description || '-',
        ]),
        theme: 'striped',
        headStyles: { fillColor: COLORS.primary },
        margin: { left: MARGINS.left, right: MARGINS.right },
      })
      y = (this.doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15
    }

    // Boundary conditions
    if (method.boundaryConditions.length > 0) {
      this.doc.setFontSize(FONTS.h3)
      this.doc.setFont(FONT_FAMILIES.body, 'bold')
      this.doc.text('Boundary Conditions', MARGINS.left, y)
      y += 8

      autoTable(this.doc, {
        startY: y,
        head: [['Name', 'Type', 'Value', 'Unit', 'Location']],
        body: method.boundaryConditions.map((bc) => [
          bc.name,
          bc.type,
          bc.value.toString(),
          bc.unit,
          bc.location || '-',
        ]),
        theme: 'striped',
        headStyles: { fillColor: COLORS.primary },
        margin: { left: MARGINS.left, right: MARGINS.right },
      })
      y = (this.doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15
    }

    // Assumptions
    if (method.assumptions.length > 0) {
      this.doc.setFontSize(FONTS.h3)
      this.doc.setFont(FONT_FAMILIES.body, 'bold')
      this.doc.text('Assumptions', MARGINS.left, y)
      y += 8

      this.doc.setFontSize(FONTS.body)
      this.doc.setFont(FONT_FAMILIES.body, 'normal')
      method.assumptions.forEach((assumption, i) => {
        this.doc.text(`${i + 1}. ${assumption}`, MARGINS.left + 5, y)
        y += 6
      })
    }
  }

  // ============================================================================
  // Results
  // ============================================================================

  private addResults(): void {
    this.addSectionHeader('Results')
    let y = 50

    // Key metrics table
    this.doc.setTextColor(...COLORS.text)
    this.doc.setFontSize(FONTS.h3)
    this.doc.setFont(FONT_FAMILIES.body, 'bold')
    this.doc.text('Key Performance Metrics', MARGINS.left, y)
    y += 8

    autoTable(this.doc, {
      startY: y,
      head: [['Metric', 'Value', 'Unit', 'Significance']],
      body: this.data.results.metrics.map((m) => [
        m.name,
        this.formatNumber(m.value),
        m.unit,
        m.significance.toUpperCase(),
      ]),
      theme: 'striped',
      headStyles: { fillColor: COLORS.primary },
      margin: { left: MARGINS.left, right: MARGINS.right },
      columnStyles: {
        3: {
          cellWidth: 30,
          halign: 'center',
        },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const value = data.cell.raw as string
          if (value === 'HIGH') {
            data.cell.styles.textColor = COLORS.success
            data.cell.styles.fontStyle = 'bold'
          } else if (value === 'MEDIUM') {
            data.cell.styles.textColor = COLORS.warning
          }
        }
      },
    })
    y = (this.doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15

    // Convergence information
    if (this.data.results.convergence) {
      const conv = this.data.results.convergence

      this.doc.setFontSize(FONTS.h3)
      this.doc.setFont(FONT_FAMILIES.body, 'bold')
      this.doc.text('Convergence Analysis', MARGINS.left, y)
      y += 10

      const statusColor = conv.converged ? COLORS.success : COLORS.error
      this.doc.setFillColor(...statusColor)
      this.doc.circle(MARGINS.left + 5, y - 2, 3, 'F')

      this.doc.setFontSize(FONTS.body)
      this.doc.setFont(FONT_FAMILIES.body, 'normal')
      this.doc.text(
        `Status: ${conv.converged ? 'Converged' : 'Not Converged'}`,
        MARGINS.left + 12,
        y
      )
      y += 7
      this.doc.text(`Iterations: ${conv.iterations}`, MARGINS.left + 12, y)
      y += 7
      this.doc.text(`Final Residual: ${conv.residual.toExponential(3)}`, MARGINS.left + 12, y)
    }
  }

  // ============================================================================
  // Visualizations
  // ============================================================================

  private addVisualizations(): void {
    this.addSectionHeader('Visualizations')
    let y = 50

    this.data.visualizations.forEach((viz, index) => {
      if (y > 220) {
        this.addNewPage()
        y = 40
      }

      this.figureCount++
      this.doc.setTextColor(...COLORS.text)
      this.doc.setFontSize(FONTS.h3)
      this.doc.setFont(FONT_FAMILIES.body, 'bold')
      this.doc.text(`Figure ${this.figureCount}: ${viz.title}`, MARGINS.left, y)
      y += 8

      // If we have a base64 image, embed it
      if (viz.imageBase64) {
        try {
          this.doc.addImage(
            viz.imageBase64,
            'PNG',
            MARGINS.left,
            y,
            this.getContentWidth(),
            80
          )
          y += 85
        } catch {
          this.doc.setFontSize(FONTS.body)
          this.doc.setFont(FONT_FAMILIES.body, 'italic')
          this.doc.setTextColor(...COLORS.textMuted)
          this.doc.text('[Visualization not available]', MARGINS.left, y)
          y += 10
        }
      } else {
        // Placeholder for chart
        this.doc.setFillColor(...COLORS.background)
        this.doc.roundedRect(MARGINS.left, y, this.getContentWidth(), 60, 3, 3, 'F')
        this.doc.setFontSize(FONTS.body)
        this.doc.setTextColor(...COLORS.textMuted)
        this.doc.text(
          `[${viz.type.toUpperCase()} Chart - ${viz.title}]`,
          MARGINS.left + this.getContentWidth() / 2 - 30,
          y + 30
        )
        y += 65
      }

      // Description
      if (viz.description) {
        this.doc.setFontSize(FONTS.small)
        this.doc.setFont(FONT_FAMILIES.body, 'italic')
        this.doc.setTextColor(...COLORS.textMuted)
        const descLines = this.doc.splitTextToSize(viz.description, this.getContentWidth())
        this.doc.text(descLines, MARGINS.left, y)
        y += descLines.length * 4 + 10
      }

      y += 10
    })
  }

  // ============================================================================
  // Exergy Analysis
  // ============================================================================

  private addExergyAnalysis(): void {
    this.addSectionHeader('Exergy Analysis')
    let y = 50

    if (!this.data.exergyAnalysis) return

    const exergy = this.data.exergyAnalysis

    // Efficiency highlight
    this.doc.setFillColor(...COLORS.primary)
    this.doc.roundedRect(MARGINS.left, y, 80, 35, 3, 3, 'F')

    this.doc.setTextColor(...COLORS.white)
    this.doc.setFontSize(FONTS.h1)
    this.doc.setFont(FONT_FAMILIES.body, 'bold')
    this.doc.text(`${(exergy.efficiency * 100).toFixed(1)}%`, MARGINS.left + 10, y + 20)
    this.doc.setFontSize(FONTS.small)
    this.doc.text('Second-Law Efficiency', MARGINS.left + 10, y + 28)

    // Destruction and potential
    const boxWidth = (this.getContentWidth() - 90) / 2
    this.doc.setFillColor(...COLORS.error)
    this.doc.roundedRect(MARGINS.left + 85, y, boxWidth, 35, 3, 3, 'F')

    this.doc.setFontSize(FONTS.h2)
    this.doc.text(
      `${(exergy.exergyDestruction * 100).toFixed(1)}%`,
      MARGINS.left + 90,
      y + 20
    )
    this.doc.setFontSize(FONTS.small)
    this.doc.text('Exergy Destruction', MARGINS.left + 90, y + 28)

    this.doc.setFillColor(...COLORS.success)
    this.doc.roundedRect(MARGINS.left + 90 + boxWidth, y, boxWidth, 35, 3, 3, 'F')

    this.doc.setFontSize(FONTS.h2)
    this.doc.text(
      `${(exergy.improvementPotential * 100).toFixed(1)}%`,
      MARGINS.left + 95 + boxWidth,
      y + 20
    )
    this.doc.setFontSize(FONTS.small)
    this.doc.text('Improvement Potential', MARGINS.left + 95 + boxWidth, y + 28)

    y += 50

    // Major losses
    this.doc.setTextColor(...COLORS.text)
    this.doc.setFontSize(FONTS.h3)
    this.doc.setFont(FONT_FAMILIES.body, 'bold')
    this.doc.text('Major Sources of Exergy Loss', MARGINS.left, y)
    y += 8

    this.doc.setFontSize(FONTS.body)
    this.doc.setFont(FONT_FAMILIES.body, 'normal')
    exergy.majorLosses.forEach((loss, i) => {
      this.doc.text(`${i + 1}. ${loss}`, MARGINS.left + 5, y)
      y += 6
    })
  }

  // ============================================================================
  // AI Insights
  // ============================================================================

  private addAIInsights(): void {
    this.addSectionHeader('AI-Generated Insights')
    let y = 50

    if (!this.data.aiInsights) return

    const insights = this.data.aiInsights

    // Summary
    this.doc.setTextColor(...COLORS.text)
    this.doc.setFontSize(FONTS.body)
    this.doc.setFont(FONT_FAMILIES.body, 'normal')
    const summaryLines = this.doc.splitTextToSize(insights.summary, this.getContentWidth())
    this.doc.text(summaryLines, MARGINS.left, y)
    y += summaryLines.length * 5 + 15

    // Insights by category
    const categories = ['observation', 'recommendation', 'warning', 'opportunity'] as const
    const categoryColors = {
      observation: COLORS.primary,
      recommendation: COLORS.success,
      warning: COLORS.warning,
      opportunity: COLORS.accent,
    }

    categories.forEach((category) => {
      const categoryInsights = insights.insights.filter((i) => i.category === category)
      if (categoryInsights.length === 0) return

      this.doc.setFontSize(FONTS.h3)
      this.doc.setFont(FONT_FAMILIES.body, 'bold')
      this.doc.setTextColor(...categoryColors[category])
      this.doc.text(category.charAt(0).toUpperCase() + category.slice(1) + 's', MARGINS.left, y)
      y += 8

      this.doc.setTextColor(...COLORS.text)
      this.doc.setFontSize(FONTS.body)
      this.doc.setFont(FONT_FAMILIES.body, 'normal')

      categoryInsights.forEach((insight) => {
        this.doc.setFont(FONT_FAMILIES.body, 'bold')
        this.doc.text(`• ${insight.title}`, MARGINS.left + 5, y)
        y += 5

        this.doc.setFont(FONT_FAMILIES.body, 'normal')
        const descLines = this.doc.splitTextToSize(insight.description, this.getContentWidth() - 10)
        this.doc.text(descLines, MARGINS.left + 8, y)
        y += descLines.length * 5 + 5
      })

      y += 5
    })

    // Next steps
    if (insights.nextSteps.length > 0) {
      this.doc.setFontSize(FONTS.h3)
      this.doc.setFont(FONT_FAMILIES.body, 'bold')
      this.doc.setTextColor(...COLORS.text)
      this.doc.text('Recommended Next Steps', MARGINS.left, y)
      y += 8

      this.doc.setFontSize(FONTS.body)
      this.doc.setFont(FONT_FAMILIES.body, 'normal')
      insights.nextSteps.forEach((step, i) => {
        this.doc.text(`${i + 1}. ${step}`, MARGINS.left + 5, y)
        y += 6
      })
    }
  }

  // ============================================================================
  // Sensitivity Analysis
  // ============================================================================

  private addSensitivityAnalysis(): void {
    this.addSectionHeader('Sensitivity Analysis')
    let y = 50

    if (!this.data.sensitivityAnalysis) return

    const sensitivity = this.data.sensitivityAnalysis

    this.doc.setTextColor(...COLORS.text)
    this.doc.setFontSize(FONTS.body)
    this.doc.text(`Target Metric: ${sensitivity.targetMetric}`, MARGINS.left, y)
    y += 15

    // Sensitivity table
    autoTable(this.doc, {
      startY: y,
      head: [['Parameter', 'Low', 'Base', 'High', 'Sensitivity']],
      body: sensitivity.parameters.map((p) => [
        p.parameter,
        this.formatNumber(p.lowResult),
        this.formatNumber(p.baseResult),
        this.formatNumber(p.highResult),
        p.sensitivity.toFixed(3),
      ]),
      theme: 'striped',
      headStyles: { fillColor: COLORS.primary },
      margin: { left: MARGINS.left, right: MARGINS.right },
    })
    y = (this.doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15

    // Most/least sensitive
    this.doc.setFontSize(FONTS.h3)
    this.doc.setFont(FONT_FAMILIES.body, 'bold')
    this.doc.text('Most Sensitive Parameters:', MARGINS.left, y)
    y += 7

    this.doc.setFontSize(FONTS.body)
    this.doc.setFont(FONT_FAMILIES.body, 'normal')
    sensitivity.mostSensitive.forEach((param) => {
      this.doc.text(`• ${param}`, MARGINS.left + 5, y)
      y += 5
    })
  }

  // ============================================================================
  // Validation
  // ============================================================================

  private addValidation(): void {
    this.addSectionHeader('Validation')
    let y = 50

    if (!this.data.validation) return

    const validation = this.data.validation

    // Overall accuracy
    const accuracyColor = validation.passed ? COLORS.success : COLORS.error
    this.doc.setFillColor(...accuracyColor)
    this.doc.roundedRect(MARGINS.left, y, 100, 30, 3, 3, 'F')

    this.doc.setTextColor(...COLORS.white)
    this.doc.setFontSize(FONTS.h1)
    this.doc.setFont(FONT_FAMILIES.body, 'bold')
    this.doc.text(`${validation.overallAccuracy.toFixed(1)}%`, MARGINS.left + 10, y + 18)
    this.doc.setFontSize(FONTS.small)
    this.doc.text('Overall Accuracy', MARGINS.left + 10, y + 25)

    y += 45

    // Validation results table
    this.doc.setTextColor(...COLORS.text)
    this.doc.setFontSize(FONTS.h3)
    this.doc.setFont(FONT_FAMILIES.body, 'bold')
    this.doc.text(`Compared to: ${validation.comparedTo}`, MARGINS.left, y)
    y += 10

    autoTable(this.doc, {
      startY: y,
      head: [['Metric', 'Expected', 'Simulated', 'Deviation', 'Pass']],
      body: validation.results.map((r) => [
        r.metric,
        `${this.formatNumber(r.expected)} ${r.unit}`,
        `${this.formatNumber(r.simulated)} ${r.unit}`,
        `${r.deviation.toFixed(1)}%`,
        r.withinTolerance ? 'PASS' : 'FAIL',
      ]),
      theme: 'striped',
      headStyles: { fillColor: COLORS.primary },
      margin: { left: MARGINS.left, right: MARGINS.right },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const value = data.cell.raw as string
          data.cell.styles.textColor = value === 'PASS' ? COLORS.success : COLORS.error
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })
  }

  // ============================================================================
  // Conclusions
  // ============================================================================

  private addConclusions(): void {
    this.addSectionHeader('Conclusions')
    let y = 50

    const conclusions = this.data.conclusions

    // Summary
    this.doc.setTextColor(...COLORS.text)
    this.doc.setFontSize(FONTS.body)
    this.doc.setFont(FONT_FAMILIES.body, 'normal')
    const summaryLines = this.doc.splitTextToSize(conclusions.summary, this.getContentWidth())
    this.doc.text(summaryLines, MARGINS.left, y)
    y += summaryLines.length * 5 + 10

    // Key findings
    if (conclusions.keyFindings.length > 0) {
      this.doc.setFontSize(FONTS.h3)
      this.doc.setFont(FONT_FAMILIES.body, 'bold')
      this.doc.text('Key Findings', MARGINS.left, y)
      y += 8

      this.doc.setFontSize(FONTS.body)
      this.doc.setFont(FONT_FAMILIES.body, 'normal')
      conclusions.keyFindings.forEach((finding, i) => {
        this.doc.text(`${i + 1}. ${finding}`, MARGINS.left + 5, y)
        y += 6
      })
      y += 5
    }

    // Achievements
    if (conclusions.achievements.length > 0) {
      this.doc.setFontSize(FONTS.h3)
      this.doc.setFont(FONT_FAMILIES.body, 'bold')
      this.doc.text('Achievements', MARGINS.left, y)
      y += 8

      this.doc.setFontSize(FONTS.body)
      this.doc.setFont(FONT_FAMILIES.body, 'normal')
      conclusions.achievements.forEach((achievement) => {
        this.doc.text(`• ${achievement}`, MARGINS.left + 5, y)
        y += 6
      })
    }
  }

  // ============================================================================
  // Limitations
  // ============================================================================

  private addLimitations(): void {
    this.addSectionHeader('Limitations')
    let y = 50

    this.doc.setTextColor(...COLORS.text)
    this.doc.setFontSize(FONTS.body)
    this.doc.setFont(FONT_FAMILIES.body, 'normal')

    if (this.data.conclusions.limitations.length > 0) {
      this.data.conclusions.limitations.forEach((limitation, i) => {
        this.doc.text(`${i + 1}. ${limitation}`, MARGINS.left, y)
        y += 7
      })
    } else {
      this.doc.text('No specific limitations noted.', MARGINS.left, y)
    }

    // Methodology assumptions
    y += 15
    this.doc.setFontSize(FONTS.h3)
    this.doc.setFont(FONT_FAMILIES.body, 'bold')
    this.doc.text('Modeling Assumptions', MARGINS.left, y)
    y += 8

    this.doc.setFontSize(FONTS.body)
    this.doc.setFont(FONT_FAMILIES.body, 'normal')
    this.data.methodology.assumptions.forEach((assumption, i) => {
      const lines = this.doc.splitTextToSize(
        `${i + 1}. ${assumption}`,
        this.getContentWidth()
      )
      this.doc.text(lines, MARGINS.left, y)
      y += lines.length * 5 + 2
    })
  }

  // ============================================================================
  // Recommendations
  // ============================================================================

  private addRecommendations(): void {
    this.addSectionHeader('Recommendations')
    let y = 50

    const recs = this.data.recommendations

    const sections = [
      { title: 'Design Changes', items: recs.designChanges },
      { title: 'Operational Optimizations', items: recs.operationalOptimizations },
      { title: 'Further Experiments', items: recs.furtherExperiments },
      { title: 'Research Directions', items: recs.researchDirections },
    ]

    sections.forEach((section) => {
      if (section.items.length === 0) return

      this.doc.setTextColor(...COLORS.text)
      this.doc.setFontSize(FONTS.h3)
      this.doc.setFont(FONT_FAMILIES.body, 'bold')
      this.doc.text(section.title, MARGINS.left, y)
      y += 8

      this.doc.setFontSize(FONTS.body)
      this.doc.setFont(FONT_FAMILIES.body, 'normal')
      section.items.forEach((item, i) => {
        const lines = this.doc.splitTextToSize(`${i + 1}. ${item}`, this.getContentWidth())
        this.doc.text(lines, MARGINS.left + 5, y)
        y += lines.length * 5 + 2
      })
      y += 8
    })
  }

  // ============================================================================
  // References
  // ============================================================================

  private addReferences(): void {
    this.addSectionHeader('References')
    let y = 50

    this.doc.setTextColor(...COLORS.text)
    this.doc.setFontSize(FONTS.body)
    this.doc.setFont(FONT_FAMILIES.body, 'normal')

    this.data.references.forEach((ref, i) => {
      const refText = `[${i + 1}] ${ref.citation}`
      const lines = this.doc.splitTextToSize(refText, this.getContentWidth())
      this.doc.text(lines, MARGINS.left, y)
      y += lines.length * 5 + 3

      if (ref.doi) {
        this.doc.setTextColor(...COLORS.primary)
        this.doc.text(`DOI: ${ref.doi}`, MARGINS.left + 10, y)
        y += 5
        this.doc.setTextColor(...COLORS.text)
      }

      y += 3
    })
  }

  // ============================================================================
  // Appendix
  // ============================================================================

  private addAppendix(): void {
    this.addSectionHeader('Appendix')
    let y = 50

    if (!this.data.appendix) return

    // Data tables
    this.data.appendix.dataTables.forEach((table) => {
      if (y > 200) {
        this.addNewPage()
        y = 40
      }

      this.tableCount++
      this.doc.setTextColor(...COLORS.text)
      this.doc.setFontSize(FONTS.h3)
      this.doc.setFont(FONT_FAMILIES.body, 'bold')
      this.doc.text(`Table ${this.tableCount}: ${table.title}`, MARGINS.left, y)
      y += 8

      autoTable(this.doc, {
        startY: y,
        head: [table.headers],
        body: table.rows.map((row) => row.map((cell) => cell.toString())),
        theme: 'striped',
        headStyles: { fillColor: COLORS.primary },
        margin: { left: MARGINS.left, right: MARGINS.right },
        styles: { fontSize: FONTS.small },
      })
      y = (this.doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15
    })

    // Download links
    if (this.data.appendix.downloadLinks && this.data.appendix.downloadLinks.length > 0) {
      this.doc.setFontSize(FONTS.h3)
      this.doc.setFont(FONT_FAMILIES.body, 'bold')
      this.doc.text('Available Data Downloads', MARGINS.left, y)
      y += 8

      this.doc.setFontSize(FONTS.body)
      this.doc.setFont(FONT_FAMILIES.body, 'normal')
      this.data.appendix.downloadLinks.forEach((link) => {
        this.doc.text(
          `• ${link.description} (${link.format.toUpperCase()})`,
          MARGINS.left + 5,
          y
        )
        y += 6
      })
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private addNewPage(): void {
    this.doc.addPage()
    this.pageNumber++
  }

  private addSectionHeader(title: string): void {
    this.tocEntries.push({ title, page: this.pageNumber, level: 1 })

    this.doc.setTextColor(...COLORS.primary)
    this.doc.setFontSize(FONTS.h1)
    this.doc.setFont(FONT_FAMILIES.body, 'bold')
    this.doc.text(title, MARGINS.left, 35)

    // Underline
    this.doc.setDrawColor(...COLORS.primary)
    this.doc.setLineWidth(0.5)
    this.doc.line(MARGINS.left, 38, MARGINS.left + 60, 38)
  }

  private addPageNumbers(): void {
    const pageCount = this.doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i)
      this.doc.setFontSize(FONTS.small)
      this.doc.setTextColor(...COLORS.textMuted)
      this.doc.text(
        `Page ${i} of ${pageCount}`,
        this.doc.internal.pageSize.getWidth() / 2,
        this.doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      )
    }
  }

  private getContentWidth(): number {
    return this.doc.internal.pageSize.getWidth() - MARGINS.left - MARGINS.right
  }

  private formatNumber(value: number): string {
    if (Math.abs(value) >= 1e9) {
      return `${(value / 1e9).toFixed(2)}B`
    } else if (Math.abs(value) >= 1e6) {
      return `${(value / 1e6).toFixed(2)}M`
    } else if (Math.abs(value) >= 1e3) {
      return `${(value / 1e3).toFixed(2)}K`
    } else if (Math.abs(value) < 0.01 && value !== 0) {
      return value.toExponential(2)
    }
    return value.toFixed(2)
  }

  private formatValue(value: number, unit: string): string {
    return `${this.formatNumber(value)} ${unit}`
  }

  private formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`
    } else if (seconds < 3600) {
      return `${(seconds / 60).toFixed(1)} min`
    }
    return `${(seconds / 3600).toFixed(1)} hr`
  }

  private getDomainDescription(domain: string): string {
    const descriptions: Record<string, string> = {
      solar:
        'Research in photovoltaic technologies, solar thermal systems, and concentrated solar power applications.',
      wind:
        'Wind energy systems including turbine design, farm optimization, and offshore wind technologies.',
      battery:
        'Electrochemical energy storage including lithium-ion, solid-state, and flow battery technologies.',
      hydrogen:
        'Hydrogen production, storage, and fuel cell technologies for clean energy applications.',
      geothermal:
        'Geothermal heat extraction and power generation from subsurface thermal resources.',
      biomass:
        'Conversion of organic materials to energy through combustion, gasification, and biochemical processes.',
      'carbon-capture':
        'Technologies for capturing, utilizing, and storing carbon dioxide from industrial processes.',
      'energy-efficiency':
        'Improvements in energy conversion efficiency and reduction of energy waste.',
      'grid-optimization':
        'Smart grid technologies, demand response, and grid-scale energy management.',
      'materials-science':
        'Advanced materials for energy applications including catalysts, membranes, and electrodes.',
    }
    return descriptions[domain] || 'Clean energy research and development.'
  }
}

// ============================================================================
// Export Helper Functions
// ============================================================================

/**
 * Generate a simulation PDF report
 */
export async function generateSimulationPDF(
  data: SimulationReportData,
  options?: Partial<ReportGenerationOptions>
): Promise<Blob> {
  const generator = new SimulationPDFGenerator(data, options?.config)
  return generator.generate()
}

/**
 * Download a simulation PDF report
 */
export async function downloadSimulationPDF(
  data: SimulationReportData,
  filename?: string,
  options?: Partial<ReportGenerationOptions>
): Promise<void> {
  const generator = new SimulationPDFGenerator(data, options?.config)
  await generator.download(filename)
}
