'use client'

import * as React from 'react'
import { useState, useEffect, useMemo } from 'react'
import { GitBranch, ArrowLeft, ArrowRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import type { CitationGraph, CitationNode, CitationEdge } from '@/hooks/useCitationGraph'

interface CitationGraphViewProps {
  graph: CitationGraph
  onNodeClick?: (node: CitationNode) => void
  onClose?: () => void
}

interface LayoutNode extends CitationNode {
  x: number
  y: number
}

export function CitationGraphView({ graph, onNodeClick, onClose }: CitationGraphViewProps) {
  const [zoom, setZoom] = useState(1)
  const [depth, setDepth] = useState(2)
  const [showLabels, setShowLabels] = useState(true)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)

  // Calculate node positions using a simple force-directed-like layout
  const layoutNodes = useMemo(() => {
    const nodes = graph.nodes.filter((n) => n.depth <= depth)
    const width = 800
    const height = 500
    const centerX = width / 2
    const centerY = height / 2

    const result: LayoutNode[] = []

    // Position selected node at center
    const selectedNode = nodes.find((n) => n.isSelected)
    if (selectedNode) {
      result.push({ ...selectedNode, x: centerX, y: centerY })
    }

    // Position references (left side)
    const references = nodes.filter((n) => n.type === 'reference' && n.depth === 1)
    const refAngleStep = Math.PI / (references.length + 1)
    references.forEach((node, i) => {
      const angle = Math.PI / 2 + refAngleStep * (i + 1)
      const radius = 150
      result.push({
        ...node,
        x: centerX - radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle) - radius / 2,
      })
    })

    // Position citations (right side)
    const citations = nodes.filter((n) => n.type === 'citation' && n.depth === 1)
    const citAngleStep = Math.PI / (citations.length + 1)
    citations.forEach((node, i) => {
      const angle = -Math.PI / 2 + citAngleStep * (i + 1)
      const radius = 150
      result.push({
        ...node,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle) + radius / 2,
      })
    })

    // Position second-hop nodes
    if (depth >= 2) {
      const hop2Nodes = nodes.filter((n) => n.depth === 2)
      hop2Nodes.forEach((node) => {
        // Find parent node
        const parentEdge = graph.edges.find(
          (e) =>
            (e.source === node.id && nodes.find((n) => n.id === e.target)?.depth === 1) ||
            (e.target === node.id && nodes.find((n) => n.id === e.source)?.depth === 1)
        )
        const parentId = parentEdge
          ? parentEdge.source === node.id
            ? parentEdge.target
            : parentEdge.source
          : null
        const parent = parentId ? result.find((n) => n.id === parentId) : null

        if (parent) {
          const offsetX = (Math.random() - 0.5) * 60
          const offsetY = (Math.random() - 0.5) * 40
          const directionX = parent.x < centerX ? -100 : 100
          result.push({
            ...node,
            x: parent.x + directionX + offsetX,
            y: parent.y + offsetY,
          })
        }
      })
    }

    return result
  }, [graph, depth])

  // Filter edges to only include visible nodes
  const visibleEdges = useMemo(() => {
    const visibleIds = new Set(layoutNodes.map((n) => n.id))
    return graph.edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
  }, [graph.edges, layoutNodes])

  const getNodePosition = (id: string) => {
    const node = layoutNodes.find((n) => n.id === id)
    return node ? { x: node.x, y: node.y } : { x: 0, y: 0 }
  }

  const getNodeColor = (node: LayoutNode) => {
    if (node.isSelected) return '#10b981' // emerald
    if (node.type === 'reference') return '#3b82f6' // blue
    return '#f59e0b' // amber
  }

  const getNodeSize = (node: LayoutNode) => {
    const baseSize = node.isSelected ? 12 : 8
    const citationBonus = Math.min(4, node.citationCount / 50)
    return baseSize + citationBonus
  }

  return (
    <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-emerald-500" />
          <span className="font-medium text-white">Citation Network</span>
          <span className="text-sm text-zinc-400">
            {layoutNodes.length} nodes, {visibleEdges.length} connections
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Depth control */}
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-800 rounded">
            <span className="text-xs text-zinc-400">Depth:</span>
            <Slider
              value={[depth]}
              onValueChange={([v]) => setDepth(v)}
              min={1}
              max={3}
              step={1}
              className="w-20"
            />
            <span className="text-xs text-white w-4">{depth}</span>
          </div>

          {/* Zoom controls */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
            className="h-8 w-8 p-0"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-zinc-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setZoom(Math.min(2, zoom + 0.25))}
            className="h-8 w-8 p-0"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Graph */}
      <div className="relative overflow-hidden" style={{ height: 500 }}>
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${800 / zoom} ${500 / zoom}`}
          className="cursor-grab active:cursor-grabbing"
        >
          {/* Edges */}
          <g className="edges">
            {visibleEdges.map((edge, i) => {
              const source = getNodePosition(edge.source)
              const target = getNodePosition(edge.target)
              const isHighlighted =
                hoveredNode === edge.source || hoveredNode === edge.target

              return (
                <line
                  key={i}
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={isHighlighted ? '#6366f1' : '#3f3f46'}
                  strokeWidth={isHighlighted ? 2 : 1}
                  strokeOpacity={isHighlighted ? 1 : 0.6}
                />
              )
            })}
          </g>

          {/* Nodes */}
          <g className="nodes">
            {layoutNodes.map((node) => (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => onNodeClick?.(node)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer"
              >
                {/* Node circle */}
                <circle
                  r={getNodeSize(node)}
                  fill={getNodeColor(node)}
                  stroke={hoveredNode === node.id ? '#fff' : 'transparent'}
                  strokeWidth={2}
                  className="transition-all duration-200"
                />

                {/* Node label */}
                {showLabels && (node.isSelected || hoveredNode === node.id) && (
                  <g>
                    <rect
                      x={-60}
                      y={getNodeSize(node) + 4}
                      width={120}
                      height={20}
                      fill="rgba(0,0,0,0.8)"
                      rx={4}
                    />
                    <text
                      y={getNodeSize(node) + 18}
                      textAnchor="middle"
                      className="text-xs fill-white"
                      style={{ fontSize: 10 }}
                    >
                      {node.title.length > 25 ? node.title.slice(0, 25) + '...' : node.title}
                    </text>
                  </g>
                )}
              </g>
            ))}
          </g>
        </svg>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 flex items-center gap-4 bg-zinc-900/90 rounded-lg px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs text-zinc-400">Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowLeft className="h-3 w-3 text-blue-500" />
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-xs text-zinc-400">References</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <ArrowRight className="h-3 w-3 text-amber-500" />
            <span className="text-xs text-zinc-400">Citations</span>
          </div>
        </div>

        {/* Stats */}
        <div className="absolute bottom-4 right-4 bg-zinc-900/90 rounded-lg px-3 py-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-zinc-400">References:</span>
            <span className="text-white">{graph.stats.totalReferences}</span>
            <span className="text-zinc-400">Citations:</span>
            <span className="text-white">{graph.stats.totalCitations}</span>
            <span className="text-zinc-400">Influential:</span>
            <span className="text-white">{graph.stats.influentialCitations}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
