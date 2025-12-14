"""Pydantic schemas for Discovery model."""

from datetime import datetime
from typing import Any
from pydantic import BaseModel, ConfigDict, Field

from app.models.discovery import DiscoveryStatus, HypothesisStatus


class DiscoveryBase(BaseModel):
    """Base schema for Discovery."""
    title: str = Field(..., min_length=1, max_length=255)
    problem_statement: str = Field(..., min_length=10)
    constraints: dict[str, Any] | None = None


class DiscoveryCreate(DiscoveryBase):
    """Schema for creating a discovery."""
    context_files: list[str] | None = None


class DiscoveryUpdate(BaseModel):
    """Schema for updating a discovery."""
    title: str | None = Field(None, min_length=1, max_length=255)
    problem_statement: str | None = None
    constraints: dict[str, Any] | None = None


class HypothesisResponse(BaseModel):
    """Schema for hypothesis response."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    discovery_id: int
    hypothesis_text: str
    rationale: str | None
    score: float | None
    feasibility_score: float | None
    novelty_score: float | None
    impact_score: float | None
    status: HypothesisStatus
    rank: int | None
    literature_refs: list[dict] | None
    patent_refs: list[dict] | None
    tea_summary: dict[str, Any] | None
    created_at: datetime


class DiscoveryResponse(DiscoveryBase):
    """Schema for discovery response."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    status: DiscoveryStatus
    progress: int
    current_step: str | None
    results: dict[str, Any] | None
    report_path: str | None
    error_message: str | None
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class DiscoveryWithHypotheses(DiscoveryResponse):
    """Discovery response with hypotheses."""
    hypotheses: list[HypothesisResponse] = []
    hypothesis_count: int = 0


class DiscoveryListResponse(BaseModel):
    """Schema for paginated discovery list."""
    discoveries: list[DiscoveryResponse]
    total: int
    skip: int
    limit: int


class DiscoveryProgressUpdate(BaseModel):
    """Schema for discovery progress update (via WebSocket)."""
    discovery_id: int
    status: DiscoveryStatus
    progress: int
    current_step: str | None
    message: str | None = None


class StartDiscoveryRequest(BaseModel):
    """Request to start a new discovery."""
    title: str = Field(..., min_length=1, max_length=255)
    problem_statement: str = Field(..., min_length=10)
    constraints: dict[str, Any] | None = Field(
        None,
        description="Constraints like budget, timeline, materials restrictions",
    )
    context_files: list[str] | None = Field(
        None,
        description="List of uploaded file IDs to use as context",
    )
