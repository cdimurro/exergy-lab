# Exergy Lab Agent Skills

This directory contains domain expertise packaged as reusable skills following Anthropic's Agent Skills format. These skills enable progressive disclosure (load content on-demand) and provide portable domain knowledge.

## Available Skills

### 1. Clean Energy Research
**Path**: `clean-energy-research/`
**Trigger**: Use when starting a discovery, researching a hypothesis, or gathering literature for any clean energy domain.

Files:
- `SKILL.md` - Main skill instructions and query expansion
- `databases.md` - Reference for 14+ scientific databases

### 2. Hypothesis Generation
**Path**: `hypothesis-generation/`
**Trigger**: Use when creating new research directions, proposing experiments, or synthesizing findings into actionable research questions.

Files:
- `SKILL.md` - Hypothesis criteria, novelty assessment, templates

### 3. Experiment Design
**Path**: `experiment-design/`
**Trigger**: Use when planning lab experiments, simulations, or validation studies.

Files:
- `SKILL.md` - Protocol design patterns and methodology selection
- `safety-protocols.md` - Domain-specific safety requirements

### 4. Physical Validation
**Path**: `physical-validation/`
**Trigger**: Use when checking efficiency claims, comparing to state-of-art, or validating simulation results.

Files:
- `SKILL.md` - Validation workflow and rules
- `benchmarks/solar.json` - Solar cell physics limits and records
- `benchmarks/battery.json` - Battery limits and benchmarks
- `benchmarks/hydrogen.json` - Hydrogen/fuel cell benchmarks
- `benchmarks/carbon-capture.json` - Carbon capture benchmarks

### 5. TEA Analysis
**Path**: `tea-analysis/`
**Trigger**: Use when evaluating commercial viability or comparing technology costs.

Files:
- `SKILL.md` - TEA workflow, financial metrics, sensitivity analysis
- `cost-models.md` - Equipment costs, CAPEX/OPEX models, learning curves

## Rubrics (Progressive Loading)

**Path**: `rubrics/`

Phase-specific rubrics for quality validation:
- `research.json` - Research phase criteria (10 points)
- `hypothesis.json` - Hypothesis criteria (10 points)
- `experiment.json` - Experiment design criteria (10 points)
- `simulation.json` - Simulation criteria (10 points)
- `synthesis.json` - Synthesis criteria (10 points)
- `validation.json` - Validation criteria (10 points)

## Usage Pattern

### Progressive Disclosure
Instead of loading all domain knowledge upfront (~5000 tokens), load skills on-demand:

```typescript
// Before: All context loaded at startup
const FULL_CONTEXT = "...5000 tokens of domain knowledge..."

// After: Load only metadata at startup, content on-demand
async function getRubric(phase: string): Promise<Rubric> {
  return await import(`@/.claude/skills/rubrics/${phase}.json`)
}

async function getBenchmarks(domain: string): Promise<Benchmarks> {
  return await import(`@/.claude/skills/physical-validation/benchmarks/${domain}.json`)
}
```

### Expected Token Savings
- Baseline context: ~5000 → ~100 tokens (metadata only)
- On-demand loading: 500-2000 tokens per skill
- **Estimated 60-80% reduction in baseline context**

## Integration Points

### Agent Files That Reference Skills

| Agent | Skill Reference | Usage |
|-------|----------------|-------|
| `research-agent.ts` | `clean-energy-research/` | Database list, query expansion |
| `creative-agent.ts` | `hypothesis-generation/` | Hypothesis criteria |
| `creative-agent.ts` | `experiment-design/` | Protocol templates |
| `critical-agent.ts` | `physical-validation/` | Physics benchmarks |
| `rubrics/judge.ts` | `rubrics/*.json` | Phase rubrics |

### Future Work

1. **Dynamic Loading**: Implement lazy loading of skill content in agent code
2. **Session State**: Add discovery session persistence for resume capability
3. **Subagent Parallelization**: Use skills with parallel subagents for faster research
4. **Hooks System**: Add validation hooks at phase boundaries
