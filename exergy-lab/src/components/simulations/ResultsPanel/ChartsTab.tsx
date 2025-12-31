'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import {
  LineChart,
  BarChart3,
  ScatterChart,
  Grid3X3,
  Download,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Info,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export type ChartType = 'line' | 'bar' | 'scatter' | 'heatmap' | 'contour'

export interface ChartDataPoint {
  x: number
  y: number
  z?: number
  label?: string
}

export interface ChartSeries {
  id: string
  name: string
  data: ChartDataPoint[]
  color?: string
  type?: ChartType
}

export interface ChartConfig {
  id: string
  title: string
  type: ChartType
  xLabel: string
  yLabel: string
  xUnit?: string
  yUnit?: string
  series: ChartSeries[]
  showLegend?: boolean
  showGrid?: boolean
}

interface ChartsTabProps {
  charts: ChartConfig[]
  onChartExport?: (chartId: string, format: 'png' | 'svg' | 'csv') => void
  onChartFullscreen?: (chartId: string) => void
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const CHART_ICONS: Record<ChartType, React.ElementType> = {
  line: LineChart,
  bar: BarChart3,
  scatter: ScatterChart,
  heatmap: Grid3X3,
  contour: Grid3X3,
}

const DEFAULT_COLORS = [
  '#10B981', // emerald
  '#3B82F6', // blue
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
]

// ============================================================================
// Component
// ============================================================================

export function ChartsTab({
  charts,
  onChartExport,
  onChartFullscreen,
  className = '',
}: ChartsTabProps) {
  const [selectedChartId, setSelectedChartId] = useState<string | null>(
    charts.length > 0 ? charts[0].id : null
  )
  const [zoomLevel, setZoomLevel] = useState(1)

  const selectedChart = useMemo(() => {
    return charts.find((c) => c.id === selectedChartId)
  }, [charts, selectedChartId])

  // Reset zoom
  const resetZoom = () => setZoomLevel(1)

  // Calculate chart bounds
  const getBounds = (chart: ChartConfig) => {
    const allPoints = chart.series.flatMap((s) => s.data)
    const xValues = allPoints.map((p) => p.x)
    const yValues = allPoints.map((p) => p.y)

    return {
      xMin: Math.min(...xValues),
      xMax: Math.max(...xValues),
      yMin: Math.min(...yValues),
      yMax: Math.max(...yValues),
    }
  }

  if (charts.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <BarChart3 className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400">No charts available</p>
        <p className="text-xs text-zinc-500 mt-1">
          Run a simulation to generate visualizations
        </p>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Chart selector */}
      <div className="flex flex-wrap gap-2">
        {charts.map((chart) => {
          const Icon = CHART_ICONS[chart.type]
          const isSelected = selectedChartId === chart.id

          return (
            <button
              key={chart.id}
              onClick={() => setSelectedChartId(chart.id)}
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all
                ${isSelected
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500'
                  : 'bg-zinc-800 text-zinc-400 border border-transparent hover:bg-zinc-700'
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {chart.title}
            </button>
          )
        })}
      </div>

      {/* Selected chart display */}
      {selectedChart && (
        <div className="bg-zinc-900 rounded-lg overflow-hidden">
          {/* Chart header */}
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-white">{selectedChart.title}</h4>
              <p className="text-xs text-zinc-500">
                {selectedChart.xLabel} vs {selectedChart.yLabel}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {/* Zoom controls */}
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.25))}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs text-zinc-500 w-12 text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={resetZoom}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"
                title="Reset zoom"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-zinc-700" />
              {onChartFullscreen && (
                <button
                  onClick={() => onChartFullscreen(selectedChart.id)}
                  className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded"
                  title="Fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
              {onChartExport && (
                <div className="relative group">
                  <button className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded">
                    <Download className="w-4 h-4" />
                  </button>
                  <div className="absolute right-0 mt-1 w-24 bg-zinc-800 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    {['png', 'svg', 'csv'].map((format) => (
                      <button
                        key={format}
                        onClick={() =>
                          onChartExport(selectedChart.id, format as 'png' | 'svg' | 'csv')
                        }
                        className="w-full px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-700"
                      >
                        Export {format.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chart area - Simple SVG visualization */}
          <div
            className="p-4 overflow-auto"
            style={{ height: 400 * zoomLevel }}
          >
            <SimpleSVGChart chart={selectedChart} />
          </div>

          {/* Legend */}
          {selectedChart.showLegend !== false && selectedChart.series.length > 1 && (
            <div className="px-4 py-3 border-t border-zinc-800">
              <div className="flex flex-wrap gap-4">
                {selectedChart.series.map((series, idx) => (
                  <div key={series.id} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: series.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length] }}
                    />
                    <span className="text-xs text-zinc-300">{series.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chart info */}
      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-400 mt-0.5" />
          <div className="text-xs text-zinc-300">
            <p className="font-medium text-blue-400 mb-1">Interactive Charts</p>
            <p>
              Use zoom controls to explore data. Export charts in PNG, SVG, or CSV formats
              for use in reports and publications.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Simple SVG Chart Component
// ============================================================================

interface SimpleSVGChartProps {
  chart: ChartConfig
}

function SimpleSVGChart({ chart }: SimpleSVGChartProps) {
  const width = 600
  const height = 350
  const padding = { top: 20, right: 20, bottom: 50, left: 60 }

  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Calculate bounds
  const allPoints = chart.series.flatMap((s) => s.data)
  const xMin = Math.min(...allPoints.map((p) => p.x))
  const xMax = Math.max(...allPoints.map((p) => p.x))
  const yMin = Math.min(...allPoints.map((p) => p.y))
  const yMax = Math.max(...allPoints.map((p) => p.y))

  // Scale functions
  const scaleX = (x: number) =>
    padding.left + ((x - xMin) / (xMax - xMin || 1)) * chartWidth
  const scaleY = (y: number) =>
    padding.top + chartHeight - ((y - yMin) / (yMax - yMin || 1)) * chartHeight

  // Generate tick values
  const xTicks = Array.from({ length: 5 }, (_, i) => xMin + (i * (xMax - xMin)) / 4)
  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + (i * (yMax - yMin)) / 4)

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-full"
      style={{ minWidth: 400 }}
    >
      {/* Grid lines */}
      {chart.showGrid !== false && (
        <g className="text-zinc-700">
          {yTicks.map((tick, i) => (
            <line
              key={`y-${i}`}
              x1={padding.left}
              y1={scaleY(tick)}
              x2={width - padding.right}
              y2={scaleY(tick)}
              stroke="currentColor"
              strokeDasharray="4,4"
              opacity={0.3}
            />
          ))}
          {xTicks.map((tick, i) => (
            <line
              key={`x-${i}`}
              x1={scaleX(tick)}
              y1={padding.top}
              x2={scaleX(tick)}
              y2={height - padding.bottom}
              stroke="currentColor"
              strokeDasharray="4,4"
              opacity={0.3}
            />
          ))}
        </g>
      )}

      {/* Axes */}
      <g className="text-zinc-400" fontSize={10}>
        {/* X axis */}
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          stroke="currentColor"
        />
        {xTicks.map((tick, i) => (
          <g key={`x-tick-${i}`}>
            <line
              x1={scaleX(tick)}
              y1={height - padding.bottom}
              x2={scaleX(tick)}
              y2={height - padding.bottom + 5}
              stroke="currentColor"
            />
            <text
              x={scaleX(tick)}
              y={height - padding.bottom + 18}
              textAnchor="middle"
              fill="currentColor"
            >
              {tick.toFixed(2)}
            </text>
          </g>
        ))}
        <text
          x={width / 2}
          y={height - 10}
          textAnchor="middle"
          fill="currentColor"
          fontSize={11}
        >
          {chart.xLabel} {chart.xUnit && `(${chart.xUnit})`}
        </text>

        {/* Y axis */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          stroke="currentColor"
        />
        {yTicks.map((tick, i) => (
          <g key={`y-tick-${i}`}>
            <line
              x1={padding.left - 5}
              y1={scaleY(tick)}
              x2={padding.left}
              y2={scaleY(tick)}
              stroke="currentColor"
            />
            <text
              x={padding.left - 10}
              y={scaleY(tick) + 3}
              textAnchor="end"
              fill="currentColor"
            >
              {tick.toFixed(2)}
            </text>
          </g>
        ))}
        <text
          x={15}
          y={height / 2}
          textAnchor="middle"
          fill="currentColor"
          fontSize={11}
          transform={`rotate(-90, 15, ${height / 2})`}
        >
          {chart.yLabel} {chart.yUnit && `(${chart.yUnit})`}
        </text>
      </g>

      {/* Data series */}
      {chart.series.map((series, seriesIdx) => {
        const color = series.color || DEFAULT_COLORS[seriesIdx % DEFAULT_COLORS.length]
        const seriesType = series.type || chart.type

        if (seriesType === 'line') {
          const pathData = series.data
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.x)} ${scaleY(p.y)}`)
            .join(' ')

          return (
            <g key={series.id}>
              <path
                d={pathData}
                fill="none"
                stroke={color}
                strokeWidth={2}
              />
              {series.data.map((point, i) => (
                <circle
                  key={i}
                  cx={scaleX(point.x)}
                  cy={scaleY(point.y)}
                  r={3}
                  fill={color}
                  className="cursor-pointer hover:r-5"
                >
                  <title>
                    {point.label || `(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`}
                  </title>
                </circle>
              ))}
            </g>
          )
        }

        if (seriesType === 'scatter') {
          return (
            <g key={series.id}>
              {series.data.map((point, i) => (
                <circle
                  key={i}
                  cx={scaleX(point.x)}
                  cy={scaleY(point.y)}
                  r={4}
                  fill={color}
                  opacity={0.7}
                  className="cursor-pointer hover:opacity-100"
                >
                  <title>
                    {point.label || `(${point.x.toFixed(2)}, ${point.y.toFixed(2)})`}
                  </title>
                </circle>
              ))}
            </g>
          )
        }

        if (seriesType === 'bar') {
          const barWidth = chartWidth / series.data.length * 0.8
          return (
            <g key={series.id}>
              {series.data.map((point, i) => (
                <rect
                  key={i}
                  x={scaleX(point.x) - barWidth / 2}
                  y={scaleY(point.y)}
                  width={barWidth}
                  height={height - padding.bottom - scaleY(point.y)}
                  fill={color}
                  opacity={0.8}
                  className="cursor-pointer hover:opacity-100"
                >
                  <title>
                    {point.label || `${point.x}: ${point.y.toFixed(2)}`}
                  </title>
                </rect>
              ))}
            </g>
          )
        }

        return null
      })}
    </svg>
  )
}
