<p align="center">
  <img src="https://img.shields.io/badge/Exergy-Lab-0066CC?style=for-the-badge&labelColor=000000" alt="Exergy Lab" />
</p>

<h1 align="center">Exergy Lab</h1>

<p align="center">
  <strong>The Integrated Research Platform for Clean Energy Discovery</strong>
</p>

<p align="center">
  <a href="https://exergy-lab.vercel.app"><img src="https://img.shields.io/badge/Live%20Platform-exergy--lab.vercel.app-0066CC?style=flat-square" alt="Live Platform" /></a>
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
  <img src="https://img.shields.io/badge/Data%20Sources-15+-purple?style=flat-square" alt="Data Sources" />
  <img src="https://img.shields.io/badge/Simulation%20Tiers-3-orange?style=flat-square" alt="Simulation Tiers" />
</p>

---

## What is Exergy Lab

Exergy Lab unifies the entire clean energy research workflow into a single intelligent platform. From initial literature discovery through simulation, analysis, and publication-ready reporting, researchers operate within one environment that understands context, maintains state, and accelerates every phase of scientific investigation.

The platform integrates **15 academic data sources**, **physics-based simulation engines**, **AI-powered synthesis**, and **automated report generation** into a cohesive system where each capability enhances the others. Search results inform simulations. Simulations validate hypotheses. Validated hypotheses generate experiments. The research cycle that traditionally spans weeks compresses into hours.

---

## Platform Capabilities

### Federated Academic Intelligence

Exergy Lab queries 15 data sources simultaneously and synthesizes results using large language models trained on scientific literature:

| Category | Integrated Sources |
|----------|-------------------|
| **Academic Databases** | Semantic Scholar, OpenAlex, PubMed, IEEE Xplore, Crossref, CORE |
| **Preprint Archives** | arXiv, ChemRxiv, bioRxiv |
| **Patent Systems** | Google Patents, USPTO PatentsView |
| **Research Data** | NREL, Materials Project |
| **Specialized** | Consensus, Web Search |

The AI synthesis layer doesn't just aggregate results. It identifies connections across sources, highlights contradictions in the literature, surfaces relevant patents alongside papers, and generates follow-up research questions. Every citation links to an in-app viewer where researchers can read papers, ask questions about content, and extract data without leaving the platform.

**Technical Implementation:**
- Parallel API queries with intelligent rate limiting
- Cross-reference detection identifies the same work across multiple databases
- 10-minute smart caching eliminates redundant requests
- Automatic retry with exponential backoff handles transient failures
- Structured logging enables performance monitoring and debugging

### Progressive Fidelity Simulation

The simulation engine operates across three tiers, allowing researchers to match computational investment to their current needs:

| Tier | Methodology | Response Time | Uncertainty | Compute Cost |
|------|-------------|---------------|-------------|--------------|
| **Analytical** | Physics-based calculations with real data | ~10 seconds | +/- 15% | Free |
| **Browser** | ML-enhanced physics models | ~2 minutes | +/- 10% | Free |
| **Cloud GPU** | Monte Carlo with uncertainty quantification | ~5 minutes | +/- 2% | $0.50-2.00 |

Researchers typically begin with Tier 1 for rapid exploration, narrow to promising configurations with Tier 2, then validate final designs with Tier 3's publication-grade accuracy. The system maintains parameter consistency across tiers, so transitioning between fidelity levels requires no reconfiguration.

**Physics-Based Calculators:**
- **Thermodynamics**: Carnot efficiency with technology-specific practical multipliers (steam-rankine, gas-brayton, combined-cycle, ORC, supercritical-CO2)
- **Electrochemistry**: Butler-Volmer kinetics, Nernst equation, overpotential modeling for PEM/alkaline/SOEC/AEM electrolyzers
- **Photovoltaics**: Shockley-Queisser limit with real band gaps, temperature derating, 8 PV technology configurations
- **Wind Turbines**: NREL reference turbine power curves, Betz limit, wake effects, wind shear modeling

**Data Source Integration:**
- **NREL ATB**: Technology costs, efficiencies, and capacity factors with API-first access
- **Materials Project**: Band gaps, electrochemical properties, and material characteristics
- **NREL NSRDB**: Location-specific solar and wind resource data
- **Embedded Fallbacks**: All data sources include embedded reference data for offline operation

**Data Transparency**: Every simulation result includes `dataSourceInfo` showing whether values came from live APIs or embedded fallbacks, ensuring full reproducibility.

