---
name: tea-analysis
description: Perform techno-economic analysis including NPV, IRR, LCOE, and payback period calculations. Use when evaluating commercial viability or comparing technology costs.
---

# Techno-Economic Analysis (TEA) Skill

## Quick Start

Perform TEA by following this workflow:

1. Define system boundaries and functional unit
2. Estimate CAPEX (capital expenditure)
3. Estimate OPEX (operating expenditure)
4. Calculate key financial metrics
5. Perform sensitivity analysis
6. Compare to market benchmarks

## TEA Structure Template

```
TECHNOLOGY: [Name]
FUNCTIONAL UNIT: [Output basis, e.g., $/kWh, $/kg, $/tCO2]
SCALE: [Production capacity]
LOCATION: [Geography affects costs]
YEAR: [Cost year for inflation adjustment]

CAPITAL EXPENDITURE (CAPEX):
- Major equipment: $XXX
- Installation: $XXX
- Engineering & design: $XXX
- Contingency: $XXX
- Total CAPEX: $XXX

OPERATING EXPENDITURE (OPEX):
- Raw materials: $XXX/year
- Utilities: $XXX/year
- Labor: $XXX/year
- Maintenance: $XXX/year
- Total OPEX: $XXX/year

FINANCIAL ASSUMPTIONS:
- Project lifetime: X years
- Discount rate: X%
- Capacity factor: X%
- Inflation rate: X%
- Tax rate: X%
- Depreciation method: [Linear/MACRS]

KEY METRICS:
- LCOE/LCOH/LCOC: $XX/unit
- NPV: $XXX
- IRR: XX%
- Payback period: X years
- CAPEX per unit: $XX/kW

SENSITIVITY ANALYSIS:
- Variable 1: [Range and impact]
- Variable 2: [Range and impact]

COMPARISON TO BENCHMARKS:
- Current market price: $XX/unit
- Competitive threshold: $XX/unit
- Cost reduction needed: XX%
```

## Key Financial Metrics

### Levelized Cost of Energy (LCOE)
```
LCOE = (Sum of costs over lifetime) / (Sum of energy produced over lifetime)

LCOE = (CAPEX × CRF + OPEX_annual) / (Capacity × CF × 8760)

Where:
- CRF = Capital Recovery Factor = r(1+r)^n / ((1+r)^n - 1)
- r = discount rate
- n = project lifetime (years)
- CF = capacity factor
- 8760 = hours per year
```

### Levelized Cost of Hydrogen (LCOH)
```
LCOH = (CAPEX × CRF + OPEX_annual) / (Annual H2 production)

Components:
- Capital recovery
- Electricity cost (dominant for electrolysis)
- Water cost
- Maintenance
- Stack replacement
```

### Net Present Value (NPV)
```
NPV = Σ (Cash flow_t / (1 + r)^t) - Initial investment

Where:
- Cash flow_t = Revenue - OPEX - Taxes in year t
- r = discount rate
- t = year
```

### Internal Rate of Return (IRR)
```
IRR = discount rate where NPV = 0

Solve: 0 = Σ (Cash flow_t / (1 + IRR)^t) - Initial investment
```

### Payback Period
```
Simple payback = Initial investment / Annual net cash flow

Discounted payback = Years until cumulative discounted cash flow > 0
```

## Cost Estimation Methods

### Order of Magnitude (+/- 50%)
- Based on similar projects
- Scaling from known costs
- Early-stage screening

### Factored Estimate (+/- 30%)
- Major equipment costs known
- Installation factors applied
- Preliminary feasibility

### Detailed Estimate (+/- 10%)
- Full engineering completed
- Vendor quotes obtained
- Final investment decision

## Scaling Laws

### Six-Tenths Rule
```
Cost_new = Cost_ref × (Capacity_new / Capacity_ref)^0.6
```

### Typical Scaling Exponents
| Equipment Type | Exponent |
|---------------|----------|
| Vessels/tanks | 0.5-0.7 |
| Heat exchangers | 0.6-0.7 |
| Pumps | 0.4-0.6 |
| Compressors | 0.7-0.8 |
| Reactors | 0.5-0.7 |
| Complete plants | 0.6-0.8 |

## CAPEX Estimation Factors

### Lang Factors (Total plant cost / Equipment cost)
| Plant Type | Lang Factor |
|------------|-------------|
| Solids processing | 3.1 |
| Fluids processing | 4.7 |
| Mixed processing | 3.6 |

