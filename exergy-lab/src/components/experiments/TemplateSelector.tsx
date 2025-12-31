'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import {
  Sun,
  Wind,
  Battery,
  Flame,
  Beaker,
  Plus,
  Search,
  Star,
  StarOff,
  Clock,
  ChevronRight,
  Microscope,
  Zap,
  Droplets,
  Thermometer,
} from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

export interface ProtocolTemplate {
  id: string
  name: string
  domain: 'solar' | 'wind' | 'battery' | 'hydrogen' | 'thermal' | 'general'
  category: 'synthesis' | 'characterization' | 'testing' | 'assembly'
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedDuration: string
  estimatedCost: string
  materials: Array<{ name: string; quantity: number; unit: string }>
  equipment: string[]
  stepsCount: number
  isFavorite?: boolean
  usageCount?: number
}

interface TemplateSelectorProps {
  templates: ProtocolTemplate[]
  onSelect: (template: ProtocolTemplate) => void
  onCreateNew?: () => void
  onToggleFavorite?: (templateId: string) => void
  selectedId?: string
  className?: string
}

// ============================================================================
// Constants
// ============================================================================

const DOMAIN_ICONS: Record<ProtocolTemplate['domain'], React.ElementType> = {
  solar: Sun,
  wind: Wind,
  battery: Battery,
  hydrogen: Droplets,
  thermal: Thermometer,
  general: Beaker,
}

const DOMAIN_COLORS: Record<ProtocolTemplate['domain'], { bg: string; text: string }> = {
  solar: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  wind: { bg: 'bg-sky-500/10', text: 'text-sky-400' },
  battery: { bg: 'bg-green-500/10', text: 'text-green-400' },
  hydrogen: { bg: 'bg-blue-500/10', text: 'text-blue-400' },
  thermal: { bg: 'bg-red-500/10', text: 'text-red-400' },
  general: { bg: 'bg-purple-500/10', text: 'text-purple-400' },
}

const CATEGORY_LABELS: Record<ProtocolTemplate['category'], string> = {
  synthesis: 'Synthesis',
  characterization: 'Characterization',
  testing: 'Testing',
  assembly: 'Assembly',
}

const DIFFICULTY_COLORS: Record<ProtocolTemplate['difficulty'], string> = {
  beginner: 'text-green-400 bg-green-500/10',
  intermediate: 'text-amber-400 bg-amber-500/10',
  advanced: 'text-red-400 bg-red-500/10',
}

// ============================================================================
// Default templates
// ============================================================================

