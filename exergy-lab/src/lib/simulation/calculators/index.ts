/**
 * Simulation Calculators Module
 *
 * Physics-based calculators for various energy system simulations.
 */

export {
  calculateElectrochemicalCell,
  calculateNernstVoltage,
  calculateThermoneutralVoltage,
  calculateOverpotentials,
  calculateFuelCellPerformance,
  generatePolarizationCurve,
  type ElectrochemistryInputs,
} from './electrochemistry'

export {
  calculateCarnotEfficiency,
  calculatePracticalEfficiency,
  calculateHeatExchanger,
  calculateExergyImprovement,
  calculateEntropyGeneration,
  getAvailablePowerCycles,
  type ThermodynamicInputs,
} from './thermodynamics'

export {
  calculatePVPerformance,
  calculateShockleyQueisserLimit,
  calculateTemperatureEffect,
  calculateCellTemperature,
  calculateAnnualYield,
  getAvailablePVTechnologies,
  type PVInputs,
} from './photovoltaics'

export {
  calculateWindTurbinePerformance,
  calculateWindPower,
  calculatePowerCoefficient,
  calculateTurbinePower,
  calculateWindShear,
  calculateWakeLoss,
  generatePowerCurve,
  getAvailableTurbines,
  type WindTurbineInputs,
} from './wind-turbines'
