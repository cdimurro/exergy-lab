"""
Patent Landscape Analysis Service.

Provides patent search and analysis for clean energy technologies.

Features:
- Patent search via Google Patents (public data)
- Patent landscape mapping
- Technology trend analysis
- Freedom to operate insights
- White space identification
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from datetime import datetime
import httpx

from app.services.ai_service import ai_service


@dataclass
class Patent:
    """Patent record."""

    patent_id: str
    title: str
    abstract: str
    applicant: str
    inventors: List[str]
    filing_date: Optional[str] = None
    publication_date: Optional[str] = None
    priority_date: Optional[str] = None
    classification: List[str] = field(default_factory=list)  # IPC/CPC codes
    claims_count: int = 0
    status: str = "unknown"  # granted, pending, expired
    jurisdiction: str = "US"
    url: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "patent_id": self.patent_id,
            "title": self.title,
            "abstract": self.abstract,
            "applicant": self.applicant,
            "inventors": self.inventors,
            "filing_date": self.filing_date,
            "publication_date": self.publication_date,
            "priority_date": self.priority_date,
            "classification": self.classification,
            "claims_count": self.claims_count,
            "status": self.status,
            "jurisdiction": self.jurisdiction,
            "url": self.url,
        }


@dataclass
class PatentLandscape:
    """Patent landscape analysis result."""

    technology_area: str
    total_patents: int
    date_range: str
    top_applicants: List[Dict[str, Any]]
    classification_breakdown: Dict[str, int]
    filing_trends: Dict[str, int]  # year -> count
    key_patents: List[Patent]
    technology_clusters: List[Dict[str, Any]]
    white_space_opportunities: List[str]
    analysis_summary: str
    generated_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "technology_area": self.technology_area,
            "total_patents": self.total_patents,
            "date_range": self.date_range,
            "top_applicants": self.top_applicants,
            "classification_breakdown": self.classification_breakdown,
            "filing_trends": self.filing_trends,
            "key_patents": [p.to_dict() for p in self.key_patents],
            "technology_clusters": self.technology_clusters,
            "white_space_opportunities": self.white_space_opportunities,
            "analysis_summary": self.analysis_summary,
            "generated_at": self.generated_at.isoformat(),
        }


# Clean energy patent classification codes (IPC/CPC)
CLEAN_ENERGY_CLASSIFICATIONS = {
    "solar": {
        "H01L31": "Semiconductor PV devices",
        "H02S": "Generation of electric power by solar radiation",
        "F24S": "Solar heat collectors",
        "C01B33": "Silicon for solar cells",
    },
    "wind": {
        "F03D": "Wind motors",
        "H02K7": "Wind turbine generators",
        "B63H13": "Offshore wind installations",
    },
    "battery": {
        "H01M10": "Secondary cells/batteries",
        "H01M4": "Electrodes",
        "H01M50": "Structural parts for batteries",
        "H02J7": "Battery charging/discharging",
    },
    "hydrogen": {
        "C01B3": "Hydrogen production",
        "C25B1": "Electrolytic hydrogen",
        "H01M8": "Fuel cells",
        "F17C": "Hydrogen storage",
    },
    "energy_storage": {
        "H02J3": "Power distribution with storage",
        "H02J15": "Grid energy storage",
        "F28D20": "Thermal energy storage",
    },
    "carbon_capture": {
        "B01D53": "Gas separation/CO2 capture",
        "C01B32": "Carbon compounds",
        "F23J15": "Flue gas treatment",
    },
}


class PatentService:
    """
    Patent landscape analysis for clean energy technologies.

    Note: Uses simulated/mock data as Google Patents doesn't have a public API.
    In production, integrate with:
    - USPTO PatentsView API
    - EPO Open Patent Services
    - WIPO PATENTSCOPE
    """

    def __init__(self):
        self.ai = ai_service
        self.classifications = CLEAN_ENERGY_CLASSIFICATIONS

    async def search_patents(
        self,
        query: str,
        technology_area: Optional[str] = None,
        limit: int = 50,
        year_from: Optional[int] = None,
        year_to: Optional[int] = None,
    ) -> List[Patent]:
        """
        Search for patents in a technology area.

        Args:
            query: Search terms
            technology_area: Optional technology filter (solar, wind, battery, etc.)
            limit: Maximum results
            year_from: Start year filter
            year_to: End year filter
        """
        # In production, this would call USPTO PatentsView API
        # For now, generate realistic mock data

        patents = self._generate_mock_patents(
            query=query,
            technology_area=technology_area,
            limit=limit,
            year_from=year_from,
            year_to=year_to,
        )

        return patents

    def _generate_mock_patents(
        self,
        query: str,
        technology_area: Optional[str],
        limit: int,
        year_from: Optional[int],
        year_to: Optional[int],
    ) -> List[Patent]:
        """Generate realistic mock patent data for demo purposes."""
        # Base patents for different technology areas
        technology_patents = {
            "solar": [
                Patent(
                    patent_id="US11,476,378",
                    title="Perovskite-Silicon Tandem Solar Cell with Enhanced Stability",
                    abstract="A tandem solar cell comprising a perovskite top cell and silicon bottom cell with improved interface engineering for enhanced long-term stability.",
                    applicant="First Solar Inc.",
                    inventors=["J. Smith", "A. Johnson"],
                    filing_date="2021-03-15",
                    publication_date="2022-10-18",
                    classification=["H01L31/0504", "H01L31/048"],
                    claims_count=24,
                    status="granted",
                ),
                Patent(
                    patent_id="US11,362,229",
                    title="Bifacial Solar Module with Anti-Reflective Coating",
                    abstract="A bifacial photovoltaic module with novel anti-reflective coating that increases rear-side energy capture by 15%.",
                    applicant="SunPower Corporation",
                    inventors=["M. Chen", "R. Williams"],
                    filing_date="2020-08-22",
                    publication_date="2022-06-14",
                    classification=["H02S40/22", "H01L31/0216"],
                    claims_count=18,
                    status="granted",
                ),
            ],
            "battery": [
                Patent(
                    patent_id="US11,502,295",
                    title="Solid-State Lithium Battery with Ceramic Electrolyte",
                    abstract="A solid-state battery using garnet-type ceramic electrolyte with improved ionic conductivity and electrode interface stability.",
                    applicant="QuantumScape Corporation",
                    inventors=["T. Lee", "S. Park"],
                    filing_date="2020-11-05",
                    publication_date="2022-11-15",
                    classification=["H01M10/052", "H01M10/0562"],
                    claims_count=32,
                    status="granted",
                ),
                Patent(
                    patent_id="US11,411,217",
                    title="Silicon-Carbon Anode for High Energy Density Batteries",
                    abstract="An anode comprising silicon nanoparticles embedded in carbon matrix, achieving 400 Wh/kg energy density.",
                    applicant="Tesla Inc.",
                    inventors=["E. Thompson", "K. Brown"],
                    filing_date="2021-01-20",
                    publication_date="2022-08-09",
                    classification=["H01M4/386", "H01M4/133"],
                    claims_count=28,
                    status="granted",
                ),
            ],
            "hydrogen": [
                Patent(
                    patent_id="US11,447,878",
                    title="High-Efficiency PEM Electrolyzer with Catalyst Recovery",
                    abstract="A proton exchange membrane electrolyzer with novel catalyst configuration achieving 85% efficiency with platinum recovery system.",
                    applicant="Nel Hydrogen",
                    inventors=["H. Anderson", "L. Martinez"],
                    filing_date="2020-09-10",
                    publication_date="2022-09-20",
                    classification=["C25B1/04", "C25B9/23"],
                    claims_count=22,
                    status="granted",
                ),
            ],
            "wind": [
                Patent(
                    patent_id="US11,396,862",
                    title="Vertical Axis Wind Turbine with Active Pitch Control",
                    abstract="A VAWT design with real-time blade pitch adjustment for optimal power extraction across wind speed ranges.",
                    applicant="Vestas Wind Systems",
                    inventors=["P. Nielsen", "F. Sorensen"],
                    filing_date="2020-06-18",
                    publication_date="2022-07-26",
                    classification=["F03D3/06", "F03D7/022"],
                    claims_count=20,
                    status="granted",
                ),
            ],
        }

        # Get relevant patents
        selected_patents = []

        if technology_area and technology_area.lower() in technology_patents:
            selected_patents = technology_patents[technology_area.lower()]
        else:
            # Include from all categories
            for patents in technology_patents.values():
                selected_patents.extend(patents)

        # Generate additional mock patents based on query
        for i in range(min(limit - len(selected_patents), 10)):
            selected_patents.append(Patent(
                patent_id=f"US{11_000_000 + i:,}".replace(",", ","),
                title=f"Method and System for {query.title()} Optimization",
                abstract=f"An improved method for {query} in clean energy applications with enhanced efficiency.",
                applicant=["General Electric", "Siemens Energy", "ABB"][i % 3],
                inventors=["Inventor A", "Inventor B"],
                filing_date=f"202{i % 4}-{(i % 12) + 1:02d}-15",
                publication_date=f"202{i % 4 + 1}-{(i % 12) + 1:02d}-20",
                classification=["H02J3/38", "H02J7/00"],
                claims_count=15 + i,
                status="granted" if i % 3 != 2 else "pending",
            ))

        return selected_patents[:limit]

    async def analyze_landscape(
        self,
        technology_area: str,
        years: int = 5,
    ) -> PatentLandscape:
        """
        Generate comprehensive patent landscape analysis.

        Args:
            technology_area: Technology to analyze (solar, wind, battery, etc.)
            years: Number of years to analyze
        """
        # Search for patents
        patents = await self.search_patents(
            query=technology_area,
            technology_area=technology_area,
            limit=100,
            year_from=2024 - years,
        )

        # Analyze applicants
        applicant_counts = {}
        for patent in patents:
            applicant_counts[patent.applicant] = applicant_counts.get(patent.applicant, 0) + 1

        top_applicants = [
            {"name": name, "patent_count": count}
            for name, count in sorted(applicant_counts.items(), key=lambda x: -x[1])[:10]
        ]

        # Analyze classifications
        classification_breakdown = {}
        classifications = self.classifications.get(technology_area.lower(), {})
        for code, description in classifications.items():
            matching = sum(1 for p in patents if any(code in c for c in p.classification))
            if matching > 0:
                classification_breakdown[description] = matching

        # Analyze filing trends
        filing_trends = {}
        for patent in patents:
            if patent.filing_date:
                year = patent.filing_date[:4]
                filing_trends[year] = filing_trends.get(year, 0) + 1

        # Identify key patents (most claims = typically most important)
        key_patents = sorted(patents, key=lambda p: p.claims_count, reverse=True)[:5]

        # Generate AI analysis
        analysis_summary = await self._generate_landscape_analysis(
            technology_area=technology_area,
            total_patents=len(patents),
            top_applicants=top_applicants,
            filing_trends=filing_trends,
        )

        # Identify technology clusters
        technology_clusters = self._identify_clusters(patents)

        # Identify white space
        white_spaces = self._identify_patent_white_space(
            technology_area=technology_area,
            patents=patents,
        )

        # Determine date range
        dates = [p.filing_date for p in patents if p.filing_date]
        date_range = f"{min(dates)[:4]}-{max(dates)[:4]}" if dates else "N/A"

        return PatentLandscape(
            technology_area=technology_area,
            total_patents=len(patents),
            date_range=date_range,
            top_applicants=top_applicants,
            classification_breakdown=classification_breakdown,
            filing_trends=dict(sorted(filing_trends.items())),
            key_patents=key_patents,
            technology_clusters=technology_clusters,
            white_space_opportunities=white_spaces,
            analysis_summary=analysis_summary,
        )

    async def _generate_landscape_analysis(
        self,
        technology_area: str,
        total_patents: int,
        top_applicants: List[Dict[str, Any]],
        filing_trends: Dict[str, int],
    ) -> str:
        """Generate AI-powered landscape analysis."""
        applicants_str = ", ".join([f"{a['name']} ({a['patent_count']})" for a in top_applicants[:5]])
        trends_str = ", ".join([f"{y}: {c}" for y, c in sorted(filing_trends.items())])

        prompt = f"""Analyze this patent landscape for {technology_area} technology:

