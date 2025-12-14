"""Pydantic schemas for Project model."""

from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field

from app.models.project import ProjectStatus, TechnologyType


class ProjectBase(BaseModel):
    """Base schema for Project."""
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    technology_type: TechnologyType = TechnologyType.CUSTOM


class ProjectCreate(ProjectBase):
    """Schema for creating a project."""
    pass


class ProjectUpdate(BaseModel):
    """Schema for updating a project."""
    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    technology_type: TechnologyType | None = None
    status: ProjectStatus | None = None
    tea_data: dict[str, Any] | None = None
    exergy_data: dict[str, Any] | None = None
    ai_insights: dict[str, Any] | None = None


class ProjectResponse(ProjectBase):
    """Schema for project response."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    status: ProjectStatus
    tea_data: dict[str, Any] | None
    exergy_data: dict[str, Any] | None
    ai_insights: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime


class ProjectListResponse(BaseModel):
    """Schema for paginated project list."""
    projects: list[ProjectResponse]
    total: int
    skip: int
    limit: int


class TEADataUpdate(BaseModel):
    """Schema for updating TEA data."""
    inputs: dict[str, Any]
    results: dict[str, Any]
    sensitivity: dict[str, Any] | None = None


class ExergyDataUpdate(BaseModel):
    """Schema for updating exergy data."""
    inputs: dict[str, Any]
    results: dict[str, Any]
    carrier_breakdown: dict[str, Any] | None = None
