"""
TEA (Techno-Economic Analysis) Calculator

Core calculation engine for:
- LCOE (Levelized Cost of Energy)
- NPV (Net Present Value)
- IRR (Internal Rate of Return)
- Cash flow analysis
- Sensitivity analysis
"""

import numpy as np
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field


@dataclass
class TEADefaults:
    """Default values for TEA calculations."""

    installation_factor: float = 1.2
    insurance_rate: float = 0.01
    project_lifetime_years: int = 25
    discount_rate: float = 0.08
    debt_ratio: float = 0.6
    interest_rate: float = 0.05
    tax_rate: float = 0.21
    depreciation_years: int = 20
    electricity_price_per_mwh: float = 50.0
    price_escalation_rate: float = 0.02
    carbon_credit_per_ton: float = 0.0
    carbon_intensity_avoided: float = 0.0


class TEACalculator:
    """
    Comprehensive TEA calculator for clean energy projects.

    Supports:
    - Solar PV
    - Wind (onshore/offshore)
    - Battery storage
    - Green hydrogen
    - And more...
    """

    def __init__(self, inputs: Dict[str, Any]):
        """Initialize calculator with project inputs."""
        self.defaults = TEADefaults()
        self.inputs = self._merge_with_defaults(inputs)
        self._validate_inputs()

    def _merge_with_defaults(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Merge provided inputs with default values."""
        merged = {}

        # Required fields
        merged["project_name"] = inputs.get("project_name", "Unnamed Project")
        merged["technology_type"] = inputs.get("technology_type", "generic")
        merged["capacity_mw"] = inputs["capacity_mw"]
        merged["capex_per_kw"] = inputs["capex_per_kw"]
        merged["opex_per_kw_year"] = inputs.get("opex_per_kw_year", 0)

        # Optional fields with defaults
        merged["capacity_factor"] = inputs.get("capacity_factor", 0.25)
        merged["annual_production_mwh"] = inputs.get("annual_production_mwh")
        merged["installation_factor"] = inputs.get(
            "installation_factor", self.defaults.installation_factor
        )
        merged["land_cost"] = inputs.get("land_cost", 0)
        merged["grid_connection_cost"] = inputs.get("grid_connection_cost", 0)
        merged["fixed_opex_annual"] = inputs.get("fixed_opex_annual", 0)
        merged["variable_opex_per_mwh"] = inputs.get("variable_opex_per_mwh", 0)
        merged["insurance_rate"] = inputs.get("insurance_rate", self.defaults.insurance_rate)
        merged["project_lifetime_years"] = inputs.get(
            "project_lifetime_years", self.defaults.project_lifetime_years
        )
        merged["discount_rate"] = inputs.get("discount_rate", self.defaults.discount_rate)
        merged["debt_ratio"] = inputs.get("debt_ratio", self.defaults.debt_ratio)
        merged["interest_rate"] = inputs.get("interest_rate", self.defaults.interest_rate)
        merged["tax_rate"] = inputs.get("tax_rate", self.defaults.tax_rate)
        merged["depreciation_years"] = inputs.get(
            "depreciation_years", self.defaults.depreciation_years
        )
        merged["electricity_price_per_mwh"] = inputs.get(
            "electricity_price_per_mwh", self.defaults.electricity_price_per_mwh
        )
        merged["price_escalation_rate"] = inputs.get(
            "price_escalation_rate", self.defaults.price_escalation_rate
        )
        merged["carbon_credit_per_ton"] = inputs.get(
            "carbon_credit_per_ton", self.defaults.carbon_credit_per_ton
        )
        merged["carbon_intensity_avoided"] = inputs.get(
            "carbon_intensity_avoided", self.defaults.carbon_intensity_avoided
        )

        return merged

    def _validate_inputs(self) -> None:
        """Validate input parameters."""
        if self.inputs["capacity_mw"] <= 0:
            raise ValueError("Capacity must be greater than 0")
        if self.inputs["capex_per_kw"] <= 0:
            raise ValueError("CAPEX must be greater than 0")
        if not 0 < self.inputs["capacity_factor"] <= 1:
            raise ValueError("Capacity factor must be between 0 and 1")
        if self.inputs["discount_rate"] < 0 or self.inputs["discount_rate"] > 1:
            raise ValueError("Discount rate must be between 0 and 1")

    def calculate(self) -> Dict[str, Any]:
        """
        Run full TEA calculation.

        Returns comprehensive financial metrics and breakdowns.
        """
        # Calculate production
        annual_production = self._calculate_annual_production()
        lifetime_production = annual_production * self.inputs["project_lifetime_years"]

        # Calculate costs
        capex_breakdown = self._calculate_capex()
        total_capex = sum(capex_breakdown.values())

        opex_breakdown = self._calculate_annual_opex(annual_production)
        annual_opex = sum(opex_breakdown.values())

        # Calculate cash flows
        cash_flows = self._calculate_cash_flows(
            total_capex, annual_opex, annual_production
        )

        # Calculate metrics
        lcoe = self._calculate_lcoe(
            total_capex, annual_opex, annual_production
        )
        npv = self._calculate_npv(cash_flows)
        irr = self._calculate_irr(cash_flows)
        payback = self._calculate_payback(cash_flows)

        # Annual revenue
        annual_revenue = self._calculate_annual_revenue(annual_production, year=1)
        lifetime_revenue_npv = self._calculate_lifetime_revenue_npv(annual_production)

        # Total lifetime cost (discounted)
        total_lifetime_cost = self._calculate_total_lifetime_cost(
            total_capex, annual_opex
        )

        return {
            "lcoe": round(lcoe, 2),
            "npv": round(npv, 0),
            "irr": round(irr * 100, 2),  # Convert to percentage
            "payback_years": round(payback, 1),
            "total_capex": round(total_capex, 0),
            "annual_opex": round(annual_opex, 0),
            "total_lifetime_cost": round(total_lifetime_cost, 0),
            "annual_production_mwh": round(annual_production, 0),
            "lifetime_production_mwh": round(lifetime_production, 0),
            "annual_revenue": round(annual_revenue, 0),
            "lifetime_revenue_npv": round(lifetime_revenue_npv, 0),
            "capex_breakdown": {k: round(v, 0) for k, v in capex_breakdown.items()},
            "opex_breakdown": {k: round(v, 0) for k, v in opex_breakdown.items()},
            "cash_flows": [round(cf, 0) for cf in cash_flows],
        }

    def _calculate_annual_production(self) -> float:
        """Calculate annual energy production in MWh."""
        if self.inputs["annual_production_mwh"]:
            return self.inputs["annual_production_mwh"]

        # Hours per year * capacity factor * capacity
        hours_per_year = 8760
        return (
            hours_per_year
            * self.inputs["capacity_factor"]
            * self.inputs["capacity_mw"]
        )

    def _calculate_capex(self) -> Dict[str, float]:
        """Calculate capital expenditure breakdown."""
        capacity_kw = self.inputs["capacity_mw"] * 1000

        equipment_cost = capacity_kw * self.inputs["capex_per_kw"]
        installation_cost = equipment_cost * (self.inputs["installation_factor"] - 1)

        return {
            "equipment": equipment_cost,
            "installation": installation_cost,
            "land": self.inputs["land_cost"],
            "grid_connection": self.inputs["grid_connection_cost"],
        }

    def _calculate_annual_opex(self, annual_production: float) -> Dict[str, float]:
        """Calculate annual operating expenditure breakdown."""
        capacity_kw = self.inputs["capacity_mw"] * 1000
        total_capex = sum(self._calculate_capex().values())

        capacity_based_opex = capacity_kw * self.inputs["opex_per_kw_year"]
        variable_opex = annual_production * self.inputs["variable_opex_per_mwh"]
        insurance = total_capex * self.inputs["insurance_rate"]

        return {
            "capacity_based": capacity_based_opex,
            "fixed": self.inputs["fixed_opex_annual"],
            "variable": variable_opex,
            "insurance": insurance,
        }

    def _calculate_annual_revenue(
        self, annual_production: float, year: int
    ) -> float:
        """Calculate annual revenue for a given year."""
        # Electricity sales with price escalation
        price = self.inputs["electricity_price_per_mwh"] * (
            1 + self.inputs["price_escalation_rate"]
        ) ** (year - 1)
        electricity_revenue = annual_production * price

        # Carbon credits
        carbon_revenue = (
            annual_production
            * self.inputs["carbon_intensity_avoided"]
            * self.inputs["carbon_credit_per_ton"]
        )

        return electricity_revenue + carbon_revenue

    def _calculate_cash_flows(
        self,
        total_capex: float,
        annual_opex: float,
        annual_production: float,
    ) -> List[float]:
        """Calculate yearly cash flows."""
        cash_flows = [-total_capex]  # Year 0: Initial investment

        for year in range(1, self.inputs["project_lifetime_years"] + 1):
            revenue = self._calculate_annual_revenue(annual_production, year)
            # Simple OPEX escalation at 2% per year
            opex = annual_opex * (1.02 ** (year - 1))
            net_cash_flow = revenue - opex
            cash_flows.append(net_cash_flow)

        return cash_flows

    def _calculate_lcoe(
        self,
        total_capex: float,
        annual_opex: float,
        annual_production: float,
    ) -> float:
        """
        Calculate Levelized Cost of Energy.

        LCOE = (Total discounted costs) / (Total discounted production)
        """
        r = self.inputs["discount_rate"]
        n = self.inputs["project_lifetime_years"]

        # Discounted costs
        discounted_capex = total_capex
        discounted_opex = sum(
            annual_opex * (1.02 ** (t - 1)) / (1 + r) ** t for t in range(1, n + 1)
        )
        total_discounted_cost = discounted_capex + discounted_opex

        # Discounted production
        discounted_production = sum(
            annual_production / (1 + r) ** t for t in range(1, n + 1)
        )

        if discounted_production == 0:
            return float("inf")

        return total_discounted_cost / discounted_production

    def _calculate_npv(self, cash_flows: List[float]) -> float:
        """Calculate Net Present Value."""
        r = self.inputs["discount_rate"]
        return sum(cf / (1 + r) ** t for t, cf in enumerate(cash_flows))

    def _calculate_irr(
        self, cash_flows: List[float], max_iterations: int = 1000
    ) -> float:
        """
        Calculate Internal Rate of Return using Newton-Raphson method.
        """
        # Use numpy's IRR calculation
        try:
            irr = np.irr(cash_flows)
            if np.isnan(irr) or np.isinf(irr):
                return 0.0
            return irr
        except Exception:
            # Fallback: Newton-Raphson
            rate = 0.1
            for _ in range(max_iterations):
                npv = sum(cf / (1 + rate) ** t for t, cf in enumerate(cash_flows))
                npv_derivative = sum(
                    -t * cf / (1 + rate) ** (t + 1) for t, cf in enumerate(cash_flows)
                )
                if abs(npv_derivative) < 1e-10:
                    break
                rate = rate - npv / npv_derivative
                if abs(npv) < 1e-6:
                    break
            return rate

    def _calculate_payback(self, cash_flows: List[float]) -> float:
        """Calculate simple payback period."""
        cumulative = 0
        for year, cf in enumerate(cash_flows):
            cumulative += cf
            if cumulative >= 0:
                # Interpolate for fractional year
                if year > 0 and cf > 0:
                    excess = cumulative
                    fraction = (cf - excess) / cf
                    return year - 1 + fraction
                return float(year)
        return float(len(cash_flows))  # Never pays back

    def _calculate_lifetime_revenue_npv(self, annual_production: float) -> float:
        """Calculate NPV of lifetime revenue."""
        r = self.inputs["discount_rate"]
        n = self.inputs["project_lifetime_years"]

        return sum(
            self._calculate_annual_revenue(annual_production, t) / (1 + r) ** t
            for t in range(1, n + 1)
        )

    def _calculate_total_lifetime_cost(
        self, total_capex: float, annual_opex: float
    ) -> float:
        """Calculate total discounted lifetime cost."""
        r = self.inputs["discount_rate"]
        n = self.inputs["project_lifetime_years"]

        discounted_opex = sum(
            annual_opex * (1.02 ** (t - 1)) / (1 + r) ** t for t in range(1, n + 1)
        )

        return total_capex + discounted_opex

    def sensitivity_analysis(
        self,
        parameter: str,
        variations: List[float],
    ) -> Dict[str, List[float]]:
        """
        Run sensitivity analysis on a specific parameter.

        Args:
            parameter: Name of parameter to vary
            variations: List of percentage variations (e.g., [-20, -10, 0, 10, 20])

        Returns:
            Dict with LCOE and NPV results for each variation
        """
        base_value = self.inputs[parameter]
        results = {
            "variations": variations,
            "lcoe": [],
            "npv": [],
        }

        for pct in variations:
            # Create modified inputs
            modified_inputs = self.inputs.copy()
            modified_inputs[parameter] = base_value * (1 + pct / 100)

            # Calculate with modified inputs
            calc = TEACalculator(modified_inputs)
            result = calc.calculate()

            results["lcoe"].append(result["lcoe"])
            results["npv"].append(result["npv"])

        return results
