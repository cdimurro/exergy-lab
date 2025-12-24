'use client'

import * as React from 'react'
import { TrendingUp, DollarSign } from 'lucide-react'
import { SectionCard } from '../form-components/SectionCard'
import { FieldGroup } from '../form-components/FieldGroup'
import { CurrencyInput } from '../form-components/CurrencyInput'
import { PercentageInput } from '../form-components/PercentageInput'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TEAInput_v2 } from '@/types/tea'

export interface RevenueAssumptionsSectionProps {
  formData: Partial<TEAInput_v2>
  onChange: (field: string, value: any) => void
  errors: Record<string, string>
  warnings: Record<string, string>
  onTouch: (field: string) => void
  formMode: 'quick' | 'expert'
}

export function RevenueAssumptionsSection({
  formData,
  onChange,
  errors,
  warnings,
  onTouch,
  formMode,
}: RevenueAssumptionsSectionProps) {
  // Get unit based on technology
  const getPriceUnit = (): string => {
    switch (formData.technology_type) {
      case 'hydrogen':
        return '$/kg'
      case 'biomass':
        return '$/tonne'
      case 'storage':
        return '$/MWh'
      default:
        return '$/MWh'
    }
  }

  const filledCount = [
    formData.electricity_price_per_mwh,
    formData.price_escalation_rate,
  ].filter((v) => v !== undefined).length

  return (
    <SectionCard
      title="Revenue Assumptions"
      icon={DollarSign}
      collapsible={true}
      defaultExpanded={false}
      requiredFieldsCount={2}
      filledFieldsCount={filledCount}
      description="Product pricing and revenue projections"
    >
      <div className="space-y-6">
        <FieldGroup label="Product Pricing" columns={2}>
          <CurrencyInput
            label="Product/Electricity Price"
            value={formData.electricity_price_per_mwh}
            onChange={(val) => onChange('electricity_price_per_mwh', val)}
            unit={getPriceUnit()}
            placeholder={
              formData.technology_type === 'hydrogen'
                ? '4.50'
                : formData.technology_type === 'solar'
                ? '80'
                : '65'
            }
            hint={
              formData.technology_type === 'hydrogen'
                ? '2024 green H2: $3-6/kg'
                : formData.technology_type === 'solar'
                ? '2024 PPA prices: $40-120/MWh (varies by region)'
                : 'Expected revenue per unit of production'
            }
            required
            error={errors.electricity_price_per_mwh}
          />

          <PercentageInput
            label="Annual Price Escalation"
            value={formData.price_escalation_rate}
            onChange={(val) => onChange('price_escalation_rate', val)}
            placeholder="2"
            hint="Expected annual increase in product price (typical: 0-3%)"
            required
            error={errors.price_escalation_rate}
            min={-10}
            max={20}
            step={0.1}
          />
        </FieldGroup>

        {formMode === 'expert' && (
          <FieldGroup label="Carbon Credits (Optional)" columns={2}>
            <CurrencyInput
              label="Carbon Credit Price"
              value={formData.carbon_credit_per_ton}
              onChange={(val) => onChange('carbon_credit_per_ton', val)}
              unit="$/tCO2e"
              placeholder="50"
              hint="Value of avoided CO2 emissions (varies by market)"
              error={errors.carbon_credit_per_ton}
            />

            <div className="space-y-2">
              <Label htmlFor="carbon_intensity">Carbon Intensity Avoided</Label>
              <div className="flex gap-2">
                <Input
                  id="carbon_intensity"
                  type="number"
                  value={formData.carbon_intensity_avoided || ''}
                  onChange={(e) => onChange('carbon_intensity_avoided', parseFloat(e.target.value))}
                  placeholder="0.5"
                  min={0}
                  step={0.01}
                  className="flex-1"
                />
                <div className="flex items-center px-3 bg-elevated border border-border rounded-md text-sm text-muted whitespace-nowrap">
                  tCO2e/MWh
                </div>
              </div>
              <p className="text-xs text-muted">
                Emissions avoided vs. grid average or baseline
              </p>
            </div>
          </FieldGroup>
        )}

        {/* Annual Revenue Projection */}
        {formData.electricity_price_per_mwh && formData.annual_production_mwh && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <div className="text-sm font-medium text-foreground mb-2">
              Projected Annual Revenue (Year 1)
            </div>
            <div className="text-2xl font-bold text-emerald-500">
              $
              {(
                formData.electricity_price_per_mwh * formData.annual_production_mwh
              ).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              <span className="text-base font-normal text-muted">/year</span>
            </div>
            <div className="text-xs text-muted font-mono mt-2">
              = ${formData.electricity_price_per_mwh}/MWh × {formData.annual_production_mwh.toLocaleString()} MWh/yr
            </div>
            {formData.price_escalation_rate && formData.price_escalation_rate > 0 && (
              <p className="text-xs text-muted mt-2">
                Growing at {formData.price_escalation_rate}%/year over project lifetime
              </p>
            )}
          </div>
        )}

        {warnings.electricity_price_per_mwh && (
          <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
            <p className="text-xs text-warning">{warnings.electricity_price_per_mwh}</p>
          </div>
        )}
      </div>
    </SectionCard>
  )
}
