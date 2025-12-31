'use client'

/**
 * Criteria Page (v0.0.4)
 *
 * Explains the FrontierScience-based evaluation methodology used by the Discovery Engine.
 * Provides detailed rubric criteria for each discovery phase.
 *
 * Now located within the (dashboard) route group to inherit sidebar/header layout.
 */

import * as React from 'react'
import { Card, Badge } from '@/components/ui'
import { cn } from '@/lib/utils'
import {
  BookOpen,
  Lightbulb,
  FlaskConical,
  FileText,
  Check,
  Target,
  Zap,
  Shield,
  TrendingUp,
  Scale,
  Beaker,
  DollarSign,
  FileSearch,
  Award,
  ChevronDown,
  ChevronRight,
  Info,
} from 'lucide-react'

// Phase configuration with icons and colors
const phases = [
  {
    id: 'research',
    name: 'Research Phase',
    icon: BookOpen,
    color: 'emerald',
    description: 'Multi-source literature review, knowledge synthesis, and candidate screening',
    combines: ['Research', 'Synthesis', 'Screening'],
    weight: 1.0,
  },
  {
    id: 'hypothesis',
    name: 'Hypothesis Phase',
    icon: Lightbulb,
    color: 'amber',
    description: 'Novel hypothesis generation and experimental protocol design',
    combines: ['Hypothesis', 'Experiment'],
    weight: 1.5,
  },
  {
    id: 'validation',
    name: 'Validation Phase',
    icon: FlaskConical,
    color: 'blue',
    description: 'Simulation, thermodynamic analysis, economics, and IP verification',
    combines: ['Simulation', 'Exergy', 'TEA', 'Patent', 'Validation'],
    weight: 1.3,
  },
  {
    id: 'output',
    name: 'Output Phase',
    icon: FileText,
    color: 'purple',
    description: 'Publication-ready report generation and quality assessment',
    combines: ['Rubric Evaluation', 'Publication'],
    weight: 0.8,
  },
]

