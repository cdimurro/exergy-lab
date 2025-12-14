"""CRUD operations for Discovery model."""

from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.models.discovery import (
    Discovery,
    DiscoveryStatus,
    DiscoveryHypothesis,
    HypothesisStatus,
)
from app.schemas.discovery import DiscoveryCreate, DiscoveryUpdate


class CRUDDiscovery(CRUDBase[Discovery, DiscoveryCreate, DiscoveryUpdate]):
    """CRUD operations specific to Discovery model."""

    async def get_by_user(
        self,
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Discovery]:
        """Get all discoveries for a user."""
        result = await db.execute(
            select(Discovery)
            .where(Discovery.user_id == user_id)
            .order_by(Discovery.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_with_hypotheses(
        self,
        db: AsyncSession,
        discovery_id: int,
    ) -> Discovery | None:
        """Get discovery with all hypotheses loaded."""
        result = await db.execute(
            select(Discovery)
            .options(selectinload(Discovery.hypotheses))
            .where(Discovery.id == discovery_id)
        )
        return result.scalar_one_or_none()

    async def get_running(
        self,
        db: AsyncSession,
        user_id: int | None = None,
    ) -> list[Discovery]:
        """Get all currently running discoveries."""
        running_statuses = [
            DiscoveryStatus.PENDING,
            DiscoveryStatus.INGESTING,
            DiscoveryStatus.GENERATING,
            DiscoveryStatus.SCREENING,
            DiscoveryStatus.RESEARCHING,
            DiscoveryStatus.SYNTHESIZING,
        ]
        query = select(Discovery).where(Discovery.status.in_(running_statuses))
        if user_id:
            query = query.where(Discovery.user_id == user_id)
        result = await db.execute(query.order_by(Discovery.created_at.desc()))
        return list(result.scalars().all())

    async def create_for_user(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        title: str,
        problem_statement: str,
        constraints: dict | None = None,
        context_files: list | None = None,
    ) -> Discovery:
        """Create a new discovery for a user."""
        discovery = Discovery(
            user_id=user_id,
            title=title,
            problem_statement=problem_statement,
            constraints=constraints,
            context_files=context_files,
            status=DiscoveryStatus.PENDING,
            progress=0,
        )
        db.add(discovery)
        await db.flush()
        await db.refresh(discovery)
        return discovery

    async def update_status(
        self,
        db: AsyncSession,
        *,
        discovery: Discovery,
        status: DiscoveryStatus,
        progress: int | None = None,
        current_step: str | None = None,
        error_message: str | None = None,
    ) -> Discovery:
        """Update discovery status and progress."""
        discovery.status = status
        if progress is not None:
            discovery.progress = progress
        if current_step is not None:
            discovery.current_step = current_step
        if error_message is not None:
            discovery.error_message = error_message

        # Update timing
        if status == DiscoveryStatus.PENDING and discovery.started_at is None:
            discovery.started_at = datetime.utcnow()
        if status in (DiscoveryStatus.COMPLETED, DiscoveryStatus.FAILED, DiscoveryStatus.CANCELLED):
            discovery.completed_at = datetime.utcnow()

        db.add(discovery)
        await db.flush()
        await db.refresh(discovery)
        return discovery

    async def set_results(
        self,
        db: AsyncSession,
        *,
        discovery: Discovery,
        results: dict,
        report_path: str | None = None,
    ) -> Discovery:
        """Set discovery results."""
        discovery.results = results
        if report_path:
            discovery.report_path = report_path
        discovery.status = DiscoveryStatus.COMPLETED
        discovery.progress = 100
        discovery.completed_at = datetime.utcnow()

        db.add(discovery)
        await db.flush()
        await db.refresh(discovery)
        return discovery

    async def add_hypothesis(
        self,
        db: AsyncSession,
        *,
        discovery_id: int,
        hypothesis_text: str,
        rationale: str | None = None,
        score: float | None = None,
        feasibility_score: float | None = None,
        novelty_score: float | None = None,
        impact_score: float | None = None,
    ) -> DiscoveryHypothesis:
        """Add a hypothesis to a discovery."""
        hypothesis = DiscoveryHypothesis(
            discovery_id=discovery_id,
            hypothesis_text=hypothesis_text,
            rationale=rationale,
            score=score,
            feasibility_score=feasibility_score,
            novelty_score=novelty_score,
            impact_score=impact_score,
            status=HypothesisStatus.PENDING,
        )
        db.add(hypothesis)
        await db.flush()
        await db.refresh(hypothesis)
        return hypothesis

    async def get_top_hypotheses(
        self,
        db: AsyncSession,
        discovery_id: int,
        limit: int = 10,
    ) -> list[DiscoveryHypothesis]:
        """Get top-ranked hypotheses for a discovery."""
        result = await db.execute(
            select(DiscoveryHypothesis)
            .where(
                DiscoveryHypothesis.discovery_id == discovery_id,
                DiscoveryHypothesis.score.isnot(None),
            )
            .order_by(DiscoveryHypothesis.score.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def count_hypotheses(
        self,
        db: AsyncSession,
        discovery_id: int,
    ) -> int:
        """Count hypotheses for a discovery."""
        result = await db.execute(
            select(func.count())
            .select_from(DiscoveryHypothesis)
            .where(DiscoveryHypothesis.discovery_id == discovery_id)
        )
        return result.scalar_one()


discovery_crud = CRUDDiscovery(Discovery)
