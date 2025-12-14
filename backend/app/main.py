"""
Clean Energy Intelligence Platform - FastAPI Backend

The intelligence platform for the clean energy transition.

API Structure:
- /api/health - Health checks
- /api/tea - TEA calculations (Starter+)
- /api/projects - Project management (Starter+)
- /api/upload - Data upload (Starter+)
- /api/energy - Global energy data (Starter: basic, Pro: full)
- /api/exergy - Exergy analysis (Professional+)
- /api/discovery - Discovery engine (Discovery tier)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api.routes import health, tea, projects, data_upload, energy, exergy, discovery, payments, auth
from app.core.config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events."""
    from app.core.database import close_db

    # Startup
    print("🚀 Starting Clean Energy Intelligence Platform API...")
    print(f"   Environment: {settings.ENVIRONMENT}")
    print(f"   Debug: {settings.DEBUG}")
    print("   Database: PostgreSQL configured")
    yield
    # Shutdown
    print("👋 Shutting down Clean Energy Platform API...")
    await close_db()


app = FastAPI(
    title="Clean Energy Intelligence Platform",
    description="""
## The intelligence platform for the clean energy transition

### Tiers

| Tier | Price | Features |
|------|-------|----------|
| **Starter** | $19.99/mo | Basic TEA, Global Energy Dashboard |
| **Professional** | $99/mo | Exergy Analysis, Full Scenarios, AI Insights |
| **Discovery** | $499/mo | Materials Database, Discovery Engine, Full API |

### Key Endpoints

- **TEA Calculator**: LCOE, NPV, IRR calculations
- **Global Energy**: 60 years of exergy services data
- **Exergy Analysis**: Thermodynamically accurate efficiency
- **Discovery Engine**: AI-powered clean energy discovery
    """,
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === HEALTH ===
app.include_router(
    health.router,
    prefix="/api",
    tags=["Health"],
)

# === AUTH ===
app.include_router(
    auth.router,
    prefix="/api/auth",
    tags=["Authentication"],
)

# === STARTER TIER ===
app.include_router(
    tea.router,
    prefix="/api/tea",
    tags=["TEA Calculator"],
)
app.include_router(
    projects.router,
    prefix="/api/projects",
    tags=["Projects"],
)
app.include_router(
    data_upload.router,
    prefix="/api/upload",
    tags=["Data Upload"],
)
app.include_router(
    energy.router,
    prefix="/api/energy",
    tags=["Global Energy"],
)

# === PROFESSIONAL TIER ===
app.include_router(
    exergy.router,
    prefix="/api/exergy",
    tags=["Exergy Analysis (Pro)"],
)

# === DISCOVERY TIER ===
app.include_router(
    discovery.router,
    prefix="/api/discovery",
    tags=["Discovery Engine (Discovery)"],
)

# === PAYMENTS ===
app.include_router(
    payments.router,
    prefix="/api/payments",
    tags=["Payments & Subscriptions"],
)


@app.get("/")
async def root():
    """Root endpoint - Platform overview."""
    return {
        "name": "Clean Energy Intelligence Platform",
        "version": "0.1.0",
        "status": "operational",
        "tagline": "The intelligence platform for the clean energy transition",
        "tiers": {
            "starter": {
                "price": "$19.99/month",
                "features": ["Basic TEA", "Global Energy Dashboard", "3 Projects"],
            },
            "professional": {
                "price": "$99/month",
                "features": ["Exergy Analysis", "Full Scenarios", "AI Insights", "Unlimited Projects"],
            },
            "discovery": {
                "price": "$499/month",
                "features": ["Discovery Engine", "Materials Database", "Full API Access"],
            },
        },
        "endpoints": {
            "docs": "/docs",
            "health": "/api/health",
            "tea": "/api/tea",
            "energy": "/api/energy",
            "exergy": "/api/exergy",
            "discovery": "/api/discovery",
            "payments": "/api/payments",
        },
    }


@app.get("/api")
async def api_overview():
    """API overview with tier requirements."""
    return {
        "version": "0.1.0",
        "tiers": {
            "starter": [
                "GET /api/tea/templates",
                "POST /api/tea/calculate",
                "POST /api/tea/quick-lcoe",
                "GET /api/energy/current",
                "GET /api/energy/timeseries",
                "GET /api/energy/benchmarks",
                "POST /api/upload",
                "CRUD /api/projects (limit: 3)",
            ],
            "professional": [
                "All Starter endpoints",
                "POST /api/exergy/analyze",
                "POST /api/exergy/compare",
                "POST /api/exergy/economic-value",
                "GET /api/energy/regional",
                "GET /api/energy/sectors",
                "GET /api/energy/projections",
                "POST /api/energy/compare",
                "Unlimited projects",
            ],
            "discovery": [
                "All Professional endpoints",
                "POST /api/discovery/search",
                "POST /api/discovery/materials/search",
                "GET /api/discovery/materials/{id}",
                "GET /api/discovery/technology-roadmap/{tech}",
                "GET /api/discovery/ip-landscape/{tech}",
                "GET /api/energy/api/full-dataset",
                "Full API access",
            ],
        },
    }
