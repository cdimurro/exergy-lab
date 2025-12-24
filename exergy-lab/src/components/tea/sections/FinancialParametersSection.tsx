'use client'

import * as React from 'react'
import { TrendingUp, Info } from 'lucide-react'
import { SectionCard } from '../form-components/SectionCard'
import { FieldGroup } from '../form-components/FieldGroup'
import { PercentageInput } from '../form-components/PercentageInput'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import type { TEAInput_v2 } from '@/types/tea'

export interface FinancialParametersSectionProps {
  formData: Partial<TEAInput_v2>
  onChange: (field: string, value: any) => void
  errors: Record<string, string>
  warnings: Record<string, string>
  onTouch: (field: string) => void
  formMode: 'quick' | 'expert'
}

export function FinancialParametersSection({
  formData,
  onChange,
  errors,
  warnings,
  onTouch,
  formMode,
}: FinancialParametersSectionProps) {
  const filledCount = [
    formData.project_lifetime_years,
    formData.discount_rate,
    formData.debt_ratio,
    formData.interest_rate,
    formData.tax_rate,
    formData.depreciation_years,
  ].filter((v) => v !== undefined).length

  // Calculate equity ratio
  const equityRatio = formData.debt_ratio !== undefined ? 100 - formData.debt_ratio : undefined

  return (
    <SectionCard
      title="Financial Parameters"
      icon={TrendingUp}
      collapsible={true}
      defaultExpanded={false}
      requiredFieldsCount={6}
      filledFieldsCount={filledCount}
      description="Financial structure and economic assumptions"
    >
      <div className="space-y-6">
        <FieldGroup label="Project Timeline & Returns" columns={2}>
          <div className="space-y-2">
            <Label htmlFor="project_lifetime">
              Project Lifetime <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="project_lifetime"
                type="number"
                value={formData.project_lifetime_years || ''}
                onChange={(e) => onChange('project_lifetime_years', parseInt(e.target.value))}
                onBlur={() => onTouch('project_lifetime_years')}
                placeholder="25"
                min={1}
                max={100}
                className={`flex-1 ${errors.project_lifetime_years ? 'border-red-500' : ''}`}
              />
              <div className="flex items-center px-3 bg-elevated border border-border rounded-md text-sm text-muted">
                years
              </div>
            </div>
            <p className="text-xs text-muted">
              {formData.technology_type === 'solar' && 'Solar typical: 25-35 years'}
              {formData.technology_type === 'wind' && 'Wind typical: 20-25 years'}
              {formData.technology_type === 'nuclear' && 'Nuclear typical: 40-60 years'}
              {!formData.technology_type && 'Operational lifetime of the facility'}
            </p>
            {errors.project_lifetime_years && (
              <p className="text-xs text-red-500">{errors.project_lifetime_years}</p>
            )}
          </div>

          <PercentageInput
            label="Discount Rate (WACC)"
            value={formData.discount_rate}
            onChange={(val) => onChange('discount_rate', val)}
            placeholder="7.5"
            hint="Weighted Average Cost of Capital (typical renewables: 5-10%)"
            required
            error={errors.discount_rate}
            min={0}
            max={30}
            step={0.1}
          />
        </FieldGroup>

        <FieldGroup label="Financing Structure" columns={2}>
          <div className="space-y-2">
            <PercentageInput
              label="Debt Ratio"
              value={formData.debt_ratio}
              onChange={(val) => onChange('debt_ratio', val)}
              placeholder="60"
              hint="Typical project finance: 60-80% debt"
              required
              error={errors.debt_ratio}
              showSlider={false}
            />
            {equityRatio !== undefined && (
              <div className="p-2 bg-elevated rounded text-xs text-muted">
                Equity ratio: {equityRatio.toFixed(1)}%
              </div>
            )}
          </div>

          <PercentageInput
            label="Interest Rate on Debt"
            value={formData.interest_rate}
            onChange={(val) => onChange('interest_rate', val)}
            placeholder="6"
            hint="Cost of debt financing (typical: 4-8%)"
            required
            error={errors.interest_rate}
            min={0}
            max={30}
            step={0.1}
          />
        </FieldGroup>

        <FieldGroup label="Taxation & Depreciation" columns={2}>
          <PercentageInput
            label="Corporate Tax Rate"
            value={formData.tax_rate}
            onChange={(val) => onChange('tax_rate', val)}
            placeholder="21"
            hint="US federal rate: 21%; varies by jurisdiction"
            required
            error={errors.tax_rate}
            min={0}
            max={100}
          />

          <div className="space-y-2">
            <Label htmlFor="depreciation_years">
              Depreciation Period <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="depreciation_years"
                type="number"
                value={formData.depreciation_years || ''}
                onChange={(e) => onChange('depreciation_years', parseInt(e.target.value))}
                onBlur={() => onTouch('depreciation_years')}
                placeholder="10"
                min={1}
                max={50}
                className={`flex-1 ${errors.depreciation_years ? 'border-red-500' : ''}`}
              />
              <div className="flex items-center px-3 bg-elevated border border-border rounded-md text-sm text-muted">
                years
              </div>
            </div>
            <p className="text-xs text-muted">
              Typical equipment depreciation: 7-15 years
            </p>
            {errors.depreciation_years && (
              <p className="text-xs text-red-500">{errors.depreciation_years}</p>
            )}
          </div>
        </FieldGroup>

        {formMode === 'expert' && (
          <FieldGroup label="Depreciation Method (Expert Mode)" columns={1}>
            <div className="space-y-2">
              <Label htmlFor="depreciation_method">Depreciation Method</Label>
              <Select
                value={formData.depreciation_method || 'straight-line'}
                onChange={(val) => onChange('depreciation_method', val)}
                options={[
                  { value: 'straight-line', label: 'Straight-Line (Most Common)' },
                  { value: 'declining-balance', label: 'Declining Balance' },
                  { value: 'macrs', label: 'MACRS (US Tax Code)' },
                ]}
              />
              <p className="text-xs text-muted">
                Affects annual depreciation expense and taxable income
              </p>
            </div>
          </FieldGroup>
        )}

      </div>
    </SectionCard>
  )
}
