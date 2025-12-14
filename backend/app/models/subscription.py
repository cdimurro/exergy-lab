"""Subscription model for Stripe payment management."""

from datetime import datetime
from typing import TYPE_CHECKING
from enum import Enum

from sqlalchemy import String, DateTime, ForeignKey, Enum as SQLEnum, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class SubscriptionStatus(str, Enum):
    """Stripe subscription status values."""
    ACTIVE = "active"
    CANCELED = "canceled"
    INCOMPLETE = "incomplete"
    INCOMPLETE_EXPIRED = "incomplete_expired"
    PAST_DUE = "past_due"
    PAUSED = "paused"
    TRIALING = "trialing"
    UNPAID = "unpaid"


class SubscriptionTier(str, Enum):
    """Subscription tier levels."""
    FREE = "free"
    STARTER = "starter"  # $19.99/month
    PROFESSIONAL = "professional"  # $99/month
    DISCOVERY = "discovery"  # $499/month


class Subscription(Base):
    """
    Subscription model for managing Stripe subscriptions.

    Attributes:
        id: Primary key
        user_id: Foreign key to user
        stripe_customer_id: Stripe customer ID
        stripe_subscription_id: Stripe subscription ID
        tier: Subscription tier
        status: Stripe subscription status
        current_period_start: Current billing period start
        current_period_end: Current billing period end
        cancel_at_period_end: Whether to cancel at period end
        created_at: Subscription creation timestamp
        updated_at: Last update timestamp
    """
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True
    )
    stripe_customer_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True, index=True)
    stripe_price_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tier: Mapped[SubscriptionTier] = mapped_column(
        SQLEnum(SubscriptionTier),
        default=SubscriptionTier.FREE,
        nullable=False
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        SQLEnum(SubscriptionStatus),
        default=SubscriptionStatus.ACTIVE,
        nullable=False
    )
    current_period_start: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cancel_at_period_end: Mapped[bool] = mapped_column(default=False, nullable=False)

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
    user: Mapped["User"] = relationship("User", back_populates="subscription")

    def __repr__(self) -> str:
        return f"<Subscription(id={self.id}, tier={self.tier.value}, status={self.status.value})>"

    @property
    def is_active(self) -> bool:
        """Check if subscription is active."""
        return self.status in (SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING)

    @property
    def is_paid(self) -> bool:
        """Check if this is a paid subscription."""
        return self.tier in (SubscriptionTier.STARTER, SubscriptionTier.PROFESSIONAL, SubscriptionTier.DISCOVERY)


class APIUsage(Base):
    """
    API usage tracking for rate limiting and billing.

    Attributes:
        id: Primary key
        user_id: Foreign key to user
        endpoint: API endpoint called
        tokens_used: Number of AI tokens used (if applicable)
        cost: Estimated cost in cents
        created_at: Timestamp of the API call
    """
    __tablename__ = "api_usage"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    endpoint: Mapped[str] = mapped_column(String(255), nullable=False)
    method: Mapped[str] = mapped_column(String(10), nullable=False, default="GET")
    tokens_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cost_cents: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    response_time_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    def __repr__(self) -> str:
        return f"<APIUsage(id={self.id}, endpoint='{self.endpoint}', tokens={self.tokens_used})>"
