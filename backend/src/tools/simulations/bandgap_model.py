"""
Analytical Bandgap Calculator for Perovskite Solar Cells

Uses empirical models and DFT-derived parameters to estimate bandgaps
without requiring expensive quantum chemistry calculations.

For MVP: Focus on lead halide perovskites (ABX3 structure).
Future: Integrate with PySCF for ab initio calculations.
"""

import logging
import re
from typing import Dict, Tuple, Optional, List
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class PerovskiteComposition(BaseModel):
    """Perovskite composition in ABX3 format."""
    formula: str = Field(description="Chemical formula (e.g., MAPbI3, FA0.8Cs0.2PbI3)")
    A_cations: List[Tuple[str, float]] = Field(description="A-site cations and fractions")
    B_cation: str = Field(description="B-site cation (e.g., Pb, Sn)")
    X_anions: List[Tuple[str, float]] = Field(description="X-site anions and fractions")


class BandgapResult(BaseModel):
    """Calculated bandgap with metadata."""
    bandgap_eV: float = Field(description="Bandgap in electron volts")
    composition: str = Field(description="Chemical formula")
    method: str = Field(description="Calculation method used")
    uncertainty_eV: Optional[float] = Field(default=None, description="Estimated uncertainty")
    references: List[str] = Field(default_factory=list, description="Literature sources")
    temperature_K: float = Field(default=300.0, description="Temperature in Kelvin")


