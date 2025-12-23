# CLAUDE.md - Exergy Lab Project Context

## Project Overview

**Exergy Lab** is an AI-powered clean energy research platform designed to accelerate scientific discovery in renewable energy technologies. The platform combines multi-agent AI systems, real-time data synthesis, and computational modeling to help researchers and engineers discover novel solutions across solar, wind, battery, hydrogen, and other clean energy domains.

### Core Mission
Enable breakthrough discoveries in clean energy by providing researchers with AI-augmented tools for literature synthesis, hypothesis generation, experimental validation, and techno-economic analysis.

### Key Value Propositions
- **FrontierScience Discovery Engine**: 4-phase AI workflow achieving 41% success rate
- **Multi-Agent Orchestration**: 6 specialized agents (research, creative, critical, self-critique, recovery, simulations)
- **14+ Data Source Integration**: Semantic Scholar, arXiv, USPTO, PubMed, IEEE, NREL, and more
- **3-Tier Simulation Engine**: From fast local analytics to GPU-accelerated Monte Carlo simulations
- **Publication-Ready Outputs**: AI-generated reports with rubric-based quality assessment

## Documentation Structure

This project uses modular documentation to keep context manageable. Detailed information is organized as follows:

- [.claude/design-system.md](.claude/design-system.md) - Color palette, typography, component patterns, animations
- [.claude/architecture.md](.claude/architecture.md) - Project structure, architecture patterns, performance, scientific accuracy
- [.claude/development.md](.claude/development.md) - Coding standards, environment variables, git conventions
- [.claude/breakthrough-engine.md](.claude/breakthrough-engine.md) - Breakthrough Engine v0.0.2 specifications

## Quick Reference

### Stack
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS
- **State**: Zustand + React Query
- **AI**: Google Gemini (primary), OpenAI (fallback)
- **Database**: PostgreSQL (when needed)
- **Deployment**: Vercel

### Current Development Focus

Working on **Breakthrough Engine v0.0.2**:
- Phase 1 (Scoring System) - Complete
- Phase 2 (HypGen Agents) - In Progress
- Phase 3-6 - Pending

See [.claude/breakthrough-engine.md](.claude/breakthrough-engine.md) for details.

### Essential Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # ESLint check
npx tsc --noEmit     # Type checking
```

### Critical Rules

1. No `any` types - Use proper TypeScript
2. Validate external data with Zod
3. Stream long operations via SSE
4. Cite all scientific claims
5. No emojis anywhere
6. Use path aliases (@/...) for imports

---

*For detailed guidelines, refer to the modular documentation in .claude/ directory.*
