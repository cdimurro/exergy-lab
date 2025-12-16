'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  Lightbulb,
  TrendingUp,
  Download,
  FlaskConical,
  Calculator,
  Cpu,
  Loader2,
  AlertCircle,
  Target,
  Zap,
  Plus,
  X,
} from 'lucide-react'
import { Button, Textarea, Badge, Card, Progress, Select } from '@/components/ui'
import type { DiscoveryPrompt, DiscoveryReport, NovelIdea, Domain } from '@/types/discovery'

const DOMAINS: Array<{ value: Domain; label: string }> = [
  { value: 'solar-energy', label: 'Solar Energy' },
  { value: 'wind-energy', label: 'Wind Energy' },
  { value: 'battery-storage', label: 'Battery Storage' },
  { value: 'hydrogen-fuel', label: 'Hydrogen Fuel' },
  { value: 'geothermal', label: 'Geothermal' },
  { value: 'biomass', label: 'Biomass' },
  { value: 'carbon-capture', label: 'Carbon Capture' },
  { value: 'energy-efficiency', label: 'Energy Efficiency' },
  { value: 'grid-optimization', label: 'Grid Optimization' },
  { value: 'materials-science', label: 'Materials Science' },
]

export default function DiscoveryPage() {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [report, setReport] = React.useState<DiscoveryReport | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // Form state
  const [description, setDescription] = React.useState('')
  const [selectedDomains, setSelectedDomains] = React.useState<Domain[]>(['solar-energy'])
  const [goals, setGoals] = React.useState<string[]>([''])

  const handleDomainToggle = (domain: Domain) => {
    if (selectedDomains.includes(domain)) {
      setSelectedDomains(selectedDomains.filter((d) => d !== domain))
    } else {
      setSelectedDomains([...selectedDomains, domain])
    }
  }

  const handleAddGoal = () => {
    setGoals([...goals, ''])
  }

  const handleRemoveGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index))
  }

  const handleGoalChange = (index: number, value: string) => {
    const newGoals = [...goals]
    newGoals[index] = value
    setGoals(newGoals)
  }

  const handleGenerate = async () => {
    if (!description.trim() || selectedDomains.length === 0) {
      alert('Please provide a description and select at least one domain')
      return
    }

    const validGoals = goals.filter((g) => g.trim())
    if (validGoals.length === 0) {
      alert('Please provide at least one research goal')
      return
    }

    setIsGenerating(true)
    setError(null)

    const prompt: DiscoveryPrompt = {
      description: description.trim(),
      domains: selectedDomains,
      goals: validGoals,
    }

    try {
      const response = await fetch('/api/discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        throw new Error('Discovery generation failed')
      }

      const discoveryReport: DiscoveryReport = await response.json()
      setReport(discoveryReport)
    } catch (err) {
      console.error('Discovery error:', err)
      setError(err instanceof Error ? err.message : 'Discovery failed')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleNextAction = (action: string, ideaId?: string) => {
    const idea = ideaId ? report?.ideas.find((i) => i.id === ideaId) : null

    switch (action) {
      case 'create-experiment':
        if (idea) {
          // Navigate to experiments page with pre-filled data
          router.push(
            `/experiments?title=${encodeURIComponent(idea.title)}&description=${encodeURIComponent(idea.description)}`
          )
        } else {
          router.push('/experiments')
        }
        break

      case 'generate-tea':
        router.push('/tea-generator')
        break

      case 'run-simulation':
        router.push('/simulations')
        break

      default:
        break
    }
  }

  const handleExport = () => {
    if (!report) return

    const exportData = {
      ...report,
      exportedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `discovery_${report.id}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Discovery Engine</h1>
                <p className="text-sm text-foreground-muted mt-1">
                  AI-powered multi-domain innovation discovery
                </p>
              </div>
            </div>

            {report && (
              <Button onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Panel */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <Card>
                <h2 className="text-lg font-semibold text-foreground mb-4">Discovery Prompt</h2>

                <div className="space-y-4">
                  <Textarea
                    label="What do you want to discover?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your innovation goal. Be specific about what you're trying to achieve..."
                    rows={6}
                    disabled={isGenerating}
                  />

                  {/* Domain Selection */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-3">
                      Research Domains
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {DOMAINS.map((domain) => {
                        const isSelected = selectedDomains.includes(domain.value)
                        return (
                          <Badge
                            key={domain.value}
                            variant={isSelected ? 'primary' : 'secondary'}
                            size="sm"
                            className="cursor-pointer hover:opacity-80"
                            onClick={() => handleDomainToggle(domain.value)}
                          >
                            {domain.label}
                          </Badge>
                        )
                      })}
                    </div>
                  </div>

                  {/* Goals */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-3">
                      Research Goals
                    </label>
                    <div className="space-y-2">
                      {goals.map((goal, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={goal}
                            onChange={(e) => handleGoalChange(index, e.target.value)}
                            placeholder={`Goal ${index + 1}`}
                            className="flex-1 px-3 py-2 rounded-lg border border-border bg-background-elevated text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            disabled={isGenerating}
                          />
                          {goals.length > 1 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveGoal(index)}
                              disabled={isGenerating}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleAddGoal}
                      disabled={isGenerating || goals.length >= 5}
                      className="mt-2 w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Goal
                    </Button>
                  </div>

                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !description.trim() || selectedDomains.length === 0}
                    className="w-full"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Discovering...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Generate Discovery Report
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Error State */}
            {error && (
              <Card className="p-6 bg-red-50 border-red-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-900 mb-1">Discovery Error</h3>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </Card>
            )}

            {/* Loading State */}
            {isGenerating && (
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <Sparkles className="w-6 h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      AI is Searching for Innovations
                    </h3>
                    <p className="text-sm text-foreground-muted">
                      Analyzing research across multiple domains...
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Results */}
            {!isGenerating && report && (
              <>
                {/* Stats */}
                <Card>
                  <h3 className="text-lg font-semibold text-foreground mb-4">Search Statistics</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 rounded-lg bg-background-surface">
                      <p className="text-2xl font-bold text-primary">
                        {report.searchStats.totalSourcesAnalyzed}
                      </p>
                      <p className="text-xs text-foreground-muted mt-1">Total Sources</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-background-surface">
                      <p className="text-2xl font-bold text-foreground">
                        {report.searchStats.academicPapers}
                      </p>
                      <p className="text-xs text-foreground-muted mt-1">Papers</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-background-surface">
                      <p className="text-2xl font-bold text-foreground">
                        {report.searchStats.patents}
                      </p>
                      <p className="text-xs text-foreground-muted mt-1">Patents</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-background-surface">
                      <p className="text-2xl font-bold text-foreground">{report.ideas.length}</p>
                      <p className="text-xs text-foreground-muted mt-1">Novel Ideas</p>
                    </div>
                  </div>
                </Card>

                {/* Novel Ideas */}
                <Card>
                  <div className="flex items-center gap-2 mb-4">
                    <Lightbulb className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">
                      Novel Ideas ({report.ideas.length})
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {report.ideas.map((idea) => (
                      <IdeaCard key={idea.id} idea={idea} onAction={handleNextAction} />
                    ))}
                  </div>
                </Card>

                {/* Patterns */}
                {report.patterns.length > 0 && (
                  <Card>
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      <h3 className="text-lg font-semibold text-foreground">Identified Patterns</h3>
                    </div>

                    <div className="space-y-3">
                      {report.patterns.map((pattern, index) => (
                        <div
                          key={index}
                          className="p-4 rounded-lg bg-background-surface border border-border"
                        >
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <p className="font-medium text-foreground">{pattern.description}</p>
                            <Badge variant="primary" size="sm">
                              {pattern.frequency}
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground-muted">{pattern.implication}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Recommendations */}
                <Card className="bg-gradient-to-br from-primary/5 to-accent-purple/5 border-primary/20">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Expert Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {report.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="text-primary shrink-0">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </>
            )}

            {/* Empty State */}
            {!isGenerating && !report && !error && (
              <Card className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Discover Novel Clean Energy Solutions
                    </h3>
                    <p className="text-sm text-foreground-muted mb-4">
                      AI will search across multiple domains to find innovative approaches
                    </p>
                    <div className="text-xs text-foreground-muted space-y-1">
                      <p>• Multi-domain cross-analysis</p>
                      <p>• Novelty scoring and feasibility assessment</p>
                      <p>• Actionable next steps for each idea</p>
                    </div>
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

// Idea Card Component
function IdeaCard({
  idea,
  onAction,
}: {
  idea: NovelIdea
  onAction: (action: string, ideaId?: string) => void
}) {
  const [expanded, setExpanded] = React.useState(false)

  return (
    <div className="p-4 rounded-lg border border-border bg-background-elevated">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1">
          <h4 className="font-semibold text-foreground mb-2">{idea.title}</h4>
          <p className="text-sm text-foreground-muted mb-3">{idea.description}</p>

          {/* Scores */}
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-muted">Novelty</span>
                <span className="text-xs font-medium text-foreground">{idea.noveltyScore}%</span>
              </div>
              <Progress value={idea.noveltyScore} size="sm" variant="default" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-muted">Feasibility</span>
                <span className="text-xs font-medium text-foreground">
                  {idea.feasibilityScore}%
                </span>
              </div>
              <Progress value={idea.feasibilityScore} size="sm" variant="success" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-foreground-muted">Impact</span>
                <span className="text-xs font-medium text-foreground">{idea.impactScore}%</span>
              </div>
              <Progress value={idea.impactScore} size="sm" variant="warning" />
            </div>
          </div>

          {/* Domains */}
          <div className="flex flex-wrap gap-2 mb-3">
            {idea.domains.map((domain) => (
              <Badge key={domain} variant="secondary" size="sm">
                {domain.split('-').join(' ')}
              </Badge>
            ))}
          </div>

          {/* Expanded Details */}
          {expanded && (
            <div className="mt-4 space-y-3 pt-3 border-t border-border">
              {idea.crossDomainInsights.map((insight, i) => (
                <div key={i} className="p-3 rounded-lg bg-background-surface">
                  <p className="text-sm font-medium text-foreground mb-1">Cross-Domain Insight</p>
                  <p className="text-xs text-foreground-muted">{insight.description}</p>
                  <p className="text-xs text-primary mt-1">💡 {insight.novelty}</p>
                </div>
              ))}

              <div>
                <p className="text-sm font-medium text-foreground mb-2">Next Steps:</p>
                <ul className="space-y-1">
                  {idea.nextSteps.map((step, i) => (
                    <li key={i} className="text-xs text-foreground-muted flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Show Less' : 'Show More'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onAction('create-experiment', idea.id)}
            >
              <FlaskConical className="w-3.5 h-3.5 mr-1" />
              Experiment
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onAction('generate-tea')}>
              <Calculator className="w-3.5 h-3.5 mr-1" />
              TEA
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onAction('run-simulation')}>
              <Cpu className="w-3.5 h-3.5 mr-1" />
              Simulate
            </Button>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-xs text-foreground-muted mb-1">Est. Cost</p>
          <p className="text-sm font-medium text-foreground">{idea.estimatedCost}</p>
          <p className="text-xs text-foreground-muted mt-2">{idea.estimatedTimeframe}</p>
        </div>
      </div>
    </div>
  )
}
