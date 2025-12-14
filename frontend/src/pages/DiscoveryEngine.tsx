import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import ReactECharts from 'echarts-for-react'
import { useAuthContext } from '@/lib/auth'
import {
  Sparkles,
  Search,
  Atom,
  TrendingUp,
  Lightbulb,
  ChevronRight,
  Beaker,
  Cpu,
  Target,
  Play,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  RefreshCw,
  BookOpen,
  Scale,
  Database,
} from 'lucide-react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

type DiscoveryMode = 'dashboard' | 'materials' | 'roadmap' | 'ip' | 'literature' | 'datasets'

interface Hypothesis {
  id: number
  hypothesis: string
  rationale: string
  feasibility_score: number
  novelty_score: number
  impact_score: number
  combined_score: number
  next_steps: string[]
  estimated_timeline: string
  estimated_budget: string
  priority: string
}

interface DiscoveryRun {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress_percent: number
  current_step: string
  problem_statement: string
  created_at: string
}

interface Paper {
  paper_id: string
  title: string
  authors: string[]
  abstract: string
  year: number | null
  venue: string | null
  citation_count: number
  url: string | null
  source: string
}

interface Patent {
  patent_id: string
  title: string
  abstract: string
  applicant: string
  inventors: string[]
  filing_date: string | null
  status: string
}

