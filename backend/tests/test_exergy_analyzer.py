"""
Unit tests for Exergy Analysis Module.
"""

import pytest
import sys
import os

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


class TestEnergyQualityEnum:
    """Tests for EnergyQuality enum."""

    def test_energy_quality_values(self):
        """Test energy quality values are correct."""
        from app.tea.exergy_analysis import EnergyQuality

        assert EnergyQuality.ELECTRICITY.value == 1.0
        assert EnergyQuality.MECHANICAL_WORK.value == 1.0
        assert EnergyQuality.HIGH_TEMP_HEAT.value == 0.6
        assert EnergyQuality.MEDIUM_TEMP_HEAT.value == 0.4
        assert EnergyQuality.LOW_TEMP_HEAT.value == 0.2
        assert EnergyQuality.CHEMICAL.value == 0.9


class TestExergyAnalysisResult:
    """Tests for ExergyAnalysisResult dataclass."""

    def test_result_creation(self):
        """Test creating an ExergyAnalysisResult."""
        from app.tea.exergy_analysis import ExergyAnalysisResult

        result = ExergyAnalysisResult(
            input_energy_mj=1000,
            input_exergy_mj=1000,
            useful_energy_mj=300,
            useful_exergy_mj=285,
            energy_loss_mj=700,
            exergy_destruction_mj=715,
            first_law_efficiency=0.30,
            second_law_efficiency=0.285,
            exergy_destruction_ratio=0.715,
            improvement_potential_mj=500,
            thermodynamic_perfection=28.5,
        )

        assert result.input_energy_mj == 1000
        assert result.first_law_efficiency == 0.30
        assert result.second_law_efficiency == 0.285


