'use client'

import * as React from 'react'
import {
  FlaskConical,
  Loader2,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Download,
  ArrowRight,
  Beaker,
  Shield,
  DollarSign,
  Clock,
  FileJson,
  Grid3X3,
} from 'lucide-react'
import { Card, Button, Badge, Input } from '@/components/ui'
import { useExperimentDesign, PROTOCOL_TEMPLATES, type ProtocolTemplate } from '@/hooks/useExperimentDesign'
import type { Domain } from '@/types/discovery'
import type { ExperimentGoal, ExperimentStep, SafetyWarning, FailureMode } from '@/types/experiment'

// ============================================================================
// Types
// ============================================================================

interface ExperimentLabProps {
  domains?: Domain[]
}

// ============================================================================
// Component
// ============================================================================

export function ExperimentLab({ domains = [] }: ExperimentLabProps) {
  const design = useExperimentDesign()

  // Form state
  const [description, setDescription] = React.useState('')
  const [selectedDomain, setSelectedDomain] = React.useState<Domain | ''>('')
  const [objectives, setObjectives] = React.useState<string[]>([''])
  const [constraints, setConstraints] = React.useState({ budget: '', time: '' })

  // UI state
  const [activeTab, setActiveTab] = React.useState<'basic' | 'doe' | 'safety'>('basic')
  const [activeResultsTab, setActiveResultsTab] = React.useState<'protocol' | 'analysis' | 'cost' | 'export'>('protocol')
  const [showTemplates, setShowTemplates] = React.useState(true)

  // Initialize from template or search context
  React.useEffect(() => {
    if (design.selectedTemplate) {
      setDescription(design.selectedTemplate.description)
      setSelectedDomain(design.selectedTemplate.domain)
    }
  }, [design.selectedTemplate])

  React.useEffect(() => {
    if (design.hasSearchContext && design.searchContext) {
      // Pre-fill from search context
      const keywords = design.searchContext.keywords || []
      if (keywords.length > 0) {
        setDescription(`Experiment based on research: ${keywords.slice(0, 3).join(', ')}`)
      }
    }
  }, [design.hasSearchContext, design.searchContext])

  const handleAddObjective = () => {
    setObjectives([...objectives, ''])
  }

  const handleRemoveObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index))
  }

  const handleObjectiveChange = (index: number, value: string) => {
    const newObjectives = [...objectives]
    newObjectives[index] = value
    setObjectives(newObjectives)
  }

  const handleGenerate = () => {
    if (!description || !selectedDomain) return

    const goal: ExperimentGoal = {
      description,
      domain: selectedDomain,
      objectives: objectives.filter(o => o.trim()),
    }

    design.setGoal(goal)
    design.generateProtocol()
  }

  const handleExportJSON = () => {
    const json = design.exportAsJSON()
    if (json) {
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${design.protocol?.title || 'experiment'}.exergy-experiment.json`
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const handleSendToSimulations = () => {
    const path = design.sendToSimulations()
    if (path) {
      window.location.href = path
    }
  }

  // Get risk level color
  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-green-600 bg-green-50'
    if (score < 60) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'critical': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-background">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <FlaskConical className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Experiment Designer</h1>
            <p className="text-sm text-foreground-muted">
              AI-powered protocol generation with failure analysis
            </p>
          </div>
          {design.hasSearchContext && (
            <Badge className="ml-auto bg-primary/10 text-primary">
              Context from Search ({design.searchContext?.ids.length} papers)
            </Badge>
          )}
        </div>
      </div>

      {/* Template Selector */}
      {design.phase === 'idle' && (
        <div className="px-6 py-4 border-b border-border bg-background-surface">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">Quick Start Templates</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTemplates(!showTemplates)}
            >
              {showTemplates ? 'Hide' : 'Show'}
              {showTemplates ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
            </Button>
          </div>
          {showTemplates && (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {PROTOCOL_TEMPLATES.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={design.selectedTemplate?.id === template.id}
                  onSelect={() => design.selectTemplate(template.id)}
                />
              ))}
              <button
                onClick={design.clearTemplate}
                className="flex-shrink-0 w-48 p-4 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-foreground-muted hover:border-primary hover:text-primary transition-colors"
              >
                <Plus className="h-6 w-6" />
                <span className="text-sm font-medium">Custom Experiment</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Configuration */}
        <div className="w-[45%] border-r border-border flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-border">
            {(['basic', 'doe', 'safety'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                {tab === 'basic' && 'Basic'}
                {tab === 'doe' && 'DOE'}
                {tab === 'safety' && 'Safety'}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-6">
            {activeTab === 'basic' && (
              <div className="space-y-6">
                {/* Domain */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Domain
                  </label>
                  <select
                    value={selectedDomain}
                    onChange={(e) => setSelectedDomain(e.target.value as Domain)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary"
                    disabled={design.isGenerating}
                  >
                    <option value="">Select domain...</option>
                    {domains.map(domain => (
                      <option key={domain} value={domain}>
                        {domain.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Experiment Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the experiment you want to design..."
                    rows={4}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                    disabled={design.isGenerating}
                  />
                </div>

                {/* Objectives */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Objectives
                  </label>
                  <div className="space-y-2">
                    {objectives.map((objective, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          value={objective}
                          onChange={(e) => handleObjectiveChange(index, e.target.value)}
                          placeholder={`Objective ${index + 1}`}
                          disabled={design.isGenerating}
                        />
                        {objectives.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveObjective(index)}
                            disabled={design.isGenerating}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAddObjective}
                      disabled={design.isGenerating}
                      className="text-primary"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Objective
                    </Button>
                  </div>
                </div>

                {/* Constraints */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Budget Constraint
                    </label>
                    <Input
                      value={constraints.budget}
                      onChange={(e) => setConstraints({ ...constraints, budget: e.target.value })}
                      placeholder="e.g., $500"
                      disabled={design.isGenerating}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Time Constraint
                    </label>
                    <Input
                      value={constraints.time}
                      onChange={(e) => setConstraints({ ...constraints, time: e.target.value })}
                      placeholder="e.g., 2 weeks"
                      disabled={design.isGenerating}
                    />
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={!description || !selectedDomain || design.isGenerating}
                  className="w-full h-12"
                >
                  {design.isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Protocol...
                    </>
                  ) : (
                    <>
                      <Beaker className="h-4 w-4 mr-2" />
                      Generate Protocol
                    </>
                  )}
                </Button>
              </div>
            )}

            {activeTab === 'doe' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <Grid3X3 className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Design of Experiments</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Design Type
                  </label>
                  <select
                    value={design.doeConfig?.designType || 'full-factorial'}
                    onChange={(e) => design.configureDOE({
                      designType: e.target.value as any,
                      factors: design.doeConfig?.factors || [],
                      runsNeeded: 0,
                      replicates: 1,
                    })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    <option value="full-factorial">Full Factorial</option>
                    <option value="fractional-factorial">Fractional Factorial</option>
                    <option value="taguchi">Taguchi</option>
                    <option value="central-composite">Central Composite</option>
                  </select>
                </div>

                <div className="p-4 bg-background-surface rounded-lg">
                  <p className="text-sm text-foreground-muted">
                    Configure experimental factors after generating the base protocol.
                    DOE helps optimize parameters systematically.
                  </p>
                </div>

                {design.doeMatrix.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">DOE Matrix ({design.doeMatrix.length} runs)</h4>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-background-surface">
                          <tr>
                            <th className="px-3 py-2 text-left">Run</th>
                            {design.doeConfig?.factors.map(f => (
                              <th key={f.name} className="px-3 py-2 text-left">{f.name}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {design.doeMatrix.slice(0, 10).map(row => (
                            <tr key={row.runNumber} className="border-t border-border">
                              <td className="px-3 py-2">{row.runNumber}</td>
                              {Object.values(row.factorValues).map((val, i) => (
                                <td key={i} className="px-3 py-2">{val}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'safety' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold">Safety Checklist</h3>
                  </div>
                  <Badge className={design.safetyProgress.allComplete ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                    {design.safetyProgress.completed}/{design.safetyProgress.total} Complete
                  </Badge>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2 bg-background-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${design.safetyProgress.percentage}%` }}
                  />
                </div>

                {/* Checklist */}
                <div className="space-y-3">
                  {design.safetyChecklist.map(item => (
                    <label
                      key={item.id}
                      className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-background-surface transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={item.isCompleted}
                        onChange={() => design.toggleSafetyItem(item.id)}
                        className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{item.requirement}</span>
                          {item.isRequired && (
                            <Badge variant="secondary" className="text-xs">Required</Badge>
                          )}
                        </div>
                        <span className="text-xs text-foreground-muted">{item.category}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Results */}
        <div className="flex-1 flex flex-col bg-background-surface/30">
          {/* Results Tabs */}
          <div className="flex border-b border-border bg-background">
            {(['protocol', 'analysis', 'cost', 'export'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveResultsTab(tab)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${
                  activeResultsTab === tab
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-foreground-muted hover:text-foreground'
                }`}
              >
                {tab === 'protocol' && 'Protocol'}
                {tab === 'analysis' && 'Analysis'}
                {tab === 'cost' && 'Cost'}
                {tab === 'export' && 'Export'}
              </button>
            ))}
          </div>

          {/* Results Content */}
          <div className="flex-1 overflow-auto p-6">
            {/* Loading State */}
            {(design.isGenerating || design.isAnalyzing) && (
              <div className="flex flex-col items-center justify-center h-full">
                <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
                <p className="text-foreground-muted">
                  {design.isGenerating ? 'Generating protocol...' : 'Running failure analysis...'}
                </p>
              </div>
            )}

            {/* No Protocol Yet */}
            {!design.protocol && !design.isGenerating && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <FlaskConical className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No Protocol Generated
                </h3>
                <p className="text-sm text-foreground-muted max-w-md">
                  Fill in the experiment details on the left and click Generate Protocol
                  to create an AI-powered experiment design.
                </p>
              </div>
            )}

            {/* Protocol Tab */}
            {activeResultsTab === 'protocol' && design.protocol && !design.isGenerating && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-2">{design.protocol.title}</h2>
                  <div className="flex items-center gap-3">
                    <Badge>{design.protocol.goal.domain}</Badge>
                    <span className="text-sm text-foreground-muted">
                      Created {new Date(design.protocol.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Materials */}
                <Card className="p-4">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Beaker className="h-4 w-4" />
                    Materials ({design.protocol.materials.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {design.protocol.materials.map((material, idx) => (
                      <div key={idx} className="p-3 bg-background rounded-lg border border-border">
                        <p className="font-medium text-foreground">{material.name}</p>
                        <p className="text-sm text-foreground-muted">
                          {material.quantity} {material.unit}
                          {material.specification && ` - ${material.specification}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Steps */}
                <Card className="p-4">
                  <h3 className="font-semibold text-foreground mb-3">
                    Procedure ({design.protocol.steps.length} steps)
                  </h3>
                  <div className="space-y-4">
                    {design.protocol.steps.map((step, idx) => (
                      <div key={idx} className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center">
                          {step.step}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{step.title}</p>
                          <p className="text-sm text-foreground-muted">{step.description}</p>
                          {step.duration && (
                            <p className="text-xs text-foreground-subtle mt-1 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {step.duration}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Safety Warnings */}
                {design.protocol.safetyWarnings.length > 0 && (
                  <Card className="p-4 border-orange-200 bg-orange-50/50">
                    <h3 className="font-semibold text-orange-800 mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Safety Warnings
                    </h3>
                    <div className="space-y-2">
                      {design.protocol.safetyWarnings.map((warning, idx) => (
                        <div key={idx} className="p-3 bg-white rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={getImpactColor(warning.level)}>{warning.level}</Badge>
                            <span className="font-medium text-foreground">{warning.category}</span>
                          </div>
                          <p className="text-sm text-foreground-muted">{warning.description}</p>
                          <p className="text-sm text-green-700 mt-1">Mitigation: {warning.mitigation}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Analysis Tab */}
            {activeResultsTab === 'analysis' && design.failureAnalysis && !design.isAnalyzing && (
              <div className="space-y-6">
                {/* Risk Score */}
                <Card className="p-4">
                  <h3 className="font-semibold text-foreground mb-3">Risk Assessment</h3>
                  <div className="flex items-center gap-4">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center ${getRiskColor(design.failureAnalysis.riskScore)}`}>
                      <span className="text-2xl font-bold">{design.failureAnalysis.riskScore}</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {design.failureAnalysis.riskScore < 30 ? 'Low Risk' :
                         design.failureAnalysis.riskScore < 60 ? 'Medium Risk' : 'High Risk'}
                      </p>
                      <p className="text-sm text-foreground-muted">
                        {design.failureAnalysis.potentialFailures.length} potential failure modes identified
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Failure Modes */}
                <Card className="p-4">
                  <h3 className="font-semibold text-foreground mb-3">Potential Failure Modes</h3>
                  <div className="space-y-4">
                    {design.failureAnalysis.potentialFailures.map((failure, idx) => (
                      <div key={idx} className="p-4 bg-background rounded-lg border border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getImpactColor(failure.impact)}>{failure.impact}</Badge>
                          <Badge variant="secondary">{failure.frequency}</Badge>
                        </div>
                        <p className="font-medium text-foreground mb-2">{failure.description}</p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-foreground-muted font-medium mb-1">Causes:</p>
                            <ul className="list-disc list-inside text-foreground-subtle">
                              {failure.causes.map((cause, i) => (
                                <li key={i}>{cause}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-foreground-muted font-medium mb-1">Preventions:</p>
                            <ul className="list-disc list-inside text-foreground-subtle">
                              {failure.preventions.map((prev, i) => (
                                <li key={i}>{prev}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Recommendations */}
                <Card className="p-4">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {design.failureAnalysis.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span className="text-foreground">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            )}

            {/* Cost Tab */}
            {activeResultsTab === 'cost' && design.costBreakdown && (
              <div className="space-y-6">
                {/* Total Cost */}
                <Card className="p-4">
                  <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Estimated Total Cost
                  </h3>
                  <p className="text-3xl font-bold text-foreground">
                    ${design.costBreakdown.total.toFixed(2)}
                    <span className="text-sm font-normal text-foreground-muted ml-2">
                      +/- ${design.costBreakdown.uncertainty.toFixed(2)}
                    </span>
                  </p>
                </Card>

                {/* Cost Breakdown */}
                <Card className="p-4">
                  <h3 className="font-semibold text-foreground mb-3">Cost Breakdown</h3>

                  {/* Materials */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-foreground">Materials</span>
                      <span className="text-foreground">${design.costBreakdown.subtotalMaterials.toFixed(2)}</span>
                    </div>
                    <div className="space-y-1">
                      {design.costBreakdown.materials.map((m, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm text-foreground-muted">
                          <span>{m.name} ({m.quantity})</span>
                          <span>${m.totalCost.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Equipment */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-foreground">Equipment Time</span>
                      <span className="text-foreground">${design.costBreakdown.subtotalEquipment.toFixed(2)}</span>
                    </div>
                    <div className="space-y-1">
                      {design.costBreakdown.equipment.map((e, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm text-foreground-muted">
                          <span>{e.name} ({e.hours}h @ ${e.hourlyRate}/h)</span>
                          <span>${e.totalCost.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Labor */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-foreground">Labor</span>
                      <span className="text-foreground">${design.costBreakdown.subtotalLabor.toFixed(2)}</span>
                    </div>
                    <div className="space-y-1">
                      {design.costBreakdown.labor.map((l, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm text-foreground-muted">
                          <span>{l.role} ({l.hours}h @ ${l.hourlyRate}/h)</span>
                          <span>${l.totalCost.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Export Tab */}
            {activeResultsTab === 'export' && design.protocol && (
              <div className="space-y-6">
                <Card className="p-4">
                  <h3 className="font-semibold text-foreground mb-4">Export Options</h3>
                  <div className="space-y-3">
                    <Button
                      onClick={handleExportJSON}
                      className="w-full justify-start"
                      variant="secondary"
                    >
                      <FileJson className="h-4 w-4 mr-2" />
                      Download as JSON (.exergy-experiment.json)
                    </Button>
                    <Button
                      onClick={handleSendToSimulations}
                      className="w-full justify-start"
                    >
                      <ArrowRight className="h-4 w-4 mr-2" />
                      Send to Simulations
                    </Button>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-semibold text-foreground mb-3">Simulation Suggestions</h3>
                  <p className="text-sm text-foreground-muted mb-3">
                    Based on your experiment, we suggest the following simulations:
                  </p>
                  <div className="space-y-2">
                    <div className="p-3 bg-background rounded-lg border border-border">
                      <p className="font-medium text-foreground">Thermal Analysis</p>
                      <p className="text-sm text-foreground-muted">Tier 1 (Analytical) - Free, instant</p>
                    </div>
                    <div className="p-3 bg-background rounded-lg border border-border">
                      <p className="font-medium text-foreground">Process Optimization</p>
                      <p className="text-sm text-foreground-muted">Tier 2 (Monte Carlo) - ~$0.05, 30-60s</p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Error State */}
            {design.error && (
              <Card className="p-4 bg-red-50 border-red-200">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-800">Error</p>
                    <p className="text-sm text-red-600">{design.error}</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Sub-Components
// ============================================================================

interface TemplateCardProps {
  template: ProtocolTemplate
  isSelected: boolean
  onSelect: () => void
}

function TemplateCard({ template, isSelected, onSelect }: TemplateCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`flex-shrink-0 w-56 p-4 border-2 rounded-lg text-left transition-all ${
        isSelected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Badge variant="secondary" className="text-xs">
          {template.domain.replace(/-/g, ' ')}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {template.category}
        </Badge>
      </div>
      <h3 className="font-medium text-foreground text-sm mb-1">{template.name}</h3>
      <p className="text-xs text-foreground-muted line-clamp-2">{template.description}</p>
      <div className="flex items-center gap-3 mt-2 text-xs text-foreground-subtle">
        <span>${template.estimatedCost.min}-{template.estimatedCost.max}</span>
        <span>{template.estimatedDuration.min}-{template.estimatedDuration.max}</span>
      </div>
    </button>
  )
}
