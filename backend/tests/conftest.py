"""
Pytest configuration and fixtures for Clean Energy Platform tests.
"""

import pytest
import asyncio
import sys
import os
from typing import Generator, AsyncGenerator
from unittest.mock import MagicMock, AsyncMock

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Mock WeasyPrint before any imports that might use it
# This prevents the libgobject-2.0-0 library error on systems without GTK
weasyprint_mock = MagicMock()
weasyprint_mock.HTML = MagicMock()
weasyprint_mock.CSS = MagicMock()
sys.modules['weasyprint'] = weasyprint_mock


@pytest.fixture(scope="session")
def event_loop() -> Generator[asyncio.AbstractEventLoop, None, None]:
    """Create an event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_ai_service():
    """Mock AI service for testing without API calls."""
    mock = MagicMock()
    mock.generate = AsyncMock(return_value="Mock AI response for testing.")
    mock.stream = AsyncMock()
    mock.generate_tea_insights = AsyncMock(return_value="Mock TEA insights.")
    mock.explain_exergy_analysis = AsyncMock(return_value="Mock exergy explanation.")
    mock.generate_hypotheses = AsyncMock(return_value=[
        {
            "hypothesis": "Test hypothesis 1",
            "rationale": "Test rationale",
            "feasibility_score": 8.0,
            "novelty_score": 7.0,
            "impact_score": 9.0,
        }
    ])
    return mock


@pytest.fixture
def sample_tea_input():
    """Sample TEA input data for testing."""
    return {
        "project_name": "Test Solar Project",
        "technology_type": "solar",
        "capacity_mw": 100,
        "capacity_factor": 0.25,
        "capex_per_kw": 1000,
        "installation_factor": 1.2,
        "land_cost": 500000,
        "grid_connection_cost": 200000,
        "opex_per_kw_year": 15,
        "fixed_opex_annual": 100000,
        "variable_opex_per_mwh": 2,
        "insurance_rate": 0.01,
        "project_lifetime_years": 25,
        "discount_rate": 0.08,
        "debt_ratio": 0.6,
        "interest_rate": 0.05,
        "tax_rate": 0.21,
        "depreciation_years": 20,
        "electricity_price_per_mwh": 50,
        "price_escalation_rate": 0.02,
        "carbon_credit_per_ton": 0,
        "carbon_intensity_avoided": 0,
    }


@pytest.fixture
def sample_exergy_input():
    """Sample exergy analysis input data for testing."""
    return {
        "energy_source": "solar",
        "input_energy_mj": 1000,
        "output_temp_k": None,
        "end_use_type": "electricity",
    }


@pytest.fixture
def sample_discovery_problem():
    """Sample discovery problem statement for testing."""
    return {
        "problem_statement": "Develop a low-cost, stable perovskite solar cell that can achieve 30% efficiency",
        "constraints": {
            "budget": "< $1M",
            "timeline": "2 years",
            "no_lead": True,
        },
        "num_hypotheses": 10,
    }


@pytest.fixture
def sample_materials():
    """Sample materials data for testing."""
    return [
        {
            "material_id": "mp-149",
            "formula": "Si",
            "formation_energy_per_atom": 0.0,
            "energy_above_hull": 0.0,
            "band_gap": 1.11,
            "is_stable": True,
            "crystal_system": "Cubic",
            "density": 2.33,
        },
        {
            "material_id": "mp-22862",
            "formula": "LiFePO4",
            "formation_energy_per_atom": -1.23,
            "energy_above_hull": 0.0,
            "band_gap": 3.8,
            "is_stable": True,
            "crystal_system": "Orthorhombic",
            "density": 3.6,
        },
    ]


@pytest.fixture
def sample_papers():
    """Sample paper data for testing."""
    return [
        {
            "paper_id": "paper-1",
            "title": "Advances in Perovskite Solar Cells",
            "authors": ["A. Researcher", "B. Scientist"],
            "abstract": "This paper reviews perovskite solar cell technology.",
            "year": 2024,
            "venue": "Nature Energy",
            "citation_count": 150,
            "url": "https://example.com/paper1",
            "source": "semantic_scholar",
        },
        {
            "paper_id": "paper-2",
            "title": "Stability in Perovskite Photovoltaics",
            "authors": ["C. Engineer"],
            "abstract": "Stability improvements for commercial deployment.",
            "year": 2023,
            "venue": "Science",
            "citation_count": 200,
            "url": "https://example.com/paper2",
            "source": "semantic_scholar",
        },
    ]


@pytest.fixture
def sample_patents():
    """Sample patent data for testing."""
    return [
        {
            "patent_id": "US11,476,378",
            "title": "Perovskite-Silicon Tandem Solar Cell",
            "abstract": "A tandem solar cell with improved stability.",
            "applicant": "First Solar Inc.",
            "inventors": ["J. Smith", "A. Johnson"],
            "filing_date": "2021-03-15",
            "publication_date": "2022-10-18",
            "classification": ["H01L31/0504"],
            "claims_count": 24,
            "status": "granted",
        },
    ]
