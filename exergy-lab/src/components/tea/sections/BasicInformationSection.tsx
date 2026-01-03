'use client'

import * as React from 'react'
import {
  Sun,
  Wind,
  Anchor,
  Droplet,
  Battery,
  Atom,
  Flame,
  Waves,
  Leaf,
  Zap,
  FileText,
} from 'lucide-react'
import { SectionCard } from '../form-components/SectionCard'
import { FieldGroup } from '../form-components/FieldGroup'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { TechnologyType, TEAInput_v2 } from '@/types/tea'

const TECHNOLOGIES: Array<{
  type: TechnologyType
  label: string
  icon: React.ElementType
  description: string
}> = [
  { type: 'solar', label: 'Solar PV', icon: Sun, description: 'Photovoltaic systems' },
  { type: 'wind', label: 'Wind', icon: Wind, description: 'Onshore wind turbines' },
  { type: 'offshore_wind', label: 'Offshore Wind', icon: Anchor, description: 'Offshore wind farms' },
  { type: 'hydrogen', label: 'Hydrogen', icon: Droplet, description: 'Green H2 electrolysis' },
  { type: 'storage', label: 'Storage', icon: Battery, description: 'Battery energy storage' },
  { type: 'nuclear', label: 'Nuclear', icon: Atom, description: 'Nuclear power plants' },
  { type: 'geothermal', label: 'Geothermal', icon: Flame, description: 'Geothermal energy' },
  { type: 'hydro', label: 'Hydro', icon: Waves, description: 'Hydroelectric power' },
  { type: 'biomass', label: 'Biomass', icon: Leaf, description: 'Biomass to energy' },
  { type: 'generic', label: 'Other', icon: Zap, description: 'Generic technology' },
]

export interface BasicInformationSectionProps {
  formData: Partial<TEAInput_v2>
  onChange: (field: string, value: any) => void
  errors: Record<string, string>
  onTouch: (field: string) => void
  onLoadDefaults?: () => void
}

export function BasicInformationSection({
  formData,
  onChange,
  errors,
  onTouch,
  onLoadDefaults,
}: BasicInformationSectionProps) {
  const [charCount, setCharCount] = React.useState(0)
  const maxChars = 5000

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= maxChars) {
      setCharCount(value.length)
      onChange('project_description', value)
    }
  }

  const filledCount = [
    formData.project_name,
    formData.technology_type,
    formData.project_description,
  ].filter(Boolean).length

  return (
    <SectionCard
      title="Basic Information"
      icon={FileText}
      collapsible={false}
      requiredFieldsCount={3}
      filledFieldsCount={filledCount}
      description="Essential project details and technology selection"
    >
      <div className="space-y-6">
        {/* Project Name */}
        <div className="space-y-2">
          <Label htmlFor="project_name">
            Project Name <span className="text-red-500">*</span>
          </Label>
          <Input
            id="project_name"
            type="text"
            value={formData.project_name || ''}
            onChange={(e) => onChange('project_name', e.target.value)}
            onBlur={() => onTouch('project_name')}
            placeholder="100 MW Solar Farm - Nevada"
            className={errors.project_name ? 'border-red-500' : ''}
          />
          {errors.project_name && (
            <p className="text-xs text-red-500">{errors.project_name}</p>
          )}
        </div>

        {/* Technology Type */}
        <div className="space-y-3">
          <Label>
            Technology Type <span className="text-red-500">*</span>
          </Label>
          <p className="text-xs text-muted">
            Select the primary technology for this techno-economic analysis
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {TECHNOLOGIES.map((tech) => {
              const Icon = tech.icon
              const isSelected = formData.technology_type === tech.type

              return (
                <button
                  key={tech.type}
                  type="button"
                  onClick={() => {
                    onChange('technology_type', tech.type)
                    if (onLoadDefaults) {
                      // Small delay to let state update, then offer to load defaults
                      setTimeout(() => onLoadDefaults(), 100)
                    }
                  }}
                  className={`
                    p-4 rounded-lg border-2 transition-all text-left cursor-pointer
                    ${isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:border-primary/50 hover:scale-105'
                    }
                  `}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Icon className={`w-6 h-6 ${isSelected ? 'text-primary' : 'text-muted'}`} />
                    <div className="text-center">
                      <div className={`text-xs font-medium ${isSelected ? 'text-foreground' : 'text-muted'}`}>
                        {tech.label}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {errors.technology_type && (
            <p className="text-xs text-red-500">{errors.technology_type}</p>
          )}
        </div>

        {/* Project Description */}
        <div className="space-y-2">
          <Label htmlFor="project_description">
            Project Description <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="project_description"
            value={formData.project_description || ''}
            onChange={handleDescriptionChange}
            onBlur={() => onTouch('project_description')}
            placeholder="Describe your project or technology in detail. Include information about the system configuration, location, key technical specifications, and any unique aspects that would be relevant for the techno-economic analysis.

Example: Utility-scale solar photovoltaic installation with bifacial modules, single-axis tracking, and 4-hour battery storage. Located on 500 acres of previously disturbed land with excellent solar resource (5.8 kWh/m²/day). Project includes on-site substation and 15-mile 230kV transmission line to grid interconnection point..."
            rows={10}
            className={`resize-y ${errors.project_description ? 'border-red-500' : ''}`}
          />
          <div className="flex justify-between items-center">
            <div className="text-xs text-muted">
              Provide a comprehensive description to support AI analysis
            </div>
            <div className={`text-xs ${charCount > maxChars * 0.9 ? 'text-warning' : 'text-muted'}`}>
              {charCount} / {maxChars} characters
            </div>
          </div>
          {errors.project_description && (
            <p className="text-xs text-red-500">{errors.project_description}</p>
          )}
        </div>

        {/* Evaluation Year */}
        <div className="space-y-2">
          <Label htmlFor="evaluation_year">
            Evaluation Year
          </Label>
          <Input
            id="evaluation_year"
            type="number"
            value={formData.evaluation_year || new Date().getFullYear()}
            onChange={(e) => onChange('evaluation_year', parseInt(e.target.value))}
            placeholder={new Date().getFullYear().toString()}
            min={2020}
            max={2050}
            className="w-32"
          />
          <p className="text-xs text-muted">
            All costs will be indexed to this year
          </p>
        </div>
      </div>
    </SectionCard>
  )
}
