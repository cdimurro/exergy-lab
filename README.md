# Exergy Lab - Clean Energy Research Platform

> AI-powered platform for clean energy research, experiments, and analysis

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue)](https://www.typescriptlang.org/)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://vercel.com)

**Live Demo:** [your-app.vercel.app](https://your-app.vercel.app)

---

## Overview

Exergy Lab is a comprehensive platform that combines AI, real-time data, and computational modeling to accelerate clean energy innovation. From literature discovery to techno-economic analysis, we provide researchers and engineers with powerful tools to design, test, and commercialize clean energy solutions.

### Key Features

🔬 **AI-Powered Experiment Designer**
- Generate complete laboratory protocols from research questions
- Failure mode analysis with risk scoring
- Resource estimation and cost calculation
- Auto-save and version control

⚡ **3-Tier Simulation Engine**
- **Tier 1 (Local):** Instant results, ±20% accuracy, free
- **Tier 2 (Browser AI):** 2-minute runs, ±10% accuracy, free
- **Tier 3 (Cloud GPU):** High-fidelity Monte Carlo, ±2% accuracy, $0.50-2.00

📊 **TEA Report Generator**
- Upload files or manual entry
- AI parameter extraction
- NPV, IRR, LCOE calculations
- Sensitivity analysis
- PDF export with professional formatting

🔍 **Academic Search**
- Parallel search across Semantic Scholar, arXiv, USPTO, NewsAPI
- Real-time aggregation from 4 data sources
- 24-hour intelligent caching
- Citation tracking

💡 **Discovery Engine**
- Cross-domain innovation synthesis
- AI-generated research opportunities
- Evidence-based validation
- Automatic experiment generation

---

## Quick Start

### Prerequisites

- Node.js 20.x or higher
- npm 9.x or higher
- Google AI API key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/clean-energy-platform.git
cd clean-energy-platform/exergy-lab

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local

# Add your API key
echo "GOOGLE_AI_API_KEY=your_key_here" >> .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Quick Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npx tsc --noEmit     # Type check
```

---

## Tech Stack

### Frontend
- **Next.js 14+** - React framework with App Router
- **TypeScript** - Type-safe code
- **Tailwind CSS** - Utility-first styling
- **Zustand** - State management with persistence
- **Lucide Icons** - Modern icon library

### AI & Machine Learning
- **Google AI (Gemini)** - Primary LLM
- **OpenAI** - Fallback LLM
- **HuggingFace** - Specialized models

### Cloud Services
- **Vercel** - Deployment and hosting
- **Modal Labs** - GPU compute for simulations (optional)
- **Clerk** - Authentication (planned)

### External APIs
- **Semantic Scholar** - Academic papers
- **arXiv** - Preprint servers
- **USPTO** - Patent database
- **NewsAPI** - Industry news

---

## Project Structure

```
clean-energy-platform/
├── exergy-lab/                    # Main Next.js application
│   ├── src/
│   │   ├── app/                   # Next.js App Router
│   │   │   ├── (dashboard)/       # Dashboard pages
│   │   │   │   ├── page.tsx       # Dashboard home
│   │   │   │   ├── search/        # Search feature
│   │   │   │   ├── tea-generator/ # TEA reports
│   │   │   │   ├── experiments/   # Experiment designer
│   │   │   │   ├── simulations/   # Simulation engine
│   │   │   │   └── discovery/     # Discovery engine
│   │   │   ├── api/               # API routes
│   │   │   └── layout.tsx         # Root layout
│   │   ├── components/            # React components
│   │   │   ├── ui/                # Reusable UI components
│   │   │   ├── layout/            # Layout components
│   │   │   ├── experiments/       # Feature-specific components
│   │   │   ├── simulations/
│   │   │   ├── tea/
│   │   │   └── search/
│   │   ├── lib/                   # Utilities & services
│   │   │   ├── store/             # Zustand stores
│   │   │   ├── ai/                # AI integrations
│   │   │   ├── discovery/         # Discovery engine
│   │   │   └── simulation-engine.ts
│   │   ├── types/                 # TypeScript types
│   │   └── hooks/                 # Custom React hooks
│   ├── public/                    # Static assets
│   └── ...
├── modal-simulations/             # GPU simulation service
│   ├── simulation_runner.py
│   └── requirements.txt
├── docs/                          # Documentation
│   ├── USER_GUIDE.md
│   ├── DEVELOPER_GUIDE.md
│   ├── API_REFERENCE.md
│   └── DEPLOYMENT.md
└── README.md                      # This file
```

---

## Documentation

Comprehensive documentation is available in the `/docs` directory:

- **[User Guide](docs/USER_GUIDE.md)** - How to use each feature
- **[Developer Guide](docs/DEVELOPER_GUIDE.md)** - Architecture, setup, contributing
- **[API Reference](docs/API_REFERENCE.md)** - Complete API documentation
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment steps

---

## Features in Detail

### 🔬 Experiment Designer

Generate complete laboratory protocols using AI:

```typescript
// Example: Generate solar cell experiment
const protocol = await generateExperiment({
  hypothesis: "Perovskite coating improves efficiency",
  domain: "solar",
  constraints: ["cost < $5000", "duration < 3 months"]
})

// Returns:
// - Materials list with specifications
// - Step-by-step procedure
// - Safety considerations
// - Data collection plan
// - Expected results
// - Failure mode analysis
```

**Key Features:**
- Hypothesis-driven protocol generation
- Comprehensive safety analysis
- Resource cost estimation
- Auto-save every 30 seconds
- PDF export

### ⚡ 3-Tier Simulation Engine

Progressive accuracy system for different use cases:

| Tier | Speed | Cost | Accuracy | Use Case |
|------|-------|------|----------|----------|
| Local | ~10s | Free | ±20% | Quick validation, learning |
| Browser | ~2min | Free | ±10% | Detailed analysis, optimization |
| Cloud | ~5min | $0.50-2 | ±2% | Publications, final designs |

**Supported Systems:**
- Solar PV (crystalline, thin-film, perovskite)
- Wind turbines (onshore, offshore)
- Battery storage (Li-ion, flow batteries)
- Hydrogen (electrolysis, fuel cells)
- Geothermal, biomass, carbon capture

### 📊 TEA Report Generator

Automated techno-economic analysis with AI:

**Input Methods:**
1. Manual entry via form
2. File upload (PDF, Excel, CSV) with AI extraction

**Outputs:**
- Executive summary
- Cost breakdown (CAPEX, OPEX)
- Financial metrics (NPV, IRR, payback, LCOE)
- Cash flow projections
- Sensitivity analysis with tornado charts
- Risk assessment
- Professional PDF reports

### 🔍 Academic Search

Real-time search across multiple databases:

```typescript
const results = await search("perovskite solar cells")

// Searches in parallel:
// - Semantic Scholar (80 papers)
// - arXiv (25 preprints)
// - USPTO (35 patents)
// - NewsAPI (10 articles)

// Results cached for 24 hours
```

### 💡 Discovery Engine

AI-powered cross-domain innovation:

```typescript
const discoveries = await discover({
  description: "Improve hydrogen production",
  domains: ["hydrogen", "materials-science"],
  targetImpact: "high"
})

// AI generates novel ideas by combining:
// - Current research gaps
// - Cross-domain techniques
// - Emerging technologies
// - Validated with real papers/patents
```

---

## Development

### Environment Variables

Create `.env.local`:

```bash
# Required
GOOGLE_AI_API_KEY=your_gemini_key

# Recommended
OPENAI_API_KEY=your_openai_key
NEWSAPI_KEY=your_newsapi_key

# Optional (for full features)
HUGGINGFACE_API_KEY=your_hf_key
MODAL_API_KEY=your_modal_key
MODAL_ENDPOINT=your_modal_endpoint
ENABLE_CLOUD_GPU=false

# Auth (future)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx
CLERK_SECRET_KEY=sk_xxx
```

### Code Style

- **TypeScript strict mode** - No `any` types
- **Functional components** with hooks
- **Path aliases** - Use `@/components` not relative imports
- **Conventional commits** - `feat:`, `fix:`, `docs:`, etc.

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/your-feature
```

---

## Deployment

### Deploy to Vercel (Recommended)

1. Push code to GitHub
2. Import project on [vercel.com](https://vercel.com)
3. Configure:
   - Root Directory: `exergy-lab`
   - Framework: Next.js
4. Add environment variables
5. Deploy

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for detailed instructions.

### Self-Hosting

```bash
# Build
npm run build

# Start
npm run start
```

Requires Node.js 20+ in production environment.

---

## Performance

### Lighthouse Scores (Target)

- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 100

### Optimizations

- Server-side rendering with Next.js App Router
- Image optimization with `next/image`
- Code splitting and lazy loading
- 24-hour API response caching
- CDN distribution via Vercel
- Tailwind CSS purging

---

## Security

- Environment variables for all secrets
- API key rotation supported
- Rate limiting on all endpoints (planned)
- Input validation and sanitization
- HTTPS everywhere
- Security headers configured
- No sensitive data logged

**Report vulnerabilities:** security@exergylab.com

---

## Roadmap

### v1.0 (Current)
- ✅ Dashboard with analytics
- ✅ Academic search (real APIs)
- ✅ TEA report generator
- ✅ Experiment designer
- ✅ 3-tier simulation engine
- ✅ Discovery engine
- ✅ State persistence
- ✅ Auto-save
- ✅ PDF exports

### v1.1 (Next)
- [ ] User authentication (Clerk)
- [ ] Project collaboration
- [ ] Enhanced data export (Excel, JSON)
- [ ] Advanced visualizations
- [ ] Simulation comparison tool
- [ ] Batch operations
- [ ] API webhooks

### v2.0 (Future)
- [ ] Database integration (PostgreSQL)
- [ ] Real-time collaboration
- [ ] Mobile apps (iOS, Android)
- [ ] Jupyter notebook integration
- [ ] Python SDK
- [ ] REST API for external tools
- [ ] Enterprise features (SSO, audit logs)

---

## Contributing

We welcome contributions! Please see [DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) for:

- Development setup
- Code style guidelines
- Testing requirements
- Pull request process

**Areas we need help:**
- Unit tests for simulation engine
- Mobile UI improvements
- Accessibility enhancements
- Documentation and tutorials
- Additional simulation types
- Internationalization (i18n)

---

## Support

- **Documentation:** [docs/](docs/)
- **Issues:** [GitHub Issues](https://github.com/your-username/clean-energy-platform/issues)
- **Discussions:** [GitHub Discussions](https://github.com/your-username/clean-energy-platform/discussions)
- **Email:** support@exergylab.com

---

## License

MIT License - see [LICENSE](LICENSE) for details

---

## Acknowledgments

**Built with:**
- [Next.js](https://nextjs.org/) - React framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Vercel](https://vercel.com/) - Hosting
- [Modal Labs](https://modal.com/) - GPU compute
- [Google AI](https://ai.google.dev/) - Gemini LLM
- [OpenAI](https://openai.com/) - GPT models

**Data sources:**
- [Semantic Scholar](https://www.semanticscholar.org/)
- [arXiv](https://arxiv.org/)
- [USPTO](https://www.uspto.gov/)
- [NewsAPI](https://newsapi.org/)

**Special thanks** to the open-source community for making this project possible.

---

## Citation

If you use Exergy Lab in your research, please cite:

```bibtex
@software{exergy_lab_2024,
  title = {Exergy Lab: AI-Powered Clean Energy Research Platform},
  author = {Your Name},
  year = {2024},
  url = {https://github.com/your-username/clean-energy-platform}
}
```

---

<div align="center">
  <strong>Made with ❤️ for the clean energy transition</strong>
  <br>
  <sub>Powered by Next.js, AI, and renewable energy data</sub>
</div>
