/**
 * Chart Renderer - Server-side SVG chart generation
 *
 * Generates SVG charts that can be embedded in PDF reports.
 * Uses pure SVG generation without native dependencies for Vercel compatibility.
 */

import type { SimulationVisualization } from '@/types/simulation'

// Chart colors matching the design system
const CHART_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
]

interface ChartDimensions {
  width: number
  height: number
  padding: { top: number; right: number; bottom: number; left: number }
}

const DEFAULT_DIMENSIONS: ChartDimensions = {
  width: 600,
  height: 400,
  padding: { top: 40, right: 40, bottom: 60, left: 70 },
}

/**
 * Render a visualization to SVG string
 */
export function renderChartToSVG(
  viz: SimulationVisualization,
  dimensions: ChartDimensions = DEFAULT_DIMENSIONS
): string {
  const { width, height, padding } = dimensions
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Extract data
  const labels = viz.data.map(d => String(d.timestamp))
  const datasets = Object.keys(viz.data[0]?.values || {}).map((key, i) => ({
    name: key,
    values: viz.data.map(d => d.values[key] || 0),
    color: CHART_COLORS[i % CHART_COLORS.length],
  }))

  if (datasets.length === 0 || labels.length === 0) {
    return generatePlaceholderSVG(viz.title, dimensions)
  }

  // Calculate scales
  const allValues = datasets.flatMap(d => d.values)
  const minY = Math.min(0, ...allValues)
  const maxY = Math.max(...allValues) * 1.1 // Add 10% headroom

  const xScale = (index: number) => padding.left + (index / (labels.length - 1 || 1)) * chartWidth
  const yScale = (value: number) => height - padding.bottom - ((value - minY) / (maxY - minY || 1)) * chartHeight

  // Generate SVG
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .title { font: bold 14px sans-serif; fill: #1F2937; }
    .axis-label { font: 11px sans-serif; fill: #6B7280; }
    .tick-label { font: 10px sans-serif; fill: #9CA3AF; }
    .legend-text { font: 11px sans-serif; fill: #374151; }
    .grid-line { stroke: #E5E7EB; stroke-width: 1; }
  </style>

  <!-- Background -->
  <rect width="${width}" height="${height}" fill="white"/>

  <!-- Title -->
  <text x="${width / 2}" y="24" text-anchor="middle" class="title">${escapeXml(viz.title)}</text>
`

  // Y-axis grid lines and labels
  const yTicks = 5
  for (let i = 0; i <= yTicks; i++) {
    const value = minY + (i / yTicks) * (maxY - minY)
    const y = yScale(value)
    svg += `  <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" class="grid-line"/>\n`
    svg += `  <text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" class="tick-label">${formatValue(value)}</text>\n`
  }

  // X-axis labels (show subset to avoid crowding)
  const xTickInterval = Math.max(1, Math.floor(labels.length / 6))
  for (let i = 0; i < labels.length; i += xTickInterval) {
    const x = xScale(i)
    svg += `  <text x="${x}" y="${height - padding.bottom + 20}" text-anchor="middle" class="tick-label">${labels[i]}</text>\n`
  }

  // Axis labels
  svg += `  <text x="${width / 2}" y="${height - 10}" text-anchor="middle" class="axis-label">${escapeXml(viz.xAxis)}</text>\n`
  svg += `  <text x="15" y="${height / 2}" text-anchor="middle" transform="rotate(-90 15 ${height / 2})" class="axis-label">${escapeXml(viz.yAxis)}</text>\n`

  // Render lines/areas based on chart type
  if (viz.type === 'line' || viz.type === 'scatter') {
    datasets.forEach((dataset, datasetIndex) => {
      // Line path
      const points = dataset.values.map((v, i) => `${xScale(i)},${yScale(v)}`).join(' ')
      svg += `  <polyline points="${points}" fill="none" stroke="${dataset.color}" stroke-width="2"/>\n`

      // Data points
      if (viz.type === 'scatter' || dataset.values.length <= 20) {
        dataset.values.forEach((v, i) => {
          svg += `  <circle cx="${xScale(i)}" cy="${yScale(v)}" r="4" fill="${dataset.color}"/>\n`
        })
      }
    })
  } else if (viz.type === 'bar') {
    const barWidth = (chartWidth / labels.length) * 0.8 / datasets.length
    const groupWidth = (chartWidth / labels.length) * 0.8

    datasets.forEach((dataset, datasetIndex) => {
      dataset.values.forEach((v, i) => {
        const x = xScale(i) - groupWidth / 2 + datasetIndex * barWidth
        const barHeight = Math.abs(yScale(v) - yScale(0))
        const y = v >= 0 ? yScale(v) : yScale(0)
        svg += `  <rect x="${x}" y="${y}" width="${barWidth * 0.9}" height="${barHeight}" fill="${dataset.color}" opacity="0.8"/>\n`
      })
    })
  }

  // Legend
  if (datasets.length > 1) {
    const legendY = padding.top - 15
    datasets.forEach((dataset, i) => {
      const legendX = padding.left + i * 120
      svg += `  <rect x="${legendX}" y="${legendY - 8}" width="12" height="12" fill="${dataset.color}"/>\n`
      svg += `  <text x="${legendX + 18}" y="${legendY}" class="legend-text">${escapeXml(dataset.name)}</text>\n`
    })
  }

  svg += '</svg>'
  return svg
}

/**
 * Render a chart to base64 data URI
 */
export function renderChartToBase64(viz: SimulationVisualization): string {
  const svg = renderChartToSVG(viz)
  const base64 = Buffer.from(svg).toString('base64')
  return `data:image/svg+xml;base64,${base64}`
}

/**
 * Generate a placeholder SVG for empty or invalid data
 */
function generatePlaceholderSVG(title: string, dimensions: ChartDimensions): string {
  const { width, height } = dimensions
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#F9FAFB"/>
  <text x="${width / 2}" y="${height / 2 - 10}" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#6B7280">${escapeXml(title)}</text>
  <text x="${width / 2}" y="${height / 2 + 15}" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9CA3AF">No data available</text>
</svg>`
}

/**
 * Format numeric values for display
 */
function formatValue(value: number): string {
  if (Math.abs(value) >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M'
  }
  if (Math.abs(value) >= 1000) {
    return (value / 1000).toFixed(1) + 'k'
  }
  if (Math.abs(value) < 0.01 && value !== 0) {
    return value.toExponential(1)
  }
  return value.toFixed(value % 1 === 0 ? 0 : 1)
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Batch render multiple visualizations
 */
export function renderAllChartsToBase64(
  visualizations: SimulationVisualization[]
): Map<string, string> {
  const results = new Map<string, string>()

  visualizations.forEach((viz, i) => {
    const id = `viz_${i}`
    results.set(id, renderChartToBase64(viz))
  })

  return results
}