// Rubric criteria definitions
const rubricCriteria = {
  research: [
    {
      id: 'RC1',
      name: 'Source Quality',
      points: 2.0,
      category: 'Completeness',
      description: '20+ sources from 3+ types (papers, patents, datasets, materials)',
      passCondition: 'At least 20 relevant sources from multiple database types',
      levels: [
        { score: '2.0', condition: '30+ sources from 3+ types' },
        { score: '1.5', condition: '20+ sources from 2+ types' },
        { score: '1.0', condition: '10+ sources' },
        { score: '0.5', condition: '5-9 sources' },
      ],
    },
    {
      id: 'RC2',
      name: 'Synthesis Depth',
      points: 2.0,
      category: 'Novelty',
      description: 'Cross-domain patterns, 3+ technological gaps identified',
      passCondition: 'Knowledge synthesis includes cross-domain insights and gap identification',
      levels: [
        { score: '2.0', condition: '8+ items, 2+ cross-domain, 3+ gaps' },
        { score: '1.5', condition: '5+ items, 2+ gaps' },
        { score: '1.0', condition: '3+ items' },
        { score: '0.5', condition: '1-2 items' },
      ],
    },
    {
      id: 'RC3',
      name: 'Candidate Selection',
      points: 2.0,
      category: 'Methodology',
      description: '5+ screened candidates with feasibility rankings',
      passCondition: 'At least 5 candidates screened with feasibility scores',
      levels: [
        { score: '2.0', condition: '10+ candidates, 5+ ranked' },
        { score: '1.5', condition: '5+ candidates, 2+ ranked' },
        { score: '1.0', condition: '3+ candidates' },
        { score: '0.5', condition: '1-2 candidates' },
      ],
    },
    {
      id: 'RC4',
      name: 'Completeness',
      points: 2.0,
      category: 'Completeness',
      description: '40%+ recent sources (< 3 years), 3+ quantitative findings',
      passCondition: 'Research includes recent literature and quantitative metrics',
      levels: [
        { score: '2.0', condition: '40%+ recent, 3+ quantitative' },
        { score: '1.5', condition: '30%+ recent or 3+ quantitative' },
        { score: '1.0', condition: '20%+ recent' },
        { score: '0.5', condition: '<20% recent' },
      ],
    },
    {
      id: 'RC5',
      name: 'Quality',
      points: 2.0,
      category: 'Accuracy',
      description: 'SOTA benchmarks cited, methodology documented',
      passCondition: 'State-of-the-art metrics cited with clear methodology',
      levels: [
        { score: '2.0', condition: '2+ SOTA benchmarks + methodology' },
        { score: '1.5', condition: '2+ SOTA benchmarks' },
        { score: '1.0', condition: 'Methodology only' },
        { score: '0.5', condition: 'Neither' },
      ],
    },
  ],
  hypothesis: [
    {
      id: 'HC1',
      name: 'Novelty',
      points: 2.5,
      category: 'Novelty',
      description: 'Beyond incremental, clear differentiation from prior art',
      passCondition: 'Hypothesis demonstrates clear novelty with identified novel elements',
      levels: [
        { score: '2.5', condition: 'Novelty score 8+, multiple novel elements' },
        { score: '2.0', condition: 'Novelty score 6+, some novel elements' },
        { score: '1.5', condition: 'Moderate novelty, some new elements' },
        { score: '1.0', condition: 'Limited novelty, incremental' },
      ],
    },
    {
      id: 'HC2',
      name: 'Testability',
      points: 2.0,
      category: 'Methodology',
      description: '3+ quantitative predictions with success criteria',
      passCondition: 'Testable predictions with quantitative metrics',
      levels: [
        { score: '2.0', condition: '3+ predictions, 2+ quantitative, success criteria' },
        { score: '1.5', condition: '2+ predictions, 1+ quantitative' },
        { score: '1.0', condition: '1+ prediction, limited quantitative' },
        { score: '0.5', condition: 'No clear predictions' },
      ],
    },
    {
      id: 'HC3',
      name: 'Feasibility',
      points: 2.0,
      category: 'Feasibility',
      description: 'Practical with equipment, timeline, constraints',
      passCondition: 'Clear implementation path with equipment and timeline',
      levels: [
        { score: '2.0', condition: 'Feasibility 7+, equipment, timeline, constraints' },
        { score: '1.5', condition: 'Equipment and timeline provided' },
        { score: '1.0', condition: 'Some practical details' },
        { score: '0.5', condition: 'Missing implementation details' },
      ],
    },
    {
      id: 'HC4',
      name: 'Protocol Quality',
      points: 2.0,
      category: 'Reproducibility',
      description: '5+ steps with materials, conditions, controls',
      passCondition: 'Reproducible experimental protocol with detailed steps',
      levels: [
        { score: '2.0', condition: '5+ steps, materials, conditions, controls' },
        { score: '1.5', condition: '3+ steps with key elements' },
        { score: '1.0', condition: 'Basic outline present' },
        { score: '0.5', condition: 'Methodology not defined' },
      ],
    },
    {
      id: 'HC5',
      name: 'Safety',
      points: 1.5,
      category: 'Safety',
      description: 'Comprehensive requirements (hazards, PPE, emergency, waste)',
      passCondition: 'Safety requirements cover hazards, PPE, emergency, waste',
      levels: [
        { score: '1.5', condition: '5+ requirements, 3+ categories' },
        { score: '1.2', condition: '3+ requirements, 2+ categories' },
        { score: '0.8', condition: '1+ requirement identified' },
        { score: '0.4', condition: 'Safety not addressed' },
      ],
    },
  ],
  validation: [
    {
      id: 'VC1',
      name: 'Physics Accuracy',
      points: 2.0,
      category: 'Thermodynamics',
      description: 'No thermodynamic violations, benchmarks checked',
      passCondition: 'Results respect physical limits with benchmark validation',
      levels: [
        { score: '2.0', condition: 'No violations, 5+ benchmarks, thermodynamics valid' },
        { score: '1.5', condition: 'No violations detected' },
        { score: '1.0', condition: '1 minor violation' },
        { score: '0.5', condition: 'Multiple violations' },
      ],
    },
    {
      id: 'VC2',
      name: 'Simulation Quality',
      points: 2.0,
      category: 'Methodology',
      description: 'Converged, 5+ parameters, time series data',
      passCondition: 'Simulation converged with adequate parameters and outputs',
      levels: [
        { score: '2.0', condition: 'Converged, 5+ params, 3+ outputs, time series' },
        { score: '1.5', condition: 'Converged, adequate params and outputs' },
        { score: '1.0', condition: 'Some results but limited detail' },
        { score: '0.5', condition: 'Convergence issues or missing data' },
      ],
    },
    {
      id: 'VC3',
      name: 'Economic Viability',
      points: 2.0,
      category: 'Economics',
      description: 'NPV, IRR, LCOE with positive indicators',
      passCondition: 'TEA includes 5+ metrics with positive NPV',
      levels: [
        { score: '2.0', condition: '5+ metrics, NPV positive, IRR reasonable' },
        { score: '1.5', condition: '3+ metrics with positive indicators' },
        { score: '1.0', condition: '2+ metrics provided' },
        { score: '0.5', condition: 'Insufficient financial analysis' },
      ],
    },
    {
      id: 'VC4',
      name: 'Efficiency Analysis',
      points: 2.0,
      category: 'Thermodynamics',
      description: 'Exergy evaluation with component breakdown',
      passCondition: 'Second-law analysis with exergy efficiency and improvements',
      levels: [
        { score: '2.0', condition: 'Exergy efficiency, comparison, breakdown, recommendations' },
        { score: '1.5', condition: 'Efficiency with analysis' },
        { score: '1.0', condition: 'Some metrics provided' },
        { score: '0.5', condition: 'Missing exergy evaluation' },
      ],
    },
    {
      id: 'VC5',
      name: 'IP Landscape',
      points: 2.0,
      category: 'Feasibility',
      description: '5+ patents analyzed, FTO, patentability',
      passCondition: 'Patent landscape analyzed with freedom-to-operate',
      levels: [
        { score: '2.0', condition: '5+ patents, FTO, patentability, key players' },
        { score: '1.5', condition: '3+ patents with some analysis' },
        { score: '1.0', condition: '1+ patent identified' },
        { score: '0.5', condition: 'Patent landscape not analyzed' },
      ],
    },
  ],
  output: [
    {
      id: 'OC1',
      name: 'Report Completeness',
      points: 2.5,
      category: 'Completeness',
      description: 'All 8 sections present and adequate',
      passCondition: 'Report includes all standard scientific sections',
      levels: [
        { score: '2.5', condition: 'All 8 sections complete with adequate content' },
        { score: '2.0', condition: '6+ sections complete' },
        { score: '1.5', condition: '4+ sections complete' },
        { score: '1.0', condition: '2+ sections complete' },
      ],
    },
    {
      id: 'OC2',
      name: 'Scientific Rigor',
      points: 2.5,
      category: 'Accuracy',
      description: 'Quantitative data, statistics, methodology sound',
      passCondition: 'Results include quantitative data with statistics',
      levels: [
        { score: '2.5', condition: '5+ rigor indicators, statistics, controls' },
        { score: '2.0', condition: '4+ indicators met' },
        { score: '1.5', condition: '2+ indicators met' },
        { score: '1.0', condition: 'Limited rigor' },
      ],
    },
    {
      id: 'OC3',
      name: 'Clarity',
      points: 2.0,
      category: 'Completeness',
      description: '1200+ words, good structure, includes visuals',
      passCondition: 'Report is well-written with clear structure',
      levels: [
        { score: '2.0', condition: '1200+ words, structured, visuals' },
        { score: '1.5', condition: '800+ words, readable' },
        { score: '1.0', condition: '400+ words' },
        { score: '0.5', condition: 'Insufficient content' },
      ],
    },
    {
      id: 'OC4',
      name: 'Reproducibility',
      points: 2.0,
      category: 'Reproducibility',
      description: 'Materials, equipment, parameters, data availability',
      passCondition: 'Methodology detailed enough for reproduction',
      levels: [
        { score: '2.0', condition: '5+ reproducibility elements' },
        { score: '1.5', condition: '3+ elements present' },
        { score: '1.0', condition: '2 elements present' },
        { score: '0.5', condition: 'Insufficient detail' },
      ],
    },
    {
      id: 'OC5',
      name: 'Conclusions',
      points: 1.0,
      category: 'Evidence',
      description: 'Evidence-based findings, implications, limitations',
      passCondition: 'Conclusions supported by evidence with limitations',
      levels: [
        { score: '1.0', condition: 'Evidence-based, implications, limitations' },
        { score: '0.8', condition: 'Key findings with some context' },
        { score: '0.5', condition: 'Basic conclusions present' },
        { score: '0.2', condition: 'Missing or unsupported' },
      ],
    },
  ],
}

