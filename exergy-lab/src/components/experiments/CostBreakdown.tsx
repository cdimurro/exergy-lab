'use client'

import * as React from 'react'
import { useMemo } from 'react'
import {
  DollarSign,
  Beaker,
  Clock,
  Users,
  Building2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Info,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface MaterialCost {
  name: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
  priceSource: 'database' | 'estimated'
  volatility: 'low' | 'medium' | 'high'
}

export interface EquipmentCost {
  name: string
  hourlyRate: number
  estimatedHours: number
  totalCost: number
}

export interface CostBreakdownData {
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
    hours: number
    hourlyRate: number
    subtotal: number
  }
  overhead: {
    percentage: number
    amount: number
  }
  regional: {
    region: string
    factor: number
    adjustment: number
  }
  total: {
    base: number
    adjusted: number
    uncertainty: number
    range: [number, number]
  }
  recommendations: string[]
}

interface CostBreakdownProps {
  data: CostBreakdownData
  currency?: string
  showDetails?: boolean
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function CostBreakdown({
  data,
  currency = 'USD',
  showDetails = true,
  className = '',
}: CostBreakdownProps) {
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency

  // Calculate percentages for pie chart
  const percentages = useMemo(() => {
    const total = data.total.base
    return {
      materials: (data.materials.subtotal / total) * 100,
      equipment: (data.equipment.subtotal / total) * 100,
      labor: (data.labor.subtotal / total) * 100,
      overhead: (data.overhead.amount / total) * 100,
    }
  }, [data])

  // Find high-cost items
  const topCostItems = useMemo(() => {
    const items = [
      ...data.materials.items.map((m) => ({
        name: m.name,
        cost: m.totalPrice,
        category: 'Material',
      })),
      ...data.equipment.items.map((e) => ({
        name: e.name,
        cost: e.totalCost,
        category: 'Equipment',
      })),
    ]
    return items.sort((a, b) => b.cost - a.cost).slice(0, 3)
  }, [data])

  // Volatility warnings
  const volatileItems = data.materials.items.filter((m) => m.volatility === 'high')

  const formatCurrency = (amount: number) => {
    return `${currencySymbol}${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  return (
    <div className={`bg-zinc-800 rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-medium text-white">Cost Estimate</h3>
          </div>
          <span className="text-xs text-zinc-400">{data.regional.region}</span>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Total Cost Display */}
        <div className="text-center p-4 bg-zinc-900 rounded-lg">
          <div className="text-3xl font-bold text-white">
            {formatCurrency(data.total.adjusted)}
          </div>
          <div className="text-sm text-zinc-400 mt-1">
            Range: {formatCurrency(data.total.range[0])} - {formatCurrency(data.total.range[1])}
          </div>
          {data.regional.adjustment !== 0 && (
            <div className="flex items-center justify-center gap-1 mt-2 text-xs">
              {data.regional.factor > 1 ? (
                <TrendingUp className="w-3 h-3 text-amber-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-emerald-400" />
              )}
              <span className={data.regional.factor > 1 ? 'text-amber-400' : 'text-emerald-400'}>
                {data.regional.factor > 1 ? '+' : ''}
                {formatCurrency(data.regional.adjustment)} regional adjustment
              </span>
            </div>
          )}
        </div>

        {/* Cost Distribution Bar */}
        <div>
          <div className="flex text-xs text-zinc-400 mb-2">
            <span>Cost Distribution</span>
          </div>
          <div className="h-6 rounded-lg overflow-hidden flex">
            <div
              className="bg-blue-500 flex items-center justify-center text-xs font-medium text-white"
              style={{ width: `${percentages.materials}%` }}
              title={`Materials: ${percentages.materials.toFixed(1)}%`}
            >
              {percentages.materials > 15 && `${percentages.materials.toFixed(0)}%`}
            </div>
            <div
              className="bg-purple-500 flex items-center justify-center text-xs font-medium text-white"
              style={{ width: `${percentages.equipment}%` }}
              title={`Equipment: ${percentages.equipment.toFixed(1)}%`}
            >
              {percentages.equipment > 15 && `${percentages.equipment.toFixed(0)}%`}
            </div>
            <div
              className="bg-amber-500 flex items-center justify-center text-xs font-medium text-white"
              style={{ width: `${percentages.labor}%` }}
              title={`Labor: ${percentages.labor.toFixed(1)}%`}
            >
              {percentages.labor > 15 && `${percentages.labor.toFixed(0)}%`}
            </div>
            <div
              className="bg-zinc-600 flex items-center justify-center text-xs font-medium text-white"
              style={{ width: `${percentages.overhead}%` }}
              title={`Overhead: ${percentages.overhead.toFixed(1)}%`}
            >
              {percentages.overhead > 15 && `${percentages.overhead.toFixed(0)}%`}
            </div>
          </div>
          <div className="flex gap-4 mt-2 text-xs flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span className="text-zinc-400">Materials</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-purple-500" />
              <span className="text-zinc-400">Equipment</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-zinc-400">Labor</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-zinc-600" />
              <span className="text-zinc-400">Overhead</span>
            </div>
          </div>
        </div>

        {/* Category Subtotals */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-zinc-900 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
              <Beaker className="w-3 h-3" />
              Materials
            </div>
            <div className="text-lg font-bold text-white">
              {formatCurrency(data.materials.subtotal)}
            </div>
            <div className="text-xs text-zinc-500">
              {data.materials.items.length} items
            </div>
          </div>

          <div className="p-3 bg-zinc-900 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
              <Clock className="w-3 h-3" />
              Equipment
            </div>
            <div className="text-lg font-bold text-white">
              {formatCurrency(data.equipment.subtotal)}
            </div>
            <div className="text-xs text-zinc-500">
              {data.equipment.items.reduce((sum, e) => sum + e.estimatedHours, 0)} hours
            </div>
          </div>

          <div className="p-3 bg-zinc-900 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
              <Users className="w-3 h-3" />
              Labor
            </div>
            <div className="text-lg font-bold text-white">
              {formatCurrency(data.labor.subtotal)}
            </div>
            <div className="text-xs text-zinc-500">
              {data.labor.hours} hrs @ {formatCurrency(data.labor.hourlyRate)}/hr
            </div>
          </div>

          <div className="p-3 bg-zinc-900 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
              <Building2 className="w-3 h-3" />
              Overhead
            </div>
            <div className="text-lg font-bold text-white">
              {formatCurrency(data.overhead.amount)}
            </div>
            <div className="text-xs text-zinc-500">
              {data.overhead.percentage}% of base
            </div>
          </div>
        </div>

        {/* Top Cost Items */}
        {showDetails && topCostItems.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-zinc-400 uppercase mb-2">
              Highest Cost Items
            </h4>
            <div className="space-y-2">
              {topCostItems.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-zinc-900 rounded"
                >
                  <div>
                    <div className="text-sm text-zinc-300">{item.name}</div>
                    <div className="text-xs text-zinc-500">{item.category}</div>
                  </div>
                  <div className="text-sm font-medium text-white">
                    {formatCurrency(item.cost)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Material Details */}
        {showDetails && data.materials.items.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-zinc-400 uppercase mb-2">
              Material Costs
            </h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {data.materials.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-zinc-900 rounded text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-300">{item.name}</span>
                    {item.volatility === 'high' && (
                      <span className="text-xs text-amber-400">(volatile)</span>
                    )}
                    {item.priceSource === 'estimated' && (
                      <span className="text-xs text-zinc-500">(est.)</span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-zinc-300">
                      {item.quantity} {item.unit} @ {formatCurrency(item.unitPrice)}
                    </div>
                    <div className="text-zinc-400 text-xs">
                      {formatCurrency(item.totalPrice)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Volatility Warning */}
        {volatileItems.length > 0 && (
          <div className="p-3 bg-amber-900/20 border border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-400 mb-1">
              <AlertTriangle className="w-4 h-4" />
              Price Volatility Warning
            </div>
            <p className="text-sm text-zinc-300">
              {volatileItems.map((m) => m.name).join(', ')} may have significant price
              fluctuations. Consider bulk purchasing or alternative materials.
            </p>
          </div>
        )}

        {/* Recommendations */}
        {data.recommendations.length > 0 && (
          <div className="p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-400 mb-2">
              <Info className="w-4 h-4" />
              Cost Optimization Tips
            </div>
            <ul className="space-y-1">
              {data.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
