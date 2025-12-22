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

---

## Design System

### Color Palette

**Dark Mode (Default)**
```css
--background: #0c111b          /* Deep charcoal blue */
--elevated: #1a2332            /* Card backgrounds */
--foreground: #fafafa          /* Primary text */
--muted: #94a3b8               /* Secondary text (slate-400) */
--primary: #10b981             /* Emerald-500 - brand color */
--success: #10b981             /* Emerald-500 */
--warning: #fbbf24             /* Amber-400 */
--error: #f87171               /* Red-400 */
--info: #3b82f6                /* Blue-500 */
--border: #334155              /* Slate-700 */
```

**Light Mode**
```css
--background: #f8fafc          /* Soft white (slate-50) */
--elevated: #f1f5f9            /* Slate-100 */
--foreground: #0f172a          /* Slate-900 */
--muted: #64748b               /* Slate-500 */
--border: #e2e8f0              /* Slate-200 */
```

**Energy Domain Colors (Consistent across themes)**
```css
--coal: #6b7989                /* Slate */
--oil: #78716c                 /* Stone */
--gas: #f97316                 /* Orange */
--nuclear: #a855f7             /* Purple */
--hydro: #60a5fa               /* Blue */
--solar: #fbbf24               /* Amber */
--wind: #2dd4bf                /* Teal */
--biomass: #34d399             /* Emerald */
--geothermal: #ef4444          /* Red */
--hydrogen: #06b6d4            /* Cyan */
--other-renewables: #84cc16    /* Lime */
```

### Typography
- **Sans Font**: Inter (Google Fonts) - `var(--font-sans)`
- **Mono Font**: JetBrains Mono - `var(--font-mono)`
- Base size: 16px with Tailwind's default scale

### Component Patterns
- Use Tailwind CSS utility classes
- Prefer composition over inheritance
- Cards use `rounded-xl` with subtle shadows
- Buttons: `rounded-lg` with emerald-500 primary color
- Inputs: `rounded-md` with slate borders
- Icons: Lucide React with 16-24px sizes

### Animation Guidelines
- Use `transition-all duration-200` for micro-interactions
- Staggered animations for lists (50ms delay between items)
- Skeleton loaders for async content
- Avoid excessive motion - respect `prefers-reduced-motion`

---

## Project Structure

```
clean-energy-platform/
├── exergy-lab/                      # Main Next.js application
│   ├── src/
│   │   ├── app/                     # Next.js App Router
│   │   │   ├── (dashboard)/         # Protected dashboard routes
│   │   │   │   ├── discovery/       # FrontierScience discovery
│   │   │   │   ├── experiments/     # Experiment designer
│   │   │   │   ├── simulations/     # 3-tier simulations
│   │   │   │   ├── tea-generator/   # Techno-economic analysis
│   │   │   │   ├── search/          # Academic search
│   │   │   │   └── admin/           # Debug/admin tools
│   │   │   └── api/                 # Serverless API routes
│   │   ├── components/
│   │   │   ├── discovery/           # 36 discovery-specific components
│   │   │   ├── experiments/         # Experiment UI
│   │   │   ├── simulations/         # Simulation UI
│   │   │   ├── tea/                 # TEA components
│   │   │   ├── ui/                  # Core UI primitives
│   │   │   ├── charts/              # Recharts visualizations
│   │   │   └── layout/              # Sidebar, header
│   │   ├── lib/
│   │   │   ├── ai/
│   │   │   │   ├── agents/          # 6 specialized agents
│   │   │   │   ├── rubrics/         # 10-point evaluation rubrics
│   │   │   │   ├── validation/      # Multi-benchmark validators
│   │   │   │   ├── schemas/         # Zod response schemas
│   │   │   │   └── tools/           # AI tool declarations
│   │   │   ├── discovery/
│   │   │   │   ├── sources/         # 14+ data source integrations
│   │   │   │   └── workflow-*.ts    # Workflow orchestration
│   │   │   ├── simulation/          # 3-tier simulation engine
│   │   │   └── store/               # Zustand state stores
│   │   ├── hooks/                   # Custom React hooks
│   │   └── types/                   # TypeScript definitions
│   ├── package.json
│   └── tsconfig.json
├── docs/                            # Documentation
├── modal-simulations/               # Python GPU service
└── datasets/                        # Reference data
```

