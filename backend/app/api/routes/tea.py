"""TEA (Techno-Economic Analysis) API endpoints."""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import Optional
from pydantic import BaseModel, Field
import io

from app.tea.calculator import TEACalculator
from app.services.ai_service import ai_service
from app.services.report_generator import report_generator
from app.middleware.auth import get_current_user, RequireTier
from app.models.user import User, UserTier
from app.core.database import get_db
from app.crud import project as project_crud
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


class TEAInput(BaseModel):
    """Input parameters for TEA calculation."""

    # Project metadata
    project_name: str = Field(..., description="Name of the project")
    technology_type: str = Field(..., description="Type of technology (solar, wind, hydrogen, etc.)")

    # Capacity and production
    capacity_mw: float = Field(..., gt=0, description="Installed capacity in MW")
    capacity_factor: float = Field(0.25, ge=0, le=1, description="Capacity factor (0-1)")
    annual_production_mwh: Optional[float] = Field(None, description="Override annual production")

    # Capital costs
    capex_per_kw: float = Field(..., gt=0, description="Capital cost per kW installed")
    installation_factor: float = Field(1.2, ge=1, description="Installation multiplier")
    land_cost: float = Field(0, ge=0, description="Land acquisition cost")
    grid_connection_cost: float = Field(0, ge=0, description="Grid connection cost")

    # Operating costs
    opex_per_kw_year: float = Field(..., ge=0, description="Annual O&M per kW")
    fixed_opex_annual: float = Field(0, ge=0, description="Fixed annual operating costs")
    variable_opex_per_mwh: float = Field(0, ge=0, description="Variable cost per MWh")
    insurance_rate: float = Field(0.01, ge=0, le=0.1, description="Insurance as % of CAPEX")

    # Financial parameters
    project_lifetime_years: int = Field(25, ge=1, le=50, description="Project lifetime in years")
    discount_rate: float = Field(0.08, ge=0, le=0.3, description="Discount rate (WACC)")
    debt_ratio: float = Field(0.6, ge=0, le=1, description="Debt financing ratio")
    interest_rate: float = Field(0.05, ge=0, le=0.3, description="Interest rate on debt")
    tax_rate: float = Field(0.21, ge=0, le=0.5, description="Corporate tax rate")
    depreciation_years: int = Field(20, ge=1, le=40, description="Depreciation period")

    # Revenue assumptions
    electricity_price_per_mwh: float = Field(50, ge=0, description="Electricity price $/MWh")
    price_escalation_rate: float = Field(0.02, ge=0, le=0.1, description="Annual price escalation")
    carbon_credit_per_ton: float = Field(0, ge=0, description="Carbon credit value")
    carbon_intensity_avoided: float = Field(0, ge=0, description="Tons CO2 avoided per MWh")


class TEAResult(BaseModel):
    """TEA calculation results."""

    # Summary metrics
    lcoe: float = Field(..., description="Levelized Cost of Energy ($/MWh)")
    npv: float = Field(..., description="Net Present Value ($)")
    irr: float = Field(..., description="Internal Rate of Return (%)")
    payback_years: float = Field(..., description="Simple payback period (years)")

    # Cost breakdown
    total_capex: float
    annual_opex: float
    total_lifetime_cost: float

    # Production
    annual_production_mwh: float
    lifetime_production_mwh: float

    # Revenue
    annual_revenue: float
    lifetime_revenue_npv: float

    # Detailed breakdown
    capex_breakdown: dict
    opex_breakdown: dict
    cash_flows: list


@router.post("/calculate", response_model=TEAResult)
async def calculate_tea(input_data: TEAInput):
    """
    Calculate comprehensive TEA for a clean energy project.

    Returns LCOE, NPV, IRR, payback period, and detailed cost breakdowns.
    """
    try:
        calculator = TEACalculator(input_data.model_dump())
        result = calculator.calculate()
        return TEAResult(**result)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Calculation error: {str(e)}")


