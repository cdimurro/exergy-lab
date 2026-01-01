/**
 * Experiment PDF Report Generator
 *
 * Generates comprehensive PDF reports for experiment protocols and validations.
 * Follows the pattern of the simulation report generator with experiment-specific sections.
 *
 * @version 1.0.0
 */

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type {
  ExperimentReportData,
  ExperimentReportConfig,
  DEFAULT_EXPERIMENT_REPORT_CONFIG,
} from '@/types/experiment-report'

// ============================================================================
// Constants
// ============================================================================

const COLORS = {
  primary: [30, 58, 138] as [number, number, number], // Blue-800
  secondary: [59, 130, 246] as [number, number, number], // Blue-500
  accent: [16, 185, 129] as [number, number, number], // Emerald-500
  success: [34, 197, 94] as [number, number, number], // Green-500
  warning: [245, 158, 11] as [number, number, number], // Amber-500
  error: [239, 68, 68] as [number, number, number], // Red-500
  text: [17, 24, 39] as [number, number, number], // Gray-900
  textMuted: [107, 114, 128] as [number, number, number], // Gray-500
  background: [249, 250, 251] as [number, number, number], // Gray-50
  white: [255, 255, 255] as [number, number, number],
}

const FONTS = {
  title: 24,
  h1: 18,
  h2: 14,
  h3: 12,
  body: 10,
  small: 8,
  caption: 7,
}

const MARGINS = {
  left: 20,
  right: 20,
  top: 25,
  bottom: 25,
}

// ============================================================================
// Main Generator Class
// ============================================================================

export class ExperimentPDFGenerator {
  private doc: jsPDF
  private data: ExperimentReportData
  private config: ExperimentReportConfig
  private pageNumber: number = 1
  private tocEntries: Array<{ title: string; page: number; level: number }> = []
  private tableCount: number = 0

  constructor(data: ExperimentReportData, config?: Partial<ExperimentReportConfig>) {
    this.data = data
    this.config = {
      includeOverview: true,
      includeProtocol: true,
      includeSafety: true,
      includeValidation: true,
      includeRecommendations: true,
      includeConclusions: true,
      includeLimitations: true,
      includeReferences: true,
      includeAppendix: false,
      detailLevel: 'standard',
      includeCostBreakdown: true,
      includeSafetyDetails: true,
      includeEquipmentAlternatives: true,
      colorScheme: 'default',
      pageSize: 'a4',
      orientation: 'portrait',
      ...config,
    }
    this.doc = new jsPDF({
      orientation: this.config.orientation,
      unit: 'mm',
      format: this.config.pageSize,
    })
  }