export const DEFAULT_TEMPLATES: ProtocolTemplate[] = [
  // Solar
  {
    id: 'perovskite-thin-film',
    name: 'Perovskite Thin Film Deposition',
    domain: 'solar',
    category: 'synthesis',
    description: 'Spin-coating perovskite absorber layers for solar cells',
    difficulty: 'intermediate',
    estimatedDuration: '4-6 hours',
    estimatedCost: '$150-300',
    materials: [
      { name: 'Lead iodide', quantity: 500, unit: 'mg' },
      { name: 'MAI', quantity: 200, unit: 'mg' },
      { name: 'DMF', quantity: 50, unit: 'mL' },
    ],
    equipment: ['Spin coater', 'Glovebox', 'Hotplate'],
    stepsCount: 12,
  },
  {
    id: 'solar-iv-characterization',
    name: 'Solar Cell I-V Characterization',
    domain: 'solar',
    category: 'characterization',
    description: 'Standard I-V curve measurement under AM1.5G illumination',
    difficulty: 'beginner',
    estimatedDuration: '1-2 hours',
    estimatedCost: '$50-100',
    materials: [],
    equipment: ['Solar simulator', 'Source meter', 'Probe station'],
    stepsCount: 8,
  },
  {
    id: 'tandem-cell-assembly',
    name: 'Tandem Cell Assembly',
    domain: 'solar',
    category: 'assembly',
    description: 'Two-terminal tandem solar cell fabrication',
    difficulty: 'advanced',
    estimatedDuration: '2-3 days',
    estimatedCost: '$500-1000',
    materials: [
      { name: 'Si wafer', quantity: 5, unit: 'pcs' },
      { name: 'Perovskite precursors', quantity: 1, unit: 'set' },
    ],
    equipment: ['PECVD', 'Sputter', 'Spin coater', 'Evaporator'],
    stepsCount: 24,
  },

  // Battery
  {
    id: 'electrode-slurry',
    name: 'Electrode Slurry Preparation',
    domain: 'battery',
    category: 'synthesis',
    description: 'Prepare cathode/anode slurry for coating',
    difficulty: 'intermediate',
    estimatedDuration: '3-4 hours',
    estimatedCost: '$100-200',
    materials: [
      { name: 'Active material', quantity: 10, unit: 'g' },
      { name: 'Carbon black', quantity: 1, unit: 'g' },
      { name: 'PVDF binder', quantity: 0.5, unit: 'g' },
      { name: 'NMP solvent', quantity: 50, unit: 'mL' },
    ],
    equipment: ['Planetary mixer', 'Doctor blade', 'Vacuum oven'],
    stepsCount: 10,
  },
  {
    id: 'coin-cell-assembly',
    name: 'Coin Cell Assembly',
    domain: 'battery',
    category: 'assembly',
    description: 'CR2032 coin cell assembly in glovebox',
    difficulty: 'beginner',
    estimatedDuration: '2-3 hours',
    estimatedCost: '$50-100',
    materials: [
      { name: 'CR2032 cases', quantity: 10, unit: 'pcs' },
      { name: 'Separators', quantity: 10, unit: 'pcs' },
      { name: 'Electrolyte', quantity: 10, unit: 'mL' },
    ],
    equipment: ['Glovebox', 'Crimping machine', 'Punch'],
    stepsCount: 8,
  },
  {
    id: 'battery-cycling',
    name: 'Battery Cycling Protocol',
    domain: 'battery',
    category: 'testing',
    description: 'Galvanostatic cycling with rate capability',
    difficulty: 'beginner',
    estimatedDuration: '1-7 days',
    estimatedCost: '$20-50',
    materials: [],
    equipment: ['Battery cycler', 'Temperature chamber'],
    stepsCount: 6,
  },

  // Hydrogen
  {
    id: 'electrolyzer-mea',
    name: 'Electrolyzer MEA Assembly',
    domain: 'hydrogen',
    category: 'assembly',
    description: 'PEM electrolyzer membrane electrode assembly',
    difficulty: 'advanced',
    estimatedDuration: '4-6 hours',
    estimatedCost: '$300-500',
    materials: [
      { name: 'Nafion membrane', quantity: 1, unit: 'sheet' },
      { name: 'Catalyst ink', quantity: 20, unit: 'mL' },
      { name: 'GDL', quantity: 2, unit: 'pcs' },
    ],
    equipment: ['Hot press', 'Spray coater', 'Impedance analyzer'],
    stepsCount: 15,
  },
  {
    id: 'catalyst-ink',
    name: 'Catalyst Ink Preparation',
    domain: 'hydrogen',
    category: 'synthesis',
    description: 'Prepare Pt/C catalyst ink for fuel cells',
    difficulty: 'intermediate',
    estimatedDuration: '2-3 hours',
    estimatedCost: '$200-400',
    materials: [
      { name: 'Pt/C catalyst', quantity: 100, unit: 'mg' },
      { name: 'Nafion solution', quantity: 5, unit: 'mL' },
      { name: 'IPA', quantity: 20, unit: 'mL' },
    ],
    equipment: ['Sonicator', 'Magnetic stirrer', 'Spray gun'],
    stepsCount: 8,
  },

  // Wind
  {
    id: 'blade-fatigue',
    name: 'Blade Material Fatigue Testing',
    domain: 'wind',
    category: 'testing',
    description: 'Cyclic fatigue testing for composite materials',
    difficulty: 'advanced',
    estimatedDuration: '1-2 weeks',
    estimatedCost: '$500-1500',
    materials: [
      { name: 'Test specimens', quantity: 10, unit: 'pcs' },
    ],
    equipment: ['Fatigue testing machine', 'Strain gauges', 'DIC system'],
    stepsCount: 12,
  },

  // Thermal
  {
    id: 'thermal-conductivity',
    name: 'Thermal Conductivity Measurement',
    domain: 'thermal',
    category: 'characterization',
    description: 'Hot disk thermal analysis of materials',
    difficulty: 'beginner',
    estimatedDuration: '1-2 hours',
    estimatedCost: '$30-50',
    materials: [],
    equipment: ['Hot disk analyzer', 'Sample holders'],
    stepsCount: 6,
  },
]

// ============================================================================
// Component
// ============================================================================

