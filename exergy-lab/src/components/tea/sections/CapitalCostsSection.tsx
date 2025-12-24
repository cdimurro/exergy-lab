'use client'

import * as React from 'react'
import { DollarSign, Calculator } from 'lucide-react'
import { SectionCard } from '../form-components/SectionCard'
import { FieldGroup } from '../form-components/FieldGroup'
import { CurrencyInput } from '../form-components/CurrencyInput'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TEAInput_v2 } from '@/types/tea'

export interface CapitalCostsSectionProps {
  formData: Partial<TEAInput_v2>
  onChange: (field: string, value: any) => void
  errors: Record<string, string>
  warnings: Record<string, string>
  onTouch: (field: string) => void
  formMode: 'quick' | 'expert'
}

export function CapitalCostsSection({
  formData,
  onChange,
  errors,
  warnings,
  onTouch,
  formMode,
}: CapitalCostsSectionProps) {
  // Calculate total CAPEX
  const calculateTotalCAPEX = (): number => {
    const equipment = (formData.capex_per_kw || 0) * (formData.capacity_mw || 0) * 1000 // kW
    const installation = equipment * ((formData.installation_factor || 1) - 1)
    const land = formData.land_cost || 0
    const grid = formData.grid_connection_cost || 0

    return equipment + installation + land + grid
  }

  const totalCAPEX = calculateTotalCAPEX()

  const filledCount = [
    formData.capex_per_kw,
    formData.installation_factor,
  ].filter((v) => v !== undefined).length

  return (
    <SectionCard
      title="Capital Costs (CAPEX)"
      icon={DollarSign}
      collapsible={true}
      defaultExpanded={false}
      requiredFieldsCount={formMode === 'quick' ? 2 : 4}
      filledFieldsCount={filledCount}
      description="One-time capital expenditures for project development"
    >
      <div className="space-y-6">
        <FieldGroup label="Basic CAPEX Parameters" columns={2}>
          <CurrencyInput
            label="Equipment Cost per kW"
            value={formData.capex_per_kw}
            onChange={(val) => onChange('capex_per_kw', val)}
            unit="$/kW"
            placeholder="950"
            hint={
              formData.technology_type === 'solar'
                ? '2024 utility solar avg: $900-1,100/kW'
                : formData.technology_type === 'wind'
                ? '2024 onshore wind avg: $1,100-1,500/kW'
                : formData.technology_type === 'hydrogen'
                ? '2024 electrolyzer avg: $800-1,200/kW'
                : 'Equipment cost per unit capacity'
            }
            required
            error={errors.capex_per_kw}
          />

          <div className="space-y-2">
            <Label htmlFor="installation_factor">
              Installation Factor <span className="text-red-500">*</span>
            </Label>
            <Input
              id="installation_factor"
              type="number"
              value={formData.installation_factor || ''}
              onChange={(e) => onChange('installation_factor', parseFloat(e.target.value))}
              onBlur={() => onTouch('installation_factor')}
              placeholder="1.15"
              min={1.0}
              max={3.0}
              step={0.05}
              className={errors.installation_factor ? 'border-red-500' : ''}
            />
            <p className="text-xs text-muted">
              Multiplier for installation costs (typical: 1.1-1.3)
            </p>
            {errors.installation_factor && (
              <p className="text-xs text-red-500">{errors.installation_factor}</p>
            )}
          </div>

          <CurrencyInput
            label="Land Cost"
            value={formData.land_cost}
            onChange={(val) => onChange('land_cost', val)}
            placeholder="500000"
            hint="One-time land purchase or total lease payment"
            error={errors.land_cost}
          />

          <CurrencyInput
            label="Grid Connection Cost"
            value={formData.grid_connection_cost}
            onChange={(val) => onChange('grid_connection_cost', val)}
            placeholder="2000000"
            hint="Substation, transmission line, interconnection fees"
            error={errors.grid_connection_cost}
          />
        </FieldGroup>

        {/* Total CAPEX Summary */}
        <div className="p-4 bg-primary/10 border-2 border-primary/30 rounded-lg">
          <div className="flex items-start gap-3">
            <Calculator className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground mb-2">
                Total Capital Expenditure (CAPEX)
              </div>
              <div className="text-3xl font-bold text-primary mb-3">
                ${totalCAPEX.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              {formData.capacity_mw && formData.capex_per_kw && (
                <div className="space-y-1 text-xs text-muted font-mono">
                  <div>Equipment: ${((formData.capex_per_kw * formData.capacity_mw * 1000)).toLocaleString()}</div>
                  <div>Installation: ${((formData.capex_per_kw * formData.capacity_mw * 1000 * ((formData.installation_factor || 1) - 1))).toLocaleString()}</div>
                  {formData.land_cost !== undefined && formData.land_cost > 0 && (
                    <div>Land: ${formData.land_cost.toLocaleString()}</div>
                  )}
                  {formData.grid_connection_cost !== undefined && formData.grid_connection_cost > 0 && (
                    <div>Grid Connection: ${formData.grid_connection_cost.toLocaleString()}</div>
                  )}
                </div>
              )}
              {(!formData.capacity_mw || !formData.capex_per_kw) && (
                <p className="text-xs text-muted">
                  Enter equipment cost and capacity to calculate total CAPEX
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Expert Mode: Detailed Equipment Breakdown */}
        {formMode === 'expert' && (
          <FieldGroup label="Detailed Equipment Costs (Expert Mode)" columns={2}>
            <CurrencyInput
              label="Process Equipment"
              value={formData.process_equipment_cost}
              onChange={(val) => onChange('process_equipment_cost', val)}
              placeholder="50000000"
              hint="Reactors, separators, heat exchangers, etc."
              error={errors.process_equipment_cost}
            />

            <CurrencyInput
              label="Electrical Equipment"
              value={formData.electrical_equipment_cost}
              onChange={(val) => onChange('electrical_equipment_cost', val)}
              placeholder="15000000"
              hint="Transformers, switchgear, generators, etc."
              error={errors.electrical_equipment_cost}
            />

            <CurrencyInput
              label="Instrumentation & Controls"
              value={formData.instrumentation_cost}
              onChange={(val) => onChange('instrumentation_cost', val)}
              placeholder="5000000"
              hint="SCADA, sensors, control systems"
              error={errors.instrumentation_cost}
            />

            <CurrencyInput
              label="Civil & Structural"
              value={formData.civil_structural_cost}
              onChange={(val) => onChange('civil_structural_cost', val)}
              placeholder="8000000"
              hint="Foundations, buildings, site preparation"
              error={errors.civil_structural_cost}
            />

            <CurrencyInput
              label="Piping & Ducting"
              value={formData.piping_cost}
              onChange={(val) => onChange('piping_cost', val)}
              placeholder="12000000"
              hint="Process piping, support structures"
              error={errors.piping_cost}
            />

            <CurrencyInput
              label="Contingency Reserve"
              value={formData.contingency_cost}
              onChange={(val) => onChange('contingency_cost', val)}
              placeholder="10000000"
              hint="Typically 10-20% of base CAPEX"
              error={errors.contingency_cost}
            />
          </FieldGroup>
        )}

        {warnings.capex_per_kw && (
          <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
            <p className="text-xs text-warning">{warnings.capex_per_kw}</p>
          </div>
        )}
      </div>
    </SectionCard>
  )
}
