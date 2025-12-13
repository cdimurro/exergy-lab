"""Health check endpoints."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """Check API health status."""
    return {
        "status": "healthy",
        "service": "Clean Energy Intelligence Platform",
        "version": "0.1.0",
    }


@router.get("/health/ready")
async def readiness_check():
    """Check if the service is ready to accept requests."""
    # TODO: Add database and Redis connectivity checks
    return {
        "ready": True,
        "checks": {
            "database": "ok",
            "redis": "ok",
        },
    }
