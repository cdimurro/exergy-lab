'use client'

import * as React from 'react'
import { Card, Metric, Text, Flex, BadgeDelta, ProgressBar } from '@tremor/react'
import { Button, Input, Badge } from '@/components/ui'
import {
  Sparkles,
  Search,
  BookOpen,
  Lightbulb,
  TrendingUp,
  ExternalLink,
  RefreshCw,
  Filter,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  Clock,
  Loader2,
} from 'lucide-react'

// Sample hypotheses data
const HYPOTHESES = [
  {
    id: 1,
    title: 'Perovskite-Silicon Tandem Efficiency Breakthrough',
    description:
      'Recent literature suggests combining perovskite top cells with silicon bottom cells could achieve >30% efficiency at commercial scale by 2026.',
    confidence: 87,
    sources: 12,
    status: 'verified',
    category: 'Solar',
    date: '2 hours ago',
  },
  {
    id: 2,
    title: 'Green Hydrogen Production Cost Trajectory',
    description:
      'Analysis of electrolyzer improvements indicates potential for $2/kg green hydrogen by 2028, faster than previous IRENA projections.',
    confidence: 74,
    sources: 8,
    status: 'pending',
    category: 'Hydrogen',
    date: '5 hours ago',
  },
  {
    id: 3,
    title: 'Offshore Wind Foundation Innovation',
    description:
      'Floating platform designs show 40% cost reduction potential compared to fixed-bottom installations in deep water (>60m).',
    confidence: 82,
    sources: 15,
    status: 'verified',
    category: 'Wind',
    date: '1 day ago',
  },
]

// Sample research papers
const RESEARCH_PAPERS = [
  {
    id: 1,
    title: 'Thermodynamic Limits of Photovoltaic Energy Conversion',
    authors: 'Chen et al.',
    journal: 'Nature Energy',
    year: 2024,
    relevance: 95,
  },
  {
    id: 2,
    title: 'Exergy Analysis of Global Energy Systems: 2000-2023',
    authors: 'Miller & Wong',
    journal: 'Applied Energy',
    year: 2024,
    relevance: 92,
  },
  {
    id: 3,
    title: 'Learning Curves in Renewable Energy Technologies',
    authors: 'Rubin et al.',
    journal: 'Energy Policy',
    year: 2024,
    relevance: 88,
  },
]

