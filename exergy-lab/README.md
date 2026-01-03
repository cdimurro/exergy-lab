# Exergy Lab

AI-Powered Scientific Research Platform for energy, materials, and chemicals.

## Overview

Exergy Lab accelerates scientific discovery through AI-powered research tools:

- **Discovery Engine**: 4-phase AI workflow for research synthesis
- **Breakthrough Engine**: Hypothesis racing with multi-agent evaluation
- **Simulation Engine**: 3-tier physics simulations (analytical, browser ML, cloud GPU)
- **TEA Analysis**: Techno-economic analysis with exergy calculations
- **Literature Search**: Federated search across 15+ scientific databases

## Domains

- Energy Systems (solar, wind, battery, hydrogen, grid)
- Materials Science (polymers, catalysts, battery materials, membranes)
- Chemical Engineering (separation, thermodynamics, reaction kinetics)
- Carbon Capture and Storage

## Tech Stack

- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: Zustand with localStorage persistence
- **AI**: Google Gemini (gemini-2.0-flash)
- **Auth**: Clerk
- **Database**: Supabase (PostgreSQL)

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Type check
npx tsc --noEmit

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Environment Variables

```bash
# Required
GOOGLE_AI_API_KEY=your_gemini_api_key

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Database (Supabase)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Project Structure

```
src/
  app/              # Next.js App Router pages
  components/       # React components
  hooks/            # Custom React hooks
  lib/
    ai/             # AI agents and prompts
    discovery/      # Search sources and workflow
    simulation/     # Physics calculators and providers
    tea/            # TEA analysis and exergy
    usage/          # Usage tracking and limits
  types/            # TypeScript definitions
```

## License

Proprietary
