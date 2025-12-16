# Exergy Lab User Guide

Welcome to Exergy Lab, your AI-powered clean energy research platform. This guide will help you understand and use all the features available.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Search Feature](#search-feature)
4. [TEA Generator](#tea-generator)
5. [Experiments](#experiments)
6. [Simulations](#simulations)
7. [Discovery Engine](#discovery-engine)
8. [Tips & Best Practices](#tips--best-practices)

---

## Getting Started

### First Time Users

When you first log in to Exergy Lab, you'll see an onboarding checklist on your dashboard guiding you through the key features:

1. **Run your first Search** - Find academic papers across multiple databases
2. **Design an Experiment** - Generate AI-powered experiment protocols
3. **Generate a TEA Report** - Create techno-economic analysis reports
4. **Run a Simulation** - Execute computational simulations using our 3-tier system
5. **Try the Discovery Engine** - Find novel cross-domain innovations

Each item in the checklist has a "Go" button that takes you directly to that feature.

### Navigation

The left sidebar contains all main features:
- **Dashboard** - Overview of your activity and quick actions
- **Search** - Academic paper and research search
- **TEA Reports** - Techno-economic analysis generator
- **Experiments** - AI-powered experiment protocol designer
- **Simulations** - Multi-tier computational simulation engine
- **Discovery** - Cross-domain innovation discovery tool
- **Settings** - Account and preferences (coming soon)
- **Help** - Documentation and support

---

## Dashboard Overview

The dashboard is your command center, showing:

### Activity Stats
Four key metrics tracking your usage:
- **Searches** - Total research searches performed
- **Experiments** - Number of experiments designed
- **TEA Reports** - Reports generated
- **Discoveries** - Novel innovations discovered

### Quick Actions
Fast access cards for each major feature with descriptions and one-click navigation.

### Recent Activity
Timeline of your recent work across all features, showing:
- Project type (search, experiment, TEA, simulation, discovery)
- Project title
- Timestamp
- Current status

### Pro Tips
Helpful suggestions for getting the most out of the platform:
- Use Discovery Engine for cross-domain innovation
- Upload data files to TEA Reports for AI extraction
- Start with Tier 1 simulations before upgrading

---

## Search Feature

**Location:** `/search` page

### Overview
Search across multiple academic databases simultaneously to find relevant research papers, patents, and technical reports.

### How to Use

1. **Enter Search Query**
   - Type your research topic or keywords
   - Be specific for better results
   - Use technical terms when applicable

2. **Select Filters** (if available)
   - Publication date range
   - Source types (papers, patents, preprints)
   - Research domains

3. **View Results**
   Results are aggregated from:
   - **Semantic Scholar** - Academic papers with citations
   - **arXiv** - Preprint servers for latest research
   - **USPTO** - Patent database
   - **NewsAPI** - Industry news and developments

4. **Save & Export**
   - Bookmark important papers
   - Export citations in various formats
   - Add to your research collections

### Search Tips

- **Use quotes** for exact phrases: `"perovskite solar cells"`
- **Combine terms** with AND/OR: `hydrogen AND electrolysis`
- **Domain-specific searches** yield better results than general terms
- **Check recent papers** (last 2 years) for cutting-edge research

---

## TEA Generator

**Location:** `/tea-generator` page

### Overview
Generate comprehensive Techno-Economic Analysis (TEA) reports for clean energy projects using AI-powered analysis.

### Features

1. **Manual Entry**
   - Input project parameters manually
   - Define technology specifications
   - Set economic assumptions
   - Configure analysis scope

2. **File Upload**
   - Upload existing data files (CSV, Excel, PDF)
   - AI extracts parameters automatically
   - Review and adjust extracted data
   - Supports multiple file formats

3. **Report Generation**
   The generated report includes:
   - **Executive Summary** - Key findings and recommendations
   - **Technology Overview** - Technical specifications and performance
   - **Cost Analysis** - CAPEX, OPEX breakdown with detailed itemization
   - **Economic Metrics** - NPV, IRR, payback period, LCOE
   - **Sensitivity Analysis** - Impact of key variables
   - **Risk Assessment** - Technical and market risks
   - **Recommendations** - Strategic guidance for project success

### How to Generate a Report

**Step 1: Choose Input Method**
- Manual: Fill out the form with project details
- Upload: Drag and drop data files

**Step 2: Review Parameters**
- Technology type (solar, wind, battery, hydrogen, etc.)
- Project scale (capacity, output)
- Location and timeline
- Cost assumptions
- Energy prices

**Step 3: Configure Analysis**
- Discount rate
- Project lifetime
- Inflation assumptions
- Sensitivity variables to analyze

**Step 4: Generate & Review**
- Click "Generate Report"
- Wait for AI processing (30-60 seconds)
- Review all sections
- Download as PDF or export data

### Best Practices

- **Validate AI-extracted data** - Always review parameters extracted from uploads
- **Use realistic assumptions** - Base costs and prices on market data
- **Run sensitivity analysis** - Test multiple scenarios (optimistic, base, pessimistic)
- **Update regularly** - Regenerate reports when market conditions change
- **Include references** - Document data sources for credibility

---

## Experiments

**Location:** `/experiments` page

### Overview
Design rigorous experiment protocols using AI assistance, from hypothesis generation to detailed methodology.

### How to Use

1. **Start New Experiment**
   - Click "New Experiment" button
   - Enter your research question or hypothesis

2. **AI-Generated Protocol**
   The AI will create a complete protocol including:
   - **Hypothesis** - Clear, testable statement
   - **Objectives** - Primary and secondary goals
   - **Materials & Equipment** - Complete list with specifications
   - **Procedure** - Step-by-step methodology
   - **Safety Considerations** - Hazard warnings and precautions
   - **Data Collection** - Measurements, frequency, methods
   - **Analysis Plan** - Statistical methods and success criteria
   - **Timeline** - Estimated duration for each phase

3. **Review & Customize**
   - Edit any section
   - Add custom steps or materials
   - Adjust safety protocols
   - Modify timeline

4. **Export Protocol**
   - Download as PDF
   - Export to lab notebook format
   - Share with collaborators

### Special Features

**Failure Mode Analysis**
- Identifies potential failure points
- Assigns risk scores (low, medium, high, critical)
- Provides mitigation strategies
- Estimates failure probability and impact

**Resource Calculator**
- Estimates material quantities
- Calculates costs
- Suggests suppliers
- Identifies alternatives

**Auto-Save**
- Drafts saved every 30 seconds
- Resume work anytime
- Version history (coming soon)

---

## Simulations

**Location:** `/simulations` page

### Overview
Run computational simulations for clean energy systems using our innovative 3-tier architecture.

### Three Tier System

#### Tier 1: Local (JavaScript)
- **Speed:** ~10 seconds
- **Cost:** Free
- **Accuracy:** ±20%
- **Best for:** Quick estimates, concept validation, learning
- **How it works:** Browser-based calculations using simplified models

#### Tier 2: Browser AI (Gemini/OpenAI)
- **Speed:** ~2 minutes
- **Cost:** Free (included in platform)
- **Accuracy:** ±10%
- **Best for:** Detailed analysis, optimization studies, presentations
- **How it works:** AI predictions based on trained models with physics constraints

#### Tier 3: Cloud GPU (Modal Labs)
- **Speed:** ~5-10 minutes
- **Cost:** $0.50 - $2.00 per simulation
- **Accuracy:** ±2%
- **Best for:** Final designs, publications, regulatory submissions
- **How it works:** Monte Carlo simulations on A100 GPUs with full physics

### Running a Simulation

**Step 1: Select Tier**
- Choose based on your needs (speed vs. accuracy vs. cost)
- See cost estimate before running Tier 3
- Start with Tier 1 to validate setup

**Step 2: Configure Parameters**
- System type (solar, wind, battery, hydrogen, etc.)
- Operating conditions (temperature, pressure, flow rates)
- Materials and specifications
- Boundary conditions

**Step 3: Run Simulation**
- Click "Run Simulation"
- Monitor progress in real-time
- View live updates (Tier 3 only)

**Step 4: Analyze Results**
Results include:
- **Performance Metrics** - Efficiency, output, losses
- **Visualizations** - Charts, graphs, heatmaps
- **Sensitivity Analysis** - Impact of parameter variations
- **Optimization Suggestions** - AI-recommended improvements
- **Raw Data** - Export for further analysis

### Simulation Tips

- **Always start with Tier 1** to catch input errors quickly
- **Use Tier 2 for most work** - good accuracy, no cost
- **Reserve Tier 3 for critical analyses** - publications, final designs
- **Compare tiers** using the comparison feature (up to 4 simulations)
- **Save simulation configs** for future use
- **Check cost estimates** before running Tier 3

### Cost Management

- **Preview costs** before running Tier 3 simulations
- **Daily spending limit:** $10 per user (default)
- **Cost history:** Track spending in dashboard
- **Optimization:** Tier 2 often sufficient, saving Tier 3 costs

---

## Discovery Engine

**Location:** `/discovery` page

### Overview
Discover novel innovations by combining ideas from multiple domains using AI-powered cross-domain synthesis.

### How It Works

The Discovery Engine uses a unique multi-step process:

1. **Domain Selection**
   Choose 2-4 research domains to explore:
   - Solar energy
   - Wind power
   - Battery storage
   - Hydrogen systems
   - Geothermal
   - Biomass
   - Carbon capture
   - Energy efficiency
   - Grid optimization
   - Materials science

2. **Idea Generation**
   AI analyzes each domain and generates:
   - Current challenges and gaps
   - Emerging technologies
   - Cross-domain opportunities
   - Novel combinations
   - Potential innovations

3. **Multi-Domain Search**
   Automatic parallel search across:
   - **Academic papers** (Semantic Scholar)
   - **Preprints** (arXiv)
   - **Patents** (USPTO)
   - **News** (NewsAPI)

   Results show evidence for each innovation idea.

4. **Innovation Synthesis**
   For each promising idea, get:
   - **Description** - What is the innovation?
   - **Cross-domain connection** - How domains combine
   - **Technical feasibility** - Can it be built?
   - **Impact potential** - How significant?
   - **Supporting evidence** - Papers, patents backing the concept
   - **Next steps** - How to pursue further

### Example Use Cases

**Solar + Materials Science**
- Discovered: Novel perovskite stabilization using aerospace coating techniques
- Result: Improved lifetime and efficiency

**Hydrogen + Carbon Capture**
- Discovered: Direct CO2 to hydrogen conversion using novel catalysts
- Result: Eliminates separate capture step

**Wind + Grid Optimization**
- Discovered: AI-predicted maintenance using vibration patterns from telecom sector
- Result: Reduced downtime and costs

### Best Practices

- **Select related domains** - Some overlap increases success rate
- **Review all generated ideas** - Don't dismiss unusual combinations
- **Check evidence quality** - Higher citation counts = more validated
- **Follow up with experiments** - Generate protocols for top ideas
- **Run TEA analysis** - Evaluate economic viability
- **Save discoveries** - Build your innovation library

---

## Tips & Best Practices

### General Platform Usage

**Workflow Integration**
1. Start with **Discovery** to find innovation ideas
2. Use **Search** to research background and state-of-art
3. Generate **Experiments** to test promising concepts
4. Run **Simulations** to optimize designs
5. Create **TEA Reports** to evaluate economics
6. Iterate based on results

**Data Management**
- All work is auto-saved every 30 seconds
- Download important results immediately
- Export data in multiple formats
- Keep local backups of critical projects

**Collaboration**
- Share report PDFs with collaborators
- Export raw data for team analysis
- Use screenshots for presentations
- Document assumptions for reproducibility

### Getting Help

**In-App Resources**
- Hover tooltips on all features
- Example templates for each tool
- Pro tips on dashboard
- This user guide

**Common Issues**

*"Simulation failed"*
- Check parameter ranges (must be realistic)
- Verify all required fields filled
- Try Tier 1 first to validate setup
- Contact support if persists

*"AI extraction incomplete"*
- Ensure uploaded files are readable (not scanned images)
- Check file format (PDF, CSV, Excel supported)
- Manually enter missing parameters
- Try re-uploading with better quality

*"Search returns no results"*
- Broaden search terms
- Check spelling of technical terms
- Try alternative terminology
- Ensure internet connection stable

**Contact Support**
- Email: support@exergylab.com
- GitHub Issues: [github.com/your-repo/issues](https://github.com)
- Response time: Within 24 hours

---

## Keyboard Shortcuts

- `⌘K` or `Ctrl+K` - Quick search
- `⌘S` or `Ctrl+S` - Save current work
- `Esc` - Close modals/dialogs
- `Tab` - Navigate between form fields
- `Enter` - Submit forms/start actions

---

## Account & Billing

### Free Tier
- Unlimited Tier 1 & 2 simulations
- Unlimited searches, experiments, TEA reports
- Discovery engine access
- 5 GB storage
- Email support

### Premium Tier (Coming Soon)
- All Free features plus:
- Tier 3 simulations included (10/month)
- Unlimited storage
- Priority support
- Team collaboration features
- Advanced analytics

---

## Privacy & Data Security

- All data encrypted at rest and in transit
- No data sold to third parties
- Optional data sharing for model improvement
- GDPR and CCPA compliant
- Regular security audits

---

## Updates & Changelog

Check our [CHANGELOG.md](./CHANGELOG.md) for:
- New features
- Bug fixes
- Performance improvements
- Breaking changes

---

## Feedback

We value your feedback! Help us improve:
- Feature requests: [GitHub Discussions](https://github.com)
- Bug reports: [GitHub Issues](https://github.com)
- General feedback: feedback@exergylab.com

---

**Last Updated:** December 2024
**Version:** 1.0.0
**License:** MIT
