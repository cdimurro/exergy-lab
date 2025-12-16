'use client'

import * as React from 'react'
import { Search } from 'lucide-react'
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

export default function SearchPage() {
  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <ChatInterface
        pageTitle="Academic Search"
        pageSubtitle="AI-powered search across multiple research databases"
        pageIcon={<Search className="h-5 w-5" />}
        pageType="search"
        showDomainSelector
        domains={DOMAINS}
        placeholder="Search for papers, patents, or datasets..."
      />
    </div>
  )
}
