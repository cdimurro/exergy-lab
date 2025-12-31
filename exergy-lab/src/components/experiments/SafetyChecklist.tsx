'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import {
  Shield,
  AlertTriangle,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  ExternalLink,
  Eye,
  HardHat,
  Flame,
  Skull,
  Droplets,
  Thermometer,
  Zap,
  Wind,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface SafetyItem {
  id: string
  category: 'ppe' | 'handling' | 'storage' | 'emergency' | 'waste' | 'training'
  title: string
  description: string
  priority: 'required' | 'recommended' | 'optional'
  isCompleted: boolean
  linkedHazards?: string[]
  sdsLink?: string
}

export interface SafetyHazard {
  id: string
  name: string
  type: 'chemical' | 'physical' | 'electrical' | 'thermal' | 'biological'
  ghsCodes: string[]
  severity: 'low' | 'medium' | 'high' | 'extreme'
  precautions: string[]
}

interface SafetyChecklistProps {
  items: SafetyItem[]
  hazards?: SafetyHazard[]
  onItemToggle: (itemId: string, completed: boolean) => void
  onViewSDS?: (sdsLink: string) => void
  readOnly?: boolean
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORY_CONFIG: Record<
  SafetyItem['category'],
  { icon: React.ElementType; label: string; color: string }
> = {
  ppe: { icon: HardHat, label: 'Personal Protective Equipment', color: 'blue' },
  handling: { icon: AlertTriangle, label: 'Safe Handling', color: 'amber' },
  storage: { icon: Shield, label: 'Storage Requirements', color: 'purple' },
  emergency: { icon: Flame, label: 'Emergency Procedures', color: 'red' },
  waste: { icon: Droplets, label: 'Waste Disposal', color: 'green' },
  training: { icon: FileText, label: 'Training & Certification', color: 'cyan' },
}

const HAZARD_TYPE_ICONS: Record<SafetyHazard['type'], React.ElementType> = {
  chemical: Skull,
  physical: AlertTriangle,
  electrical: Zap,
  thermal: Thermometer,
  biological: Wind,
}

const SEVERITY_COLORS: Record<SafetyHazard['severity'], { bg: string; text: string; border: string }> = {
  low: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500' },
  medium: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500' },
  high: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500' },
  extreme: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500' },
}

const PRIORITY_STYLES: Record<SafetyItem['priority'], { label: string; color: string }> = {
  required: { label: 'Required', color: 'text-red-400' },
  recommended: { label: 'Recommended', color: 'text-amber-400' },
  optional: { label: 'Optional', color: 'text-zinc-400' },
}

// ============================================================================
// Component
// ============================================================================

export function SafetyChecklist({
  items,
  hazards = [],
  onItemToggle,
  onViewSDS,
  readOnly = false,
  className = '',
}: SafetyChecklistProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['ppe', 'handling', 'emergency'])
  )
  const [showHazards, setShowHazards] = useState(true)

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, SafetyItem[]> = {}

    items.forEach((item) => {
      if (!groups[item.category]) {
        groups[item.category] = []
      }
      groups[item.category].push(item)
    })

    return groups
  }, [items])

  // Calculate completion stats
  const stats = useMemo(() => {
    const required = items.filter((i) => i.priority === 'required')
    const requiredComplete = required.filter((i) => i.isCompleted)
    const total = items.length
    const completed = items.filter((i) => i.isCompleted).length

    return {
      total,
      completed,
      requiredTotal: required.length,
      requiredCompleted: requiredComplete.length,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      isAllRequiredDone: requiredComplete.length === required.length,
    }
  }, [items])

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }

  return (
    <div className={`bg-zinc-800 rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-medium text-white">Safety Checklist</h3>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs px-2 py-1 rounded ${
                stats.isAllRequiredDone
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-amber-500/10 text-amber-400'
              }`}
            >
              {stats.requiredCompleted}/{stats.requiredTotal} required
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Progress</span>
            <span>{stats.percentage}%</span>
          </div>
          <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                stats.isAllRequiredDone ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Hazards section */}
      {hazards.length > 0 && (
        <div className="border-b border-zinc-700">
          <button
            onClick={() => setShowHazards(!showHazards)}
            className="w-full px-4 py-2 flex items-center justify-between text-left hover:bg-zinc-750 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-zinc-300">Identified Hazards ({hazards.length})</span>
            </div>
            {showHazards ? (
              <ChevronUp className="w-4 h-4 text-zinc-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-500" />
            )}
          </button>

          {showHazards && (
            <div className="px-4 pb-3 space-y-2">
              {hazards.map((hazard) => {
                const TypeIcon = HAZARD_TYPE_ICONS[hazard.type]
                const colors = SEVERITY_COLORS[hazard.severity]

                return (
                  <div
                    key={hazard.id}
                    className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}
                  >
                    <div className="flex items-start gap-2">
                      <TypeIcon className={`w-4 h-4 ${colors.text} mt-0.5`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${colors.text}`}>
                            {hazard.name}
                          </span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}
                          >
                            {hazard.severity}
                          </span>
                        </div>

                        {hazard.ghsCodes.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            {hazard.ghsCodes.map((code) => (
                              <span
                                key={code}
                                className="text-xs px-1.5 py-0.5 bg-zinc-700 text-zinc-400 rounded"
                              >
                                {code}
                              </span>
                            ))}
                          </div>
                        )}

                        <ul className="mt-2 space-y-1">
                          {hazard.precautions.slice(0, 3).map((precaution, idx) => (
                            <li key={idx} className="text-xs text-zinc-400 flex items-start gap-1">
                              <span className="text-zinc-600 mt-1">-</span>
                              {precaution}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Checklist categories */}
      <div className="divide-y divide-zinc-700">
        {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
          const categoryItems = groupedItems[category] || []
          if (categoryItems.length === 0) return null

          const CategoryIcon = config.icon
          const isExpanded = expandedCategories.has(category)
          const completedCount = categoryItems.filter((i) => i.isCompleted).length

          return (
            <div key={category}>
              {/* Category header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-zinc-750 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CategoryIcon className={`w-4 h-4 text-${config.color}-500`} />
                  <span className="text-sm text-zinc-200">{config.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">
                    {completedCount}/{categoryItems.length}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-zinc-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-500" />
                  )}
                </div>
              </button>

              {/* Category items */}
              {isExpanded && (
                <div className="px-4 pb-3 space-y-2">
                  {categoryItems.map((item) => (
                    <div
                      key={item.id}
                      className={`
                        flex items-start gap-3 p-2 rounded-lg transition-colors
                        ${item.isCompleted ? 'bg-emerald-500/5' : 'bg-zinc-900'}
                      `}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => !readOnly && onItemToggle(item.id, !item.isCompleted)}
                        disabled={readOnly}
                        className={`
                          w-5 h-5 rounded border flex-shrink-0 mt-0.5
                          flex items-center justify-center transition-colors
                          ${readOnly ? 'cursor-default' : 'cursor-pointer'}
                          ${
                            item.isCompleted
                              ? 'bg-emerald-600 border-emerald-600'
                              : 'border-zinc-600 hover:border-zinc-500'
                          }
                        `}
                      >
                        {item.isCompleted && <Check className="w-3 h-3 text-white" />}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm ${
                              item.isCompleted ? 'text-zinc-400 line-through' : 'text-zinc-200'
                            }`}
                          >
                            {item.title}
                          </span>
                          <span className={`text-xs ${PRIORITY_STYLES[item.priority].color}`}>
                            {PRIORITY_STYLES[item.priority].label}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">{item.description}</p>

                        {/* SDS link */}
                        {item.sdsLink && onViewSDS && (
                          <button
                            onClick={() => onViewSDS(item.sdsLink!)}
                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mt-1"
                          >
                            <Eye className="w-3 h-3" />
                            View SDS
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      {!stats.isAllRequiredDone && (
        <div className="px-4 py-3 border-t border-zinc-700 bg-amber-500/5">
          <div className="flex items-center gap-2 text-sm text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span>
              Complete all required safety items before starting the experiment
            </span>
          </div>
        </div>
      )}

      {stats.isAllRequiredDone && stats.completed === stats.total && (
        <div className="px-4 py-3 border-t border-zinc-700 bg-emerald-500/5">
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <Check className="w-4 h-4" />
            <span>All safety requirements verified</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Helper to generate safety items from materials
// ============================================================================

export function generateSafetyItems(
  materials: Array<{ name: string }>,
  hazards: SafetyHazard[]
): SafetyItem[] {
  const items: SafetyItem[] = []
  let id = 0

  // PPE items based on hazards
  const hasChemical = hazards.some((h) => h.type === 'chemical')
  const hasThermal = hazards.some((h) => h.type === 'thermal')
  const hasHighSeverity = hazards.some((h) => h.severity === 'high' || h.severity === 'extreme')

  if (hasChemical) {
    items.push({
      id: `safety-${id++}`,
      category: 'ppe',
      title: 'Chemical-resistant gloves',
      description: 'Wear appropriate gloves for chemical handling',
      priority: 'required',
      isCompleted: false,
    })
    items.push({
      id: `safety-${id++}`,
      category: 'ppe',
      title: 'Safety goggles',
      description: 'Splash-proof eye protection required',
      priority: 'required',
      isCompleted: false,
    })
    items.push({
      id: `safety-${id++}`,
      category: 'ppe',
      title: 'Lab coat',
      description: 'Wear buttoned lab coat at all times',
      priority: 'required',
      isCompleted: false,
    })
  }

  if (hasHighSeverity) {
    items.push({
      id: `safety-${id++}`,
      category: 'ppe',
      title: 'Face shield',
      description: 'Additional face protection for high-risk operations',
      priority: 'required',
      isCompleted: false,
    })
  }

  if (hasThermal) {
    items.push({
      id: `safety-${id++}`,
      category: 'ppe',
      title: 'Heat-resistant gloves',
      description: 'Use thermal gloves for hot surfaces',
      priority: 'required',
      isCompleted: false,
    })
  }

  // Handling items
  if (hasChemical) {
    items.push({
      id: `safety-${id++}`,
      category: 'handling',
      title: 'Work in fume hood',
      description: 'Conduct chemical handling in ventilated fume hood',
      priority: 'required',
      isCompleted: false,
    })
    items.push({
      id: `safety-${id++}`,
      category: 'handling',
      title: 'Review SDS sheets',
      description: 'Read safety data sheets for all chemicals',
      priority: 'required',
      isCompleted: false,
    })
  }

  // Emergency items
  items.push({
    id: `safety-${id++}`,
    category: 'emergency',
    title: 'Know emergency exits',
    description: 'Identify nearest exits and emergency equipment',
    priority: 'required',
    isCompleted: false,
  })
  items.push({
    id: `safety-${id++}`,
    category: 'emergency',
    title: 'First aid kit location',
    description: 'Confirm location of first aid supplies',
    priority: 'required',
    isCompleted: false,
  })

  if (hasChemical) {
    items.push({
      id: `safety-${id++}`,
      category: 'emergency',
      title: 'Spill kit available',
      description: 'Ensure chemical spill kit is accessible',
      priority: 'required',
      isCompleted: false,
    })
    items.push({
      id: `safety-${id++}`,
      category: 'emergency',
      title: 'Eye wash station',
      description: 'Verify eye wash station is functional',
      priority: 'required',
      isCompleted: false,
    })
  }

  // Waste disposal
  if (hasChemical) {
    items.push({
      id: `safety-${id++}`,
      category: 'waste',
      title: 'Waste containers labeled',
      description: 'Use properly labeled waste containers',
      priority: 'required',
      isCompleted: false,
    })
    items.push({
      id: `safety-${id++}`,
      category: 'waste',
      title: 'No drain disposal',
      description: 'Do not dispose of chemicals down the drain',
      priority: 'required',
      isCompleted: false,
    })
  }

  // Training
  items.push({
    id: `safety-${id++}`,
    category: 'training',
    title: 'Lab safety training complete',
    description: 'General laboratory safety certification',
    priority: 'required',
    isCompleted: false,
  })

  if (hasChemical) {
    items.push({
      id: `safety-${id++}`,
      category: 'training',
      title: 'Chemical safety training',
      description: 'OSHA hazard communication training',
      priority: 'required',
      isCompleted: false,
    })
  }

  return items
}
