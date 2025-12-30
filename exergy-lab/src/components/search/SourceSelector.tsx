'use client'

import * as React from 'react'
import {
  Check,
  Database,
  FileText,
  BookOpen,
  Newspaper,
  FlaskConical,
  Scale,
  Globe,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Badge, Button } from '@/components/ui'
import type { DataSourceName, DataSourceType } from '@/types/sources'

interface SourceSelectorProps {
  selectedSources: DataSourceName[]
  onSourcesChange: (sources: DataSourceName[]) => void
  disabled?: boolean
  compact?: boolean
}

interface SourceGroup {
  type: DataSourceType | 'web'
  label: string
  icon: React.ReactNode
  sources: Array<{
    name: DataSourceName
    label: string
    description: string
  }>
}

const SOURCE_GROUPS: SourceGroup[] = [
  {
    type: 'academic-paper',
    label: 'Academic Papers',
    icon: <BookOpen className="h-4 w-4" />,
    sources: [
      { name: 'semantic-scholar', label: 'Semantic Scholar', description: '200M+ papers with citation analysis' },
      { name: 'openalex', label: 'OpenAlex', description: 'Open catalog of scholarly papers' },
      { name: 'pubmed', label: 'PubMed', description: 'Biomedical and life sciences' },
      { name: 'ieee', label: 'IEEE Xplore', description: 'Engineering and technology' },
      { name: 'crossref', label: 'Crossref', description: 'DOI registration and metadata' },
      { name: 'core', label: 'CORE', description: 'Open access research outputs' },
    ],
  },
  {
    type: 'preprint',
    label: 'Preprints',
    icon: <FileText className="h-4 w-4" />,
    sources: [
      { name: 'arxiv', label: 'arXiv', description: 'Physics, math, CS preprints' },
      { name: 'chemrxiv', label: 'ChemRxiv', description: 'Chemistry preprints' },
      { name: 'biorxiv', label: 'bioRxiv', description: 'Biology preprints' },
      { name: 'medrxiv', label: 'medRxiv', description: 'Medical preprints' },
    ],
  },
  {
    type: 'patent',
    label: 'Patents',
    icon: <Scale className="h-4 w-4" />,
    sources: [
      { name: 'google-patents', label: 'Google Patents', description: 'Global patent search' },
      { name: 'uspto', label: 'USPTO', description: 'US Patent and Trademark Office' },
      { name: 'epo', label: 'EPO', description: 'European Patent Office' },
    ],
  },
  {
    type: 'dataset',
    label: 'Datasets & Reports',
    icon: <Database className="h-4 w-4" />,
    sources: [
      { name: 'nrel', label: 'NREL', description: 'National Renewable Energy Lab' },
      { name: 'iea', label: 'IEA', description: 'International Energy Agency' },
      { name: 'eia', label: 'EIA', description: 'US Energy Information Admin' },
      { name: 'materials-project', label: 'Materials Project', description: 'Materials science database' },
      { name: 'zenodo', label: 'Zenodo', description: 'Open research datasets' },
    ],
  },
  {
    type: 'consensus',
    label: 'Consensus & AI',
    icon: <FlaskConical className="h-4 w-4" />,
    sources: [
      { name: 'consensus', label: 'Consensus', description: 'AI-powered scientific consensus' },
      { name: 'inspire', label: 'INSPIRE HEP', description: 'High energy physics' },
    ],
  },
  {
    type: 'web',
    label: 'News & Web',
    icon: <Globe className="h-4 w-4" />,
    sources: [
      { name: 'newsapi', label: 'News API', description: 'Recent news articles' },
      { name: 'web-search', label: 'Web Search', description: 'General web results' },
    ],
  },
]

const ALL_SOURCES: DataSourceName[] = SOURCE_GROUPS.flatMap(g => g.sources.map(s => s.name))

