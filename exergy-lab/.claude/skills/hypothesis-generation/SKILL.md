---
name: hypothesis-generation
description: Generate novel, testable hypotheses for clean energy research. Use when creating new research directions, proposing experiments, or synthesizing findings into actionable research questions.
---

# Hypothesis Generation Skill

## Quick Start

Generate hypotheses by following this structured approach:

1. Identify the technological gap from research
2. Propose a specific, measurable intervention
3. Define expected outcomes with metrics
4. Assess novelty against existing literature
5. Evaluate practical feasibility

## Hypothesis Quality Criteria

Every hypothesis MUST satisfy these requirements:

### 1. Specificity (Required)
- Names exact materials, methods, or parameters
- Avoids vague terms like "improve" or "optimize"

**Bad**: "Improve battery performance with new materials"
**Good**: "Li₆PS₅Cl solid electrolyte with 5% Al₂O₃ coating will achieve >1 mS/cm ionic conductivity at 25°C while suppressing lithium dendrite growth"

### 2. Novelty (Required)
- Not already demonstrated in literature
- Represents a new combination, approach, or application
- Check against recent publications (2022-2024)

**Novelty assessment questions**:
- Has this exact combination been tested?
- Is this a new application of known technique?
- Does it address an unexplored parameter space?

### 3. Testability (Required)
- Can be validated experimentally within 6 months
- Has clear pass/fail criteria
- Measurable with standard equipment

**Testability checklist**:
- [ ] Specific metrics defined
- [ ] Measurement methods identified
- [ ] Success threshold stated
- [ ] Timeline realistic

### 4. Falsifiability (Required)
- Must be possible to prove wrong
- Defines conditions that would disprove hypothesis
- Avoids unfalsifiable claims

**Good**: "If interface resistance exceeds 50 Ω·cm², the hypothesis is falsified"
**Bad**: "The material will have good properties"

### 5. Significance (Required)
- Addresses a real technological limitation
- Would advance the field if proven true
- Has potential for practical application

## Hypothesis Structure Template

```
HYPOTHESIS: [Specific intervention]

MECHANISM: [Why this should work - scientific basis]

PREDICTED OUTCOMES:
- Primary: [Main metric] will achieve [value] [unit]
- Secondary: [Additional benefits]

FALSIFICATION CRITERIA:
- If [metric] < [threshold], hypothesis is falsified
- If [condition] observed, mechanism is incorrect

NOVELTY CLAIM:
- Current state-of-art: [existing best result]
- This differs by: [what's new]

FEASIBILITY:
- Required equipment: [list]
- Timeline: [duration]
- Key challenges: [list]
```

## Domain-Specific Guidance

### Solar Energy Hypotheses
Focus areas:
- Efficiency improvement (PCE)
- Stability enhancement (degradation rate)
- Cost reduction ($/Wp)
- Scalability (deposition methods)

Key metrics: PCE (%), Voc (V), Jsc (mA/cm²), FF (%), T80 (hours)

### Battery Hypotheses
Focus areas:
- Energy density (Wh/kg, Wh/L)
- Power density (W/kg)
- Cycle life (# cycles)
- Safety (thermal runaway onset)

Key metrics: Capacity (mAh/g), CE (%), rate capability (C-rate), impedance (Ω)

### Hydrogen Production Hypotheses
Focus areas:
- Electrolyzer efficiency (%)
- Current density (A/cm²)
- Catalyst loading (mg/cm²)
- Durability (hours)

Key metrics: Overpotential (mV), Tafel slope (mV/dec), mass activity (A/mgPt)

### Carbon Capture Hypotheses
Focus areas:
- Adsorption capacity (mmol/g)
- Selectivity (CO2/N2)
- Regeneration energy (kJ/mol)
- Stability (cycles)

Key metrics: Working capacity, regeneration temperature, water tolerance

## Novelty Assessment Rubric

| Score | Description |
|-------|-------------|
| 9-10  | First demonstration of this approach in any domain |
| 7-8   | Novel combination of known techniques |
| 5-6   | Extension of existing work to new parameter space |
| 3-4   | Incremental improvement on published results |
| 1-2   | Already demonstrated in literature |

## Common Pitfalls to Avoid

1. **Too broad**: Covers multiple hypotheses in one
2. **Too incremental**: Doesn't represent meaningful advance
3. **Unmeasurable**: No clear success metrics
4. **Physically impossible**: Violates thermodynamic limits
5. **Already done**: Exists in recent literature
6. **No mechanism**: Proposes what without why

## Refinement Triggers

| Issue | Action |
|-------|--------|
| Vague metrics | Add specific values with units |
| Missing novelty claim | Compare to state-of-art explicitly |
| Unclear mechanism | Add scientific basis for prediction |
| Not falsifiable | Add failure conditions |
| Too ambitious | Narrow scope, add intermediate milestones |
