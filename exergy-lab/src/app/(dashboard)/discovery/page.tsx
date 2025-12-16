'use client'

import * as React from 'react'
import { Sparkles } from 'lucide-react'
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

export default function DiscoveryPage() {
  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <ChatInterface
        pageTitle="Discovery Engine"
        pageSubtitle="AI-powered multi-domain innovation discovery"
        pageIcon={<Sparkles className="h-5 w-5" />}
        pageType="discovery"
        showDomainSelector
        domains={DOMAINS}
        placeholder="What would you like to discover? Describe your research goal..."
      />
    </div>
  )
}
