'use client'

import * as React from 'react'
import { Cpu } from 'lucide-react'
import { FeatureWizard } from '@/components/feature-wizard'
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
      <FeatureWizard
        pageType="simulations"
        pageTitle="Simulations"
        pageSubtitle="3-tier computational system for clean energy simulations"
        pageIcon={<Cpu className="h-5 w-5" />}
        domains={DOMAINS}
      />
    </div>
  )
}
