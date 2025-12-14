"""CRUD operations for Project model."""

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.project import Project, ProjectStatus, TechnologyType
from app.schemas.project import ProjectCreate, ProjectUpdate


class CRUDProject(CRUDBase[Project, ProjectCreate, ProjectUpdate]):
    """CRUD operations specific to Project model."""

    async def get_by_user(
        self,
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Project]:
        """Get all projects for a user."""
        result = await db.execute(
            select(Project)
            .where(Project.user_id == user_id)
            .order_by(Project.updated_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_by_user_and_id(
        self,
        db: AsyncSession,
        user_id: int,
        project_id: int,
    ) -> Project | None:
        """Get a specific project owned by a user."""
        result = await db.execute(
            select(Project)
            .where(Project.user_id == user_id, Project.id == project_id)
        )
        return result.scalar_one_or_none()

    async def count_by_user(self, db: AsyncSession, user_id: int) -> int:
        """Count projects for a user."""
        result = await db.execute(
            select(func.count())
            .select_from(Project)
            .where(Project.user_id == user_id)
        )
        return result.scalar_one()

    async def get_by_technology(
        self,
        db: AsyncSession,
        user_id: int,
        technology_type: TechnologyType,
    ) -> list[Project]:
        """Get projects by technology type for a user."""
        result = await db.execute(
            select(Project)
            .where(
                Project.user_id == user_id,
                Project.technology_type == technology_type,
            )
            .order_by(Project.updated_at.desc())
        )
        return list(result.scalars().all())

    async def get_active(
        self,
        db: AsyncSession,
        user_id: int,
    ) -> list[Project]:
        """Get active (non-archived) projects for a user."""
        result = await db.execute(
            select(Project)
            .where(
                Project.user_id == user_id,
                Project.status != ProjectStatus.ARCHIVED,
            )
            .order_by(Project.updated_at.desc())
        )
        return list(result.scalars().all())

    async def create_for_user(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        name: str,
        technology_type: TechnologyType = TechnologyType.CUSTOM,
        description: str | None = None,
    ) -> Project:
        """Create a new project for a user."""
        project = Project(
            user_id=user_id,
            name=name,
            technology_type=technology_type,
            description=description,
            status=ProjectStatus.DRAFT,
        )
        db.add(project)
        await db.flush()
        await db.refresh(project)
        return project

    async def update_tea_data(
        self,
        db: AsyncSession,
        *,
        project: Project,
        tea_data: dict,
    ) -> Project:
        """Update TEA calculation data for a project."""
        project.tea_data = tea_data
        db.add(project)
        await db.flush()
        await db.refresh(project)
        return project

    async def update_exergy_data(
        self,
        db: AsyncSession,
        *,
        project: Project,
        exergy_data: dict,
    ) -> Project:
        """Update exergy analysis data for a project."""
        project.exergy_data = exergy_data
        db.add(project)
        await db.flush()
        await db.refresh(project)
        return project

    async def update_ai_insights(
        self,
        db: AsyncSession,
        *,
        project: Project,
        ai_insights: dict,
    ) -> Project:
        """Update AI-generated insights for a project."""
        project.ai_insights = ai_insights
        db.add(project)
        await db.flush()
        await db.refresh(project)
        return project

    async def archive(self, db: AsyncSession, *, project: Project) -> Project:
        """Archive a project."""
        project.status = ProjectStatus.ARCHIVED
        db.add(project)
        await db.flush()
        await db.refresh(project)
        return project


project_crud = CRUDProject(Project)
