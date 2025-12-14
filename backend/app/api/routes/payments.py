"""
Stripe Payments API

Handles subscription management, checkout sessions, and webhooks.
"""

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, HTTPException, Request, Header, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import stripe

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, UserTier
from app.models.subscription import SubscriptionStatus as SubStatus, SubscriptionTier
from app.crud.user import user_crud
from app.crud.subscription import subscription_crud
from app.schemas.subscription import (
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    PortalSessionResponse,
)
from app.middleware.auth import get_current_active_user

router = APIRouter()

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

# Pricing configuration - maps our tiers to Stripe price IDs
TIER_PRICE_MAP = {
    SubscriptionTier.STARTER: settings.STRIPE_PRICE_STARTER,  # $19.99/month
    SubscriptionTier.PROFESSIONAL: settings.STRIPE_PRICE_PROFESSIONAL,  # $99/month
    SubscriptionTier.DISCOVERY: settings.STRIPE_PRICE_DISCOVERY,  # $499/month
}

PRICE_TIER_MAP = {
    settings.STRIPE_PRICE_STARTER: SubscriptionTier.STARTER,
    settings.STRIPE_PRICE_PROFESSIONAL: SubscriptionTier.PROFESSIONAL,
    settings.STRIPE_PRICE_DISCOVERY: SubscriptionTier.DISCOVERY,
}


@router.get("/prices")
async def get_prices():
    """Get available pricing plans."""
    return {
        "plans": [
            {
                "id": "free",
                "name": "Free",
                "price": 0,
                "interval": "month",
                "features": [
                    "Interactive Energy Visualization",
                    "View-only Dashboard Access",
                    "1 Project",
                ],
            },
            {
                "id": "starter",
                "name": "Starter",
                "price": 19.99,
                "interval": "month",
                "stripe_price_id": settings.STRIPE_PRICE_STARTER,
                "features": [
                    "Everything in Free",
                    "Basic TEA Calculator",
                    "LCOE Calculations",
                    "Basic PDF Reports",
                    "3 Projects",
                ],
            },
            {
                "id": "professional",
                "name": "Professional",
                "price": 99,
                "interval": "month",
                "stripe_price_id": settings.STRIPE_PRICE_PROFESSIONAL,
                "features": [
                    "Everything in Starter",
                    "Full TEA Engine (NPV, IRR, Sensitivity)",
                    "Exergy Analysis",
                    "AI-Powered Insights",
                    "Investor-Ready PDF Reports",
                    "Unlimited Projects",
                    "Team Collaboration (5 seats)",
                ],
            },
            {
                "id": "discovery",
                "name": "Discovery",
                "price": 499,
                "interval": "month",
                "stripe_price_id": settings.STRIPE_PRICE_DISCOVERY,
                "features": [
                    "Everything in Professional",
                    "AI Discovery Engine",
                    "Materials Project Database",
                    "Literature Synthesis",
                    "Patent Landscape Analysis",
                    "Full API Access",
                    "Unlimited Team Members",
                    "Priority Support",
                ],
            },
        ],
        "currency": "usd",
    }


