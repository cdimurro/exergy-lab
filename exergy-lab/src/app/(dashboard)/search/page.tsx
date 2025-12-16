'use client'

import * as React from 'react'
import { Search } from 'lucide-react'
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

export default function SearchPage() {
  return (
    <div className="h-full flex flex-col">
      <FeatureWizard
        pageType="search"
        pageTitle="Academic Search"
        pageSubtitle="AI-powered search across multiple research databases"
        pageIcon={<Search className="h-5 w-5" />}
        domains={DOMAINS}
      />
    </div>
  )
}