export function TemplateSelector({
  templates,
  onSelect,
  onCreateNew,
  onToggleFavorite,
  selectedId,
  className = '',
}: TemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDomain, setSelectedDomain] = useState<ProtocolTemplate['domain'] | 'all'>('all')
  const [selectedCategory, setSelectedCategory] = useState<ProtocolTemplate['category'] | 'all'>('all')
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matches =
          template.name.toLowerCase().includes(query) ||
          template.description.toLowerCase().includes(query)
        if (!matches) return false
      }

      // Domain filter
      if (selectedDomain !== 'all' && template.domain !== selectedDomain) {
        return false
      }

      // Category filter
      if (selectedCategory !== 'all' && template.category !== selectedCategory) {
        return false
      }

      // Favorites filter
      if (showFavoritesOnly && !template.isFavorite) {
        return false
      }

      return true
    })
  }, [templates, searchQuery, selectedDomain, selectedCategory, showFavoritesOnly])

  // Group by domain
  const groupedTemplates = useMemo(() => {
    const groups: Record<string, ProtocolTemplate[]> = {}

    filteredTemplates.forEach((template) => {
      if (!groups[template.domain]) {
        groups[template.domain] = []
      }
      groups[template.domain].push(template)
    })

    return groups
  }, [filteredTemplates])

  const domains: Array<ProtocolTemplate['domain'] | 'all'> = [
    'all',
    'solar',
    'wind',
    'battery',
    'hydrogen',
    'thermal',
    'general',
  ]

  return (
    <div className={`bg-zinc-800 rounded-lg ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-white">Protocol Templates</h3>
          {onCreateNew && (
            <button
              onClick={onCreateNew}
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Plus className="w-3 h-3" />
              Custom
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 space-y-3 border-b border-zinc-700">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-lg text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Domain pills */}
        <div className="flex flex-wrap gap-1">
          {domains.map((domain) => {
            const Icon = domain === 'all' ? Microscope : DOMAIN_ICONS[domain]
            const isActive = selectedDomain === domain
            const colors = domain === 'all' ? { bg: 'bg-zinc-700', text: 'text-zinc-300' } : DOMAIN_COLORS[domain]

            return (
              <button
                key={domain}
                onClick={() => setSelectedDomain(domain)}
                className={`
                  flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors
                  ${isActive ? `${colors.bg} ${colors.text}` : 'text-zinc-500 hover:text-zinc-300'}
                `}
              >
                <Icon className="w-3 h-3" />
                {domain === 'all' ? 'All' : domain.charAt(0).toUpperCase() + domain.slice(1)}
              </button>
            )
          })}
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as ProtocolTemplate['category'] | 'all')}
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="all">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`
              p-1.5 rounded transition-colors
              ${showFavoritesOnly ? 'bg-amber-500/20 text-amber-400' : 'text-zinc-500 hover:text-zinc-300'}
            `}
            title="Show favorites only"
          >
            <Star className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Template list */}
      <div className="max-h-96 overflow-y-auto">
        {Object.entries(groupedTemplates).map(([domain, domainTemplates]) => {
          const DomainIcon = DOMAIN_ICONS[domain as ProtocolTemplate['domain']]
          const colors = DOMAIN_COLORS[domain as ProtocolTemplate['domain']]

          return (
            <div key={domain}>
              {/* Domain header */}
              <div className={`px-4 py-2 ${colors.bg} flex items-center gap-2`}>
                <DomainIcon className={`w-4 h-4 ${colors.text}`} />
                <span className={`text-xs font-medium ${colors.text} uppercase`}>
                  {domain}
                </span>
                <span className="text-xs text-zinc-500">({domainTemplates.length})</span>
              </div>

              {/* Templates */}
              {domainTemplates.map((template) => {
                const isSelected = selectedId === template.id

                return (
                  <button
                    key={template.id}
                    onClick={() => onSelect(template)}
                    className={`
                      w-full px-4 py-3 text-left border-b border-zinc-700/50 transition-colors
                      ${isSelected ? 'bg-emerald-500/10' : 'hover:bg-zinc-750'}
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white truncate">
                            {template.name}
                          </span>
                          {template.isFavorite && (
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
                          {template.description}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${DIFFICULTY_COLORS[template.difficulty]}`}>
                            {template.difficulty}
                          </span>
                          <span className="text-xs text-zinc-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {template.estimatedDuration}
                          </span>
                          <span className="text-xs text-zinc-500">
                            {template.stepsCount} steps
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {onToggleFavorite && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onToggleFavorite(template.id)
                            }}
                            className="p-1 hover:bg-zinc-700 rounded transition-colors"
                          >
                            {template.isFavorite ? (
                              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            ) : (
                              <StarOff className="w-4 h-4 text-zinc-500" />
                            )}
                          </button>
                        )}
                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )
        })}

        {filteredTemplates.length === 0 && (
          <div className="py-8 text-center">
            <Beaker className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-sm text-zinc-400">No templates found</p>
            {onCreateNew && (
              <button
                onClick={onCreateNew}
                className="mt-2 text-sm text-emerald-400 hover:text-emerald-300"
              >
                Create custom protocol
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
