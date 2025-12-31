# CLAUDE.md - Exergy Lab

## Quick Start for New Session

1. **Check session state:** Read `.claude/session/ACTIVE.md` for current work
2. **If resuming after handoff:** Read `.claude/session/HANDOFF.md` first
3. **Load feature context:** See `.claude/context/index.md` for which module to load

## Context System

| File | Purpose |
|------|---------|
| `.claude/session/ACTIVE.md` | Current work state (live-updated) |
| `.claude/session/HANDOFF.md` | Agent transition summary |
| `.claude/context/index.md` | Context loading guide |
| `.claude/context/[feature].md` | Feature-specific knowledge |

## Project

**Exergy Lab** - AI-powered clean energy research platform

- **Stack:** Next.js 14+ | TypeScript | Tailwind | Zustand | Gemini AI
- **Size:** 500+ files | 200k+ lines | 11 feature areas
- **Data Sources:** 15 implemented (arXiv, OpenAlex, PubMed, IEEE, etc.)

### Key Features

- **FrontierScience Discovery Engine**: 4-phase AI workflow (41% success rate)
- **Multi-Agent Orchestration**: 6 specialized agents
- **3-Tier Simulation Engine**: Analytical to GPU-accelerated
- **TEA Reports**: Comprehensive techno-economic analysis with exergy

## Critical Rules

1. No `any` types - Use proper TypeScript
2. Validate external data with Zod
3. Stream long operations via SSE
4. Cite all scientific claims
5. No emojis anywhere
6. **Update ACTIVE.md during work sessions**

## Commands

```bash
npm run dev          # Dev server (port 3000)
npm run build        # Production build
npx tsc --noEmit     # Type check
```

## Documentation

| Document | Content |
|----------|---------|
| [.claude/architecture.md](.claude/architecture.md) | Project structure, patterns |
| [.claude/development.md](.claude/development.md) | Coding standards, env vars |
| [.claude/design-system.md](.claude/design-system.md) | Colors, typography, components |
| [.claude/breakthrough-engine.md](.claude/breakthrough-engine.md) | Breakthrough Engine specs |

## Feature Context Modules

| Module | Feature Area |
|--------|--------------|
| [.claude/context/discovery-engine.md](.claude/context/discovery-engine.md) | 4-phase AI workflow |
| [.claude/context/ai-agents.md](.claude/context/ai-agents.md) | 6 specialized agents |
| [.claude/context/tea-module.md](.claude/context/tea-module.md) | Techno-economic analysis |
| [.claude/context/simulation-engine.md](.claude/context/simulation-engine.md) | 3-tier physics sims |
| [.claude/context/search-system.md](.claude/context/search-system.md) | 15-source federation |
| [.claude/context/experiments.md](.claude/context/experiments.md) | Protocol design |
| [.claude/context/ui-components.md](.claude/context/ui-components.md) | Component patterns |

## Current Focus

See `.claude/session/ACTIVE.md` for current task and progress.

---

*Token budget: ~1300 tokens baseline, ~3800 with one feature module*