Total Patents: {total_patents}
Top Applicants: {applicants_str}
Filing Trends by Year: {trends_str}

Provide a 2-3 paragraph analysis covering:
1. Market concentration and competitive dynamics
2. Innovation trajectory and emerging trends
3. Strategic implications for new entrants

Be specific and data-driven."""

        try:
            analysis = await self.ai.generate(
                prompt=prompt,
                model="haiku",  # Use Haiku for fast, cost-effective analysis
                max_tokens=800,
            )
            return analysis
        except Exception:
            return f"Patent landscape for {technology_area}: {total_patents} patents analyzed from {len(top_applicants)} major applicants. Market shows {'increasing' if filing_trends.get('2023', 0) > filing_trends.get('2021', 0) else 'stable'} innovation activity."

    def _identify_clusters(self, patents: List[Patent]) -> List[Dict[str, Any]]:
        """Identify technology clusters from patents."""
        # Simple clustering based on classification codes
        clusters = {}

        for patent in patents:
            for code in patent.classification[:1]:  # Primary classification
                code_prefix = code[:4] if len(code) >= 4 else code
                if code_prefix not in clusters:
                    clusters[code_prefix] = {
                        "code": code_prefix,
                        "patents": [],
                        "count": 0,
                    }
                clusters[code_prefix]["patents"].append(patent.title)
                clusters[code_prefix]["count"] += 1

        # Sort by count and return top clusters
        sorted_clusters = sorted(clusters.values(), key=lambda c: c["count"], reverse=True)

        return [
            {
                "classification": c["code"],
                "patent_count": c["count"],
                "representative_patents": c["patents"][:3],
            }
            for c in sorted_clusters[:5]
        ]

    def _identify_patent_white_space(
        self,
        technology_area: str,
        patents: List[Patent],
    ) -> List[str]:
        """Identify patent white space opportunities."""
        # Define known gaps by technology area
        white_space_map = {
            "solar": [
                "Perovskite stability solutions for >25 year lifetime",
                "Low-cost tandem cell manufacturing processes",
                "Building-integrated PV aesthetics and efficiency",
                "Solar cell recycling at scale",
            ],
            "battery": [
                "Solid-state battery mass manufacturing",
                "Cobalt-free cathode materials at scale",
                "Fast-charging without degradation (>1000 cycles at 4C)",
                "Battery-to-grid integration standards",
            ],
            "hydrogen": [
                "Low-platinum or platinum-free electrolyzers",
                "Hydrogen storage at ambient conditions",
                "Direct solar-to-hydrogen conversion >20% efficiency",
                "Hydrogen pipeline embrittlement solutions",
            ],
            "wind": [
                "Floating offshore wind for deep water (>60m)",
                "Blade recycling and circular economy",
                "Low-wind-speed turbine optimization",
                "Bird/bat collision prevention systems",
            ],
            "carbon_capture": [
                "Direct air capture below $100/ton",
                "CO2 mineralization in concrete at scale",
                "Biogenic carbon capture and storage",
                "Carbon utilization for high-value products",
            ],
        }

        return white_space_map.get(technology_area.lower(), [
            "Integration with existing infrastructure",
            "Cost reduction through manufacturing innovation",
            "Lifecycle and recycling improvements",
            "Digital twin and predictive maintenance",
        ])

    async def freedom_to_operate_analysis(
        self,
        technology_description: str,
        target_markets: List[str] = None,
    ) -> Dict[str, Any]:
        """
        Preliminary freedom-to-operate analysis.

        Note: This is informational only - not legal advice.
        Always consult a patent attorney for actual FTO analysis.
        """
        if target_markets is None:
            target_markets = ["US", "EU", "CN"]

        # Search for potentially blocking patents
        blocking_patents = await self.search_patents(
            query=technology_description,
            limit=20,
        )

        # Analyze potential conflicts
        prompt = f"""Analyze potential patent conflicts for this technology:

TECHNOLOGY: {technology_description}

POTENTIALLY RELEVANT PATENTS:
{chr(10).join(f"- {p.patent_id}: {p.title}" for p in blocking_patents[:10])}

Provide:
1. RISK ASSESSMENT: High/Medium/Low risk of patent conflicts
2. KEY CONCERNS: Main patents or claims to investigate
3. DESIGN-AROUND OPTIONS: Potential ways to avoid infringement
4. RECOMMENDATIONS: Next steps for FTO analysis

DISCLAIMER: This is preliminary analysis only, not legal advice."""

        try:
            analysis = await self.ai.generate(
                prompt=prompt,
                model="sonnet",
                max_tokens=1500,
            )
        except Exception:
            analysis = "Freedom-to-operate analysis requires detailed review of identified patents. Consult a patent attorney."

        return {
            "technology_description": technology_description,
            "target_markets": target_markets,
            "potentially_relevant_patents": [p.to_dict() for p in blocking_patents[:10]],
            "analysis": analysis,
            "disclaimer": "This is preliminary informational analysis only. Not legal advice. Consult a qualified patent attorney for actual FTO opinions.",
        }


# Singleton instance
patent_service = PatentService()
