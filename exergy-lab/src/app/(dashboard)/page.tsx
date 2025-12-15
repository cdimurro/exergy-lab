'use client'

import {
  InteractiveEnergyExplorer,
  RegionalExplorer,
  SectorExplorer,
} from '@/components/charts'

export default function GlobalEnergySystemPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Global Energy System</h1>
        <p className="text-gray-600 mt-1">
          Thermodynamically accurate view of global energy flows using the three-tier framework:
          Primary Energy, Useful Energy, and Applied Exergy. Explore 60 years of data (1965-2024).
        </p>
      </div>

      {/* Main Interactive Energy Explorer */}
      <InteractiveEnergyExplorer />

      {/* Explore by Country or Region */}
      <RegionalExplorer />

      {/* Explore by Sector or Industry */}
      <SectorExplorer />
    </div>
  )
}
