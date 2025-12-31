'use client'

import * as React from 'react'
import { ExperimentLab } from '@/components/experiments/ExperimentLab'
import type { Domain } from '@/types/discovery'

const DOMAINS: Domain[] = [
  'solar-energy',
  'wind-energy',
  'battery-storage',
  'hydrogen-fuel',
  'geothermal',
  'biomass',
  'carbon-capture',
  'energy-efficiency',
  'grid-optimization',
  'materials-science',
]

export default function ExperimentsPage() {
  return (
    <div className="h-full flex flex-col">
      <ExperimentLab domains={DOMAINS} />
    </div>
  )
}
