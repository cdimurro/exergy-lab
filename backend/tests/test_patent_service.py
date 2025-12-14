"""
Unit tests for Patent Service.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.patent_service import (
    Patent, PatentLandscape, PatentService
)


class TestPatentDataClass:
    """Tests for Patent dataclass."""

    def test_patent_creation(self):
        """Test creating a Patent instance."""
        patent = Patent(
            patent_id="US12345678",
            title="Advanced Battery Technology",
            abstract="A method for improving battery performance...",
            assignee="Energy Corp",
            inventors=["John Doe", "Jane Smith"],
            filing_date="2023-01-15",
            publication_date="2023-07-15",
            status="granted",
            claims=["Claim 1", "Claim 2"],
            citations=10,
            classification_codes=["H01M", "H02J"],
        )

        assert patent.patent_id == "US12345678"
        assert patent.title == "Advanced Battery Technology"
        assert patent.assignee == "Energy Corp"
        assert len(patent.inventors) == 2
        assert patent.status == "granted"

    def test_patent_to_dict(self):
        """Test Patent.to_dict() method."""
        patent = Patent(
            patent_id="US12345678",
            title="Test Patent",
            abstract="Abstract",
            assignee="Company",
            inventors=["Inventor"],
            filing_date="2023-01-01",
        )

        result = patent.to_dict()

        assert isinstance(result, dict)
        assert result["patent_id"] == "US12345678"
        assert result["title"] == "Test Patent"

    def test_patent_defaults(self):
        """Test Patent default values."""
        patent = Patent(
            patent_id="US12345678",
            title="Test Patent",
            abstract="Abstract",
            assignee="Company",
            inventors=["Inventor"],
            filing_date="2023-01-01",
        )

        assert patent.publication_date is None
        assert patent.status == "pending"
        assert patent.claims == []
        assert patent.citations == 0
        assert patent.classification_codes == []


class TestPatentLandscapeDataClass:
    """Tests for PatentLandscape dataclass."""

    def test_patent_landscape_creation(self):
        """Test creating a PatentLandscape instance."""
        patent = Patent(
            patent_id="US12345678",
            title="Test",
            abstract="Abstract",
            assignee="Company",
            inventors=["Inventor"],
            filing_date="2023-01-01",
        )

        landscape = PatentLandscape(
            technology_area="Battery Technology",
            total_patents=1000,
            patents_by_year={"2023": 200, "2022": 180},
            top_assignees=[("Company A", 100), ("Company B", 80)],
            key_patents=[patent],
            emerging_areas=["Solid-state", "Sodium-ion"],
            white_spaces=["Novel electrolytes"],
            trend_analysis="Growing interest in...",
        )

        assert landscape.technology_area == "Battery Technology"
        assert landscape.total_patents == 1000
        assert len(landscape.patents_by_year) == 2
        assert len(landscape.top_assignees) == 2

    def test_patent_landscape_to_dict(self):
        """Test PatentLandscape.to_dict() method."""
        landscape = PatentLandscape(
            technology_area="Solar",
            total_patents=500,
            patents_by_year={"2023": 100},
            top_assignees=[("Company", 50)],
            key_patents=[],
            emerging_areas=["Perovskite"],
            white_spaces=[],
            trend_analysis="Analysis",
        )

        result = landscape.to_dict()

        assert isinstance(result, dict)
        assert result["technology_area"] == "Solar"
        assert result["total_patents"] == 500


class TestPatentService:
    """Tests for PatentService."""

    @pytest.mark.asyncio
    async def test_search_patents(self):
        """Test patent search functionality."""
        service = PatentService()
        patents = await service.search_patents("lithium battery", limit=10)

        assert isinstance(patents, list)
        assert all(hasattr(p, 'patent_id') for p in patents)
        assert all(hasattr(p, 'title') for p in patents)

    @pytest.mark.asyncio
    async def test_search_patents_with_technology_area(self):
        """Test patent search with technology area filter."""
        service = PatentService()
        patents = await service.search_patents(
            "energy storage",
            technology_area="battery",
            limit=5,
        )

        assert isinstance(patents, list)

    @pytest.mark.asyncio
    async def test_analyze_landscape(self):
        """Test patent landscape analysis."""
        service = PatentService()
        landscape = await service.analyze_landscape("battery", years=5)

        assert landscape.technology_area == "battery"
        assert landscape.total_patents > 0
        assert len(landscape.patents_by_year) > 0
        assert len(landscape.top_assignees) > 0

    @pytest.mark.asyncio
    async def test_freedom_to_operate_analysis(self):
        """Test freedom to operate analysis."""
        service = PatentService()
        result = await service.freedom_to_operate_analysis(
            technology_description="A novel solid-state battery using ceramic electrolyte",
            target_markets=["US", "EU"],
        )

        assert "technology" in result
        assert "target_markets" in result
        assert "risk_assessment" in result
        assert "relevant_patents" in result
        assert "recommendations" in result

    @pytest.mark.asyncio
    async def test_get_mock_patents(self):
        """Test mock patent generation."""
        service = PatentService()
        patents = service._get_mock_patents("solar cell", 5)

        assert len(patents) == 5
        assert all("solar cell" in p.title.lower() for p in patents)
        assert all(p.status in ["granted", "pending", "published"] for p in patents)

    @pytest.mark.asyncio
    async def test_generate_mock_landscape(self):
        """Test mock landscape generation."""
        service = PatentService()
        landscape = service._generate_mock_landscape("wind turbine", 10)

        assert landscape.technology_area == "wind turbine"
        assert landscape.total_patents > 0
        assert len(landscape.emerging_areas) > 0
        assert len(landscape.white_spaces) > 0

    @pytest.mark.asyncio
    async def test_landscape_trend_analysis(self):
        """Test that landscape includes trend analysis."""
        service = PatentService()
        landscape = await service.analyze_landscape("hydrogen", years=3)

        assert landscape.trend_analysis is not None
        assert len(landscape.trend_analysis) > 0

    @pytest.mark.asyncio
    async def test_fto_risk_levels(self):
        """Test FTO analysis returns valid risk levels."""
        service = PatentService()
        result = await service.freedom_to_operate_analysis(
            technology_description="Electric vehicle charging system",
            target_markets=["US"],
        )

        risk = result["risk_assessment"]["overall_risk"]
        assert risk in ["low", "medium", "high"]

    @pytest.mark.asyncio
    async def test_patent_classification_codes(self):
        """Test that patents include classification codes."""
        service = PatentService()
        patents = await service.search_patents("fuel cell", limit=3)

        # At least some patents should have classification codes
        has_codes = any(len(p.classification_codes) > 0 for p in patents)
        assert has_codes
