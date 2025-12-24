import type { TechnologyType, TEAInput_v2 } from '@/types/tea'
import { getAvailableTechnologies, getDeviceProfile } from './exergy'

export interface ValidationRule {
  required?: boolean
  min?: number
  max?: number
  pattern?: RegExp
  custom?: (value: any, formData: Partial<TEAInput_v2>) => string | null
  warning?: (value: any, formData: Partial<TEAInput_v2>) => string | null
}

export const VALIDATION_RULES: Record<string, ValidationRule> = {
  // Basic Information
  project_name: {
    required: true,
    custom: (val) => {
      if (typeof val !== 'string') return 'Project name must be text'
      if (val.trim().length < 3) return 'Project name must be at least 3 characters'
      if (val.length > 200) return 'Project name must be less than 200 characters'
      return null
    },
  },

  technology_type: {
    required: true,
    custom: (val) => {
      const validTypes = [
        'solar',
        'wind',
        'offshore_wind',
        'hydrogen',
        'storage',
        'nuclear',
        'geothermal',
        'hydro',
        'biomass',
        'generic',
      ]
      if (!validTypes.includes(val)) return 'Invalid technology type'
      return null
    },
  },

  // Capacity & Production
  capacity_mw: {
    required: true,
    min: 0.001,
    max: 100000,
    custom: (val) => {
      if (val <= 0) return 'Capacity must be positive'
      return null
    },
    warning: (val, formData) => {
      if (formData.technology_type === 'solar' && val > 5000) {
        return 'Warning: Solar projects >5 GW are extremely large'
      }
      if (formData.technology_type === 'hydrogen' && val > 1000) {
        return 'Warning: Hydrogen electrolyzers >1 GW are uncommon'
      }
      return null
    },
  },

  capacity_factor: {
    required: true,
    min: 0,
    max: 100,
    warning: (val, formData) => {
      const tech = formData.technology_type
      if (tech === 'solar' && val > 30) {
        return 'Warning: Solar capacity factor >30% is unusual (typical: 15-30%)'
      }
      if (tech === 'nuclear' && val < 80) {
        return 'Warning: Nuclear plants typically have >80% capacity factor'
      }
      if (tech === 'wind' && val > 45) {
        return 'Warning: Wind capacity factor >45% is high (typical: 25-40%)'
      }
      if (tech === 'storage' && val > 50) {
        return 'Note: Storage capacity factor represents discharge cycles'
      }
      return null
    },
  },

  // Capital Costs
  capex_per_kw: {
    required: true,
    min: 1,
    max: 50000,
    warning: (val, formData) => {
      const tech = formData.technology_type
      if (tech === 'solar' && (val < 500 || val > 2000)) {
        return 'Warning: 2024 utility solar CAPEX typically $800-1,200/kW'
      }
      if (tech === 'wind' && (val < 800 || val > 1800)) {
        return 'Warning: Onshore wind CAPEX typically $1,100-1,500/kW'
      }
      if (tech === 'nuclear' && val < 5000) {
        return 'Warning: Nuclear CAPEX typically >$5,000/kW'
      }
      return null
    },
  },

  installation_factor: {
    min: 1.0,
    max: 3.0,
    warning: (val) => {
      if (val > 2.0) return 'Warning: Installation >2x equipment cost is high'
      return null
    },
  },

  // Operating Costs
  opex_per_kw_year: {
    required: true,
    min: 0,
    max: 1000,
    warning: (val, formData) => {
      const capex = formData.capex_per_kw || 0
      const opexRatio = capex > 0 ? (val / capex) * 100 : 0
      if (opexRatio > 5) {
        return 'Warning: Annual OPEX >5% of CAPEX is high'
      }
      return null
    },
  },

  variable_opex_per_mwh: {
    min: 0,
    max: 200,
  },

  // Financial Parameters
  project_lifetime_years: {
    required: true,
    min: 1,
    max: 100,
    warning: (val, formData) => {
      const tech = formData.technology_type
      if (tech === 'solar' && (val < 25 || val > 35)) {
        return 'Note: Solar projects typically have 25-35 year lifetime'
      }
      if (tech === 'storage' && val > 20) {
        return 'Warning: Battery storage >20 years may require replacement'
      }
      if (tech === 'nuclear' && val < 40) {
        return 'Note: Nuclear plants often operate 40-60 years'
      }
      return null
    },
  },

  discount_rate: {
    required: true,
    min: 0,
    max: 50,
    warning: (val) => {
      if (val < 3) return 'Warning: Discount rate <3% is very low'
      if (val > 15) return 'Warning: Discount rate >15% is very high'
      return null
    },
  },

  debt_ratio: {
    required: true,
    min: 0,
    max: 100,
    custom: (val) => {
      if (val < 0 || val > 100) return 'Debt ratio must be between 0-100%'
      return null
    },
    warning: (val) => {
      if (val > 80) return 'Warning: >80% debt financing is high leverage'
      return null
    },
  },

  interest_rate: {
    required: true,
    min: 0,
    max: 30,
    warning: (val) => {
      if (val > 12) return 'Warning: Interest rate >12% is high'
      return null
    },
  },

  tax_rate: {
    required: true,
    min: 0,
    max: 100,
    warning: (val) => {
      if (val > 40) return 'Warning: Corporate tax >40% is unusual'
      return null
    },
  },

  depreciation_years: {
    min: 1,
    max: 50,
    custom: (val, formData) => {
      if (formData.project_lifetime_years && val > formData.project_lifetime_years) {
        return 'Depreciation period cannot exceed project lifetime'
      }
      return null
    },
  },

  // Revenue
  electricity_price_per_mwh: {
    required: true,
    min: 0,
    max: 1000,
    warning: (val) => {
      if (val < 20) return 'Warning: Electricity price <$20/MWh is very low'
      if (val > 200) return 'Warning: Electricity price >$200/MWh is very high'
      return null
    },
  },

  price_escalation_rate: {
    min: -10,
    max: 20,
    warning: (val) => {
      if (val < 0) return 'Warning: Negative escalation assumes declining prices'
      if (val > 5) return 'Warning: >5% annual escalation is high'
      return null
    },
  },
}