  /**
   * Generate the complete PDF report
   */
  async generate(): Promise<Blob> {
    // Cover page
    this.addCoverPage()

    // Table of Contents
    this.addNewPage()
    const tocPage = this.pageNumber

    // Main content sections
    if (this.config.includeOverview) {
      this.addNewPage()
      this.addOverview()
    }

    if (this.config.includeProtocol) {
      this.addNewPage()
      this.addProtocol()
    }

    if (this.config.includeSafety) {
      this.addNewPage()
      this.addSafety()
    }

    if (this.config.includeValidation) {
      this.addNewPage()
      this.addValidation()
    }

    if (this.config.includeRecommendations && this.data.recommendations.length > 0) {
      this.addNewPage()
      this.addRecommendations()
    }

    if (this.config.includeConclusions) {
      this.addNewPage()
      this.addConclusions()
    }

    if (this.config.includeLimitations && this.data.limitations.length > 0) {
      this.addNewPage()
      this.addLimitations()
    }

    if (this.config.includeReferences && this.data.references && this.data.references.length > 0) {
      this.addNewPage()
      this.addReferences()
    }

    // Go back and fill in Table of Contents
    this.doc.setPage(tocPage)
    this.fillTableOfContents()

    // Add page numbers
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
    a.download = filename || `Experiment_Report_${this.data.metadata.id}.pdf`
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

    // Header background
    this.doc.setFillColor(...COLORS.primary)
    this.doc.rect(0, 0, pageWidth, 80, 'F')

    // Title
    this.doc.setTextColor(...COLORS.white)
    this.doc.setFontSize(FONTS.title)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('EXPERIMENT PROTOCOL', pageWidth / 2, 35, { align: 'center' })

    // Subtitle
    this.doc.setFontSize(FONTS.h2)
    this.doc.setFont('helvetica', 'normal')
    const title = this.data.metadata.title.length > 60
      ? this.data.metadata.title.substring(0, 57) + '...'
      : this.data.metadata.title
    this.doc.text(title, pageWidth / 2, 50, { align: 'center' })

    // Domain badge
    this.doc.setFontSize(FONTS.body)
    const domainText = this.data.metadata.domain.replace(/-/g, ' ').toUpperCase()
    this.doc.text(domainText, pageWidth / 2, 65, { align: 'center' })

    // Project info box
    let y = 100
    this.doc.setFillColor(...COLORS.background)
    this.doc.roundedRect(MARGINS.left, y, pageWidth - MARGINS.left * 2, 50, 3, 3, 'F')

    y += 15
    this.doc.setTextColor(...COLORS.text)
    this.doc.setFontSize(FONTS.h3)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Protocol Details', MARGINS.left + 10, y)

    y += 10
    this.doc.setFontSize(FONTS.body)
    this.doc.setFont('helvetica', 'normal')
    this.doc.text(`Generated: ${new Date(this.data.metadata.createdAt).toLocaleDateString()}`, MARGINS.left + 10, y)

    y += 7
    this.doc.text(`Estimated Duration: ${this.data.protocol.estimatedDuration}`, MARGINS.left + 10, y)

    y += 7
    this.doc.text(`Estimated Cost: $${this.data.protocol.estimatedCost.toFixed(2)}`, MARGINS.left + 10, y)

    // Validation summary box
    y = 170
    this.doc.setFillColor(...COLORS.background)
    this.doc.roundedRect(MARGINS.left, y, pageWidth - MARGINS.left * 2, 40, 3, 3, 'F')

    y += 15
    this.doc.setFontSize(FONTS.h3)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Validation Summary', MARGINS.left + 10, y)

    y += 10
    this.doc.setFontSize(FONTS.body)
    this.doc.setFont('helvetica', 'normal')
    const validationText = [
      `Literature: ${this.data.validation.literatureAlignment.confidence}%`,
      `Equipment: ${this.data.validation.equipmentFeasibility.tier}`,
      `Safety: ${this.data.validation.materialSafety.hazardCount} hazards`,
    ].join('  |  ')
    this.doc.text(validationText, MARGINS.left + 10, y)

    // Footer
    const footerY = this.doc.internal.pageSize.getHeight() - 20
    this.doc.setFontSize(FONTS.small)
    this.doc.setTextColor(...COLORS.textMuted)
    this.doc.text('Generated by Exergy Lab', pageWidth / 2, footerY, { align: 'center' })
  }

  // ============================================================================
  // Table of Contents
  // ============================================================================

  private fillTableOfContents(): void {
    const pageWidth = this.doc.internal.pageSize.getWidth()

    this.doc.setTextColor(...COLORS.primary)
    this.doc.setFontSize(FONTS.h1)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('Table of Contents', MARGINS.left, MARGINS.top + 10)

    let y = MARGINS.top + 25
    this.doc.setTextColor(...COLORS.text)

    for (const entry of this.tocEntries) {
      const indent = entry.level === 1 ? 0 : 10
      this.doc.setFontSize(entry.level === 1 ? FONTS.h3 : FONTS.body)
      this.doc.setFont('helvetica', entry.level === 1 ? 'bold' : 'normal')

      // Title
      this.doc.text(entry.title, MARGINS.left + indent, y)

      // Page number
      this.doc.text(entry.page.toString(), pageWidth - MARGINS.right, y, { align: 'right' })

      // Dotted line
      const titleWidth = this.doc.getTextWidth(entry.title)
      const pageNumWidth = this.doc.getTextWidth(entry.page.toString())
      const dotsStart = MARGINS.left + indent + titleWidth + 5
      const dotsEnd = pageWidth - MARGINS.right - pageNumWidth - 5

      this.doc.setFontSize(FONTS.body)
      const dots = '.'.repeat(Math.floor((dotsEnd - dotsStart) / 2))
      this.doc.setTextColor(...COLORS.textMuted)
      this.doc.text(dots, dotsStart, y)
      this.doc.setTextColor(...COLORS.text)

      y += entry.level === 1 ? 8 : 6
    }
  }

  // ============================================================================
  // Overview Section
  // ============================================================================

  private addOverview(): void {
    this.addSectionHeader('1. Overview')

    let y = MARGINS.top + 25

    // Goal
    this.doc.setFontSize(FONTS.h3)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.text)
    this.doc.text('Experiment Goal', MARGINS.left, y)

