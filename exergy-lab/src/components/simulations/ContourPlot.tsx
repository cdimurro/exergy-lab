'use client'

import * as React from 'react'
import { useMemo } from 'react'
import type { ContourData } from '@/hooks/useParameterSweep'

interface ContourPlotProps {
  data: ContourData
  xLabel: string
  yLabel: string
  xUnit?: string
  yUnit?: string
  colorScheme?: 'viridis' | 'plasma' | 'inferno' | 'magma' | 'cool'
  showOptimal?: boolean
}

export function ContourPlot({
  data,
  xLabel,
  yLabel,
  xUnit = '',
  yUnit = '',
  colorScheme = 'viridis',
  showOptimal = true,
}: ContourPlotProps) {
  const width = 600
  const height = 400
  const margin = { top: 30, right: 100, bottom: 50, left: 60 }
  const plotWidth = width - margin.left - margin.right
  const plotHeight = height - margin.top - margin.bottom

  // Color scales
  const colorScales = {
    viridis: ['#440154', '#482878', '#3e4989', '#31688e', '#26828e', '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde725'],
    plasma: ['#0d0887', '#46039f', '#7201a8', '#9c179e', '#bd3786', '#d8576b', '#ed7953', '#fb9f3a', '#fdca26', '#f0f921'],
    inferno: ['#000004', '#1b0c41', '#4a0c6b', '#781c6d', '#a52c60', '#cf4446', '#ed6925', '#fb9b06', '#f7d13d', '#fcffa4'],
    magma: ['#000004', '#180f3d', '#440f76', '#721f81', '#9e2f7f', '#cd4071', '#f1605d', '#fd9668', '#feca8d', '#fcfdbf'],
    cool: ['#001f3f', '#0074D9', '#39CCCC', '#2ECC40', '#FFDC00', '#FF851B', '#FF4136'],
  }

  const colors = colorScales[colorScheme]

  // Calculate min/max of z values
  const { minZ, maxZ, optimalPoint } = useMemo(() => {
    let min = Infinity
    let max = -Infinity
    let optX = 0,
      optY = 0,
      optZ = -Infinity

    for (let yi = 0; yi < data.zValues.length; yi++) {
      for (let xi = 0; xi < data.zValues[yi].length; xi++) {
        const val = data.zValues[yi][xi]
        if (!isNaN(val)) {
          min = Math.min(min, val)
          max = Math.max(max, val)
          if (val > optZ) {
            optZ = val
            optX = xi
            optY = yi
          }
        }
      }
    }

    return { minZ: min, maxZ: max, optimalPoint: { xi: optX, yi: optY, z: optZ } }
  }, [data.zValues])

  // Get color for a value
  const getColor = (value: number): string => {
    if (isNaN(value)) return '#1f2937' // gray for NaN
    const normalized = (value - minZ) / (maxZ - minZ)
    const colorIndex = Math.min(Math.floor(normalized * (colors.length - 1)), colors.length - 1)
    return colors[colorIndex]
  }

  // Scale functions
  const xScale = (val: number) => {
    const range = data.xValues[data.xValues.length - 1] - data.xValues[0]
    return margin.left + ((val - data.xValues[0]) / range) * plotWidth
  }

  const yScale = (val: number) => {
    const range = data.yValues[data.yValues.length - 1] - data.yValues[0]
    return margin.top + plotHeight - ((val - data.yValues[0]) / range) * plotHeight
  }

  // Generate grid cells
  const cellWidth = plotWidth / (data.xValues.length - 1 || 1)
  const cellHeight = plotHeight / (data.yValues.length - 1 || 1)

  return (
    <div className="bg-zinc-800 rounded-lg p-4">
      <svg width={width} height={height} className="mx-auto">
        {/* Grid cells */}
        <g>
          {data.zValues.map((row, yi) =>
            row.map((value, xi) => (
              <rect
                key={`${xi}-${yi}`}
                x={margin.left + xi * cellWidth}
                y={margin.top + yi * cellHeight}
                width={cellWidth + 1}
                height={cellHeight + 1}
                fill={getColor(value)}
              />
            ))
          )}
        </g>

        {/* Optimal point marker */}
        {showOptimal && (
          <g>
            <circle
              cx={margin.left + optimalPoint.xi * cellWidth + cellWidth / 2}
              cy={margin.top + optimalPoint.yi * cellHeight + cellHeight / 2}
              r={8}
              fill="none"
              stroke="white"
              strokeWidth={2}
            />
            <circle
              cx={margin.left + optimalPoint.xi * cellWidth + cellWidth / 2}
              cy={margin.top + optimalPoint.yi * cellHeight + cellHeight / 2}
              r={3}
              fill="white"
            />
          </g>
        )}

        {/* X-axis */}
        <g transform={`translate(0, ${margin.top + plotHeight})`}>
          <line x1={margin.left} x2={margin.left + plotWidth} y1={0} y2={0} stroke="#52525b" />
          {data.xValues
            .filter((_, i) => i % Math.ceil(data.xValues.length / 5) === 0)
            .map((val, i) => (
              <g key={i} transform={`translate(${xScale(val)}, 0)`}>
                <line y1={0} y2={5} stroke="#52525b" />
                <text y={20} textAnchor="middle" className="fill-zinc-400 text-xs">
                  {val.toFixed(2)}
                </text>
              </g>
            ))}
          <text
            x={margin.left + plotWidth / 2}
            y={40}
            textAnchor="middle"
            className="fill-zinc-300 text-sm"
          >
            {xLabel} {xUnit && `(${xUnit})`}
          </text>
        </g>

        {/* Y-axis */}
        <g transform={`translate(${margin.left}, 0)`}>
          <line y1={margin.top} y2={margin.top + plotHeight} x1={0} x2={0} stroke="#52525b" />
          {data.yValues
            .filter((_, i) => i % Math.ceil(data.yValues.length / 5) === 0)
            .map((val, i) => (
              <g key={i} transform={`translate(0, ${yScale(val)})`}>
                <line x1={0} x2={-5} stroke="#52525b" />
                <text x={-10} textAnchor="end" dominantBaseline="middle" className="fill-zinc-400 text-xs">
                  {val.toFixed(2)}
                </text>
              </g>
            ))}
          <text
            transform={`translate(-45, ${margin.top + plotHeight / 2}) rotate(-90)`}
            textAnchor="middle"
            className="fill-zinc-300 text-sm"
          >
            {yLabel} {yUnit && `(${yUnit})`}
          </text>
        </g>

        {/* Color legend */}
        <g transform={`translate(${width - margin.right + 20}, ${margin.top})`}>
          <text y={-10} className="fill-zinc-300 text-xs">
            Value
          </text>
          {colors.map((color, i) => (
            <rect
              key={i}
              y={i * (plotHeight / colors.length)}
              width={15}
              height={plotHeight / colors.length + 1}
              fill={color}
            />
          ))}
          <text y={5} x={20} className="fill-zinc-400 text-xs">
            {maxZ.toFixed(3)}
          </text>
          <text y={plotHeight / 2} x={20} className="fill-zinc-400 text-xs">
            {((maxZ + minZ) / 2).toFixed(3)}
          </text>
          <text y={plotHeight} x={20} className="fill-zinc-400 text-xs">
            {minZ.toFixed(3)}
          </text>
        </g>

        {/* Title */}
        <text
          x={width / 2}
          y={15}
          textAnchor="middle"
          className="fill-white text-sm font-medium"
        >
          Parameter Space Contour
        </text>
      </svg>

      {/* Legend for optimal point */}
      {showOptimal && (
        <div className="flex items-center justify-center gap-4 mt-2 text-xs text-zinc-400">
          <div className="flex items-center gap-1">
            <div className="w-4 h-4 rounded-full border-2 border-white flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
            <span>
              Optimal: {xLabel}={data.xValues[optimalPoint.xi]?.toFixed(2)}, {yLabel}=
              {data.yValues[optimalPoint.yi]?.toFixed(2)} (Result: {optimalPoint.z.toFixed(4)})
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
