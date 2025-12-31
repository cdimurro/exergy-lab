'use client'

import * as React from 'react'
import { EnhancedSearchPage } from '@/components/search/EnhancedSearchPage'
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
      <EnhancedSearchPage domains={DOMAINS} />
    </div>
  )
}
