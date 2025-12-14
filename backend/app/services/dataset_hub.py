"""
Dataset Hub - Unified Access to Scientific Databases.

Provides a single interface to query multiple scientific data sources:
- Materials Project: Computed materials properties
- PubChem: Chemical compound data
- Semantic Scholar: Scientific literature
- NREL: Energy resource data
- arXiv: Research preprints

Used by Discovery Engine for comprehensive research capabilities.
"""

import httpx
import asyncio
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from functools import lru_cache
import hashlib
import json

from app.core.config import settings
from app.services.materials_api import materials_service, MaterialProperty


# === Data Classes for Unified Results ===


@dataclass
class Paper:
    """Scientific paper from Semantic Scholar or arXiv."""

    paper_id: str
    title: str
    authors: List[str]
    abstract: str
    year: Optional[int] = None
    venue: Optional[str] = None
    citation_count: int = 0
    url: Optional[str] = None
    doi: Optional[str] = None
    source: str = "semantic_scholar"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "paper_id": self.paper_id,
            "title": self.title,
            "authors": self.authors,
            "abstract": self.abstract,
            "year": self.year,
            "venue": self.venue,
            "citation_count": self.citation_count,
            "url": self.url,
            "doi": self.doi,
            "source": self.source,
        }


@dataclass
class Chemical:
    """Chemical compound from PubChem."""

    cid: int
    name: str
    molecular_formula: Optional[str] = None
    molecular_weight: Optional[float] = None
    iupac_name: Optional[str] = None
    smiles: Optional[str] = None
    inchi: Optional[str] = None
    synonyms: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "cid": self.cid,
            "name": self.name,
            "molecular_formula": self.molecular_formula,
            "molecular_weight": self.molecular_weight,
            "iupac_name": self.iupac_name,
            "smiles": self.smiles,
            "inchi": self.inchi,
            "synonyms": self.synonyms,
        }


@dataclass
class EnergyResource:
    """Energy resource data from NREL."""

    resource_type: str  # solar, wind, etc.
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    annual_average: Optional[float] = None
    capacity_factor: Optional[float] = None
    unit: str = "kWh/m2/day"
    data_source: str = "NREL"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "resource_type": self.resource_type,
            "location": self.location,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "annual_average": self.annual_average,
            "capacity_factor": self.capacity_factor,
            "unit": self.unit,
            "data_source": self.data_source,
        }


@dataclass
class UnifiedSearchResult:
    """Combined results from multiple data sources."""

    query: str
    materials: List[MaterialProperty] = field(default_factory=list)
    papers: List[Paper] = field(default_factory=list)
    chemicals: List[Chemical] = field(default_factory=list)
    energy_resources: List[EnergyResource] = field(default_factory=list)
    search_time_seconds: float = 0.0
    sources_queried: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "query": self.query,
            "materials": [m.model_dump() if hasattr(m, 'model_dump') else vars(m) for m in self.materials],
            "papers": [p.to_dict() for p in self.papers],
            "chemicals": [c.to_dict() for c in self.chemicals],
            "energy_resources": [e.to_dict() for e in self.energy_resources],
            "search_time_seconds": self.search_time_seconds,
            "sources_queried": self.sources_queried,
            "total_results": len(self.materials) + len(self.papers) + len(self.chemicals) + len(self.energy_resources),
        }


# === Simple In-Memory Cache ===


