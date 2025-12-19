# Cost Models Reference

## Equipment Cost Correlations

### Heat Exchangers
```
Cost ($) = a × (Area, m²)^b

Shell & tube: a = 1500, b = 0.68
Plate: a = 800, b = 0.71
Air-cooled: a = 2000, b = 0.65
```

### Pumps
```
Cost ($) = a × (Power, kW)^b

Centrifugal: a = 1200, b = 0.55
Positive displacement: a = 1500, b = 0.60
```

### Compressors
```
Cost ($) = a × (Power, kW)^b

Centrifugal: a = 3000, b = 0.75
Reciprocating: a = 2500, b = 0.78
Screw: a = 2000, b = 0.70
```

### Pressure Vessels
```
Cost ($) = a × (Volume, m³)^b × Fp × Fm

Carbon steel: a = 2000, b = 0.60
Stainless steel: Fm = 2.5
High pressure (>10 bar): Fp = 1.5-3.0
```

### Reactors
```
Cost ($) = a × (Volume, m³)^b × Fp × Fm

CSTR: a = 5000, b = 0.55
PFR: a = 4000, b = 0.58
Packed bed: a = 3500, b = 0.62
```

### Columns
```
Cost ($) = a × (Diameter, m)^b × (Height, m)^c

Distillation: a = 8000, b = 1.2, c = 0.8
Absorption: a = 6000, b = 1.1, c = 0.75
```

## Module-Level Costs

### Solar PV (2024)
```
Component           | $/Wp
--------------------|--------
Modules             | 0.20-0.30
Inverter            | 0.05-0.08
Racking/BOS         | 0.10-0.15
Installation        | 0.15-0.25
Soft costs          | 0.15-0.25
--------------------|--------
Total (utility)     | 0.80-1.20
Total (residential) | 2.50-3.50
```

### Wind Turbine (2024)
```
Component           | $/kW
--------------------|--------
Turbine             | 800-1200
Foundation          | 100-200
Electrical          | 100-200
Grid connection     | 50-150
Development         | 50-100
--------------------|--------
Total (onshore)     | 1100-1800
Total (offshore)    | 2500-4000
```

### Battery Storage (2024)
```
Component           | $/kWh
--------------------|--------
Battery cells       | 100-150
Battery pack        | 30-50
Power electronics   | 40-60
BMS                 | 20-30
Thermal mgmt        | 15-25
Installation        | 30-50
--------------------|--------
Total               | 250-400
```

### PEM Electrolyzer (2024)
```
Component           | $/kW
--------------------|--------
MEA/Stack           | 300-500
Power electronics   | 100-200
Balance of plant    | 200-300
Installation        | 100-200
--------------------|--------
Total               | 800-1200
```

### Alkaline Electrolyzer (2024)
```
Component           | $/kW
--------------------|--------
Stack               | 150-250
Power electronics   | 80-150
Balance of plant    | 150-250
Installation        | 80-150
--------------------|--------
Total               | 500-800
```

### Carbon Capture (Amine)
```
Component           | $/tCO2/yr
--------------------|--------
Absorber            | 100-200
Stripper            | 80-150
Heat exchangers     | 50-100
Reboiler            | 80-120
Compressors         | 100-150
Installation        | 100-200
--------------------|--------
Total               | 500-1000
```

## Operating Cost Factors

### Utilities
```
Electricity         | $0.05-0.15/kWh
Natural gas         | $3-8/MMBTU
Cooling water       | $0.03-0.08/m³
Steam (low P)       | $8-15/t
Steam (high P)      | $12-20/t
Nitrogen            | $0.05-0.15/Nm³
```

### Labor
```
Operators           | $50-80k/yr (2-4 per shift)
Engineers           | $80-120k/yr
Supervisors         | $100-150k/yr
Maintenance crew    | $60-90k/yr
```

### Maintenance
```
Type                | % of CAPEX/yr
--------------------|--------
Mechanical          | 2-4%
Electrical          | 1-2%
Instrumentation     | 1-2%
Buildings           | 0.5-1%
--------------------|--------
Total               | 3-6%
```

### Insurance & Taxes
```
Insurance           | 0.5-1% of CAPEX/yr
Property tax        | 0.5-2% of CAPEX/yr
```

