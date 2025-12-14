"""Pydantic schemas for Subscription model."""

from datetime import datetime
from pydantic import BaseModel, ConfigDict

from app.models.subscription import SubscriptionStatus, SubscriptionTier


class SubscriptionBase(BaseModel):
    """Base schema for Subscription."""
    tier: SubscriptionTier = SubscriptionTier.FREE


class SubscriptionCreate(SubscriptionBase):
    """Schema for creating a subscription."""
    user_id: int
    stripe_customer_id: str
    stripe_subscription_id: str | None = None
    stripe_price_id: str | None = None


class SubscriptionUpdate(BaseModel):
    """Schema for updating a subscription."""
    stripe_subscription_id: str | None = None
    stripe_price_id: str | None = None
    tier: SubscriptionTier | None = None
    status: SubscriptionStatus | None = None
    current_period_start: datetime | None = None
    current_period_end: datetime | None = None
    cancel_at_period_end: bool | None = None


class SubscriptionResponse(SubscriptionBase):
    """Schema for subscription response."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    stripe_customer_id: str
    stripe_subscription_id: str | None
    status: SubscriptionStatus
    current_period_start: datetime | None
    current_period_end: datetime | None
    cancel_at_period_end: bool
    created_at: datetime
    updated_at: datetime


class CheckoutSessionRequest(BaseModel):
    """Request to create a Stripe checkout session."""
    tier: SubscriptionTier
    success_url: str
    cancel_url: str


class CheckoutSessionResponse(BaseModel):
    """Response with checkout session URL."""
    checkout_url: str
    session_id: str


class PortalSessionResponse(BaseModel):
    """Response with customer portal URL."""
    portal_url: str