### Installation Factors
| Component | Factor |
|-----------|--------|
| Equipment | 1.0 (base) |
| Piping | 0.3-0.6 |
| Instrumentation | 0.1-0.3 |
| Electrical | 0.1-0.2 |
| Buildings | 0.1-0.3 |
| Site prep | 0.05-0.15 |
| Engineering | 0.25-0.4 |
| Contingency | 0.15-0.25 |

## Domain-Specific Cost Models

### Solar PV
```
CAPEX (2024): $0.8-1.2/Wp (utility scale)
OPEX: $10-15/kW/year
Capacity factor: 15-25% (location dependent)
Lifetime: 25-30 years
Degradation: 0.5%/year

LCOE = CAPEX × CRF / (8760 × CF × (1 - degradation/2))
```

### Battery Storage
```
CAPEX (2024): $200-400/kWh (lithium-ion)
OPEX: 1-2% of CAPEX/year
Cycle life: 4000-6000 cycles
Round-trip efficiency: 85-90%
Calendar life: 10-15 years

LCOS = CAPEX / (cycles × DOD × RTE) + charging cost
```

### Hydrogen Electrolysis
```
PEM CAPEX (2024): $800-1200/kW
Alkaline CAPEX: $400-800/kW
Stack replacement: Every 60,000-80,000 hours
Electricity cost: 70-80% of LCOH

LCOH = (CAPEX × CRF + electricity × consumption + O&M) / H2_production
```

### Carbon Capture
```
Point source CAPEX: $500-1000/tCO2/year capacity
DAC CAPEX: $2000-5000/tCO2/year capacity
Energy requirement: 2.5-4 GJ/tCO2 (point source)
                   5-10 GJ/tCO2 (DAC)

LCOC = (CAPEX × CRF + energy × price + O&M) / CO2_captured
```

## Financial Assumptions (Defaults)

| Parameter | Default | Range |
|-----------|---------|-------|
| Discount rate | 8% | 5-12% |
| Project lifetime | 20 years | 15-30 |
| Capacity factor | 90% | 50-95% |
| Inflation | 2.5% | 1-4% |
| Tax rate | 21% | 0-35% |
| Debt fraction | 60% | 0-80% |
| Debt interest | 5% | 3-8% |
| Construction time | 2 years | 1-5 |

## Sensitivity Analysis Guidelines

### Key Variables to Test
1. CAPEX (+/- 20%)
2. OPEX (+/- 20%)
3. Discount rate (5-12%)
4. Capacity factor (+/- 10%)
5. Input prices (electricity, feedstock)
6. Product price
7. Project lifetime

### Tornado Diagram Variables
Rank variables by impact on output metric (NPV, LCOE, etc.)

### Monte Carlo Inputs
- CAPEX: Normal distribution, σ = 15%
- OPEX: Normal distribution, σ = 10%
- Capacity factor: Beta distribution
- Prices: Log-normal distribution

## Benchmarks & Targets

### Electricity Generation
| Technology | LCOE (2024) | Target (2030) |
|------------|-------------|---------------|
| Solar PV (utility) | $30-50/MWh | $20/MWh |
| Wind (onshore) | $25-50/MWh | $20/MWh |
| Wind (offshore) | $60-100/MWh | $50/MWh |
| Nuclear | $100-150/MWh | $80/MWh |
| Natural gas CC | $40-60/MWh | N/A |

### Storage
| Technology | LCOS (2024) | Target (2030) |
|------------|-------------|---------------|
| Li-ion (4h) | $150-250/MWh | $100/MWh |
| Flow battery | $200-350/MWh | $150/MWh |
| Pumped hydro | $50-100/MWh | $50/MWh |

### Hydrogen
| Pathway | LCOH (2024) | Target (2030) |
|---------|-------------|---------------|
| Grey H2 | $1-2/kg | N/A |
| Blue H2 | $2-3/kg | $1.5/kg |
| Green H2 | $4-8/kg | $2/kg |

### Carbon Capture
| Technology | Cost (2024) | Target (2030) |
|------------|-------------|---------------|
| Point source | $50-100/tCO2 | $30/tCO2 |
| DAC | $300-600/tCO2 | $100/tCO2 |

## Validation Checklist

- [ ] Costs in consistent year dollars
- [ ] System boundaries clearly defined
- [ ] CAPEX includes all installation costs
- [ ] OPEX includes all recurring costs
- [ ] Discount rate appropriate for risk
- [ ] Capacity factor realistic for technology
- [ ] Lifetime matches technology maturity
- [ ] Sensitivity analysis covers key uncertainties
- [ ] Results compared to published benchmarks
