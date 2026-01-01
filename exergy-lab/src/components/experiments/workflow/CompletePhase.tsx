/**
 * Complete Phase Component
 *
 * Displays validated protocol with key findings and recommendations.
 */

'use client'

import type {
  ExperimentPlan,
  ProtocolValidation,
  KeyFinding,
} from '@/types/experiment-workflow'
import type { FailureAnalysis } from '@/types/experiment'
import type {
  ExperimentReportData,
  RecommendationItem,
} from '@/types/experiment-report'
import { Card, Button, Badge } from '@/components/ui'
import {
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Download,
  RotateCcw,
  BookOpen,
  Shield,
  Wrench,
  DollarSign,
  Info,
} from 'lucide-react'
import { useState } from 'react'
import { useExperimentsStore } from '@/lib/store/experiments-store'
import { SendToSimulationsButton } from './SendToSimulationsButton'

interface CompletePhaseProps {
  plan: ExperimentPlan | null
  validation: ProtocolValidation | null
  failureAnalysis: FailureAnalysis | null
  keyFindings: KeyFinding[]
  onReset: () => void
}

export function CompletePhase({
  plan,
  validation,
  failureAnalysis,
  keyFindings,
  onReset,
}: CompletePhaseProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'validation' | 'protocol'>(
    'overview'
  )

  if (!plan || !validation) {
    return (
      <div className="text-center text-muted py-12">
        <p>No validation results available.</p>
        <Button onClick={onReset} variant="outline" className="mt-4">
          Start New Experiment
        </Button>
      </div>
    )
  }

  const handleSave = () => {
    // TODO: Save to store
    console.log('Saving experiment...')
  }

  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownloadPDF = async () => {
    if (!plan || !validation) return

    setIsDownloading(true)
    try {
      // Transform plan and validation into report data format
      const reportData: ExperimentReportData = {
        metadata: {
          id: plan.id,
          title: plan.title,
          domain: plan.domain,
          createdAt: plan.generatedAt,
          version: '1.0',
        },
        overview: {
          title: plan.title,
          domain: plan.domain,
          goal: plan.methodology,
          objectives: plan.safetyWarnings.map(w => w.description).slice(0, 3),
        },
        protocol: {
          materials: plan.materials,
          equipment: plan.equipment,
          steps: plan.steps,
          safetyWarnings: plan.safetyWarnings,
          estimatedDuration: plan.estimatedDuration,
          estimatedCost: validation.costAccuracy.totalCost,
          methodology: plan.methodology,
        },
        safety: {
          hazards: validation.materialSafety.hazards,
          requiredPPE: validation.materialSafety.requiredPPE,
          incompatibilities: validation.materialSafety.incompatibilities.map(inc => ({
            material1: inc.material1,
            material2: inc.material2,
            warning: `${inc.reaction}. Mitigation: ${inc.mitigation}`,
            severity: inc.riskLevel,
          })),
        },
        validation: {
          literatureAlignment: {
            confidence: validation.literatureAlignment.confidence,
            matchedPapers: validation.literatureAlignment.matchedPapers,
            deviations: validation.literatureAlignment.deviations,
            recommendations: validation.literatureAlignment.recommendations,
          },
          materialSafety: {
            allChecked: validation.materialSafety.allChecked,
            hazardCount: validation.materialSafety.hazards.length,
            criticalHazards: validation.materialSafety.hazards.filter(
              h => h.hazardClass === 'critical'
            ).length,
            requiredPPE: validation.materialSafety.requiredPPE,
          },
          equipmentFeasibility: {
            tier: validation.equipmentFeasibility.tier,
            availableCount: validation.equipmentFeasibility.available.length,
            unavailableCount: validation.equipmentFeasibility.unavailable.length,
            estimatedAccessCost: validation.equipmentFeasibility.estimatedAccessCost,
            alternatives: validation.equipmentFeasibility.alternatives || {},
          },
          costAccuracy: {
            totalCost: validation.costAccuracy.totalCost,
            confidenceInterval: validation.costAccuracy.confidenceInterval,
            breakdown: {
              materials: plan.materials.map(m => {
                const qty = parseFloat(m.quantity) || 1
                return {
                  name: m.name,
                  quantity: `${m.quantity} ${m.unit}`,
                  unitCost: (m.cost || 0) / qty,
                  totalCost: m.cost || 0,
                }
              }),
              subtotalMaterials: plan.materials.reduce((sum, m) => sum + (m.cost || 0), 0),
              total: validation.costAccuracy.totalCost,
            },
            quoteSources: validation.costAccuracy.quoteSources,
          },
        },
        recommendations: buildRecommendations(plan, validation, keyFindings),
        conclusions: [
          `Protocol validated with ${validation.literatureAlignment.confidence}% literature alignment`,
          `Total estimated cost: $${validation.costAccuracy.totalCost.toFixed(2)}`,
          `Equipment tier: ${validation.equipmentFeasibility.tier}`,
        ],
        limitations: [
          'Cost estimates based on current supplier pricing and may vary',
          'Safety assessment based on general material properties',
          'Equipment availability may vary by institution',
        ],
      }

      // Call the API to generate PDF
      const response = await fetch('/api/experiments/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportData, format: 'pdf' }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const result = await response.json()

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to generate PDF')
      }

      // Convert base64 to blob and download
      const binaryString = atob(result.data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'application/pdf' })

      // Create download link
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.filename || `experiment-${plan.id}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('[CompletePhase] PDF download failed:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  // Helper function to build recommendations from validation data
  function buildRecommendations(
    plan: ExperimentPlan,
    validation: ProtocolValidation,
    keyFindings: KeyFinding[]
  ): RecommendationItem[] {
    const recommendations: RecommendationItem[] = []

    // Add simulation recommendation
    recommendations.push({
      id: 'rec-sim',
      type: 'simulation',
      priority: 'high',
      title: 'Run Simulation First',
      description: 'Validate experimental conditions and predict outcomes before lab work',
      action: 'Navigate to Simulations module',
    })

    // Add literature recommendations
    validation.literatureAlignment.recommendations.forEach((rec, i) => {
      recommendations.push({
        id: `rec-lit-${i}`,
        type: 'methodology',
        priority: 'medium',
        title: 'Literature Recommendation',
        description: rec,
      })
    })

    // Add safety recommendations for high hazards
    validation.materialSafety.hazards
      .filter(h => h.hazardClass === 'high' || h.hazardClass === 'critical')
      .forEach((hazard, i) => {
        recommendations.push({
          id: `rec-safety-${i}`,
          type: 'safety',
          priority: hazard.hazardClass === 'critical' ? 'critical' : 'high',
          title: `Safety: ${hazard.material}`,
          description: `Handle with care: ${hazard.handlingRequirements.join(', ')}`,
          action: hazard.storageRequirements,
        })
      })

    // Add equipment recommendations for unavailable items
    if (validation.equipmentFeasibility.unavailable.length > 0) {
      recommendations.push({
        id: 'rec-equip',
        type: 'equipment',
        priority: 'high',
        title: 'Equipment Access Required',
        description: `The following equipment is not readily available: ${validation.equipmentFeasibility.unavailable.join(', ')}`,
        action: 'Contact facility manager or seek alternatives',
      })
    }

    return recommendations
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card className="p-6 bg-card-dark border-border">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <h2 className="text-2xl font-bold text-foreground">Protocol Validated</h2>
            </div>
            <h3 className="text-lg text-muted mb-3">{plan.title}</h3>

            <div className="flex items-center gap-4 text-sm text-muted">
              <span>Domain: {plan.domain}</span>
              <span>•</span>
              <span>Duration: {plan.estimatedDuration}</span>
              <span>•</span>
              <span>
                Validated Cost: ${validation.costAccuracy.totalCost.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} variant="outline" size="sm">
              Save
            </Button>
            <Button
              onClick={handleDownloadPDF}
              variant="outline"
              size="sm"
              disabled={isDownloading}
            >
              <Download className={`w-4 h-4 mr-1.5 ${isDownloading ? 'animate-pulse' : ''}`} />
              {isDownloading ? 'Generating...' : 'PDF'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        <TabButton
          active={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
          label="Key Findings"
        />
        <TabButton
          active={activeTab === 'validation'}
          onClick={() => setActiveTab('validation')}
          label="Validation Results"
        />
        <TabButton
          active={activeTab === 'protocol'}
          onClick={() => setActiveTab('protocol')}
          label="Full Protocol"
        />
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <OverviewTab
          plan={plan}
          validation={validation}
          keyFindings={keyFindings}
        />
      )}

      {activeTab === 'validation' && <ValidationTab validation={validation} />}

      {activeTab === 'protocol' && <ProtocolTab plan={plan} />}

      {/* Actions */}
      <div className="flex justify-between items-center pt-4 border-t border-border">
        <Button onClick={onReset} variant="outline">
          <RotateCcw className="w-4 h-4 mr-2" />
          New Experiment
        </Button>

        <SendToSimulationsButton plan={plan} validation={validation} />
      </div>
    </div>
  )
}

// Sub-components

interface TabButtonProps {
  active: boolean
  onClick: () => void
  label: string
}

function TabButton({ active, onClick, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 text-sm font-medium transition-colors border-b-2
        ${
          active
            ? 'border-primary text-foreground'
            : 'border-transparent text-muted hover:text-foreground'
        }
      `}
    >
      {label}
    </button>
  )
}