export function DiscoveryEngine() {
  const { tier, getAuthToken } = useAuthContext()
  const [mode, setMode] = useState<DiscoveryMode>('dashboard')

  // Dashboard state
  const [discoveries, setDiscoveries] = useState<DiscoveryRun[]>([])
  const [newProblem, setNewProblem] = useState('')
  const [numHypotheses, setNumHypotheses] = useState(50)
  const [isStartingDiscovery, setIsStartingDiscovery] = useState(false)
  const [activeDiscoveryId, setActiveDiscoveryId] = useState<string | null>(null)

  // Hypothesis state
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([])
  const [isGeneratingHypotheses, setIsGeneratingHypotheses] = useState(false)

  // Literature state
  const [literatureQuery, setLiteratureQuery] = useState('')
  const [papers, setPapers] = useState<Paper[]>([])
  const [literatureSynthesis, setLiteratureSynthesis] = useState<any>(null)
  const [isSearchingLiterature, setIsSearchingLiterature] = useState(false)
  const [isSynthesizing, setIsSynthesizing] = useState(false)

  // Patent state
  const [patentQuery, setPatentQuery] = useState('')
  const [patents, setPatents] = useState<Patent[]>([])
  const [patentLandscape, setPatentLandscape] = useState<any>(null)
  const [isSearchingPatents, setIsSearchingPatents] = useState(false)
  const [selectedTechArea, setSelectedTechArea] = useState('solar')

  // Materials state
  const [materialsQuery, setMaterialsQuery] = useState('')
  const [materials, setMaterials] = useState<any[]>([])
  const [isSearchingMaterials, setIsSearchingMaterials] = useState(false)

  // Unified search state
  const [unifiedQuery, setUnifiedQuery] = useState('')
  const [unifiedResults, setUnifiedResults] = useState<any>(null)
  const [isUnifiedSearching, setIsUnifiedSearching] = useState(false)

  const isDiscoveryTier = tier === 'discovery'

  // Poll for discovery status
  useEffect(() => {
    if (activeDiscoveryId) {
      const interval = setInterval(async () => {
        try {
          const token = await getAuthToken()
          const response = await fetch(`${API_BASE}/api/discovery/${activeDiscoveryId}/status`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (response.ok) {
            const status = await response.json()
            setDiscoveries(prev => prev.map(d =>
              d.id === activeDiscoveryId
                ? { ...d, status: status.status, progress_percent: status.progress_percent, current_step: status.current_step }
                : d
            ))
            if (status.status === 'completed' || status.status === 'failed') {
              setActiveDiscoveryId(null)
            }
          }
        } catch (error) {
          console.error('Failed to poll discovery status:', error)
        }
      }, 3000)
      return () => clearInterval(interval)
    }
  }, [activeDiscoveryId, getAuthToken])

  // Start a new discovery run
  const handleStartDiscovery = async () => {
    if (!newProblem.trim()) return
    setIsStartingDiscovery(true)

    try {
      const token = await getAuthToken()
      const response = await fetch(`${API_BASE}/api/discovery/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          problem_statement: newProblem,
          num_hypotheses: numHypotheses,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const newDiscovery: DiscoveryRun = {
          id: data.discovery_id,
          status: 'pending',
          progress_percent: 0,
          current_step: 'Starting...',
          problem_statement: newProblem,
          created_at: new Date().toISOString(),
        }
        setDiscoveries(prev => [newDiscovery, ...prev])
        setActiveDiscoveryId(data.discovery_id)
        setNewProblem('')
      }
    } catch (error) {
      console.error('Failed to start discovery:', error)
    } finally {
      setIsStartingDiscovery(false)
    }
  }

  // Generate hypotheses only
  const handleGenerateHypotheses = async () => {
    if (!newProblem.trim()) return
    setIsGeneratingHypotheses(true)

    try {
      const token = await getAuthToken()
      const response = await fetch(`${API_BASE}/api/discovery/hypotheses/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          problem_statement: newProblem,
          num_hypotheses: numHypotheses,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setHypotheses(data.hypotheses)
      }
    } catch (error) {
      console.error('Failed to generate hypotheses:', error)
    } finally {
      setIsGeneratingHypotheses(false)
    }
  }

  // Literature search
  const handleLiteratureSearch = async () => {
    if (!literatureQuery.trim()) return
    setIsSearchingLiterature(true)

    try {
      const token = await getAuthToken()
      const response = await fetch(`${API_BASE}/api/discovery/literature/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: literatureQuery,
          limit: 30,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setPapers(data.papers)
      }
    } catch (error) {
      console.error('Failed to search literature:', error)
    } finally {
      setIsSearchingLiterature(false)
    }
  }

  // Literature synthesis
  const handleLiteratureSynthesis = async () => {
    if (!literatureQuery.trim()) return
    setIsSynthesizing(true)

    try {
      const token = await getAuthToken()
      const response = await fetch(`${API_BASE}/api/discovery/literature/synthesize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: literatureQuery,
          limit: 30,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setLiteratureSynthesis(data)
      }
    } catch (error) {
      console.error('Failed to synthesize literature:', error)
    } finally {
      setIsSynthesizing(false)
    }
  }

  // Patent search
  const handlePatentSearch = async () => {
    if (!patentQuery.trim()) return
    setIsSearchingPatents(true)

    try {
      const token = await getAuthToken()
      const response = await fetch(`${API_BASE}/api/discovery/patents/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: patentQuery,
          technology_area: selectedTechArea,
          limit: 50,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setPatents(data.patents)
      }
    } catch (error) {
      console.error('Failed to search patents:', error)
    } finally {
      setIsSearchingPatents(false)
    }
  }

  // Patent landscape analysis
  const handlePatentLandscape = async () => {
    setIsSearchingPatents(true)

    try {
      const token = await getAuthToken()
      const response = await fetch(`${API_BASE}/api/discovery/patents/landscape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          technology_area: selectedTechArea,
          years: 5,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setPatentLandscape(data)
      }
    } catch (error) {
      console.error('Failed to analyze patent landscape:', error)
    } finally {
      setIsSearchingPatents(false)
    }
  }

  // Unified dataset search
  const handleUnifiedSearch = async () => {
    if (!unifiedQuery.trim()) return
    setIsUnifiedSearching(true)

    try {
      const token = await getAuthToken()
      const response = await fetch(`${API_BASE}/api/discovery/datasets/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: unifiedQuery,
          include_materials: true,
          include_papers: true,
          include_chemicals: true,
          include_energy: false,
          limit_per_source: 10,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setUnifiedResults(data)
      }
    } catch (error) {
      console.error('Failed to search datasets:', error)
    } finally {
      setIsUnifiedSearching(false)
    }
  }

  // Download discovery report
  const handleDownloadReport = async (discoveryId: string) => {
    try {
      const token = await getAuthToken()
      const response = await fetch(`${API_BASE}/api/discovery/${discoveryId}/report`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Discovery_Report_${discoveryId}.pdf`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to download report:', error)
    }
  }

  // Patent landscape chart options
  const patentChartOptions = patentLandscape ? {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#1a1a24',
      borderColor: '#2a2a3a',
      textStyle: { color: '#f8fafc' },
    },
    grid: {
      left: '3%',
      right: '10%',
      bottom: '3%',
      containLabel: true,
    },
    xAxis: {
      type: 'value',
      name: 'Patents',
      nameTextStyle: { color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#2a2a3a' } },
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#1f1f2e' } },
    },
    yAxis: {
      type: 'category',
      data: patentLandscape.top_applicants?.slice(0, 10).map((a: any) => a.name) || [],
      axisLine: { lineStyle: { color: '#2a2a3a' } },
      axisLabel: { color: '#94a3b8' },
    },
    series: [{
      type: 'bar',
      data: patentLandscape.top_applicants?.slice(0, 10).map((a: any) => a.patent_count) || [],
      itemStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [
            { offset: 0, color: '#8b5cf6' },
            { offset: 1, color: '#a78bfa' },
          ],
        },
      },
      label: {
        show: true,
        position: 'right',
        color: '#94a3b8',
        formatter: '{c}',
      },
    }],
  } : null

  if (!isDiscoveryTier) {
    return (
      <div>
        <Header
          title="Discovery Engine"
          subtitle="AI-powered clean energy solution discovery"
        />
        <div className="p-6">
          <div className="card bg-gradient-to-r from-accent-purple/10 to-primary/10 border-accent-purple/20 text-center py-12">
            <Sparkles className="w-12 h-12 text-accent-purple mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-text-primary mb-2">Discovery Tier Required</h2>
            <p className="text-text-secondary mb-6 max-w-md mx-auto">
              The Discovery Engine uses Claude Opus 4.5 to generate novel research hypotheses,
              synthesize literature, and analyze patent landscapes.
            </p>
            <Button variant="primary" size="lg">
              Upgrade to Discovery
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header
        title="Discovery Engine"
        subtitle="AI-powered clean energy solution discovery"
      />

      <div className="p-6 space-y-6">
        {/* Tier Badge */}
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-accent-purple/20 text-accent-purple">
            Discovery Tier
          </span>
          <span className="text-sm text-text-muted">
            Powered by Claude Opus 4.5 for deep reasoning
          </span>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={mode === 'dashboard' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setMode('dashboard')}
            leftIcon={<Sparkles className="w-4 h-4" />}
          >
            Discovery Dashboard
          </Button>
          <Button
            variant={mode === 'materials' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setMode('materials')}
            leftIcon={<Atom className="w-4 h-4" />}
          >
            Materials Search
          </Button>
          <Button
            variant={mode === 'literature' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setMode('literature')}
            leftIcon={<BookOpen className="w-4 h-4" />}
          >
            Literature Synthesis
          </Button>
          <Button
            variant={mode === 'ip' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setMode('ip')}
            leftIcon={<Scale className="w-4 h-4" />}
          >
            Patent Landscape
          </Button>
          <Button
            variant={mode === 'datasets' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setMode('datasets')}
            leftIcon={<Database className="w-4 h-4" />}
          >
            Dataset Hub
          </Button>
        </div>

        {/* Discovery Dashboard Mode */}
        {mode === 'dashboard' && (
          <div className="space-y-6">
            {/* New Discovery Form */}
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                <Target className="w-5 h-5 inline mr-2 text-primary" />
                Start New Discovery
              </h3>
              <p className="text-sm text-text-muted mb-4">
                Describe your research problem and let AI generate novel hypotheses,
                search literature, and analyze the patent landscape.
              </p>

              <textarea
                value={newProblem}
                onChange={(e) => setNewProblem(e.target.value)}
                placeholder="e.g., 'Develop a low-cost, stable perovskite solar cell that can achieve 30% efficiency without using lead'"
                className="w-full h-32 p-3 rounded-lg bg-surface-elevated border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
              />

              <div className="flex items-center gap-4 mt-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-text-muted">Hypotheses:</label>
                  <select
                    value={numHypotheses}
                    onChange={(e) => setNumHypotheses(Number(e.target.value))}
                    className="px-3 py-1.5 rounded-lg bg-surface-elevated border border-border text-text-primary"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                  </select>
                </div>

                <div className="flex-1" />

                <Button
                  variant="secondary"
                  onClick={handleGenerateHypotheses}
                  disabled={isGeneratingHypotheses || !newProblem.trim()}
                  leftIcon={<Lightbulb className="w-4 h-4" />}
                >
                  {isGeneratingHypotheses ? 'Generating...' : 'Generate Hypotheses Only'}
                </Button>

                <Button
                  variant="primary"
                  onClick={handleStartDiscovery}
                  disabled={isStartingDiscovery || !newProblem.trim()}
                  leftIcon={<Play className="w-4 h-4" />}
                >
                  {isStartingDiscovery ? 'Starting...' : 'Run Full Discovery'}
                </Button>
              </div>
            </div>

            {/* Active/Recent Discoveries */}
            {discoveries.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-text-primary mb-4">
                  Discovery Runs
                </h3>
                <div className="space-y-3">
                  {discoveries.map((discovery) => (
                    <div
                      key={discovery.id}
                      className="p-4 rounded-lg bg-surface-elevated"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {discovery.status === 'completed' && (
                              <CheckCircle className="w-4 h-4 text-primary" />
                            )}
                            {discovery.status === 'running' && (
                              <RefreshCw className="w-4 h-4 text-accent-blue animate-spin" />
                            )}
                            {discovery.status === 'pending' && (
                              <Clock className="w-4 h-4 text-text-muted" />
                            )}
                            {discovery.status === 'failed' && (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                            <span className="font-medium text-text-primary">
                              Discovery #{discovery.id}
                            </span>
                          </div>
                          <p className="text-sm text-text-secondary line-clamp-2">
                            {discovery.problem_statement}
                          </p>
                          {discovery.status === 'running' && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                                <span>{discovery.current_step}</span>
                                <span>{discovery.progress_percent}%</span>
                              </div>
                              <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-primary transition-all duration-500"
                                  style={{ width: `${discovery.progress_percent}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        {discovery.status === 'completed' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDownloadReport(discovery.id)}
                            leftIcon={<Download className="w-4 h-4" />}
                          >
                            Report
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Generated Hypotheses */}
            {hypotheses.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-text-primary mb-4">
                  Generated Hypotheses ({hypotheses.length})
                </h3>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {hypotheses.map((hypothesis) => (
                    <div
                      key={hypothesis.id}
                      className="p-4 rounded-lg bg-surface-elevated"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          hypothesis.priority === 'High' ? 'bg-primary/20 text-primary' :
                          hypothesis.priority === 'Medium' ? 'bg-accent-blue/20 text-accent-blue' :
                          'bg-surface text-text-muted'
                        }`}>
                          {hypothesis.priority} Priority
                        </span>
                        <span className="text-sm font-medium text-accent-purple">
                          Score: {hypothesis.combined_score.toFixed(1)}/10
                        </span>
                      </div>
                      <p className="text-text-primary font-medium mb-2">
                        {hypothesis.hypothesis}
                      </p>
                      <p className="text-sm text-text-secondary mb-3">
                        {hypothesis.rationale}
                      </p>
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="text-text-muted">Feasibility:</span>
                          <span className="text-text-primary ml-1">{hypothesis.feasibility_score}/10</span>
                        </div>
                        <div>
                          <span className="text-text-muted">Novelty:</span>
                          <span className="text-text-primary ml-1">{hypothesis.novelty_score}/10</span>
                        </div>
                        <div>
                          <span className="text-text-muted">Impact:</span>
                          <span className="text-text-primary ml-1">{hypothesis.impact_score}/10</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Literature Synthesis Mode */}
        {mode === 'literature' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                <BookOpen className="w-5 h-5 inline mr-2 text-primary" />
                AI Literature Synthesis
              </h3>
              <p className="text-sm text-text-muted mb-4">
                Search Semantic Scholar and arXiv, then get AI-synthesized insights.
              </p>

              <div className="flex gap-2">
                <Input
                  value={literatureQuery}
                  onChange={(e) => setLiteratureQuery(e.target.value)}
                  placeholder="e.g., 'perovskite solar cell stability'"
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  onClick={handleLiteratureSearch}
                  disabled={isSearchingLiterature}
                  leftIcon={<Search className="w-4 h-4" />}
                >
                  {isSearchingLiterature ? 'Searching...' : 'Search'}
                </Button>
                <Button
                  variant="primary"
                  onClick={handleLiteratureSynthesis}
                  disabled={isSynthesizing}
                  leftIcon={<Sparkles className="w-4 h-4" />}
                >
                  {isSynthesizing ? 'Synthesizing...' : 'AI Synthesis'}
                </Button>
              </div>
            </div>

            {/* Literature Synthesis Results */}
            {literatureSynthesis && (
              <div className="card">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-accent-purple/10">
                    <Sparkles className="w-5 h-5 text-accent-purple" />
                  </div>
                  <div>
                    <h4 className="font-medium text-text-primary">AI Synthesis</h4>
                    <p className="text-xs text-text-muted">
                      Based on {literatureSynthesis.papers_analyzed} papers
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <h5 className="font-medium text-text-primary mb-2">Key Findings</h5>
                    <ul className="space-y-1">
                      {literatureSynthesis.key_findings?.map((finding: string, i: number) => (
                        <li key={i} className="text-sm text-text-secondary flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-primary mt-0.5" />
                          {finding}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {literatureSynthesis.synthesis_narrative && (
                    <div>
                      <h5 className="font-medium text-text-primary mb-2">Synthesis</h5>
                      <p className="text-sm text-text-secondary whitespace-pre-wrap">
                        {literatureSynthesis.synthesis_narrative}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Papers List */}
            {papers.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-text-primary mb-4">
                  Papers Found ({papers.length})
                </h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {papers.map((paper) => (
                    <div
                      key={paper.paper_id}
                      className="p-3 rounded-lg bg-surface-elevated"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <a
                            href={paper.url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-text-primary hover:text-primary"
                          >
                            {paper.title}
                          </a>
                          <p className="text-xs text-text-muted mt-1">
                            {paper.authors.slice(0, 3).join(', ')}
                            {paper.authors.length > 3 && ' et al.'}
                            {paper.year && ` (${paper.year})`}
                          </p>
                        </div>
                        <span className="text-xs text-text-muted">
                          {paper.citation_count} citations
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Patent Landscape Mode */}
        {mode === 'ip' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                <Scale className="w-5 h-5 inline mr-2 text-primary" />
                Patent Landscape Analysis
              </h3>

              <div className="flex gap-2 mb-4">
                <select
                  value={selectedTechArea}
                  onChange={(e) => setSelectedTechArea(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-surface-elevated border border-border text-text-primary"
                >
                  <option value="solar">Solar</option>
                  <option value="wind">Wind</option>
                  <option value="battery">Battery</option>
                  <option value="hydrogen">Hydrogen</option>
                  <option value="carbon_capture">Carbon Capture</option>
                </select>
                <Input
                  value={patentQuery}
                  onChange={(e) => setPatentQuery(e.target.value)}
                  placeholder="Additional keywords..."
                  className="flex-1"
                />
                <Button
                  variant="secondary"
                  onClick={handlePatentSearch}
                  disabled={isSearchingPatents}
                  leftIcon={<Search className="w-4 h-4" />}
                >
                  Search
                </Button>
                <Button
                  variant="primary"
                  onClick={handlePatentLandscape}
                  disabled={isSearchingPatents}
                  leftIcon={<TrendingUp className="w-4 h-4" />}
                >
                  Analyze Landscape
                </Button>
              </div>
            </div>

            {/* Patent Landscape Results */}
            {patentLandscape && (
              <>
                <div className="card">
                  <h3 className="text-lg font-semibold text-text-primary mb-4">
                    {patentLandscape.technology_area} Patent Landscape
                  </h3>
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-lg bg-surface-elevated text-center">
                      <div className="text-2xl font-bold text-primary">
                        {patentLandscape.total_patents}
                      </div>
                      <div className="text-sm text-text-muted">Total Patents</div>
                    </div>
                    <div className="p-4 rounded-lg bg-surface-elevated text-center">
                      <div className="text-2xl font-bold text-accent-purple">
                        {patentLandscape.top_applicants?.length || 0}
                      </div>
                      <div className="text-sm text-text-muted">Key Players</div>
                    </div>
                    <div className="p-4 rounded-lg bg-surface-elevated text-center">
                      <div className="text-2xl font-bold text-accent-blue">
                        {patentLandscape.date_range}
                      </div>
                      <div className="text-sm text-text-muted">Date Range</div>
                    </div>
                  </div>

                  {patentChartOptions && (
                    <div className="h-[350px]">
                      <ReactECharts
                        option={patentChartOptions}
                        style={{ height: '100%', width: '100%' }}
                        opts={{ renderer: 'canvas' }}
                      />
                    </div>
                  )}
                </div>

                {/* White Space */}
                {patentLandscape.white_space_opportunities && (
                  <div className="card bg-gradient-to-r from-accent-purple/5 to-primary/5 border-accent-purple/20">
                    <h4 className="font-medium text-text-primary mb-3">
                      <Lightbulb className="w-5 h-5 inline mr-2 text-accent-purple" />
                      White Space Opportunities
                    </h4>
                    <ul className="space-y-2">
                      {patentLandscape.white_space_opportunities.map((opportunity: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                          <ChevronRight className="w-4 h-4 text-primary mt-0.5" />
                          {opportunity}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI Analysis */}
                {patentLandscape.analysis_summary && (
                  <div className="card">
                    <h4 className="font-medium text-text-primary mb-3">
                      <Sparkles className="w-5 h-5 inline mr-2 text-accent-purple" />
                      AI Analysis
                    </h4>
                    <p className="text-sm text-text-secondary whitespace-pre-wrap">
                      {patentLandscape.analysis_summary}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Patents List */}
            {patents.length > 0 && !patentLandscape && (
              <div className="card">
                <h3 className="text-lg font-semibold text-text-primary mb-4">
                  Patents Found ({patents.length})
                </h3>
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {patents.map((patent) => (
                    <div
                      key={patent.patent_id}
                      className="p-3 rounded-lg bg-surface-elevated"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="font-mono text-sm text-primary">
                          {patent.patent_id}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          patent.status === 'granted' ? 'bg-primary/20 text-primary' : 'bg-surface text-text-muted'
                        }`}>
                          {patent.status}
                        </span>
                      </div>
                      <p className="font-medium text-text-primary text-sm">
                        {patent.title}
                      </p>
                      <p className="text-xs text-text-muted mt-1">
                        {patent.applicant} | {patent.filing_date}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dataset Hub Mode */}
        {mode === 'datasets' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                <Database className="w-5 h-5 inline mr-2 text-primary" />
                Unified Dataset Search
              </h3>
              <p className="text-sm text-text-muted mb-4">
                Search across Materials Project, Semantic Scholar, arXiv, and PubChem simultaneously.
              </p>

              <div className="flex gap-2">
                <Input
                  value={unifiedQuery}
                  onChange={(e) => setUnifiedQuery(e.target.value)}
                  placeholder="e.g., 'lithium ion battery cathode'"
                  className="flex-1"
                />
                <Button
                  variant="primary"
                  onClick={handleUnifiedSearch}
                  disabled={isUnifiedSearching}
                  leftIcon={<Search className="w-4 h-4" />}
                >
                  {isUnifiedSearching ? 'Searching...' : 'Search All'}
                </Button>
              </div>
            </div>

            {/* Unified Results */}
            {unifiedResults && (
              <>
                <div className="grid grid-cols-4 gap-4">
                  <div className="card text-center">
                    <div className="text-2xl font-bold text-primary">
                      {unifiedResults.materials?.length || 0}
                    </div>
                    <div className="text-sm text-text-muted">Materials</div>
                  </div>
                  <div className="card text-center">
                    <div className="text-2xl font-bold text-accent-blue">
                      {unifiedResults.papers?.length || 0}
                    </div>
                    <div className="text-sm text-text-muted">Papers</div>
                  </div>
                  <div className="card text-center">
                    <div className="text-2xl font-bold text-accent-purple">
                      {unifiedResults.chemicals?.length || 0}
                    </div>
                    <div className="text-sm text-text-muted">Chemicals</div>
                  </div>
                  <div className="card text-center">
                    <div className="text-2xl font-bold text-text-muted">
                      {unifiedResults.search_time_seconds?.toFixed(2)}s
                    </div>
                    <div className="text-sm text-text-muted">Search Time</div>
                  </div>
                </div>

                {/* Materials */}
                {unifiedResults.materials?.length > 0 && (
                  <div className="card">
                    <h4 className="font-medium text-text-primary mb-3">
                      <Atom className="w-4 h-4 inline mr-2" />
                      Materials ({unifiedResults.materials.length})
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {unifiedResults.materials.slice(0, 6).map((m: any) => (
                        <div key={m.material_id} className="p-3 rounded-lg bg-surface-elevated">
                          <span className="font-mono text-primary">{m.formula}</span>
                          {m.band_gap && (
                            <p className="text-xs text-text-muted">Band gap: {m.band_gap} eV</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Papers */}
                {unifiedResults.papers?.length > 0 && (
                  <div className="card">
                    <h4 className="font-medium text-text-primary mb-3">
                      <BookOpen className="w-4 h-4 inline mr-2" />
                      Papers ({unifiedResults.papers.length})
                    </h4>
                    <div className="space-y-2">
                      {unifiedResults.papers.slice(0, 5).map((p: any) => (
                        <div key={p.paper_id} className="p-2 rounded-lg bg-surface-elevated">
                          <p className="text-sm text-text-primary line-clamp-1">{p.title}</p>
                          <p className="text-xs text-text-muted">
                            {p.year} | {p.citation_count} citations | {p.source}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chemicals */}
                {unifiedResults.chemicals?.length > 0 && (
                  <div className="card">
                    <h4 className="font-medium text-text-primary mb-3">
                      <Beaker className="w-4 h-4 inline mr-2" />
                      Chemicals ({unifiedResults.chemicals.length})
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {unifiedResults.chemicals.slice(0, 6).map((c: any) => (
                        <div key={c.cid} className="p-3 rounded-lg bg-surface-elevated">
                          <span className="font-medium text-text-primary">{c.name}</span>
                          <p className="text-xs text-text-muted">{c.molecular_formula}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Data Sources */}
            <div className="card bg-surface-elevated/50">
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Cpu className="w-4 h-4" />
                <span>Data sources: Materials Project, Semantic Scholar, arXiv, PubChem, NREL</span>
              </div>
            </div>
          </div>
        )}

        {/* Materials Search Mode */}
        {mode === 'materials' && (
          <div className="space-y-6">
            <div className="card">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                <Atom className="w-5 h-5 inline mr-2 text-primary" />
                Clean Energy Materials Search
              </h3>
              <p className="text-sm text-text-muted mb-4">
                Search the Materials Project database for materials by application.
              </p>

              <div className="flex gap-2">
                <Input
                  value={materialsQuery}
                  onChange={(e) => setMaterialsQuery(e.target.value)}
                  placeholder="e.g., 'solar', 'battery cathode', 'catalyst HER'"
                  className="flex-1"
                />
                <Button
                  variant="primary"
                  onClick={async () => {
                    setIsSearchingMaterials(true)
                    try {
                      const token = await getAuthToken()
                      const response = await fetch(`${API_BASE}/api/discovery/datasets/clean-energy-materials`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          application: materialsQuery,
                          limit: 20,
                        }),
                      })
                      if (response.ok) {
                        const data = await response.json()
                        setMaterials(data.materials || [])
                      }
                    } catch (e) {
                      console.error(e)
                    } finally {
                      setIsSearchingMaterials(false)
                    }
                  }}
                  disabled={isSearchingMaterials}
                  leftIcon={<Search className="w-4 h-4" />}
                >
                  {isSearchingMaterials ? 'Searching...' : 'Search Materials'}
                </Button>
              </div>
            </div>

            {materials.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-text-primary mb-4">
                  Materials Found ({materials.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {materials.map((m: any) => (
                    <div key={m.material_id} className="p-4 rounded-lg bg-surface-elevated">
                      <span className="font-mono text-lg text-primary">{m.formula}</span>
                      <div className="mt-2 space-y-1 text-xs text-text-muted">
                        {m.band_gap && <div>Band gap: {m.band_gap?.toFixed(2)} eV</div>}
                        {m.formation_energy_per_atom && (
                          <div>Formation E: {m.formation_energy_per_atom?.toFixed(2)} eV/atom</div>
                        )}
                        <div className={m.is_stable ? 'text-primary' : 'text-text-muted'}>
                          {m.is_stable ? 'Stable' : 'Metastable'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
