'use client'

import * as React from 'react'
import {
  FlaskConical,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Download,
  Thermometer,
  Gauge,
} from 'lucide-react'
import { Card, Badge, Button } from '@/components/ui'
import type { ExperimentProtocol } from '@/types/experiment'

export interface ProtocolViewerProps {
  protocol: ExperimentProtocol
  onExport?: () => void
}

export function ProtocolViewer({ protocol, onExport }: ProtocolViewerProps) {
  const getSeverityColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-300'
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-300'
      case 'medium':
        return 'bg-amber-100 text-amber-700 border-amber-300'
      case 'low':
        return 'bg-primary/10 text-primary border-primary/30'
      default:
        return 'bg-background-surface text-foreground-muted border-border'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-primary/5 to-accent-purple/5 border-primary/20">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">{protocol.title}</h2>
            </div>
            <p className="text-sm text-foreground-muted mb-4">{protocol.goal.description}</p>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {protocol.estimatedDuration && (
                <div className="flex items-center gap-2 text-foreground-muted">
                  <Clock className="w-4 h-4" />
                  {protocol.estimatedDuration}
                </div>
              )}
              {protocol.estimatedCost !== undefined && (
                <div className="flex items-center gap-2 text-foreground-muted">
                  <DollarSign className="w-4 h-4" />
                  ~${protocol.estimatedCost.toLocaleString()}
                </div>
              )}
              <Badge variant="secondary" size="sm">
                {protocol.goal.domain}
              </Badge>
            </div>
          </div>

          {onExport && (
            <Button variant="secondary" onClick={onExport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </Card>

      {/* Safety Warnings */}
      {protocol.safetyWarnings && protocol.safetyWarnings.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/50">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-foreground">Safety Warnings</h3>
          </div>

          <div className="space-y-3">
            {protocol.safetyWarnings.map((warning, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${getSeverityColor(warning.level)}`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{warning.category}</span>
                      <Badge size="sm" className="uppercase">
                        {warning.level}
                      </Badge>
                    </div>
                    <p className="text-sm mb-2">{warning.description}</p>
                    <p className="text-sm font-medium">Mitigation: {warning.mitigation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Materials */}
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4">Materials Required</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-sm font-medium text-foreground-muted">
                  Material
                </th>
                <th className="text-left py-2 px-3 text-sm font-medium text-foreground-muted">
                  Quantity
                </th>
                <th className="text-left py-2 px-3 text-sm font-medium text-foreground-muted">
                  Specification
                </th>
                {protocol.materials.some((m) => m.supplier) && (
                  <th className="text-left py-2 px-3 text-sm font-medium text-foreground-muted">
                    Supplier
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {protocol.materials.map((material, index) => (
                <tr key={index} className="border-b border-border/50">
                  <td className="py-3 px-3 text-sm text-foreground">{material.name}</td>
                  <td className="py-3 px-3 text-sm text-foreground">
                    {material.quantity} {material.unit}
                  </td>
                  <td className="py-3 px-3 text-sm text-foreground-muted">
                    {material.specification || '-'}
                  </td>
                  {protocol.materials.some((m) => m.supplier) && (
                    <td className="py-3 px-3 text-sm text-foreground-muted">
                      {material.supplier || '-'}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Equipment */}
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4">Equipment Needed</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {protocol.equipment.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-3 rounded-lg bg-background-surface"
            >
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm text-foreground">{item}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Procedure */}
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-4">Experimental Procedure</h3>
        <div className="space-y-4">
          {protocol.steps.map((step, index) => (
            <div key={index} className="flex gap-4">
              {/* Step Number */}
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-white font-bold text-sm shrink-0">
                {step.step}
              </div>

              {/* Step Content */}
              <div className="flex-1 pb-4 border-b border-border last:border-0">
                <h4 className="font-medium text-foreground mb-2">{step.title}</h4>
                <p className="text-sm text-foreground-muted mb-3">{step.description}</p>

                {/* Step Parameters */}
                <div className="flex flex-wrap gap-3 text-xs">
                  {step.duration && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-background-surface">
                      <Clock className="w-3 h-3" />
                      {step.duration}
                    </div>
                  )}
                  {step.temperature && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-background-surface">
                      <Thermometer className="w-3 h-3" />
                      {step.temperature}
                    </div>
                  )}
                  {step.pressure && (
                    <div className="flex items-center gap-1 px-2 py-1 rounded bg-background-surface">
                      <Gauge className="w-3 h-3" />
                      {step.pressure}
                    </div>
                  )}
                </div>

                {/* Step Safety */}
                {step.safety && step.safety.length > 0 && (
                  <div className="mt-3 p-2 rounded bg-amber-50 border border-amber-200">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="text-xs text-amber-800">
                        {step.safety.map((warning, i) => (
                          <div key={i}>• {warning}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Expected Results */}
      <Card>
        <h3 className="text-lg font-semibold text-foreground mb-3">Expected Results</h3>
        <p className="text-sm text-foreground-muted">{protocol.expectedResults}</p>
      </Card>
    </div>
  )
}
