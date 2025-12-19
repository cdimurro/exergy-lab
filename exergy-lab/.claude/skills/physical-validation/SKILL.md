---
name: physical-validation
description: Validate research outputs against 800+ physical benchmarks and thermodynamic limits. Use when checking efficiency claims, comparing to state-of-art, or validating simulation results.
---

# Physical Validation Skill

## Quick Start

Validate claims by checking against:

1. Thermodynamic limits (fundamental physics)
2. State-of-the-art benchmarks (current best)
3. Material property databases (measured values)
4. Historical trends (realistic improvements)

## Validation Workflow

```
1. Extract quantitative claims from hypothesis/results
2. Identify applicable physical limits
3. Compare to state-of-art benchmarks
4. Flag violations or unrealistic claims
5. Provide context and recommendations
```

## Thermodynamic Limits (Hard Limits)

These cannot be exceeded - any claim violating these is physically impossible.

### Energy Conversion
| Limit | Value | Source |
|-------|-------|--------|
| Carnot efficiency | η = 1 - Tc/Th | Second law |
| Shockley-Queisser (single junction) | 33.7% | Detailed balance |
| Gibbs free energy of water splitting | 1.23 V | ΔG°/nF |
| Fuel cell theoretical voltage | E° = ΔG°/nF | Nernst equation |

### Material Properties
| Limit | Value | Source |
|-------|-------|--------|
| Band gap minimum for visible light | ~1.1 eV | Solar spectrum |
| Maximum theoretical Li capacity (graphite) | 372 mAh/g | LiC₆ stoichiometry |
| Maximum theoretical Li capacity (Li metal) | 3860 mAh/g | Li atomic mass |
| CO₂ adsorption theoretical max | ~15 mmol/g | Mass-based limit |

## State-of-Art Benchmarks

Load from: `./benchmarks/{domain}.json`

### Solar Cells (2024)
| Technology | Record PCE | Lab | Year |
|------------|-----------|-----|------|
| Crystalline Si | 26.7% | LONGi | 2022 |
| Perovskite | 26.1% | EPFL | 2024 |
| Tandem (perov/Si) | 33.9% | KAUST | 2024 |
| CIGS | 23.6% | Solar Frontier | 2022 |
| CdTe | 22.1% | First Solar | 2022 |
| Organic | 19.2% | SJTU | 2023 |
| Quantum Dot | 18.1% | UNIST | 2022 |

### Batteries (2024)
| Technology | Energy Density | Cycles | Year |
|------------|---------------|--------|------|
| LFP | 180 Wh/kg | 6000+ | 2024 |
| NMC811 | 270 Wh/kg | 1000 | 2024 |
| Solid-state | 400 Wh/kg | 500 | 2024 |
| Li-metal anode | 450 Wh/kg | 300 | 2024 |
| Na-ion | 160 Wh/kg | 3000 | 2024 |

### Hydrogen Production (2024)
| Technology | Efficiency | Current Density | Durability |
|------------|-----------|-----------------|------------|
| PEM electrolysis | 65-80% | 1-3 A/cm² | 60,000 h |
| Alkaline electrolysis | 60-70% | 0.2-0.5 A/cm² | 90,000 h |
| SOEC | 80-90% | 0.5-1.5 A/cm² | 20,000 h |
| AEM electrolysis | 65-75% | 1-2 A/cm² | 10,000 h |

### Carbon Capture (2024)
| Technology | Capacity | Energy | Cost |
|------------|----------|--------|------|
| MEA absorption | 1.5 mol/L | 3.5 GJ/tCO₂ | $50-70/t |
| Solid sorbents | 3-5 mmol/g | 2.5 GJ/tCO₂ | $80-120/t |
| DAC (liquid) | N/A | 8-10 GJ/tCO₂ | $250-600/t |
| DAC (solid) | 1-2 mmol/g | 5-7 GJ/tCO₂ | $300-500/t |

## Validation Rules

### Rule 1: Cannot Exceed Physical Limits
- Any claim exceeding thermodynamic limits is **automatically invalid**
- Flag immediately, no further validation needed

### Rule 2: 10x Rule for Improvements
- Claims of >10x improvement over state-of-art need extraordinary evidence
- Flag for additional verification

### Rule 3: Multiple Property Improvements
- Improving one property usually trades off another
- Claims of simultaneous major improvements in multiple properties need scrutiny

### Rule 4: Consistency Check
- All reported metrics must be internally consistent
- Example: Jsc × Voc × FF must equal reported power

### Rule 5: Measurement Conditions
- Metrics must specify measurement conditions
- Solar: AM1.5G, 100 mW/cm², 25°C
- Battery: C-rate, temperature, voltage window
- Electrolyzer: Temperature, pressure, electrolyte

## Validation Output Format

```
VALIDATION REPORT

Claim: [Original claim with value]

Physical Limit Check:
- Applicable limit: [Limit name and value]
- Status: ✅ VALID / ❌ VIOLATES PHYSICS / ⚠️ NEAR LIMIT

State-of-Art Comparison:
- Current record: [Value, holder, year]
- Claimed improvement: [X% / Xx above record]
- Status: ✅ REALISTIC / ⚠️ AGGRESSIVE / ❌ UNREALISTIC

Consistency Check:
- [List of internal consistency validations]
- Status: ✅ CONSISTENT / ❌ INCONSISTENT

Overall Assessment:
- Confidence: HIGH / MEDIUM / LOW
- Recommendation: [Proceed / Revise / Reject]
- Notes: [Additional context]
```

## Common Validation Errors

### Solar Claims
1. PCE > Shockley-Queisser without tandem/concentration
2. Voc exceeding band gap / q
3. Jsc exceeding integrated solar spectrum limit
4. Fill factor > 90% (theoretical limit ~87-89%)

### Battery Claims
1. Capacity exceeding theoretical limit for chemistry
2. Energy density exceeding material limits
3. Claiming both high energy AND high power density
4. Cycle life claims without specifying conditions

### Hydrogen Claims
1. Efficiency > Carnot limit for thermal processes
2. Current density without durability context
3. Catalyst activity without stability data
4. Ignoring balance of plant losses

### Carbon Capture Claims
1. Adsorption capacity exceeding mass limits
2. Regeneration energy below theoretical minimum
3. Cost claims without full system accounting
4. Ignoring parasitic energy loads

## Domain-Specific Benchmark Files

Reference detailed benchmarks in:
- `./benchmarks/solar.json`
- `./benchmarks/battery.json`
- `./benchmarks/hydrogen.json`
- `./benchmarks/carbon-capture.json`
- `./benchmarks/thermoelectric.json`
- `./benchmarks/grid-storage.json`
