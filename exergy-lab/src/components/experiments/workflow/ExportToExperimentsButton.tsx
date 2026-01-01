/**
 * Export to Experiments Button
 *
 * Displayed on Search results to export selected papers to Experiments.
 * Prompts user and passes paper context to the experiments workflow.
 */

'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { FlaskConical } from 'lucide-react'

interface Paper {
  id: string
  title: string
  abstract?: string
  methodology?: string
}

interface ExportToExperimentsButtonProps {
  selectedPapers: Paper[]
  className?: string
  variant?: 'primary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function ExportToExperimentsButton({
  selectedPapers,
  className,
  variant = 'outline',
  size = 'sm',
}: ExportToExperimentsButtonProps) {
  const router = useRouter()

  const handleExport = async () => {
    if (selectedPapers.length === 0) {
      return
    }

    // Confirm with user
    const confirmed = window.confirm(
      'Would you like to design an experiment to validate these findings?'
    )

    if (!confirmed) {
      return
    }

    try {
      // Call API to extract methodology from papers
      const response = await fetch('/api/experiments/import-papers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paperIds: selectedPapers.map((p) => p.id),
          sourcePapers: { papers: selectedPapers },
        }),
      })

      if (response.ok) {
        const { suggestedGoal, methodology } = await response.json()

        // Store source paper context in sessionStorage
        sessionStorage.setItem(
          'experiment-source-papers',
          JSON.stringify({
            ids: selectedPapers.map((p) => p.id),
            methodology: methodology || suggestedGoal,
          })
        )

        // Navigate to experiments with goal
        const goalParam = encodeURIComponent(suggestedGoal || 'Design experiment based on selected papers')
        router.push(`/experiments?import=true&goal=${goalParam}`)
      } else {
        // Fallback: navigate without AI extraction
        const goalParam = encodeURIComponent(
          `Design experiment based on ${selectedPapers.length} research paper${
            selectedPapers.length > 1 ? 's' : ''
          }`
        )
        router.push(`/experiments?import=true&goal=${goalParam}`)
      }
    } catch (error) {
      console.error('[ExportToExperiments] Error:', error)

      // Fallback navigation
      const goalParam = encodeURIComponent(
        `Design experiment based on ${selectedPapers.length} research paper${
          selectedPapers.length > 1 ? 's' : ''
        }`
      )
      router.push(`/experiments?import=true&goal=${goalParam}`)
    }
  }

  return (
    <Button
      onClick={handleExport}
      disabled={selectedPapers.length === 0}
      variant={variant}
      size={size}
      className={className}
    >
      <FlaskConical className="w-4 h-4 mr-2" />
      Design Experiment
    </Button>
  )
}
