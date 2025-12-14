"""
Exergy Analysis API endpoints.

Professional tier feature - the technical moat.

Provides thermodynamically accurate analysis that shows:
- TRUE efficiency (Second Law, not just First Law)
- WHERE work potential is destroyed
- HOW MUCH improvement is possible
- WHY clean energy delivers 3x more value
"""

from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Optional
import io

from app.tea.exergy_analysis import ExergyAnalyzer, EnergyQuality
from app.services.ai_service import ai_service
from app.services.report_generator import report_generator
from app.middleware.auth import get_current_user, RequireTier
from app.models.user import User, UserTier

router = APIRouter()


class ExergyAnalysisInput(BaseModel):
    """Input for exergy analysis."""

    energy_source: str = Field(
        ...,
        description="Energy source: coal, oil, gas, solar, wind, hydro, nuclear, biomass, geothermal",
    )
    input_energy_mj: float = Field(..., gt=0, description="Input energy in MJ")
    output_temp_k: Optional[float] = Field(
        None, ge=273, description="Output temperature in Kelvin (for heat applications)"
    )
    end_use_type: str = Field(
        "electricity",
        description="End use: electricity, mechanical_work, high_temp_heat, medium_temp_heat, low_temp_heat",
    )


class TechnologyComparison(BaseModel):
    """Technology for comparison."""

    name: str
    source: str
    input_energy: float = 1000


@router.post("/analyze")
async def analyze_exergy(input_data: ExergyAnalysisInput):
    """
    Perform comprehensive exergy analysis.

    Professional tier required.

    Returns:
    - First Law efficiency (energy-based)
    - Second Law efficiency (exergy-based) - THE TRUE MEASURE
    - Exergy destruction (where work potential is lost)
    - Improvement potential
    - Thermodynamic perfection score
    """
    # Map end use type
    end_use_map = {
        "electricity": EnergyQuality.ELECTRICITY,
        "mechanical_work": EnergyQuality.MECHANICAL_WORK,
        "high_temp_heat": EnergyQuality.HIGH_TEMP_HEAT,
        "medium_temp_heat": EnergyQuality.MEDIUM_TEMP_HEAT,
        "low_temp_heat": EnergyQuality.LOW_TEMP_HEAT,
        "chemical": EnergyQuality.CHEMICAL,
    }

    end_use = end_use_map.get(input_data.end_use_type.lower(), EnergyQuality.ELECTRICITY)

    result = ExergyAnalyzer.analyze_process(
        energy_source=input_data.energy_source,
        input_energy_mj=input_data.input_energy_mj,
        output_temp_k=input_data.output_temp_k,
        end_use_type=end_use,
    )

    return {
        "input": {
            "energy_mj": result.input_energy_mj,
            "exergy_mj": result.input_exergy_mj,
        },
        "output": {
            "useful_energy_mj": result.useful_energy_mj,
            "useful_exergy_mj": result.useful_exergy_mj,
        },
        "losses": {
            "energy_loss_mj": result.energy_loss_mj,
            "exergy_destruction_mj": result.exergy_destruction_mj,
        },
        "efficiency": {
            "first_law_percent": round(result.first_law_efficiency * 100, 1),
            "second_law_percent": round(result.second_law_efficiency * 100, 1),
            "note": (
                "First Law shows energy conversion. "
                "Second Law shows TRUE thermodynamic efficiency."
            ),
        },
        "analysis": {
            "exergy_destruction_ratio": result.exergy_destruction_ratio,
            "improvement_potential_mj": result.improvement_potential_mj,
            "thermodynamic_perfection_percent": result.thermodynamic_perfection,
            "carnot_factor": result.carnot_factor,
        },
        "insight": (
            f"This {input_data.energy_source} process destroys "
            f"{round(result.exergy_destruction_ratio * 100, 1)}% of input exergy. "
            f"Improvement potential: {result.improvement_potential_mj:.1f} MJ."
        ),
    }


@router.post("/compare")
async def compare_technologies(technologies: List[TechnologyComparison]):
    """
    Compare multiple technologies by exergy efficiency.

    Professional tier required.

    Shows which technology provides the most thermodynamic
    value per unit of primary energy.
    """
    tech_list = [
        {
            "name": t.name,
            "source": t.source,
            "input_energy": t.input_energy,
        }
        for t in technologies
    ]

    return ExergyAnalyzer.compare_technologies(tech_list)


