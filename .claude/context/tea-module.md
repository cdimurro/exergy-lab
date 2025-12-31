# TEA Module Context
<!-- Load when working on Techno-Economic Analysis or PDF reports -->
<!-- Token budget: ~2500 tokens -->

## Overview

The Techno-Economic Analysis (TEA) module generates comprehensive financial analysis for clean energy technologies. Includes exergy analysis for second-law thermodynamic assessment and produces publication-ready PDF reports.

## Architecture

```
User Input (technology + parameters)
    |
    v
+-------------------+
| Form Validation   |
| (Zod schemas)     |
+-------------------+
    |
    v
+-------------------+     +-------------------+
| AI Analysis       | --> | Exergy Calculator |
| (Gemini)          |     | (2nd law thermo)  |
+-------------------+     +-------------------+
    |                            |
    v                            v
+-------------------+     +-------------------+
| Cost Estimation   |     | Benchmark Lookup  |
| (material DB)     |     | (NREL ATB, etc)   |
+-------------------+     +-------------------+
    |                            |
    +------------+---------------+
                 |
                 v
        +-------------------+
        | PDF Generator     |
        | (jsPDF, 18+ sects)|
        +-------------------+
```

## Key Files (Critical Path)

| File | Purpose | Lines |
|------|---------|-------|
| `src/app/(dashboard)/tea-generator/page.tsx` | TEA page | ~400 |
| `src/app/api/tea/upload/route.ts` | File upload + analysis | ~300 |
| `src/lib/pdf-generator.ts` | PDF report generation | ~800 |
| `src/components/tea/TEAInputForm.tsx` | Input form | ~300 |
| `src/components/tea/ValidationReportCard.tsx` | Results display | ~400 |
| `src/lib/exergy/exergy-calculator.ts` | Exergy calculations | ~250 |

## Types to Know

```typescript
// TEA input parameters
interface TEAInput {
  technologyType: TechnologyType
  capacityMW: number
  lifetimeYears: number
  discountRate: number
  location: string
  customAssumptions?: Record<string, number>
}

// Technology types
type TechnologyType =
  | 'solar-pv'
  | 'wind-onshore'
  | 'wind-offshore'
  | 'battery-storage'
  | 'hydrogen-electrolysis'
  | 'geothermal'
  | 'custom'

// TEA result
interface TEAResult {
  lcoe: number              // $/MWh
  capex: number             // $/kW
  opex: number              // $/kW-year
  npv: number               // $
  irr: number               // %
  paybackYears: number
  exergyEfficiency: number  // %
  appliedExergyLeverage: number
  sensitivityAnalysis: SensitivityResult[]
}

// Exergy metrics
interface ExergyAnalysis {
  exergyInput: number       // kW
  exergyOutput: number      // kW
  exergyDestruction: number // kW
  secondLawEfficiency: number // %
  appliedExergyLeverage: number
  fossilFuelComparison: string
}
```

## PDF Report Sections (18+)

1. Cover Page
2. Table of Contents
3. Executive Summary
4. Technology Overview
5. Capital Cost Breakdown
6. Operating Cost Analysis
7. Revenue Projections
8. Cash Flow Analysis
9. LCOE Calculation
10. Exergy Analysis
11. Sensitivity Analysis
12. Risk Assessment
13. Market Comparison
14. Environmental Impact
15. Regulatory Considerations
16. Recommendations
17. Appendix: Assumptions
18. Appendix: Data Sources

## Patterns in Use

1. **Form Validation**: Zod schemas with technology-specific rules
2. **Progressive Enhancement**: Basic analysis -> exergy -> benchmarks
3. **PDF Streaming**: Generate PDF client-side with jsPDF
4. **Benchmark Lookup**: NREL ATB data for reference values

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/tea/upload` | POST | Upload specs + generate analysis |
| `/api/tea/benchmark` | GET | Get NREL ATB benchmarks |
| `/api/tea/export` | POST | Generate PDF report |

## State Management

- Form state: `src/hooks/useTEAFormState.ts`
- Persistence: `src/hooks/useFormPersistence.ts`
- Defaults: `src/hooks/useTechnologyDefaults.ts`

## Exergy Calculations

Key formulas:
- **Second-law efficiency**: `eta_II = Exergy_out / Exergy_in`
- **Exergy destruction**: `E_d = E_in - E_out - E_work`
- **Applied Exergy Leverage (AEL)**: Quality-weighted energy comparison

Reference values:
- Fossil fuel exergy efficiency: 30-35%
- Solar PV exergy efficiency: 15-25%
- Wind exergy efficiency: 35-45%

## Quality Requirements

1. All cost assumptions must be documented
2. LCOE must be comparable to NREL ATB
3. Exergy analysis required for all reports
4. Sensitivity on discount rate mandatory

## Related Context

- [simulation-engine.md](simulation-engine.md) - Simulation inputs
- `.claude/architecture.md` - System patterns

## Current Development

- v0.0.3.1: PDF enhancement with 18+ sections
- v0.0.3.2: Device-level exergy integration
- Focus: Comprehensive report generation
