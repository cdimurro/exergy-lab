# TEA Enhancement System v0.0.3.1

## Overview

Comprehensive techno-economic analysis system for clean energy technologies with multi-agent validation, industry-standard calculations, and publication-quality report generation.

**Based on 4 Industry-Standard TEA Reports**:
1. Perovskite PV Manufacturing (Ethiopia) - Academic standard
2. NETL DOE Basis for TEA (Carbon Utilization) - Government standard
3. HEAVENN Hydrogen Valley - Consortium/Industry standard
4. RSB SAF Pathways - Standards organization

## Key Innovation: Multi-Agent Quality Validation

Every TEA analysis passes through a 4-stage validation pipeline:

```
Input Parameters → Calculate Metrics → Research Agent (validate against literature)
                                              ↓
                                     Discrepancies? → YES → Refinement Agent → Recalculate
                                              ↓                                      ↑
                                             NO                                      |
                                              ↓                                      |
                                     Self-Critique Agent (check consistency) ────────┘
                                              ↓
                                     Validation Agent (final verification)
                                              ↓
                                     Confidence ≥ 95%? → Generate Report
```

**Quality Guarantee**: Prevents cascading errors, ensures 95%+ confidence, provides full audit trail.

## Architecture

```
TEA System v0.0.3.1
├── Quality Assurance
│   ├── quality-orchestrator.ts          Multi-agent validation pipeline
│   ├── quality-rubric.ts                10-point scoring (min 7/10 to pass)
│   ├── calculation-validator.ts         Dimensional + physical + benchmark validation
│   ├── assumption-validator.ts          Source docs + literature consistency
│   └── result-reconciliation.ts         Balance convergence + metric consistency
│
├── Core Calculations
│   └── calculations.ts                  21 financial metrics with industry formulas
│
├── Advanced Calculations
│   ├── monte-carlo.ts                   10k iteration stochastic analysis
│   ├── sensitivity.ts                   Tornado plots + parametric studies
│   ├── financial-engine.ts              Multi-year projections + pro-forma
│   └── cost-estimator.ts                NETL 5-level costs (BEC→TASC)
│
├── Process Engineering
│   ├── material-energy-balance.ts       Mass/energy balances (<1% convergence)
│   ├── pfd-generator.ts                 SVG process flow diagrams
│   ├── equipment-specs.ts               Sizing + cost databases
│   └── models/
│       ├── solar-pv-model.ts            Solar PV (Si, perovskite, tandem)
│       ├── hydrogen-model.ts            H2 production (electrolysis, SMR)
│       └── hefa-saf-model.ts            Sustainable aviation fuel
│
├── Report Generation
│   ├── pdf-report-generator.ts          18-section industry-standard PDFs
│   ├── visualizations.ts                8 chart types, 3 color schemes
│   ├── table-generator.ts               9 professional table generators
│   └── report-templates.ts              5 audience-specific templates
│
├── Data & Standards
│   ├── standards-db.ts                  NETL, ICAO, IEA, EPA standards
│   ├── benchmarks.ts                    Industry benchmark comparisons
│   └── defaults-database.ts             Tech + regional intelligent defaults
│
└── Integration
    ├── agent-adapters.ts                Interfaces to existing agents
    └── discovery-integration.ts         Discovery Engine connection
```

## Quick Start

### Basic TEA Calculation

```typescript
import { calculateTEA, getTechnologyDefaults } from '@/lib/tea'

// Get intelligent defaults for solar PV
const input = getTechnologyDefaults('solar', 'US-National')

// Run calculations
const results = calculateTEA({
  ...input,
  project_name: 'My Solar Project',
  capacity_mw: 10,
})

console.log(`LCOE: $${results.lcoe.toFixed(3)}/kWh`)
console.log(`NPV: $${(results.npv / 1e6).toFixed(2)}M`)
console.log(`IRR: ${results.irr.toFixed(1)}%`)
```

### With Multi-Agent Validation

```typescript
import { validateTEAQuality, evaluateTEAQuality } from '@/lib/tea'

// Run calculations
const results = calculateTEA(input)

// Validate through multi-agent pipeline
const validation = await validateTEAQuality(input, results)

// Get quality score
const quality = evaluateTEAQuality(input, results, validation.validationReport)

if (validation.shouldGenerateReport && quality.passed) {
  console.log(`✓ Quality approved: ${quality.overallScore}/10 (Grade ${quality.grade})`)
  // Generate report...
} else {
  console.log('✗ Quality issues:', validation.recommendations)
}
```

### Generate Publication-Quality Report

```typescript
import {
  generateComprehensiveTEAReport,
  getReportTemplate,
  runSensitivityAnalysis,
  runMonteCarloSimulation,
} from '@/lib/tea'

// Run advanced analyses
const sensitivity = await runSensitivityAnalysis(input)
const monteCarlo = await runMonteCarloSimulation(input, uncertainParams)

// Use academic template
const config = getReportTemplate('academic')

// Prepare report data
const reportData: ComprehensiveTEAReportData = {
  config,
  input,
  results,
  executiveSummary: '...',
  // ... other sections
}

// Generate PDF
const report = generateComprehensiveTEAReport(reportData)
report.downloadPDF('TEA-Report.pdf')
```

