# Experiments Context Module
<!-- Load when working on experiment design, protocols, or DOE -->
<!-- Token budget: ~2000 tokens -->

## Overview

The Experiments module enables AI-assisted protocol design for clean energy research. Supports template-based design, Design of Experiments (DOE) optimization, cost estimation, and safety analysis.

## Architecture

```
User Input (domain + objectives)
    |
    v
+-------------------+
| Template Selection|
| (10+ templates)   |
+-------------------+
    |
    v
+-------------------+
| AI Protocol Gen   |
| (Gemini)          |
+-------------------+
    |
    +-------+-------+
    |       |       |
    v       v       v
+------+ +------+ +------+
| DOE  | | Cost | |Safety|
| Matrix| | Est. | |Analys|
+------+ +------+ +------+
    |       |       |
    +-------+-------+
            |
            v
+-------------------+
| Export            |
| (.exergy-exp.json)|
+-------------------+
```

## Key Files (Critical Path)

| File | Purpose | Lines |
|------|---------|-------|
| `src/app/(dashboard)/experiments/page.tsx` | Experiments page | ~50 |
| `src/components/experiments/ExperimentLab.tsx` | Main component | ~400 |
| `src/types/exergy-experiment.ts` | File format | ~150 |
| `src/lib/validation/exergy-experiment.ts` | Zod schema | ~100 |
| `src/lib/experiments/doe-generator.ts` | DOE matrix | ~200 |
| `src/lib/experiments/cost-calculator.ts` | Cost estimation | ~150 |

## Types to Know

```typescript
// Experiment file format
interface ExergyExperimentFile {
  version: '1.0.0'
  metadata: {
    id: string
    title: string
    domain: Domain
    createdAt: string
  }
  protocol: {
    materials: Material[]
    equipment: string[]
    steps: ExperimentStep[]
    safetyWarnings: SafetyWarning[]
    estimatedDuration: string
    estimatedCost?: number
  }
  failureAnalysis: {
    potentialFailures: FailureMode[]
    riskScore: number
  }
  simulation: {
    suggestedType: SimulationType
    suggestedTier: SimulationTier
    parameters: SimulationParameter[]
  }
}

// Material with cost
interface Material {
  name: string
  quantity: number
  unit: string
  grade?: string
  estimatedCost?: number
  supplier?: string
}

// DOE configuration
interface DOEConfig {
  designType: 'full-factorial' | 'fractional' | 'taguchi' | 'central-composite'
  factors: DOEFactor[]
  responses: string[]
}
```

## Protocol Templates

| Template | Domain | Materials |
|----------|--------|-----------|
| Perovskite Film Deposition | Solar | Lead iodide, MAI, DMF |
| Silicon Wafer Texturing | Solar | KOH, IPA, DI water |
| Electrode Slurry Prep | Battery | Active material, binder, NMP |
| Coin Cell Assembly | Battery | Electrodes, separator, electrolyte |
| Electrolyzer MEA Assembly | Hydrogen | Membrane, catalyst, GDL |
| Wind Blade Material Test | Wind | Composite samples |

## DOE Matrix Generation

Supported designs:
- **Full Factorial**: All combinations (expensive, thorough)
- **Fractional Factorial**: Subset (efficient screening)
- **Taguchi**: Orthogonal arrays (robust design)
- **Central Composite**: Response surface (optimization)

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/experiments/design` | POST | Generate protocol |
| `/api/experiments/analyze` | POST | Failure analysis |
| `/api/experiments/doe` | POST | Generate DOE matrix |
| `/api/experiments/export` | POST | Export to JSON |

## Export Format

The `.exergy-experiment.json` format enables:
1. Import into Simulations page
2. AI-suggested simulation parameters
3. Full protocol reproducibility
4. Cost tracking across experiments

## Patterns in Use

1. **Template Library**: Pre-built protocols for common experiments
2. **AI Enhancement**: Gemini adds domain-specific details
3. **Safety First**: Auto-detect hazards from materials
4. **Simulation Bridge**: Export directly to simulation engine

## Quality Requirements

1. All materials must have safety data
2. Steps must be reproducible
3. Equipment availability must be noted
4. Cost estimates within 20% accuracy

## Related Context

- [simulation-engine.md](simulation-engine.md) - Export target
- [search-system.md](search-system.md) - Import from papers

## Current Development

- Templates: 10+ available
- Focus: DOE integration
- Next: Cost estimation from material DB
