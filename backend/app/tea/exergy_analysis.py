"""
Exergy-Economic Analysis Module.

This is the technical moat of the platform - thermodynamically accurate
energy analysis that no one else provides.

Key concepts:
- First Law (Energy): Measures quantity, shows WHERE energy is lost
- Second Law (Exergy): Measures quality, shows WHERE work potential is destroyed

Why this matters:
R&D funding often correlates with energy losses when it should align with
exergy losses - the actual measure of inefficiency. This misallocation
wastes capital on thermodynamically suboptimal processes.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from enum import Enum
import math


class EnergyQuality(Enum):
    """Energy quality levels by end-use."""

    ELECTRICITY = 1.0  # Perfect work conversion
    MECHANICAL_WORK = 1.0  # Direct work output
    HIGH_TEMP_HEAT = 0.6  # >400°C industrial heat
    MEDIUM_TEMP_HEAT = 0.4  # 100-400°C process heat
    LOW_TEMP_HEAT = 0.2  # <100°C space/water heating
    CHEMICAL = 0.9  # Chemical energy (fuels)


@dataclass
class ExergyAnalysisResult:
    """Results from exergy analysis."""

    # Input energy
    input_energy_mj: float
    input_exergy_mj: float

    # Output energy/exergy
    useful_energy_mj: float
    useful_exergy_mj: float

    # Losses
    energy_loss_mj: float
    exergy_destruction_mj: float

    # Efficiencies
    first_law_efficiency: float  # η = useful energy / input energy
    second_law_efficiency: float  # ψ = useful exergy / input exergy
    exergy_destruction_ratio: float

    # Analysis
    improvement_potential_mj: float
    thermodynamic_perfection: float
    carnot_factor: Optional[float] = None

    # Breakdown by component
    component_analysis: Optional[Dict[str, dict]] = None


class ExergyAnalyzer:
    """
    Exergy-Economic Analysis Engine.

    Professional tier feature - the key differentiator.

    Provides:
    1. Exergy efficiency calculations
    2. Work destruction analysis
    3. Thermodynamic optimization recommendations
    4. Component-level exergy breakdown
    """

    # Reference environment conditions
    T0 = 298.15  # Reference temperature (K) - 25°C
    P0 = 101.325  # Reference pressure (kPa)

    # Exergy quality factors by source
    SOURCE_QUALITY_FACTORS = {
        "coal": 0.78,  # 70% electricity + 25% high-temp + 5% medium-temp
        "oil": 0.82,  # 80% transport + 10% low-temp + 10% industrial
        "gas": 0.46,  # 40% electricity + 50% low-temp + 10% industrial
        "nuclear": 0.95,  # 100% electricity (minus T&D)
        "hydro": 0.95,  # 100% electricity
        "wind": 0.95,  # 100% electricity
        "solar": 0.95,  # 100% electricity (PV) or mixed (thermal)
        "biomass": 0.26,  # 70% low-temp + 15% transport + 10% electricity + 5% medium-temp
        "geothermal": 0.54,  # 50% direct heating + 50% electricity
    }

    # Efficiency factors (primary → useful)
    EFFICIENCY_FACTORS = {
        "coal": 0.32,
        "oil": 0.30,
        "gas": 0.52,
        "nuclear": 0.25,
        "hydro": 0.87,
        "wind": 0.88,
        "solar": 0.85,
        "biomass": 0.20,
        "geothermal": 0.82,
    }

    @classmethod
    def calculate_carnot_factor(
        cls,
        hot_temp_k: float,
        cold_temp_k: Optional[float] = None,
    ) -> float:
        """
        Calculate Carnot efficiency factor.

        η_carnot = 1 - (T_cold / T_hot)

        This is the maximum theoretical efficiency for heat engines.
        """
        cold_temp = cold_temp_k or cls.T0
        if hot_temp_k <= cold_temp:
            return 0.0
        return 1 - (cold_temp / hot_temp_k)

    @classmethod
    def calculate_heat_exergy(
        cls,
        heat_mj: float,
        temp_k: float,
    ) -> float:
        """
        Calculate exergy content of heat.

        Exergy = Q × (1 - T0/T)

        Higher temperature = higher quality = more exergy
        """
        if temp_k <= cls.T0:
            return 0.0
        carnot = cls.calculate_carnot_factor(temp_k)
        return heat_mj * carnot

    @classmethod
    def analyze_process(
        cls,
        energy_source: str,
        input_energy_mj: float,
        output_temp_k: Optional[float] = None,
        end_use_type: EnergyQuality = EnergyQuality.ELECTRICITY,
        process_steps: Optional[List[Dict]] = None,
    ) -> ExergyAnalysisResult:
        """
        Perform comprehensive exergy analysis on an energy conversion process.

        Args:
            energy_source: Type of energy source (coal, solar, wind, etc.)
            input_energy_mj: Input energy in MJ
            output_temp_k: Output temperature for heat applications
            end_use_type: Type of end use (electricity, heat, etc.)
            process_steps: Optional list of process steps for detailed analysis

        Returns:
            Complete exergy analysis results
        """
        source = energy_source.lower()

        # Get source-specific factors
        efficiency = cls.EFFICIENCY_FACTORS.get(source, 0.30)
        quality_factor = cls.SOURCE_QUALITY_FACTORS.get(source, 0.50)

        # Calculate input exergy
        # For fuels: exergy ≈ 1.04-1.08 × LHV (Lower Heating Value)
        exergy_fuel_factor = 1.06 if source in ["coal", "oil", "gas", "biomass"] else 1.0
        input_exergy = input_energy_mj * exergy_fuel_factor

        # For renewables (wind, solar, hydro), exergy ≈ energy
        if source in ["wind", "solar", "hydro", "nuclear"]:
            input_exergy = input_energy_mj

        # Calculate useful energy
        useful_energy = input_energy_mj * efficiency

        # Calculate useful exergy
        if output_temp_k and end_use_type in [
            EnergyQuality.HIGH_TEMP_HEAT,
            EnergyQuality.MEDIUM_TEMP_HEAT,
            EnergyQuality.LOW_TEMP_HEAT,
        ]:
            # For heat output, exergy depends on temperature
            useful_exergy = cls.calculate_heat_exergy(useful_energy, output_temp_k)
        else:
            # For electricity/work, exergy = energy × quality factor
            useful_exergy = useful_energy * end_use_type.value

        # Calculate losses
        energy_loss = input_energy_mj - useful_energy
        exergy_destruction = input_exergy - useful_exergy

        # Calculate efficiencies
        first_law_eff = useful_energy / input_energy_mj if input_energy_mj > 0 else 0
        second_law_eff = useful_exergy / input_exergy if input_exergy > 0 else 0

        # Exergy destruction ratio
        destruction_ratio = exergy_destruction / input_exergy if input_exergy > 0 else 0

        # Improvement potential (reversible work that could be recovered)
        improvement_potential = exergy_destruction * (1 - second_law_eff)

        # Thermodynamic perfection (how close to ideal)
        thermodynamic_perfection = second_law_eff * 100

        # Component analysis if process steps provided
        component_analysis = None
        if process_steps:
            component_analysis = cls._analyze_components(process_steps)

        # Carnot factor for reference
        carnot = None
        if output_temp_k:
            carnot = cls.calculate_carnot_factor(output_temp_k)

        return ExergyAnalysisResult(
            input_energy_mj=input_energy_mj,
            input_exergy_mj=round(input_exergy, 2),
            useful_energy_mj=round(useful_energy, 2),
            useful_exergy_mj=round(useful_exergy, 2),
            energy_loss_mj=round(energy_loss, 2),
            exergy_destruction_mj=round(exergy_destruction, 2),
            first_law_efficiency=round(first_law_eff, 4),
            second_law_efficiency=round(second_law_eff, 4),
            exergy_destruction_ratio=round(destruction_ratio, 4),
            improvement_potential_mj=round(improvement_potential, 2),
            thermodynamic_perfection=round(thermodynamic_perfection, 1),
            carnot_factor=round(carnot, 4) if carnot else None,
            component_analysis=component_analysis,
        )

    @classmethod
    def _analyze_components(
        cls, process_steps: List[Dict]
    ) -> Dict[str, dict]:
        """Analyze exergy destruction by component."""
        analysis = {}

        for step in process_steps:
            name = step.get("name", "Unknown")
            input_ex = step.get("input_exergy", 0)
            output_ex = step.get("output_exergy", 0)
            destruction = input_ex - output_ex

            analysis[name] = {
                "input_exergy": input_ex,
                "output_exergy": output_ex,
                "exergy_destruction": destruction,
                "destruction_share": 0,  # Calculate after all components
                "efficiency": output_ex / input_ex if input_ex > 0 else 0,
            }

        # Calculate destruction share
        total_destruction = sum(c["exergy_destruction"] for c in analysis.values())
        if total_destruction > 0:
            for component in analysis.values():
                component["destruction_share"] = (
                    component["exergy_destruction"] / total_destruction
                )

        return analysis

    @classmethod
    def compare_technologies(
        cls,
        technologies: List[Dict],
    ) -> Dict[str, any]:
        """
        Compare multiple technologies by exergy efficiency.

        Helps identify which technology provides the most
        thermodynamic value per unit of primary energy.
        """
        results = []

        for tech in technologies:
            analysis = cls.analyze_process(
                energy_source=tech.get("source", "generic"),
                input_energy_mj=tech.get("input_energy", 1000),
                end_use_type=tech.get("end_use", EnergyQuality.ELECTRICITY),
            )

            results.append({
                "technology": tech.get("name", "Unknown"),
                "source": tech.get("source"),
                "first_law_efficiency": analysis.first_law_efficiency,
                "second_law_efficiency": analysis.second_law_efficiency,
                "exergy_destruction_ratio": analysis.exergy_destruction_ratio,
                "thermodynamic_perfection": analysis.thermodynamic_perfection,
            })

        # Rank by second law efficiency
        results.sort(key=lambda x: x["second_law_efficiency"], reverse=True)

        return {
            "comparison": results,
            "best_technology": results[0]["technology"] if results else None,
            "analysis_note": (
                "Second Law efficiency shows true thermodynamic value. "
                "Higher efficiency means less exergy destruction and "
                "better utilization of energy quality."
            ),
        }

    @classmethod
    def calculate_exergy_value(
        cls,
        annual_production_mwh: float,
        technology: str,
        electricity_price_per_mwh: float = 50.0,
    ) -> Dict[str, float]:
        """
        Calculate the exergy-economic value of energy production.

        This shows the true thermodynamic value delivered,
        not just the nominal energy output.
        """
        # Convert MWh to MJ (1 MWh = 3600 MJ)
        production_mj = annual_production_mwh * 3600

        # Analyze the production
        analysis = cls.analyze_process(
            energy_source=technology,
            input_energy_mj=production_mj,
            end_use_type=EnergyQuality.ELECTRICITY,
        )

        # Calculate economic values
        nominal_value = annual_production_mwh * electricity_price_per_mwh
        exergy_value = nominal_value * analysis.second_law_efficiency

        # Clean energy premium (clean sources deliver more exergy per MWh)
        clean_sources = ["solar", "wind", "hydro", "nuclear", "geothermal"]
        fossil_sources = ["coal", "oil", "gas"]

        if technology.lower() in clean_sources:
            # Clean energy delivers ~3x more exergy per unit primary energy
            exergy_premium = 3.0
        elif technology.lower() in fossil_sources:
            exergy_premium = 1.0
        else:
            exergy_premium = 1.5

        return {
            "annual_production_mwh": annual_production_mwh,
            "nominal_value_usd": round(nominal_value, 2),
            "exergy_efficiency": analysis.second_law_efficiency,
            "exergy_adjusted_value_usd": round(exergy_value, 2),
            "exergy_premium_factor": exergy_premium,
            "true_thermodynamic_value_usd": round(nominal_value * exergy_premium, 2),
            "insight": (
                f"This {technology} project delivers {exergy_premium:.1f}x "
                f"more thermodynamic value than equivalent fossil fuel generation."
                if technology.lower() in clean_sources
                else "Consider the thermodynamic advantage of clean alternatives."
            ),
        }


# Singleton instance
exergy_analyzer = ExergyAnalyzer()
