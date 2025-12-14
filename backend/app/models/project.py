"""Project model for TEA and Exergy analysis projects."""

from datetime import datetime
from typing import TYPE_CHECKING
from enum import Enum

from sqlalchemy import String, DateTime, ForeignKey, Text, Enum as SQLEnum, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class ProjectStatus(str, Enum):
    """Project status states."""
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"


class TechnologyType(str, Enum):
    """Clean energy technology types for TEA analysis."""
    SOLAR_PV = "solar_pv"
    WIND_ONSHORE = "wind_onshore"
    WIND_OFFSHORE = "wind_offshore"
    BATTERY_STORAGE = "battery_storage"
    HYDROGEN_GREEN = "hydrogen_green"
    HYDROGEN_BLUE = "hydrogen_blue"
    NUCLEAR_SMR = "nuclear_smr"
    GEOTHERMAL = "geothermal"
    HYDROPOWER = "hydropower"
    BIOMASS = "biomass"
    CCS = "ccs"
    DAC = "dac"
    HEAT_PUMP = "heat_pump"
    EV_CHARGING = "ev_charging"
    CUSTOM = "custom"


class Project(Base):
    """
    Project model for storing TEA and Exergy analysis data.

    Attributes:
        id: Primary key
        user_id: Foreign key to user
        name: Project name
        description: Project description
        technology_type: Type of clean energy technology
        status: Project status (draft, active, archived)
        tea_data: JSON blob with TEA calculation inputs and results
        exergy_data: JSON blob with exergy analysis inputs and results
        created_at: Creation timestamp
        updated_at: Last update timestamp
    """
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    technology_type: Mapped[TechnologyType] = mapped_column(
        SQLEnum(TechnologyType),
        default=TechnologyType.CUSTOM,
        nullable=False
    )
    status: Mapped[ProjectStatus] = mapped_column(
        SQLEnum(ProjectStatus),
        default=ProjectStatus.DRAFT,
        nullable=False
    )

    # JSON data for flexible storage of calculation inputs/results
    tea_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    exergy_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # AI-generated insights
    ai_insights: Mapped[dict | None] = mapped_column(JSON, nullable=True)

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
    user: Mapped["User"] = relationship("User", back_populates="projects")

    def __repr__(self) -> str:
        return f"<Project(id={self.id}, name='{self.name}', tech={self.technology_type.value})>"


class Upload(Base):
    """
    Upload model for tracking user file uploads.

    Attributes:
        id: Primary key
        user_id: Foreign key to user
        project_id: Optional foreign key to project
        filename: Original filename
        file_path: Path to stored file
        status: Upload status
        validation_results: JSON with validation results
        created_at: Upload timestamp
    """
    __tablename__ = "uploads"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    mime_type: Mapped[str | None] = mapped_column(String(100), nullable=True)
    file_size: Mapped[int | None] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    validation_results: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    def __repr__(self) -> str:
        return f"<Upload(id={self.id}, filename='{self.filename}', status='{self.status}')>"
