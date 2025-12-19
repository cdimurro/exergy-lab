---
name: clean-energy-research
description: Execute multi-source research across 14+ scientific databases for clean energy topics. Use when starting a discovery, researching a hypothesis, or gathering literature for any clean energy domain (solar, battery, hydrogen, carbon capture, grid, biomass).
---

# Clean Energy Research Skill

## Quick Start

Execute comprehensive research by querying multiple databases in parallel:

1. Expand query into 5 variations (technical, broad, specific, recent, applications)
2. Search all databases simultaneously
3. Deduplicate and rank by relevance
4. Extract key findings with quantitative data
5. Identify technological gaps and cross-domain insights

## Databases

See [databases.md](databases.md) for the full list of 14+ databases with query patterns.

## Query Expansion

For any research query, generate 5 variations:

1. **Technical terms**: Add domain-specific terminology
2. **Broader context**: Expand scope for background
3. **Specific focus**: Target key materials/methods
4. **Recent advances**: Filter to 2022-2024 publications
5. **Applications**: Focus on practical use cases

## Extraction Requirements

### Sources (Target: 30-45 papers + 10-15 patents)

- Distribute across ALL databases (not just arXiv)
- At least 50% from 2022-2024
- Include patents for commercial applications
- Include Materials Project data when relevant

### Key Findings (Target: 12-15 quantitative findings)

Every finding MUST include:
- Numerical value (e.g., 26.7)
- Unit (e.g., %, eV, nm, kW, mol/L)
- Category: performance, cost, efficiency, safety, environmental

Examples:
- "Perovskite solar cell efficiency: 25.7% under AM1.5G illumination"
- "Electrolysis current density: 1.5 A/cm² at 1.8V"
- "Battery cycle life: 2000 cycles at 80% capacity retention"

### Technological Gaps (Target: 5 gaps)

For each gap identify:
- Clear description of the limitation
- Impact level (high/medium/low)
- 2-3 potential solutions

### Cross-Domain Insights (Target: 4-5 insights)

SPECIFIC connections to other fields with:
- Source domains (e.g., machine learning, biology, semiconductor physics)
- Transferable technique/method
- How it applies to clean energy
- Expected improvement or problem solved

## Refinement Triggers

| Rubric ID | Issue | Action |
|-----------|-------|--------|
| R1 | Insufficient sources | Increase to 45 papers |
| R2 | Low diversity | Ensure all databases used |
| R3 | Not recent enough | Target 60% from 2023-2024 |
| R4 | Missing quantitative data | Every finding needs value+unit |
| R5 | Few gaps identified | Expand to 5+ distinct gaps |
| R6 | Weak cross-domain | Add specific, actionable insights |
| R7 | No materials data | Include Materials Project results |

## Domain-Specific Guidance

### Solar Energy
- Focus: Efficiency limits, stability, manufacturing cost
- Key metrics: PCE (%), Voc (V), Jsc (mA/cm²), FF (%)
- Databases: arXiv (cond-mat), Nature Energy, Joule

### Battery Storage
- Focus: Energy density, cycle life, charging rate, cost
- Key metrics: Wh/kg, Wh/L, C-rate, $/kWh
- Databases: Journal of Power Sources, Energy Storage Materials

### Hydrogen/Fuel Cells
- Focus: Electrolyzer efficiency, durability, catalyst loading
- Key metrics: A/cm², mV/decade, mg/cm², hours
- Databases: Electrochimica Acta, Journal of Electrochemical Society

### Carbon Capture
- Focus: Adsorption capacity, energy penalty, cost per ton
- Key metrics: mmol/g, kJ/mol, $/tCO2
- Databases: Carbon Capture Science & Technology, Applied Energy

### Grid Integration
- Focus: Intermittency, storage dispatch, grid stability
- Key metrics: MW, MWh, frequency deviation, $/kWh
- Databases: IEEE, Applied Energy, Renewable & Sustainable Energy Reviews
