"""
Unit tests for TEA (Techno-Economic Analysis) Calculator.
"""

import pytest
import sys
import os

# Add backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


class TestTEADefaults:
    """Tests for TEADefaults dataclass."""

    def test_defaults_values(self):
        """Test default values are set correctly."""
        from app.tea.calculator import TEADefaults

        defaults = TEADefaults()

        assert defaults.installation_factor == 1.2
        assert defaults.insurance_rate == 0.01
        assert defaults.project_lifetime_years == 25
        assert defaults.discount_rate == 0.08
        assert defaults.debt_ratio == 0.6
        assert defaults.tax_rate == 0.21


class TestTEACalculator:
    """Tests for TEACalculator."""

    def test_basic_calculation(self):
        """Test basic TEA calculation."""
        from app.tea.calculator import TEACalculator

        inputs = {
            "project_name": "Test Solar Project",
            "technology_type": "solar",
            "capacity_mw": 100,
            "capex_per_kw": 1000,
            "opex_per_kw_year": 20,
            "capacity_factor": 0.25,
        }

        calc = TEACalculator(inputs)
        result = calc.calculate()

        assert "lcoe" in result
        assert "npv" in result
        assert "irr" in result
        assert "payback_years" in result
        assert result["lcoe"] > 0
        assert result["annual_production_mwh"] > 0

    def test_invalid_capacity(self):
        """Test that invalid capacity raises error."""
        from app.tea.calculator import TEACalculator

        inputs = {
            "capacity_mw": -100,
            "capex_per_kw": 1000,
        }

        with pytest.raises(ValueError, match="Capacity must be greater than 0"):
            TEACalculator(inputs)

    def test_invalid_capex(self):
        """Test that invalid CAPEX raises error."""
        from app.tea.calculator import TEACalculator

        inputs = {
            "capacity_mw": 100,
            "capex_per_kw": -1000,
        }

        with pytest.raises(ValueError, match="CAPEX must be greater than 0"):
            TEACalculator(inputs)

    def test_invalid_capacity_factor(self):
        """Test that invalid capacity factor raises error."""
        from app.tea.calculator import TEACalculator

        inputs = {
            "capacity_mw": 100,
            "capex_per_kw": 1000,
            "capacity_factor": 1.5,  # Invalid: > 1
        }

        with pytest.raises(ValueError, match="Capacity factor must be between 0 and 1"):
            TEACalculator(inputs)

    def test_invalid_discount_rate(self):
        """Test that invalid discount rate raises error."""
        from app.tea.calculator import TEACalculator

        inputs = {
            "capacity_mw": 100,
            "capex_per_kw": 1000,
            "discount_rate": 1.5,  # Invalid: > 1
        }

        with pytest.raises(ValueError, match="Discount rate must be between 0 and 1"):
            TEACalculator(inputs)

    def test_annual_production_calculation(self):
        """Test annual production calculation."""
        from app.tea.calculator import TEACalculator

        inputs = {
            "capacity_mw": 100,
            "capex_per_kw": 1000,
            "capacity_factor": 0.25,
        }

        calc = TEACalculator(inputs)
        result = calc.calculate()

        # Expected: 8760 hours * 0.25 * 100 MW = 219,000 MWh
        expected_production = 8760 * 0.25 * 100
        assert result["annual_production_mwh"] == expected_production

    def test_custom_annual_production(self):
        """Test using custom annual production instead of capacity factor."""
        from app.tea.calculator import TEACalculator

        custom_production = 300000  # MWh

        inputs = {
            "capacity_mw": 100,
            "capex_per_kw": 1000,
            "annual_production_mwh": custom_production,
        }

        calc = TEACalculator(inputs)
        result = calc.calculate()

        assert result["annual_production_mwh"] == custom_production

    def test_capex_breakdown(self):
        """Test CAPEX breakdown calculation."""
        from app.tea.calculator import TEACalculator

        inputs = {
            "capacity_mw": 100,
            "capex_per_kw": 1000,
            "installation_factor": 1.2,
            "land_cost": 500000,
            "grid_connection_cost": 1000000,
        }

        calc = TEACalculator(inputs)
        result = calc.calculate()

        assert "capex_breakdown" in result
        assert "equipment" in result["capex_breakdown"]
        assert "installation" in result["capex_breakdown"]
        assert "land" in result["capex_breakdown"]
        assert "grid_connection" in result["capex_breakdown"]

        # Equipment: 100 MW * 1000 kW/MW * $1000/kW = $100M
        assert result["capex_breakdown"]["equipment"] == 100_000_000

    def test_opex_breakdown(self):
        """Test OPEX breakdown calculation."""
        from app.tea.calculator import TEACalculator

        inputs = {
            "capacity_mw": 100,
            "capex_per_kw": 1000,
            "opex_per_kw_year": 20,
            "fixed_opex_annual": 100000,
            "variable_opex_per_mwh": 5,
        }

        calc = TEACalculator(inputs)
        result = calc.calculate()

        assert "opex_breakdown" in result
        assert "capacity_based" in result["opex_breakdown"]
        assert "fixed" in result["opex_breakdown"]
        assert "variable" in result["opex_breakdown"]
        assert "insurance" in result["opex_breakdown"]

    def test_cash_flows_structure(self):
        """Test cash flows array structure."""
        from app.tea.calculator import TEACalculator

        inputs = {
            "capacity_mw": 100,
            "capex_per_kw": 1000,
            "project_lifetime_years": 25,
        }

        calc = TEACalculator(inputs)
        result = calc.calculate()

        assert "cash_flows" in result
        # Year 0 (CAPEX) + 25 years of operation = 26 entries
        assert len(result["cash_flows"]) == 26
        # First cash flow (CAPEX) should be negative
        assert result["cash_flows"][0] < 0

    def test_npv_calculation(self):
        """Test NPV is calculated correctly."""
        from app.tea.calculator import TEACalculator

        inputs = {
            "capacity_mw": 100,
            "capex_per_kw": 1000,
            "electricity_price_per_mwh": 100,  # High price for positive NPV
            "capacity_factor": 0.40,
        }

        calc = TEACalculator(inputs)
        result = calc.calculate()

        # With high electricity price and good capacity factor, NPV should be positive
        assert result["npv"] > 0

    def test_lcoe_lower_with_higher_capacity_factor(self):
        """Test that LCOE decreases with higher capacity factor."""
        from app.tea.calculator import TEACalculator

        base_inputs = {
            "capacity_mw": 100,
            "capex_per_kw": 1000,
        }

        # Low capacity factor
        low_cf = TEACalculator({**base_inputs, "capacity_factor": 0.15}).calculate()

        # High capacity factor
        high_cf = TEACalculator({**base_inputs, "capacity_factor": 0.35}).calculate()

        # Higher capacity factor = more production = lower LCOE
        assert high_cf["lcoe"] < low_cf["lcoe"]

    def test_sensitivity_analysis(self):
        """Test sensitivity analysis."""
        from app.tea.calculator import TEACalculator

        inputs = {
            "capacity_mw": 100,
            "capex_per_kw": 1000,
        }

        calc = TEACalculator(inputs)
        result = calc.sensitivity_analysis(
            parameter="capex_per_kw",
            variations=[-20, -10, 0, 10, 20],
        )

        assert "variations" in result
        assert "lcoe" in result
        assert "npv" in result
        assert len(result["lcoe"]) == 5
        assert len(result["npv"]) == 5

    def test_sensitivity_lcoe_increases_with_capex(self):
        """Test that LCOE increases when CAPEX increases."""
        from app.tea.calculator import TEACalculator

        inputs = {
            "capacity_mw": 100,
            "capex_per_kw": 1000,
        }

        calc = TEACalculator(inputs)
        result = calc.sensitivity_analysis(
            parameter="capex_per_kw",
            variations=[-20, 0, 20],
        )

        # LCOE should increase as CAPEX increases
        assert result["lcoe"][0] < result["lcoe"][1] < result["lcoe"][2]

    def test_wind_project(self):
        """Test calculation for wind project."""
        from app.tea.calculator import TEACalculator

        inputs = {
            "project_name": "Offshore Wind Farm",
            "technology_type": "wind",
            "capacity_mw": 500,
            "capex_per_kw": 3000,
            "opex_per_kw_year": 50,
            "capacity_factor": 0.45,
            "project_lifetime_years": 30,
        }

        calc = TEACalculator(inputs)
        result = calc.calculate()

        assert result["lcoe"] > 0
        assert result["lifetime_production_mwh"] > result["annual_production_mwh"]

    def test_battery_storage_project(self):
        """Test calculation for battery storage project."""
        from app.tea.calculator import TEACalculator

        inputs = {
            "project_name": "Grid Battery Storage",
            "technology_type": "battery",
            "capacity_mw": 50,
            "capex_per_kw": 500,
            "opex_per_kw_year": 10,
            "capacity_factor": 0.10,  # Low for batteries (cycling)
            "project_lifetime_years": 15,
        }

        calc = TEACalculator(inputs)
        result = calc.calculate()

        assert result["lcoe"] > 0
        assert result["total_capex"] > 0

    def test_carbon_credits(self):
        """Test carbon credits impact on revenue."""
        from app.tea.calculator import TEACalculator

        base_inputs = {
            "capacity_mw": 100,
            "capex_per_kw": 1000,
            "electricity_price_per_mwh": 50,
        }

        # Without carbon credits
        no_carbon = TEACalculator(base_inputs).calculate()

        # With carbon credits
        with_carbon = TEACalculator({
            **base_inputs,
            "carbon_credit_per_ton": 50,
            "carbon_intensity_avoided": 0.5,  # tons CO2/MWh avoided
        }).calculate()

        # NPV should be higher with carbon credits
        assert with_carbon["npv"] > no_carbon["npv"]

    def test_irr_calculation(self):
        """Test IRR is within reasonable range."""
        from app.tea.calculator import TEACalculator

        inputs = {
            "capacity_mw": 100,
            "capex_per_kw": 1000,
            "electricity_price_per_mwh": 60,
            "capacity_factor": 0.30,
        }

        calc = TEACalculator(inputs)
        result = calc.calculate()

        # IRR should be between -100% and 100% for typical projects
        assert -100 <= result["irr"] <= 100

    def test_payback_period(self):
        """Test payback period calculation."""
        from app.tea.calculator import TEACalculator

        inputs = {
            "capacity_mw": 100,
            "capex_per_kw": 1000,
            "electricity_price_per_mwh": 80,  # Good price
            "capacity_factor": 0.35,
        }

        calc = TEACalculator(inputs)
        result = calc.calculate()

        # Payback should be within project lifetime
        assert result["payback_years"] <= inputs.get("project_lifetime_years", 25)
