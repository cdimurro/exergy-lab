'use client'

import * as React from 'react'
import { Card, Button, Badge } from '@/components/ui'
import {
  Search,
  FlaskConical,
  Cpu,
  Calculator,
  Compass,
  BookOpen,
  MessageSquare,
  ExternalLink,
  ChevronRight,
  Lightbulb,
  Zap,
  HelpCircle,
} from 'lucide-react'
import Link from 'next/link'

const FEATURES = [
  {
    id: 'discovery',
    name: 'Discovery',
    description: 'AI-powered research discovery across energy, materials, and chemicals domains',
    icon: Compass,
    href: '/discovery',
    tips: [
      'Start with a specific research question or goal',
      'Select relevant domains to focus the search',
      'Review and approve the execution plan before running',
      'Expand phases to see detailed search terms and databases',
    ],
  },
  {
    id: 'search',
    name: 'Literature Search',
    description: 'Search academic papers, patents, and datasets',
    icon: Search,
    href: '/search',
    tips: [
      'Use specific keywords for better results',
      'Filter by date range for recent research',
      'Include both papers and patents for comprehensive coverage',
      'Export results for offline analysis',
    ],
  },
  {
    id: 'experiments',
    name: 'Experiment Designer',
    description: 'Generate experimental protocols with AI assistance',
    icon: FlaskConical,
    href: '/experiments',
    tips: [
      'Describe your experiment objectives clearly',
      'Review safety notes for each protocol',
      'Customize materials and equipment lists',
      'Check the failure mode analysis before starting',
    ],
  },
  {
    id: 'simulations',
    name: 'Simulations',
    description: 'Run computational simulations for energy, materials, and chemical systems',
    icon: Cpu,
    href: '/simulations',
    tips: [
      'Browser tier is free and suitable for quick estimates',
      'Local tier provides better accuracy for most use cases',
      'Cloud tier is recommended for production-grade results',
      'Review parameters before execution to save compute time',
    ],
  },
  {
    id: 'tea',
    name: 'TEA Generator',
    description: 'Techno-economic analysis for energy technologies',
    icon: Calculator,
    href: '/tea-generator',
    tips: [
      'Upload relevant cost data for accurate analysis',
      'Set realistic discount rates and project lifetimes',
      'Review sensitivity analysis to understand key drivers',
      'Export reports for stakeholder presentations',
    ],
  },
]

const FAQ = [
  {
    question: 'How does the AI plan generation work?',
    answer:
      'When you submit a query, our AI analyzes your research goals and generates a customized execution plan. This includes specific search terms, databases to query, experiment protocols, and simulation parameters tailored to your exact request.',
  },
  {
    question: 'What is the cost model?',
    answer:
      'Most features are free, including literature search, experiment design, and browser-tier simulations. Only cloud GPU simulations have a cost associated with them, which is displayed before execution.',
  },
  {
    question: 'Can I modify the execution plan?',
    answer:
      'Yes! After the plan is generated, you can expand each phase to see details and modify parameters. Click "Advanced Parameters" to adjust specific settings before approving the plan.',
  },
  {
    question: 'What databases are searched?',
    answer:
      'We search multiple sources including Web of Science, Scopus, arXiv, USPTO (patents), Materials Project, and NIST WebBook. The specific databases depend on your domain and query.',
  },
  {
    question: 'How accurate are the simulations?',
    answer:
      'Accuracy depends on the tier selected. Browser simulations provide quick estimates (±20% accuracy). Local simulations offer good accuracy (±10%). Cloud simulations use high-fidelity models with ±5% accuracy.',
  },
]

export default function HelpPage() {
  const [expandedFaq, setExpandedFaq] = React.useState<number | null>(null)

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Help Center</h1>
        <p className="text-foreground-muted mt-1">
          Learn how to use Exergy Lab to accelerate your scientific research.
        </p>
      </div>

      {/* Quick Start */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/20 text-primary">
            <Zap className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-foreground">Quick Start</h2>
            <p className="text-foreground-muted mt-1">
              The fastest way to get started is with the <strong>Discovery</strong> feature.
              Simply describe your research goal and the AI will create a comprehensive plan
              including literature search, experiment design, and simulations.
            </p>
            <Link href="/discovery">
              <Button className="mt-4" leftIcon={<Compass className="h-4 w-4" />}>
                Try Discovery
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Features */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.id} className="bg-background-elevated border-border">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-foreground">{feature.name}</h3>
                      <Link href={feature.href}>
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                    <p className="text-sm text-foreground-muted mt-1">{feature.description}</p>
                    <div className="mt-3 space-y-1.5">
                      {feature.tips.map((tip, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                          <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
                          <span className="text-foreground-muted">{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Frequently Asked Questions</h2>
        <Card className="bg-background-elevated border-border divide-y divide-border">
          {FAQ.map((item, idx) => (
            <div key={idx}>
              <button
                type="button"
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between gap-4 p-4 text-left hover:bg-background-surface/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-primary shrink-0" />
                  <span className="font-medium text-foreground">{item.question}</span>
                </div>
                <ChevronRight
                  className={`h-5 w-5 text-foreground-muted transition-transform ${
                    expandedFaq === idx ? 'rotate-90' : ''
                  }`}
                />
              </button>
              {expandedFaq === idx && (
                <div className="px-4 pb-4 pl-12">
                  <p className="text-foreground-muted">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </Card>
      </div>

      {/* Contact */}
      <Card className="bg-background-surface border-border">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-foreground/10 text-foreground-muted">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-foreground">Need more help?</h3>
            <p className="text-sm text-foreground-muted">
              Contact our support team or check the documentation for detailed guides.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" leftIcon={<BookOpen className="h-4 w-4" />}>
              Documentation
            </Button>
            <Button variant="secondary" size="sm" leftIcon={<ExternalLink className="h-4 w-4" />}>
              Contact Support
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