**Supported Technology Classes:**
- **Solar**: Crystalline silicon, thin-film (CdTe, CIGS), perovskite, tandem architectures
- **Wind**: Onshore, offshore fixed, floating offshore
- **Storage**: Lithium-ion chemistries, flow batteries, thermal storage, compressed air
- **Hydrogen**: PEM/alkaline/solid oxide electrolysis, fuel cells, storage systems
- **Carbon**: Direct air capture, point-source capture, mineralization, utilization
- **Other**: Geothermal, biomass conversion, advanced nuclear

### Techno-Economic Analysis Engine

The TEA module generates investor-grade financial analysis from technical parameters:

**Input Flexibility:**
- Manual parameter entry with guided forms
- File upload (PDF, Excel, CSV) with AI-powered extraction
- Direct import from simulation results
- Template library for common technology configurations

**Financial Modeling:**
- Net Present Value (NPV) with configurable discount rates
- Internal Rate of Return (IRR) calculation
- Levelized Cost of Energy/Hydrogen (LCOE/LCOH)
- Payback period under multiple scenarios
- Capacity factor sensitivity

**Advanced Analysis:**
- Tornado charts identifying key cost drivers
- Monte Carlo uncertainty propagation
- Exergy efficiency analysis (thermodynamic second-law metrics)
- Comparison against industry benchmarks

**Output:**
- Executive summary for stakeholder communication
- Detailed methodology documentation
- Publication-ready figures and tables
- Professional PDF reports

### AI Experiment Designer

Given a research hypothesis, the experiment designer generates complete laboratory protocols:

- **Materials Specification**: Chemicals, equipment, quantities with supplier references
- **Procedure Generation**: Step-by-step instructions with timing and conditions
- **Safety Analysis**: Hazard identification, required PPE, emergency procedures
- **Failure Mode Analysis**: Potential issues ranked by likelihood and impact
- **Data Collection Plan**: Measurements, frequencies, statistical requirements
- **Resource Estimation**: Cost projections, timeline, personnel requirements

The generated protocols incorporate domain knowledge from the literature search, ensuring experimental designs reflect current best practices and avoid known failure modes.

### Discovery Engine

The discovery engine identifies unexplored research opportunities by analyzing patterns across the federated data sources:

- **Gap Analysis**: Identifies research questions with sparse literature coverage
- **Cross-Domain Synthesis**: Finds techniques from adjacent fields applicable to target problems
- **Trend Detection**: Surfaces emerging research directions from recent publications
- **Hypothesis Generation**: Proposes novel research directions with supporting evidence
- **Experiment Synthesis**: Automatically generates protocols to test discovered hypotheses

Each discovery includes confidence scoring, supporting citations, and one-click experiment generation.

---

## Architecture

```
exergy-lab/
├── src/
│   ├── app/                      # Next.js 14 App Router
│   │   ├── api/                  # 40+ API endpoints
│   │   │   ├── search/           # Federated search orchestration
│   │   │   ├── simulation/       # Physics engine interfaces
│   │   │   ├── tea/              # Financial modeling
│   │   │   └── discovery/        # AI synthesis pipelines
│   │   └── (dashboard)/          # Application pages
│   ├── components/
│   │   ├── ui/                   # Design system (20+ components)
│   │   ├── search/               # Paper viewer, chat, results
│   │   ├── simulations/          # Parameter controls, visualizations
│   │   ├── tea/                  # Report builder interface
│   │   └── experiments/          # Protocol designer
│   ├── lib/
│   │   ├── ai/                   # LLM orchestration, prompt engineering
│   │   ├── simulation/           # Tiered simulation providers
│   │   │   ├── calculators/      # Physics: thermo, electrochem, PV, wind
│   │   │   ├── data-sources/     # NREL ATB, Materials Project, NSRDB
│   │   │   └── providers/        # Analytical, Modal GPU providers
│   │   ├── paper-content/        # PDF parsing, content extraction
│   │   └── store/                # Zustand state management
│   └── types/                    # TypeScript definitions
├── modal-simulations/            # GPU compute service (Modal Labs)
└── docs/                         # Technical documentation
```

**Technology Foundation:**
- **Runtime**: Next.js 14+ with App Router, React Server Components
- **Language**: TypeScript with strict mode, comprehensive type coverage
- **Styling**: Tailwind CSS with custom design system
- **State**: Zustand with localStorage persistence
- **AI**: Google Gemini (primary), OpenAI GPT-4 (fallback)
- **Compute**: Modal Labs for GPU workloads, Vercel for serverless
- **Data**: 15 federated APIs with unified query interface

