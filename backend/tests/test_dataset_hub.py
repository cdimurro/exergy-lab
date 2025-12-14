"""
Unit tests for Dataset Hub service.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.dataset_hub import (
    SimpleCache, Paper, Chemical, EnergyResource,
    UnifiedSearchResult, DatasetHub
)


class TestSimpleCache:
    """Tests for SimpleCache class."""

    def test_cache_set_and_get(self):
        """Test setting and getting values from cache."""
        cache = SimpleCache(default_ttl_minutes=15)
        cache.set("test_key", {"data": "test_value"})

        result = cache.get("test_key")
        assert result == {"data": "test_value"}

    def test_cache_miss(self):
        """Test cache miss returns None."""
        cache = SimpleCache()
        result = cache.get("nonexistent_key")
        assert result is None

    def test_cache_clear(self):
        """Test clearing cache."""
        cache = SimpleCache()
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.clear()

        assert cache.get("key1") is None
        assert cache.get("key2") is None

    def test_make_key(self):
        """Test cache key generation."""
        cache = SimpleCache()
        key1 = cache._make_key("prefix", {"a": 1, "b": 2})
        key2 = cache._make_key("prefix", {"b": 2, "a": 1})  # Same params, different order

        # Keys should be the same regardless of parameter order
        assert key1 == key2


class TestPaperDataClass:
    """Tests for Paper dataclass."""

    def test_paper_creation(self):
        """Test creating a Paper instance."""
        paper = Paper(
            paper_id="test-123",
            title="Test Paper Title",
            authors=["Author A", "Author B"],
            abstract="This is a test abstract.",
            year=2024,
            venue="Test Journal",
            citation_count=100,
            url="https://example.com/paper",
            source="semantic_scholar",
        )

        assert paper.paper_id == "test-123"
        assert paper.title == "Test Paper Title"
        assert len(paper.authors) == 2
        assert paper.citation_count == 100

    def test_paper_to_dict(self):
        """Test Paper.to_dict() method."""
        paper = Paper(
            paper_id="test-123",
            title="Test Paper",
            authors=["Author A"],
            abstract="Abstract",
            year=2024,
        )

        result = paper.to_dict()

        assert isinstance(result, dict)
        assert result["paper_id"] == "test-123"
        assert result["title"] == "Test Paper"
        assert result["source"] == "semantic_scholar"  # default value


class TestChemicalDataClass:
    """Tests for Chemical dataclass."""

    def test_chemical_creation(self):
        """Test creating a Chemical instance."""
        chemical = Chemical(
            cid=5793,
            name="Glucose",
            molecular_formula="C6H12O6",
            molecular_weight=180.16,
            iupac_name="pentahydroxyhexanal",
            smiles="OC[C@H]1OC(O)...",
        )

        assert chemical.cid == 5793
        assert chemical.name == "Glucose"
        assert chemical.molecular_weight == 180.16

    def test_chemical_to_dict(self):
        """Test Chemical.to_dict() method."""
        chemical = Chemical(
            cid=962,
            name="Water",
            molecular_formula="H2O",
        )

        result = chemical.to_dict()

        assert isinstance(result, dict)
        assert result["cid"] == 962
        assert result["name"] == "Water"


class TestEnergyResourceDataClass:
    """Tests for EnergyResource dataclass."""

    def test_energy_resource_creation(self):
        """Test creating an EnergyResource instance."""
        resource = EnergyResource(
            resource_type="solar",
            location="US Average",
            annual_average=4.5,
            capacity_factor=0.25,
        )

        assert resource.resource_type == "solar"
        assert resource.annual_average == 4.5
        assert resource.unit == "kWh/m2/day"  # default


class TestUnifiedSearchResult:
    """Tests for UnifiedSearchResult dataclass."""

    def test_unified_result_creation(self):
        """Test creating a UnifiedSearchResult instance."""
        paper = Paper(
            paper_id="1",
            title="Test",
            authors=["A"],
            abstract="Abstract",
        )

        result = UnifiedSearchResult(
            query="test query",
            papers=[paper],
            search_time_seconds=0.5,
            sources_queried=["semantic_scholar"],
        )

        assert result.query == "test query"
        assert len(result.papers) == 1
        assert result.search_time_seconds == 0.5

    def test_unified_result_to_dict(self):
        """Test UnifiedSearchResult.to_dict() with total_results."""
        paper = Paper(
            paper_id="1",
            title="Test",
            authors=["A"],
            abstract="Abstract",
        )
        chemical = Chemical(cid=1, name="Test Chemical")

        result = UnifiedSearchResult(
            query="test",
            papers=[paper],
            chemicals=[chemical],
        )

        result_dict = result.to_dict()

        assert result_dict["total_results"] == 2  # 1 paper + 1 chemical


class TestDatasetHub:
    """Tests for DatasetHub service."""

    @pytest.mark.asyncio
    async def test_get_mock_papers(self):
        """Test mock paper generation."""
        hub = DatasetHub()
        papers = hub._get_mock_papers("solar cells", 3)

        assert len(papers) == 3
        assert all(hasattr(p, 'title') for p in papers)
        assert all("solar cells" in p.title.lower() for p in papers)

    @pytest.mark.asyncio
    async def test_get_mock_chemicals(self):
        """Test mock chemical generation."""
        hub = DatasetHub()
        chemicals = hub._get_mock_chemicals("water", 2)

        assert len(chemicals) == 2
        assert all(hasattr(c, 'name') for c in chemicals)

    @pytest.mark.asyncio
    async def test_get_general_energy_resources(self):
        """Test general energy resource data."""
        hub = DatasetHub()
        resources = hub._get_general_energy_resources("solar")

        assert len(resources) >= 1
        assert resources[0].resource_type == "solar"

    @pytest.mark.asyncio
    async def test_search_materials_battery(self):
        """Test materials search for battery application."""
        hub = DatasetHub()
        materials = await hub.search_materials("battery", limit=5)

        assert isinstance(materials, list)
        # Results come from mock or Materials Project

    @pytest.mark.asyncio
    async def test_search_materials_solar(self):
        """Test materials search for solar application."""
        hub = DatasetHub()
        materials = await hub.search_materials("solar", limit=5)

        assert isinstance(materials, list)

    @pytest.mark.asyncio
    async def test_parse_arxiv_response(self):
        """Test arXiv XML parsing."""
        hub = DatasetHub()

        # Sample arXiv Atom XML
        sample_xml = '''<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <entry>
            <id>http://arxiv.org/abs/2401.12345</id>
            <title>Test Paper Title</title>
            <summary>This is the abstract.</summary>
            <published>2024-01-15T00:00:00Z</published>
            <author><name>Test Author</name></author>
          </entry>
        </feed>'''

        papers = hub._parse_arxiv_response(sample_xml)

        assert len(papers) == 1
        assert papers[0].title == "Test Paper Title"
        assert papers[0].year == 2024
        assert "Test Author" in papers[0].authors

    @pytest.mark.asyncio
    async def test_search_all_safe_execution(self):
        """Test that search_all handles errors gracefully."""
        hub = DatasetHub()

        # This should not raise even if APIs fail
        results = await hub.search_all(
            query="test",
            include_materials=True,
            include_papers=False,
            include_chemicals=False,
            include_energy=False,
            limit_per_source=5,
        )

        assert results.query == "test"
        assert "materials_project" in results.sources_queried
