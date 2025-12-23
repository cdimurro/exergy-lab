# Architecture & Project Structure

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

## Performance Optimization

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
