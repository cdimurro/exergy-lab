---
name: experiment-design
description: Design detailed experimental protocols with safety requirements, equipment lists, and reproducibility metrics. Use when planning lab experiments, simulations, or validation studies.
---

# Experiment Design Skill

## Quick Start

Design experiments following this workflow:

1. Define hypothesis to test
2. Select appropriate methodology
3. Identify required equipment and materials
4. Establish safety protocols
5. Define measurements and controls
6. Plan data analysis approach

## Protocol Structure Template

```
EXPERIMENT TITLE: [Descriptive name]

OBJECTIVE: [What will be tested]

HYPOTHESIS UNDER TEST: [Reference specific hypothesis]

METHODOLOGY:
- Approach: [Synthesis/Characterization/Simulation/etc.]
- Type: [Controlled experiment/Parametric study/Validation]

MATERIALS:
- Reagents: [List with purity grades]
- Substrates: [Specifications]
- Reference materials: [For calibration]

EQUIPMENT:
- Primary: [Main instrumentation]
- Supporting: [Auxiliary equipment]
- Safety: [PPE, ventilation, etc.]

PROCEDURE:
1. [Step-by-step instructions]
2. [Include temperatures, times, quantities]
3. [Note critical parameters]

CONTROLS:
- Positive control: [Known success case]
- Negative control: [Known failure case]
- Variables held constant: [List]

MEASUREMENTS:
- Primary metric: [What, how, precision]
- Secondary metrics: [Supporting measurements]
- Frequency: [When to measure]

SUCCESS CRITERIA:
- Pass: [Specific threshold]
- Partial: [Acceptable range]
- Fail: [Below threshold]

SAFETY REQUIREMENTS:
- Hazards: [Identified risks]
- Mitigations: [Safety measures]
- Emergency procedures: [Response plans]

TIMELINE: [Duration estimate]

REPRODUCIBILITY:
- Sample size: [n = ?]
- Replicates: [How many]
- Statistical analysis: [Method]
```

## Methodology Selection Guide

### Synthesis Experiments
**Use when**: Creating new materials or structures

Required elements:
- Precursor specifications (purity, source)
- Reaction conditions (T, P, atmosphere, time)
- Purification steps
- Yield calculation method
- Characterization plan

### Characterization Experiments
**Use when**: Measuring material properties

Required elements:
- Sample preparation method
- Instrument settings
- Calibration standards
- Measurement sequence
- Data processing steps

### Device Fabrication
**Use when**: Building functional devices

Required elements:
- Layer-by-layer deposition sequence
- Interface engineering steps
- Contact formation
- Encapsulation method
- Testing protocol

### Electrochemical Testing
**Use when**: Evaluating electrochemical performance

Required elements:
- Electrode preparation
- Electrolyte specification
- Cell assembly (coin cell, pouch, etc.)
- Cycling protocol (voltage window, C-rate)
- Formation cycles

### Computational Simulation
**Use when**: Modeling or predicting behavior

Required elements:
- Software and version
- Input parameters
- Computational resources
- Convergence criteria
- Validation approach

## Equipment Reference by Technique

### Materials Synthesis
| Technique | Equipment | Key Parameters |
|-----------|-----------|----------------|
| Sol-gel | Hot plate, autoclave | T, time, pH |
| Sputtering | Sputter coater | Power, pressure, time |
| CVD | CVD furnace | T, flow rates, substrate |
| Ball milling | Planetary mill | Speed, time, ball ratio |
| Hydrothermal | Autoclave, oven | T, P, fill ratio |

### Characterization
| Property | Technique | Equipment |
|----------|-----------|-----------|
| Crystal structure | XRD | X-ray diffractometer |
| Morphology | SEM/TEM | Electron microscope |
| Composition | EDS, XPS | Integrated with SEM/dedicated |
| Optical | UV-Vis, PL | Spectrophotometer |
| Surface area | BET | Gas sorption analyzer |
| Thermal | TGA, DSC | Thermal analyzer |

### Electrochemical
| Measurement | Technique | Parameters |
|-------------|-----------|------------|
| Capacity | Galvanostatic | Current, voltage window |
| Kinetics | CV | Scan rate, potential range |
| Resistance | EIS | Frequency range, amplitude |
| Stability | Cycling | Number of cycles, conditions |

## Safety Protocol Requirements

### Hazard Categories

**Chemical Hazards**
- Flammable materials: Use inert atmosphere, eliminate ignition sources
- Toxic materials: Use fume hood, appropriate PPE
- Corrosive materials: Chemical-resistant gloves, eye protection
- Reactive materials: Small quantities, controlled addition

**Physical Hazards**
- High temperature: Heat-resistant gloves, cool-down protocols
- High pressure: Pressure-rated vessels, safety shields
- Electrical: Lockout/tagout, insulation
- Radiation: Shielding, monitoring, exposure limits

**Equipment-Specific**
- Lasers: Safety glasses, interlocks
- X-rays: Shielding, dosimetry
- High vacuum: Implosion shields
- Cryogenics: Cryogenic gloves, ventilation

### PPE Requirements by Risk Level

| Risk Level | PPE Required |
|------------|--------------|
| Low | Safety glasses, lab coat |
| Medium | + Chemical-resistant gloves, closed shoes |
| High | + Face shield, double gloves, apron |
| Critical | + Supplied air respirator, specialized suit |

## Reproducibility Requirements

### Minimum Standards
- **Sample size**: n ≥ 3 for all quantitative claims
- **Controls**: Both positive and negative where applicable
- **Documentation**: All parameters logged in real-time
- **Materials**: Lot numbers, supplier, purity recorded

### Statistical Reporting
- Mean ± standard deviation (or standard error)
- Confidence intervals for key metrics
- Statistical test used (t-test, ANOVA, etc.)
- p-values for significance claims

### Documentation Checklist
- [ ] All materials sourced and documented
- [ ] Equipment calibrated and logged
- [ ] Environmental conditions recorded
- [ ] Deviations from protocol noted
- [ ] Raw data preserved
- [ ] Analysis scripts/methods documented

## Common Pitfalls

1. **Missing controls**: Always include positive/negative controls
2. **Insufficient replicates**: n=1 is not publishable
3. **Uncontrolled variables**: Identify and hold constant
4. **Vague procedures**: Quantify all parameters
5. **Safety gaps**: Every hazard needs mitigation
6. **No calibration**: Reference standards required
