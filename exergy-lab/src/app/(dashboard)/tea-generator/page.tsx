'use client'

import * as React from 'react'
import { Calculator } from 'lucide-react'
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

export default function TEAGeneratorPage() {
  return (
    <div className="h-full flex flex-col">
      <FeatureWizard
        pageType="tea"
        pageTitle="TEA Generator"
        pageSubtitle="Techno-Economic Analysis for clean energy projects"
        pageIcon={<Calculator className="h-5 w-5" />}
        domains={DOMAINS}
      />
    </div>
  )
}
