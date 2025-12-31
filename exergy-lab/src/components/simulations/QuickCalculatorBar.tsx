'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import { Calculator, Sun, Wind, Zap, Droplet, Star, ChevronDown } from 'lucide-react'
import { useQuickCalculator } from '@/hooks/useQuickCalculator'
import { QuickCalculatorModal } from './QuickCalculatorModal'
import type { CalculatorDefinition } from '@/lib/simulation/quick-calculators'

// Domain icons mapping
const DOMAIN_ICONS: Record<string, React.ReactNode> = {
  solar: <Sun className="w-4 h-4" />,
  wind: <Wind className="w-4 h-4" />,
  battery: <Zap className="w-4 h-4" />,
  'battery-storage': <Zap className="w-4 h-4" />,
  hydrogen: <Droplet className="w-4 h-4" />,
  thermal: <Calculator className="w-4 h-4" />,
}

interface QuickCalculatorBarProps {
  className?: string
  defaultDomain?: string
  onCalculationComplete?: (result: any) => void
}

export function QuickCalculatorBar({
  className = '',
  defaultDomain,
  onCalculationComplete,
}: QuickCalculatorBarProps) {
  const {
    availableCalculators,
    favoriteCalculators,
    calculatorsByDomain,
    isLoading,
    fetchCalculators,
    selectCalculator,
    toggleFavorite,
  } = useQuickCalculator()

  const [selectedCalculator, setSelectedCalculator] = useState<CalculatorDefinition | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  // Fetch calculators on mount
  useEffect(() => {
    fetchCalculators(defaultDomain)
  }, [fetchCalculators, defaultDomain])

  const handleCalculatorSelect = (calculator: CalculatorDefinition) => {
    setSelectedCalculator(calculator)
    selectCalculator(calculator)
    setIsModalOpen(true)
    setShowDropdown(false)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
  }

  const handleCalculationComplete = (result: any) => {
    onCalculationComplete?.(result)
  }

  // Get quick access calculators (favorites or first from each domain)
  const quickAccessCalculators = favoriteCalculators.length > 0
    ? favoriteCalculators.slice(0, 5)
    : availableCalculators.slice(0, 5)

  return (
    <>
      <div className={`bg-zinc-800 rounded-lg p-2 ${className}`}>
        <div className="flex items-center gap-2">
          {/* Label */}
          <div className="flex items-center gap-2 px-2 text-zinc-400 text-sm">
            <Calculator className="w-4 h-4" />
            <span className="hidden sm:inline">Quick Calc</span>
          </div>

          {/* Quick access buttons */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            {quickAccessCalculators.map((calc) => (
              <button
                key={calc.id}
                onClick={() => handleCalculatorSelect(calc)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600
                         text-zinc-300 text-sm rounded-md transition-colors whitespace-nowrap"
                title={calc.description}
              >
                {DOMAIN_ICONS[calc.domain] || <Calculator className="w-4 h-4" />}
                <span className="hidden md:inline">{calc.name}</span>
                <span className="md:hidden">{calc.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>

          {/* More dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-1 px-2 py-1.5 bg-zinc-700 hover:bg-zinc-600
                       text-zinc-400 text-sm rounded-md transition-colors"
            >
              <span>More</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showDropdown && (
              <div className="absolute right-0 top-full mt-1 w-80 bg-zinc-800 border border-zinc-700
                            rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                {Object.entries(calculatorsByDomain).map(([domain, calcs]) => (
                  <div key={domain} className="border-b border-zinc-700 last:border-0">
                    <div className="px-3 py-2 bg-zinc-900/50 flex items-center gap-2 text-zinc-400 text-xs uppercase">
                      {DOMAIN_ICONS[domain] || <Calculator className="w-3 h-3" />}
                      {domain.replace('-', ' ')}
                    </div>
                    {calcs.map((calc: CalculatorDefinition) => (
                      <button
                        key={calc.id}
                        onClick={() => handleCalculatorSelect(calc)}
                        className="w-full flex items-center justify-between px-3 py-2
                                 hover:bg-zinc-700 transition-colors text-left"
                      >
                        <div>
                          <div className="text-sm text-zinc-200">{calc.name}</div>
                          <div className="text-xs text-zinc-500 truncate max-w-[200px]">
                            {calc.description}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(calc.id)
                          }}
                          className="p-1 hover:bg-zinc-600 rounded"
                        >
                          <Star
                            className={`w-4 h-4 ${
                              favoriteCalculators.some((f) => f.id === calc.id)
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-zinc-500'
                            }`}
                          />
                        </button>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Loading indicator */}
          {isLoading && (
            <div className="w-4 h-4 border-2 border-zinc-600 border-t-emerald-500 rounded-full animate-spin" />
          )}
        </div>
      </div>

      {/* Calculator Modal */}
      {selectedCalculator && (
        <QuickCalculatorModal
          calculator={selectedCalculator}
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onCalculationComplete={handleCalculationComplete}
        />
      )}

      {/* Dropdown overlay */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </>
  )
}