## Features

### Calculations (21 Metrics)

**Primary**: LCOE, NPV, IRR, Payback (simple & discounted)
**Extended**: MSP, LCOP, ROI, PI, BCR
**Energy**: EROI, EPBT
**Carbon**: Mitigation cost, avoided emissions

All with full provenance tracking (formula + inputs + assumptions + references).

### Quality Assurance

- **10-Point Rubric**: Calculation accuracy (3), assumption quality (2), data completeness (2), internal consistency (1), benchmarking (1), methodology (1)
- **Multi-Agent Validation**: Research → Refinement → Self-Critique → Final Validation
- **Confidence Scoring**: 0-100% for every metric
- **50+ Validation Checks**: Dimensional, physical, benchmark, cross-validation

### Uncertainty Analysis

- **Monte Carlo**: 10,000 iterations, 5 distributions, risk metrics (VaR, ES)
- **Sensitivity**: Tornado plots, parametric curves, 2D heatmaps
- **Risk Assessment**: Probability of success, downside risk, robustness score

### Report Generation

- **18 Sections**: Cover → TOC → Glossary → Methodology → ... → References → Appendices
- **5 Templates**: Academic, Executive, Government, Regulatory, Technical
- **9 Table Types**: Stream tables, equipment lists, cost breakdowns, etc.
- **8 Chart Types**: Tornado, waterfall, Monte Carlo distributions, etc.

### Technology Models

- **Solar PV**: Silicon (22%), Perovskite (20%), Tandem (24%)
- **Hydrogen**: PEM, Alkaline, SOEC electrolysis + SMR
- **SAF/HEFA**: Feedstock → hydroprocessing → SAF/diesel/naphtha/LPG

### Standards Integration

- **NETL QGESS**: Economic assumptions, cost structures
- **ICAO CORSIA**: SAF pathways, carbon intensity
- **IEA**: Cost benchmarks for all technologies
- **EPA**: Emissions standards

## API Cost

**Multi-Agent Validation**:
- Development: ~$0.40 per pathway setup
- Production: ~$0.04 per report
- Annual (optimized): ~$400-500

**ROI**: 99.98% savings vs manual expert review ($3,000/report)

## Backward Compatibility

✅ 100% compatible with existing system
✅ All new types extend existing interfaces
✅ Feature flag support (`ENABLE_TEA_V2`)
✅ No breaking changes to Discovery Engine
✅ Safe rollback to v0.0.3

## Testing

```bash
# Run calculation tests
npm test src/lib/tea/__tests__

# Validate against reference cases
npm run validate:tea

# Generate test reports
npm run tea:generate-examples
```

## File Structure

```
src/lib/tea/
├── index.ts                         # Central exports
├── quality-orchestrator.ts          # Multi-agent validation
├── quality-rubric.ts                # 10-point scoring
├── calculation-validator.ts         # Validation checks
├── assumption-validator.ts          # Assumption quality
├── result-reconciliation.ts         # Balance convergence
├── agent-adapters.ts                # Agent interfaces
├── calculations.ts                  # Core metrics
├── monte-carlo.ts                   # Stochastic analysis
├── sensitivity.ts                   # Tornado plots
├── financial-engine.ts              # Cash flows + pro-forma
├── cost-estimator.ts                # Equipment scaling
├── material-energy-balance.ts       # Process balances
├── pfd-generator.ts                 # Process diagrams
├── equipment-specs.ts               # Equipment database
├── pdf-report-generator.ts          # 18-section PDFs
├── visualizations.ts                # Charts + plots
├── table-generator.ts               # Professional tables
├── report-templates.ts              # 5 report types
├── standards-db.ts                  # Industry standards
├── benchmarks.ts                    # Benchmark comparisons
├── defaults-database.ts             # Intelligent defaults
├── discovery-integration.ts         # Discovery Engine link
└── models/
    ├── solar-pv-model.ts
    ├── hydrogen-model.ts
    └── hefa-saf-model.ts
```

27 files, ~10,500 lines of production code

## References

1. **NETL QGESS** - Quality Guidelines for Energy System Studies
2. **ICAO CORSIA** - Methodology for Calculating Actual Life Cycle Emissions
3. **IEA** - World Energy Outlook, Technology Reports
4. **NREL** - Cost and Performance Data
5. **RSB** - TEA Tool for SAF Pathways
6. **Perovskite PV TEA** - Meheretu et al. 2025

## Support

For questions or issues with the TEA enhancement system:
- Check this README
- Review example usage in `/examples`
- See CLAUDE.md for project context

---

**Version**: 0.0.3.1
**Status**: Feature branch (testing before v0.0.4 release)
**Backward Compatible**: Yes ✅
**Quality Validated**: Multi-agent pipeline
**Industry Compliant**: NETL, ICAO, IEA, EPA
