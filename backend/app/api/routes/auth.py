"""Authentication routes for Clerk webhooks and user management."""

import hmac
import hashlib
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, UserTier
from app.crud.user import user_crud
from app.crud.subscription import subscription_crud
from app.schemas.user import UserResponse
from app.middleware.auth import get_current_active_user

router = APIRouter()


def verify_clerk_webhook(payload: bytes, signature: str, secret: str) -> bool:
    """Verify Clerk webhook signature."""
    # Clerk uses svix for webhooks
    # In production, use the svix library for proper verification
    # For now, we'll do basic HMAC verification
    try:
        expected = hmac.new(
            secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected, signature)
    except Exception:
        return False


@router.post("/webhook/clerk")
async def clerk_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    svix_id: str = Header(None, alias="svix-id"),
    svix_timestamp: str = Header(None, alias="svix-timestamp"),
    svix_signature: str = Header(None, alias="svix-signature"),
):
    """
    Handle Clerk webhooks for user lifecycle events.

    Events handled:
    - user.created: Create user in our database
    - user.updated: Update user data
    - user.deleted: Delete user from our database
    """
    payload = await request.body()

    # In production, verify webhook signature
    # if not verify_clerk_webhook(payload, svix_signature, settings.CLERK_WEBHOOK_SECRET):
    #     raise HTTPException(status_code=400, detail="Invalid signature")

    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event_type = data.get("type")
    event_data = data.get("data", {})

    if event_type == "user.created":
        # Create user in our database
        clerk_id = event_data.get("id")
        email = None
        name = None

        # Get primary email
        email_addresses = event_data.get("email_addresses", [])
        for email_obj in email_addresses:
            if email_obj.get("id") == event_data.get("primary_email_address_id"):
                email = email_obj.get("email_address")
                break

        # Get name
        first_name = event_data.get("first_name", "")
        last_name = event_data.get("last_name", "")
        name = f"{first_name} {last_name}".strip() or None

        if clerk_id and email:
            # Check if user already exists
            existing = await user_crud.get_by_clerk_id(db, clerk_id)
            if not existing:
                user = await user_crud.create_from_clerk(
                    db,
                    clerk_id=clerk_id,
                    email=email,
                    name=name,
                )
                await db.commit()
                return {"status": "created", "user_id": user.id}

        return {"status": "skipped", "reason": "Missing data or user exists"}

    elif event_type == "user.updated":
        clerk_id = event_data.get("id")
        if clerk_id:
            user = await user_crud.get_by_clerk_id(db, clerk_id)
            if user:
                # Update user data
                first_name = event_data.get("first_name", "")
                last_name = event_data.get("last_name", "")
                name = f"{first_name} {last_name}".strip() or None

                await user_crud.update(db, db_obj=user, obj_in={"name": name})
                await db.commit()
                return {"status": "updated", "user_id": user.id}

        return {"status": "skipped", "reason": "User not found"}

    elif event_type == "user.deleted":
        clerk_id = event_data.get("id")
        if clerk_id:
            user = await user_crud.get_by_clerk_id(db, clerk_id)
            if user:
                await user_crud.delete(db, id=user.id)
                await db.commit()
                return {"status": "deleted", "user_id": user.id}

        return {"status": "skipped", "reason": "User not found"}

    return {"status": "ignored", "event_type": event_type}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Get current authenticated user's information."""
    return current_user


@router.get("/me/tier")
async def get_current_user_tier(
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Get current user's subscription tier and limits."""
    tier_limits = {
        UserTier.FREE: {
            "projects": 3,
            "tea_calculations": 10,
            "exergy_analysis": False,
            "discovery_runs": 0,
            "ai_insights": False,
            "pdf_export": False,
        },
        UserTier.PROFESSIONAL: {
            "projects": -1,  # Unlimited
            "tea_calculations": -1,
            "exergy_analysis": True,
            "discovery_runs": 0,
            "ai_insights": True,
            "pdf_export": True,
        },
        UserTier.DISCOVERY: {
            "projects": -1,
            "tea_calculations": -1,
            "exergy_analysis": True,
            "discovery_runs": -1,
            "ai_insights": True,
            "pdf_export": True,
        },
    }

    return {
        "tier": current_user.tier.value,
        "limits": tier_limits.get(current_user.tier, tier_limits[UserTier.FREE]),
    }


@router.post("/sync")
async def sync_user_from_clerk(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Sync current user's data from Clerk.

    Called by frontend after login to ensure user exists in our database.
    """
    # User already exists (from get_current_active_user)
    # This endpoint can be used to trigger a sync if needed
    return {"status": "synced", "user_id": current_user.id}
