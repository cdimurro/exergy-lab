/**
 * Custom Font Registration for jsPDF
 *
 * Registers professional Inter font family for PDF generation.
 * Fonts are embedded as base64 to work in serverless environments.
 */

import jsPDF from 'jspdf'

// Font data imports (base64 encoded TTF files)
import { interRegularBase64 } from './inter-regular'
import { interBoldBase64 } from './inter-bold'
import { interSemiboldBase64 } from './inter-semibold'

/**
 * Font family constants for consistent usage
 */
export const FONTS = {
  heading: 'Inter',
  body: 'Inter',
  mono: 'Courier', // Built-in fallback for code/formulas
} as const

/**
 * Font style constants
 */
export const FONT_STYLES = {
  normal: 'normal',
  bold: 'bold',
  semibold: 'semibold',
} as const

/**
 * Register custom fonts with a jsPDF document instance.
 * Must be called after creating the jsPDF instance and before using custom fonts.
 *
 * @param doc - The jsPDF document instance
 */
export function registerCustomFonts(doc: jsPDF): void {
  // Register Inter Regular
  doc.addFileToVFS('Inter-Regular.ttf', interRegularBase64)
  doc.addFont('Inter-Regular.ttf', 'Inter', 'normal')

  // Register Inter Bold
  doc.addFileToVFS('Inter-Bold.ttf', interBoldBase64)
  doc.addFont('Inter-Bold.ttf', 'Inter', 'bold')

  // Register Inter SemiBold
  doc.addFileToVFS('Inter-SemiBold.ttf', interSemiboldBase64)
  doc.addFont('Inter-SemiBold.ttf', 'Inter', 'semibold')
}

/**
 * Typography scale for consistent text sizing
 */
export const TYPOGRAPHY = {
  h1: { size: 24, weight: 'bold' as const },
  h2: { size: 18, weight: 'bold' as const },
  h3: { size: 14, weight: 'semibold' as const },
  h4: { size: 12, weight: 'semibold' as const },
  body: { size: 10, weight: 'normal' as const },
  small: { size: 9, weight: 'normal' as const },
  caption: { size: 8, weight: 'normal' as const },
} as const

/**
 * Helper to set font with typography preset
 */
export function setTypography(
  doc: jsPDF,
  preset: keyof typeof TYPOGRAPHY
): void {
  const { size, weight } = TYPOGRAPHY[preset]
  doc.setFontSize(size)
  doc.setFont(FONTS.body, weight)
}
