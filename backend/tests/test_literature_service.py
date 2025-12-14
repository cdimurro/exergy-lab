"""
Unit tests for Literature Service.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.literature_service import (
    CitationNode, ResearchGap, LiteratureSynthesis, LiteratureService
)
from app.services.dataset_hub import Paper


class TestCitationNodeDataClass:
    """Tests for CitationNode dataclass."""

    def test_citation_node_creation(self):
        """Test creating a CitationNode instance."""
        node = CitationNode(
            paper_id="paper-123",
            title="Test Paper",
            citations=50,
            references=["ref-1", "ref-2"],
            cited_by=["cite-1"],
        )

        assert node.paper_id == "paper-123"
        assert node.title == "Test Paper"
        assert node.citations == 50
        assert len(node.references) == 2
        assert len(node.cited_by) == 1


class TestResearchGapDataClass:
    """Tests for ResearchGap dataclass."""

    def test_research_gap_creation(self):
        """Test creating a ResearchGap instance."""
        gap = ResearchGap(
            area="Novel electrolyte materials",
            description="Limited research on solid-state electrolytes for sodium-ion batteries",
            opportunity_score=0.85,
            related_papers=["paper-1", "paper-2"],
            suggested_approaches=["approach-1"],
        )

        assert gap.area == "Novel electrolyte materials"
        assert gap.opportunity_score == 0.85
        assert len(gap.related_papers) == 2

    def test_research_gap_defaults(self):
        """Test ResearchGap default values."""
        gap = ResearchGap(
            area="Test Area",
            description="Test description",
            opportunity_score=0.5,
        )

        assert gap.related_papers == []
        assert gap.suggested_approaches == []


class TestLiteratureSynthesisDataClass:
    """Tests for LiteratureSynthesis dataclass."""

    def test_literature_synthesis_creation(self):
        """Test creating a LiteratureSynthesis instance."""
        paper = Paper(
            paper_id="1",
            title="Test",
            authors=["A"],
            abstract="Abstract",
        )
        gap = ResearchGap(
            area="Gap",
            description="Desc",
            opportunity_score=0.7,
        )

        synthesis = LiteratureSynthesis(
            query="perovskite solar cells",
            papers_analyzed=10,
            key_findings=["Finding 1", "Finding 2"],
            research_gaps=[gap],
            trending_topics=["Topic 1"],
            seminal_papers=[paper],
            synthesis_text="Comprehensive analysis...",
        )

        assert synthesis.query == "perovskite solar cells"
        assert synthesis.papers_analyzed == 10
        assert len(synthesis.key_findings) == 2
        assert len(synthesis.research_gaps) == 1

    def test_literature_synthesis_to_dict(self):
        """Test LiteratureSynthesis.to_dict() method."""
        synthesis = LiteratureSynthesis(
            query="test query",
            papers_analyzed=5,
            key_findings=["Finding"],
            research_gaps=[],
            trending_topics=["Topic"],
            seminal_papers=[],
            synthesis_text="Text",
        )

        result = synthesis.to_dict()

        assert isinstance(result, dict)
        assert result["query"] == "test query"
        assert result["papers_analyzed"] == 5


class TestLiteratureService:
    """Tests for LiteratureService."""

    @pytest.mark.asyncio
    async def test_search_literature(self):
        """Test literature search functionality."""
        service = LiteratureService()
        papers = await service.search_literature("solar cells", limit=10)

        assert isinstance(papers, list)
        # Should return papers from dataset hub

    @pytest.mark.asyncio
    async def test_search_literature_with_filters(self):
        """Test literature search with year filter."""
        service = LiteratureService()
        papers = await service.search_literature(
            "battery materials",
            limit=5,
            year_from=2020,
        )

        assert isinstance(papers, list)

    @pytest.mark.asyncio
    async def test_synthesize_literature_with_papers(self):
        """Test literature synthesis with provided papers."""
        service = LiteratureService()

        # Create test papers
        papers = [
            Paper(
                paper_id="1",
                title="Advances in Perovskite Solar Cells",
                authors=["Author A"],
                abstract="This paper discusses recent advances...",
                year=2023,
                citation_count=100,
            ),
            Paper(
                paper_id="2",
                title="Stability of Perovskite Materials",
                authors=["Author B"],
                abstract="Stability remains a challenge...",
                year=2022,
                citation_count=50,
            ),
        ]

        synthesis = await service.synthesize_literature(
            "perovskite solar cells",
            papers=papers,
        )

        assert synthesis.query == "perovskite solar cells"
        assert synthesis.papers_analyzed == 2

    @pytest.mark.asyncio
    async def test_identify_white_space(self):
        """Test research white space identification."""
        service = LiteratureService()
        result = await service.identify_white_space("solid-state batteries")

        assert "research_area" in result
        assert "gaps" in result
        assert isinstance(result["gaps"], list)

    @pytest.mark.asyncio
    async def test_build_citation_graph(self):
        """Test citation graph building."""
        service = LiteratureService()

        papers = [
            Paper(
                paper_id="1",
                title="Paper A",
                authors=["A"],
                abstract="Abstract",
                citation_count=100,
            ),
            Paper(
                paper_id="2",
                title="Paper B",
                authors=["B"],
                abstract="Abstract",
                citation_count=50,
            ),
        ]

        graph = service._build_citation_graph(papers)

        assert isinstance(graph, dict)
        assert "nodes" in graph
        assert "edges" in graph
        assert len(graph["nodes"]) == 2

    def test_extract_topics_from_papers(self):
        """Test topic extraction from papers."""
        service = LiteratureService()

        papers = [
            Paper(
                paper_id="1",
                title="Machine Learning for Battery Optimization",
                authors=["A"],
                abstract="We use neural networks for battery analysis",
            ),
            Paper(
                paper_id="2",
                title="Deep Learning in Energy Storage",
                authors=["B"],
                abstract="Deep learning models for battery management",
            ),
        ]

        topics = service._extract_topics_from_papers(papers)

        assert isinstance(topics, list)
        assert len(topics) > 0

    def test_identify_seminal_papers(self):
        """Test identification of seminal papers."""
        service = LiteratureService()

        papers = [
            Paper(
                paper_id="1",
                title="Paper A",
                authors=["A"],
                abstract="Abstract",
                citation_count=500,
            ),
            Paper(
                paper_id="2",
                title="Paper B",
                authors=["B"],
                abstract="Abstract",
                citation_count=50,
            ),
            Paper(
                paper_id="3",
                title="Paper C",
                authors=["C"],
                abstract="Abstract",
                citation_count=200,
            ),
        ]

        seminal = service._identify_seminal_papers(papers, top_n=2)

        assert len(seminal) == 2
        # Should be sorted by citation count
        assert seminal[0].citation_count >= seminal[1].citation_count
