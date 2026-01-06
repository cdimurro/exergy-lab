/**
 * Shared PDF Styling Constants
 *
 * Provides consistent colors, typography, and styling across all PDF generators
 * in the Exergy Lab platform.
 */

import jsPDF from 'jspdf'
import { registerCustomFonts, FONTS as FONT_FAMILIES } from '../fonts'

// Re-export font registration for convenience
export { registerCustomFonts, FONT_FAMILIES }

/**
 * Professional color palette for all PDF reports
 * Based on Exergy Lab design system with blue primary and emerald accent
 */
export const COLORS = {
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

/**
 * Font size constants for consistent typography
 */
export const FONT_SIZES = {
  title: 24,
  h1: 18,
  h2: 14,
  h3: 12,
  body: 10,
  small: 9,
  caption: 8,
} as const

/**
 * Standard margins for A4 documents
 */
export const MARGINS = {
  left: 20,
  right: 20,
  top: 25,
  bottom: 25,
} as const

/**
 * Initialize a jsPDF document with custom fonts and standard settings
 */
export function initializePDFDocument(options?: {
  orientation?: 'portrait' | 'landscape'
  format?: 'a4' | 'letter'
}): jsPDF {
  const doc = new jsPDF({
    orientation: options?.orientation || 'portrait',
    unit: 'mm',
    format: options?.format || 'a4',
  })

  // Register custom Inter font family
  registerCustomFonts(doc)

  return doc
}

/**
 * Draw a professional header bar with accent stripe
 */
export function drawHeaderBar(
  doc: jsPDF,
  options?: {
    height?: number
    title?: string
    subtitle?: string
  }
): void {
  const pageWidth = doc.internal.pageSize.getWidth()
  const height = options?.height || 65

  // Primary header
  doc.setFillColor(...COLORS.primary)
  doc.rect(0, 0, pageWidth, height, 'F')

  // Accent stripe
  doc.setFillColor(...COLORS.accent)
  doc.rect(0, height, pageWidth, 3, 'F')

  // Title text
  if (options?.title) {
    doc.setTextColor(...COLORS.white)
    doc.setFontSize(22)
    doc.setFont(FONT_FAMILIES.body, 'bold')
    doc.text(options.title, pageWidth / 2, height / 2 + 5, { align: 'center' })
  }

  // Subtitle
  if (options?.subtitle) {
    doc.setFontSize(10)
    doc.setFont(FONT_FAMILIES.body, 'normal')
    doc.text(options.subtitle, pageWidth / 2, height / 2 + 15, { align: 'center' })
  }
}

/**
 * Draw a metrics summary box with 3-column layout
 */
export function drawMetricsBox(
  doc: jsPDF,
  metrics: Array<{ label: string; value: string }>,
  options: {
    x: number
    y: number
    width: number
    height?: number
  }
): number {
  const height = options.height || 35
  const padding = 10
  const colWidth = (options.width - 2 * padding) / Math.min(metrics.length, 3)

  // Background
  doc.setFillColor(...COLORS.backgroundAlt)
  doc.roundedRect(options.x, options.y, options.width, height, 4, 4, 'F')

  // Accent left border
  doc.setFillColor(...COLORS.accent)
  doc.rect(options.x, options.y, 4, height, 'F')

  // Metrics
  metrics.slice(0, 3).forEach((metric, i) => {
    const x = options.x + padding + i * colWidth

    // Label
    doc.setFont(FONT_FAMILIES.body, 'normal')
    doc.setFontSize(FONT_SIZES.caption)
    doc.setTextColor(...COLORS.textMuted)
    doc.text(metric.label, x, options.y + 12)

    // Value
    doc.setFont(FONT_FAMILIES.body, 'bold')
    doc.setFontSize(14)
    doc.setTextColor(...COLORS.primary)
    doc.text(metric.value, x, options.y + 24)
  })

  return options.y + height
}

/**
 * Draw a section header with optional bookmark
 */
export function drawSectionHeader(
  doc: jsPDF,
  title: string,
  options: {
    y: number
    level?: 1 | 2 | 3
    addBookmark?: boolean
  }
): number {
  const level = options.level || 1
  const sizes = { 1: FONT_SIZES.h1, 2: FONT_SIZES.h2, 3: FONT_SIZES.h3 }
  const spacing = { 1: 12, 2: 10, 3: 8 }

  doc.setFontSize(sizes[level])
  doc.setFont(FONT_FAMILIES.body, 'bold')
  doc.setTextColor(...COLORS.primary)
  doc.text(title, MARGINS.left, options.y)
  doc.setTextColor(0, 0, 0)

  // Add bookmark for level 1-2 headers
  if (options.addBookmark && level <= 2) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const docWithOutline = doc as any
      if (typeof docWithOutline.outline?.add === 'function') {
        docWithOutline.outline.add(null, title, { pageNumber: doc.getNumberOfPages() })
      }
    } catch {
      // Outline API not available
    }
  }

  return options.y + spacing[level]
}

/**
 * Standard autoTable configuration for consistent table styling
 */
export function getTableConfig(doc: jsPDF, startY: number) {
  return {
    startY,
    theme: 'plain' as const,
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontSize: FONT_SIZES.body,
      fontStyle: 'bold' as const,
      halign: 'left' as const,
      cellPadding: 4,
    },
    bodyStyles: {
      fontSize: FONT_SIZES.small,
      cellPadding: 3,
      textColor: COLORS.text,
    },
    alternateRowStyles: {
      fillColor: COLORS.backgroundAlt,
    },
    styles: {
      font: FONT_FAMILIES.body,
      overflow: 'linebreak' as const,
      lineWidth: 0.1,
      lineColor: COLORS.border,
    },
    margin: { left: MARGINS.left, right: MARGINS.right },
    tableLineColor: COLORS.border,
    tableLineWidth: 0.1,
  }
}

/**
 * Format currency values consistently
 */
export function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`
  if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`
  if (Math.abs(value) >= 1e3) return `$${(value / 1e3).toFixed(2)}K`
  return `$${value.toFixed(2)}`
}

/**
 * Add page numbers to all pages
 */
export function addPageNumbers(doc: jsPDF, skipPages: number = 1): void {
  const pageCount = doc.getNumberOfPages()
  const pageHeight = doc.internal.pageSize.getHeight()
  const pageWidth = doc.internal.pageSize.getWidth()

  for (let i = skipPages + 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(FONT_SIZES.small)
    doc.setTextColor(...COLORS.textMuted)
    doc.text(`Page ${i - skipPages} of ${pageCount - skipPages}`, pageWidth / 2, pageHeight - 10, {
      align: 'center',
    })
  }
  doc.setTextColor(0, 0, 0)
}