@router.post("/create-checkout", response_model=CheckoutSessionResponse)
async def create_checkout_session(
    request: CheckoutSessionRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """
    Create a Stripe checkout session for subscription.
    """
    # Get price ID for the requested tier
    price_id = TIER_PRICE_MAP.get(request.tier)
    if not price_id:
        raise HTTPException(
            status_code=400,
            detail=f"No price configured for tier: {request.tier.value}",
        )

    # Get or create Stripe customer
    subscription = await subscription_crud.get_by_user(db, current_user.id)

    if subscription:
        customer_id = subscription.stripe_customer_id
    else:
        # Create new Stripe customer
        try:
            customer = stripe.Customer.create(
                email=current_user.email,
                name=current_user.name,
                metadata={"user_id": str(current_user.id)},
            )
            customer_id = customer.id

            # Create subscription record
            subscription = await subscription_crud.create_for_user(
                db,
                user_id=current_user.id,
                stripe_customer_id=customer_id,
                tier=SubscriptionTier.FREE,
            )
            await db.commit()
        except stripe.error.StripeError as e:
            raise HTTPException(status_code=400, detail=str(e))

    # Create checkout session
    try:
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{"price": price_id, "quantity": 1}],
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            metadata={"user_id": str(current_user.id)},
        )

        return CheckoutSessionResponse(
            checkout_url=session.url,
            session_id=session.id,
        )
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/subscription")
async def get_subscription_status(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Get current user's subscription status."""
    subscription = await subscription_crud.get_by_user(db, current_user.id)

    if not subscription:
        return {
            "tier": "free",
            "status": "none",
            "current_period_end": None,
            "cancel_at_period_end": False,
        }

    return {
        "tier": subscription.tier.value,
        "status": subscription.status.value,
        "current_period_end": subscription.current_period_end.isoformat()
            if subscription.current_period_end else None,
        "cancel_at_period_end": subscription.cancel_at_period_end,
    }


@router.post("/cancel")
async def cancel_subscription(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Cancel the current subscription at period end."""
    subscription = await subscription_crud.get_by_user(db, current_user.id)

    if not subscription or not subscription.stripe_subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription found")

    try:
        # Cancel at period end in Stripe
        stripe.Subscription.modify(
            subscription.stripe_subscription_id,
            cancel_at_period_end=True,
        )

        # Update our database
        await subscription_crud.cancel(db, subscription=subscription, at_period_end=True)
        await db.commit()

        return {"message": "Subscription will be canceled at the end of the billing period"}
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/portal", response_model=PortalSessionResponse)
async def create_portal_session(
    return_url: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
):
    """Create a Stripe billing portal session."""
    subscription = await subscription_crud.get_by_user(db, current_user.id)

    if not subscription:
        raise HTTPException(status_code=400, detail="No subscription found")

    try:
        session = stripe.billing_portal.Session.create(
            customer=subscription.stripe_customer_id,
            return_url=return_url,
        )

        return PortalSessionResponse(portal_url=session.url)
    except stripe.error.StripeError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
):
    """
    Handle Stripe webhooks.

    Events handled:
    - checkout.session.completed: Activate subscription
    - customer.subscription.updated: Update tier/status
    - customer.subscription.deleted: Downgrade to free
    - invoice.payment_failed: Handle failed payment
    """
    payload = await request.body()

    # Verify webhook signature
    if settings.STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(
                payload,
                stripe_signature,
                settings.STRIPE_WEBHOOK_SECRET,
            )
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        # Development mode: parse without verification
        import json
        event = json.loads(payload)

    event_type = event.get("type") if isinstance(event, dict) else event.type
    data = event.get("data", {}).get("object", {}) if isinstance(event, dict) else event.data.object

    if event_type == "checkout.session.completed":
        # Subscription created via checkout
        customer_id = data.get("customer")
        subscription_id = data.get("subscription")

        if customer_id and subscription_id:
            subscription = await subscription_crud.get_by_stripe_customer(db, customer_id)
            if subscription:
                # Get subscription details from Stripe
                stripe_sub = stripe.Subscription.retrieve(subscription_id)
                price_id = stripe_sub.items.data[0].price.id if stripe_sub.items.data else None
                tier = PRICE_TIER_MAP.get(price_id, SubscriptionTier.PROFESSIONAL)

                await subscription_crud.update_from_stripe(
                    db,
                    subscription=subscription,
                    stripe_subscription_id=subscription_id,
                    stripe_price_id=price_id,
                    tier=tier,
                    status=SubStatus.ACTIVE,
                    current_period_start=datetime.fromtimestamp(stripe_sub.current_period_start),
                    current_period_end=datetime.fromtimestamp(stripe_sub.current_period_end),
                )

                # Update user tier
                user = await user_crud.get(db, subscription.user_id)
                if user:
                    # Map subscription tier to user tier
                    tier_mapping = {
                        SubscriptionTier.STARTER: UserTier.STARTER,
                        SubscriptionTier.PROFESSIONAL: UserTier.PROFESSIONAL,
                        SubscriptionTier.DISCOVERY: UserTier.DISCOVERY,
                    }
                    user_tier = tier_mapping.get(tier, UserTier.FREE)
                    await user_crud.update_tier(db, user=user, tier=user_tier)

                await db.commit()

    elif event_type == "customer.subscription.updated":
        subscription_id = data.get("id")
        if subscription_id:
            subscription = await subscription_crud.get_by_stripe_subscription(db, subscription_id)
            if subscription:
                status_map = {
                    "active": SubStatus.ACTIVE,
                    "canceled": SubStatus.CANCELED,
                    "incomplete": SubStatus.INCOMPLETE,
                    "incomplete_expired": SubStatus.INCOMPLETE_EXPIRED,
                    "past_due": SubStatus.PAST_DUE,
                    "paused": SubStatus.PAUSED,
                    "trialing": SubStatus.TRIALING,
                    "unpaid": SubStatus.UNPAID,
                }

                await subscription_crud.update_from_stripe(
                    db,
                    subscription=subscription,
                    status=status_map.get(data.get("status"), SubStatus.ACTIVE),
                    cancel_at_period_end=data.get("cancel_at_period_end", False),
                    current_period_end=datetime.fromtimestamp(data.get("current_period_end", 0))
                        if data.get("current_period_end") else None,
                )
                await db.commit()

    elif event_type == "customer.subscription.deleted":
        subscription_id = data.get("id")
        if subscription_id:
            subscription = await subscription_crud.get_by_stripe_subscription(db, subscription_id)
            if subscription:
                await subscription_crud.update_from_stripe(
                    db,
                    subscription=subscription,
                    status=SubStatus.CANCELED,
                    tier=SubscriptionTier.FREE,
                )

                # Downgrade user to free tier
                user = await user_crud.get(db, subscription.user_id)
                if user:
                    await user_crud.update_tier(db, user=user, tier=UserTier.FREE)

                await db.commit()

    elif event_type == "invoice.payment_failed":
        customer_id = data.get("customer")
        if customer_id:
            subscription = await subscription_crud.get_by_stripe_customer(db, customer_id)
            if subscription:
                await subscription_crud.update_from_stripe(
                    db,
                    subscription=subscription,
                    status=SubStatus.PAST_DUE,
                )
                await db.commit()

    return {"status": "received", "type": event_type}