class SimpleCache:
    """Simple in-memory cache with TTL."""

    def __init__(self, default_ttl_minutes: int = 15):
        self._cache: Dict[str, tuple[Any, datetime]] = {}
        self._default_ttl = timedelta(minutes=default_ttl_minutes)

    def _make_key(self, prefix: str, params: Dict[str, Any]) -> str:
        """Create a cache key from prefix and parameters."""
        param_str = json.dumps(params, sort_keys=True)
        hash_val = hashlib.md5(param_str.encode()).hexdigest()[:12]
        return f"{prefix}:{hash_val}"

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired."""
        if key in self._cache:
            value, expires_at = self._cache[key]
            if datetime.now() < expires_at:
                return value
            else:
                del self._cache[key]
        return None

    def set(self, key: str, value: Any, ttl_minutes: Optional[int] = None):
        """Set value in cache with optional custom TTL."""
        ttl = timedelta(minutes=ttl_minutes) if ttl_minutes else self._default_ttl
        expires_at = datetime.now() + ttl
        self._cache[key] = (value, expires_at)

    def clear(self):
        """Clear all cached values."""
        self._cache.clear()


# === Dataset Hub Service ===


class DatasetHub:
    """
    Unified interface to multiple scientific databases.

    Provides:
    - Single query across multiple sources
    - Automatic caching of results
    - Rate limiting per API
    - Graceful degradation on API failures
    """

    # API endpoints
    SEMANTIC_SCHOLAR_API = "https://api.semanticscholar.org/graph/v1"
    PUBCHEM_API = "https://pubchem.ncbi.nlm.nih.gov/rest/pug"
    ARXIV_API = "http://export.arxiv.org/api/query"
    NREL_API = "https://developer.nrel.gov/api"

    def __init__(self):
        self.cache = SimpleCache(default_ttl_minutes=15)
        self.materials_service = materials_service

        # API keys from settings
        self.semantic_scholar_key = getattr(settings, 'SEMANTIC_SCHOLAR_API_KEY', None)
        self.nrel_key = getattr(settings, 'NREL_API_KEY', None)

    # === Unified Search ===

    async def search_all(
        self,
        query: str,
        include_materials: bool = True,
        include_papers: bool = True,
        include_chemicals: bool = True,
        include_energy: bool = False,
        limit_per_source: int = 10,
    ) -> UnifiedSearchResult:
        """
        Search across all available data sources.

        Args:
            query: Search query string
            include_materials: Search Materials Project
            include_papers: Search Semantic Scholar and arXiv
            include_chemicals: Search PubChem
            include_energy: Search NREL energy data
            limit_per_source: Maximum results per source

        Returns:
            UnifiedSearchResult with results from all sources
        """
        start_time = datetime.now()

        # Create tasks for parallel execution
        tasks = []
        sources = []

        if include_materials:
            tasks.append(self._search_materials_safe(query, limit_per_source))
            sources.append("materials_project")

        if include_papers:
            tasks.append(self._search_papers_safe(query, limit_per_source))
            sources.append("semantic_scholar")
            tasks.append(self._search_arxiv_safe(query, limit_per_source))
            sources.append("arxiv")

        if include_chemicals:
            tasks.append(self._search_chemicals_safe(query, limit_per_source))
            sources.append("pubchem")

        if include_energy:
            tasks.append(self._get_energy_resources_safe(query))
            sources.append("nrel")

        # Execute all searches in parallel
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Organize results
        unified = UnifiedSearchResult(
            query=query,
            sources_queried=sources,
        )

        result_idx = 0
        if include_materials:
            if not isinstance(results[result_idx], Exception):
                unified.materials = results[result_idx]
            result_idx += 1

        if include_papers:
            # Semantic Scholar results
            if not isinstance(results[result_idx], Exception):
                unified.papers.extend(results[result_idx])
            result_idx += 1

            # arXiv results
            if not isinstance(results[result_idx], Exception):
                unified.papers.extend(results[result_idx])
            result_idx += 1

        if include_chemicals:
            if not isinstance(results[result_idx], Exception):
                unified.chemicals = results[result_idx]
            result_idx += 1

        if include_energy:
            if not isinstance(results[result_idx], Exception):
                unified.energy_resources = results[result_idx]
            result_idx += 1

        unified.search_time_seconds = (datetime.now() - start_time).total_seconds()

        return unified

    # === Safe Wrapper Methods (handle errors gracefully) ===

    async def _search_materials_safe(self, query: str, limit: int) -> List[MaterialProperty]:
        """Search materials with error handling."""
        try:
            return await self.search_materials(query, limit)
        except Exception as e:
            print(f"Materials search error: {e}")
            return []

    async def _search_papers_safe(self, query: str, limit: int) -> List[Paper]:
        """Search papers with error handling."""
        try:
            return await self.search_papers(query, limit)
        except Exception as e:
            print(f"Papers search error: {e}")
            return []

    async def _search_arxiv_safe(self, query: str, limit: int) -> List[Paper]:
        """Search arXiv with error handling."""
        try:
            return await self.search_arxiv(query, limit)
        except Exception as e:
            print(f"arXiv search error: {e}")
            return []

    async def _search_chemicals_safe(self, query: str, limit: int) -> List[Chemical]:
        """Search chemicals with error handling."""
        try:
            return await self.search_chemicals(query, limit)
        except Exception as e:
            print(f"Chemicals search error: {e}")
            return []

    async def _get_energy_resources_safe(self, query: str) -> List[EnergyResource]:
        """Get energy resources with error handling."""
        try:
            return await self.get_energy_resources(query)
        except Exception as e:
            print(f"Energy resources error: {e}")
            return []

    # === Materials Project ===

    async def search_materials(
        self,
        query: str,
        limit: int = 20,
        band_gap_range: Optional[tuple[float, float]] = None,
    ) -> List[MaterialProperty]:
        """
        Search Materials Project database.

        Interprets query as either:
        - Element symbols (e.g., "Li Fe P O")
        - Chemical formula (e.g., "LiFePO4")
        - Application keyword (e.g., "battery", "solar")
        """
        cache_key = self.cache._make_key("materials", {"query": query, "limit": limit})
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        # Parse query to determine search strategy
        query_lower = query.lower()

        # Application-based searches
        if "battery" in query_lower or "cathode" in query_lower or "anode" in query_lower:
            results = await self.materials_service.find_battery_cathode_materials(limit=limit)
        elif "solar" in query_lower or "photovoltaic" in query_lower:
            results = await self.materials_service.find_solar_materials(limit=limit)
        elif "catalyst" in query_lower or "her" in query_lower or "oer" in query_lower:
            reaction = "HER" if "her" in query_lower else "OER"
            results = await self.materials_service.find_catalyst_materials(reaction_type=reaction, limit=limit)
        else:
            # Try as element list or formula
            elements = [e.strip().capitalize() for e in query.replace(",", " ").split() if len(e) <= 2]
            if elements and all(len(e) <= 2 for e in elements):
                results = await self.materials_service.search_materials(elements=elements, limit=limit)
            else:
                results = await self.materials_service.search_materials(formula=query, limit=limit)

        self.cache.set(cache_key, results)
        return results

    async def get_material(self, material_id: str) -> Optional[MaterialProperty]:
        """Get specific material by ID."""
        cache_key = f"material:{material_id}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        result = await self.materials_service.get_material_by_id(material_id)
        if result:
            self.cache.set(cache_key, result)
        return result

    # === Semantic Scholar ===

    async def search_papers(
        self,
        query: str,
        limit: int = 20,
        year_range: Optional[tuple[int, int]] = None,
        fields_of_study: Optional[List[str]] = None,
    ) -> List[Paper]:
        """
        Search Semantic Scholar for academic papers.

        Args:
            query: Search query
            limit: Maximum results
            year_range: Optional (start_year, end_year) filter
            fields_of_study: Optional list of fields to filter by
        """
        cache_key = self.cache._make_key("papers", {"query": query, "limit": limit})
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        params = {
            "query": query,
            "limit": min(limit, 100),
            "fields": "paperId,title,authors,abstract,year,venue,citationCount,url,externalIds",
        }

        if year_range:
            params["year"] = f"{year_range[0]}-{year_range[1]}"

        if fields_of_study:
            params["fieldsOfStudy"] = ",".join(fields_of_study)

        headers = {}
        if self.semantic_scholar_key:
            headers["x-api-key"] = self.semantic_scholar_key

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.SEMANTIC_SCHOLAR_API}/paper/search",
                    params=params,
                    headers=headers,
                    timeout=30.0,
                )
                response.raise_for_status()
                data = response.json()
        except Exception:
            # Return mock data if API fails
            return self._get_mock_papers(query, limit)

        papers = []
        for paper_data in data.get("data", []):
            authors = [a.get("name", "") for a in paper_data.get("authors", [])]
            external_ids = paper_data.get("externalIds", {})

            papers.append(Paper(
                paper_id=paper_data.get("paperId", ""),
                title=paper_data.get("title", ""),
                authors=authors,
                abstract=paper_data.get("abstract", "") or "",
                year=paper_data.get("year"),
                venue=paper_data.get("venue"),
                citation_count=paper_data.get("citationCount", 0),
                url=paper_data.get("url"),
                doi=external_ids.get("DOI"),
                source="semantic_scholar",
            ))

        self.cache.set(cache_key, papers)
        return papers

    def _get_mock_papers(self, query: str, limit: int) -> List[Paper]:
        """Return mock papers for demo/testing."""
        mock_papers = [
            Paper(
                paper_id="mock-1",
                title=f"Advances in {query} for Clean Energy Applications",
                authors=["A. Researcher", "B. Scientist"],
                abstract=f"This paper reviews recent advances in {query} technology for renewable energy systems.",
                year=2024,
                venue="Nature Energy",
                citation_count=150,
                url="https://example.com/paper1",
                source="mock",
            ),
            Paper(
                paper_id="mock-2",
                title=f"High-Efficiency {query} Systems: A Comprehensive Review",
                authors=["C. Engineer", "D. Professor"],
                abstract=f"We present a comprehensive analysis of {query} efficiency improvements over the past decade.",
                year=2023,
                venue="Energy & Environmental Science",
                citation_count=89,
                url="https://example.com/paper2",
                source="mock",
            ),
            Paper(
                paper_id="mock-3",
                title=f"Machine Learning Approaches for {query} Optimization",
                authors=["E. DataScientist"],
                abstract=f"Novel machine learning methods are applied to optimize {query} performance.",
                year=2024,
                venue="Joule",
                citation_count=45,
                url="https://example.com/paper3",
                source="mock",
            ),
        ]
        return mock_papers[:limit]

    # === arXiv ===

    async def search_arxiv(
        self,
        query: str,
        limit: int = 20,
        categories: Optional[List[str]] = None,
    ) -> List[Paper]:
        """
        Search arXiv for preprints.

        Args:
            query: Search query
            limit: Maximum results
            categories: Optional arXiv categories (e.g., ["cond-mat.mtrl-sci", "physics.app-ph"])
        """
        cache_key = self.cache._make_key("arxiv", {"query": query, "limit": limit})
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        # Build arXiv query
        search_query = f"all:{query}"
        if categories:
            cat_query = " OR ".join([f"cat:{cat}" for cat in categories])
            search_query = f"({search_query}) AND ({cat_query})"

        params = {
            "search_query": search_query,
            "start": 0,
            "max_results": min(limit, 50),
            "sortBy": "relevance",
            "sortOrder": "descending",
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.ARXIV_API,
                    params=params,
                    timeout=30.0,
                )
                response.raise_for_status()

                # Parse Atom XML response
                papers = self._parse_arxiv_response(response.text)
        except Exception:
            return []

        self.cache.set(cache_key, papers)
        return papers

    def _parse_arxiv_response(self, xml_text: str) -> List[Paper]:
        """Parse arXiv Atom XML response."""
        import xml.etree.ElementTree as ET

        papers = []
        try:
            root = ET.fromstring(xml_text)
            ns = {"atom": "http://www.w3.org/2005/Atom"}

            for entry in root.findall("atom:entry", ns):
                paper_id = entry.find("atom:id", ns)
                title = entry.find("atom:title", ns)
                summary = entry.find("atom:summary", ns)
                published = entry.find("atom:published", ns)

                authors = []
                for author in entry.findall("atom:author", ns):
                    name = author.find("atom:name", ns)
                    if name is not None and name.text:
                        authors.append(name.text)

                # Extract year from published date
                year = None
                if published is not None and published.text:
                    year = int(published.text[:4])

                # Clean up title and abstract
                title_text = title.text.strip().replace("\n", " ") if title is not None and title.text else ""
                abstract_text = summary.text.strip().replace("\n", " ") if summary is not None and summary.text else ""

                papers.append(Paper(
                    paper_id=paper_id.text if paper_id is not None else "",
                    title=title_text,
                    authors=authors,
                    abstract=abstract_text,
                    year=year,
                    url=paper_id.text if paper_id is not None else None,
                    source="arxiv",
                ))
        except ET.ParseError:
            pass

        return papers

    # === PubChem ===

    async def search_chemicals(
        self,
        query: str,
        limit: int = 20,
    ) -> List[Chemical]:
        """
        Search PubChem for chemical compounds.

        Args:
            query: Chemical name, formula, or SMILES
            limit: Maximum results
        """
        cache_key = self.cache._make_key("chemicals", {"query": query, "limit": limit})
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        try:
            async with httpx.AsyncClient() as client:
                # Search for compound by name
                response = await client.get(
                    f"{self.PUBCHEM_API}/compound/name/{query}/cids/JSON",
                    timeout=30.0,
                )

                if response.status_code != 200:
                    return self._get_mock_chemicals(query, limit)

                data = response.json()
                cids = data.get("IdentifierList", {}).get("CID", [])[:limit]

                if not cids:
                    return []

                # Get detailed properties for each compound
                chemicals = []
                for cid in cids:
                    chemical = await self._get_pubchem_compound(client, cid)
                    if chemical:
                        chemicals.append(chemical)

                self.cache.set(cache_key, chemicals)
                return chemicals

        except Exception:
            return self._get_mock_chemicals(query, limit)

    async def _get_pubchem_compound(self, client: httpx.AsyncClient, cid: int) -> Optional[Chemical]:
        """Get detailed compound information from PubChem."""
        try:
            response = await client.get(
                f"{self.PUBCHEM_API}/compound/cid/{cid}/property/MolecularFormula,MolecularWeight,IUPACName,CanonicalSMILES,InChI/JSON",
                timeout=15.0,
            )

            if response.status_code != 200:
                return None

            data = response.json()
            props = data.get("PropertyTable", {}).get("Properties", [{}])[0]

            # Get synonyms
            syn_response = await client.get(
                f"{self.PUBCHEM_API}/compound/cid/{cid}/synonyms/JSON",
                timeout=15.0,
            )

            synonyms = []
            if syn_response.status_code == 200:
                syn_data = syn_response.json()
                info_list = syn_data.get("InformationList", {}).get("Information", [{}])
                if info_list:
                    synonyms = info_list[0].get("Synonym", [])[:10]

            return Chemical(
                cid=cid,
                name=synonyms[0] if synonyms else str(cid),
                molecular_formula=props.get("MolecularFormula"),
                molecular_weight=props.get("MolecularWeight"),
                iupac_name=props.get("IUPACName"),
                smiles=props.get("CanonicalSMILES"),
                inchi=props.get("InChI"),
                synonyms=synonyms,
            )
        except Exception:
            return None

    def _get_mock_chemicals(self, query: str, limit: int) -> List[Chemical]:
        """Return mock chemicals for demo/testing."""
        mock_chemicals = [
            Chemical(
                cid=5793,
                name="Glucose",
                molecular_formula="C6H12O6",
                molecular_weight=180.16,
                iupac_name="(2R,3S,4R,5R)-2,3,4,5,6-pentahydroxyhexanal",
                smiles="OC[C@H]1OC(O)[C@H](O)[C@@H](O)[C@@H]1O",
                synonyms=["D-Glucose", "Dextrose", "Blood sugar"],
            ),
            Chemical(
                cid=962,
                name="Water",
                molecular_formula="H2O",
                molecular_weight=18.015,
                iupac_name="oxidane",
                smiles="O",
                synonyms=["Water", "Dihydrogen oxide"],
            ),
        ]
        return mock_chemicals[:limit]

    async def get_chemical(self, cid: int) -> Optional[Chemical]:
        """Get specific chemical by PubChem CID."""
        cache_key = f"chemical:{cid}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        async with httpx.AsyncClient() as client:
            result = await self._get_pubchem_compound(client, cid)
            if result:
                self.cache.set(cache_key, result)
            return result

    # === NREL Energy Data ===

    async def get_energy_resources(
        self,
        query: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
    ) -> List[EnergyResource]:
        """
        Get energy resource data.

        Args:
            query: Resource type (solar, wind) or location name
            latitude: Optional latitude for location-specific data
            longitude: Optional longitude for location-specific data
        """
        # If no location specified, return general resource info
        if latitude is None or longitude is None:
            return self._get_general_energy_resources(query)

        cache_key = self.cache._make_key("energy", {
            "query": query,
            "lat": latitude,
            "lon": longitude,
        })
        cached = self.cache.get(cache_key)
        if cached:
            return cached

        if not self.nrel_key:
            return self._get_mock_energy_resources(query, latitude, longitude)

        resources = []

        # Query NREL NSRDB for solar data
        if "solar" in query.lower() or "all" in query.lower():
            solar_data = await self._get_nrel_solar(latitude, longitude)
            if solar_data:
                resources.append(solar_data)

        # Query NREL for wind data
        if "wind" in query.lower() or "all" in query.lower():
            wind_data = await self._get_nrel_wind(latitude, longitude)
            if wind_data:
                resources.append(wind_data)

        self.cache.set(cache_key, resources)
        return resources

    async def _get_nrel_solar(self, lat: float, lon: float) -> Optional[EnergyResource]:
        """Get solar resource data from NREL."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.NREL_API}/solar/solar_resource/v1.json",
                    params={
                        "api_key": self.nrel_key,
                        "lat": lat,
                        "lon": lon,
                    },
                    timeout=30.0,
                )

                if response.status_code != 200:
                    return None

                data = response.json()
                outputs = data.get("outputs", {})

                return EnergyResource(
                    resource_type="solar",
                    latitude=lat,
                    longitude=lon,
                    annual_average=outputs.get("avg_ghi", {}).get("annual"),
                    capacity_factor=outputs.get("avg_ghi", {}).get("annual", 0) / 8760 if outputs.get("avg_ghi") else None,
                    unit="kWh/m2/day",
                    data_source="NREL NSRDB",
                )
        except Exception:
            return None

    async def _get_nrel_wind(self, lat: float, lon: float) -> Optional[EnergyResource]:
        """Get wind resource data from NREL."""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.NREL_API}/wind-toolkit/v2/wind/wtk-srw-download",
                    params={
                        "api_key": self.nrel_key,
                        "lat": lat,
                        "lon": lon,
                    },
                    timeout=30.0,
                )

                if response.status_code != 200:
                    return None

                data = response.json()

                return EnergyResource(
                    resource_type="wind",
                    latitude=lat,
                    longitude=lon,
                    annual_average=data.get("outputs", {}).get("wind_speed_mean"),
                    capacity_factor=0.35,  # Typical onshore wind
                    unit="m/s",
                    data_source="NREL Wind Toolkit",
                )
        except Exception:
            return None

    def _get_general_energy_resources(self, query: str) -> List[EnergyResource]:
        """Return general energy resource information."""
        resources = []

        query_lower = query.lower()

        if "solar" in query_lower:
            resources.append(EnergyResource(
                resource_type="solar",
                location="US Average",
                annual_average=4.5,
                capacity_factor=0.25,
                unit="kWh/m2/day",
                data_source="NREL Average",
            ))

        if "wind" in query_lower:
            resources.append(EnergyResource(
                resource_type="wind",
                location="US Average",
                annual_average=7.0,
                capacity_factor=0.35,
                unit="m/s at 100m",
                data_source="NREL Average",
            ))

        return resources

    def _get_mock_energy_resources(self, query: str, lat: float, lon: float) -> List[EnergyResource]:
        """Return mock energy resources for demo."""
        resources = []

        if "solar" in query.lower() or "all" in query.lower():
            resources.append(EnergyResource(
                resource_type="solar",
                latitude=lat,
                longitude=lon,
                annual_average=5.2,
                capacity_factor=0.22,
                unit="kWh/m2/day",
                data_source="Mock Data",
            ))

        if "wind" in query.lower() or "all" in query.lower():
            resources.append(EnergyResource(
                resource_type="wind",
                latitude=lat,
                longitude=lon,
                annual_average=6.8,
                capacity_factor=0.32,
                unit="m/s at 100m",
                data_source="Mock Data",
            ))

        return resources

    # === Clean Energy Specific Searches ===

    async def search_clean_energy_materials(
        self,
        application: str,
        limit: int = 20,
    ) -> Dict[str, Any]:
        """
        Search for materials relevant to clean energy applications.

        Applications:
        - solar: Photovoltaic materials
        - battery: Electrode and electrolyte materials
        - catalyst: HER, OER, CO2RR catalysts
        - thermoelectric: TE materials
        - fuel_cell: SOFC, PEMFC materials
        """
        # Search materials
        materials = await self.search_materials(application, limit)

        # Search related papers
        papers = await self.search_papers(f"{application} materials clean energy", limit // 2)

        return {
            "application": application,
            "materials": [m.model_dump() if hasattr(m, 'model_dump') else vars(m) for m in materials],
            "papers": [p.to_dict() for p in papers],
            "total_materials": len(materials),
            "total_papers": len(papers),
        }

    async def get_technology_overview(
        self,
        technology: str,
    ) -> Dict[str, Any]:
        """
        Get comprehensive overview of a clean energy technology.

        Combines data from multiple sources.
        """
        # Parallel searches
        results = await asyncio.gather(
            self.search_papers(f"{technology} technology review", 10),
            self.search_materials(technology, 10),
            self.search_arxiv(f"{technology} renewable energy", 5),
            return_exceptions=True,
        )

        papers = results[0] if not isinstance(results[0], Exception) else []
        materials = results[1] if not isinstance(results[1], Exception) else []
        preprints = results[2] if not isinstance(results[2], Exception) else []

        return {
            "technology": technology,
            "peer_reviewed_papers": [p.to_dict() for p in papers],
            "relevant_materials": [m.model_dump() if hasattr(m, 'model_dump') else vars(m) for m in materials],
            "recent_preprints": [p.to_dict() for p in preprints],
            "summary": {
                "total_papers": len(papers),
                "total_materials": len(materials),
                "total_preprints": len(preprints),
            },
        }


# Singleton instance
dataset_hub = DatasetHub()