// ============================================================================
// Exergy-Specific Validation
// ============================================================================

/**
 * Validate exergy-related inputs and provide technology-specific guidance
 */
export function validateExergyInputs(formData: Partial<TEAInput_v2>): {
  hasExergyProfile: boolean
  exergyWarnings: string[]
  exergyInfo: string[]
} {
  const warnings: string[] = []
  const info: string[] = []

  const techType = formData.technology_type
  if (!techType) {
    return { hasExergyProfile: false, exergyWarnings: [], exergyInfo: [] }
  }

  // Map TEA technology types to exergy profile types
  const technologyMapping: Record<string, string> = {
    solar: 'solar-pv',
    wind: 'wind-onshore',
    offshore_wind: 'wind-offshore',
    hydrogen: 'electrolyzer',
    storage: 'battery-storage',
    nuclear: 'nuclear',
    geothermal: 'geothermal',
    hydro: 'hydro',
    biomass: 'biomass',
    generic: 'ccgt',
  }

  const exergyTechType = technologyMapping[techType] || techType
  const profile = getDeviceProfile(exergyTechType)

  if (!profile) {
    warnings.push(
      `No exergy profile available for ${techType}. Exergy analysis will not be included in the report.`
    )
    return { hasExergyProfile: false, exergyWarnings: warnings, exergyInfo: info }
  }

  // Provide technology-specific exergy information
  const effPercent = (profile.secondLawEfficiency * 100).toFixed(1)
  info.push(`${profile.displayName}: ${effPercent}% second-law efficiency (${profile.confidenceLevel} confidence)`)

  // Compare to fossil equivalent
  const fossilEffPercent = (profile.fossilEquivalent.secondLawEfficiency * 100).toFixed(1)
  const multiple = (profile.secondLawEfficiency / profile.fossilEquivalent.secondLawEfficiency).toFixed(2)

  if (profile.secondLawEfficiency > profile.fossilEquivalent.secondLawEfficiency) {
    info.push(
      `${multiple}x more exergy-efficient than ${profile.fossilEquivalent.technology} (${fossilEffPercent}%)`
    )
  } else if (profile.secondLawEfficiency < profile.fossilEquivalent.secondLawEfficiency * 0.8) {
    warnings.push(
      `Lower exergy efficiency than ${profile.fossilEquivalent.technology} - consider noting non-efficiency benefits`
    )
  }

  // Technology-specific warnings
  if (techType === 'geothermal' && formData.capacity_factor && formData.capacity_factor < 80) {
    info.push('Geothermal has high capacity factor but lower first-law efficiency due to Carnot limitations')
  }

  if (techType === 'hydrogen') {
    info.push('Electrolyzer efficiency is electricity-to-hydrogen; round-trip storage losses are additional')
  }

  if (techType === 'storage') {
    info.push('Battery round-trip efficiency: 88-92%. Minimal exergy losses to heat.')
  }

  // Data confidence warnings
  if (profile.confidenceLevel === 'low') {
    warnings.push(`Exergy data for ${profile.displayName} has low confidence - verify with additional sources`)
  }

  return {
    hasExergyProfile: true,
    exergyWarnings: warnings,
    exergyInfo: info,
  }
}