---

## Coding Standards

### TypeScript
- **Strict mode enabled** - no `any` types allowed
- Use Zod for runtime validation of external data
- Prefer interfaces for object shapes, types for unions
- Export types from `/src/types/` directory

### React Patterns
- Functional components only (no class components)
- Custom hooks for reusable logic in `/src/hooks/`
- Zustand for global state, React Query for server state
- Server Components by default, `'use client'` only when needed

### Imports
```typescript
// Use path aliases - never relative paths beyond parent
import { Button } from '@/components/ui/button'
import { useDiscoveryStore } from '@/lib/store/discoveries-store'
import type { DiscoveryReport } from '@/types/discovery'
```

### Naming Conventions
- **Components**: PascalCase (`FrontierScienceProgressCard.tsx`)
- **Hooks**: camelCase with `use` prefix (`useDiscoveryWorkflow.ts`)
- **Utilities**: camelCase (`formatDate.ts`)
- **Types**: PascalCase (`DiscoveryPrompt`, `PhaseStatus`)
- **Constants**: SCREAMING_SNAKE_CASE (`MAX_RETRIES`)

### File Organization
- One component per file
- Co-locate tests with source files (`*.test.ts`)
- Export index files for component directories

---

## Architecture Patterns

### Multi-Agent Discovery System
```
User Query → Discovery Orchestrator
                    ↓
    ┌───────────────┼───────────────┐
    ↓               ↓               ↓
Research Agent  Creative Agent  Critical Agent
    ↓               ↓               ↓
    └───────────────┼───────────────┘
                    ↓
            Self-Critique Agent
                    ↓
            Validation Phase
                    ↓
            Publication Output
```

### 4-Phase Discovery Workflow
1. **Research Phase**: Multi-source synthesis, gap identification
2. **Hypothesis Phase**: Novel idea generation, experiment design
3. **Validation Phase**: Simulations, TEA, physics validation
4. **Output Phase**: Quality grading, report generation

### State Management
- **Zustand stores** for persistent client state
- **React Query** for server data caching
- **SSE streaming** for real-time progress updates

### API Design
- RESTful endpoints in `/api/`
- SSE for long-running operations
- Zod schemas for request/response validation
- Graceful degradation on failures

---

## Performance Optimization Guidelines

### Critical Performance Rules

1. **Lazy Loading**
   - Dynamic imports for heavy components
   - Suspense boundaries for async content
   - Image optimization with next/image

2. **Memoization**
   - `useMemo` for expensive computations
   - `useCallback` for stable function references
   - React.memo for pure display components

3. **Bundle Optimization**
   - Tree-shake unused imports
   - Dynamic imports for route-specific code
   - Avoid importing entire libraries (use subpaths)

4. **Data Fetching**
   - Parallel requests where possible
   - Request deduplication with React Query
   - Stale-while-revalidate patterns

5. **Rendering**
   - Virtualized lists for large datasets
   - Debounced search inputs
   - Optimistic UI updates

### AI/LLM Performance

1. **Model Selection**
   - Use Gemini Flash for fast, simple tasks
   - Reserve Gemini Pro for complex reasoning
   - Fallback to OpenAI on Gemini failures

2. **Streaming**
   - Always stream long-running AI responses
   - Show partial results during generation
   - Heartbeat signals for connection health

3. **Rate Limiting**
   - Implement tiered rate limits
   - Exponential backoff on failures
   - Queue requests to avoid bursts

4. **Caching**
   - Cache embedding results
   - Deduplicate identical queries
   - Store successful discovery results

---

## Scientific Discovery Focus

### Accuracy Requirements

All scientific computations must prioritize accuracy:

1. **Thermodynamic Calculations**
   - Use SI units consistently
   - Include uncertainty quantification
   - Validate against known reference values
   - Cite sources for constants and equations

2. **Simulation Fidelity**
   - Tier 1: ±20% (screening)
   - Tier 2: ±10% (optimization)
   - Tier 3: ±2% (validation)

3. **Literature Synthesis**
   - Verify source credibility
   - Cross-reference multiple sources
   - Flag conflicting information
   - Maintain citation chains

