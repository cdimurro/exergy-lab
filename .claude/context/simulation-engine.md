# Simulation Engine Context Module
<!-- Load when working on physics simulations, GPU validation, or quick calculators -->
<!-- Token budget: ~2500 tokens -->

## Overview

The 3-tier simulation engine provides physics validation ranging from instant analytical calculations to full GPU-accelerated HPC simulations. Supports 8 simulation types across clean energy domains.

## Architecture

```
Simulation Request
    |
    v
+-------------------+
| Provider Factory  |
| (tier selection)  |
+-------------------+
    |
    +------+------+------+
    |      |      |      |
    v      v      v      v
+------+ +------+ +------+ +------+
| Tier1| | Tier2| | Tier3| |Quick |
| Anal.| | ML   | | GPU  | |Calc  |
+------+ +------+ +------+ +------+
    |      |      |      |
    +------+------+------+
           |
           v
+-------------------+
| Validation Engine |
| (benchmarks, UQ)  |
+-------------------+
```

## Key Files (Critical Path)

| File | Purpose | Lines |
|------|---------|-------|
| `src/lib/simulation/types.ts` | Core types | ~200 |
| `src/lib/simulation/provider-factory.ts` | Tier routing | ~100 |
| `src/lib/simulation/providers/analytical-provider.ts` | Tier 1 | ~400 |
| `src/lib/simulation/providers/modal-provider.ts` | Tier 2/3 GPU | ~300 |
| `src/lib/simulation/gpu-pool.ts` | GPU worker pool | ~350 |
| `src/lib/simulation/cost-control-service.ts` | Budget tracking | ~200 |
| `src/lib/simulation/quick-calculators/` | Domain calculators | ~150 each |

## Types to Know

```typescript
// Simulation tiers
type SimulationTier = 'tier1' | 'tier2' | 'tier3'

// Tier characteristics
const TIER_INFO = {
  tier1: { cost: 'free', speed: 'fast', accuracy: 'approximate' },
  tier2: { cost: 'low', speed: 'medium', accuracy: 'moderate' },
  tier3: { cost: 'high', speed: 'slow', accuracy: 'high' },
}

// Simulation types
type SimulationType =
  | 'thermodynamic'
  | 'electrochemical'
  | 'cfd'
  | 'kinetics'
  | 'heat-transfer'
  | 'mass-transfer'
  | 'materials'
  | 'optimization'

// Simulation parameters
interface SimulationParams {
  experimentId: string
  type: SimulationType
  inputs: Record<string, number>
  boundaryConditions: BoundaryCondition[]
  convergenceTolerance?: number
}

// Simulation result
interface SimulationResult {
  success: boolean
  metrics: Record<string, number>
  uncertainty?: UncertaintyResult
  cost: number
  duration: number
  tier: SimulationTier
}
```

## Tier Comparison

| Feature | Tier 1 | Tier 2 | Tier 3 |
|---------|--------|--------|--------|
| Cost | Free | ~$0.05/run | ~$0.50/run |
| Speed | <1 sec | 30-60 sec | 5-15 min |
| Accuracy | +/-10% | +/-5% | +/-1% |
| Methods | Analytical | Monte Carlo | Full CFD/DFT |
| GPU | No | Optional | Yes (Modal) |

## Quick Calculators

| Calculator | Domain | Location |
|------------|--------|----------|
| Shockley-Queisser | Solar | `quick-calculators/shockley-queisser.ts` |
| Betz Limit | Wind | `quick-calculators/betz-limit.ts` |
| Carnot Efficiency | Thermal | `quick-calculators/carnot-efficiency.ts` |
| Electrolysis | Hydrogen | `quick-calculators/electrolysis.ts` |
| Battery Degradation | Storage | `quick-calculators/battery-degradation.ts` |

## GPU Infrastructure

```typescript
// GPU Pool configuration
interface GPUPoolConfig {
  maxWorkers: number       // Default: 4
  maxQueueSize: number     // Default: 100
  workerTimeout: number    // Default: 300000 (5 min)
  gpuTier: 'T4' | 'A10G' | 'A100'
}

// Modal Labs deployment
// Deploy: cd modal-simulations && modal deploy gpu_accelerated.py
// Endpoint: MODAL_ENDPOINT env var
```

## Validation & Uncertainty

```typescript
interface UncertaintyResult {
  aleatoric: number      // Inherent randomness
  epistemic: number      // Model uncertainty
  numerical: number      // Discretization error
  confidence: number     // Overall confidence level
}

// Benchmark validation
interface BenchmarkValidation {
  benchmark: string      // e.g., "NREL SAM"
  expected: number
  actual: number
  deviation: number
  passed: boolean
}
```

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/simulations/execute` | POST | Run simulation |
| `/api/simulations/quick-calc` | POST | Quick calculator |
| `/api/simulations/sweep` | POST | Parameter sweep |
| `/api/simulations/report` | POST | Generate PDF report |

## Cost Control

```typescript
interface CostLimits {
  maxCostPerSimulation: number  // Default: $0.50
  maxCostPerDay: number         // Default: $25.00
  maxCostPerMonth: number       // Default: $100.00
  warningThresholdPercent: number // Default: 80%
}
```

## Patterns in Use

1. **Provider Factory**: Routes to appropriate tier based on request
2. **GPU Pool**: Manages concurrent GPU workers with queue
3. **Cost Tracking**: Real-time budget monitoring
4. **Uncertainty Quantification**: Monte Carlo for error bounds

## Quality Requirements

1. Tier 3 requires Modal API credentials
2. All simulations must report uncertainty
3. Benchmark validation for critical results
4. Cost estimates before execution

## Related Context

- [discovery-engine.md](discovery-engine.md) - Discovery validation
- [ai-agents.md](ai-agents.md) - GPU bridge for agents

## Current Development

- Modal GPU: Needs MODAL_TOKEN_ID/SECRET
- PhysX/MuJoCo: Stub implementations
- Focus: Real GPU deployment