export default function DiscoveryPage() {
  const [searchQuery, setSearchQuery] = React.useState('')
  const [isGenerating, setIsGenerating] = React.useState(false)

  const handleGenerate = () => {
    setIsGenerating(true)
    setTimeout(() => setIsGenerating(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl font-bold text-foreground">Discovery Engine</h1>
            <Badge variant="info" size="sm">
              Discovery
            </Badge>
          </div>
          <p className="text-foreground-muted">
            AI-powered research assistant for clean energy literature analysis and
            hypothesis generation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            leftIcon={<Filter className="w-4 h-4" />}
          >
            Filters
          </Button>
          <Button
            variant="primary"
            leftIcon={<Sparkles className="w-4 h-4" />}
            onClick={handleGenerate}
            loading={isGenerating}
          >
            Generate Hypotheses
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <Card className="bg-background-elevated border-border">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-subtle" />
            <input
              type="text"
              placeholder="Search research topics, technologies, or ask a question..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-background-surface border border-border rounded-lg text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <Button variant="primary" size="lg">
            Search
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {['Solar efficiency', 'Green hydrogen', 'Battery storage', 'Carbon capture'].map(
            (tag) => (
              <button
                key={tag}
                className="px-3 py-1.5 text-sm bg-background-surface rounded-full text-foreground-muted hover:text-foreground hover:bg-background-surface/80 transition-colors"
              >
                {tag}
              </button>
            )
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="xl:col-span-2 space-y-6">
          {/* Generated Hypotheses */}
          <Card className="bg-background-elevated border-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-accent-amber" />
                AI-Generated Hypotheses
              </h3>
              <Badge variant="primary" size="sm">
                {HYPOTHESES.length} New
              </Badge>
            </div>

            <div className="space-y-4">
              {HYPOTHESES.map((hypothesis) => (
                <div
                  key={hypothesis.id}
                  className="p-4 rounded-lg bg-background-surface border border-border hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={
                            hypothesis.status === 'verified' ? 'success' : 'warning'
                          }
                          size="sm"
                        >
                          {hypothesis.status === 'verified' ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <Clock className="w-3 h-3 mr-1" />
                          )}
                          {hypothesis.status}
                        </Badge>
                        <Badge variant="secondary" size="sm">
                          {hypothesis.category}
                        </Badge>
                        <span className="text-xs text-foreground-subtle">
                          {hypothesis.date}
                        </span>
                      </div>
                      <h4 className="text-base font-medium text-foreground mb-2">
                        {hypothesis.title}
                      </h4>
                      <p className="text-sm text-foreground-muted mb-3">
                        {hypothesis.description}
                      </p>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-foreground-subtle">
                            Confidence:
                          </span>
                          <span className="text-xs font-medium text-primary">
                            {hypothesis.confidence}%
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-foreground-subtle" />
                          <span className="text-xs text-foreground-subtle">
                            {hypothesis.sources} sources
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button className="p-2 rounded-lg hover:bg-primary/10 text-foreground-subtle hover:text-primary transition-colors">
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button className="p-2 rounded-lg hover:bg-rose-500/10 text-foreground-subtle hover:text-rose-400 transition-colors">
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Research Papers */}
          <Card className="bg-background-elevated border-border">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-accent-blue" />
                Relevant Literature
              </h3>
              <Button variant="ghost" size="sm" leftIcon={<RefreshCw className="w-4 h-4" />}>
                Refresh
              </Button>
            </div>

            <div className="space-y-3">
              {RESEARCH_PAPERS.map((paper) => (
                <div
                  key={paper.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background-surface hover:bg-background-surface/80 transition-colors group"
                >
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {paper.title}
                    </h4>
                    <p className="text-xs text-foreground-muted mt-1">
                      {paper.authors} • {paper.journal} ({paper.year})
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" size="sm">
                      {paper.relevance}% match
                    </Badge>
                    <button className="p-1.5 rounded text-foreground-subtle hover:text-primary transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Discovery Stats */}
          <Card className="bg-background-elevated border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Discovery Stats
            </h3>
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-background-surface">
                <Flex>
                  <Text className="text-foreground-muted">Papers Analyzed</Text>
                  <Metric className="text-foreground text-xl">2,847</Metric>
                </Flex>
              </div>
              <div className="p-3 rounded-lg bg-background-surface">
                <Flex>
                  <Text className="text-foreground-muted">Hypotheses Generated</Text>
                  <Metric className="text-foreground text-xl">156</Metric>
                </Flex>
              </div>
              <div className="p-3 rounded-lg bg-background-surface">
                <Flex>
                  <Text className="text-foreground-muted">Verified</Text>
                  <Metric className="text-primary text-xl">89</Metric>
                </Flex>
              </div>
            </div>
          </Card>

          {/* Trending Topics */}
          <Card className="bg-background-elevated border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Trending Topics
            </h3>
            <div className="space-y-3">
              {[
                { topic: 'Perovskite solar cells', growth: 45 },
                { topic: 'Green hydrogen', growth: 38 },
                { topic: 'Grid-scale storage', growth: 32 },
                { topic: 'Carbon capture', growth: 28 },
                { topic: 'Floating offshore wind', growth: 24 },
              ].map((item) => (
                <div key={item.topic}>
                  <Flex>
                    <Text className="text-foreground-muted text-sm">{item.topic}</Text>
                    <BadgeDelta deltaType="increase" size="sm">
                      +{item.growth}%
                    </BadgeDelta>
                  </Flex>
                  <ProgressBar
                    value={item.growth}
                    color="blue"
                    className="mt-2"
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* AI Status */}
          <Card className="bg-gradient-to-br from-accent-purple/20 to-primary/10 border-accent-purple/30">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-5 h-5 text-accent-purple" />
              <span className="font-medium text-foreground">AI Research Agent</span>
            </div>
            <p className="text-sm text-foreground-muted mb-3">
              Continuously scanning arXiv, PubMed, and energy journals for new
              findings.
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-xs text-foreground-subtle">Active</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
