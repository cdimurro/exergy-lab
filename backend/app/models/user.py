"""User model for authentication and profile management."""

from datetime import datetime
from typing import TYPE_CHECKING
from enum import Enum

from sqlalchemy import String, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.subscription import Subscription
    from app.models.discovery import Discovery


class UserTier(str, Enum):
    """User subscription tiers."""
    FREE = "free"
    STARTER = "starter"  # $19.99/month
    PROFESSIONAL = "professional"  # $99/month
    DISCOVERY = "discovery"  # $499/month


class User(Base):
    """
    User model representing a platform user.

    Attributes:
        id: Primary key
        clerk_id: Clerk authentication ID (from Clerk)
        email: User's email address
        name: User's display name
        tier: Current subscription tier
        created_at: Account creation timestamp
        updated_at: Last update timestamp
    """
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    clerk_id: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tier: Mapped[UserTier] = mapped_column(
        SQLEnum(UserTier),
        default=UserTier.FREE,
        nullable=False
    )
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
    projects: Mapped[list["Project"]] = relationship(
        "Project",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    subscription: Mapped["Subscription | None"] = relationship(
        "Subscription",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan"
    )
    discoveries: Mapped[list["Discovery"]] = relationship(
        "Discovery",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', tier={self.tier.value})>"

    @property
    def is_starter_or_higher(self) -> bool:
        """Check if user has Starter tier or higher."""
        return self.tier in (UserTier.STARTER, UserTier.PROFESSIONAL, UserTier.DISCOVERY)

    @property
    def is_professional(self) -> bool:
        """Check if user has Professional tier or higher."""
        return self.tier in (UserTier.PROFESSIONAL, UserTier.DISCOVERY)

    @property
    def is_discovery(self) -> bool:
        """Check if user has Discovery tier."""
        return self.tier == UserTier.DISCOVERY
