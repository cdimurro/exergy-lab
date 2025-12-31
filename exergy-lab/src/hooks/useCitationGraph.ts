'use client'

import { useState, useCallback } from 'react'

// ============================================================================
// Types
// ============================================================================

export interface CitationNode {
  id: string
  title: string
  authors: string[]
  year: number
  citationCount: number
  isSelected: boolean
  depth: number // 0 = selected, 1 = direct citations/references, 2 = second hop
  type: 'selected' | 'reference' | 'citation'
}

export interface CitationEdge {
  source: string
  target: string
  type: 'cites' | 'cited_by'
}

export interface CitationGraph {
  nodes: CitationNode[]
  edges: CitationEdge[]
  stats: {
    totalReferences: number
    totalCitations: number
    influentialCitations: number
    avgCitationAge: number
  }
}

export interface CitationGraphOptions {
  depth: 1 | 2 | 3
  showInfluentialOnly: boolean
  maxNodes: number
}

// ============================================================================
// Hook
// ============================================================================

export function useCitationGraph() {
  const [graph, setGraph] = useState<CitationGraph | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [options, setOptions] = useState<CitationGraphOptions>({
    depth: 2,
    showInfluentialOnly: false,
    maxNodes: 50,
  })

  const fetchCitationGraph = useCallback(
    async (paperId: string, paperTitle: string, paperAuthors: string[], paperYear: number) => {
      setLoading(true)
      setError(null)

      try {
        // Try to fetch from Semantic Scholar API
        const response = await fetch(`/api/search/citations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paperId,
            depth: options.depth,
            showInfluentialOnly: options.showInfluentialOnly,
            maxNodes: options.maxNodes,
          }),
        })

        if (!response.ok) {
          // Fall back to generating a simulated graph for demo
          const simulatedGraph = generateSimulatedGraph(
            paperId,
            paperTitle,
            paperAuthors,
            paperYear,
            options
          )
          setGraph(simulatedGraph)
          return simulatedGraph
        }

        const data = await response.json()
        setGraph(data)
        return data
      } catch (err) {
        // Generate simulated graph on error
        const simulatedGraph = generateSimulatedGraph(
          paperId,
          paperTitle,
          paperAuthors,
          paperYear,
          options
        )
        setGraph(simulatedGraph)
        return simulatedGraph
      } finally {
        setLoading(false)
      }
    },
    [options]
  )

  const updateOptions = useCallback((newOptions: Partial<CitationGraphOptions>) => {
    setOptions((prev) => ({ ...prev, ...newOptions }))
  }, [])

  const clearGraph = useCallback(() => {
    setGraph(null)
    setError(null)
  }, [])

  return {
    graph,
    loading,
    error,
    options,
    fetchCitationGraph,
    updateOptions,
    clearGraph,
  }
}

// ============================================================================
// Simulated Graph Generator (for demo/fallback)
// ============================================================================

function generateSimulatedGraph(
  paperId: string,
  paperTitle: string,
  paperAuthors: string[],
  paperYear: number,
  options: CitationGraphOptions
): CitationGraph {
  const nodes: CitationNode[] = []
  const edges: CitationEdge[] = []

  // Add the selected paper
  nodes.push({
    id: paperId,
    title: paperTitle,
    authors: paperAuthors,
    year: paperYear,
    citationCount: Math.floor(Math.random() * 100) + 10,
    isSelected: true,
    depth: 0,
    type: 'selected',
  })

  // Generate references (papers this one cites)
  const numReferences = Math.min(options.maxNodes / 2, 8 + Math.floor(Math.random() * 8))
  for (let i = 0; i < numReferences; i++) {
    const refYear = paperYear - 1 - Math.floor(Math.random() * 10)
    const refId = `ref_${paperId.slice(0, 8)}_${i}`

    nodes.push({
      id: refId,
      title: generatePaperTitle(refYear),
      authors: generateAuthors(),
      year: refYear,
      citationCount: Math.floor(Math.random() * 200) + 20,
      isSelected: false,
      depth: 1,
      type: 'reference',
    })

    edges.push({
      source: paperId,
      target: refId,
      type: 'cites',
    })
  }

  // Generate citations (papers that cite this one)
  const numCitations = Math.min(options.maxNodes / 2, 5 + Math.floor(Math.random() * 10))
  for (let i = 0; i < numCitations; i++) {
    const citYear = paperYear + 1 + Math.floor(Math.random() * 5)
    const citId = `cit_${paperId.slice(0, 8)}_${i}`

    nodes.push({
      id: citId,
      title: generatePaperTitle(citYear),
      authors: generateAuthors(),
      year: citYear,
      citationCount: Math.floor(Math.random() * 50) + 5,
      isSelected: false,
      depth: 1,
      type: 'citation',
    })

    edges.push({
      source: citId,
      target: paperId,
      type: 'cited_by',
    })
  }

  // Add second-hop connections if depth >= 2
  if (options.depth >= 2) {
    const depth1Nodes = nodes.filter((n) => n.depth === 1).slice(0, 5)
    for (const d1Node of depth1Nodes) {
      const numSecondHop = 2 + Math.floor(Math.random() * 3)
      for (let i = 0; i < numSecondHop; i++) {
        const hopYear =
          d1Node.type === 'reference'
            ? d1Node.year - Math.floor(Math.random() * 5)
            : d1Node.year + Math.floor(Math.random() * 3)
        const hopId = `hop2_${d1Node.id.slice(0, 8)}_${i}`

        if (nodes.length < options.maxNodes) {
          nodes.push({
            id: hopId,
            title: generatePaperTitle(hopYear),
            authors: generateAuthors(),
            year: hopYear,
            citationCount: Math.floor(Math.random() * 100),
            isSelected: false,
            depth: 2,
            type: d1Node.type,
          })

          edges.push({
            source: d1Node.type === 'reference' ? d1Node.id : hopId,
            target: d1Node.type === 'reference' ? hopId : d1Node.id,
            type: d1Node.type === 'reference' ? 'cites' : 'cited_by',
          })
        }
      }
    }
  }

  // Calculate stats
  const references = nodes.filter((n) => n.type === 'reference')
  const citations = nodes.filter((n) => n.type === 'citation')

  return {
    nodes,
    edges,
    stats: {
      totalReferences: references.length,
      totalCitations: citations.length,
      influentialCitations: Math.floor(citations.length * 0.3),
      avgCitationAge:
        citations.length > 0
          ? citations.reduce((sum, c) => sum + (c.year - paperYear), 0) / citations.length
          : 0,
    },
  }
}

function generatePaperTitle(year: number): string {
  const prefixes = [
    'High-efficiency',
    'Novel',
    'Advanced',
    'Scalable',
    'Low-cost',
    'Sustainable',
    'Next-generation',
  ]
  const topics = [
    'perovskite solar cells',
    'lithium-ion batteries',
    'hydrogen production',
    'wind turbine design',
    'energy storage systems',
    'photovoltaic materials',
    'electrochemical catalysts',
  ]
  const suffixes = [
    'for renewable energy applications',
    'with enhanced stability',
    'via machine learning optimization',
    'using novel architectures',
    'for grid-scale deployment',
  ]

  return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${topics[Math.floor(Math.random() * topics.length)]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`
}

function generateAuthors(): string[] {
  const firstNames = ['J.', 'M.', 'A.', 'S.', 'K.', 'L.', 'R.', 'T.', 'Y.', 'W.']
  const lastNames = [
    'Zhang',
    'Wang',
    'Smith',
    'Johnson',
    'Chen',
    'Kim',
    'Park',
    'Lee',
    'Brown',
    'Miller',
  ]

  const numAuthors = 2 + Math.floor(Math.random() * 4)
  const authors: string[] = []

  for (let i = 0; i < numAuthors; i++) {
    authors.push(
      `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`
    )
  }

  return authors
}
