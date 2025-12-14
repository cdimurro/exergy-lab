"""
Materials Project API Integration.

The Materials Project provides open access to computed materials data.
License: CC-BY 4.0 (Attribution required, commercial use allowed)

This service provides access to:
- Crystal structures
- Band gaps
- Formation energies
- Thermodynamic properties
- Catalytic properties

Used for Discovery tier features like novel material discovery.
"""

import httpx
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from functools import lru_cache
import asyncio

from app.core.config import settings


# Materials Project API configuration
MP_API_BASE = "https://api.materialsproject.org/v2"


class MaterialProperty(BaseModel):
    """Material property from Materials Project."""

    material_id: str
    formula: str
    formation_energy_per_atom: Optional[float] = None
    energy_above_hull: Optional[float] = None
    band_gap: Optional[float] = None
    is_stable: bool = False
    crystal_system: Optional[str] = None
    spacegroup: Optional[str] = None
    density: Optional[float] = None
    volume: Optional[float] = None


class MaterialsProjectService:
    """
    Service for querying the Materials Project API.

    Discovery tier feature - provides access to millions of
    computed materials properties for clean energy applications.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.MATERIALS_PROJECT_API_KEY
        self.base_url = MP_API_BASE

    async def _make_request(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Make authenticated request to Materials Project API."""
        if not self.api_key:
            # Return mock data for demo purposes
            return self._get_mock_data(endpoint, params)

        headers = {"X-API-KEY": self.api_key}

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/{endpoint}",
                headers=headers,
                params=params,
                timeout=30.0,
            )
            response.raise_for_status()
            return response.json()

    def _get_mock_data(
        self, endpoint: str, params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Return mock data for demo when no API key is set."""
        if "summary" in endpoint:
            return {
                "data": [
                    {
                        "material_id": "mp-149",
                        "formula_pretty": "Si",
                        "formation_energy_per_atom": 0.0,
                        "energy_above_hull": 0.0,
                        "band_gap": 1.11,
                        "is_stable": True,
                        "symmetry": {"crystal_system": "Cubic"},
                        "density": 2.33,
                    },
                    {
                        "material_id": "mp-22862",
                        "formula_pretty": "LiFePO4",
                        "formation_energy_per_atom": -1.23,
                        "energy_above_hull": 0.0,
                        "band_gap": 3.8,
                        "is_stable": True,
                        "symmetry": {"crystal_system": "Orthorhombic"},
                        "density": 3.6,
                    },
                    {
                        "material_id": "mp-19017",
                        "formula_pretty": "TiO2",
                        "formation_energy_per_atom": -3.24,
                        "energy_above_hull": 0.0,
                        "band_gap": 3.0,
                        "is_stable": True,
                        "symmetry": {"crystal_system": "Tetragonal"},
                        "density": 4.23,
                    },
                ],
                "meta": {"total_doc": 3},
            }
        return {"data": [], "meta": {"total_doc": 0}}

    async def search_materials(
        self,
        elements: Optional[List[str]] = None,
        formula: Optional[str] = None,
        band_gap_min: Optional[float] = None,
        band_gap_max: Optional[float] = None,
        is_stable: bool = True,
        limit: int = 20,
    ) -> List[MaterialProperty]:
        """
        Search for materials by properties.

        Args:
            elements: List of elements to include (e.g., ["Li", "Fe", "P", "O"])
            formula: Chemical formula to search
            band_gap_min: Minimum band gap (eV)
            band_gap_max: Maximum band gap (eV)
            is_stable: Only return stable materials
            limit: Maximum results to return

        Returns:
            List of materials matching criteria
        """
        params = {"_limit": limit}

        if elements:
            params["elements"] = ",".join(elements)
        if formula:
            params["formula"] = formula
        if band_gap_min is not None:
            params["band_gap_min"] = band_gap_min
        if band_gap_max is not None:
            params["band_gap_max"] = band_gap_max
        if is_stable:
            params["is_stable"] = "true"

        result = await self._make_request("materials/summary", params)

        materials = []
        for mat in result.get("data", []):
            materials.append(
                MaterialProperty(
                    material_id=mat.get("material_id", ""),
                    formula=mat.get("formula_pretty", ""),
                    formation_energy_per_atom=mat.get("formation_energy_per_atom"),
                    energy_above_hull=mat.get("energy_above_hull"),
                    band_gap=mat.get("band_gap"),
                    is_stable=mat.get("is_stable", False),
                    crystal_system=mat.get("symmetry", {}).get("crystal_system"),
                    density=mat.get("density"),
                )
            )

        return materials

    async def get_material_by_id(self, material_id: str) -> Optional[MaterialProperty]:
        """Get detailed properties for a specific material."""
        result = await self._make_request(f"materials/summary/{material_id}")
        data = result.get("data", [])
        if not data:
            return None

        mat = data[0] if isinstance(data, list) else data
        return MaterialProperty(
            material_id=mat.get("material_id", material_id),
            formula=mat.get("formula_pretty", ""),
            formation_energy_per_atom=mat.get("formation_energy_per_atom"),
            energy_above_hull=mat.get("energy_above_hull"),
            band_gap=mat.get("band_gap"),
            is_stable=mat.get("is_stable", False),
            crystal_system=mat.get("symmetry", {}).get("crystal_system"),
            density=mat.get("density"),
        )

    async def find_solar_materials(
        self,
        band_gap_min: float = 1.0,
        band_gap_max: float = 2.0,
        limit: int = 20,
    ) -> List[MaterialProperty]:
        """
        Find materials suitable for solar cells.

        Optimal band gap for single-junction solar cells: 1.1-1.4 eV
        Extended range for tandem cells: 1.0-2.0 eV
        """
        return await self.search_materials(
            band_gap_min=band_gap_min,
            band_gap_max=band_gap_max,
            is_stable=True,
            limit=limit,
        )

    async def find_battery_cathode_materials(
        self,
        limit: int = 20,
    ) -> List[MaterialProperty]:
        """
        Find materials suitable for battery cathodes.

        Searches for stable lithium-containing transition metal oxides.
        """
        return await self.search_materials(
            elements=["Li", "O"],
            is_stable=True,
            limit=limit,
        )

    async def find_catalyst_materials(
        self,
        reaction_type: str = "HER",
        limit: int = 20,
    ) -> List[MaterialProperty]:
        """
        Find potential catalyst materials.

        Reaction types:
        - HER: Hydrogen Evolution Reaction (water splitting)
        - OER: Oxygen Evolution Reaction
        - ORR: Oxygen Reduction Reaction (fuel cells)
        - CO2RR: CO2 Reduction
        """
        # Common catalyst elements by reaction
        catalyst_elements = {
            "HER": ["Pt", "Ni", "Mo", "W"],
            "OER": ["Ir", "Ru", "Co", "Ni", "Fe"],
            "ORR": ["Pt", "Pd", "Fe", "Co", "N"],
            "CO2RR": ["Cu", "Ag", "Au", "Sn", "Bi"],
        }

        elements = catalyst_elements.get(reaction_type.upper(), ["Pt", "Ni"])

        # Search for compounds containing these elements
        all_materials = []
        for element in elements[:2]:  # Limit to first 2 to reduce API calls
            materials = await self.search_materials(
                elements=[element],
                is_stable=True,
                limit=limit // 2,
            )
            all_materials.extend(materials)

        return all_materials[:limit]


# Singleton instance
materials_service = MaterialsProjectService()
