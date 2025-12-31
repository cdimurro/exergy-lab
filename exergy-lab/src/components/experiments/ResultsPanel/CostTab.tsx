'use client'

import * as React from 'react'
import { useState } from 'react'
import {
  DollarSign,
  Package,
  Clock,
  Users,
  Zap,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Download,
  Calculator,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface MaterialCost {
  id: string
  name: string
  quantity: number
  unit: string
  unitPrice: number
  totalCost: number
  volatility: 'low' | 'medium' | 'high'
  supplier?: string
}

export interface EquipmentCost {
  id: string
  name: string
  usageHours: number
  hourlyRate: number
  totalCost: number
  owned: boolean
}

export interface LaborCost {
  role: string
  hours: number
  hourlyRate: number
  totalCost: number
}

export interface CostBreakdown {
  materials: {
    items: MaterialCost[]
    subtotal: number
    uncertainty: number
  }
  equipment: {
    items: EquipmentCost[]
    subtotal: number
  }
  labor: {
    items: LaborCost[]
    subtotal: number
  }
  overhead?: {
    percentage: number
    amount: number
  }
  total: number
  totalWithUncertainty: {
    low: number
    high: number
  }
  regionalFactor?: {
    region: string
    multiplier: number
  }
}

export interface CostTabProps {
  costBreakdown: CostBreakdown | null
  isLoading?: boolean
  onOptimize?: () => void
  onExport?: () => void
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function CostTab({
  costBreakdown,
  isLoading = false,
  onOptimize,
  onExport,
  className = '',
}: CostTabProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['materials', 'equipment', 'labor'])
  )

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-zinc-800 rounded" />
          <div className="h-32 bg-zinc-800 rounded" />
          <div className="h-32 bg-zinc-800 rounded" />
        </div>
      </div>
    )
  }

  if (!costBreakdown) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <Calculator className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400">No cost estimate available</p>
        <p className="text-sm text-zinc-500 mt-1">Generate a protocol to see cost breakdown</p>
      </div>
    )
  }

  const { materials, equipment, labor, overhead, total, totalWithUncertainty, regionalFactor } = costBreakdown

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Total Cost Summary */}
      <div className="p-4 bg-gradient-to-br from-emerald-900/20 to-zinc-900 rounded-lg border border-emerald-500/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs text-zinc-400 uppercase">Total Estimated Cost</div>
            <div className="text-3xl font-bold text-white mt-1">
              ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-zinc-500 mt-1">
              Range: ${totalWithUncertainty.low.toFixed(0)} - ${totalWithUncertainty.high.toFixed(0)}
            </div>
          </div>
          <DollarSign className="w-12 h-12 text-emerald-400/30" />
        </div>

        {/* Cost Distribution Bar */}
        <div className="mt-4">
          <div className="flex items-center gap-1 mb-2">
            <div className="text-xs text-zinc-400">Cost Distribution</div>
          </div>
          <div className="h-3 flex rounded overflow-hidden">
            <div
              className="bg-blue-500"
              style={{ width: `${(materials.subtotal / total) * 100}%` }}
              title={`Materials: $${materials.subtotal.toFixed(0)}`}
            />
            <div
              className="bg-purple-500"
              style={{ width: `${(equipment.subtotal / total) * 100}%` }}
              title={`Equipment: $${equipment.subtotal.toFixed(0)}`}
            />
            <div
              className="bg-amber-500"
              style={{ width: `${(labor.subtotal / total) * 100}%` }}
              title={`Labor: $${labor.subtotal.toFixed(0)}`}
            />
            {overhead && (
              <div
                className="bg-zinc-500"
                style={{ width: `${(overhead.amount / total) * 100}%` }}
                title={`Overhead: $${overhead.amount.toFixed(0)}`}
              />
            )}
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-blue-500 rounded" />
              Materials
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-purple-500 rounded" />
              Equipment
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-amber-500 rounded" />
              Labor
            </span>
            {overhead && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-zinc-500 rounded" />
                Overhead
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Regional Factor */}
      {regionalFactor && (
        <div className="p-3 bg-zinc-900 rounded-lg border border-zinc-800 flex items-center justify-between">
          <span className="text-sm text-zinc-400">Regional Adjustment ({regionalFactor.region})</span>
          <span className={`text-sm font-medium ${
            regionalFactor.multiplier > 1 ? 'text-amber-400' : 'text-green-400'
          }`}>
            {regionalFactor.multiplier > 1 ? '+' : ''}{((regionalFactor.multiplier - 1) * 100).toFixed(0)}%
          </span>
        </div>
      )}

      {/* Materials Section */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
        <button
          onClick={() => toggleSection('materials')}
          className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {expandedSections.has('materials') ? (
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            )}
            <Package className="w-5 h-5 text-blue-400" />
            <span className="text-zinc-200 font-medium">Materials</span>
            <span className="text-xs text-zinc-500">({materials.items.length} items)</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-white">${materials.subtotal.toFixed(2)}</div>
            <div className="text-xs text-zinc-500">+/- ${materials.uncertainty.toFixed(0)}</div>
          </div>
        </button>

        {expandedSections.has('materials') && (
          <div className="border-t border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-800/50">
                  <th className="text-left px-4 py-2 text-xs font-medium text-zinc-400">Material</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-zinc-400">Qty</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-zinc-400 hidden md:table-cell">Unit Price</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-zinc-400">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {materials.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2">
                      <div className="text-zinc-200">{item.name}</div>
                      {item.volatility !== 'low' && (
                        <div className={`text-xs flex items-center gap-1 ${
                          item.volatility === 'high' ? 'text-amber-400' : 'text-yellow-400'
                        }`}>
                          {item.volatility === 'high' ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {item.volatility} price volatility
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-400">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-500 hidden md:table-cell">
                      ${item.unitPrice.toFixed(2)}/{item.unit}
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-200 font-medium">
                      ${item.totalCost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Equipment Section */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
        <button
          onClick={() => toggleSection('equipment')}
          className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {expandedSections.has('equipment') ? (
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            )}
            <Zap className="w-5 h-5 text-purple-400" />
            <span className="text-zinc-200 font-medium">Equipment</span>
            <span className="text-xs text-zinc-500">({equipment.items.length} items)</span>
          </div>
          <div className="text-lg font-bold text-white">${equipment.subtotal.toFixed(2)}</div>
        </button>

        {expandedSections.has('equipment') && (
          <div className="border-t border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-800/50">
                  <th className="text-left px-4 py-2 text-xs font-medium text-zinc-400">Equipment</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-zinc-400">Hours</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-zinc-400 hidden md:table-cell">Rate</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-zinc-400">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {equipment.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-2">
                      <div className="text-zinc-200">{item.name}</div>
                      {item.owned && (
                        <span className="text-xs text-emerald-400">Owned equipment</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-400">
                      {item.usageHours}h
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-500 hidden md:table-cell">
                      ${item.hourlyRate.toFixed(2)}/hr
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-200 font-medium">
                      ${item.totalCost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Labor Section */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
        <button
          onClick={() => toggleSection('labor')}
          className="w-full flex items-center justify-between p-4 hover:bg-zinc-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            {expandedSections.has('labor') ? (
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-zinc-500" />
            )}
            <Users className="w-5 h-5 text-amber-400" />
            <span className="text-zinc-200 font-medium">Labor</span>
            <span className="text-xs text-zinc-500">({labor.items.length} roles)</span>
          </div>
          <div className="text-lg font-bold text-white">${labor.subtotal.toFixed(2)}</div>
        </button>

        {expandedSections.has('labor') && (
          <div className="border-t border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-800/50">
                  <th className="text-left px-4 py-2 text-xs font-medium text-zinc-400">Role</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-zinc-400">Hours</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-zinc-400 hidden md:table-cell">Rate</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-zinc-400">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {labor.items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-zinc-200">{item.role}</td>
                    <td className="px-4 py-2 text-right text-zinc-400">{item.hours}h</td>
                    <td className="px-4 py-2 text-right text-zinc-500 hidden md:table-cell">
                      ${item.hourlyRate.toFixed(2)}/hr
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-200 font-medium">
                      ${item.totalCost.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Overhead */}
      {overhead && (
        <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">Overhead</span>
            <span className="text-xs text-zinc-500">({overhead.percentage}%)</span>
          </div>
          <span className="text-lg font-bold text-white">${overhead.amount.toFixed(2)}</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {onOptimize && (
          <button
            onClick={onOptimize}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2
                     bg-emerald-600 hover:bg-emerald-500 text-white text-sm
                     rounded-lg transition-colors"
          >
            <Calculator className="w-4 h-4" />
            Optimize for Budget
          </button>
        )}
        {onExport && (
          <button
            onClick={onExport}
            className="flex items-center justify-center gap-2 px-4 py-2
                     bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm
                     rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        )}
      </div>

      {/* Info Note */}
      <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5" />
          <div className="text-xs text-zinc-300">
            <p className="font-medium text-blue-400 mb-1">Cost Estimate Notes</p>
            <p>
              Estimates are based on current market prices and may vary. Material costs include
              a volatility factor for price-sensitive reagents. Labor rates are based on
              institutional averages.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