export function SourceSelector({
  selectedSources,
  onSourcesChange,
  disabled = false,
  compact = false,
}: SourceSelectorProps) {
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(new Set(['academic-paper']))

  const toggleGroup = (type: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(type)) {
      newExpanded.delete(type)
    } else {
      newExpanded.add(type)
    }
    setExpandedGroups(newExpanded)
  }

  const toggleSource = (sourceName: DataSourceName) => {
    if (disabled) return

    const newSources = selectedSources.includes(sourceName)
      ? selectedSources.filter(s => s !== sourceName)
      : [...selectedSources, sourceName]
    onSourcesChange(newSources)
  }

  const toggleGroupSources = (group: SourceGroup) => {
    if (disabled) return

    const groupSourceNames = group.sources.map(s => s.name)
    const allSelected = groupSourceNames.every(s => selectedSources.includes(s))

    if (allSelected) {
      // Deselect all in group
      onSourcesChange(selectedSources.filter(s => !groupSourceNames.includes(s)))
    } else {
      // Select all in group
      const newSources = [...new Set([...selectedSources, ...groupSourceNames])]
      onSourcesChange(newSources)
    }
  }

  const selectAll = () => {
    if (disabled) return
    onSourcesChange(ALL_SOURCES)
  }

  const selectNone = () => {
    if (disabled) return
    onSourcesChange([])
  }

  const getGroupSelectionState = (group: SourceGroup) => {
    const groupSourceNames = group.sources.map(s => s.name)
    const selectedCount = groupSourceNames.filter(s => selectedSources.includes(s)).length
    if (selectedCount === 0) return 'none'
    if (selectedCount === groupSourceNames.length) return 'all'
    return 'partial'
  }

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-foreground-muted">Sources:</span>
        {SOURCE_GROUPS.map(group => {
          const state = getGroupSelectionState(group)
          const selectedCount = group.sources.filter(s => selectedSources.includes(s.name)).length

          return (
            <button
              key={group.type}
              onClick={() => toggleGroupSources(group)}
              disabled={disabled}
              className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium transition-colors
                ${state === 'all' ? 'bg-primary text-white' : ''}
                ${state === 'partial' ? 'bg-primary/20 text-primary' : ''}
                ${state === 'none' ? 'bg-background-surface text-foreground-muted hover:bg-background-elevated' : ''}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {group.icon}
              <span>{group.label}</span>
              {state !== 'none' && (
                <Badge size="sm" variant="secondary" className="ml-1">
                  {selectedCount}
                </Badge>
              )}
            </button>
          )
        })}
        <div className="flex items-center gap-1 ml-2">
          <Button variant="ghost" size="sm" onClick={selectAll} disabled={disabled}>
            All
          </Button>
          <Button variant="ghost" size="sm" onClick={selectNone} disabled={disabled}>
            None
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Quick Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">Data Sources</span>
          <Badge size="sm" variant="secondary">
            {selectedSources.length}/{ALL_SOURCES.length}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={selectAll} disabled={disabled}>
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={selectNone} disabled={disabled}>
            Clear
          </Button>
        </div>
      </div>

      {/* Source Groups */}
      <div className="space-y-2">
        {SOURCE_GROUPS.map(group => {
          const isExpanded = expandedGroups.has(group.type)
          const state = getGroupSelectionState(group)
          const selectedCount = group.sources.filter(s => selectedSources.includes(s.name)).length

          return (
            <div
              key={group.type}
              className="border border-border rounded-lg overflow-hidden"
            >
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(group.type)}
                className="w-full flex items-center justify-between p-3 bg-background-surface hover:bg-background-elevated transition-colors"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleGroupSources(group)
                    }}
                    disabled={disabled}
                    className={`
                      h-5 w-5 rounded border-2 flex items-center justify-center transition-colors
                      ${state === 'all' ? 'bg-primary border-primary' : ''}
                      ${state === 'partial' ? 'bg-primary/30 border-primary' : ''}
                      ${state === 'none' ? 'border-border hover:border-primary/50' : ''}
                      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    `}
                  >
                    {state !== 'none' && (
                      <Check className={`h-3 w-3 ${state === 'all' ? 'text-white' : 'text-primary'}`} />
                    )}
                  </button>
                  <div className="flex items-center gap-2 text-foreground">
                    {group.icon}
                    <span className="font-medium">{group.label}</span>
                  </div>
                  <Badge size="sm" variant="secondary">
                    {selectedCount}/{group.sources.length}
                  </Badge>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-foreground-muted" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-foreground-muted" />
                )}
              </button>

              {/* Group Sources */}
              {isExpanded && (
                <div className="p-3 pt-0 space-y-2">
                  {group.sources.map(source => {
                    const isSelected = selectedSources.includes(source.name)

                    return (
                      <button
                        key={source.name}
                        onClick={() => toggleSource(source.name)}
                        disabled={disabled}
                        className={`
                          w-full flex items-center gap-3 p-2 rounded-md text-left transition-colors
                          ${isSelected ? 'bg-primary/10' : 'hover:bg-background-elevated'}
                          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                      >
                        <div
                          className={`
                            h-4 w-4 rounded border flex items-center justify-center flex-shrink-0
                            ${isSelected ? 'bg-primary border-primary' : 'border-border'}
                          `}
                        >
                          {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-foreground">{source.label}</div>
                          <div className="text-xs text-foreground-muted truncate">{source.description}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { ALL_SOURCES, SOURCE_GROUPS }
export type { SourceGroup }
