"""Discovery models for AI-powered research and hypothesis generation."""

from datetime import datetime
from typing import TYPE_CHECKING
from enum import Enum

from sqlalchemy import String, DateTime, ForeignKey, Text, Enum as SQLEnum, JSON, Float, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class DiscoveryStatus(str, Enum):
    """Discovery process status states."""
    PENDING = "pending"
    INGESTING = "ingesting"
    GENERATING = "generating"
    SCREENING = "screening"
    RESEARCHING = "researching"
    SYNTHESIZING = "synthesizing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class HypothesisStatus(str, Enum):
    """Hypothesis evaluation status."""
    PENDING = "pending"
    SCREENING = "screening"
    PASSED = "passed"
    FAILED = "failed"
    SELECTED = "selected"


class Discovery(Base):
    """
    Discovery model for AI-powered research processes.

    A Discovery represents a complete research run that:
    1. Ingests context and problem statement
    2. Generates 50-200 hypotheses using Claude Opus 4.5
    3. Screens hypotheses computationally
    4. Researches top candidates in depth
    5. Synthesizes a comprehensive report

    Attributes:
        id: Primary key
        user_id: Foreign key to user
        title: Discovery title
        problem_statement: The research problem to solve
        constraints: JSON with constraints (budget, timeline, materials, etc.)
        context_files: JSON list of uploaded context file paths
        status: Current status of the discovery process
        progress: Progress percentage (0-100)
        results: JSON with final results and report data
        error_message: Error message if failed
        started_at: When processing started
        completed_at: When processing completed
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """
    __tablename__ = "discoveries"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    problem_statement: Mapped[str] = mapped_column(Text, nullable=False)
    constraints: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    context_files: Mapped[list | None] = mapped_column(JSON, nullable=True)

    status: Mapped[DiscoveryStatus] = mapped_column(
        SQLEnum(DiscoveryStatus),
        default=DiscoveryStatus.PENDING,
        nullable=False,
        index=True
    )
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    current_step: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Results
    results: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    report_path: Mapped[str | None] = mapped_column(String(512), nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Timing
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="discoveries")
    hypotheses: Mapped[list["DiscoveryHypothesis"]] = relationship(
        "DiscoveryHypothesis",
        back_populates="discovery",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Discovery(id={self.id}, title='{self.title}', status={self.status.value})>"

    @property
    def duration_seconds(self) -> float | None:
        """Calculate discovery duration in seconds."""
        if self.started_at and self.completed_at:
            return (self.completed_at - self.started_at).total_seconds()
        return None


class DiscoveryHypothesis(Base):
    """
    Individual hypothesis generated during a Discovery run.

    Attributes:
        id: Primary key
        discovery_id: Foreign key to discovery
        hypothesis_text: The hypothesis statement
        rationale: AI-generated rationale for this hypothesis
        score: Composite score (0-1) for ranking
        feasibility_score: Technical feasibility (0-1)
        novelty_score: Novelty/innovation (0-1)
        impact_score: Potential impact (0-1)
        status: Evaluation status
        simulation_results: JSON with simulation outputs if run
        literature_refs: JSON with related literature
        patent_refs: JSON with related patents
        tea_summary: JSON with TEA analysis if performed
        created_at: Creation timestamp
    """
    __tablename__ = "discovery_hypotheses"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    discovery_id: Mapped[int] = mapped_column(
        ForeignKey("discoveries.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    hypothesis_text: Mapped[str] = mapped_column(Text, nullable=False)
    rationale: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Scoring (0.0 to 1.0)
    score: Mapped[float | None] = mapped_column(Float, nullable=True, index=True)
    feasibility_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    novelty_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    impact_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    status: Mapped[HypothesisStatus] = mapped_column(
        SQLEnum(HypothesisStatus),
        default=HypothesisStatus.PENDING,
        nullable=False
    )
    rank: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Research results
    simulation_results: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    literature_refs: Mapped[list | None] = mapped_column(JSON, nullable=True)
    patent_refs: Mapped[list | None] = mapped_column(JSON, nullable=True)
    tea_summary: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    # Relationships
    discovery: Mapped["Discovery"] = relationship("Discovery", back_populates="hypotheses")

    def __repr__(self) -> str:
        return f"<DiscoveryHypothesis(id={self.id}, score={self.score}, status={self.status.value})>"


class MaterialsSearch(Base):
    """
    Track Materials Project searches for caching and analytics.

    Attributes:
        id: Primary key
        user_id: Foreign key to user
        query_params: JSON with search parameters
        results_count: Number of results returned
        results: JSON with cached results
        created_at: Search timestamp
    """
    __tablename__ = "materials_searches"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    query_params: Mapped[dict] = mapped_column(JSON, nullable=False)
    results_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    results: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    def __repr__(self) -> str:
        return f"<MaterialsSearch(id={self.id}, results_count={self.results_count})>"
