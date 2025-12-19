# Scientific Databases Reference

## Primary Academic Databases

### 1. arXiv (Open Access Preprints)
- **URL**: https://arxiv.org
- **Categories**: cond-mat (condensed matter), physics.chem-ph, physics.app-ph
- **Query Pattern**: `site:arxiv.org {query} {year}`
- **Strengths**: Latest preprints, fast publication, open access
- **Update Frequency**: Daily

### 2. PubMed / PMC
- **URL**: https://pubmed.ncbi.nlm.nih.gov
- **Coverage**: Biomedical, biochemistry, biofuels, environmental
- **Query Pattern**: `{query} AND ("energy"[MeSH] OR "renewable"[tiab])`
- **Strengths**: Peer-reviewed, comprehensive metadata
- **Use For**: Biofuels, bio-based materials, environmental impact

### 3. Google Scholar
- **URL**: https://scholar.google.com
- **Coverage**: All domains, citations, grey literature
- **Query Pattern**: `"{exact phrase}" OR {keyword1} {keyword2} filetype:pdf`
- **Strengths**: Widest coverage, citation counts
- **Limitations**: Less structured metadata

### 4. Semantic Scholar
- **URL**: https://www.semanticscholar.org
- **API**: Free API with 100 requests/5 minutes
- **Query Pattern**: Use fields=title,abstract,year,citationCount,authors
- **Strengths**: AI-extracted entities, influence scores
- **Use For**: Citation analysis, research trends

### 5. Web of Science
- **Coverage**: High-impact journals only
- **Strengths**: Impact factors, thorough peer review
- **Limitations**: Requires institutional access
- **Use For**: Validating claims with high-impact sources

### 6. Scopus
- **Coverage**: Engineering, materials science, energy
- **Strengths**: Strong engineering coverage, author profiles
- **Use For**: Materials characterization, device engineering

## Domain-Specific Databases

### 7. Nature Energy / Nature Materials
- **Focus**: High-impact energy research breakthroughs
- **Query Pattern**: `site:nature.com/nenergy OR site:nature.com/nmat {query}`
- **Use For**: State-of-the-art benchmarks, breakthrough discoveries

### 8. Joule (Cell Press)
- **Focus**: Applied energy research, commercialization
- **Query Pattern**: `site:cell.com/joule {query}`
- **Use For**: TEA studies, scale-up considerations

### 9. Energy & Environmental Science (RSC)
- **Focus**: Renewable energy, environmental applications
- **Query Pattern**: `site:pubs.rsc.org/en/journals/journal/ee {query}`
- **Use For**: Efficiency records, lifecycle analysis

### 10. ACS Energy Letters
- **Focus**: Rapid communications, emerging technologies
- **Query Pattern**: `site:pubs.acs.org/journal/aelccp {query}`
- **Use For**: Latest efficiency records, novel materials

### 11. Journal of Power Sources (Elsevier)
- **Focus**: Batteries, fuel cells, supercapacitors
- **Use For**: Battery cycling data, power density benchmarks

### 12. Electrochimica Acta
- **Focus**: Electrochemistry, electrolysis, corrosion
- **Use For**: Electrolyzer performance, catalyst activity

## Materials Databases

### 13. Materials Project
- **URL**: https://materialsproject.org
- **API**: Free with registration
- **Data**: Crystal structures, band gaps, formation energies
- **Query Pattern**: `mp.get_entries(chemsys="{element1}-{element2}")`
- **Use For**: Thermodynamic stability, electronic properties, phase diagrams

### 14. NREL Materials Database
- **URL**: https://materials.nrel.gov
- **Focus**: Photovoltaic materials, thermoelectrics
- **Use For**: Solar absorber properties, band alignment

### 15. AFLOW
- **URL**: http://aflowlib.org
- **Data**: High-throughput DFT calculations
- **Use For**: Alloy properties, convex hull stability

## Patent Databases

### 16. Google Patents
- **URL**: https://patents.google.com
- **Query Pattern**: `{query} before:{year} after:{year-5}`
- **Use For**: Commercial applications, prior art search

### 17. USPTO / EPO / WIPO
- **Coverage**: International patents
- **Use For**: Freedom-to-operate analysis, licensing landscape

## Report & Standards Databases

### 18. DOE EERE
- **URL**: https://www.energy.gov/eere
- **Coverage**: US energy programs, roadmaps, targets
- **Use For**: Government targets, funding priorities

### 19. IEA Reports
- **URL**: https://www.iea.org
- **Coverage**: Global energy statistics, projections
- **Use For**: Market analysis, deployment trends

### 20. IRENA Reports
- **URL**: https://www.irena.org
- **Coverage**: Renewable energy costs, capacity
- **Use For**: LCOE benchmarks, global deployment data

## Query Optimization by Domain

### Solar Energy
```
Primary: arXiv cond-mat, Nature Energy, Joule
Keywords: perovskite, tandem, bifacial, degradation, encapsulation
Metrics: PCE (%), Voc (V), Jsc (mA/cm²), FF (%), stability (hours)
```

### Battery Storage
```
Primary: J. Power Sources, ACS Energy Letters, Nature Energy
Keywords: solid-state, lithium-metal, dendrite, SEI, cycle life
Metrics: Wh/kg, Wh/L, C-rate, capacity retention (%), cycles
```

### Hydrogen / Fuel Cells
```
Primary: Electrochimica Acta, J. Electrochemical Society
Keywords: PEM, SOEC, alkaline, catalyst loading, overpotential
Metrics: A/cm², mV/decade, mg/cm², Faradaic efficiency (%)
```

### Carbon Capture
```
Primary: Applied Energy, Carbon Capture Science & Technology
Keywords: DAC, amine, MOF, adsorption, regeneration
Metrics: mmol/g, kJ/mol, $/tCO2, selectivity
```

### Grid Integration
```
Primary: IEEE Trans., Applied Energy, Renewable & Sustainable Energy Reviews
Keywords: intermittency, dispatch, frequency regulation, ancillary
Metrics: MW, MWh, $/kWh, ramp rate, response time
```

## Search Strategy Template

```
1. Start with arXiv + Google Scholar for breadth
2. Filter to domain-specific journals for depth
3. Check Materials Project for property data
4. Search patents for commercial landscape
5. Verify with DOE/IEA reports for context
```
