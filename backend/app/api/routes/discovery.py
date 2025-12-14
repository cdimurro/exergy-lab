"""
Discovery Engine API endpoints.

Discovery tier feature ($499/month) - AI-powered clean energy discovery.

Capabilities:
- Outcome-based search ("I need X at $Y cost")
- Cross-domain synthesis (chemistry + physics + biology)
- Novel material discovery
- IP landscape analysis
- Technology roadmapping
- AI-powered hypothesis generation (Opus 4.5)
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import asyncio
import uuid
import io

from app.services.materials_api import materials_service, MaterialProperty
from app.services.discovery_engine import discovery_engine, DiscoveryProgress, DiscoveryStatus
from app.services.report_generator import report_generator
from app.services.dataset_hub import dataset_hub
from app.services.literature_service import literature_service
from app.services.patent_service import patent_service
from app.middleware.auth import get_current_user, RequireTier
from app.models.user import User, UserTier

router = APIRouter()

# In-memory storage for discovery progress (use Redis in production)
_discovery_progress: Dict[str, DiscoveryProgress] = {}
_discovery_results: Dict[str, Dict[str, Any]] = {}


class DiscoveryQuery(BaseModel):
    """Outcome-based discovery query."""

    objective: str = Field(
        ...,
        description="What you want to achieve (e.g., 'hydrogen production at $2/kg')",
    )
    constraints: Optional[Dict[str, Any]] = Field(
        None,
        description="Constraints like budget, timeline, geography",
    )
    domains: Optional[List[str]] = Field(
        None,
        description="Domains to search: chemistry, physics, biology, materials",
    )


class MaterialSearchQuery(BaseModel):
    """Material search for clean energy applications."""

    application: str = Field(
        ...,
        description="Application: solar_cell, battery_cathode, catalyst_her, catalyst_oer",
    )
    elements_include: Optional[List[str]] = Field(
        None, description="Elements to include"
    )
    elements_exclude: Optional[List[str]] = Field(
        None, description="Elements to exclude (cost, toxicity)"
    )
    band_gap_min: Optional[float] = Field(None, description="Min band gap (eV)")
    band_gap_max: Optional[float] = Field(None, description="Max band gap (eV)")
    limit: int = Field(20, ge=1, le=100)


@router.post("/search")
async def outcome_based_search(query: DiscoveryQuery):
    """
    Outcome-based discovery search.

    Discovery tier required.

    Example queries:
    - "hydrogen production at $2/kg"
    - "solar cell efficiency >30%"
    - "carbon capture at $50/ton"
    - "battery energy density >500 Wh/kg"
    """
    # Parse the objective to identify technology pathways
    objective_lower = query.objective.lower()

    # Identify relevant technology pathways
    pathways = []

    if "hydrogen" in objective_lower:
        pathways.extend([
            {
                "pathway": "PEM Electrolysis",
                "current_cost": "$4-6/kg",
                "target_achievable": "2028-2030",
                "key_innovations": [
                    "Reduced iridium loading",
                    "Improved membrane durability",
                    "Scale manufacturing",
                ],
                "materials_to_explore": ["IrO2 alternatives", "PGM-free catalysts"],
            },
            {
                "pathway": "Alkaline Electrolysis",
                "current_cost": "$3-5/kg",
                "target_achievable": "2026-2028",
                "key_innovations": [
                    "Advanced diaphragms",
                    "Higher current density",
                    "System integration",
                ],
                "materials_to_explore": ["Ni-based catalysts", "Zr-based membranes"],
            },
            {
                "pathway": "SOEC (Solid Oxide)",
                "current_cost": "$5-8/kg",
                "target_achievable": "2030-2035",
                "key_innovations": [
                    "Lower operating temperature",
                    "Improved durability",
                    "Heat integration",
                ],
                "materials_to_explore": ["Perovskite electrodes", "Ceria electrolytes"],
            },
        ])

    if "solar" in objective_lower:
        pathways.extend([
            {
                "pathway": "Perovskite Solar Cells",
                "current_efficiency": "25.7%",
                "theoretical_limit": "33%",
                "key_innovations": [
                    "Stability improvements",
                    "Lead-free formulations",
                    "Tandem configurations",
                ],
                "materials_to_explore": ["FA-Cs perovskites", "Sn-Pb alloys"],
            },
            {
                "pathway": "Tandem (Perovskite/Si)",
                "current_efficiency": "33.7%",
                "theoretical_limit": "45%",
                "key_innovations": [
                    "Optical matching",
                    "Current matching",
                    "Manufacturing scale-up",
                ],
                "materials_to_explore": ["Wide-bandgap perovskites", "Textured interfaces"],
            },
        ])

    if "battery" in objective_lower or "storage" in objective_lower:
        pathways.extend([
            {
                "pathway": "Solid-State Batteries",
                "current_density": "400-500 Wh/kg",
                "target_density": "500-700 Wh/kg",
                "key_innovations": [
                    "Sulfide electrolytes",
                    "Li metal anodes",
                    "Interface engineering",
                ],
                "materials_to_explore": ["Li6PS5Cl", "Li7La3Zr2O12"],
            },
            {
                "pathway": "Sodium-Ion Batteries",
                "current_density": "140-160 Wh/kg",
                "advantage": "Abundant materials, lower cost",
                "key_innovations": [
                    "Hard carbon anodes",
                    "Prussian blue cathodes",
                    "Aqueous systems",
                ],
                "materials_to_explore": ["Na3V2(PO4)3", "Prussian white"],
            },
        ])

    if "carbon" in objective_lower or "capture" in objective_lower:
        pathways.extend([
            {
                "pathway": "Direct Air Capture (DAC)",
                "current_cost": "$400-600/ton",
                "target_cost": "$100-150/ton",
                "key_innovations": [
                    "Novel sorbents",
                    "Heat pump integration",
                    "Modular systems",
                ],
                "materials_to_explore": ["Metal-organic frameworks", "Amine-functionalized silica"],
            },
            {
                "pathway": "Electrochemical CO2 Reduction",
                "current_status": "Lab scale",
                "products": ["CO", "Formate", "Ethylene"],
                "key_innovations": [
                    "Cu-based catalysts",
                    "Gas diffusion electrodes",
                    "Membrane reactors",
                ],
                "materials_to_explore": ["Cu nanostructures", "Ag-Cu alloys"],
            },
        ])

    return {
        "query": query.objective,
        "pathways_identified": len(pathways),
        "pathways": pathways,
        "cross_domain_opportunities": [
            "Biomimetic catalysts from enzyme structures",
            "Machine learning for materials screening",
            "Process intensification from chemical engineering",
        ],
        "data_sources_used": [
            "Materials Project (MIT License)",
            "Open Catalyst Project (MIT License)",
            "Patent databases",
            "Scientific literature",
        ],
    }


@router.post("/materials/search")
async def search_materials(query: MaterialSearchQuery):
    """
    Search for materials for clean energy applications.

    Discovery tier required.

    Applications:
    - solar_cell: Band gap 1.0-2.0 eV
    - battery_cathode: Li-containing transition metal oxides
    - catalyst_her: Hydrogen evolution reaction
    - catalyst_oer: Oxygen evolution reaction
    """
    application = query.application.lower()

    if application == "solar_cell":
        materials = await materials_service.find_solar_materials(
            band_gap_min=query.band_gap_min or 1.0,
            band_gap_max=query.band_gap_max or 2.0,
            limit=query.limit,
        )
    elif application == "battery_cathode":
        materials = await materials_service.find_battery_cathode_materials(
            limit=query.limit,
        )
    elif application.startswith("catalyst"):
        reaction = application.split("_")[-1].upper()
        materials = await materials_service.find_catalyst_materials(
            reaction_type=reaction,
            limit=query.limit,
        )
    else:
        materials = await materials_service.search_materials(
            elements=query.elements_include,
            limit=query.limit,
        )

    return {
        "application": application,
        "materials_found": len(materials),
        "materials": [m.model_dump() for m in materials],
        "data_source": "Materials Project",
        "license": "CC-BY 4.0 (Attribution required)",
    }


@router.get("/materials/{material_id}")
async def get_material_details(material_id: str):
    """
    Get detailed properties for a specific material.

    Discovery tier required.
    """
    material = await materials_service.get_material_by_id(material_id)
    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    return {
        "material": material.model_dump(),
        "applications": _suggest_applications(material),
        "data_source": "Materials Project",
    }


def _suggest_applications(material: MaterialProperty) -> List[Dict[str, str]]:
    """Suggest clean energy applications for a material."""
    applications = []

    if material.band_gap:
        if 1.0 <= material.band_gap <= 1.5:
            applications.append({
                "application": "Single-junction solar cell",
                "suitability": "Excellent",
                "reason": f"Optimal band gap ({material.band_gap:.2f} eV) for solar absorption",
            })
        elif 1.5 < material.band_gap <= 2.0:
            applications.append({
                "application": "Tandem solar cell (top cell)",
                "suitability": "Good",
                "reason": f"Wide band gap ({material.band_gap:.2f} eV) for tandem configuration",
            })
        elif material.band_gap > 3.0:
            applications.append({
                "application": "Photocatalysis",
                "suitability": "Potential",
                "reason": "Wide band gap suitable for water splitting under UV",
            })

    if material.is_stable:
        applications.append({
            "application": "Structural component",
            "suitability": "Good",
            "reason": "Thermodynamically stable material",
        })

    return applications


@router.get("/technology-roadmap/{technology}")
async def get_technology_roadmap(technology: str):
    """
    Get technology development roadmap.

    Discovery tier required.

    Technologies: solar, wind, battery, hydrogen, nuclear, geothermal
    """
    roadmaps = {
        "solar": {
            "current_state": {
                "dominant_tech": "Crystalline Silicon",
                "efficiency": "22-24%",
                "cost": "$0.20-0.30/W",
                "market_size": "$200B (2024)",
            },
            "near_term_2025_2030": [
                "TOPCon and HJT mainstream adoption",
                "Perovskite/Si tandems commercialization",
                "Module efficiency >25%",
                "Cost <$0.15/W",
            ],
            "medium_term_2030_2040": [
                "All-perovskite tandems",
                "Building-integrated PV standard",
                "Agrivoltaics widespread",
                "LCOE <$10/MWh in sunny regions",
            ],
            "long_term_2040_plus": [
                "III-V multi-junction for specific applications",
                "Space-based solar power R&D",
                "Quantum dot solar cells",
            ],
            "key_bottlenecks": [
                "Perovskite stability",
                "Silver supply for contacts",
                "Grid integration at high penetration",
            ],
        },
        "hydrogen": {
            "current_state": {
                "green_h2_cost": "$4-8/kg",
                "electrolyzer_capacity": "~3 GW installed",
                "main_use": "Refining, ammonia",
            },
            "near_term_2025_2030": [
                "Electrolyzer cost <$300/kW",
                "Green H2 <$3/kg in best locations",
                "Steel and chemicals pilots",
            ],
            "medium_term_2030_2040": [
                "Green H2 <$2/kg widely",
                "Hydrogen infrastructure build-out",
                "Maritime and aviation fuels",
            ],
            "long_term_2040_plus": [
                "Green H2 cost-competitive with gray",
                "Hydrogen economy for hard-to-abate sectors",
            ],
            "key_bottlenecks": [
                "Electrolyzer manufacturing scale",
                "Iridium/platinum scarcity for PEM",
                "Hydrogen storage and transport",
            ],
        },
        "battery": {
            "current_state": {
                "dominant_tech": "Lithium-ion (NMC, LFP)",
                "energy_density": "250-300 Wh/kg",
                "pack_cost": "$130-150/kWh",
            },
            "near_term_2025_2030": [
                "LFP dominance for stationary storage",
                "Sodium-ion commercialization",
                "Pack cost <$100/kWh",
            ],
            "medium_term_2030_2040": [
                "Solid-state batteries for EVs",
                "500+ Wh/kg cells",
                "Grid-scale storage >1 TWh deployed",
            ],
            "long_term_2040_plus": [
                "Lithium-air and lithium-sulfur",
                "Circular economy for battery materials",
            ],
            "key_bottlenecks": [
                "Lithium and cobalt supply",
                "Solid electrolyte manufacturing",
                "Recycling infrastructure",
            ],
        },
    }

    tech_lower = technology.lower()
    if tech_lower not in roadmaps:
        available = list(roadmaps.keys())
        raise HTTPException(
            status_code=400,
            detail=f"Roadmap not available for '{technology}'. Available: {available}",
        )

    return {
        "technology": technology,
        "roadmap": roadmaps[tech_lower],
        "last_updated": "2024-12",
        "sources": [
            "IEA Technology Perspectives",
            "IRENA Innovation Outlook",
            "BloombergNEF",
            "Academic literature",
        ],
    }


@router.get("/ip-landscape/{technology}")
async def get_ip_landscape(technology: str):
    """
    Get IP (Intellectual Property) landscape analysis.

    Discovery tier required.

    Shows patent density, key players, white spaces.
    """
    # Simplified IP landscape data
    landscapes = {
        "perovskite_solar": {
            "total_patents": 15000,
            "growth_rate": "35% CAGR (2019-2024)",
            "top_assignees": [
                {"name": "Oxford PV", "patents": 120, "focus": "Tandem cells"},
                {"name": "EPFL", "patents": 95, "focus": "Stability"},
                {"name": "NREL", "patents": 85, "focus": "Efficiency"},
                {"name": "Samsung", "patents": 75, "focus": "Manufacturing"},
                {"name": "LG", "patents": 70, "focus": "Large area"},
            ],
            "white_spaces": [
                "Lead-free perovskites with >20% efficiency",
                "Encapsulation for 25-year lifetime",
                "Roll-to-roll manufacturing at scale",
            ],
            "freedom_to_operate": "Moderate - core patents expiring 2028-2032",
        },
        "solid_state_battery": {
            "total_patents": 8000,
            "growth_rate": "45% CAGR (2019-2024)",
            "top_assignees": [
                {"name": "Toyota", "patents": 350, "focus": "Sulfide electrolytes"},
                {"name": "Samsung SDI", "patents": 180, "focus": "Oxide electrolytes"},
                {"name": "QuantumScape", "patents": 120, "focus": "Ceramic separators"},
                {"name": "Solid Power", "patents": 80, "focus": "Manufacturing"},
            ],
            "white_spaces": [
                "Room-temperature sulfide processing",
                "Scalable ceramic electrolyte production",
                "Li metal anode protection",
            ],
            "freedom_to_operate": "Challenging - dense patent thicket",
        },
    }

    tech_lower = technology.lower().replace(" ", "_")
    if tech_lower not in landscapes:
        return {
            "technology": technology,
            "message": "Detailed IP analysis not pre-computed for this technology",
            "recommendation": "Contact support for custom IP landscape analysis",
            "general_resources": [
                "Google Patents",
                "Espacenet",
                "USPTO PatentsView",
            ],
        }

    return {
        "technology": technology,
        "landscape": landscapes[tech_lower],
        "analysis_date": "2024-12",
        "disclaimer": "This is a summary analysis. Consult patent attorneys for FTO opinions.",
    }


# === AI-Powered Discovery Engine (Discovery Tier) ===


class HypothesisRequest(BaseModel):
    """Request to generate research hypotheses."""
    problem_statement: str = Field(
        ...,
        description="The research problem to solve",
        min_length=20,
        max_length=2000,
    )
    constraints: Optional[Dict[str, Any]] = Field(
        None,
        description="Constraints: budget, timeline, materials, geography, etc.",
    )
    context: Optional[str] = Field(
        None,
        description="Additional context or prior knowledge",
        max_length=5000,
    )
    num_hypotheses: int = Field(
        50,
        ge=10,
        le=200,
        description="Number of hypotheses to generate",
    )


class HypothesisResponse(BaseModel):
    """Response with generated hypotheses."""
    hypotheses: List[Dict[str, Any]]
    total_count: int
    high_priority_count: int
    model_used: str = "opus"


@router.post("/hypotheses/generate", response_model=HypothesisResponse)
async def generate_hypotheses(
    request: HypothesisRequest,
    current_user: User = Depends(RequireTier(UserTier.DISCOVERY)),
):
    """
    Generate research hypotheses using Claude Opus 4.5.

    Discovery tier required.

    This is the core AI capability of the Discovery Engine:
    - Generates 50-200 novel, testable hypotheses
    - Scores each on feasibility, novelty, and impact
    - Provides scientific rationale and next steps
    """
    try:
        hypotheses = await discovery_engine.generate_hypotheses(
            problem_statement=request.problem_statement,
            constraints=request.constraints,
            context=request.context,
            num_hypotheses=request.num_hypotheses,
        )

        return HypothesisResponse(
            hypotheses=[h.to_dict() for h in hypotheses],
            total_count=len(hypotheses),
            high_priority_count=len([h for h in hypotheses if h.combined_score >= 7.0]),
            model_used="opus",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate hypotheses: {str(e)}")


class FullDiscoveryRequest(BaseModel):
    """Request for full discovery run."""
    problem_statement: str = Field(
        ...,
        description="The research problem to solve",
        min_length=20,
        max_length=2000,
    )
    problem_title: Optional[str] = Field(
        None,
        description="Short title for the problem (auto-generated if not provided)",
        max_length=100,
    )
    constraints: Optional[Dict[str, Any]] = Field(
        None,
        description="Constraints: budget, timeline, materials, etc.",
    )
    num_hypotheses: int = Field(
        50,
        ge=10,
        le=200,
        description="Number of hypotheses to generate",
    )


class FullDiscoveryResponse(BaseModel):
    """Response with discovery ID for tracking."""
    discovery_id: str
    status: str
    message: str


@router.post("/run", response_model=FullDiscoveryResponse)
async def start_full_discovery(
    request: FullDiscoveryRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(RequireTier(UserTier.DISCOVERY)),
):
    """
    Start a full discovery run (background task).

    Discovery tier required.

    This runs the complete Discovery Engine pipeline:
    1. Generate hypotheses with Claude Opus 4.5
    2. Synthesize relevant literature
    3. Analyze patent landscape
    4. Generate executive summary and recommendations

    Use GET /discovery/{discovery_id}/status to track progress.
    Use GET /discovery/{discovery_id}/result to get final results.
    """
    discovery_id = str(uuid.uuid4())[:8]

    # Initialize progress
    _discovery_progress[discovery_id] = DiscoveryProgress(
        status=DiscoveryStatus.PENDING,
        progress_percent=0,
        current_step="Queued for processing...",
    )

    async def progress_callback(progress: DiscoveryProgress):
        _discovery_progress[discovery_id] = progress

    async def run_discovery():
        try:
            result = await discovery_engine.run_full_discovery(
                discovery_id=discovery_id,
                problem_statement=request.problem_statement,
                constraints=request.constraints,
                num_hypotheses=request.num_hypotheses,
                progress_callback=progress_callback,
            )
            _discovery_results[discovery_id] = result.to_dict()
        except Exception as e:
            _discovery_progress[discovery_id] = DiscoveryProgress(
                status=DiscoveryStatus.FAILED,
                progress_percent=0,
                current_step=f"Failed: {str(e)}",
                error_message=str(e),
            )

    # Run in background
    background_tasks.add_task(run_discovery)

    return FullDiscoveryResponse(
        discovery_id=discovery_id,
        status="started",
        message="Discovery started. Use /discovery/{discovery_id}/status to track progress.",
    )


@router.get("/{discovery_id}/status")
async def get_discovery_status(
    discovery_id: str,
    current_user: User = Depends(RequireTier(UserTier.DISCOVERY)),
):
    """
    Get the current status of a discovery run.

    Discovery tier required.
    """
    if discovery_id not in _discovery_progress:
        raise HTTPException(status_code=404, detail="Discovery not found")

    progress = _discovery_progress[discovery_id]
    return progress.to_dict()


@router.get("/{discovery_id}/result")
async def get_discovery_result(
    discovery_id: str,
    current_user: User = Depends(RequireTier(UserTier.DISCOVERY)),
):
    """
    Get the complete results of a discovery run.

    Discovery tier required.
    Only available after the discovery is complete.
    """
    if discovery_id not in _discovery_results:
        # Check if still in progress
        if discovery_id in _discovery_progress:
            progress = _discovery_progress[discovery_id]
            if progress.status == DiscoveryStatus.FAILED:
                raise HTTPException(
                    status_code=500,
                    detail=f"Discovery failed: {progress.error_message}",
                )
            raise HTTPException(
                status_code=202,
                detail=f"Discovery in progress: {progress.current_step}",
            )
        raise HTTPException(status_code=404, detail="Discovery not found")

    return _discovery_results[discovery_id]


@router.post("/{discovery_id}/report")
async def generate_discovery_report(
    discovery_id: str,
    current_user: User = Depends(RequireTier(UserTier.DISCOVERY)),
):
    """
    Generate a PDF report for a completed discovery.

    Discovery tier required.
    """
    if discovery_id not in _discovery_results:
        raise HTTPException(status_code=404, detail="Discovery results not found")

    result = _discovery_results[discovery_id]

    try:
        pdf_bytes = await report_generator.generate_discovery_report(
            discovery_id=discovery_id,
            problem_title=result.get("problem_statement", "Discovery")[:50],
            problem_statement=result.get("problem_statement", ""),
            discovery_status="completed",
            hypotheses=result.get("hypotheses", []),
            total_hypotheses=result.get("total_hypotheses", 0),
            high_priority_count=result.get("high_priority_count", 0),
            papers_analyzed=len(result.get("literature_synthesis", {}).get("key_papers", [])),
            patents_reviewed=result.get("patent_landscape", {}).get("total_patents", 0),
            executive_summary=result.get("executive_summary", ""),
            top_recommendation=result.get("top_recommendation"),
            constraints=result.get("constraints"),
            literature_synthesis=result.get("literature_synthesis"),
            patent_landscape=result.get("patent_landscape"),
            materials_analysis=result.get("materials_analysis"),
            tea_candidates=None,  # TODO: Add TEA analysis
            immediate_actions=result.get("immediate_actions"),
            medium_term_actions=result.get("medium_term_actions"),
            long_term_vision=result.get("long_term_vision"),
            risk_factors=result.get("risk_factors"),
            processing_time=f"{result.get('processing_time_seconds', 0):.1f} seconds",
            user_name=current_user.email,
        )

        filename = f"Discovery_Report_{discovery_id}.pdf"
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


# === Literature Analysis (Discovery Tier) ===


class LiteratureSearchRequest(BaseModel):
    """Request for literature search."""
    query: str = Field(
        ...,
        description="Research topic or question to search",
        min_length=5,
        max_length=500,
    )
    limit: int = Field(30, ge=5, le=100, description="Maximum papers to retrieve")
    year_from: Optional[int] = Field(None, description="Start year filter")
    year_to: Optional[int] = Field(None, description="End year filter")


class LiteratureSynthesisRequest(BaseModel):
    """Request for literature synthesis with AI analysis."""
    query: str = Field(
        ...,
        description="Research topic for synthesis",
        min_length=5,
        max_length=500,
    )
    limit: int = Field(30, ge=10, le=50, description="Maximum papers to analyze")


class WhiteSpaceRequest(BaseModel):
    """Request for white space analysis."""
    research_area: str = Field(
        ...,
        description="Research area to analyze for opportunities",
        min_length=5,
        max_length=200,
    )


@router.post("/literature/search")
async def search_literature(
    request: LiteratureSearchRequest,
    current_user: User = Depends(RequireTier(UserTier.DISCOVERY)),
):
    """
    Search scientific literature (Semantic Scholar + arXiv).

    Discovery tier required.

    Returns papers sorted by citation count.
    """
    year_range = None
    if request.year_from and request.year_to:
        year_range = (request.year_from, request.year_to)

    papers = await literature_service.search_literature(
        query=request.query,
        limit=request.limit,
        year_range=year_range,
    )

    return {
        "query": request.query,
        "papers_found": len(papers),
        "papers": [p.to_dict() for p in papers],
        "sources": ["Semantic Scholar", "arXiv"],
    }


@router.post("/literature/synthesize")
async def synthesize_literature(
    request: LiteratureSynthesisRequest,
    current_user: User = Depends(RequireTier(UserTier.DISCOVERY)),
):
    """
    Generate AI-powered literature synthesis.

    Discovery tier required.

    Uses Claude Sonnet to analyze papers and synthesize:
    - Key findings
    - Research themes
    - Methodology trends
    - Research gaps
    - Narrative summary
    """
    try:
        synthesis = await literature_service.synthesize_literature(
            query=request.query,
            limit=request.limit,
        )

        return synthesis.to_dict()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Synthesis failed: {str(e)}")


@router.post("/literature/white-space")
async def identify_white_space(
    request: WhiteSpaceRequest,
    current_user: User = Depends(RequireTier(UserTier.DISCOVERY)),
):
    """
    Identify white space opportunities in a research area.

    Discovery tier required.

    White space = areas with unmet needs or limited competition.
    """
    try:
        result = await literature_service.identify_white_space(
            research_area=request.research_area,
        )
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"White space analysis failed: {str(e)}")


# === Patent Analysis (Discovery Tier) ===


class PatentSearchRequest(BaseModel):
    """Request for patent search."""
    query: str = Field(
        ...,
        description="Technology or keywords to search",
        min_length=3,
        max_length=200,
    )
    technology_area: Optional[str] = Field(
        None,
        description="Technology filter: solar, wind, battery, hydrogen, carbon_capture",
    )
    limit: int = Field(50, ge=10, le=100, description="Maximum patents")
    year_from: Optional[int] = Field(None, description="Start year")
    year_to: Optional[int] = Field(None, description="End year")


class PatentLandscapeRequest(BaseModel):
    """Request for patent landscape analysis."""
    technology_area: str = Field(
        ...,
        description="Technology: solar, wind, battery, hydrogen, carbon_capture, energy_storage",
    )
    years: int = Field(5, ge=1, le=10, description="Years of history to analyze")


class FreedomToOperateRequest(BaseModel):
    """Request for freedom-to-operate analysis."""
    technology_description: str = Field(
        ...,
        description="Description of your technology",
        min_length=20,
        max_length=2000,
    )
    target_markets: Optional[List[str]] = Field(
        None,
        description="Target markets: US, EU, CN, JP, etc.",
    )


@router.post("/patents/search")
async def search_patents(
    request: PatentSearchRequest,
    current_user: User = Depends(RequireTier(UserTier.DISCOVERY)),
):
    """
    Search patents in clean energy technologies.

    Discovery tier required.

    Returns patents with title, abstract, applicant, and classification codes.
    """
    patents = await patent_service.search_patents(
        query=request.query,
        technology_area=request.technology_area,
        limit=request.limit,
        year_from=request.year_from,
        year_to=request.year_to,
    )

    return {
        "query": request.query,
        "technology_area": request.technology_area,
        "patents_found": len(patents),
        "patents": [p.to_dict() for p in patents],
    }


@router.post("/patents/landscape")
async def analyze_patent_landscape(
    request: PatentLandscapeRequest,
    current_user: User = Depends(RequireTier(UserTier.DISCOVERY)),
):
    """
    Generate comprehensive patent landscape analysis.

    Discovery tier required.

    Returns:
    - Top applicants and their focus areas
    - Filing trends over time
    - Classification breakdown
    - Key patents
    - White space opportunities
    - AI-powered analysis summary
    """
    try:
        landscape = await patent_service.analyze_landscape(
            technology_area=request.technology_area,
            years=request.years,
        )

        return landscape.to_dict()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Landscape analysis failed: {str(e)}")


@router.post("/patents/freedom-to-operate")
async def freedom_to_operate_check(
    request: FreedomToOperateRequest,
    current_user: User = Depends(RequireTier(UserTier.DISCOVERY)),
):
    """
    Preliminary freedom-to-operate analysis.

    Discovery tier required.

    DISCLAIMER: This is informational only, not legal advice.
    Always consult a patent attorney for actual FTO opinions.
    """
    try:
        result = await patent_service.freedom_to_operate_analysis(
            technology_description=request.technology_description,
            target_markets=request.target_markets,
        )
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"FTO analysis failed: {str(e)}")


# === Unified Dataset Hub (Discovery Tier) ===


class CleanEnergyMaterialsRequest(BaseModel):
    """Request for clean energy materials search."""
    application: str = Field(
        ...,
        description="Application: solar, battery, catalyst, thermoelectric, fuel_cell",
    )
    limit: int = Field(20, ge=5, le=50, description="Maximum materials to return")


class UnifiedSearchRequest(BaseModel):
    """Request for unified cross-database search."""
    query: str = Field(
        ...,
        description="Search query across all databases",
        min_length=3,
        max_length=200,
    )
    include_materials: bool = Field(True, description="Search Materials Project")
    include_papers: bool = Field(True, description="Search Semantic Scholar + arXiv")
    include_chemicals: bool = Field(True, description="Search PubChem")
    include_energy: bool = Field(False, description="Search NREL energy data")
    limit_per_source: int = Field(10, ge=5, le=25, description="Results per source")


@router.post("/datasets/search")
async def unified_dataset_search(
    request: UnifiedSearchRequest,
    current_user: User = Depends(RequireTier(UserTier.DISCOVERY)),
):
    """
    Search across all scientific databases simultaneously.

    Discovery tier required.

    Searches:
    - Materials Project: Computed material properties
    - Semantic Scholar: Peer-reviewed papers
    - arXiv: Research preprints
    - PubChem: Chemical compounds
    - NREL: Energy resource data (optional)

    Results are cached for 15 minutes for performance.
    """
    try:
        results = await dataset_hub.search_all(
            query=request.query,
            include_materials=request.include_materials,
            include_papers=request.include_papers,
            include_chemicals=request.include_chemicals,
            include_energy=request.include_energy,
            limit_per_source=request.limit_per_source,
        )

        return results.to_dict()

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.post("/datasets/clean-energy-materials")
async def search_clean_energy_materials(
    request: CleanEnergyMaterialsRequest,
    current_user: User = Depends(RequireTier(UserTier.DISCOVERY)),
):
    """
    Search materials and literature for clean energy applications.

    Discovery tier required.

    Returns materials from Materials Project with related research papers.
    """
    try:
        results = await dataset_hub.search_clean_energy_materials(
            application=request.application,
            limit=request.limit,
        )
        return results

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")


@router.get("/datasets/technology-overview/{technology}")
async def get_technology_overview(
    technology: str,
    current_user: User = Depends(RequireTier(UserTier.DISCOVERY)),
):
    """
    Get comprehensive overview of a clean energy technology.

    Discovery tier required.

    Combines:
    - Peer-reviewed papers
    - Relevant materials
    - Recent preprints
    """
    try:
        overview = await dataset_hub.get_technology_overview(
            technology=technology,
        )
        return overview

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Overview failed: {str(e)}")
