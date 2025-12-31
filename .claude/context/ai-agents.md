# AI Agents Context Module
<!-- Load when working on agent behaviors, prompts, or racing arena -->
<!-- Token budget: ~2500 tokens -->

## Overview

Exergy Lab uses multiple specialized AI agents for different cognitive tasks. The Discovery Engine uses 4 core agents, while the Breakthrough Engine adds 5 HypGen (Hypothesis Generation) agents in a competitive "racing arena."

## Agent Architecture

```
Discovery Agents (4):
+----------------+     +----------------+
| Research Agent | --> | Creative Agent |
| (gather data)  |     | (hypothesize)  |
+----------------+     +----------------+
        |                      |
        v                      v
+----------------+     +----------------+
| Critical Agent | --> | Self-Critique  |
| (validate)     |     | (refine output)|
+----------------+     +----------------+

Breakthrough HypGen Agents (5):
+------------------+  +------------------+  +------------------+
| Theoretical      |  | Cross-Domain     |  | Contrarian       |
| (first principles|  | (distant analogy)|  | (challenge norm) |
+------------------+  +------------------+  +------------------+
         \                   |                    /
          \                  v                   /
           +---> Racing Arena (hypothesis-racer) <---+
                         |
                 +------------------+  +------------------+
                 | Feasible         |  | Integrative      |
                 | (practical path) |  | (combine ideas)  |
                 +------------------+  +------------------+
```

## Key Files (Critical Path)

| File | Purpose | Lines |
|------|---------|-------|
| `src/lib/ai/agents/research-agent.ts` | Multi-source research | ~400 |
| `src/lib/ai/agents/creative-agent.ts` | Hypothesis generation | ~350 |
| `src/lib/ai/agents/critical-agent.ts` | Physics validation | ~500 |
| `src/lib/ai/agents/self-critique-agent.ts` | Output refinement | ~300 |
| `src/lib/ai/agents/hypothesis-racer.ts` | Racing arena orchestrator | ~800 |
| `src/lib/ai/agents/agent-pool.ts` | Concurrent execution | ~400 |
| `src/lib/ai/agents/enhanced-refinement-agent.ts` | Feedback generation | ~350 |

## Types to Know

```typescript
// HypGen agent types
type HypGenAgentType =
  | 'theoretical'
  | 'cross-domain'
  | 'contrarian'
  | 'feasible'
  | 'integrative'

// Racing hypothesis
interface RacingHypothesis {
  id: string
  agentType: HypGenAgentType
  hypothesis: string
  mechanism: string
  noveltyScore: number
  feasibilityScore: number
  iteration: number
  status: 'active' | 'eliminated' | 'winner'
  refinementHistory: RefinementFeedback[]
}

// Racing arena config
interface RacingArenaConfig {
  maxIterations: number           // Default: 3
  eliminationThreshold: number    // Default: 6.0
  breakthroughThreshold: number   // Default: 9.0
  winnersCount: number            // Default: 3
  enableMidRaceGPU: boolean       // GPU validation
}
```

## Agent Behaviors

### Research Agent
- Queries 15 data sources in parallel
- Synthesizes findings with citations
- Screens for relevance and quality

### Creative Agent
- Generates novel hypotheses
- Designs experiment protocols
- Proposes mechanisms

### Critical Agent
- Validates against physical laws
- Checks thermodynamic limits
- Applies domain benchmarks

### Self-Critique Agent
- Reviews output quality
- Ensures publication-ready format
- Checks completeness

### HypGen Agents (5)
| Agent | Focus | Strength |
|-------|-------|----------|
| Theoretical | First principles | Novel mechanisms |
| Cross-Domain | Distant analogies | Breakthrough ideas |
| Contrarian | Challenge norms | Question assumptions |
| Feasible | Practical paths | Near-term viability |
| Integrative | Combine ideas | Synthesis |

## Racing Arena Flow

1. Each HypGen agent generates 3 hypotheses
2. All 15 evaluated by BreakthroughEvaluator
3. Bottom half eliminated (< 6.0 score)
4. Survivors get refinement feedback
5. Iterate 2-3 more times
6. Top 3 winners selected

## Patterns in Use

1. **Parallel Execution**: AgentPool manages concurrent agent calls
2. **Feedback Bus**: Real-time event communication between agents
3. **GPU Bridge**: Connects agents to GPU validation pool
4. **Iterative Refinement**: Up to 5 refinement iterations

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/breakthrough/race` | POST | Start hypothesis race |
| `/api/breakthrough/evaluate` | POST | Score single hypothesis |

## Quality Requirements

1. All hypotheses must cite scientific basis
2. Physical law violations immediately rejected
3. Cross-domain agents must explain analogy
4. Feasibility claims must include timeline

## Related Context

- [discovery-engine.md](discovery-engine.md) - Overall workflow
- [simulation-engine.md](simulation-engine.md) - GPU validation
- `.claude/breakthrough-engine.md` - Full specs

## Current Development

- Performance: Cross-domain agent best (7.85 avg)
- Issue: Feasible agent underperforming (5.78 avg)
- Focus: Rebalancing agent prompts
