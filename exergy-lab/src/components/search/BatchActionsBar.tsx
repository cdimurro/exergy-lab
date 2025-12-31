'use client'

import * as React from 'react'
import { Download, FolderPlus, FlaskConical, Bot, X, FileText, Bookmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useWorkflowContext } from '@/lib/store/workflow-context-store'
import { useRouter } from 'next/navigation'

export interface SelectedPaper {
  id: string
  title: string
  authors: string[]
  year: number
  abstract?: string
  doi?: string
  citationCount?: number
  source: string
}

interface BatchActionsBarProps {
  selectedPapers: SelectedPaper[]
  onClearSelection: () => void
  onExport: (format: 'bibtex' | 'ris' | 'json') => void
  onSaveToLibrary?: () => void
}

export function BatchActionsBar({
  selectedPapers,
  onClearSelection,
  onExport,
  onSaveToLibrary,
}: BatchActionsBarProps) {
  const router = useRouter()
  const { setSourcePapers, setLastTool } = useWorkflowContext()

  const handleSendToExperiments = () => {
    // Extract parameters from selected papers
    const extractedParameters: Record<string, number> = {}
    const keywords: string[] = []

    selectedPapers.forEach((paper) => {
      // Extract efficiency values from abstracts
      if (paper.abstract) {
        const efficiencyMatch = paper.abstract.match(/(\d+\.?\d*)\s*%?\s*efficiency/i)
        if (efficiencyMatch) {
          extractedParameters[`efficiency_${paper.id.slice(0, 8)}`] = parseFloat(efficiencyMatch[1])
        }
      }
    })

    setSourcePapers({
      ids: selectedPapers.map((p) => p.id),
      titles: selectedPapers.map((p) => p.title),
      extractedParameters,
      keywords,
      authors: selectedPapers.flatMap((p) => p.authors || []),
      citations: selectedPapers.reduce((sum, p) => sum + (p.citationCount || 0), 0),
    })
    setLastTool('search')
    router.push('/experiments')
  }

  const handleSendToSimulations = () => {
    const extractedParameters: Record<string, number> = {}

    selectedPapers.forEach((paper) => {
      if (paper.abstract) {
        // Extract numeric values from abstracts
        const matches = paper.abstract.matchAll(/(\d+\.?\d*)\s*(eV|V|mA|W|nm|K|C|%)/gi)
        for (const match of matches) {
          const value = parseFloat(match[1])
          const unit = match[2].toLowerCase()
          extractedParameters[`${unit}_${paper.id.slice(0, 6)}`] = value
        }
      }
    })

    setSourcePapers({
      ids: selectedPapers.map((p) => p.id),
      titles: selectedPapers.map((p) => p.title),
      extractedParameters,
      keywords: [],
      authors: selectedPapers.flatMap((p) => p.authors || []),
      citations: selectedPapers.reduce((sum, p) => sum + (p.citationCount || 0), 0),
    })
    setLastTool('search')
    router.push('/simulations')
  }

  if (selectedPapers.length === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl px-4 py-3 flex items-center gap-4">
        {/* Selection count */}
        <div className="flex items-center gap-2 pr-4 border-r border-zinc-700">
          <span className="text-white font-medium">{selectedPapers.length}</span>
          <span className="text-zinc-400 text-sm">selected</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="h-6 w-6 p-0 text-zinc-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Export options */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onExport('bibtex')}
            className="text-zinc-300 hover:text-white hover:bg-zinc-800"
          >
            <Download className="h-4 w-4 mr-1" />
            BibTeX
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onExport('ris')}
            className="text-zinc-300 hover:text-white hover:bg-zinc-800"
          >
            <FileText className="h-4 w-4 mr-1" />
            RIS
          </Button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-zinc-700" />

        {/* Save to library */}
        {onSaveToLibrary && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSaveToLibrary}
            className="text-zinc-300 hover:text-white hover:bg-zinc-800"
          >
            <Bookmark className="h-4 w-4 mr-1" />
            Save
          </Button>
        )}

        {/* Workflow actions */}
        <div className="flex items-center gap-1 pl-2 border-l border-zinc-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSendToExperiments}
            className="text-emerald-400 hover:text-emerald-300 hover:bg-zinc-800"
          >
            <FlaskConical className="h-4 w-4 mr-1" />
            Design Experiment
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSendToSimulations}
            className="text-blue-400 hover:text-blue-300 hover:bg-zinc-800"
          >
            <Bot className="h-4 w-4 mr-1" />
            Run Simulation
          </Button>
        </div>
      </div>
    </div>
  )
}

// Export helper functions
export function generateBibTeX(papers: SelectedPaper[]): string {
  return papers
    .map((paper, i) => {
      const key = `${paper.authors?.[0]?.split(' ').pop() || 'unknown'}${paper.year || 'nd'}_${i + 1}`
      return `@article{${key},
  title = {${paper.title}},
  author = {${paper.authors?.join(' and ') || 'Unknown'}},
  year = {${paper.year || 'n.d.'}},
  doi = {${paper.doi || ''}},
  abstract = {${paper.abstract?.slice(0, 500) || ''}}
}`
    })
    .join('\n\n')
}

export function generateRIS(papers: SelectedPaper[]): string {
  return papers
    .map((paper) => {
      const lines = [
        'TY  - JOUR',
        `TI  - ${paper.title}`,
        ...((paper.authors || []).map((a) => `AU  - ${a}`)),
        `PY  - ${paper.year || ''}`,
        `DO  - ${paper.doi || ''}`,
        `AB  - ${paper.abstract || ''}`,
        'ER  - ',
      ]
      return lines.join('\n')
    })
    .join('\n\n')
}
