'use client'

import { useState } from 'react'
import { Save, Check } from 'lucide-react'
import { Button } from '@/components/ui'
import { useSimulationsStore } from '@/lib/store/simulations-store'
import type { SavedSimulation } from '@/types/simulation-workflow'

export interface SaveWorkflowButtonProps {
  onSave: (name?: string, tags?: string[]) => SavedSimulation | null
}

export function SaveWorkflowButton({ onSave }: SaveWorkflowButtonProps) {
  const [saved, setSaved] = useState(false)
  const saveSimulation = useSimulationsStore(state => state.saveSimulation)

  const handleSave = () => {
    // Get optional name from user
    const name = prompt('Name this simulation (optional):')

    const savedSim = onSave(name || undefined)
    if (savedSim) {
      saveSimulation(savedSim)
      setSaved(true)

      // Reset saved indicator after 3 seconds
      setTimeout(() => setSaved(false), 3000)
    }
  }

  return (
    <Button
      variant={saved ? 'secondary' : 'outline'}
      onClick={handleSave}
      disabled={saved}
    >
      {saved ? (
        <>
          <Check className="w-4 h-4 mr-2" />
          Saved
        </>
      ) : (
        <>
          <Save className="w-4 h-4 mr-2" />
          Save Workflow
        </>
      )}
    </Button>
  )
}