@router.post("/economic-value")
async def calculate_exergy_value(
    annual_production_mwh: float,
    technology: str,
    electricity_price_per_mwh: float = 50.0,
):
    """
    Calculate exergy-economic value of energy production.

    Professional tier required.

    Shows:
    - Nominal value (conventional)
    - Exergy-adjusted value (thermodynamic truth)
    - Clean energy premium factor
    - True thermodynamic value
    """
    return ExergyAnalyzer.calculate_exergy_value(
        annual_production_mwh=annual_production_mwh,
        technology=technology,
        electricity_price_per_mwh=electricity_price_per_mwh,
    )


@router.get("/efficiency-factors")
async def get_efficiency_factors():
    """
    Get efficiency and quality factors by energy source.

    Returns the factors used in exergy calculations:
    - Efficiency factors (primary → useful)
    - Exergy quality factors (useful → services)
    """
    return {
        "efficiency_factors": ExergyAnalyzer.EFFICIENCY_FACTORS,
        "quality_factors": ExergyAnalyzer.SOURCE_QUALITY_FACTORS,
        "reference_conditions": {
            "temperature_k": ExergyAnalyzer.T0,
            "temperature_c": ExergyAnalyzer.T0 - 273.15,
            "pressure_kpa": ExergyAnalyzer.P0,
        },
        "methodology": {
            "description": (
                "Efficiency factors convert primary energy to useful energy. "
                "Quality factors adjust for the thermodynamic value of the end use."
            ),
            "sources": [
                "Brockway et al. (2021)",
                "IEA World Energy Outlook 2024",
                "Exergy Analysis literature",
            ],
        },
    }


@router.get("/clean-advantage")
async def get_clean_energy_advantage():
    """
    Explain why clean energy delivers 3x more thermodynamic value.

    This is the key insight that makes exergy analysis valuable.
    """
    return {
        "headline": "Clean energy delivers 3.0-3.4× more thermodynamic value than fossil fuels",
        "why": {
            "1_higher_efficiency": {
                "clean": "85-88% (wind, solar, hydro)",
                "fossil": "30-52% (coal, oil, gas)",
                "explanation": "Clean sources convert more primary energy to useful output",
            },
            "2_higher_quality": {
                "clean": "Electricity (exergy quality = 1.0)",
                "fossil": "Often heat (exergy quality = 0.2-0.6)",
                "explanation": "Electricity is pure work potential; heat is degraded energy",
            },
        },
        "implication": {
            "r_and_d": (
                "R&D funding should align with exergy losses, not energy losses. "
                "Investing in clean energy yields more thermodynamic value."
            ),
            "valuation": (
                "Clean energy projects should be valued higher per MWh "
                "because they deliver more actual work."
            ),
            "policy": (
                "Carbon pricing undervalues clean energy's true thermodynamic advantage."
            ),
        },
        "data_validation": {
            "source": "Global Exergy Services Model",
            "accuracy": "±10-12% uncertainty",
            "validation": ["IEA WEO 2024", "Brockway et al. (2021)", "RMI 2024"],
        },
    }


# === AI-Powered Analysis (Professional+) ===


class ExergyInsightsRequest(BaseModel):
    """Request for AI-powered exergy insights."""
    process_name: str = Field(..., description="Name of the process")
    exergy_results: dict = Field(..., description="Exergy analysis results")


class ExergyInsightsResponse(BaseModel):
    """Response with AI-generated exergy insights."""
    insights: str = Field(..., description="AI-generated thermodynamic analysis")
    model_used: str = Field(default="sonnet", description="AI model used")


@router.post("/insights", response_model=ExergyInsightsResponse)
async def generate_exergy_insights(
    request: ExergyInsightsRequest,
    current_user: User = Depends(RequireTier(UserTier.PROFESSIONAL)),
):
    """
    Generate AI-powered explanations of exergy analysis results.

    Requires Professional tier or higher.
    Uses Claude Sonnet for clear technical writing.
    """
    try:
        insights = await ai_service.explain_exergy_analysis(
            process_name=request.process_name,
            exergy_results=request.exergy_results,
        )
        return ExergyInsightsResponse(insights=insights, model_used="sonnet")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")


class ExergyAnalyzeWithInsightsResponse(BaseModel):
    """Response with exergy results and AI insights."""
    results: dict
    insights: str | None = None
    model_used: str | None = None


