'use client'

import * as React from 'react'
import { Wrench, Calculator } from 'lucide-react'
import { SectionCard } from '../form-components/SectionCard'
import { FieldGroup } from '../form-components/FieldGroup'
import { CurrencyInput } from '../form-components/CurrencyInput'
import { PercentageInput } from '../form-components/PercentageInput'
import type { TEAInput_v2 } from '@/types/tea'

export interface OperatingCostsSectionProps {
  formData: Partial<TEAInput_v2>
  onChange: (field: string, value: any) => void
  errors: Record<string, string>
  warnings: Record<string, string>
  onTouch: (field: string) => void
  formMode: 'quick' | 'expert'
}

export function OperatingCostsSection({
  formData,
  onChange,
  errors,
  warnings,
  onTouch,
  formMode,
}: OperatingCostsSectionProps) {
  // Calculate total annual OPEX
  const calculateAnnualOPEX = (): number => {
    const capacityBased = (formData.opex_per_kw_year || 0) * (formData.capacity_mw || 0) * 1000
    const fixed = formData.fixed_opex_annual || 0
    const variable =
      (formData.variable_opex_per_mwh || 0) * (formData.annual_production_mwh || 0)
    const insurance =
      (formData.insurance_rate || 0) / 100 *
      ((formData.capex_per_kw || 0) * (formData.capacity_mw || 0) * 1000)

    return capacityBased + fixed + variable + insurance
  }

  const totalAnnualOPEX = calculateAnnualOPEX()

  const filledCount = [
    formData.opex_per_kw_year,
    formData.variable_opex_per_mwh,
    formData.insurance_rate,
  ].filter((v) => v !== undefined).length

  return (
    <SectionCard
      title="Operating Costs (OPEX)"
      icon={Wrench}
      collapsible={true}
      defaultExpanded={false}
      requiredFieldsCount={formMode === 'quick' ? 3 : 4}
      filledFieldsCount={filledCount}
      description="Annual operating and maintenance expenses"
    >
      <div className="space-y-6">
        <FieldGroup label="Basic OPEX Parameters" columns={2}>
          <CurrencyInput
            label="Fixed OPEX per kW-year"
            value={formData.opex_per_kw_year}
            onChange={(val) => onChange('opex_per_kw_year', val)}
            unit="$/kW-yr"
            placeholder="15"
            hint={
              formData.technology_type === 'solar'
                ? 'Typical solar: $10-20/kW-year'
                : formData.technology_type === 'wind'
                ? 'Typical wind: $40-50/kW-year'
                : 'Annual fixed O&M per installed capacity'
            }
            required
            error={errors.opex_per_kw_year}
          />

          <CurrencyInput
            label="Variable OPEX per MWh"
            value={formData.variable_opex_per_mwh}
            onChange={(val) => onChange('variable_opex_per_mwh', val)}
            unit="$/MWh"
            placeholder="5"
            hint="Varies with production (fuel, consumables, etc.)"
            required
            error={errors.variable_opex_per_mwh}
          />

          {formMode === 'quick' && (
            <CurrencyInput
              label="Fixed Annual OPEX"
              value={formData.fixed_opex_annual}
              onChange={(val) => onChange('fixed_opex_annual', val)}
              placeholder="1000000"
              hint="Additional fixed costs (labor, property tax, etc.)"
              error={errors.fixed_opex_annual}
            />
          )}

          <PercentageInput
            label="Insurance Rate"
            value={formData.insurance_rate}
            onChange={(val) => onChange('insurance_rate', val)}
            placeholder="0.5"
            hint="Annual insurance as % of CAPEX (typical: 0.3-0.7%)"
            required
            error={errors.insurance_rate}
            min={0}
            max={5}
            step={0.1}
          />
        </FieldGroup>

        {/* Total Annual OPEX Summary */}
        <div className="p-4 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <Calculator className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground mb-2">
                Total Annual Operating Costs (OPEX)
              </div>
              <div className="text-3xl font-bold text-emerald-500 mb-3">
                ${totalAnnualOPEX.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                <span className="text-base font-normal text-muted">/year</span>
              </div>
              {formData.capacity_mw && formData.opex_per_kw_year && (
                <div className="space-y-1 text-xs text-muted font-mono">
                  <div>
                    Capacity-based: $
                    {((formData.opex_per_kw_year * formData.capacity_mw * 1000)).toLocaleString()}/yr
                  </div>
                  {formData.fixed_opex_annual !== undefined && formData.fixed_opex_annual > 0 && (
                    <div>Fixed annual: ${formData.fixed_opex_annual.toLocaleString()}/yr</div>
                  )}
                  {formData.variable_opex_per_mwh !== undefined && formData.annual_production_mwh && (
                    <div>
                      Variable: $
                      {(formData.variable_opex_per_mwh * formData.annual_production_mwh).toLocaleString()}/yr
                    </div>
                  )}
                  {formData.insurance_rate !== undefined && formData.capex_per_kw !== undefined && formData.capacity_mw !== undefined && (
                    <div>
                      Insurance ({formData.insurance_rate}%): $
                      {((formData.insurance_rate / 100) * (formData.capex_per_kw * formData.capacity_mw * 1000)).toLocaleString()}/yr
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expert Mode: Detailed O&M Breakdown */}
        {formMode === 'expert' && (
          <>
            <FieldGroup label="Fixed O&M Breakdown (Expert Mode)" columns={2}>
              <CurrencyInput
                label="Operating Labor (Annual)"
                value={formData.operating_labor_annual}
                onChange={(val) => onChange('operating_labor_annual', val)}
                unit="$/year"
                placeholder="500000"
                hint="Operators, supervisors, technicians"
              />

              <CurrencyInput
                label="Maintenance Labor (Annual)"
                value={formData.maintenance_labor_annual}
                onChange={(val) => onChange('maintenance_labor_annual', val)}
                unit="$/year"
                placeholder="300000"
                hint="Scheduled and preventive maintenance"
              />

              <CurrencyInput
                label="Administrative Labor (Annual)"
                value={formData.admin_labor_annual}
                onChange={(val) => onChange('admin_labor_annual', val)}
                unit="$/year"
                placeholder="200000"
                hint="Management, admin support"
              />

              <CurrencyInput
                label="Property Tax (Annual)"
                value={formData.property_tax_annual}
                onChange={(val) => onChange('property_tax_annual', val)}
                unit="$/year"
                placeholder="150000"
                hint="Local property tax on facility"
              />

              <CurrencyInput
                label="Maintenance Materials (Annual)"
                value={formData.maintenance_materials_annual}
                onChange={(val) => onChange('maintenance_materials_annual', val)}
                unit="$/year"
                placeholder="400000"
                hint="Spare parts, materials, supplies"
              />
            </FieldGroup>

            <FieldGroup label="Variable O&M Breakdown (Expert Mode)" columns={2}>
              <CurrencyInput
                label="Electricity Cost"
                value={formData.electricity_cost_per_kwh}
                onChange={(val) => onChange('electricity_cost_per_kwh', val)}
                unit="$/kWh"
                placeholder="0.08"
                hint="Grid electricity price"
              />

              <CurrencyInput
                label="Water Cost"
                value={formData.water_cost_per_m3}
                onChange={(val) => onChange('water_cost_per_m3', val)}
                unit="$/m³"
                placeholder="2.5"
                hint="Process and cooling water"
              />

              <CurrencyInput
                label="Natural Gas Cost"
                value={formData.natural_gas_cost}
                onChange={(val) => onChange('natural_gas_cost', val)}
                unit="$/MMBtu"
                placeholder="4.5"
                hint="Fuel or process heat"
              />

              <CurrencyInput
                label="Consumables (Annual)"
                value={formData.consumables_annual}
                onChange={(val) => onChange('consumables_annual', val)}
                unit="$/year"
                placeholder="250000"
                hint="Chemicals, catalysts, spare parts"
              />

              <CurrencyInput
                label="Waste Disposal (Annual)"
                value={formData.waste_disposal_annual}
                onChange={(val) => onChange('waste_disposal_annual', val)}
                unit="$/year"
                placeholder="50000"
                hint="Hazardous and non-hazardous waste"
              />
            </FieldGroup>
          </>
        )}

        {warnings.opex_per_kw_year && (
          <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
            <p className="text-xs text-warning">{warnings.opex_per_kw_year}</p>
          </div>
        )}
      </div>
    </SectionCard>
  )
}