class TestExergyAnalyzer:
    """Tests for ExergyAnalyzer."""

    def test_reference_conditions(self):
        """Test reference environment conditions."""
        from app.tea.exergy_analysis import ExergyAnalyzer

        assert ExergyAnalyzer.T0 == 298.15  # 25°C in Kelvin
        assert ExergyAnalyzer.P0 == 101.325  # Standard atmospheric pressure

    def test_carnot_factor_calculation(self):
        """Test Carnot efficiency factor calculation."""
        from app.tea.exergy_analysis import ExergyAnalyzer

        # High temperature (1000K) → high Carnot factor
        high_temp = ExergyAnalyzer.calculate_carnot_factor(1000)
        assert 0.6 < high_temp < 0.8  # η = 1 - 298.15/1000 ≈ 0.70

        # Low temperature (350K) → low Carnot factor
        low_temp = ExergyAnalyzer.calculate_carnot_factor(350)
        assert 0.1 < low_temp < 0.2  # η = 1 - 298.15/350 ≈ 0.15

    def test_carnot_factor_at_reference_temp(self):
        """Test Carnot factor is zero at reference temperature."""
        from app.tea.exergy_analysis import ExergyAnalyzer

        # At reference temperature, Carnot factor should be 0
        result = ExergyAnalyzer.calculate_carnot_factor(298.15)
        assert result == 0.0

    def test_carnot_factor_below_reference(self):
        """Test Carnot factor is zero below reference temperature."""
        from app.tea.exergy_analysis import ExergyAnalyzer

        result = ExergyAnalyzer.calculate_carnot_factor(200)  # Below T0
        assert result == 0.0

    def test_heat_exergy_calculation(self):
        """Test heat exergy calculation."""
        from app.tea.exergy_analysis import ExergyAnalyzer

        heat_mj = 1000
        temp_k = 500  # 227°C

        exergy = ExergyAnalyzer.calculate_heat_exergy(heat_mj, temp_k)

        # Exergy < Heat at finite temperature
        assert exergy < heat_mj
        assert exergy > 0

    def test_heat_exergy_zero_at_ambient(self):
        """Test heat exergy is zero at ambient temperature."""
        from app.tea.exergy_analysis import ExergyAnalyzer

        exergy = ExergyAnalyzer.calculate_heat_exergy(1000, 298.15)
        assert exergy == 0.0

    def test_analyze_coal_process(self):
        """Test analysis of coal power generation."""
        from app.tea.exergy_analysis import ExergyAnalyzer, EnergyQuality

        result = ExergyAnalyzer.analyze_process(
            energy_source="coal",
            input_energy_mj=1000,
            end_use_type=EnergyQuality.ELECTRICITY,
        )

        # Coal has low first and second law efficiency
        assert result.first_law_efficiency < 0.5
        assert result.second_law_efficiency < 0.5
        assert result.exergy_destruction_mj > 500

    def test_analyze_solar_process(self):
        """Test analysis of solar power generation."""
        from app.tea.exergy_analysis import ExergyAnalyzer, EnergyQuality

        result = ExergyAnalyzer.analyze_process(
            energy_source="solar",
            input_energy_mj=1000,
            end_use_type=EnergyQuality.ELECTRICITY,
        )

        # Solar has high efficiency (direct conversion)
        assert result.first_law_efficiency > 0.8
        assert result.second_law_efficiency > 0.7
        assert result.exergy_destruction_mj < 300

    def test_analyze_wind_process(self):
        """Test analysis of wind power generation."""
        from app.tea.exergy_analysis import ExergyAnalyzer, EnergyQuality

        result = ExergyAnalyzer.analyze_process(
            energy_source="wind",
            input_energy_mj=1000,
            end_use_type=EnergyQuality.ELECTRICITY,
        )

        # Wind also has high efficiency
        assert result.first_law_efficiency > 0.8
        assert result.second_law_efficiency > 0.7

    def test_analyze_heat_application(self):
        """Test analysis for heat application."""
        from app.tea.exergy_analysis import ExergyAnalyzer, EnergyQuality

        result = ExergyAnalyzer.analyze_process(
            energy_source="gas",
            input_energy_mj=1000,
            output_temp_k=400,  # Low-grade heat
            end_use_type=EnergyQuality.LOW_TEMP_HEAT,
        )

        # Low-grade heat has lower exergy
        assert result.carnot_factor is not None
        assert result.carnot_factor < 0.5

    def test_improvement_potential(self):
        """Test improvement potential calculation."""
        from app.tea.exergy_analysis import ExergyAnalyzer, EnergyQuality

        result = ExergyAnalyzer.analyze_process(
            energy_source="coal",
            input_energy_mj=1000,
            end_use_type=EnergyQuality.ELECTRICITY,
        )

        # Improvement potential should be positive for inefficient process
        assert result.improvement_potential_mj > 0

    def test_thermodynamic_perfection(self):
        """Test thermodynamic perfection score."""
        from app.tea.exergy_analysis import ExergyAnalyzer, EnergyQuality

        # Clean energy should have higher perfection
        solar = ExergyAnalyzer.analyze_process(
            energy_source="solar",
            input_energy_mj=1000,
        )

        coal = ExergyAnalyzer.analyze_process(
            energy_source="coal",
            input_energy_mj=1000,
        )

        assert solar.thermodynamic_perfection > coal.thermodynamic_perfection

    def test_source_quality_factors(self):
        """Test source quality factors are defined."""
        from app.tea.exergy_analysis import ExergyAnalyzer

        factors = ExergyAnalyzer.SOURCE_QUALITY_FACTORS

        assert "coal" in factors
        assert "solar" in factors
        assert "wind" in factors
        assert "gas" in factors
        assert "nuclear" in factors

        # Clean sources should have higher quality factors
        assert factors["solar"] > factors["coal"]
        assert factors["wind"] > factors["gas"]

    def test_efficiency_factors(self):
        """Test efficiency factors are defined."""
        from app.tea.exergy_analysis import ExergyAnalyzer

        factors = ExergyAnalyzer.EFFICIENCY_FACTORS

        # All efficiencies should be between 0 and 1
        for source, eff in factors.items():
            assert 0 < eff < 1, f"{source} efficiency {eff} out of range"

    def test_compare_technologies(self):
        """Test technology comparison."""
        from app.tea.exergy_analysis import ExergyAnalyzer, EnergyQuality

        technologies = [
            {"name": "Solar PV", "source": "solar"},
            {"name": "Coal Plant", "source": "coal"},
            {"name": "Wind Farm", "source": "wind"},
        ]

        result = ExergyAnalyzer.compare_technologies(technologies)

        assert "comparison" in result
        assert "best_technology" in result
        assert len(result["comparison"]) == 3

        # Solar or wind should be best
        assert result["best_technology"] in ["Solar PV", "Wind Farm"]

    def test_compare_technologies_ranking(self):
        """Test technology comparison is properly ranked."""
        from app.tea.exergy_analysis import ExergyAnalyzer

        technologies = [
            {"name": "A", "source": "coal"},
            {"name": "B", "source": "solar"},
            {"name": "C", "source": "gas"},
        ]

        result = ExergyAnalyzer.compare_technologies(technologies)

        # Results should be sorted by second law efficiency (descending)
        efficiencies = [t["second_law_efficiency"] for t in result["comparison"]]
        assert efficiencies == sorted(efficiencies, reverse=True)

    def test_calculate_exergy_value(self):
        """Test exergy-economic value calculation."""
        from app.tea.exergy_analysis import ExergyAnalyzer

        result = ExergyAnalyzer.calculate_exergy_value(
            annual_production_mwh=100000,
            technology="solar",
            electricity_price_per_mwh=50,
        )

        assert "annual_production_mwh" in result
        assert "nominal_value_usd" in result
        assert "exergy_efficiency" in result
        assert "exergy_premium_factor" in result
        assert "true_thermodynamic_value_usd" in result

        # Nominal value: 100,000 MWh × $50 = $5,000,000
        assert result["nominal_value_usd"] == 5_000_000

    def test_exergy_premium_clean_vs_fossil(self):
        """Test exergy premium is higher for clean energy."""
        from app.tea.exergy_analysis import ExergyAnalyzer

        solar = ExergyAnalyzer.calculate_exergy_value(
            annual_production_mwh=100000,
            technology="solar",
        )

        coal = ExergyAnalyzer.calculate_exergy_value(
            annual_production_mwh=100000,
            technology="coal",
        )

        # Solar should have higher exergy premium
        assert solar["exergy_premium_factor"] > coal["exergy_premium_factor"]
        assert solar["true_thermodynamic_value_usd"] > coal["true_thermodynamic_value_usd"]

    def test_component_analysis(self):
        """Test component-level exergy analysis."""
        from app.tea.exergy_analysis import ExergyAnalyzer

        process_steps = [
            {"name": "Combustion", "input_exergy": 1000, "output_exergy": 600},
            {"name": "Steam Generation", "input_exergy": 600, "output_exergy": 450},
            {"name": "Turbine", "input_exergy": 450, "output_exergy": 350},
            {"name": "Generator", "input_exergy": 350, "output_exergy": 320},
        ]

        result = ExergyAnalyzer.analyze_process(
            energy_source="coal",
            input_energy_mj=1000,
            process_steps=process_steps,
        )

        assert result.component_analysis is not None
        assert "Combustion" in result.component_analysis
        assert "Turbine" in result.component_analysis

        # Check destruction shares sum to 1
        total_share = sum(
            c["destruction_share"] for c in result.component_analysis.values()
        )
        assert abs(total_share - 1.0) < 0.01

    def test_all_energy_sources(self):
        """Test analysis works for all defined energy sources."""
        from app.tea.exergy_analysis import ExergyAnalyzer

        sources = list(ExergyAnalyzer.EFFICIENCY_FACTORS.keys())

        for source in sources:
            result = ExergyAnalyzer.analyze_process(
                energy_source=source,
                input_energy_mj=1000,
            )

            assert result.input_energy_mj == 1000
            assert result.first_law_efficiency > 0
            assert result.second_law_efficiency > 0
            assert result.exergy_destruction_mj >= 0

    def test_unknown_source_uses_defaults(self):
        """Test unknown energy source uses default values."""
        from app.tea.exergy_analysis import ExergyAnalyzer

        result = ExergyAnalyzer.analyze_process(
            energy_source="unknown_source",
            input_energy_mj=1000,
        )

        # Should use default efficiency (0.30) and quality factor (0.50)
        assert result.first_law_efficiency == 0.30
        assert result.input_energy_mj == 1000
