'use client'

import * as React from 'react'
import { Sparkles } from 'lucide-react'
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

export default function DiscoveryPage() {
  return (
    <div className="h-full flex flex-col">
      <FeatureWizard
        pageType="discovery"
        pageTitle="Discovery Engine"
        pageSubtitle="AI-powered multi-domain innovation discovery"
        pageIcon={<Sparkles className="h-5 w-5" />}
        domains={DOMAINS}
      />
    </div>
  )
}
