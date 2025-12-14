"""
Global Energy Data Service.

Provides access to the validated global exergy services data model.
This data is the foundation for benchmarking and validation.
"""

import json
from pathlib import Path
from typing import Any, Optional
from functools import lru_cache


DATA_DIR = Path(__file__).parent.parent / "data" / "energy"


@lru_cache(maxsize=10)
def _load_json(filename: str) -> dict:
    """Load and cache JSON data file."""
    filepath = DATA_DIR / filename
    if not filepath.exists():
        raise FileNotFoundError(f"Data file not found: {filename}")
    with open(filepath, "r") as f:
        return json.load(f)


class GlobalEnergyService:
    """
    Service for accessing global energy system data.

    Data hierarchy:
    - Primary Energy: Raw extraction (what we measure)
    - Useful Energy: After conversion efficiency (what we deliver)
    - Exergy Services: Thermodynamic work potential (what we actually get)

    This is the most accurate representation of the global energy system.
    """

    @staticmethod
    def get_exergy_services_timeseries() -> dict:
        """
        Get exergy services data (Tier 3 - highest accuracy).

        Returns 60 years of data (1965-2024) showing:
        - Total exergy services by source (EJ)
        - Fossil vs clean share
        - Global exergy efficiency
        """
        return _load_json("exergy_services_timeseries.json")

    @staticmethod
    def get_useful_energy_timeseries() -> dict:
        """
        Get useful energy data (Tier 2).

        Useful energy = Primary energy × Efficiency factor
        """
        return _load_json("useful_energy_timeseries.json")

    @staticmethod
    def get_efficiency_factors() -> dict:
        """
        Get efficiency conversion factors.

        These factors convert primary energy to useful energy:
        - Coal: 32%
        - Oil: 30%
        - Gas: 52%
        - Nuclear: 25%
        - Hydro: 87%
        - Wind: 88%
        - Solar: 85%
        """
        return _load_json("efficiency_factors_corrected.json")

    @staticmethod
    def get_regional_data() -> dict:
        """
        Get regional energy breakdown.

        Covers 27 regions:
        - 6 continents
        - 16 major countries
        - 5 economic groupings (EU, OECD, etc.)
        """
        return _load_json("regional_energy_timeseries.json")

    @staticmethod
    def get_sectoral_breakdown() -> dict:
        """
        Get sectoral energy breakdown.

        15 main sectors, 45 subsectors:
        - Transport (road, aviation, shipping, rail)
        - Industry (iron/steel, chemicals, cement, aluminum, etc.)
        - Buildings (residential, commercial, heating, cooling)
        - Agriculture
        """
        return _load_json("sectoral_energy_breakdown_v2.json")

    @staticmethod
    def get_demand_projections() -> dict:
        """
        Get demand growth projections to 2050.

        Three scenarios:
        - Conservative: Proven technologies only
        - Baseline: Expected progress
        - Optimistic: Breakthroughs realized
        """
        return _load_json("demand_growth_projections.json")

    @staticmethod
    def get_energy_projections() -> dict:
        """
        Get detailed energy projections with learning curves.

        Includes Wright's Law cost projections for:
        - Solar PV (27% learning rate)
        - Wind (15% learning rate)
        - Batteries (18% learning rate)
        - Electrolyzers (18% learning rate)
        """
        return _load_json("energy_projections_v4.json")

    @staticmethod
    def get_regional_potential() -> dict:
        """
        Get renewable potential vs fossil reserves by region.

        Shows "Renewable Advantage Ratio" - how much more
        renewable potential exists vs fossil reserves.
        """
        return _load_json("energy_potential_by_region.json")

    @staticmethod
    def get_current_metrics() -> dict:
        """
        Get current (2024) global energy metrics.

        Key metrics:
        - Total Exergy Services: 148.94 EJ
        - Global Exergy Efficiency: 24.6%
        - Fossil Share: 82.9%
        - Clean Share: 17.1%
        """
        data = _load_json("exergy_services_timeseries.json")
        # Get most recent year
        latest = data["data"][-1] if data.get("data") else {}
        return {
            "year": latest.get("year", 2024),
            "total_exergy_services_ej": latest.get("total_services_ej", 148.94),
            "global_exergy_efficiency": latest.get("global_exergy_efficiency", 24.6),
            "fossil_share_percent": latest.get("fossil_services_share_percent", 82.9),
            "clean_share_percent": latest.get("clean_services_share_percent", 17.1),
            "sources_ej": latest.get("sources_services_ej", {}),
            "clean_energy_multiplier": 3.2,  # Clean delivers 3.2x more value per unit
            "validation_sources": [
                "IEA World Energy Outlook 2024",
                "Brockway et al. (2021)",
                "RMI Energy Analysis 2024",
            ],
        }

    @staticmethod
    def get_technology_benchmarks() -> dict:
        """
        Get technology benchmarks for TEA comparison.

        Provides reference data for comparing user's TEA results
        against global averages.
        """
        return {
            "solar_pv": {
                "capacity_factor_range": [0.15, 0.30],
                "global_average_cf": 0.22,
                "lcoe_range_usd_mwh": [24, 45],
                "capex_range_usd_kw": [800, 1200],
                "learning_rate": 0.27,
                "efficiency_to_useful": 0.85,
                "exergy_quality_factor": 0.95,
            },
            "wind_onshore": {
                "capacity_factor_range": [0.25, 0.45],
                "global_average_cf": 0.35,
                "lcoe_range_usd_mwh": [26, 50],
                "capex_range_usd_kw": [1200, 1600],
                "learning_rate": 0.15,
                "efficiency_to_useful": 0.88,
                "exergy_quality_factor": 0.95,
            },
            "wind_offshore": {
                "capacity_factor_range": [0.40, 0.55],
                "global_average_cf": 0.45,
                "lcoe_range_usd_mwh": [55, 85],
                "capex_range_usd_kw": [2800, 4200],
                "learning_rate": 0.12,
                "efficiency_to_useful": 0.88,
                "exergy_quality_factor": 0.95,
            },
            "battery_storage": {
                "round_trip_efficiency": 0.90,
                "lcoe_range_usd_mwh": [120, 180],
                "capex_range_usd_kwh": [250, 400],
                "learning_rate": 0.18,
                "cycle_life": 6000,
            },
            "green_hydrogen": {
                "electrolyzer_efficiency": 0.70,
                "lcoh_range_usd_kg": [3.0, 6.0],
                "capex_range_usd_kw": [600, 1000],
                "learning_rate": 0.18,
            },
            "nuclear": {
                "capacity_factor_range": [0.85, 0.95],
                "global_average_cf": 0.92,
                "lcoe_range_usd_mwh": [60, 120],
                "capex_range_usd_kw": [5000, 8000],
                "efficiency_to_useful": 0.25,
                "exergy_quality_factor": 0.95,
            },
        }

    @staticmethod
    def compare_to_global(
        technology: str,
        capacity_factor: float,
        lcoe: float,
    ) -> dict:
        """
        Compare user's TEA results to global benchmarks.

        Returns how the project compares to global averages
        and where it ranks.
        """
        benchmarks = GlobalEnergyService.get_technology_benchmarks()
        tech_data = benchmarks.get(technology, benchmarks.get("solar_pv"))

        cf_range = tech_data.get("capacity_factor_range", [0.15, 0.35])
        lcoe_range = tech_data.get("lcoe_range_usd_mwh", [30, 60])

        # Calculate percentile rankings
        cf_percentile = min(100, max(0, (capacity_factor - cf_range[0]) / (cf_range[1] - cf_range[0]) * 100))
        lcoe_percentile = min(100, max(0, (1 - (lcoe - lcoe_range[0]) / (lcoe_range[1] - lcoe_range[0])) * 100))

        return {
            "technology": technology,
            "capacity_factor": {
                "value": capacity_factor,
                "global_average": tech_data.get("global_average_cf", 0.25),
                "range": cf_range,
                "percentile": round(cf_percentile, 1),
                "assessment": "Above average" if cf_percentile > 50 else "Below average",
            },
            "lcoe": {
                "value": lcoe,
                "global_range": lcoe_range,
                "percentile": round(lcoe_percentile, 1),
                "assessment": "Competitive" if lcoe_percentile > 50 else "Above market",
            },
            "exergy_advantage": tech_data.get("efficiency_to_useful", 0.85)
            * tech_data.get("exergy_quality_factor", 0.95),
        }


# Singleton instance
energy_service = GlobalEnergyService()
