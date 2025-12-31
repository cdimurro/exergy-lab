/**
 * Data Sources Module
 *
 * Provides unified access to external data sources for simulations.
 */

export {
  DataSourceRegistry,
  getDataSourceRegistry,
  createDataSourceRegistry,
  CACHE_TTL,
  type DataSourceStatus,
} from './data-source-registry'

export {
  ParameterResolver,
  getParameterResolver,
  createParameterResolver,
  type ResolvedParameter,
  type ParameterRequest,
} from './parameter-resolver'

export {
  MaterialsDatabase,
  getMaterialsDatabase,
  createMaterialsDatabase,
  type MaterialProperties,
  type ElectrochemicalProperties,
} from './materials-db'

export {
  EnvironmentalDatabase,
  getEnvironmentalDatabase,
  createEnvironmentalDatabase,
  type SolarResource,
  type WindResource,
  type AmbientConditions,
} from './environmental-db'
