"""
Clean Energy Intelligence Platform - FastAPI Backend

The intelligence platform for the clean energy transition.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api.routes import health, tea, projects, data_upload
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    # Startup
    print("Starting Clean Energy Platform API...")
    yield
    # Shutdown
    print("Shutting down Clean Energy Platform API...")


app = FastAPI(
    title="Clean Energy Intelligence Platform",
    description="The intelligence platform for the clean energy transition",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/api", tags=["health"])
app.include_router(tea.router, prefix="/api/tea", tags=["tea"])
app.include_router(projects.router, prefix="/api/projects", tags=["projects"])
app.include_router(data_upload.router, prefix="/api/upload", tags=["upload"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "Clean Energy Intelligence Platform",
        "version": "0.1.0",
        "status": "operational",
        "tagline": "The intelligence platform for the clean energy transition",
    }
