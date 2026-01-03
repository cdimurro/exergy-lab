/**
 * Simulation Calculators Module
 *
 * Physics-based calculators for energy systems and materials science.
 *
 * @version 0.7.0
 */

// Energy Systems
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

// Materials Science
export {
  calculatePolymerProperties,
  calculateGlassTransition,
  calculateIntrinsicViscosity,
  calculateMeltViscosity,
  calculateDegreeOfPolymerization,
  calculateThermalProperties,
  getAvailablePolymers,
  type PolymerInputs,
} from './polymer-properties'

export {
  calculateCatalystPerformance,
  calculateRateConstant,
  calculateTurnoverFrequency,
  calculateActivationParameters,
  calculateDeactivation,
  calculateASFSelectivity,
  calculateSpaceVelocity,
  getAvailableCatalysts,
  generateArrheniusPlot,
  type CatalystInputs,
} from './catalyst-performance'

export {
  calculateBatteryMaterials,
  calculateCapacity,
  calculateCycleDegradation,
  calculateIonicConductivity,
  calculateThermalRunaway,
  calculateOpenCircuitVoltage,
  calculateEnergyDensity,
  getAvailableBatteryMaterials,
  type BatteryInputs,
} from './battery-materials'

export {
  calculateMembraneSeparation,
  calculateWaterFlux,
  calculateSoluteRejection,
  calculateFoulingRate,
  calculateEnergyConsumption,
  calculatePermeateQuality,
  getAvailableMembranes,
  type MembraneInputs,
} from './membrane-separation'
