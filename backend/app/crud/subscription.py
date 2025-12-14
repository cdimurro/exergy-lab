"""CRUD operations for Subscription model."""

from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.subscription import Subscription, SubscriptionStatus, SubscriptionTier
from app.schemas.subscription import SubscriptionCreate, SubscriptionUpdate


class CRUDSubscription(CRUDBase[Subscription, SubscriptionCreate, SubscriptionUpdate]):
    """CRUD operations specific to Subscription model."""

    async def get_by_user(self, db: AsyncSession, user_id: int) -> Subscription | None:
        """Get subscription for a user."""
        result = await db.execute(
            select(Subscription).where(Subscription.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_stripe_customer(
        self,
        db: AsyncSession,
        stripe_customer_id: str,
    ) -> Subscription | None:
        """Get subscription by Stripe customer ID."""
        result = await db.execute(
            select(Subscription)
            .where(Subscription.stripe_customer_id == stripe_customer_id)
        )
        return result.scalar_one_or_none()

    async def get_by_stripe_subscription(
        self,
        db: AsyncSession,
        stripe_subscription_id: str,
    ) -> Subscription | None:
        """Get subscription by Stripe subscription ID."""
        result = await db.execute(
            select(Subscription)
            .where(Subscription.stripe_subscription_id == stripe_subscription_id)
        )
        return result.scalar_one_or_none()

    async def create_for_user(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        stripe_customer_id: str,
        stripe_subscription_id: str | None = None,
        stripe_price_id: str | None = None,
        tier: SubscriptionTier = SubscriptionTier.FREE,
    ) -> Subscription:
        """Create a new subscription for a user."""
        subscription = Subscription(
            user_id=user_id,
            stripe_customer_id=stripe_customer_id,
            stripe_subscription_id=stripe_subscription_id,
            stripe_price_id=stripe_price_id,
            tier=tier,
            status=SubscriptionStatus.ACTIVE,
        )
        db.add(subscription)
        await db.flush()
        await db.refresh(subscription)
        return subscription

    async def update_from_stripe(
        self,
        db: AsyncSession,
        *,
        subscription: Subscription,
        stripe_subscription_id: str | None = None,
        stripe_price_id: str | None = None,
        status: SubscriptionStatus | None = None,
        tier: SubscriptionTier | None = None,
        current_period_start: datetime | None = None,
        current_period_end: datetime | None = None,
        cancel_at_period_end: bool | None = None,
    ) -> Subscription:
        """Update subscription from Stripe webhook data."""
        if stripe_subscription_id is not None:
            subscription.stripe_subscription_id = stripe_subscription_id
        if stripe_price_id is not None:
            subscription.stripe_price_id = stripe_price_id
        if status is not None:
            subscription.status = status
        if tier is not None:
            subscription.tier = tier
        if current_period_start is not None:
            subscription.current_period_start = current_period_start
        if current_period_end is not None:
            subscription.current_period_end = current_period_end
        if cancel_at_period_end is not None:
            subscription.cancel_at_period_end = cancel_at_period_end

        db.add(subscription)
        await db.flush()
        await db.refresh(subscription)
        return subscription

    async def cancel(
        self,
        db: AsyncSession,
        *,
        subscription: Subscription,
        at_period_end: bool = True,
    ) -> Subscription:
        """Cancel a subscription."""
        if at_period_end:
            subscription.cancel_at_period_end = True
        else:
            subscription.status = SubscriptionStatus.CANCELED
            subscription.tier = SubscriptionTier.FREE

        db.add(subscription)
        await db.flush()
        await db.refresh(subscription)
        return subscription

    async def get_active_paid(
        self,
        db: AsyncSession,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Subscription]:
        """Get all active paid subscriptions."""
        result = await db.execute(
            select(Subscription)
            .where(
                Subscription.status == SubscriptionStatus.ACTIVE,
                Subscription.tier != SubscriptionTier.FREE,
            )
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())


subscription_crud = CRUDSubscription(Subscription)
