'use client'

import * as React from 'react'
import { SimulationPlatform } from '@/components/simulations/SimulationPlatform'
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

export default function SimulationsPage() {
  return (
    <div className="h-full flex flex-col">
      <SimulationPlatform domains={DOMAINS} />
    </div>
  )
}
