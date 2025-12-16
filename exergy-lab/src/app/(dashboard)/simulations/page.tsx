'use client'

import * as React from 'react'
import { Cpu } from 'lucide-react'
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

export default function SimulationsPage() {
  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      <ChatInterface
        pageTitle="Simulations"
        pageSubtitle="3-tier computational system for clean energy simulations"
        pageIcon={<Cpu className="h-5 w-5" />}
        pageType="simulations"
        showDomainSelector
        domains={DOMAINS}
        placeholder="What system or process would you like to simulate?"
      />
    </div>
  )
}
