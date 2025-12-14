"""Authentication and authorization middleware."""

from typing import Annotated
from functools import wraps

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
import httpx

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User, UserTier
from app.crud.user import user_crud

# HTTP Bearer token security scheme
security = HTTPBearer(auto_error=False)


class ClerkTokenVerifier:
    """Verify Clerk JWT tokens."""

    def __init__(self):
        self.clerk_issuer = "https://clerk.your-domain.com"  # Will be configured

    async def verify_token(self, token: str) -> dict | None:
        """
        Verify a Clerk JWT token.

        In production, this should verify the JWT signature using Clerk's JWKS.
        For development, we'll accept the token and decode it.
        """
        # For development: decode without verification
        # In production: use python-jose to verify with Clerk's public key
        try:
            import jwt
            # Decode without verification for development
            # In production, add verify=True and get keys from Clerk JWKS
            payload = jwt.decode(token, options={"verify_signature": False})
            return payload
        except Exception:
            return None


clerk_verifier = ClerkTokenVerifier()


async def get_current_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User | None:
    """
    Get the current authenticated user from the request.

    Returns None if no valid authentication is provided.
    Use get_current_active_user for endpoints that require authentication.
    """
    if not credentials:
        return None

    token = credentials.credentials
    payload = await clerk_verifier.verify_token(token)

    if not payload:
        return None

    # Get Clerk user ID from token
    clerk_id = payload.get("sub")
    if not clerk_id:
        return None

    # Look up user in database
    user = await user_crud.get_by_clerk_id(db, clerk_id)
    return user


async def get_current_active_user(
    current_user: Annotated[User | None, Depends(get_current_user)],
) -> User:
    """
    Get the current authenticated user, raising an error if not authenticated.

    Use this dependency for endpoints that require authentication.
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return current_user


class RequireTier:
    """
    Dependency class for requiring a minimum subscription tier.

    Usage:
        @app.get("/pro-feature")
        async def pro_feature(
            user: User = Depends(RequireTier(UserTier.PROFESSIONAL))
        ):
            ...
    """

    def __init__(self, minimum_tier: UserTier):
        self.minimum_tier = minimum_tier
        self.tier_levels = {
            UserTier.FREE: 0,
            UserTier.STARTER: 1,
            UserTier.PROFESSIONAL: 2,
            UserTier.DISCOVERY: 3,
        }

    async def __call__(
        self,
        current_user: Annotated[User, Depends(get_current_active_user)],
    ) -> User:
        user_level = self.tier_levels.get(current_user.tier, 0)
        required_level = self.tier_levels.get(self.minimum_tier, 0)

        if user_level < required_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This feature requires {self.minimum_tier.value} tier or higher. "
                       f"Your current tier: {current_user.tier.value}",
            )
        return current_user


def require_tier(minimum_tier: UserTier):
    """
    Decorator-style function for requiring a minimum tier.

    Usage:
        @app.get("/pro-feature")
        async def pro_feature(
            user: User = Depends(require_tier(UserTier.PROFESSIONAL))
        ):
            ...
    """
    return RequireTier(minimum_tier)


# Convenience dependencies for common tier requirements
RequireStarter = RequireTier(UserTier.STARTER)
RequireProfessional = RequireTier(UserTier.PROFESSIONAL)
RequireDiscovery = RequireTier(UserTier.DISCOVERY)


# Type aliases for cleaner code
CurrentUser = Annotated[User | None, Depends(get_current_user)]
ActiveUser = Annotated[User, Depends(get_current_active_user)]
StarterUser = Annotated[User, Depends(RequireStarter)]
ProfessionalUser = Annotated[User, Depends(RequireProfessional)]
DiscoveryUser = Annotated[User, Depends(RequireDiscovery)]