4. **Hypothesis Generation**
   - Ground in established physics
   - Quantify feasibility scores
   - Include failure mode analysis
   - Reference prior art

### Quality Assessment

Every discovery output is evaluated against 10-point rubrics:

- **Completeness** (5 points)
- **Accuracy** (4 points)
- **Novelty** (3 points)
- **Feasibility** (2 points)
- **Methodology** (4 points)
- **Evidence** (3 points)
- **Safety** (2 points)
- **Reproducibility** (3 points)
- **Thermodynamics** (2 points)
- **Economics** (2 points)

**Pass threshold**: 7/10 minimum

---

## Key Files Reference

### Core Discovery Engine
- `src/lib/ai/agents/discovery-orchestrator.ts` - Main workflow orchestrator
- `src/lib/ai/agents/research-agent.ts` - Literature synthesis
- `src/lib/ai/agents/creative-agent.ts` - Hypothesis generation
- `src/lib/ai/rubrics/judge.ts` - Quality assessment

### UI Components
- `src/components/discovery/FrontierScienceProgressCard.tsx` - Progress display
- `src/components/discovery/PhaseTimeline.tsx` - Phase visualization
- `src/components/discovery/LiveActivityFeed.tsx` - Real-time events
- `src/components/discovery/FrontierScienceResultsCard.tsx` - Results display

### State Management
- `src/lib/store/discoveries-store.ts` - Discovery persistence
- `src/hooks/use-frontierscience-workflow.ts` - Workflow hook

### API Routes
- `src/app/api/discovery/frontierscience/route.ts` - Main SSE endpoint
- `src/app/api/discovery/generate-report/route.ts` - Report generation
- `src/app/api/simulations/execute/route.ts` - Simulation execution

---

## Environment Variables

```bash
# Required
GOOGLE_AI_API_KEY=            # Gemini API key

# Recommended
OPENAI_API_KEY=               # Fallback LLM
NEWSAPI_KEY=                  # Industry news
HUGGINGFACE_API_KEY=          # Embeddings

# Optional (GPU Simulations)
MODAL_API_KEY=                # Modal Labs
MODAL_ENDPOINT=               # GPU endpoint
ENABLE_CLOUD_GPU=false        # Enable Tier 3
```

---

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # ESLint check
npx tsc --noEmit     # Type checking
npm run stress-test  # Run stress tests
```

---

## Git Conventions

### Commit Messages
```
feat: Add new hypothesis generation algorithm
fix: Correct thermodynamic calculation in TEA
docs: Update API reference for discovery endpoint
refactor: Simplify phase transition logic
perf: Optimize literature search caching
test: Add unit tests for simulation engine
```

### Branch Naming
```
feature/discovery-improvements
fix/simulation-accuracy
refactor/agent-architecture
```

---

## Important Reminders

1. **No `any` types** - Use proper TypeScript types
2. **Validate external data** - Use Zod schemas
3. **Handle errors gracefully** - Always provide recovery paths
4. **Stream long operations** - Use SSE for AI responses
5. **Cite sources** - All scientific claims need references
6. **Test accuracy** - Validate calculations against known values
7. **Optimize performance** - Profile before and after changes
8. **Document decisions** - Comment non-obvious code

---

## Breakthrough Engine v0.0.2 (In Development)

### Overview
The Breakthrough Engine extends the existing Discovery Engine to dramatically increase the likelihood of identifying genuine scientific breakthroughs. It achieves this through:

1. **6-Tier Classification System** - Rigorous outcome classification
2. **5-Agent Parallel Orchestration** - Hypothesis racing with iterative refinement
3. **8-Dimension Breakthrough Scoring** - Beyond simple pass/fail
4. **GPU-Accelerated Compute** - Modal Labs integration for 5x speed improvement

### Classification Tiers

| Tier | Score | Color |
|------|-------|-------|
| **Breakthrough** | 9.0+ | Emerald `#10B981` |
| **Partial Breakthrough** | 8.5-8.9 | Green `#22C55E` |
| **Major Discovery** | 8.0-8.4 | Blue `#3B82F6` |
| **Significant Discovery** | 7.0-7.9 | Violet `#8B5CF6` |
| **Partial Failure** | 5.0-6.9 | Amber `#F59E0B` |
| **Failure** | <5.0 | Red `#EF4444` |

