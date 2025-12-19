'use client'

/**
 * Criteria Page
 *
 * Explains the FrontierScience-based evaluation methodology used by the Discovery Engine.
 * Provides detailed rubric criteria for each discovery phase.
 */

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
      description: '1000+ words, good structure, includes visuals',
      passCondition: 'Report is well-written with clear structure',
      levels: [
        { score: '2.0', condition: '1000+ words, structured, visuals' },
        { score: '1.5', condition: '500+ words, readable' },
        { score: '1.0', condition: '200+ words' },
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

export default function CriteriaPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Award className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Evaluation Criteria</h1>
              <p className="text-muted-foreground">
                How the Discovery Engine analyzes and scores scientific inquiries
              </p>
            </div>
          </div>
        </div>

        {/* Methodology Overview */}
        <section className="mb-12">
          <div className="bg-card border rounded-xl p-8">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Core Philosophy: FrontierScience Methodology
            </h2>
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                Our evaluation framework is built upon the <strong className="text-foreground">FrontierScience methodology</strong> recently
                released by OpenAI, which represents the leading benchmark for evaluating AI&apos;s ability to perform
                rigorous scientific tasks. FrontierScience establishes a standardized approach to measuring whether
                AI-generated research meets the quality thresholds expected for real-world scientific impact.
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-muted/30 rounded-lg p-5">
                  <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Target className="w-5 h-5 text-emerald-600" />
                    7/10 Pass Threshold
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Each phase requires a minimum score of 7.0 out of 10 points to pass, ensuring that only
                    scientifically rigorous work advances through the discovery pipeline.
                  </p>
                </div>
                <div className="bg-muted/30 rounded-lg p-5">
                  <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-600" />
                    Iterative Refinement
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Outputs that don&apos;t meet the threshold are iteratively refined with specific guidance
                    from the rubric feedback, allowing up to 5 refinement cycles per phase.
                  </p>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-foreground mb-3">
                Beyond FrontierScience: Real-World Impact Extensions
              </h3>
              <p className="text-muted-foreground mb-4">
                While FrontierScience provides the foundation, we extend the framework with additional parameters
                specifically designed for clean energy research and techno-economic feasibility:
              </p>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4">
                  <Zap className="w-5 h-5 text-amber-500 mb-2" />
                  <h4 className="font-semibold text-foreground mb-1">Exergy Analysis</h4>
                  <p className="text-xs text-muted-foreground">
                    Second-law thermodynamic evaluation to identify efficiency bottlenecks and improvement opportunities
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <DollarSign className="w-5 h-5 text-green-500 mb-2" />
                  <h4 className="font-semibold text-foreground mb-1">TEA Integration</h4>
                  <p className="text-xs text-muted-foreground">
                    Techno-economic analysis including NPV, IRR, LCOE, and payback period calculations
                  </p>
                </div>
                <div className="border rounded-lg p-4">
                  <FileSearch className="w-5 h-5 text-blue-500 mb-2" />
                  <h4 className="font-semibold text-foreground mb-1">IP Landscape</h4>
                  <p className="text-xs text-muted-foreground">
                    Patent analysis with freedom-to-operate and patentability assessment for commercial viability
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4-Phase Architecture */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6">
            Consolidated 4-Phase Architecture
          </h2>
          <p className="text-muted-foreground mb-6">
            Our discovery pipeline uses a consolidated 4-phase architecture optimized for higher success rates.
            Research shows that reducing from 12 phases to 4 increases overall success probability from 6.9% to 41%
            at an 80% per-phase pass rate.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {phases.map((phase) => {
              const Icon = phase.icon
              return (
                <div key={phase.id} className="bg-card border rounded-xl p-6">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                      phase.color === 'emerald' && 'bg-emerald-500/10',
                      phase.color === 'amber' && 'bg-amber-500/10',
                      phase.color === 'blue' && 'bg-blue-500/10',
                      phase.color === 'purple' && 'bg-purple-500/10',
                    )}>
                      <Icon className={cn(
                        'w-6 h-6',
                        phase.color === 'emerald' && 'text-emerald-600',
                        phase.color === 'amber' && 'text-amber-600',
                        phase.color === 'blue' && 'text-blue-600',
                        phase.color === 'purple' && 'text-purple-600',
                      )} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="text-lg font-semibold text-foreground">{phase.name}</h3>
                        <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">
                          Weight: {phase.weight}x
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{phase.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {phase.combines.map((sub) => (
                          <span key={sub} className="text-xs bg-muted/50 px-2 py-0.5 rounded-full text-muted-foreground">
                            {sub}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Quality Tiers */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold text-foreground mb-6">
            Discovery Quality Classification
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-muted/30">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Quality Tier</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">Score Range</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr className="bg-purple-500/5">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-2 font-semibold text-purple-600">
                      <Award className="w-4 h-4" />
                      Breakthrough
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-mono">9.0+</td>
                  <td className="px-6 py-4 text-muted-foreground">Potential for publication, novel contribution to the field</td>
                </tr>
                <tr className="bg-blue-500/5">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-2 font-semibold text-blue-600">
                      <TrendingUp className="w-4 h-4" />
                      Significant
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-mono">8.0 - 8.9</td>
                  <td className="px-6 py-4 text-muted-foreground">Strong findings with minor gaps, high quality work</td>
                </tr>
                <tr className="bg-emerald-500/5">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-2 font-semibold text-emerald-600">
                      <Check className="w-4 h-4" />
                      Validated
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-mono">7.0 - 7.9</td>
                  <td className="px-6 py-4 text-muted-foreground">Meets FrontierScience threshold, solid scientific work</td>
                </tr>
                <tr className="bg-amber-500/5">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-2 font-semibold text-amber-600">
                      <Lightbulb className="w-4 h-4" />
                      Promising
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-mono">5.0 - 6.9</td>
                  <td className="px-6 py-4 text-muted-foreground">Good foundation but needs iteration and refinement</td>
                </tr>
                <tr className="bg-gray-500/5">
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-2 font-semibold text-gray-500">
                      <FileText className="w-4 h-4" />
                      Preliminary
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-mono">&lt;5.0</td>
                  <td className="px-6 py-4 text-muted-foreground">Early stage work with significant gaps</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Detailed Rubric Tables */}
        <section>
          <h2 className="text-2xl font-semibold text-foreground mb-6">
            Detailed Rubric Criteria by Phase
          </h2>
          <p className="text-muted-foreground mb-8">
            Each phase is evaluated against specific criteria totaling 10 points. The following tables show
            exactly what the platform evaluates in each section and how scores are assigned.
          </p>

          {phases.map((phase) => {
            const criteria = rubricCriteria[phase.id as keyof typeof rubricCriteria]
            const Icon = phase.icon

            return (
              <div key={phase.id} className="mb-10">
                <div className={cn(
                  'flex items-center gap-3 mb-4 pb-4 border-b',
                )}>
                  <div className={cn(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    phase.color === 'emerald' && 'bg-emerald-500/10',
                    phase.color === 'amber' && 'bg-amber-500/10',
                    phase.color === 'blue' && 'bg-blue-500/10',
                    phase.color === 'purple' && 'bg-purple-500/10',
                  )}>
                    <Icon className={cn(
                      'w-5 h-5',
                      phase.color === 'emerald' && 'text-emerald-600',
                      phase.color === 'amber' && 'text-amber-600',
                      phase.color === 'blue' && 'text-blue-600',
                      phase.color === 'purple' && 'text-purple-600',
                    )} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">{phase.name}</h3>
                    <p className="text-sm text-muted-foreground">{phase.description}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border rounded-xl overflow-hidden">
                    <thead>
                      <tr className="bg-muted/30">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20">ID</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Criterion</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-20">Points</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-28">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scoring Levels</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {criteria.map((item) => {
                        const CategoryIcon = categoryIcons[item.category] || Check
                        return (
                          <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-4">
                              <span className="font-mono text-sm font-semibold text-foreground bg-muted px-2 py-1 rounded">
                                {item.id}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="font-medium text-foreground mb-1">{item.name}</div>
                              <div className="text-sm text-muted-foreground">{item.description}</div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="text-lg font-bold text-foreground">{item.points}</span>
                            </td>
                            <td className="px-4 py-4">
                              <span className="inline-flex items-center gap-1.5 text-sm">
                                <CategoryIcon className="w-4 h-4 text-muted-foreground" />
                                {item.category}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="space-y-1">
                                {item.levels.map((level, idx) => (
                                  <div key={idx} className="flex items-start gap-2 text-xs">
                                    <span className={cn(
                                      'font-mono font-semibold shrink-0 w-8',
                                      parseFloat(level.score) >= item.points * 0.7 ? 'text-emerald-600' :
                                      parseFloat(level.score) >= item.points * 0.5 ? 'text-amber-600' : 'text-red-500'
                                    )}>
                                      {level.score}
                                    </span>
                                    <span className="text-muted-foreground">{level.condition}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/30">
                        <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-foreground">
                          Total Points
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-lg font-bold text-foreground">10.0</span>
                        </td>
                        <td colSpan={2} className="px-4 py-3 text-sm text-muted-foreground">
                          Pass threshold: 7.0 (70%)
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )
          })}
        </section>

        {/* Footer Note */}
        <section className="mt-12 p-6 bg-muted/30 rounded-xl border">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Lightbulb className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-2">Continuous Improvement</h3>
              <p className="text-sm text-muted-foreground">
                Our rubric criteria are continuously refined based on research outcomes and user feedback.
                The goal is not to &quot;game&quot; the rubric, but to help researchers craft better queries that lead
                to discoveries with genuine real-world scientific impact. When a discovery fails to meet the
                threshold, the platform provides specific guidance on which criteria need improvement.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
