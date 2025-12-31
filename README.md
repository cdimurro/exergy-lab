<p align="center">
  <img src="https://img.shields.io/badge/Exergy-Lab-0066CC?style=for-the-badge&labelColor=000000" alt="Exergy Lab" />
</p>

<h1 align="center">Exergy Lab</h1>

<p align="center">
  <strong>The AI-Powered Research Platform for Clean Energy Innovation</strong>
</p>

<p align="center">
  <em>Accelerate discoveries. Validate technologies. Publish findings.</em>
</p>

<p align="center">
  <a href="https://exergy-lab.vercel.app"><img src="https://img.shields.io/badge/Live%20Demo-exergy--lab.vercel.app-blue?style=flat-square" alt="Live Demo" /></a>
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/Next.js-14+-black?style=flat-square" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat-square" alt="TypeScript" />
</p>

---

## The Problem

Clean energy researchers waste **40% of their time** on literature reviews, data gathering, and report generation. Investment teams spend weeks validating technical claims that could be assessed in hours. The gap between breakthrough research and commercial deployment grows wider every year.

## The Solution

**Exergy Lab** is an integrated research environment that combines AI-powered literature discovery, physics-based simulation, and automated report generation into a single platform. We help researchers move from hypothesis to publication faster, and help investors separate genuine innovation from hype.

---

## Who Uses Exergy Lab

### Researchers & Scientists

- **Literature Discovery**: Search 15+ academic databases simultaneously with AI-synthesized summaries
- **Experiment Design**: Generate laboratory protocols with safety analysis and resource estimation
- **Simulation**: Run physics-based models from quick estimates to GPU-accelerated Monte Carlo
- **Publication Support**: Export professional reports, figures, and data for journal submission

### Engineers & Technical Teams

- **Techno-Economic Analysis**: Comprehensive NPV, IRR, LCOE calculations with sensitivity analysis
- **Technology Comparison**: Side-by-side evaluation of competing approaches with real data
- **Design Optimization**: Parameter sweeps and multi-objective optimization
- **Documentation**: Auto-generated technical reports for stakeholders

### Investors & Venture Capital

- **Due Diligence**: Validate technical claims against peer-reviewed literature in minutes
- **Technology Assessment**: Physics-based models reveal realistic performance expectations
- **Market Intelligence**: Cross-reference patents, papers, and datasets to map competitive landscapes
- **Risk Analysis**: Identify technical risks and failure modes before committing capital

---

## Core Capabilities

### AI-Powered Academic Search

Query 15 data sources simultaneously and receive synthesized insights:

| Category | Sources |
|----------|---------|
| **Academic Databases** | Semantic Scholar, OpenAlex, PubMed, IEEE Xplore, Crossref, CORE |
| **Preprint Servers** | arXiv, ChemRxiv, bioRxiv |
| **Patent Databases** | Google Patents, USPTO PatentsView |
| **Research Data** | NREL, Materials Project |
| **Specialized** | Consensus, Web Search |

**Features:**
- AI-generated research summaries with inline citations
- Follow-up question chat powered by Gemini
- In-app paper viewer with PDF access
- Smart caching for instant repeated searches
- Cross-reference detection across sources

### 3-Tier Simulation Engine

Progressive fidelity modeling for different use cases:

| Tier | Method | Time | Accuracy | Cost |
|------|--------|------|----------|------|
| **Analytical** | Closed-form physics | ~10 seconds | +/- 20% | Free |
| **Browser AI** | ML-enhanced models | ~2 minutes | +/- 10% | Free |
| **Cloud GPU** | Monte Carlo simulation | ~5 minutes | +/- 2% | $0.50-2.00 |

**Supported Technologies:**
- Solar PV (crystalline, thin-film, perovskite, tandem)
- Wind (onshore, offshore, floating)
- Energy Storage (Li-ion, flow batteries, thermal)
- Hydrogen (electrolysis, fuel cells, storage)
- Carbon Capture (DAC, point-source, mineralization)
- Geothermal, Biomass, Nuclear

### Techno-Economic Analysis

Generate investor-ready financial analysis:

- **Input Methods**: Manual entry, file upload (PDF/Excel/CSV), or AI parameter extraction
- **Financial Metrics**: NPV, IRR, payback period, LCOE/LCOH, capacity factor
- **Analysis Types**: Sensitivity analysis, tornado charts, Monte Carlo uncertainty
- **Exergy Analysis**: True thermodynamic efficiency beyond simple energy ratios
- **Output**: Professional PDF reports with executive summary

### AI Experiment Designer

Generate complete laboratory protocols from research questions:

- Hypothesis-driven experimental design
- Materials and equipment specifications
- Step-by-step procedures with safety considerations
- Failure mode analysis with risk scoring
- Data collection and analysis plans
- Cost and timeline estimation

### Discovery Engine

AI-powered cross-domain innovation synthesis:

- Identify unexplored research intersections
- Generate novel hypotheses from existing literature
- Validate ideas against patent and paper databases
- Automatically generate experiments to test discoveries