class BandgapCalculator:
    """
    Empirical bandgap calculator for perovskite compositions.

    Based on experimental data and DFT trends from literature.
    Supports mixed-cation and mixed-halide compositions (Vegard's law).
    """

    # Reference bandgaps (eV) for common perovskites at 300K
    # Source: https://pubs.acs.org/doi/10.1021/acs.jpclett.8b00201
    REFERENCE_BANDGAPS = {
        "MAPbI3": 1.55,      # Methylammonium lead iodide
        "MAPbBr3": 2.28,     # Methylammonium lead bromide
        "MAPbCl3": 3.02,     # Methylammonium lead chloride
        "FAPbI3": 1.48,      # Formamidinium lead iodide
        "FAPbBr3": 2.23,     # Formamidinium lead bromide
        "FAPbCl3": 3.01,     # Formamidinium lead chloride
        "CsPbI3": 1.73,      # Cesium lead iodide
        "CsPbBr3": 2.36,     # Cesium lead bromide
        "CsPbCl3": 3.10,     # Cesium lead chloride
        "MASnI3": 1.30,      # Methylammonium tin iodide (Pb-free)
        "FASnI3": 1.41,      # Formamidinium tin iodide
        "CsSnI3": 1.27,      # Cesium tin iodide
    }

    # Bowing parameters for mixed halides (deviation from Vegard's law)
    # Source: https://doi.org/10.1039/C6TA03592F
    BOWING_PARAMETERS = {
        "I-Br": 0.15,  # MAPbI3-xBrx
        "Br-Cl": 0.10,  # MAPbBr3-xClx
        "I-Cl": 0.20,  # MAPbI3-xClx (rarely used)
    }

    def __init__(self):
        """Initialize bandgap calculator with reference data."""
        logger.info("Bandgap calculator initialized with empirical models")

    def calculate(
        self,
        composition: str,
        temperature: float = 300.0
    ) -> BandgapResult:
        """
        Calculate bandgap for a given perovskite composition.

        Args:
            composition: Chemical formula (e.g., "FA0.8Cs0.2PbI3", "MAPbI2.5Br0.5")
            temperature: Temperature in Kelvin (default 300K)

        Returns:
            BandgapResult with calculated bandgap and metadata

        Examples:
            >>> calc = BandgapCalculator()
            >>> result = calc.calculate("MAPbI3")
            >>> print(f"Bandgap: {result.bandgap_eV} eV")
        """
        try:
            # Parse composition string
            parsed = self._parse_composition(composition)

            # Calculate bandgap using appropriate method
            if self._is_pure_composition(parsed):
                # Direct lookup for pure compounds
                bandgap = self._lookup_pure_bandgap(parsed)
                method = "Experimental reference"
                uncertainty = 0.05  # Typical experimental uncertainty
            else:
                # Vegard's law with bowing for mixed compositions
                bandgap = self._calculate_mixed_bandgap(parsed)
                method = "Vegard's law with bowing correction"
                uncertainty = 0.10  # Higher uncertainty for interpolation

            # Apply temperature correction (bandgap decreases with temperature)
            if temperature != 300.0:
                bandgap = self._apply_temperature_correction(bandgap, temperature)
                method += f" (T-corrected to {temperature}K)"

            return BandgapResult(
                bandgap_eV=round(bandgap, 3),
                composition=composition,
                method=method,
                uncertainty_eV=round(uncertainty, 3),
                temperature_K=temperature,
                references=[
                    "J. Phys. Chem. Lett. 2018, 9, 939-946",
                    "J. Mater. Chem. A 2016, 4, 9010-9018"
                ]
            )

        except Exception as e:
            logger.error(f"Bandgap calculation failed for {composition}: {str(e)}")
            raise ValueError(f"Cannot calculate bandgap for {composition}: {str(e)}")

    def _parse_composition(self, formula: str) -> Dict:
        """
        Parse perovskite formula into components.

        Examples:
        - "MAPbI3" -> {A: ['MA'], B: 'Pb', X: ['I'], X_stoich: [3.0]}
        - "FA0.8Cs0.2PbI3" -> {A: ['FA', 'Cs'], A_frac: [0.8, 0.2], B: 'Pb', X: ['I'], X_stoich: [3.0]}
        - "MAPbI2.5Br0.5" -> {A: ['MA'], B: 'Pb', X: ['I', 'Br'], X_stoich: [2.5, 0.5]}
        """
        parsed = {
            "A": [],
            "A_frac": [],
            "B": None,
            "X": [],
            "X_stoich": []
        }

        # Detect A-site cations
        if "FA" in formula:
            parsed["A"].append("FA")
            match = re.search(r'FA([\d.]+)', formula)
            parsed["A_frac"].append(float(match.group(1)) if match else 1.0)

        if "MA" in formula and "FA" not in formula:  # Avoid matching MA in FMA
            parsed["A"].append("MA")
            match = re.search(r'MA([\d.]+)', formula)
            parsed["A_frac"].append(float(match.group(1)) if match else 1.0)

        if "Cs" in formula:
            parsed["A"].append("Cs")
            match = re.search(r'Cs([\d.]+)', formula)
            if match:
                parsed["A_frac"].append(float(match.group(1)))
            elif len(parsed["A"]) > 1:
                # Infer remaining fraction
                parsed["A_frac"].append(1.0 - sum(parsed["A_frac"]))
            else:
                parsed["A_frac"].append(1.0)

        # Detect B-site cation
        if "Pb" in formula:
            parsed["B"] = "Pb"
        elif "Sn" in formula:
            parsed["B"] = "Sn"

        # Detect X-site anions with stoichiometry
        for halide in ["I", "Br", "Cl"]:
            match = re.search(f'{halide}([\\d.]+)', formula)
            if match:
                parsed["X"].append(halide)
                parsed["X_stoich"].append(float(match.group(1)))
            elif halide in formula and not match:
                # Halide present but no number (assume 3)
                parsed["X"].append(halide)
                parsed["X_stoich"].append(3.0)

        # Validate parsing
        if not parsed["A"]:
            raise ValueError(f"Could not parse A-site cation from {formula}")
        if not parsed["B"]:
            raise ValueError(f"Could not parse B-site cation from {formula}")
        if not parsed["X"]:
            raise ValueError(f"Could not parse X-site anion from {formula}")

        return parsed

    def _is_pure_composition(self, parsed: Dict) -> bool:
        """Check if composition is a pure compound (not mixed)."""
        total_stoich = sum(parsed["X_stoich"])
        return (
            len(parsed["A"]) == 1 and
            len(parsed["X"]) == 1 and
            abs(total_stoich - 3.0) < 0.01
        )

    def _lookup_pure_bandgap(self, parsed: Dict) -> float:
        """Lookup bandgap for pure perovskite composition."""
        A = parsed["A"][0]
        B = parsed["B"]
        X = parsed["X"][0]

        formula = f"{A}{B}{X}3"

        if formula in self.REFERENCE_BANDGAPS:
            return self.REFERENCE_BANDGAPS[formula]
        else:
            raise ValueError(f"No reference bandgap data for {formula}")

    def _calculate_mixed_bandgap(self, parsed: Dict) -> float:
        """
        Calculate bandgap for mixed compositions using Vegard's law.

        Vegard's law: Eg(A_xB_{1-x}) = x*Eg(A) + (1-x)*Eg(B) - x*(1-x)*b
        where b is the bowing parameter accounting for non-linear effects.
        """
        # For simplicity, handle mixed halides first (most common)
        if len(parsed["X"]) == 2 and len(parsed["A"]) == 1:
            return self._calculate_mixed_halide_bandgap(parsed)

        # Mixed A-site cations
        elif len(parsed["A"]) == 2 and len(parsed["X"]) == 1:
            return self._calculate_mixed_cation_bandgap(parsed)

        # Both mixed (complex, approximate)
        else:
            logger.warning("Complex mixed composition, using approximate linear interpolation")
            return self._calculate_approximate_bandgap(parsed)

    def _calculate_mixed_halide_bandgap(self, parsed: Dict) -> float:
        """Calculate bandgap for mixed halide perovskites (e.g., MAPbI3-xBrx)."""
        A = parsed["A"][0]
        B = parsed["B"]
        X1, X2 = parsed["X"]
        stoich1, stoich2 = parsed["X_stoich"]

        # Fraction of first halide
        x = stoich1 / (stoich1 + stoich2)

        # Get endpoint bandgaps
        formula1 = f"{A}{B}{X1}3"
        formula2 = f"{A}{B}{X2}3"

        Eg1 = self.REFERENCE_BANDGAPS.get(formula1)
        Eg2 = self.REFERENCE_BANDGAPS.get(formula2)

        if Eg1 is None or Eg2 is None:
            raise ValueError(f"Missing reference data for {formula1} or {formula2}")

        # Get bowing parameter
        halide_pair = f"{X1}-{X2}" if X1 < X2 else f"{X2}-{X1}"
        bowing = self.BOWING_PARAMETERS.get(halide_pair, 0.1)

        # Vegard's law with bowing
        bandgap = x * Eg1 + (1 - x) * Eg2 - x * (1 - x) * bowing

        return bandgap

    def _calculate_mixed_cation_bandgap(self, parsed: Dict) -> float:
        """Calculate bandgap for mixed A-site cations (e.g., FA0.8Cs0.2PbI3)."""
        A1, A2 = parsed["A"]
        frac1, frac2 = parsed["A_frac"]
        B = parsed["B"]
        X = parsed["X"][0]

        formula1 = f"{A1}{B}{X}3"
        formula2 = f"{A2}{B}{X}3"

        Eg1 = self.REFERENCE_BANDGAPS.get(formula1)
        Eg2 = self.REFERENCE_BANDGAPS.get(formula2)

        if Eg1 is None or Eg2 is None:
            raise ValueError(f"Missing reference data for {formula1} or {formula2}")

        # Linear interpolation (minimal bowing for A-site)
        bandgap = frac1 * Eg1 + frac2 * Eg2

        return bandgap

    def _calculate_approximate_bandgap(self, parsed: Dict) -> float:
        """Approximate bandgap for complex compositions."""
        # Use first A-site cation and first halide as base
        A = parsed["A"][0]
        B = parsed["B"]
        X = parsed["X"][0]

        base_formula = f"{A}{B}{X}3"
        base_bandgap = self.REFERENCE_BANDGAPS.get(base_formula, 1.5)

        logger.warning(f"Using approximate bandgap {base_bandgap} eV for complex composition")

        return base_bandgap

    def _apply_temperature_correction(self, bandgap: float, temperature: float) -> float:
        """
        Apply temperature-dependent bandgap correction.

        Uses simplified linear approximation for small temperature changes.
        dEg/dT ≈ -0.0003 eV/K for perovskites
        """
        T_ref = 300.0
        dEg_dT = -0.0003  # eV/K

        corrected_bandgap = bandgap + dEg_dT * (temperature - T_ref)

        return corrected_bandgap

    def calculate_batch(self, compositions: List[str]) -> List[BandgapResult]:
        """Calculate bandgaps for multiple compositions."""
        return [self.calculate(comp) for comp in compositions]
