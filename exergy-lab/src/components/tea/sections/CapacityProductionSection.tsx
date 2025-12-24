'use client'

import * as React from 'react'
import { Gauge, Info } from 'lucide-react'
import { SectionCard } from '../form-components/SectionCard'
import { FieldGroup } from '../form-components/FieldGroup'
import { CurrencyInput } from '../form-components/CurrencyInput'
import { PercentageInput } from '../form-components/PercentageInput'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import type { TEAInput_v2, TechnologyType } from '@/types/tea'

// Unit options based on technology type
const getCapacityUnits = (techType: TechnologyType | undefined): string[] => {
  switch (techType) {
    case 'hydrogen':
      return ['MW', 'kg/hr', 'kg/day', 'tonnes/year']
    case 'biomass':
    case 'generic':
      return ['MW', 'tonnes/year', 'kg/hr']
    default:
      return ['MW', 'kW', 'GW']
  }
}

export interface CapacityProductionSectionProps {
  formData: Partial<TEAInput_v2>
  onChange: (field: string, value: any) => void
  errors: Record<string, string>
  warnings: Record<string, string>
  onTouch: (field: string) => void
  formMode: 'quick' | 'expert'
}

export function CapacityProductionSection({
  formData,
  onChange,
  errors,
  warnings,
  onTouch,
  formMode,
}: CapacityProductionSectionProps) {
  const [capacityUnit, setCapacityUnit] = React.useState('MW')

  const filledCount = [
    formData.capacity_mw,
    formData.capacity_factor,
  ].filter((v) => v !== undefined).length

  const requiredCount = formMode === 'quick' ? 2 : 3

  return (
    <SectionCard
      title="Capacity & Production"
      icon={Gauge}
      collapsible={true}
      defaultExpanded={true}
      requiredFieldsCount={requiredCount}
      filledFieldsCount={filledCount}
      description="Plant capacity and annual production parameters"
    >
      <div className="space-y-6">
        <FieldGroup columns={2}>
          {/* Plant Capacity */}
          <div className="space-y-2">
            <Label htmlFor="capacity">
              Plant Capacity <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Input
                id="capacity"
                type="number"
                value={formData.capacity_mw || ''}
                onChange={(e) => onChange('capacity_mw', parseFloat(e.target.value))}
                onBlur={() => onTouch('capacity_mw')}
                placeholder={formData.technology_type === 'hydrogen' ? '50,000' : '100'}
                min={0}
                step={0.1}
                className={`flex-1 ${errors.capacity_mw ? 'border-red-500' : ''}`}
              />
              <Select
                value={capacityUnit}
                onChange={setCapacityUnit}
                options={getCapacityUnits(formData.technology_type).map((unit) => ({
                  value: unit,
                  label: unit,
                }))}
                className="w-32"
              />
            </div>
            {!errors.capacity_mw && formData.technology_type === 'solar' && (
              <p className="text-xs text-muted">
                Typical utility-scale solar: 50-500 MW
              </p>
            )}
            {!errors.capacity_mw && formData.technology_type === 'hydrogen' && (
              <p className="text-xs text-muted">
                For electrolyzers, can also specify in kg/hr or tonnes/year H2
              </p>
            )}
            {errors.capacity_mw && (
              <p className="text-xs text-red-500">{errors.capacity_mw}</p>
            )}
          </div>

          {/* Capacity Factor */}
          <PercentageInput
            label="Capacity Factor"
            value={formData.capacity_factor}
            onChange={(val) => onChange('capacity_factor', val)}
            placeholder={formData.technology_type === 'solar' ? '24.5' : '35'}
            hint={
              formData.technology_type === 'solar'
                ? 'Typical solar: 15-30%'
                : formData.technology_type === 'wind'
                ? 'Typical wind: 25-40%'
                : formData.technology_type === 'nuclear'
                ? 'Typical nuclear: 85-95%'
                : 'Annual operating time as % of 8760 hours'
            }
            required
            error={errors.capacity_factor}
          />
        </FieldGroup>

        {/* Annual Production (Calculated) */}
        <div className="p-4 bg-elevated border border-border rounded-lg">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground mb-1">
                Annual Production (Calculated)
              </div>
              {formData.capacity_mw && formData.capacity_factor ? (
                <>
                  <div className="text-2xl font-bold text-primary mb-2">
                    {(
                      formData.capacity_mw *
                      (formData.capacity_factor / 100) *
                      8760
                    ).toLocaleString(undefined, { maximumFractionDigits: 0 })}{' '}
                    <span className="text-base font-normal text-muted">MWh/year</span>
                  </div>
                  <div className="text-xs text-muted font-mono">
                    = {formData.capacity_mw} MW × {formData.capacity_factor}% × 8,760 hr/yr
                  </div>
                </>
              ) : (
                <div className="text-sm text-muted">
                  Enter capacity and capacity factor to calculate annual production
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expert Mode Additional Fields */}
        {formMode === 'expert' && (
          <FieldGroup label="Additional Parameters (Expert Mode)" columns={2}>
            <div className="space-y-2">
              <Label htmlFor="operating_hours">Operating Hours per Year</Label>
              <Input
                id="operating_hours"
                type="number"
                value={
                  formData.capacity_factor
                    ? Math.round((formData.capacity_factor / 100) * 8760)
                    : ''
                }
                onChange={(e) => {
                  const hours = parseFloat(e.target.value)
                  const cf = (hours / 8760) * 100
                  onChange('capacity_factor', cf)
                }}
                placeholder="7,884"
                min={0}
                max={8760}
              />
              <p className="text-xs text-muted">Overrides capacity factor calculation</p>
            </div>

            {formData.technology_type === 'solar' && (
              <PercentageInput
                label="Annual Degradation Rate"
                value={formData.degradation_rate}
                onChange={(val) => onChange('degradation_rate', val)}
                placeholder="0.5"
                hint="Typical solar: 0.3-0.8%/year"
                min={0}
                max={5}
                step={0.1}
              />
            )}

            {formData.technology_type === 'storage' && (
              <>
                <PercentageInput
                  label="Depth of Discharge (DOD)"
                  value={formData.depth_of_discharge}
                  onChange={(val) => onChange('depth_of_discharge', val)}
                  placeholder="90"
                  hint="Typical Li-ion: 80-100%"
                />
                <div className="space-y-2">
                  <Label htmlFor="cycle_life">Cycle Life</Label>
                  <Input
                    id="cycle_life"
                    type="number"
                    value={formData.cycle_life || ''}
                    onChange={(e) => onChange('cycle_life', parseInt(e.target.value))}
                    placeholder="5,000"
                  />
                  <p className="text-xs text-muted">Typical Li-ion: 3,000-10,000 cycles</p>
                </div>
              </>
            )}
          </FieldGroup>
        )}

        {warnings.capacity_factor && (
          <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
            <p className="text-xs text-warning">{warnings.capacity_factor}</p>
          </div>
        )}
      </div>
    </SectionCard>
  )
}