---

## Getting Started

### Requirements

- Node.js 20.x or higher
- Google AI API key ([obtain here](https://makersuite.google.com/app/apikey))

### Installation

```bash
git clone https://github.com/cdimurro/exergy-lab.git
cd exergy-lab/exergy-lab
npm install
cp .env.example .env.local
# Add GOOGLE_AI_API_KEY to .env.local
npm run dev
```

Access the platform at [http://localhost:3000](http://localhost:3000)

### Configuration

```bash
# Required
GOOGLE_AI_API_KEY=your_gemini_key

# Recommended (expands data source coverage)
SEMANTIC_SCHOLAR_API_KEY=your_key
IEEE_API_KEY=your_key

# Optional (enables additional capabilities)
OPENAI_API_KEY=your_key          # Fallback LLM
MODAL_API_KEY=your_key           # GPU simulations
MODAL_ENDPOINT=your_endpoint     # Custom compute endpoint
```

---

## Use Cases

### Research Acceleration

Literature reviews that traditionally consume days complete in minutes. The federated search queries all 15 sources simultaneously, the AI synthesizes findings with inline citations, and the in-app viewer enables immediate deep dives into relevant papers. Researchers maintain flow state instead of context-switching between tools.

### Technology Validation

Before committing resources to experimental work, researchers validate concepts through progressive simulation. Tier 1 analytical models eliminate obviously non-viable approaches in seconds. Promising configurations advance to Tier 2 for refined estimates. Final candidates receive Tier 3 Monte Carlo treatment with full uncertainty quantification.

### Investment Due Diligence

Technical claims from startups and research proposals can be validated against peer-reviewed literature and independent simulation in hours rather than weeks. The platform reveals whether claimed performance metrics align with published benchmarks and physics-based expectations.

### Competitive Intelligence

Patent searches run alongside academic literature queries, revealing the IP landscape around any technology area. Cross-reference detection identifies which academic groups have filed patents, which patents cite which papers, and where white space exists for novel claims.

---

## Roadmap

### Current Release (v1.0)
- 15-source federated academic search
- AI-powered synthesis with citation tracking
- 3-tier progressive fidelity simulation with real physics
- Physics-based calculators (thermodynamics, electrochemistry, PV, wind)
- Real data integration (NREL ATB, Materials Project, NSRDB)
- Data source transparency with fallback indicators
- TEA report generator with exergy analysis
- AI experiment designer with safety analysis
- Cross-domain discovery engine
- In-app paper viewer with conversational interface

### Next Release (v1.1)
- AI-assisted simulation type selection
- Experiments-simulation bidirectional integration
- User authentication with project persistence
- Enhanced PDF parsing and figure extraction
- Collaborative workspaces for research teams

### Future Development (v2.0+)
- PostgreSQL backend for enterprise deployment
- Real-time collaboration with presence indicators
- Jupyter notebook bidirectional integration
- Python SDK for workflow automation
- Enterprise SSO and audit logging

---

## Documentation

| Resource | Description |
|----------|-------------|
| [SOURCE_AUDIT.md](SOURCE_AUDIT.md) | Data source configuration, API keys, rate limits |
| [MODAL_SETUP.md](MODAL_SETUP.md) | GPU simulation infrastructure setup |
| [docs/USER_GUIDE.md](docs/USER_GUIDE.md) | Feature documentation and tutorials |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md) | API endpoint specifications |
| [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) | Contributing guidelines |

---

## Contributing

Contributions welcome across all areas:

- **Simulation Models**: Additional technology types, improved physics fidelity
- **Data Sources**: New academic API integrations
- **AI Capabilities**: Enhanced synthesis, better extraction
- **Documentation**: Tutorials, examples, translations

See [DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) for development setup.

---

## License

MIT License - see [LICENSE](LICENSE)

---

## Citation

```bibtex
@software{exergy_lab_2024,
  title = {Exergy Lab: Integrated Research Platform for Clean Energy Discovery},
  author = {DiMurro, Chris},
  year = {2024},
  url = {https://github.com/cdimurro/exergy-lab}
}
```

---

<p align="center">
  <a href="https://exergy-lab.vercel.app"><strong>exergy-lab.vercel.app</strong></a>
</p>
