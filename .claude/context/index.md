# Context Module Registry
<!-- Quick reference for which context to load based on task type -->

## Quick Task Mapping

| Task Type | Load These Contexts |
|-----------|---------------------|
| Discovery workflow | `discovery-engine.md`, `ai-agents.md` |
| Agent behavior/prompts | `ai-agents.md` |
| TEA reports/financial | `tea-module.md` |
| Simulation features | `simulation-engine.md` |
| Search improvements | `search-system.md` |
| Experiment design | `experiments.md` |
| UI components/styling | `ui-components.md` |
| Breakthrough scoring | `discovery-engine.md`, `ai-agents.md` |

## Context Loading Order

1. **Always first:** `.claude/session/ACTIVE.md` (if exists)
2. **If handoff:** `.claude/session/HANDOFF.md` before anything else
3. **Feature work:** Load relevant context module from this directory
4. **Standards reference:** `.claude/development.md`

## Token Budget

| Context | Est. Tokens | When to Load |
|---------|-------------|--------------|
| ACTIVE.md | 500-1000 | Always (start of session) |
| HANDOFF.md | 800-1200 | After agent handoff |
| Feature module | 2000-2500 | When working on that feature |
| **Baseline** | ~1300 | Session start (no feature work) |
| **With feature** | ~3800 | Session start + one feature module |

## Available Modules

| Module | Feature Area | Priority | Description |
|--------|--------------|----------|-------------|
| [discovery-engine.md](discovery-engine.md) | 4-phase AI workflow | HIGH | FrontierScience phases, scoring, orchestration |
| [ai-agents.md](ai-agents.md) | 6 specialized agents | HIGH | Agent prompts, behaviors, racing arena |
| [tea-module.md](tea-module.md) | Techno-economic analysis | HIGH | PDF reports, exergy calculations |
| [simulation-engine.md](simulation-engine.md) | 3-tier physics sims | HIGH | Analytical, Modal GPU, PhysX/MuJoCo |
| [search-system.md](search-system.md) | 15-source federation | MEDIUM | Data sources, unified results |
| [experiments.md](experiments.md) | Protocol design | MEDIUM | Experiment lab, DOE, safety |
| [ui-components.md](ui-components.md) | Component patterns | LOW | Design system, common patterns |

## File Dependencies

```
discovery-engine.md
    |-- ai-agents.md (agent behaviors)
    |-- simulation-engine.md (validation)

tea-module.md
    |-- simulation-engine.md (cost calculations)

search-system.md
    |-- (standalone)

experiments.md
    |-- simulation-engine.md (export to sim)

ui-components.md
    |-- (standalone, references design-system.md)
```

## Session Protocol

### Starting a Session
```
1. Read ACTIVE.md if exists
   - Understand current work state
   - Check for pending tasks

2. If HANDOFF.md exists and fresh (<24h)
   - Read handoff summary
   - Follow "Immediate Next Steps"
   - Load referenced context modules

3. Identify task feature area
   - Load corresponding context module

4. Update ACTIVE.md
   - Set session metadata
   - Track task progress
```

### During Work
```
1. Update ACTIVE.md after each major step
2. Keep Modified Files list current
3. Document key decisions made
4. Review every ~30 minutes or 50k tokens
```

### Before Context Limit
```
1. Generate HANDOFF.md summary
2. Mark ACTIVE.md as HANDED_OFF
3. Notify user about handoff preparation
```

## Directory Structure

```
.claude/
├── session/
│   ├── ACTIVE.md          # Live session state
│   └── HANDOFF.md         # Agent transition summary
│
├── context/
│   ├── index.md           # This file
│   ├── discovery-engine.md
│   ├── ai-agents.md
│   ├── tea-module.md
│   ├── simulation-engine.md
│   ├── search-system.md
│   ├── experiments.md
│   └── ui-components.md
│
├── architecture.md        # Detailed architecture (reference)
├── development.md         # Coding standards (reference)
├── design-system.md       # UI/styling (reference)
└── breakthrough-engine.md # Feature spec (reference)
```