### 8 Breakthrough Dimensions (BC1-BC8)

| ID | Dimension | Points | Required |
|----|-----------|--------|----------|
| BC1 | Performance Gains | 1.5 | ✓ |
| BC2 | Cost Reduction | 1.5 | |
| BC3 | Advanced Capabilities | 1.0 | |
| BC4 | New Applications | 1.0 | |
| BC5 | Societal Impact | 1.0 | |
| BC6 | Opportunity Scale | 1.5 | |
| BC7 | Problem-Solving | 1.0 | |
| BC8 | Knowledge Trajectory | 1.5 | ✓ |

**Total: 10 points** | **Breakthrough threshold: 9.0+**

### 5 HypGen Agents (Parallel Hypothesis Generation)

| Agent | Strategy | Focus |
|-------|----------|-------|
| HypGen-Novel | Novelty-first | Unexplored combinations |
| HypGen-Feasible | Feasibility-first | Near-term implementation |
| HypGen-Economic | Economics-first | Cost reduction, ROI |
| HypGen-CrossDomain | Cross-domain | Knowledge transfer |
| HypGen-Paradigm | Paradigm-shift | Breakthrough focus |

**Workflow:**
- Each agent generates 3 hypotheses (15 total)
- Up to 5 refinement iterations per hypothesis
- Real-time feedback loop between evaluator and agents
- Elimination at <5.0, breakthrough flagged at 9.0+
- Top 3 proceed to full validation

### Breakthrough Engine Files

**Scoring System (Phase 1 - Complete):**
- `src/lib/ai/rubrics/types-breakthrough.ts` - 6-tier types, 8 dimensions
- `src/lib/ai/rubrics/templates/breakthrough.ts` - Rubric template with automated validation
- `src/lib/ai/rubrics/breakthrough-judge.ts` - BreakthroughJudge class

**HypGen Agents (Phase 2 - In Progress):**
- `src/lib/ai/agents/hypgen/base.ts` - Base HypGenAgent class
- `src/lib/ai/agents/hypgen/novel.ts` - Novelty-focused generator
- `src/lib/ai/agents/hypgen/feasible.ts` - Feasibility-focused generator
- `src/lib/ai/agents/hypgen/economic.ts` - Economics-focused generator
- `src/lib/ai/agents/hypgen/cross-domain.ts` - Cross-domain generator
- `src/lib/ai/agents/hypgen/paradigm.ts` - Paradigm-shift generator
- `src/lib/ai/agents/agent-pool.ts` - Concurrent agent execution

**Evaluation & Racing (Phase 3-4):**
- `src/lib/ai/agents/breakthrough-evaluator.ts` - 8-dimension scoring
- `src/lib/ai/agents/enhanced-refinement-agent.ts` - Detailed feedback
- `src/lib/ai/agents/feedback-bus.ts` - Real-time inter-agent communication
- `src/lib/ai/agents/hypothesis-racer.ts` - Racing arena

**UI Components (Phase 6):**
- `src/components/discovery/BreakthroughScoreCard.tsx` - 8-dimension radar chart
- `src/components/discovery/HypothesisRaceViewer.tsx` - Real-time race visualization
- `src/components/discovery/IterationProgressCard.tsx` - Refinement loop progress

### Cost & Performance Targets

| Metric | Current | Target |
|--------|---------|--------|
| Discovery time | 8-15 min | 4-6 min |
| Concurrent hypotheses | 1 | 15 |
| Refinement iterations | N/A | Up to 75 |
| Cost per discovery | ~$2.00 | ~$2.50-$3.00 |

---

## Current Development Focus

**Active: Breakthrough Engine v0.0.2**
- Phase 1 (Scoring System) - ✓ Complete
- Phase 2 (HypGen Agents) - In Progress
- Phase 3-6 - Pending

Based on recent commits:
- Multi-benchmark validation system refinements
- Graceful degradation for partial failures
- Real-time progress visualization improvements
- Discovery criteria UI enhancements
- Mode system (breakthrough, synthesis, validation)

---

*This file serves as persistent context for Claude to maintain consistency across sessions. Update as the project evolves.*
