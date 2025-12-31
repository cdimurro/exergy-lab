# Discovery Engine Context Module
<!-- Load when working on FrontierScience discovery workflow -->
<!-- Token budget: ~2500 tokens -->

## Overview

The FrontierScience Discovery Engine is a 4-phase AI workflow that orchestrates multi-agent research, hypothesis generation, validation, and output. Consolidated from original 12 phases to improve success rate from 6.9% to 41%.

## Architecture

```
User Query
    |
    v
+-------------------+
|  PHASE 1: RESEARCH |
|  - Multi-source    |
|  - Synthesis       |
|  - Screening       |
+-------------------+
    |
    v
+-------------------+
| PHASE 2: HYPOTHESIS|
|  - Novel generation|
|  - Experiment design|
+-------------------+
    |
    v
+-------------------+
| PHASE 3: VALIDATION|
|  - Simulation      |
|  - Exergy analysis |
|  - TEA analysis    |
|  - Patent search   |
|  - Physics check   |
+-------------------+
    |
    v
+-------------------+
|  PHASE 4: OUTPUT   |
|  - Self-critique   |
|  - Publication rpt |
+-------------------+
```

## Key Files (Critical Path)

| File | Purpose | Lines |
|------|---------|-------|
| `src/lib/ai/agents/discovery-orchestrator.ts` | Master orchestrator | ~1200 |
| `src/lib/ai/rubrics/index.ts` | Rubric registry | ~100 |
| `src/lib/ai/rubrics/types.ts` | Core types | ~400 |
| `src/lib/ai/rubrics/refinement-engine.ts` | Iterative refinement | ~300 |

## Types to Know

```typescript
// Discovery phases
type DiscoveryPhase = 'research' | 'hypothesis' | 'validation' | 'output'

// Discovery modes
type DiscoveryMode = 'breakthrough' | 'synthesis' | 'validation' | 'parallel'

// Quality classification
type DiscoveryQuality = 'breakthrough' | 'validated' | 'promising' | 'incremental' | 'failed'

// Phase result
interface PhaseResult {
  phase: DiscoveryPhase
  score: number
  passed: boolean
  iterations: number
  refinementHints?: RefinementHints
}

// Overall result
interface DiscoveryResult {
  phases: Record<DiscoveryPhase, PhaseResult>
  overallScore: number
  quality: DiscoveryQuality
  hypothesis?: Hypothesis
  validation?: AggregatedValidation
}
```

## Patterns in Use

1. **Consolidated Rubrics**: Each phase uses a consolidated rubric (RC1-RC5, HC1-HC7, etc.)
2. **Iterative Refinement**: Up to 5 iterations per phase with feedback hints
3. **Graceful Degradation**: Continues on non-critical failures with partial results
4. **Mode-Specific Thresholds**: Different pass thresholds per discovery mode

## Scoring System

| Phase | Items | Pass Threshold |
|-------|-------|----------------|
| Research | RC1-RC5 | 7.0 |
| Hypothesis | HC1-HC7 | 7.0 |
| Validation | VC1-VC6 | 7.0 |
| Output | OC1-OC5 | 7.0 |

Quality classification:
- Breakthrough: >= 9.0
- Validated: >= 8.0
- Promising: >= 7.0
- Incremental: >= 5.0
- Failed: < 5.0

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/discovery/frontierscience` | POST | Start discovery workflow |
| `/api/discovery/stream` | GET/SSE | Stream progress events |

## State Management

- Store: `src/lib/discovery/workflow-store.ts`
- Key actions: `startDiscovery()`, `updatePhase()`, `completeDiscovery()`

## Quality Requirements

1. All scientific claims must be cited
2. Simulations must use appropriate tier
3. TEA must include exergy calculations
4. Output must be publication-ready format

## Related Context

- [ai-agents.md](ai-agents.md) - Agent behaviors and prompts
- [simulation-engine.md](simulation-engine.md) - Simulation tiers
- `.claude/breakthrough-engine.md` - Breakthrough Engine specs

## Current Development

- v0.0.3.1: Output phase word count improvements
- v0.0.3.2: Refinement agent enhancements
- Focus: Increasing breakthrough detection accuracy
