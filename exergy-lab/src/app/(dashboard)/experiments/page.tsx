'use client'

import * as React from 'react'
import { FlaskConical } from 'lucide-react'
import { ChatInterface } from '@/components/chat'
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
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <ChatInterface
        pageTitle="Experiment Designer"
        pageSubtitle="AI-powered experiment protocol generation with failure analysis"
        pageIcon={<FlaskConical className="h-5 w-5" />}
        pageType="experiments"
        showDomainSelector
        domains={DOMAINS}
        placeholder="Describe the experiment you want to design..."
      />
    </div>
  )
}
