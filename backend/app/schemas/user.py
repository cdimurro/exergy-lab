"""Pydantic schemas for User model."""

from datetime import datetime
from pydantic import BaseModel, EmailStr, ConfigDict

from app.models.user import UserTier


class UserBase(BaseModel):
    """Base schema for User."""
    email: EmailStr
    name: str | None = None


class UserCreate(UserBase):
    """Schema for creating a user."""
    clerk_id: str


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    name: str | None = None
    tier: UserTier | None = None


class UserResponse(UserBase):
    """Schema for user response."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    clerk_id: str
    tier: UserTier
    created_at: datetime
    updated_at: datetime


class UserWithSubscription(UserResponse):
    """User response with subscription details."""
    subscription: "SubscriptionResponse | None" = None


# Avoid circular import
from app.schemas.subscription import SubscriptionResponse  # noqa: E402
UserWithSubscription.model_rebuild()
