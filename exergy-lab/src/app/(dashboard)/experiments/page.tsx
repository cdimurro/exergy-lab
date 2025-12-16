'use client'

import * as React from 'react'
import { FlaskConical } from 'lucide-react'
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

export default function ExperimentsPage() {
  return (
    <div className="h-full flex flex-col">
      <FeatureWizard
        pageType="experiments"
        pageTitle="Experiment Designer"
        pageSubtitle="AI-powered experiment protocol generation with failure analysis"
        pageIcon={<FlaskConical className="h-5 w-5" />}
        domains={DOMAINS}
      />
    </div>
  )
}