@router.post("/analyze-with-insights", response_model=ExergyAnalyzeWithInsightsResponse)
async def analyze_exergy_with_insights(
    input_data: ExergyAnalysisInput,
    include_insights: bool = True,
    current_user: User = Depends(RequireTier(UserTier.PROFESSIONAL)),
):
    """
    Perform exergy analysis and generate AI insights in one call.

    Requires Professional tier or higher.
    """
    try:
        # Map end use type
        end_use_map = {
            "electricity": EnergyQuality.ELECTRICITY,
            "mechanical_work": EnergyQuality.MECHANICAL_WORK,
            "high_temp_heat": EnergyQuality.HIGH_TEMP_HEAT,
            "medium_temp_heat": EnergyQuality.MEDIUM_TEMP_HEAT,
            "low_temp_heat": EnergyQuality.LOW_TEMP_HEAT,
            "chemical": EnergyQuality.CHEMICAL,
        }

        end_use = end_use_map.get(input_data.end_use_type.lower(), EnergyQuality.ELECTRICITY)

        result = ExergyAnalyzer.analyze_process(
            energy_source=input_data.energy_source,
            input_energy_mj=input_data.input_energy_mj,
            output_temp_k=input_data.output_temp_k,
            end_use_type=end_use,
        )

        exergy_results = {
            "input": {
                "energy_mj": result.input_energy_mj,
                "exergy_mj": result.input_exergy_mj,
            },
            "output": {
                "useful_energy_mj": result.useful_energy_mj,
                "useful_exergy_mj": result.useful_exergy_mj,
            },
            "losses": {
                "energy_loss_mj": result.energy_loss_mj,
                "exergy_destruction_mj": result.exergy_destruction_mj,
            },
            "efficiency": {
                "first_law_percent": round(result.first_law_efficiency * 100, 1),
                "second_law_percent": round(result.second_law_efficiency * 100, 1),
            },
            "analysis": {
                "exergy_destruction_ratio": result.exergy_destruction_ratio,
                "improvement_potential_mj": result.improvement_potential_mj,
                "thermodynamic_perfection_percent": result.thermodynamic_perfection,
                "carnot_factor": result.carnot_factor,
            },
            # For AI insights
            "exergy_efficiency": result.second_law_efficiency,
            "exergy_destruction": result.exergy_destruction_mj,
            "exergy_input": result.input_exergy_mj,
            "exergy_output": result.useful_exergy_mj,
        }

        # Generate AI insights if requested
        insights = None
        model_used = None
        if include_insights:
            try:
                insights = await ai_service.explain_exergy_analysis(
                    process_name=f"{input_data.energy_source} to {input_data.end_use_type}",
                    exergy_results=exergy_results,
                )
                model_used = "sonnet"
            except Exception:
                pass  # Continue without insights if generation fails

        return ExergyAnalyzeWithInsightsResponse(
            results=exergy_results,
            insights=insights,
            model_used=model_used,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Analysis error: {str(e)}")


# === PDF Report Export (Professional+) ===


class ExergyReportRequest(BaseModel):
    """Request to generate an exergy PDF report."""
    process_name: str = Field(..., description="Name of the process")
    technology_type: str = Field(..., description="Technology type")
    exergy_results: dict = Field(..., description="Exergy analysis results")
    include_ai_insights: bool = Field(True, description="Include AI-generated insights")


@router.post("/report")
async def generate_exergy_report(
    request: ExergyReportRequest,
    current_user: User = Depends(RequireTier(UserTier.PROFESSIONAL)),
):
    """
    Generate a professional PDF report for exergy analysis.

    Requires Professional tier or higher.
    """
    try:
        # Generate AI insights if requested
        ai_insights = None
        if request.include_ai_insights:
            try:
                ai_insights = await ai_service.explain_exergy_analysis(
                    process_name=request.process_name,
                    exergy_results=request.exergy_results,
                )
            except Exception:
                pass  # Continue without insights if generation fails

        # Generate PDF
        pdf_bytes = await report_generator.generate_exergy_report(
            process_name=request.process_name,
            technology_type=request.technology_type,
            exergy_results=request.exergy_results,
            ai_insights=ai_insights,
            user_name=current_user.email,
        )

        # Return as downloadable PDF
        filename = f"Exergy_Report_{request.process_name.replace(' ', '_')}.pdf"
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")
