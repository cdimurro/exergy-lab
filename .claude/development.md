# Development Guide

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

## Development Commands

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # ESLint check
npx tsc --noEmit     # Type checking
npm run stress-test  # Run stress tests
```

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

## Important Reminders

1. **No `any` types** - Use proper TypeScript types
2. **Validate external data** - Use Zod schemas
3. **Handle errors gracefully** - Always provide recovery paths
4. **Stream long operations** - Use SSE for AI responses
5. **Cite sources** - All scientific claims need references
6. **Test accuracy** - Validate calculations against known values
7. **Optimize performance** - Profile before and after changes
8. **Document decisions** - Comment non-obvious code
9. Don't use emoji's anywhere