// Category icons
const categoryIcons: Record<string, React.ElementType> = {
  Completeness: Check,
  Accuracy: Target,
  Novelty: Lightbulb,
  Methodology: Beaker,
  Feasibility: TrendingUp,
  Safety: Shield,
  Reproducibility: FileSearch,
  Thermodynamics: Zap,
  Economics: DollarSign,
  Evidence: Scale,
}

// Quality tiers
const qualityTiers = [
  {
    name: 'Breakthrough',
    range: '9.0+',
    color: 'purple',
    icon: Award,
    description: 'Potential for publication, novel contribution to the field',
  },
  {
    name: 'Significant',
    range: '8.0 - 8.9',
    color: 'blue',
    icon: TrendingUp,
    description: 'Strong findings with minor gaps, high quality work',
  },
  {
    name: 'Validated',
    range: '7.0 - 7.9',
    color: 'emerald',
    icon: Check,
    description: 'Meets FrontierScience threshold, solid scientific work',
  },
  {
    name: 'Promising',
    range: '5.0 - 6.9',
    color: 'amber',
    icon: Lightbulb,
    description: 'Good foundation but needs iteration and refinement',
  },
  {
    name: 'Preliminary',
    range: '<5.0',
    color: 'gray',
    icon: FileText,
    description: 'Early stage work with significant gaps',
  },
]