interface OverviewTabProps {
  plan: ExperimentPlan
  validation: ProtocolValidation
  keyFindings: KeyFinding[]
}

function OverviewTab({ plan, validation }: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Validation Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={BookOpen}
          label="Literature Alignment"
          value={`${validation.literatureAlignment.confidence}%`}
          status={validation.literatureAlignment.confidence >= 70 ? 'good' : 'warning'}
          subtitle={`${validation.literatureAlignment.matchedPapers} papers matched`}
        />
        <MetricCard
          icon={Shield}
          label="Safety Rating"
          value={validation.materialSafety.allChecked ? 'Pass' : 'Review'}
          status={validation.materialSafety.hazards.some(h => h.hazardClass === 'critical') ? 'warning' : 'good'}
          subtitle={`${validation.materialSafety.hazards.length} hazards identified`}
        />
        <MetricCard
          icon={Wrench}
          label="Equipment Tier"
          value={validation.equipmentFeasibility.tier}
          status="good"
          subtitle={`${validation.equipmentFeasibility.available.length} available`}
        />
        <MetricCard
          icon={DollarSign}
          label="Cost Estimate"
          value={`$${validation.costAccuracy.totalCost.toFixed(0)}`}
          status="good"
          subtitle={`±${((validation.costAccuracy.confidenceInterval[1] - validation.costAccuracy.totalCost) / validation.costAccuracy.totalCost * 100).toFixed(0)}%`}
        />
      </div>

      {/* Warnings */}
      {validation.materialSafety.hazards.some(h => h.hazardClass === 'high' || h.hazardClass === 'critical') && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-amber-400 mb-2">
                High Hazard Materials Detected
              </h4>
              <ul className="text-xs text-muted space-y-1 list-disc list-inside">
                {validation.materialSafety.hazards
                  .filter(h => h.hazardClass === 'high' || h.hazardClass === 'critical')
                  .map((h, i) => (
                    <li key={i}>
                      {h.material} - {h.handlingRequirements.join(', ')}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Recommendations */}
      <Card className="p-6 bg-card-dark border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Recommended Next Steps
        </h3>

        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground mb-2">Run Simulation</p>
                <p className="text-xs text-muted mb-3">Validate experimental conditions and predict outcomes before lab work</p>
                <SendToSimulationsButton plan={plan} validation={validation} />
              </div>
            </div>
          </div>

          {validation.literatureAlignment.recommendations.map((rec, i) => (
            <div key={i} className="p-3 rounded-lg bg-background border border-border">
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-muted">{rec}</span>
              </div>
            </div>
          ))}

          {validation.equipmentFeasibility.unavailable.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 text-sm text-muted">
                  <p className="font-medium text-amber-400 mb-1">Equipment Unavailable:</p>
                  <p>{validation.equipmentFeasibility.unavailable.join(', ')}</p>
                  <p className="mt-2 text-xs">
                    Consider alternatives or contact facility manager for access.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Required PPE */}
      {validation.materialSafety.requiredPPE.length > 0 && (
        <Card className="p-4 bg-card-dark border-border">
          <h4 className="text-sm font-medium text-foreground mb-3">
            Required Personal Protective Equipment
          </h4>
          <div className="flex flex-wrap gap-2">
            {validation.materialSafety.requiredPPE.map((ppe, i) => (
              <Badge key={i} variant="secondary">
                {ppe}
              </Badge>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  status: 'good' | 'warning' | 'neutral'
  subtitle?: string
}

function MetricCard({ icon: Icon, label, value, status, subtitle }: MetricCardProps) {
  const borderColor =
    status === 'good'
      ? 'border-l-green-500'
      : status === 'warning'
      ? 'border-l-amber-500'
      : 'border-l-border'

  return (
    <Card className={`p-4 bg-card-dark border-border border-l-2 ${borderColor}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted">{label}</span>
        <Icon className="w-4 h-4 text-muted" />
      </div>
      <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
      {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
    </Card>
  )
}

interface RecommendationCardProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  onClick?: () => void
}

function RecommendationCard({ icon: Icon, title, description, onClick }: RecommendationCardProps) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg bg-primary/5 hover:bg-primary/10 border border-primary/20 hover:border-primary/30 transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted mt-0.5">{description}</p>
        </div>
      </div>
    </button>
  )
}

function ValidationTab({ validation }: { validation: ProtocolValidation }) {
  return (
    <div className="space-y-6">
      {/* Literature Alignment */}
      <Card className="p-6 bg-card-dark border-border">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Literature Alignment</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground">
              {validation.literatureAlignment.confidence}%
            </span>
            <span className="text-sm text-muted">confidence</span>
          </div>

          <p className="text-sm text-muted">
            Matched with {validation.literatureAlignment.matchedPapers} published protocols
          </p>

          {validation.literatureAlignment.deviations.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-foreground mb-2">Deviations:</p>
              <ul className="text-sm text-muted space-y-1 list-disc list-inside">
                {validation.literatureAlignment.deviations.map((dev, i) => (
                  <li key={i}>{dev}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>

      {/* Materials Safety */}
      <Card className="p-6 bg-card-dark border-border">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Materials Safety</h3>
        </div>

        <div className="space-y-4">
          {validation.materialSafety.hazards.map((hazard, i) => (
            <div key={i} className="p-3 rounded-lg bg-background border border-border">
              <div className="flex items-start justify-between mb-2">
                <span className="text-sm font-medium text-foreground">{hazard.material}</span>
                <Badge
                  variant={
                    hazard.hazardClass === 'critical'
                      ? 'error'
                      : hazard.hazardClass === 'high'
                      ? 'warning'
                      : 'secondary'
                  }
                  size="sm"
                >
                  {hazard.hazardClass}
                </Badge>
              </div>
              <div className="text-xs text-muted space-y-1">
                <p>
                  <strong>Handling:</strong> {hazard.handlingRequirements.join(', ')}
                </p>
                <p>
                  <strong>Storage:</strong> {hazard.storageRequirements}
                </p>
                <p>
                  <strong>Disposal:</strong> {hazard.disposalRequirements}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Equipment & Cost */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-6 bg-card-dark border-border">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Equipment</h3>
          </div>

          <div className="space-y-2">
            <div>
              <p className="text-sm text-muted mb-1">Access Tier:</p>
              <Badge variant="primary">{validation.equipmentFeasibility.tier}</Badge>
            </div>

            <div>
              <p className="text-sm text-muted mb-1">Estimated Access Cost:</p>
              <p className="text-lg font-bold text-foreground">
                ${validation.equipmentFeasibility.estimatedAccessCost.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted mb-1">
                Available: {validation.equipmentFeasibility.available.length}
              </p>
              <p className="text-sm text-muted">
                Unavailable: {validation.equipmentFeasibility.unavailable.length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-card-dark border-border">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Cost Accuracy</h3>
          </div>

          <div className="space-y-2">
            <div>
              <p className="text-sm text-muted mb-1">Total Estimated Cost:</p>
              <p className="text-3xl font-bold text-foreground">
                ${validation.costAccuracy.totalCost.toFixed(2)}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted mb-1">95% Confidence Interval:</p>
              <p className="text-sm text-foreground font-mono">
                ${validation.costAccuracy.confidenceInterval[0].toFixed(2)} - $
                {validation.costAccuracy.confidenceInterval[1].toFixed(2)}
              </p>
            </div>

            <div className="pt-2">
              <p className="text-xs text-muted">
                Based on {validation.costAccuracy.quoteSources.length} supplier sources
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function ProtocolTab({ plan }: { plan: ExperimentPlan }) {
  return (
    <div className="space-y-6">
      {/* Materials */}
      <Card className="p-6 bg-card-dark border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Materials</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="pb-2">Material</th>
                <th className="pb-2">Quantity</th>
                <th className="pb-2 text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {plan.materials.map((material, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 text-foreground">{material.name}</td>
                  <td className="py-2 text-muted">
                    {material.quantity} {material.unit}
                  </td>
                  <td className="py-2 text-right font-mono text-foreground">
                    ${material.cost?.toFixed(2) || '0.00'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Procedure */}
      <Card className="p-6 bg-card-dark border-border">
        <h3 className="text-lg font-semibold text-foreground mb-4">Procedure</h3>
        <div className="space-y-4">
          {plan.steps.map((step, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-primary">{step.step}</span>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-foreground mb-1">{step.title}</h4>
                <p className="text-sm text-muted">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Info */}
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted">
            Download the full PDF report for complete details including characterization plans,
            safety documentation, and literature references.
          </p>
        </div>
      </div>
    </div>
  )
}