/**
 * Validate efficiency values are physically possible
 */
export function validateEfficiencyBounds(
  efficiency: number,
  technologyType: string
): { valid: boolean; message?: string } {
  // Heat pumps can have COP > 1 (but not unlimited)
  if (technologyType === 'heat-pump' || technologyType === 'heat_pump') {
    if (efficiency > 10) {
      return { valid: false, message: 'Heat pump COP >10 is not physically realistic' }
    }
    if (efficiency < 1) {
      return { valid: false, message: 'Heat pump COP should be >1 (otherwise use resistive heating)' }
    }
    return { valid: true }
  }

  // All other technologies: efficiency must be 0-1 (or 0-100%)
  if (efficiency > 1) {
    return {
      valid: false,
      message: 'Efficiency cannot exceed 100% for this technology (violates second law of thermodynamics)',
    }
  }

  if (efficiency < 0) {
    return { valid: false, message: 'Efficiency cannot be negative' }
  }

  // Warn about unrealistic high efficiencies
  if (efficiency > 0.95 && technologyType !== 'hydro') {
    return {
      valid: true,
      message: 'Warning: Efficiency >95% is extremely high; only hydropower typically achieves this',
    }
  }

  return { valid: true }
}

export function validateField(
  fieldName: string,
  value: any,
  formData: Partial<TEAInput_v2>
): { isValid: boolean; error?: string; warning?: string } {
  const rule = VALIDATION_RULES[fieldName]

  if (!rule) {
    return { isValid: true }
  }

  // Required check
  if (rule.required && (value === undefined || value === null || value === '')) {
    return { isValid: false, error: 'This field is required' }
  }

  // Skip other validations if field is optional and empty
  if (!rule.required && (value === undefined || value === null || value === '')) {
    return { isValid: true }
  }

  // Min/Max validation
  if (typeof value === 'number') {
    if (rule.min !== undefined && value < rule.min) {
      return { isValid: false, error: `Value must be at least ${rule.min}` }
    }
    if (rule.max !== undefined && value > rule.max) {
      return { isValid: false, error: `Value must be at most ${rule.max}` }
    }
  }

  // Pattern validation
  if (rule.pattern && typeof value === 'string') {
    if (!rule.pattern.test(value)) {
      return { isValid: false, error: 'Invalid format' }
    }
  }

  // Custom validation
  if (rule.custom) {
    const customError = rule.custom(value, formData)
    if (customError) {
      return { isValid: false, error: customError }
    }
  }

  // Warning check (doesn't invalidate, just warns)
  let warning: string | undefined
  if (rule.warning) {
    warning = rule.warning(value, formData) || undefined
  }

  return { isValid: true, warning }
}

export function validateForm(formData: Partial<TEAInput_v2>): {
  isValid: boolean
  errors: Record<string, string>
  warnings: Record<string, string>
} {
  const errors: Record<string, string> = {}
  const warnings: Record<string, string> = {}

  Object.keys(VALIDATION_RULES).forEach((fieldName) => {
    const value = formData[fieldName as keyof TEAInput_v2]
    const result = validateField(fieldName, value, formData)

    if (!result.isValid && result.error) {
      errors[fieldName] = result.error
    }

    if (result.warning) {
      warnings[fieldName] = result.warning
    }
  })

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  }
}