export default function CriteriaPage() {
  const [expandedPhase, setExpandedPhase] = React.useState<string | null>('research')

  return (
    <div className="h-full flex flex-col">
      <div className="space-y-6 pb-8 flex-1 overflow-y-auto">
        {/* Page Header */}
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Evaluation Criteria</h1>
              <p className="text-foreground-muted">
                How the Discovery Engine analyzes and scores scientific inquiries
              </p>
            </div>
          </div>
        </div>

        {/* Methodology Overview */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20 text-primary shrink-0">
              <Target className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">FrontierScience Methodology</h2>
              <p className="text-foreground-muted mt-2 leading-relaxed">
                Our evaluation framework is built upon the <strong className="text-foreground">FrontierScience methodology</strong>,
                which represents the leading benchmark for evaluating AI&apos;s ability to perform rigorous scientific tasks.
                This framework establishes standardized criteria for measuring whether AI-generated research meets quality
                thresholds expected for real-world scientific impact.
              </p>
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                  <Target className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-foreground text-sm">7/10 Pass Threshold</div>
                    <p className="text-xs text-foreground-muted mt-0.5">
                      Each phase requires 70% score to advance through the discovery pipeline
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-foreground text-sm">Iterative Refinement</div>
                    <p className="text-xs text-foreground-muted mt-0.5">
                      Up to 5 refinement cycles per phase with rubric-guided feedback
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Clean Energy Extensions */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Clean Energy Extensions</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <Card className="bg-background-elevated border-border">
              <div className="flex items-start gap-3">
                <Zap className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <h3 className="font-medium text-foreground text-sm">Exergy Analysis</h3>
                  <p className="text-xs text-foreground-muted mt-1">
                    Second-law thermodynamic evaluation to identify efficiency bottlenecks
                  </p>
                </div>
              </div>
            </Card>
            <Card className="bg-background-elevated border-border">
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-emerald-500 shrink-0" />
                <div>
                  <h3 className="font-medium text-foreground text-sm">TEA Integration</h3>
                  <p className="text-xs text-foreground-muted mt-1">
                    Techno-economic analysis including NPV, IRR, LCOE calculations
                  </p>
                </div>
              </div>
            </Card>
            <Card className="bg-background-elevated border-border">
              <div className="flex items-start gap-3">
                <FileSearch className="h-5 w-5 text-blue-500 shrink-0" />
                <div>
                  <h3 className="font-medium text-foreground text-sm">IP Landscape</h3>
                  <p className="text-xs text-foreground-muted mt-1">
                    Patent analysis with freedom-to-operate assessment
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* 4-Phase Architecture */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">4-Phase Architecture</h2>
            <Badge variant="secondary" className="text-xs">
              41% success rate vs 6.9% with 12 phases
            </Badge>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {phases.map((phase) => {
              const Icon = phase.icon
              return (
                <Card key={phase.id} className="bg-background-elevated border-border">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
                      phase.color === 'emerald' && 'bg-emerald-500/10 text-emerald-600',
                      phase.color === 'amber' && 'bg-amber-500/10 text-amber-600',
                      phase.color === 'blue' && 'bg-blue-500/10 text-blue-600',
                      phase.color === 'purple' && 'bg-purple-500/10 text-purple-600',
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-foreground text-sm">{phase.name}</h3>
                        <span className="text-xs font-mono bg-background-surface px-1.5 py-0.5 rounded text-foreground-muted">
                          {phase.weight}x
                        </span>
                      </div>
                      <p className="text-xs text-foreground-muted mt-1">{phase.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {phase.combines.map((sub) => (
                          <Badge key={sub} variant="secondary" className="text-xs py-0">
                            {sub}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Quality Tiers */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Quality Classification</h2>
          <Card className="bg-background-elevated border-border overflow-hidden">
            <div className="divide-y divide-border">
              {qualityTiers.map((tier) => {
                const Icon = tier.icon
                return (
                  <div key={tier.name} className={cn(
                    'flex items-center gap-4 p-3',
                    tier.color === 'purple' && 'bg-purple-500/5',
                    tier.color === 'blue' && 'bg-blue-500/5',
                    tier.color === 'emerald' && 'bg-emerald-500/5',
                    tier.color === 'amber' && 'bg-amber-500/5',
                    tier.color === 'gray' && 'bg-gray-500/5',
                  )}>
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded shrink-0',
                      tier.color === 'purple' && 'text-purple-600',
                      tier.color === 'blue' && 'text-blue-600',
                      tier.color === 'emerald' && 'text-emerald-600',
                      tier.color === 'amber' && 'text-amber-600',
                      tier.color === 'gray' && 'text-gray-500',
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'font-semibold text-sm',
                          tier.color === 'purple' && 'text-purple-600',
                          tier.color === 'blue' && 'text-blue-600',
                          tier.color === 'emerald' && 'text-emerald-600',
                          tier.color === 'amber' && 'text-amber-600',
                          tier.color === 'gray' && 'text-gray-500',
                        )}>
                          {tier.name}
                        </span>
                        <span className="text-xs font-mono text-foreground-muted">{tier.range}</span>
                      </div>
                      <p className="text-xs text-foreground-muted">{tier.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Detailed Rubric Criteria */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">Detailed Rubric Criteria</h2>
          <p className="text-sm text-foreground-muted mb-4">
            Each phase is evaluated against specific criteria totaling 10 points. Click to expand.
          </p>

          <div className="space-y-3">
            {phases.map((phase) => {
              const criteria = rubricCriteria[phase.id as keyof typeof rubricCriteria]
              const Icon = phase.icon
              const isExpanded = expandedPhase === phase.id

              return (
                <Card key={phase.id} className="bg-background-elevated border-border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-background-surface/50 transition-colors"
                  >
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg shrink-0',
                      phase.color === 'emerald' && 'bg-emerald-500/10 text-emerald-600',
                      phase.color === 'amber' && 'bg-amber-500/10 text-amber-600',
                      phase.color === 'blue' && 'bg-blue-500/10 text-blue-600',
                      phase.color === 'purple' && 'bg-purple-500/10 text-purple-600',
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{phase.name}</h3>
                      <p className="text-xs text-foreground-muted">{phase.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {criteria.length} criteria
                      </Badge>
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-foreground-muted" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-foreground-muted" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-background-surface/50">
                              <th className="px-4 py-2 text-left text-xs font-semibold text-foreground-muted uppercase tracking-wider w-16">ID</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-foreground-muted uppercase tracking-wider">Criterion</th>
                              <th className="px-4 py-2 text-center text-xs font-semibold text-foreground-muted uppercase tracking-wider w-16">Pts</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-foreground-muted uppercase tracking-wider w-28">Category</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-foreground-muted uppercase tracking-wider">Scoring Levels</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {criteria.map((item) => {
                              const CategoryIcon = categoryIcons[item.category] || Check
                              return (
                                <tr key={item.id} className="hover:bg-background-surface/30 transition-colors">
                                  <td className="px-4 py-3">
                                    <span className="font-mono text-xs font-semibold text-foreground bg-background-surface px-1.5 py-0.5 rounded">
                                      {item.id}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="font-medium text-foreground text-sm">{item.name}</div>
                                    <div className="text-xs text-foreground-muted">{item.description}</div>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="text-sm font-bold text-foreground">{item.points}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="inline-flex items-center gap-1 text-xs">
                                      <CategoryIcon className="h-3.5 w-3.5 text-foreground-muted" />
                                      {item.category}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="space-y-0.5">
                                      {item.levels.map((level, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-xs">
                                          <span className={cn(
                                            'font-mono font-semibold shrink-0 w-7',
                                            parseFloat(level.score) >= item.points * 0.7 ? 'text-emerald-600' :
                                            parseFloat(level.score) >= item.points * 0.5 ? 'text-amber-600' : 'text-red-500'
                                          )}>
                                            {level.score}
                                          </span>
                                          <span className="text-foreground-muted">{level.condition}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="bg-background-surface/50">
                              <td colSpan={2} className="px-4 py-2 text-xs font-semibold text-foreground">
                                Total Points
                              </td>
                              <td className="px-4 py-2 text-center">
                                <span className="text-sm font-bold text-foreground">10.0</span>
                              </td>
                              <td colSpan={2} className="px-4 py-2 text-xs text-foreground-muted">
                                Pass threshold: 7.0 (70%)
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        </div>

        {/* Footer Note */}
        <Card className="bg-background-surface border-border">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Continuous Improvement</h3>
              <p className="text-xs text-foreground-muted mt-1">
                Our rubric criteria are continuously refined based on research outcomes and user feedback.
                The goal is not to game the rubric, but to help researchers craft better queries that lead
                to discoveries with genuine real-world scientific impact. When a discovery fails to meet the
                threshold, the platform provides specific guidance on which criteria need improvement.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