    y += 8
    this.doc.setFontSize(FONTS.body)
    this.doc.setFont('helvetica', 'normal')
    const goalLines = this.doc.splitTextToSize(
      this.data.overview.goal,
      this.doc.internal.pageSize.getWidth() - MARGINS.left * 2
    )
    this.doc.text(goalLines, MARGINS.left, y)
    y += goalLines.length * 5 + 10

    // Objectives
    if (this.data.overview.objectives.length > 0) {
      this.doc.setFontSize(FONTS.h3)
      this.doc.setFont('helvetica', 'bold')
      this.doc.text('Objectives', MARGINS.left, y)
      y += 8

      this.doc.setFontSize(FONTS.body)
      this.doc.setFont('helvetica', 'normal')
      for (const objective of this.data.overview.objectives) {
        this.doc.text(`• ${objective}`, MARGINS.left + 5, y)
        y += 6
      }
    }
  }

  // ============================================================================
  // Protocol Section
  // ============================================================================

  private addProtocol(): void {
    this.addSectionHeader('2. Experimental Protocol')

    let y = MARGINS.top + 25

    // Materials table
    this.doc.setFontSize(FONTS.h3)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.text)
    this.doc.text('2.1 Materials', MARGINS.left, y)
    this.tocEntries.push({ title: 'Materials', page: this.pageNumber, level: 2 })

    y += 5

    const materialsData = this.data.protocol.materials.map((m) => [
      m.name,
      `${m.quantity} ${m.unit}`,
      m.cost ? `$${m.cost.toFixed(2)}` : '-',
    ])

    autoTable(this.doc, {
      startY: y,
      head: [['Material', 'Quantity', 'Cost']],
      body: materialsData,
      theme: 'striped',
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white },
      margin: { left: MARGINS.left, right: MARGINS.right },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    y = (this.doc as any).lastAutoTable.finalY + 15

    // Equipment list
    this.doc.setFontSize(FONTS.h3)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('2.2 Equipment', MARGINS.left, y)
    this.tocEntries.push({ title: 'Equipment', page: this.pageNumber, level: 2 })

    y += 8
    this.doc.setFontSize(FONTS.body)
    this.doc.setFont('helvetica', 'normal')
    for (const equipment of this.data.protocol.equipment) {
      this.doc.text(`• ${equipment}`, MARGINS.left + 5, y)
      y += 6
    }

    // Check if we need a new page for procedure
    if (y > this.doc.internal.pageSize.getHeight() - 80) {
      this.addNewPage()
      y = MARGINS.top + 10
    } else {
      y += 10
    }

    // Procedure steps
    this.doc.setFontSize(FONTS.h3)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('2.3 Procedure', MARGINS.left, y)
    this.tocEntries.push({ title: 'Procedure', page: this.pageNumber, level: 2 })

    y += 5

    const stepsData = this.data.protocol.steps.map((step) => [
      step.step.toString(),
      step.title,
      step.description.substring(0, 100) + (step.description.length > 100 ? '...' : ''),
      step.duration || '-',
    ])

    autoTable(this.doc, {
      startY: y,
      head: [['Step', 'Title', 'Description', 'Duration']],
      body: stepsData,
      theme: 'striped',
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 35 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 25 },
      },
      margin: { left: MARGINS.left, right: MARGINS.right },
    })
  }

  // ============================================================================
  // Safety Section
  // ============================================================================

  private addSafety(): void {
    this.addSectionHeader('3. Safety Information')

    let y = MARGINS.top + 25

    // Hazards table
    this.doc.setFontSize(FONTS.h3)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.text)
    this.doc.text('3.1 Material Hazards', MARGINS.left, y)
    this.tocEntries.push({ title: 'Material Hazards', page: this.pageNumber, level: 2 })

    y += 5

    if (this.data.safety.hazards.length > 0) {
      const hazardsData = this.data.safety.hazards.map((h) => [
        h.material,
        h.hazardClass.toUpperCase(),
        h.handlingRequirements.join(', ').substring(0, 50),
      ])

      autoTable(this.doc, {
        startY: y,
        head: [['Material', 'Hazard Level', 'Handling Requirements']],
        body: hazardsData,
        theme: 'striped',
        headStyles: { fillColor: COLORS.warning, textColor: COLORS.text },
        margin: { left: MARGINS.left, right: MARGINS.right },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (this.doc as any).lastAutoTable.finalY + 15
    } else {
      y += 10
      this.doc.setFontSize(FONTS.body)
      this.doc.setFont('helvetica', 'normal')
      this.doc.text('No significant hazards identified.', MARGINS.left, y)
      y += 15
    }

    // Required PPE
    this.doc.setFontSize(FONTS.h3)
    this.doc.setFont('helvetica', 'bold')
    this.doc.text('3.2 Required Personal Protective Equipment', MARGINS.left, y)
    this.tocEntries.push({ title: 'Required PPE', page: this.pageNumber, level: 2 })

    y += 8
    this.doc.setFontSize(FONTS.body)
    this.doc.setFont('helvetica', 'normal')

    if (this.data.safety.requiredPPE.length > 0) {
      for (const ppe of this.data.safety.requiredPPE) {
        this.doc.text(`• ${ppe}`, MARGINS.left + 5, y)
        y += 6
      }
    } else {
      this.doc.text('Standard laboratory PPE required.', MARGINS.left, y)
    }
  }

  // ============================================================================
  // Validation Section
  // ============================================================================

  private addValidation(): void {
    this.addSectionHeader('4. Validation Results')

    let y = MARGINS.top + 25
    const pageWidth = this.doc.internal.pageSize.getWidth()
    const colWidth = (pageWidth - MARGINS.left * 2 - 10) / 2

    // Literature Alignment
    this.doc.setFillColor(...COLORS.background)
    this.doc.roundedRect(MARGINS.left, y, colWidth, 45, 2, 2, 'F')

    this.doc.setFontSize(FONTS.h3)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.text)
    this.doc.text('Literature Alignment', MARGINS.left + 5, y + 12)

    this.doc.setFontSize(FONTS.title)
    this.doc.setTextColor(...COLORS.primary)
    this.doc.text(
      `${this.data.validation.literatureAlignment.confidence}%`,
      MARGINS.left + 5,
      y + 30
    )

    this.doc.setFontSize(FONTS.small)
    this.doc.setTextColor(...COLORS.textMuted)
    this.doc.text(
      `${this.data.validation.literatureAlignment.matchedPapers} papers matched`,
      MARGINS.left + 5,
      y + 38
    )

    // Equipment Feasibility
    this.doc.setFillColor(...COLORS.background)
    this.doc.roundedRect(MARGINS.left + colWidth + 10, y, colWidth, 45, 2, 2, 'F')

    this.doc.setFontSize(FONTS.h3)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.text)
    this.doc.text('Equipment Tier', MARGINS.left + colWidth + 15, y + 12)

    this.doc.setFontSize(FONTS.title)
    this.doc.setTextColor(...COLORS.accent)
    this.doc.text(
      this.data.validation.equipmentFeasibility.tier.toUpperCase(),
      MARGINS.left + colWidth + 15,
      y + 30
    )

    this.doc.setFontSize(FONTS.small)
    this.doc.setTextColor(...COLORS.textMuted)
    this.doc.text(
      `${this.data.validation.equipmentFeasibility.availableCount} available`,
      MARGINS.left + colWidth + 15,
      y + 38
    )

    y += 55

    // Cost Breakdown
    if (this.config.includeCostBreakdown) {
      this.doc.setFontSize(FONTS.h3)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...COLORS.text)
      this.doc.text('4.1 Cost Breakdown', MARGINS.left, y)
      this.tocEntries.push({ title: 'Cost Breakdown', page: this.pageNumber, level: 2 })

      y += 5

      const costData = this.data.validation.costAccuracy.breakdown.materials.map((m) => [
        m.name,
        m.quantity,
        `$${m.unitCost.toFixed(2)}`,
        `$${m.totalCost.toFixed(2)}`,
      ])

      // Add total row
      costData.push([
        'TOTAL',
        '',
        '',
        `$${this.data.validation.costAccuracy.totalCost.toFixed(2)}`,
      ])

      autoTable(this.doc, {
        startY: y,
        head: [['Material', 'Quantity', 'Unit Cost', 'Total']],
        body: costData,
        theme: 'striped',
        headStyles: { fillColor: COLORS.primary, textColor: COLORS.white },
        margin: { left: MARGINS.left, right: MARGINS.right },
        didParseCell: (data) => {
          // Bold the total row
          if (data.row.index === costData.length - 1) {
            data.cell.styles.fontStyle = 'bold'
          }
        },
      })
    }
  }

  // ============================================================================
  // Recommendations Section
  // ============================================================================

  private addRecommendations(): void {
    this.addSectionHeader('5. Recommendations')

    let y = MARGINS.top + 25

    for (const rec of this.data.recommendations) {
      // Priority badge
      const priorityColor =
        rec.priority === 'critical'
          ? COLORS.error
          : rec.priority === 'high'
          ? COLORS.warning
          : COLORS.accent

      this.doc.setFillColor(...priorityColor)
      this.doc.roundedRect(MARGINS.left, y - 4, 60, 6, 1, 1, 'F')
      this.doc.setFontSize(FONTS.caption)
      this.doc.setTextColor(...COLORS.white)
      this.doc.text(rec.priority.toUpperCase(), MARGINS.left + 2, y)

      // Title
      y += 8
      this.doc.setFontSize(FONTS.h3)
      this.doc.setFont('helvetica', 'bold')
      this.doc.setTextColor(...COLORS.text)
      this.doc.text(rec.title, MARGINS.left, y)

      // Description
      y += 7
      this.doc.setFontSize(FONTS.body)
      this.doc.setFont('helvetica', 'normal')
      const descLines = this.doc.splitTextToSize(
        rec.description,
        this.doc.internal.pageSize.getWidth() - MARGINS.left * 2
      )
      this.doc.text(descLines, MARGINS.left, y)
      y += descLines.length * 5 + 10
    }
  }

  // ============================================================================
  // Conclusions Section
  // ============================================================================

  private addConclusions(): void {
    this.addSectionHeader('6. Conclusions')

    let y = MARGINS.top + 25

    this.doc.setFontSize(FONTS.body)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...COLORS.text)

    for (const conclusion of this.data.conclusions) {
      const lines = this.doc.splitTextToSize(
        conclusion,
        this.doc.internal.pageSize.getWidth() - MARGINS.left * 2
      )
      this.doc.text(lines, MARGINS.left, y)
      y += lines.length * 5 + 8
    }
  }

  // ============================================================================
  // Limitations Section
  // ============================================================================

  private addLimitations(): void {
    this.addSectionHeader('7. Limitations')

    let y = MARGINS.top + 25

    this.doc.setFontSize(FONTS.body)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...COLORS.text)

    for (const limitation of this.data.limitations) {
      this.doc.text(`• ${limitation}`, MARGINS.left + 5, y)
      y += 7
    }
  }

  // ============================================================================
  // References Section
  // ============================================================================

  private addReferences(): void {
    this.addSectionHeader('8. References')

    let y = MARGINS.top + 25

    this.doc.setFontSize(FONTS.body)
    this.doc.setFont('helvetica', 'normal')
    this.doc.setTextColor(...COLORS.text)

    if (this.data.references) {
      for (let i = 0; i < this.data.references.length; i++) {
        const ref = this.data.references[i]
        this.doc.text(`[${i + 1}] ${ref}`, MARGINS.left, y)
        y += 7
      }
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
    this.doc.setFontSize(FONTS.h1)
    this.doc.setFont('helvetica', 'bold')
    this.doc.setTextColor(...COLORS.primary)
    this.doc.text(title, MARGINS.left, MARGINS.top + 10)

    // Underline
    const pageWidth = this.doc.internal.pageSize.getWidth()
    this.doc.setDrawColor(...COLORS.primary)
    this.doc.setLineWidth(0.5)
    this.doc.line(MARGINS.left, MARGINS.top + 14, pageWidth - MARGINS.right, MARGINS.top + 14)

    // Add to TOC
    this.tocEntries.push({ title, page: this.pageNumber, level: 1 })
  }

  private addPageNumbers(): void {
    const totalPages = this.doc.getNumberOfPages()

    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i)
      this.doc.setFontSize(FONTS.small)
      this.doc.setTextColor(...COLORS.textMuted)
      this.doc.text(
        `Page ${i} of ${totalPages}`,
        this.doc.internal.pageSize.getWidth() / 2,
        this.doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      )
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate an experiment PDF report
 */
export async function generateExperimentPDF(
  data: ExperimentReportData,
  config?: Partial<ExperimentReportConfig>
): Promise<Blob> {
  const generator = new ExperimentPDFGenerator(data, config)
  return generator.generate()
}

/**
 * Download an experiment PDF report
 */
export async function downloadExperimentPDF(
  data: ExperimentReportData,
  filename?: string,
  config?: Partial<ExperimentReportConfig>
): Promise<void> {
  const generator = new ExperimentPDFGenerator(data, config)
  await generator.download(filename)
}