## Learning Curves

### Technology Learning Rates
```
Technology          | Learning Rate | Doublings to 2030
--------------------|---------------|------------------
Solar PV            | 20-24%        | 2-3
Batteries           | 15-20%        | 2-3
Wind                | 10-15%        | 1-2
Electrolyzers       | 15-20%        | 3-4
DAC                 | 15-20%        | 4-5
```

### Learning Curve Formula
```
Cost_n = Cost_1 × n^(-b)

Where:
- n = cumulative production
- b = log(1 - LR) / log(2)
- LR = learning rate

Example: 20% learning rate
b = log(0.8) / log(2) = 0.322
Cost at 2x volume = 80% of original
```

## Regional Cost Multipliers

### Construction Labor Index
```
Region              | Multiplier
--------------------|--------
US Gulf Coast       | 1.00 (base)
US Midwest          | 1.05
US Northeast        | 1.15
US West Coast       | 1.20
Western Europe      | 1.30
Japan               | 1.35
China               | 0.60
India               | 0.50
Middle East         | 0.80
```

### Electricity Prices (2024)
```
Region              | Industrial ($/kWh)
--------------------|--------
US average          | 0.07-0.10
Texas               | 0.05-0.08
California          | 0.12-0.18
Germany             | 0.15-0.25
China               | 0.06-0.10
Middle East         | 0.02-0.05
```

## Currency & Inflation

### Chemical Engineering Plant Cost Index (CEPCI)
```
Year    | Index
--------|--------
2010    | 550
2015    | 557
2020    | 596
2023    | 800
2024    | 820 (est)

Adjustment: Cost_current = Cost_base × (CEPCI_current / CEPCI_base)
```

### Producer Price Index (PPI) - Industrial
```
Use for equipment and materials cost adjustment
Annual increase: ~2-3%
```

## Cost Breakdown Templates

### Solar Plant (100 MW)
```
Item                | Cost ($M) | $/Wp
--------------------|-----------|--------
Modules             | 20-30     | 0.20-0.30
Inverters           | 5-8       | 0.05-0.08
Mounting            | 8-12      | 0.08-0.12
Electrical BOS      | 10-15     | 0.10-0.15
Civil works         | 5-8       | 0.05-0.08
Engineering         | 3-5       | 0.03-0.05
Contingency         | 5-8       | 0.05-0.08
--------------------|-----------|--------
Total CAPEX         | 80-120    | 0.80-1.20

Annual OPEX         | 1-1.5     | 1-1.5% CAPEX
```

### Battery Storage (100 MWh)
```
Item                | Cost ($M) | $/kWh
--------------------|-----------|--------
Battery system      | 15-25     | 150-250
Power conversion    | 5-8       | 50-80
Thermal management  | 2-3       | 20-30
BMS & controls      | 2-3       | 20-30
Installation        | 3-5       | 30-50
--------------------|-----------|--------
Total CAPEX         | 30-50     | 300-500

Annual OPEX         | 0.3-0.5   | 1-2% CAPEX
```

### Green Hydrogen (10 MW electrolyzer)
```
Item                | Cost ($M) | $/kW
--------------------|-----------|--------
Electrolyzer stack  | 4-6       | 400-600
Power electronics   | 1-2       | 100-200
Water treatment     | 0.3-0.5   | 30-50
Gas processing      | 0.5-1     | 50-100
Balance of plant    | 1-2       | 100-200
Installation        | 1-2       | 100-200
--------------------|-----------|--------
Total CAPEX         | 9-15      | 900-1500

Electricity (70%)   | variable  | 50-55 kWh/kg
Stack replacement   | every 8-10 years
```

## Sensitivity Ranges

### Standard Ranges for Analysis
```
Parameter           | Low    | Base   | High
--------------------|--------|--------|--------
CAPEX               | -20%   | 0%     | +30%
OPEX                | -15%   | 0%     | +20%
Discount rate       | 6%     | 8%     | 12%
Capacity factor     | -10%   | base   | +5%
Electricity price   | -30%   | base   | +50%
Product price       | -20%   | base   | +30%
Lifetime            | -5yr   | base   | +5yr
```
