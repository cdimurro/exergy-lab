"""
Unit tests for Discovery Engine service.
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.discovery_engine import (
    Hypothesis, DiscoveryResult, DiscoveryEngine
)


class TestHypothesisDataClass:
    """Tests for Hypothesis dataclass."""

    def test_hypothesis_creation(self):
        """Test creating a Hypothesis instance."""
        hypothesis = Hypothesis(
            id="hyp-001",
            text="Using perovskite-silicon tandem cells could achieve 30% efficiency",
            category="materials",
            confidence_score=0.85,
            novelty_score=0.7,
            feasibility_score=0.8,
            supporting_evidence=["Paper 1", "Paper 2"],
            required_experiments=["Experiment 1"],
            estimated_cost="$50,000-100,000",
            timeline="6-12 months",
        )

        assert hypothesis.id == "hyp-001"
        assert hypothesis.category == "materials"
        assert hypothesis.confidence_score == 0.85
        assert len(hypothesis.supporting_evidence) == 2

    def test_hypothesis_to_dict(self):
        """Test Hypothesis.to_dict() method."""
        hypothesis = Hypothesis(
            id="hyp-001",
            text="Test hypothesis",
            category="process",
            confidence_score=0.75,
        )

        result = hypothesis.to_dict()

        assert isinstance(result, dict)
        assert result["id"] == "hyp-001"
        assert result["text"] == "Test hypothesis"
        assert result["confidence_score"] == 0.75

    def test_hypothesis_defaults(self):
        """Test Hypothesis default values."""
        hypothesis = Hypothesis(
            id="hyp-001",
            text="Test",
            category="materials",
            confidence_score=0.5,
        )

        assert hypothesis.novelty_score == 0.0
        assert hypothesis.feasibility_score == 0.0
        assert hypothesis.supporting_evidence == []
        assert hypothesis.required_experiments == []


class TestDiscoveryResultDataClass:
    """Tests for DiscoveryResult dataclass."""

    def test_discovery_result_creation(self):
        """Test creating a DiscoveryResult instance."""
        hypothesis = Hypothesis(
            id="hyp-001",
            text="Test hypothesis",
            category="materials",
            confidence_score=0.8,
        )

        result = DiscoveryResult(
            discovery_id="disc-001",
            problem_statement="How to improve battery efficiency",
            status="completed",
            hypotheses=[hypothesis],
            total_hypotheses_generated=50,
            papers_analyzed=100,
            patents_reviewed=25,
            materials_evaluated=10,
            progress=100.0,
            started_at="2024-01-01T00:00:00Z",
            completed_at="2024-01-01T01:00:00Z",
        )

        assert result.discovery_id == "disc-001"
        assert result.status == "completed"
        assert len(result.hypotheses) == 1
        assert result.progress == 100.0

    def test_discovery_result_to_dict(self):
        """Test DiscoveryResult.to_dict() method."""
        result = DiscoveryResult(
            discovery_id="disc-001",
            problem_statement="Test problem",
            status="in_progress",
            hypotheses=[],
            total_hypotheses_generated=10,
            papers_analyzed=50,
            patents_reviewed=10,
            progress=50.0,
        )

        result_dict = result.to_dict()

        assert isinstance(result_dict, dict)
        assert result_dict["discovery_id"] == "disc-001"
        assert result_dict["progress"] == 50.0


class TestDiscoveryEngine:
    """Tests for DiscoveryEngine service."""

    @pytest.mark.asyncio
    async def test_start_discovery(self):
        """Test starting a new discovery."""
        engine = DiscoveryEngine()
        result = await engine.start_discovery(
            problem_statement="How to improve lithium-ion battery energy density",
            constraints={
                "budget": "$100,000",
                "timeline": "12 months",
                "focus_areas": ["materials", "manufacturing"],
            },
            user_id="test-user",
        )

        assert result.discovery_id is not None
        assert result.problem_statement == "How to improve lithium-ion battery energy density"
        assert result.status in ["pending", "in_progress"]

    @pytest.mark.asyncio
    async def test_get_discovery_status(self):
        """Test getting discovery status."""
        engine = DiscoveryEngine()

        # Start a discovery first
        discovery = await engine.start_discovery(
            problem_statement="Test problem",
            user_id="test-user",
        )

        # Get status
        status = await engine.get_discovery_status(discovery.discovery_id)

        assert status is not None
        assert status.discovery_id == discovery.discovery_id

    @pytest.mark.asyncio
    async def test_generate_hypotheses(self):
        """Test hypothesis generation."""
        engine = DiscoveryEngine()

        hypotheses = await engine.generate_hypotheses(
            problem_statement="How to reduce cost of solar cells",
            context={
                "current_technology": "silicon",
                "target_efficiency": "25%",
            },
            num_hypotheses=5,
        )

        assert isinstance(hypotheses, list)
        assert len(hypotheses) <= 5
        assert all(hasattr(h, 'text') for h in hypotheses)
        assert all(hasattr(h, 'confidence_score') for h in hypotheses)

    @pytest.mark.asyncio
    async def test_rank_hypotheses(self):
        """Test hypothesis ranking."""
        engine = DiscoveryEngine()

        hypotheses = [
            Hypothesis(
                id="1",
                text="Hypothesis A",
                category="materials",
                confidence_score=0.6,
                novelty_score=0.8,
                feasibility_score=0.7,
            ),
            Hypothesis(
                id="2",
                text="Hypothesis B",
                category="process",
                confidence_score=0.9,
                novelty_score=0.5,
                feasibility_score=0.9,
            ),
            Hypothesis(
                id="3",
                text="Hypothesis C",
                category="materials",
                confidence_score=0.7,
                novelty_score=0.9,
                feasibility_score=0.6,
            ),
        ]

        ranked = engine._rank_hypotheses(hypotheses)

        assert len(ranked) == 3
        # Should be ranked by composite score

    @pytest.mark.asyncio
    async def test_validate_problem_statement(self):
        """Test problem statement validation."""
        engine = DiscoveryEngine()

        # Valid problem statement
        valid = engine._validate_problem_statement(
            "How can we improve the efficiency of perovskite solar cells?"
        )
        assert valid is True

        # Too short
        short = engine._validate_problem_statement("Hi")
        assert short is False

    @pytest.mark.asyncio
    async def test_list_discoveries(self):
        """Test listing user discoveries."""
        engine = DiscoveryEngine()

        # Create a couple discoveries
        await engine.start_discovery(
            problem_statement="Problem 1",
            user_id="test-user-list",
        )
        await engine.start_discovery(
            problem_statement="Problem 2",
            user_id="test-user-list",
        )

        discoveries = await engine.list_discoveries("test-user-list")

        assert isinstance(discoveries, list)
        assert len(discoveries) >= 2

    @pytest.mark.asyncio
    async def test_get_nonexistent_discovery(self):
        """Test getting a non-existent discovery."""
        engine = DiscoveryEngine()
        status = await engine.get_discovery_status("nonexistent-id")

        assert status is None

    @pytest.mark.asyncio
    async def test_hypothesis_categories(self):
        """Test that hypotheses have valid categories."""
        engine = DiscoveryEngine()

        hypotheses = await engine.generate_hypotheses(
            problem_statement="Improve wind turbine efficiency",
            num_hypotheses=10,
        )

        valid_categories = ["materials", "process", "design", "system", "software", "other"]
        for h in hypotheses:
            assert h.category in valid_categories

    @pytest.mark.asyncio
    async def test_discovery_progress_tracking(self):
        """Test that discovery tracks progress."""
        engine = DiscoveryEngine()

        discovery = await engine.start_discovery(
            problem_statement="Test problem for progress",
            user_id="test-user",
        )

        # Progress should be between 0 and 100
        assert 0 <= discovery.progress <= 100

    @pytest.mark.asyncio
    async def test_generate_report(self):
        """Test discovery report generation."""
        engine = DiscoveryEngine()

        # Start and complete a discovery
        discovery = await engine.start_discovery(
            problem_statement="How to improve energy storage",
            user_id="test-user",
        )

        report = await engine.generate_report(discovery.discovery_id)

        assert report is not None
        assert "discovery_id" in report
        assert "problem_statement" in report
        assert "executive_summary" in report
