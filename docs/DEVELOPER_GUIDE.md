# Exergy Lab Developer Guide

Technical documentation for developers working on the Exergy Lab platform.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Setup & Installation](#setup--installation)
5. [Development Workflow](#development-workflow)
6. [Key Features Implementation](#key-features-implementation)
7. [Testing](#testing)
8. [Deployment](#deployment)
9. [Contributing](#contributing)
10. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────┐
│              Next.js Frontend (SSR/CSR)         │
│  ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │Dashboard │ │ Search   │ │ Experiments   │   │
│  │          │ │ TEA Gen  │ │ Simulations   │   │
│  │Discovery │ │          │ │               │   │
│  └──────────┘ └──────────┘ └───────────────┘   │
└─────────────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────┐
│           Next.js API Routes (Backend)          │
│  ┌──────────┐ ┌──────────┐ ┌───────────────┐   │
│  │Discovery │ │Simulation│ │ TEA Generator │   │
│  │  API     │ │   API    │ │     API       │   │
│  └──────────┘ └──────────┘ └───────────────┘   │
└─────────────────────────────────────────────────┘
         │              │                │
         ▼              ▼                ▼
┌────────────┐  ┌──────────────┐  ┌─────────────┐
│  External  │  │ Modal Labs   │  │ AI Providers│
│ APIs       │  │ (GPU Sims)   │  │ (Gemini/    │
│ (Scholar,  │  │              │  │  OpenAI)    │
│  arXiv,    │  │              │  │             │
│  USPTO)    │  │              │  │             │
└────────────┘  └──────────────┘  └─────────────┘
```

### Design Patterns

**Frontend:**
- **Component-Based Architecture** - Reusable UI components
- **State Management** - Zustand for global state
- **Server Components** - Next.js App Router for performance
- **Client Components** - Interactive features with 'use client'

**Backend:**
- **API Routes** - Next.js serverless functions
- **Service Layer** - Business logic separated from routes
- **Repository Pattern** - Data access abstraction (future database)
- **Caching Layer** - In-memory cache for API responses

**Data Flow:**
1. User interacts with UI component
2. Component dispatches action to Zustand store
3. Store triggers API call to Next.js route
4. Route validates, calls service layer
5. Service executes business logic (AI, simulations, external APIs)
6. Response flows back through layers
7. Store updates, UI rerenders

---

## Tech Stack

### Core Framework
- **Next.js 14+** - React framework with App Router
- **React 18+** - UI library
- **TypeScript** - Type safety

### UI & Styling
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library
- **Custom design tokens** - Consistent theming via CSS variables

### State Management
- **Zustand** - Lightweight state management
- **Zustand Persist** - LocalStorage persistence
- **React Query** (planned) - Server state management

### AI & Machine Learning
- **Google AI (Gemini)** - Primary LLM for analysis and generation
- **OpenAI** - Fallback LLM
- **HuggingFace** - Specialized models for embeddings

### Cloud Services
- **Modal Labs** - GPU compute for Tier 3 simulations
- **Vercel** - Hosting and deployment
- **Clerk** - Authentication (planned full integration)

### External APIs
- **Semantic Scholar API** - Academic paper search
- **arXiv API** - Preprint search
- **USPTO API** - Patent search
- **NewsAPI** - Industry news

### Development Tools
- **ESLint** - Linting
- **Prettier** - Code formatting
- **TypeScript Compiler** - Type checking
- **GitHub Actions** - CI/CD

---

## Project Structure

```
clean-energy-platform/
├── exergy-lab/                    # Main Next.js application
│   ├── src/
│   │   ├── app/                   # Next.js App Router
│   │   │   ├── (dashboard)/       # Dashboard layout group
│   │   │   │   ├── page.tsx       # Dashboard home
│   │   │   │   ├── search/        # Search feature
│   │   │   │   ├── tea-generator/ # TEA reports
│   │   │   │   ├── experiments/   # Experiment designer
│   │   │   │   ├── simulations/   # Simulation engine
│   │   │   │   └── discovery/     # Discovery engine
│   │   │   ├── api/               # API routes
│   │   │   │   ├── discovery/     # Discovery API
│   │   │   │   ├── simulations/   # Simulation API
│   │   │   │   └── tea/           # TEA API
│   │   │   ├── layout.tsx         # Root layout
│   │   │   └── globals.css        # Global styles + design tokens
│   │   │
│   │   ├── components/
│   │   │   ├── ui/                # Reusable UI components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   └── ...
│   │   │   ├── layout/            # Layout components
│   │   │   │   ├── sidebar.tsx
│   │   │   │   └── header.tsx
│   │   │   ├── charts/            # (Legacy, mostly removed)
│   │   │   ├── experiments/       # Experiment-specific components
│   │   │   ├── simulations/       # Simulation-specific components
│   │   │   ├── tea/               # TEA-specific components
│   │   │   └── search/            # Search-specific components
│   │   │
│   │   ├── lib/
│   │   │   ├── store/             # Zustand stores
│   │   │   │   ├── ui-store.ts
│   │   │   │   ├── experiments-store.ts
│   │   │   │   ├── simulations-store.ts
│   │   │   │   └── ...
│   │   │   ├── ai/                # AI service integrations
│   │   │   │   ├── gemini.ts
│   │   │   │   ├── openai.ts
│   │   │   │   └── router.ts      # AI provider routing
│   │   │   ├── discovery/         # Discovery engine services
│   │   │   │   ├── search-apis.ts  # Real API integrations
│   │   │   │   ├── cache.ts        # Caching layer
│   │   │   │   └── domain-mapping.ts
│   │   │   ├── simulation-engine.ts  # 3-tier simulation engine
│   │   │   ├── file-upload.ts     # File handling utilities
│   │   │   ├── pdf-generator.ts   # PDF report generation
│   │   │   └── utils.ts           # Helper functions
│   │   │
│   │   ├── types/                 # TypeScript type definitions
│   │   │   ├── experiment.ts
│   │   │   ├── simulation.ts
│   │   │   ├── discovery.ts
│   │   │   └── ...
│   │   │
│   │   └── hooks/                 # Custom React hooks
│   │       ├── use-auto-save.ts
│   │       └── ...
│   │
│   ├── public/                    # Static assets
│   │   ├── robots.txt
│   │   └── sitemap.xml
│   │
│   ├── middleware.ts              # Next.js middleware (auth, etc.)
│   ├── next.config.ts             # Next.js configuration
│   ├── tailwind.config.ts         # Tailwind configuration
│   ├── tsconfig.json              # TypeScript configuration
│   └── package.json
│
├── modal-simulations/             # Modal Labs GPU service
│   ├── simulation_runner.py      # Python simulation service
│   ├── requirements.txt
│   ├── deploy.sh
│   └── README.md
│
├── docs/                          # Documentation
│   ├── USER_GUIDE.md
│   ├── DEVELOPER_GUIDE.md (this file)
│   ├── API_REFERENCE.md
│   └── DEPLOYMENT.md
│
├── .github/
│   └── workflows/
│       └── ci.yml                 # GitHub Actions CI/CD
│
├── .env.local                     # Local environment variables
├── .env.production.example        # Production env template
└── README.md
```

---

## Setup & Installation

### Prerequisites

- **Node.js** 20.x or higher
- **npm** 9.x or higher
- **Git**
- **Python 3.10+** (for Modal simulations, optional)
- **Modal account** (for Tier 3 simulations, optional)

### Local Development Setup

**1. Clone the Repository**

```bash
git clone https://github.com/your-username/clean-energy-platform.git
cd clean-energy-platform/exergy-lab
```

**2. Install Dependencies**

```bash
npm install
```

**3. Configure Environment Variables**

Create `.env.local` in the `exergy-lab/` directory:

```bash
# Clerk Authentication (optional for development)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# AI Providers
GOOGLE_AI_API_KEY=your_gemini_key_here
OPENAI_API_KEY=your_openai_key_here
HUGGINGFACE_API_KEY=your_hf_key_here

# Modal Labs (optional, for Tier 3 simulations)
MODAL_API_KEY=your_modal_key_here
MODAL_ENDPOINT=https://your-app--run-simulation.modal.run
ENABLE_CLOUD_GPU=false  # Set to true when Modal is configured

# NewsAPI (for discovery engine)
NEWSAPI_KEY=your_newsapi_key_here
```

**4. Run Development Server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**5. Optional: Set up Modal Labs**

For Tier 3 GPU simulations:

```bash
cd ../modal-simulations
pip install -r requirements.txt
modal deploy simulation_runner.py
# Copy the endpoint URL to MODAL_ENDPOINT in .env.local
```

---

## Development Workflow

### Code Style

**TypeScript**
- Use strict type checking
- Avoid `any` types
- Define interfaces for all data structures
- Use type inference where obvious

**React Components**
- Functional components with hooks
- Use TypeScript for props
- Extract complex logic to custom hooks
- Keep components small and focused (< 300 lines)

**File Naming**
- Components: `PascalCase.tsx` (e.g., `Button.tsx`)
- Utilities: `kebab-case.ts` (e.g., `file-upload.ts`)
- Types: `kebab-case.ts` (e.g., `experiment.ts`)
- Hooks: `use-kebab-case.ts` (e.g., `use-auto-save.ts`)

**Imports**
- Use path aliases: `@/components/ui/button`
- Group imports: React, Next, external, internal, types

```typescript
import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { useExperimentsStore } from '@/lib/store'
import type { ExperimentProtocol } from '@/types/experiment'
```

### Git Workflow

**Branches**
- `master` - Production code
- `develop` - Development branch (if using)
- `feature/feature-name` - Feature branches
- `fix/bug-name` - Bug fix branches

**Commits**
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- Write clear, concise messages
- Reference issues: `fix: resolve simulation crash (#123)`

**Pull Requests**
- Create PR from feature branch to `master`
- Include description of changes
- Reference related issues
- Ensure CI passes
- Request review from maintainers

### Testing Commands

```bash
# Lint
npm run lint

# Type check
npx tsc --noEmit

# Build (catches build-time errors)
npm run build

# Run all checks
npm run lint && npx tsc --noEmit && npm run build
```

---

## Key Features Implementation

### 1. Simulation Engine (3-Tier System)

**File:** `/src/lib/simulation-engine.ts`

The simulation engine implements a progressive accuracy system:

**Architecture:**
```typescript
class SimulationEngine {
  // Tier 1: Local JavaScript calculations
  private async executeLocal(config: SimulationConfig): Promise<SimulationResult>

  // Tier 2: AI-powered predictions
  private async executeBrowser(config: SimulationConfig): Promise<SimulationResult>

  // Tier 3: Cloud GPU Monte Carlo
  private async executeCloud(config: SimulationConfig): Promise<SimulationResult>

  // Main entry point
  public async runSimulation(config: SimulationConfig): Promise<SimulationResult>
}
```

**Key Concepts:**
- **Progressive enhancement** - Each tier builds on the previous
- **Fallback mechanism** - If Tier 3 fails, falls back to stub
- **Cost estimation** - Tier 3 shows cost before execution
- **Real-time progress** - WebSocket updates (Tier 3) or polling (Tier 2)

**Adding New Simulation Types:**

1. Add type to `SimulationConfig` interface in `/src/types/simulation.ts`
2. Implement physics for each tier in `simulation-engine.ts`
3. Add UI form fields in `/src/app/(dashboard)/simulations/page.tsx`
4. Update Modal service with new physics (Tier 3 only)

### 2. Discovery Engine

**Files:**
- `/src/app/api/discovery/route.ts` - API route
- `/src/lib/discovery/search-apis.ts` - External API integration
- `/src/lib/discovery/cache.ts` - Caching layer

**Architecture:**
```typescript
class SearchOrchestrator {
  async searchAllSources(prompt: DiscoveryPrompt) {
    // Parallel search across multiple APIs
    const [papers, patents, preprints, news] = await Promise.allSettled([
      this.searchSemanticScholar(),
      this.searchUSPTO(),
      this.searchArxiv(),
      this.searchNews()
    ])

    return aggregateResults()
  }
}
```

**Key Concepts:**
- **Parallel requests** - All APIs called simultaneously
- **24-hour caching** - Avoid rate limits
- **Graceful degradation** - If one API fails, others still return
- **Rate limiting** - Respects each API's limits

**Adding New Data Sources:**

1. Add search method to `SearchOrchestrator` class
2. Map results to `Source` interface
3. Add error handling and caching
4. Update UI to display new source types

### 3. State Management (Zustand)

**Pattern:**
```typescript
interface StoreState {
  // State
  items: Item[]
  currentDraft: Draft | null

  // Actions
  addItem: (item: Item) => void
  updateDraft: (data: Partial<Draft>) => void
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      items: [],
      currentDraft: null,

      addItem: (item) => set((state) => ({
        items: [item, ...state.items]
      })),

      updateDraft: (data) => set((state) => ({
        currentDraft: { ...state.currentDraft, ...data }
      }))
    }),
    {
      name: 'store-name',
      partialize: (state) => ({ items: state.items.slice(0, 50) })
    }
  )
)
```

**Best Practices:**
- Persist only necessary data
- Limit array sizes (slice to reasonable count)
- Use selectors for derived state
- Keep stores focused (single responsibility)

### 4. AI Router Pattern

**File:** `/src/lib/ai/router.ts`

Routes requests to best available AI provider:

```typescript
async function getAICompletion(prompt: string, options: AIOptions) {
  // Try primary (Gemini)
  if (process.env.GOOGLE_AI_API_KEY) {
    try {
      return await gemini.generate(prompt, options)
    } catch (error) {
      console.warn('Gemini failed, falling back to OpenAI')
    }
  }

  // Fallback to OpenAI
  if (process.env.OPENAI_API_KEY) {
    return await openai.generate(prompt, options)
  }

  throw new Error('No AI provider available')
}
```

**Benefits:**
- Automatic failover
- Cost optimization
- Provider flexibility
- Easy to add new providers

### 5. Auto-Save Hook

**File:** `/src/hooks/use-auto-save.ts`

Custom hook for auto-saving drafts:

```typescript
export function useAutoSave<T>(
  data: T,
  saveFn: (data: T) => void,
  options: { interval?: number; enabled?: boolean } = {}
) {
  const { interval = 30000, enabled = true } = options

  useEffect(() => {
    if (!enabled) return

    const timer = setTimeout(() => {
      saveFn(data)
    }, interval)

    return () => clearTimeout(timer)
  }, [data, saveFn, interval, enabled])

  return { lastSaveTime, isDirty }
}
```

**Usage:**
```typescript
const { updateDraft } = useExperimentsStore()
const { isDirty } = useAutoSave(formData, updateDraft, { interval: 30000 })
```

---

## Testing

### Current Testing Strategy

**Manual Testing:**
- Test all features in development before committing
- Verify build succeeds: `npm run build`
- Check type safety: `npx tsc --noEmit`
- Test on multiple browsers (Chrome, Firefox, Safari)
- Verify mobile responsiveness

### Future Testing (Planned)

**Unit Tests (Jest + React Testing Library)**
```typescript
describe('SimulationEngine', () => {
  it('should execute Tier 1 simulation', async () => {
    const engine = new SimulationEngine()
    const result = await engine.runSimulation({
      tier: 'local',
      type: 'solar',
      parameters: { /* ... */ }
    })

    expect(result.metrics).toBeDefined()
    expect(result.progress.status).toBe('completed')
  })
})
```

**Integration Tests (Playwright)**
```typescript
test('complete simulation workflow', async ({ page }) => {
  await page.goto('/simulations')
  await page.click('[data-testid="tier-1"]')
  await page.fill('[name="capacity"]', '100')
  await page.click('[data-testid="run-simulation"]')
  await expect(page.locator('[data-testid="results"]')).toBeVisible()
})
```

**E2E Tests**
- Full user workflows
- Authentication flows
- Payment flows (when implemented)

---

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

**Quick Deploy to Vercel:**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd exergy-lab
vercel

# Production
vercel --prod
```

**Environment Variables:**
Set all production environment variables in Vercel dashboard (see `.env.production.example`).

---

## Contributing

### Contribution Guidelines

**1. Fork & Clone**
```bash
git clone https://github.com/your-username/clean-energy-platform.git
cd clean-energy-platform
```

**2. Create Feature Branch**
```bash
git checkout -b feature/your-feature-name
```

**3. Make Changes**
- Follow code style guidelines
- Write clear commit messages
- Add tests (when testing infrastructure exists)
- Update documentation

**4. Test Locally**
```bash
npm run lint
npx tsc --noEmit
npm run build
```

**5. Push & Create PR**
```bash
git push origin feature/your-feature-name
# Create PR on GitHub
```

### Code Review Process

- Maintainer reviews within 48 hours
- Address feedback
- Ensure CI passes
- Squash commits if requested
- Merge when approved

### Areas for Contribution

**High Priority:**
- Unit tests for simulation engine
- Integration tests for API routes
- Mobile UI improvements
- Accessibility improvements (WCAG 2.1 AA)
- Performance optimizations

**Medium Priority:**
- Additional simulation types
- More external data sources
- Advanced visualization components
- Export formats (Excel, JSON, etc.)

**Documentation:**
- Tutorial videos
- API examples
- Architecture diagrams
- Translation (internationalization)

---

## Troubleshooting

### Common Issues

**Build Errors:**

*"Module not found: Can't resolve '@/components/...'"*
- Check `tsconfig.json` has correct path mappings
- Ensure file exists at specified path
- Restart dev server: `npm run dev`

*"Type 'X' is not assignable to type 'Y'"*
- Check type definitions in `/src/types/`
- Ensure interfaces match expected structure
- Use TypeScript strict mode

**Runtime Errors:**

*"Failed to fetch" in Discovery*
- Check API keys in `.env.local`
- Verify external APIs are accessible
- Check browser console for CORS issues

*"Simulation failed to execute"*
- Verify Modal endpoint is deployed (Tier 3)
- Check `ENABLE_CLOUD_GPU` is set correctly
- Ensure parameters are within valid ranges

**Development Issues:**

*Hot reload not working*
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

*Styles not updating*
```bash
# Clear Tailwind cache
rm -rf node_modules/.cache
npm run dev
```

### Debug Mode

Enable verbose logging:

```typescript
// In .env.local
NEXT_PUBLIC_DEBUG=true

// In code
if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
  console.log('Debug info:', data)
}
```

### Getting Help

1. Check this guide and [USER_GUIDE.md](./USER_GUIDE.md)
2. Search [GitHub Issues](https://github.com/your-repo/issues)
3. Ask in [GitHub Discussions](https://github.com/your-repo/discussions)
4. Email: dev@exergylab.com

---

## Performance Optimization

### Current Optimizations

**Next.js App Router:**
- Server components by default (reduces JS bundle)
- Streaming SSR for faster TTFB
- Image optimization with next/image
- Font optimization with next/font

**Code Splitting:**
- Dynamic imports for heavy components
- Route-based code splitting (automatic)
- Component lazy loading

**Caching:**
- External API responses (24hr TTL)
- Static assets (CDN caching)
- Build-time optimizations

**Tailwind CSS:**
- PurgeCSS removes unused styles
- JIT mode for development speed
- Minification in production

### Performance Targets

- **FCP (First Contentful Paint):** < 1.5s
- **LCP (Largest Contentful Paint):** < 2.5s
- **TTI (Time to Interactive):** < 3.5s
- **CLS (Cumulative Layout Shift):** < 0.1
- **Lighthouse Score:** > 90

### Monitoring

Use Vercel Analytics to track:
- Page load times
- Core Web Vitals
- API response times
- Error rates

---

## Security

### Current Measures

**Environment Variables:**
- All API keys in environment variables
- Never committed to repository
- Different keys for dev/prod

**API Security:**
- Rate limiting (planned)
- Input validation on all API routes
- CORS configuration
- Security headers (next.config.ts)

**Authentication:**
- Clerk integration (planned)
- Protected routes with middleware
- Session management

**Data Privacy:**
- No sensitive data logged
- Encryption at rest (Vercel)
- HTTPS everywhere

### Security Best Practices

**When Adding New Features:**
1. Validate all user inputs
2. Sanitize data before rendering
3. Use parameterized queries (when database added)
4. Implement rate limiting
5. Add error handling (don't expose internals)
6. Test for XSS, CSRF, injection attacks

**Reporting Security Issues:**
- Email: security@exergylab.com
- Do not open public issues for vulnerabilities
- Expected response: Within 24 hours

---

## License

MIT License - see [LICENSE](../LICENSE) for details

---

**Last Updated:** December 2024
**Version:** 1.0.0
