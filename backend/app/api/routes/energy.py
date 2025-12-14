"""
Global Energy System API endpoints.

Tiered access:
- Starter: View current metrics, historical trends (1965-2024)
- Professional: Regional analysis, sectoral breakdown, scenarios
- Discovery: Full API access, custom queries
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from app.services.energy_data import energy_service
from app.core.tiers import Tier, Feature, has_feature

router = APIRouter()


# === STARTER TIER ENDPOINTS ===


@router.get("/current")
async def get_current_metrics():
    """
    Get current (2024) global energy metrics.

    Available to all tiers.

    Returns:
    - Total exergy services (148.94 EJ)
    - Global exergy efficiency (24.6%)
    - Fossil vs clean share
    - Clean energy multiplier (3.2x)
    """
    return energy_service.get_current_metrics()


@router.get("/timeseries")
async def get_exergy_timeseries(
    start_year: int = Query(1965, ge=1965, le=2024),
    end_year: int = Query(2024, ge=1965, le=2024),
):
    """
    Get historical exergy services timeseries.

    Starter tier: Full 60-year historical data (1965-2024)

    Returns annual data for:
    - Total services by source (EJ)
    - Fossil vs clean breakdown
    - Global exergy efficiency trend
    """
    data = energy_service.get_exergy_services_timeseries()

    # Filter by year range
    filtered_data = [
        d for d in data.get("data", []) if start_year <= d.get("year", 0) <= end_year
    ]

    return {
        "metadata": data.get("metadata", {}),
        "data": filtered_data,
        "year_range": {"start": start_year, "end": end_year},
    }


@router.get("/useful-energy")
async def get_useful_energy_timeseries():
    """
    Get useful energy timeseries (Tier 2 data).

    Shows energy after conversion efficiency is applied.
    """
    return energy_service.get_useful_energy_timeseries()


@router.get("/efficiency-factors")
async def get_efficiency_factors():
    """
    Get efficiency conversion factors.

    Key factors:
    - Coal: 32% (power gen 30-35%)
    - Oil: 30% (ICE vehicles 20-30%)
    - Gas: 52% (CCGT 58%, heating 88%)
    - Solar: 85%
    - Wind: 88%
    - Hydro: 87%
    """
    return energy_service.get_efficiency_factors()


@router.get("/benchmarks")
async def get_technology_benchmarks():
    """
    Get technology benchmarks for TEA comparison.

    Returns reference data for:
    - Solar PV
    - Wind (onshore/offshore)
    - Battery storage
    - Green hydrogen
    - Nuclear
    """
    return energy_service.get_technology_benchmarks()


# === PROFESSIONAL TIER ENDPOINTS ===


@router.get("/regional")
async def get_regional_data(
    regions: Optional[List[str]] = Query(
        None,
        description="Filter by specific regions (e.g., 'USA', 'China', 'European Union')",
    ),
    year: Optional[int] = Query(None, description="Filter by specific year"),
):
    """
    Get regional energy breakdown.

    Professional tier required.

    27 regions tracked:
    - Continents: Africa, Asia, Europe, North America, South America, Oceania
    - Countries: USA, China, India, Japan, Germany, UK, France, Brazil, etc.
    - Groupings: European Union, OECD, Non-OECD
    """
    data = energy_service.get_regional_data()

    if regions:
        # Filter by requested regions
        filtered = {
            k: v for k, v in data.get("regions", {}).items() if k in regions
        }
        return {"regions": filtered, "filter": regions}

    if year:
        # Return single year for all regions
        result = {}
        for region, years in data.get("regions", {}).items():
            year_data = next((y for y in years if y.get("year") == year), None)
            if year_data:
                result[region] = year_data
        return {"year": year, "regions": result}

    return data


@router.get("/sectors")
async def get_sectoral_breakdown():
    """
    Get sectoral energy breakdown.

    Professional tier required.

    15 main sectors, 45 subsectors:
    - Transport: Road (14.5%), Aviation (5%), Shipping (3.5%), Rail (2%)
    - Industry: Iron/Steel (9.5%), Chemicals (8%), Cement (5.5%), Aluminum (3%)
    - Buildings: Residential (21%), Commercial (10.5%)
    - Agriculture: 4.5%

    Includes fossil intensity and electrification potential by sector.
    """
    return energy_service.get_sectoral_breakdown()


@router.get("/projections")
async def get_demand_projections(
    scenario: Optional[str] = Query(
        None,
        description="Scenario: 'conservative', 'baseline', or 'optimistic'",
    ),
):
    """
    Get demand growth projections to 2050.

    Professional tier required.

    Three scenarios:
    - Conservative: Proven technologies, 100 EJ solar saturation
    - Baseline: Expected progress, 200 EJ solar saturation
    - Optimistic: Breakthroughs realized, 400 EJ solar saturation

    Includes Wright's Law learning curves for cost projections.
    """
    data = energy_service.get_demand_projections()

    if scenario:
        scenario_data = data.get("scenarios", {}).get(scenario)
        if not scenario_data:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid scenario. Choose: conservative, baseline, optimistic",
            )
        return {"scenario": scenario, "data": scenario_data}

    return data


@router.get("/projections/detailed")
async def get_detailed_projections():
    """
    Get detailed energy projections with learning curves.

    Professional tier required.

    Includes:
    - Technology cost trajectories
    - Manufacturing capacity constraints
    - Deployment scenarios
    """
    return energy_service.get_energy_projections()


@router.get("/regional-potential")
async def get_regional_potential():
    """
    Get renewable potential vs fossil reserves by region.

    Professional tier required.

    Shows "Renewable Advantage Ratio":
    - South Korea: 1322× more renewable potential
    - Saudi Arabia: 61× (despite oil reserves)
    - USA: 25×
    - Australia: 34×
    """
    return energy_service.get_regional_potential()


@router.post("/compare")
async def compare_to_global(
    technology: str,
    capacity_factor: float,
    lcoe: float,
):
    """
    Compare user's TEA results to global benchmarks.

    Professional tier required.

    Returns:
    - Percentile ranking for capacity factor
    - Percentile ranking for LCOE
    - Exergy advantage factor
    """
    return energy_service.compare_to_global(technology, capacity_factor, lcoe)


# === DISCOVERY TIER ENDPOINTS ===


@router.get("/api/full-dataset")
async def get_full_dataset():
    """
    Get complete energy dataset for API access.

    Discovery tier required.

    Returns all data in a single structured response for
    programmatic integration.
    """
    return {
        "current_metrics": energy_service.get_current_metrics(),
        "exergy_timeseries": energy_service.get_exergy_services_timeseries(),
        "useful_energy": energy_service.get_useful_energy_timeseries(),
        "efficiency_factors": energy_service.get_efficiency_factors(),
        "regional_data": energy_service.get_regional_data(),
        "sectoral_breakdown": energy_service.get_sectoral_breakdown(),
        "projections": energy_service.get_demand_projections(),
        "benchmarks": energy_service.get_technology_benchmarks(),
    }