---

## Platform Architecture

```
exergy-lab/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API endpoints (40+ routes)
│   │   └── (dashboard)/        # Feature pages
│   ├── components/             # React components
│   │   ├── ui/                 # Design system (20+ components)
│   │   ├── search/             # Academic search interface
│   │   ├── simulations/        # Simulation controls
│   │   ├── tea/                # TEA report builder
│   │   └── experiments/        # Experiment designer
│   ├── lib/                    # Core utilities
│   │   ├── ai/                 # AI agent orchestration
│   │   ├── simulation-engine/  # Physics models
│   │   └── store/              # State management
│   └── types/                  # TypeScript definitions
├── modal-simulations/          # GPU compute service
└── docs/                       # Documentation
```

---

## Quick Start

### Prerequisites

- Node.js 20.x or higher
- Google AI API key ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

```bash
# Clone the repository
git clone https://github.com/cdimurro/exergy-lab.git
cd exergy-lab/exergy-lab

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Add your GOOGLE_AI_API_KEY to .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

```bash
# Required
GOOGLE_AI_API_KEY=your_gemini_key

# Recommended (enables more data sources)
SEMANTIC_SCHOLAR_API_KEY=your_key
IEEE_API_KEY=your_key

# Optional (enhanced features)
OPENAI_API_KEY=your_key
MODAL_API_KEY=your_key      # GPU simulations
```

---

## Use Cases

### For Researchers: Accelerate Your Next Publication

1. **Literature Review** (10 minutes vs. 10 hours)
   - Search across 15 databases simultaneously
   - Get AI-synthesized summaries with citations
   - Export bibliography in any format

2. **Experimental Design** (1 hour vs. 1 week)
   - Generate protocols from research questions
   - Identify potential failure modes
   - Estimate costs and timelines

3. **Simulation & Validation** (minutes vs. days)
   - Run physics-based models on your designs
   - Compare against published benchmarks
   - Generate publication-ready figures

### For Engineers: Design Better Systems

1. **Technology Selection**
   - Compare technologies with consistent methodology
   - Understand trade-offs with sensitivity analysis
   - Access real performance data from NREL and Materials Project

2. **Optimization**
   - Run parameter sweeps to find optimal configurations
   - Multi-objective optimization (cost vs. efficiency vs. reliability)
   - Export results for further analysis

3. **Documentation**
   - Generate technical reports automatically
   - Include all assumptions and calculations
   - Professional formatting for stakeholders

### For Investors: Make Informed Decisions

1. **Technical Due Diligence** (hours vs. weeks)
   - Validate claims against peer-reviewed literature
   - Check patent landscapes for IP risks
   - Identify key technical risks

2. **Technology Assessment**
   - Run independent simulations on proposed technologies
   - Compare against industry benchmarks
   - Understand realistic performance expectations

3. **Market Intelligence**
   - Map competitive landscapes
   - Track research trends and emerging technologies
   - Identify potential acquisition targets

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14+, React, TypeScript, Tailwind CSS |
| **State** | Zustand with persistence |
| **AI** | Google Gemini (primary), OpenAI (fallback) |
| **Compute** | Modal Labs (GPU), Vercel (serverless) |
| **Data** | 15 academic APIs, federated search |

---

## Roadmap

### Now Available (v1.0)
- 15-source academic search with AI synthesis
- 3-tier simulation engine
- TEA report generator with exergy analysis
- AI experiment designer
- Discovery engine
- In-app paper viewer with chat

### Coming Soon (v1.1)
- User authentication and saved projects
- Enhanced PDF parsing and figure extraction
- Collaborative workspaces
- API access for programmatic use

### Future (v2.0+)
- Database integration for persistent storage
- Real-time collaboration
- Jupyter notebook integration
- Python SDK for automation
- Enterprise features (SSO, audit logs)

---

## Documentation

| Document | Description |
|----------|-------------|
| [SOURCE_AUDIT.md](SOURCE_AUDIT.md) | Data source configuration and API keys |
| [CLAUDE.md](CLAUDE.md) | Development workflow |
| [MODAL_SETUP.md](MODAL_SETUP.md) | GPU simulation setup |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | Feature documentation |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md) | API documentation |

---

## Contributing

We welcome contributions from researchers, engineers, and developers. See [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) for setup instructions.

**Priority Areas:**
- Additional simulation models
- New data source integrations
- UI/UX improvements
- Documentation and tutorials

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Citation

If Exergy Lab contributes to your research, please cite:

```bibtex
@software{exergy_lab_2024,
  title = {Exergy Lab: AI-Powered Clean Energy Research Platform},
  author = {DiMurro, Chris},
  year = {2024},
  url = {https://github.com/cdimurro/exergy-lab}
}
```

---

<p align="center">
  <strong>Built for researchers who want to spend less time searching and more time discovering.</strong>
</p>

<p align="center">
  <a href="https://exergy-lab.vercel.app">Try Exergy Lab</a>
</p>
