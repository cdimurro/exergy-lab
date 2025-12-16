'use client'

import * as React from 'react'
import { Calculator } from 'lucide-react'
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

export default function TEAGeneratorPage() {
  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <ChatInterface
        pageTitle="TEA Generator"
        pageSubtitle="Techno-Economic Analysis for clean energy projects"
        pageIcon={<Calculator className="h-5 w-5" />}
        pageType="tea"
        showDomainSelector
        showFileUpload
        domains={DOMAINS}
        placeholder="Describe the technology for techno-economic analysis..."
      />
    </div>
  )
}
