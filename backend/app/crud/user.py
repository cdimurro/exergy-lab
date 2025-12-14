"""CRUD operations for User model."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud.base import CRUDBase
from app.models.user import User, UserTier
from app.schemas.user import UserCreate, UserUpdate


class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    """CRUD operations specific to User model."""

    async def get_by_clerk_id(self, db: AsyncSession, clerk_id: str) -> User | None:
        """Get user by Clerk authentication ID."""
        result = await db.execute(
            select(User).where(User.clerk_id == clerk_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, db: AsyncSession, email: str) -> User | None:
        """Get user by email address."""
        result = await db.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def get_with_subscription(self, db: AsyncSession, user_id: int) -> User | None:
        """Get user with subscription relationship loaded."""
        result = await db.execute(
            select(User)
            .options(selectinload(User.subscription))
            .where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_with_projects(
        self,
        db: AsyncSession,
        user_id: int,
        skip: int = 0,
        limit: int = 100,
    ) -> User | None:
        """Get user with projects relationship loaded."""
        result = await db.execute(
            select(User)
            .options(selectinload(User.projects))
            .where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def create_from_clerk(
        self,
        db: AsyncSession,
        *,
        clerk_id: str,
        email: str,
        name: str | None = None,
    ) -> User:
        """Create a new user from Clerk webhook data."""
        user = User(
            clerk_id=clerk_id,
            email=email,
            name=name,
            tier=UserTier.FREE,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
        return user

    async def update_tier(
        self,
        db: AsyncSession,
        *,
        user: User,
        tier: UserTier,
    ) -> User:
        """Update user's subscription tier."""
        user.tier = tier
        db.add(user)
        await db.flush()
        await db.refresh(user)
        return user

    async def get_by_tier(
        self,
        db: AsyncSession,
        tier: UserTier,
        skip: int = 0,
        limit: int = 100,
    ) -> list[User]:
        """Get all users with a specific tier."""
        result = await db.execute(
            select(User)
            .where(User.tier == tier)
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())


user_crud = CRUDUser(User)
