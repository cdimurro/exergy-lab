'use client'

import * as React from 'react'
import { useState } from 'react'
import {
  Package,
  Wrench,
  ListOrdered,
  ChevronDown,
  ChevronRight,
  Clock,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface Material {
  id: string
  name: string
  quantity: string
  unit: string
  purity?: string
  supplier?: string
  casNumber?: string
  hazardClass?: string
  estimatedCost?: number
}

export interface Equipment {
  id: string
  name: string
  specifications?: string
  required: boolean
  alternatives?: string[]
}

export interface ExperimentStep {
  id: string
  stepNumber: number
  title: string
  description: string
  duration?: string
  temperature?: string
  notes?: string[]
  warnings?: string[]
  checkpoints?: string[]
}

export interface Protocol {
  materials: Material[]
  equipment: Equipment[]
  steps: ExperimentStep[]
  estimatedDuration?: string
  estimatedCost?: number
  safetyNotes?: string[]
  expectedResults?: string
}

export interface ProtocolTabProps {
  protocol: Protocol | null
  isLoading?: boolean
  onMaterialClick?: (material: Material) => void
  onEquipmentClick?: (equipment: Equipment) => void
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function ProtocolTab({
  protocol,
  isLoading = false,
  onMaterialClick,
  onEquipmentClick,
  className = '',
}: ProtocolTabProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)

  const toggleStep = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(stepId)) {
        next.delete(stepId)
      } else {
        next.add(stepId)
      }
      return next
    })
  }

  const expandAll = () => {
    if (protocol?.steps) {
      setExpandedSteps(new Set(protocol.steps.map((s) => s.id)))
    }
  }

  const collapseAll = () => {
    setExpandedSteps(new Set())
  }

  const copyProtocol = async () => {
    if (!protocol) return

    const text = `
MATERIALS:
${protocol.materials.map((m) => `- ${m.name}: ${m.quantity} ${m.unit}`).join('\n')}

EQUIPMENT:
${protocol.equipment.map((e) => `- ${e.name}${e.specifications ? ` (${e.specifications})` : ''}`).join('\n')}

PROCEDURE:
${protocol.steps.map((s) => `${s.stepNumber}. ${s.title}\n   ${s.description}`).join('\n\n')}
    `.trim()

    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-800 rounded w-1/3" />
          <div className="h-24 bg-zinc-800 rounded" />
          <div className="h-8 bg-zinc-800 rounded w-1/3" />
          <div className="h-32 bg-zinc-800 rounded" />
        </div>
      </div>
    )
  }

  if (!protocol) {
    return (
      <div className={`text-center py-12 ${className}`}>
        <ListOrdered className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
        <p className="text-zinc-400">No protocol generated yet</p>
        <p className="text-sm text-zinc-500 mt-1">Configure your experiment and generate a protocol</p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with copy button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          {protocol.estimatedDuration && (
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {protocol.estimatedDuration}
            </span>
          )}
          {protocol.estimatedCost !== undefined && (
            <span className="text-emerald-400">
              Est. ${protocol.estimatedCost.toFixed(0)}
            </span>
          )}
        </div>
        <button
          onClick={copyProtocol}
          className="flex items-center gap-1 px-3 py-1.5 text-xs text-zinc-400 hover:text-white
                   bg-zinc-800 hover:bg-zinc-700 rounded transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy Protocol'}
        </button>
      </div>

      {/* Materials Section */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-3">
          <Package className="w-4 h-4 text-blue-400" />
          Materials ({protocol.materials.length})
        </h3>
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-800/50">
                <th className="text-left px-3 py-2 text-xs font-medium text-zinc-400 uppercase">Material</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-zinc-400 uppercase">Quantity</th>
                <th className="text-left px-3 py-2 text-xs font-medium text-zinc-400 uppercase hidden md:table-cell">Purity</th>
                <th className="text-right px-3 py-2 text-xs font-medium text-zinc-400 uppercase">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {protocol.materials.map((material) => (
                <tr
                  key={material.id}
                  onClick={() => onMaterialClick?.(material)}
                  className={onMaterialClick ? 'cursor-pointer hover:bg-zinc-800/50' : ''}
                >
                  <td className="px-3 py-2">
                    <div className="text-zinc-200">{material.name}</div>
                    {material.hazardClass && (
                      <span className="text-xs text-amber-400 flex items-center gap-1 mt-0.5">
                        <AlertTriangle className="w-3 h-3" />
                        {material.hazardClass}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-zinc-400">
                    {material.quantity} {material.unit}
                  </td>
                  <td className="px-3 py-2 text-zinc-500 hidden md:table-cell">
                    {material.purity || '-'}
                  </td>
                  <td className="px-3 py-2 text-right text-zinc-400">
                    {material.estimatedCost !== undefined ? `$${material.estimatedCost}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Equipment Section */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-300 mb-3">
          <Wrench className="w-4 h-4 text-purple-400" />
          Equipment ({protocol.equipment.length})
        </h3>
        <div className="grid gap-2">
          {protocol.equipment.map((equip) => (
            <div
              key={equip.id}
              onClick={() => onEquipmentClick?.(equip)}
              className={`p-3 bg-zinc-900 rounded-lg border border-zinc-800 ${
                onEquipmentClick ? 'cursor-pointer hover:bg-zinc-800/50' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-zinc-200">{equip.name}</span>
                {!equip.required && (
                  <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">
                    Optional
                  </span>
                )}
              </div>
              {equip.specifications && (
                <p className="text-xs text-zinc-500 mt-1">{equip.specifications}</p>
              )}
              {equip.alternatives && equip.alternatives.length > 0 && (
                <p className="text-xs text-zinc-500 mt-1">
                  Alternatives: {equip.alternatives.join(', ')}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Procedure Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <ListOrdered className="w-4 h-4 text-emerald-400" />
            Procedure ({protocol.steps.length} steps)
          </h3>
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Expand All
            </button>
            <span className="text-zinc-600">|</span>
            <button
              onClick={collapseAll}
              className="text-xs text-zinc-400 hover:text-white"
            >
              Collapse All
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {protocol.steps.map((step) => {
            const isExpanded = expandedSteps.has(step.id)
            return (
              <div
                key={step.id}
                className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden"
              >
                <button
                  onClick={() => toggleStep(step.id)}
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-zinc-800/50 transition-colors"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-500 shrink-0" />
                  )}
                  <span className="w-6 h-6 flex items-center justify-center bg-emerald-500/10 text-emerald-400 rounded text-xs font-medium shrink-0">
                    {step.stepNumber}
                  </span>
                  <span className="text-zinc-200 flex-1">{step.title}</span>
                  {step.duration && (
                    <span className="text-xs text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {step.duration}
                    </span>
                  )}
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 pl-12 space-y-2">
                    <p className="text-sm text-zinc-400">{step.description}</p>

                    {step.temperature && (
                      <p className="text-xs text-zinc-500">
                        Temperature: {step.temperature}
                      </p>
                    )}

                    {step.warnings && step.warnings.length > 0 && (
                      <div className="space-y-1">
                        {step.warnings.map((warning, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded"
                          >
                            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                            {warning}
                          </div>
                        ))}
                      </div>
                    )}

                    {step.notes && step.notes.length > 0 && (
                      <ul className="text-xs text-zinc-500 space-y-1 list-disc list-inside">
                        {step.notes.map((note, idx) => (
                          <li key={idx}>{note}</li>
                        ))}
                      </ul>
                    )}

                    {step.checkpoints && step.checkpoints.length > 0 && (
                      <div className="pt-2 border-t border-zinc-800">
                        <p className="text-xs font-medium text-zinc-400 mb-1">Checkpoints:</p>
                        <ul className="text-xs text-zinc-500 space-y-1">
                          {step.checkpoints.map((checkpoint, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded border border-zinc-700" />
                              {checkpoint}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Safety Notes */}
      {protocol.safetyNotes && protocol.safetyNotes.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <h4 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Safety Notes
          </h4>
          <ul className="text-sm text-zinc-300 space-y-1 list-disc list-inside">
            {protocol.safetyNotes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Expected Results */}
      {protocol.expectedResults && (
        <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-lg">
          <h4 className="text-sm font-medium text-zinc-300 mb-2">Expected Results</h4>
          <p className="text-sm text-zinc-400">{protocol.expectedResults}</p>
        </div>
      )}
    </div>
  )
}