@router.post("/quick-lcoe")
async def quick_lcoe(
    capacity_mw: float,
    capex_per_kw: float,
    opex_per_kw_year: float,
    capacity_factor: float = 0.25,
    lifetime_years: int = 25,
    discount_rate: float = 0.08,
):
    """
    Quick LCOE calculation with minimal inputs.

    Useful for rough estimates and comparisons.
    """
    calculator = TEACalculator({
        "project_name": "Quick Estimate",
        "technology_type": "generic",
        "capacity_mw": capacity_mw,
        "capacity_factor": capacity_factor,
        "capex_per_kw": capex_per_kw,
        "opex_per_kw_year": opex_per_kw_year,
        "project_lifetime_years": lifetime_years,
        "discount_rate": discount_rate,
    })

    result = calculator.calculate()

    return {
        "lcoe": round(result["lcoe"], 2),
        "total_capex": round(result["total_capex"], 0),
        "annual_production_mwh": round(result["annual_production_mwh"], 0),
        "unit": "$/MWh",
    }


@router.get("/templates")
async def get_tea_templates():
    """
    Get pre-configured TEA templates for common technologies.
    """
    return {
        "templates": [
            {
                "id": "utility_solar",
                "name": "Utility-Scale Solar PV",
                "technology_type": "solar",
                "capex_per_kw": 1000,
                "opex_per_kw_year": 15,
                "capacity_factor": 0.25,
                "lifetime_years": 30,
            },
            {
                "id": "onshore_wind",
                "name": "Onshore Wind",
                "technology_type": "wind",
                "capex_per_kw": 1400,
                "opex_per_kw_year": 35,
                "capacity_factor": 0.35,
                "lifetime_years": 25,
            },
            {
                "id": "offshore_wind",
                "name": "Offshore Wind",
                "technology_type": "wind",
                "capex_per_kw": 3500,
                "opex_per_kw_year": 80,
                "capacity_factor": 0.45,
                "lifetime_years": 25,
            },
            {
                "id": "battery_storage",
                "name": "Battery Storage (4hr)",
                "technology_type": "storage",
                "capex_per_kw": 1200,
                "opex_per_kw_year": 25,
                "capacity_factor": 0.15,
                "lifetime_years": 15,
            },
            {
                "id": "green_hydrogen",
                "name": "Green Hydrogen (Electrolyzer)",
                "technology_type": "hydrogen",
                "capex_per_kw": 800,
                "opex_per_kw_year": 20,
                "capacity_factor": 0.50,
                "lifetime_years": 20,
            },
        ]
    }


# === AI-Powered Insights (Professional+) ===


class TEAInsightsRequest(BaseModel):
    """Request for AI-powered TEA insights."""
    technology: str = Field(..., description="Technology type")
    tea_results: dict = Field(..., description="TEA calculation results")


class TEAInsightsResponse(BaseModel):
    """Response with AI-generated insights."""
    insights: str = Field(..., description="AI-generated analysis and recommendations")
    model_used: str = Field(default="sonnet", description="AI model used")


@router.post("/insights", response_model=TEAInsightsResponse)
async def generate_tea_insights(
    request: TEAInsightsRequest,
    current_user: User = Depends(RequireTier(UserTier.PROFESSIONAL)),
):
    """
    Generate AI-powered insights for TEA results.

    Requires Professional tier or higher.
    Uses Claude Sonnet for balanced speed and quality.
    """
    try:
        insights = await ai_service.generate_tea_insights(
            technology=request.technology,
            tea_results=request.tea_results,
        )
        return TEAInsightsResponse(insights=insights, model_used="sonnet")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")


class TEACalculateWithInsightsResponse(BaseModel):
    """Response with TEA results and AI insights."""
    results: TEAResult
    insights: str | None = None
    model_used: str | None = None


