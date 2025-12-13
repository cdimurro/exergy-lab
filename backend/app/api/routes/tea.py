"""TEA (Techno-Economic Analysis) API endpoints."""

from fastapi import APIRouter, HTTPException
from typing import Optional
from pydantic import BaseModel, Field
from app.tea.calculator import TEACalculator

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
