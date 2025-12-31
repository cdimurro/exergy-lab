'use client'

import * as React from 'react'
import { useState } from 'react'
import {
  X,
  ExternalLink,
  BookOpen,
  Users,
  Calendar,
  Quote,
  FileText,
  Bookmark,
  Share2,
  Copy,
  Check,
  ArrowRight,
  FlaskConical,
  Bot,
  Network,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface Author {
  name: string
  affiliation?: string
  authorId?: string
}

export interface PaperDetails {
  id: string
  title: string
  abstract?: string
  authors: Author[]
  year: number
  venue?: string
  doi?: string
  url?: string
  citationCount?: number
  referenceCount?: number
  isOpenAccess?: boolean
  tldr?: string
  fieldsOfStudy?: string[]
  sources?: string[]
  methodology?: string
  keyFindings?: string[]
  quantitativeResults?: Array<{
    metric: string
    value: string
    context?: string
  }>
}

interface PaperDetailsPanelProps {
  paper: PaperDetails | null
  isOpen: boolean
  onClose: () => void
  onCiteClick?: (paper: PaperDetails) => void
  onSaveClick?: (paper: PaperDetails) => void
  onExperimentClick?: (paper: PaperDetails) => void
  onSimulationClick?: (paper: PaperDetails) => void
  onCitationGraphClick?: (paper: PaperDetails) => void
}

// ============================================================================
// Component
// ============================================================================

export function PaperDetailsPanel({
  paper,
  isOpen,
  onClose,
  onCiteClick,
  onSaveClick,
  onExperimentClick,
  onSimulationClick,
  onCitationGraphClick,
}: PaperDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'citations' | 'related'>('summary')
  const [copied, setCopied] = useState<string | null>(null)

  const handleCopy = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(null), 2000)
  }

  const generateBibTeX = () => {
    if (!paper) return ''

    const authorStr = paper.authors.map((a) => a.name).join(' and ')
    const key = `${paper.authors[0]?.name.split(' ').pop()?.toLowerCase() || 'unknown'}${paper.year}`

    return `@article{${key},
  title={${paper.title}},
  author={${authorStr}},
  year={${paper.year}},
  journal={${paper.venue || 'Unknown'}},
  doi={${paper.doi || ''}}
}`
  }

  if (!isOpen || !paper) return null

  return (
    <div className="h-full bg-zinc-900 border-l border-zinc-700 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h3 className="text-sm font-medium text-white truncate flex-1">Paper Details</h3>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {(['summary', 'citations', 'related'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 text-sm capitalize transition-colors ${
              activeTab === tab
                ? 'text-emerald-400 border-b-2 border-emerald-400 bg-zinc-800/50'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'summary' && (
          <div className="space-y-4">
            {/* Title */}
            <div>
              <h2 className="text-lg font-semibold text-white leading-snug">
                {paper.title}
              </h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {paper.year}
                </span>
                {paper.citationCount !== undefined && (
                  <span className="flex items-center gap-1">
                    <Quote className="w-3 h-3" />
                    {paper.citationCount} citations
                  </span>
                )}
                {paper.isOpenAccess && (
                  <span className="text-emerald-400 text-xs bg-emerald-500/10 px-2 py-0.5 rounded">
                    Open Access
                  </span>
                )}
              </div>
            </div>

            {/* Authors */}
            <div>
              <h4 className="text-xs font-medium text-zinc-400 uppercase mb-2 flex items-center gap-1">
                <Users className="w-3 h-3" />
                Authors
              </h4>
              <div className="flex flex-wrap gap-2">
                {paper.authors.slice(0, 5).map((author, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 bg-zinc-800 text-zinc-300 text-sm rounded"
                    title={author.affiliation}
                  >
                    {author.name}
                  </span>
                ))}
                {paper.authors.length > 5 && (
                  <span className="px-2 py-1 text-zinc-500 text-sm">
                    +{paper.authors.length - 5} more
                  </span>
                )}
              </div>
            </div>

            {/* Venue */}
            {paper.venue && (
              <div>
                <h4 className="text-xs font-medium text-zinc-400 uppercase mb-1">
                  Published In
                </h4>
                <p className="text-sm text-zinc-300">{paper.venue}</p>
              </div>
            )}

            {/* TLDR / Key Insight */}
            {paper.tldr && (
              <div className="p-3 bg-emerald-900/20 border border-emerald-800 rounded-lg">
                <h4 className="text-xs font-medium text-emerald-400 uppercase mb-1">
                  Key Insight
                </h4>
                <p className="text-sm text-zinc-300">{paper.tldr}</p>
              </div>
            )}

            {/* Abstract */}
            {paper.abstract && (
              <div>
                <h4 className="text-xs font-medium text-zinc-400 uppercase mb-2 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Abstract
                </h4>
                <p className="text-sm text-zinc-300 leading-relaxed">
                  {paper.abstract}
                </p>
              </div>
            )}

            {/* Key Findings */}
            {paper.keyFindings && paper.keyFindings.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-zinc-400 uppercase mb-2">
                  Key Findings
                </h4>
                <ul className="space-y-1">
                  {paper.keyFindings.map((finding, idx) => (
                    <li key={idx} className="text-sm text-zinc-300 flex items-start gap-2">
                      <span className="text-emerald-500 mt-1">•</span>
                      {finding}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quantitative Results */}
            {paper.quantitativeResults && paper.quantitativeResults.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-zinc-400 uppercase mb-2">
                  Quantitative Results
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {paper.quantitativeResults.map((result, idx) => (
                    <div key={idx} className="p-2 bg-zinc-800 rounded">
                      <div className="text-xs text-zinc-400">{result.metric}</div>
                      <div className="text-sm font-medium text-white">{result.value}</div>
                      {result.context && (
                        <div className="text-xs text-zinc-500">{result.context}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fields of Study */}
            {paper.fieldsOfStudy && paper.fieldsOfStudy.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-zinc-400 uppercase mb-2">
                  Fields of Study
                </h4>
                <div className="flex flex-wrap gap-1">
                  {paper.fieldsOfStudy.map((field, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-xs rounded"
                    >
                      {field}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sources */}
            {paper.sources && paper.sources.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-zinc-400 uppercase mb-2">
                  Found In
                </h4>
                <div className="flex flex-wrap gap-1">
                  {paper.sources.map((source, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 bg-zinc-700 text-zinc-300 text-xs rounded"
                    >
                      {source}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'citations' && (
          <div className="space-y-4">
            <div className="text-center py-8">
              <Network className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-400">
                View citation network for this paper
              </p>
              <button
                onClick={() => onCitationGraphClick?.(paper)}
                className="mt-3 px-4 py-2 bg-zinc-800 hover:bg-zinc-700
                         text-zinc-300 text-sm rounded-lg transition-colors"
              >
                Open Citation Graph
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-zinc-800 rounded-lg text-center">
                <div className="text-2xl font-bold text-white">
                  {paper.citationCount ?? 0}
                </div>
                <div className="text-xs text-zinc-400">Citations</div>
              </div>
              <div className="p-3 bg-zinc-800 rounded-lg text-center">
                <div className="text-2xl font-bold text-white">
                  {paper.referenceCount ?? 0}
                </div>
                <div className="text-xs text-zinc-400">References</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'related' && (
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm text-zinc-400">
              Related paper recommendations coming soon
            </p>
          </div>
        )}
      </div>

      {/* Actions Footer */}
      <div className="border-t border-zinc-800 p-4 space-y-3">
        {/* Primary Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onExperimentClick?.(paper)}
            className="flex items-center justify-center gap-2 px-3 py-2
                     bg-emerald-600 hover:bg-emerald-500 text-white text-sm
                     rounded-lg transition-colors"
          >
            <FlaskConical className="w-4 h-4" />
            Design Experiment
          </button>
          <button
            onClick={() => onSimulationClick?.(paper)}
            className="flex items-center justify-center gap-2 px-3 py-2
                     bg-blue-600 hover:bg-blue-500 text-white text-sm
                     rounded-lg transition-colors"
          >
            <Bot className="w-4 h-4" />
            Run Simulation
          </button>
        </div>

        {/* Secondary Actions */}
        <div className="flex items-center gap-2">
          {paper.url && (
            <a
              href={paper.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2
                       bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm
                       rounded-lg transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              View Paper
            </a>
          )}

          <button
            onClick={() => onSaveClick?.(paper)}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            title="Save to Library"
          >
            <Bookmark className="w-4 h-4 text-zinc-400" />
          </button>

          <button
            onClick={() => handleCopy(generateBibTeX(), 'bibtex')}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            title="Copy BibTeX"
          >
            {copied === 'bibtex' ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4 text-zinc-400" />
            )}
          </button>

          <button
            onClick={() => handleCopy(paper.url || paper.doi || '', 'link')}
            className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
            title="Share"
          >
            {copied === 'link' ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Share2 className="w-4 h-4 text-zinc-400" />
            )}
          </button>
        </div>

        {/* DOI */}
        {paper.doi && (
          <div className="text-xs text-zinc-500 text-center">
            DOI: {paper.doi}
          </div>
        )}
      </div>
    </div>
  )
}