@router.post("/calculate-with-insights", response_model=TEACalculateWithInsightsResponse)
async def calculate_tea_with_insights(
    input_data: TEAInput,
    include_insights: bool = True,
    current_user: User = Depends(get_current_user),
):
    """
    Calculate TEA and optionally generate AI insights in one call.

    AI insights require Professional tier - included automatically if eligible.
    """
    try:
        # Calculate TEA
        calculator = TEACalculator(input_data.model_dump())
        result = calculator.calculate()
        tea_result = TEAResult(**result)

        # Generate insights if user has Professional tier and requested
        insights = None
        model_used = None
        if include_insights and current_user.tier in [UserTier.PROFESSIONAL, UserTier.DISCOVERY]:
            try:
                insights = await ai_service.generate_tea_insights(
                    technology=input_data.technology_type,
                    tea_results=result,
                )
                model_used = "sonnet"
            except Exception:
                # Don't fail the whole request if insights fail
                pass

        return TEACalculateWithInsightsResponse(
            results=tea_result,
            insights=insights,
            model_used=model_used,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Calculation error: {str(e)}")


# === PDF Report Export (Professional+) ===


class TEAReportRequest(BaseModel):
    """Request to generate a TEA PDF report."""
    project_name: str = Field(..., description="Project name")
    technology: str = Field(..., description="Technology type")
    tea_results: dict = Field(..., description="TEA calculation results")
    include_ai_insights: bool = Field(True, description="Include AI-generated insights")


@router.post("/report")
async def generate_tea_report(
    request: TEAReportRequest,
    current_user: User = Depends(RequireTier(UserTier.PROFESSIONAL)),
):
    """
    Generate a professional PDF report for TEA analysis.

    Requires Professional tier or higher.
    """
    try:
        # Generate AI insights if requested
        ai_insights = None
        if request.include_ai_insights:
            try:
                ai_insights = await ai_service.generate_tea_insights(
                    technology=request.technology,
                    tea_results=request.tea_results,
                )
            except Exception:
                pass  # Continue without insights if generation fails

        # Generate PDF
        pdf_bytes = await report_generator.generate_tea_report(
            project_name=request.project_name,
            technology=request.technology,
            tea_results=request.tea_results,
            ai_insights=ai_insights,
            user_name=current_user.email,
        )

        # Return as downloadable PDF
        filename = f"TEA_Report_{request.project_name.replace(' ', '_')}.pdf"
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


# === Project Persistence (Starter+) ===


class SaveTEARequest(BaseModel):
    """Request to save TEA results to a project."""
    project_id: int | None = Field(None, description="Existing project ID (creates new if not provided)")
    project_name: str = Field(..., description="Project name")
    technology_type: str = Field(..., description="Technology type")
    input_data: dict = Field(..., description="TEA input parameters")
    results: dict = Field(..., description="TEA calculation results")


class SaveTEAResponse(BaseModel):
    """Response after saving TEA results."""
    project_id: int
    message: str


@router.post("/save", response_model=SaveTEAResponse)
async def save_tea_results(
    request: SaveTEARequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Save TEA results to a project.

    Creates a new project or updates an existing one.
    """
    from app.schemas.project import ProjectCreate, ProjectUpdate, TEADataUpdate
    from app.models.project import TechnologyType

    try:
        # Map technology type string to enum
        tech_type = TechnologyType.CUSTOM
        tech_mapping = {
            "solar": TechnologyType.SOLAR_PV,
            "wind": TechnologyType.WIND_ONSHORE,
            "offshore_wind": TechnologyType.WIND_OFFSHORE,
            "hydrogen": TechnologyType.HYDROGEN_GREEN,
            "storage": TechnologyType.BATTERY_STORAGE,
            "nuclear": TechnologyType.NUCLEAR_SMR,
            "hydro": TechnologyType.HYDRO,
            "geothermal": TechnologyType.GEOTHERMAL,
            "biomass": TechnologyType.BIOMASS,
        }
        if request.technology_type.lower() in tech_mapping:
            tech_type = tech_mapping[request.technology_type.lower()]

        tea_data = {
            "inputs": request.input_data,
            "results": request.results,
        }

        if request.project_id:
            # Update existing project
            project = await project_crud.get(db, request.project_id)
            if not project or project.user_id != current_user.id:
                raise HTTPException(status_code=404, detail="Project not found")

            updated = await project_crud.update(
                db,
                db_obj=project,
                obj_in=ProjectUpdate(
                    name=request.project_name,
                    technology_type=tech_type,
                    tea_data=tea_data,
                ),
            )
            return SaveTEAResponse(
                project_id=updated.id,
                message="TEA results updated successfully",
            )
        else:
            # Check project limits for tier
            project_count = await project_crud.count_by_user(db, current_user.id)
            if current_user.tier == UserTier.FREE and project_count >= 3:
                raise HTTPException(
                    status_code=403,
                    detail="Free tier limited to 3 projects. Upgrade to create more.",
                )

            # Create new project
            project = await project_crud.create_with_user(
                db,
                obj_in=ProjectCreate(
                    name=request.project_name,
                    technology_type=tech_type,
                ),
                user_id=current_user.id,
            )

            # Update with TEA data
            await project_crud.update(
                db,
                db_obj=project,
                obj_in=ProjectUpdate(tea_data=tea_data),
            )

            return SaveTEAResponse(
                project_id=project.id,
                message="Project created and TEA results saved successfully",
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save TEA results: {str(e)}")
