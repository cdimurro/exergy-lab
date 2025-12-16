# Exergy Lab API Reference

Complete API documentation for all backend endpoints in the Exergy Lab platform.

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Discovery API](#discovery-api)
4. [Simulations API](#simulations-api)
5. [TEA Generator API](#tea-generator-api)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [Examples](#examples)

---

## Overview

### Base URL
- **Development:** `http://localhost:3000/api`
- **Production:** `https://your-app.vercel.app/api`

### Request Format
- All requests use **JSON** format
- Set `Content-Type: application/json` header
- Use **POST** for data submission
- Use **GET** for data retrieval

### Response Format
```json
{
  "success": true,
  "data": { /* response data */ },
  "timestamp": "2024-01-15T12:00:00Z"
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { /* additional error context */ }
  },
  "timestamp": "2024-01-15T12:00:00Z"
}
```

---

## Authentication

### Current Status
Authentication is **optional** for MVP. Full Clerk integration coming soon.

### Future Authentication (Planned)
```bash
# Include in headers
Authorization: Bearer <your_token_here>
```

**Getting a Token:**
1. Sign up/Login via Clerk
2. Token automatically included in client-side requests
3. Server-side: Use Clerk SDK to verify tokens

---

## Discovery API

### POST /api/discovery

Generate AI-powered innovation discoveries by combining multiple research domains.

**Endpoint:** `POST /api/discovery`

**Request Body:**
```json
{
  "prompt": {
    "description": "Improve solar cell efficiency using novel materials",
    "domains": ["solar", "materials-science"],
    "constraints": ["cost-effective", "scalable"],
    "targetImpact": "high"
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt.description` | string | Yes | Research question or innovation goal |
| `prompt.domains` | string[] | Yes | 2-4 research domains to combine |
| `prompt.constraints` | string[] | No | Technical or business constraints |
| `prompt.targetImpact` | string | No | Desired impact level: "low", "medium", "high" |

**Available Domains:**
- `solar` - Solar energy systems
- `wind` - Wind power
- `battery-storage` - Energy storage
- `hydrogen` - Hydrogen production/storage
- `geothermal` - Geothermal energy
- `biomass` - Biomass conversion
- `carbon-capture` - CO2 capture/utilization
- `energy-efficiency` - Efficiency improvements
- `grid-optimization` - Smart grid/distribution
- `materials-science` - Advanced materials

**Response:**
```json
{
  "success": true,
  "data": {
    "ideas": [
      {
        "id": "disc_abc123",
        "title": "Perovskite Stabilization Using Aerospace Coatings",
        "description": "Apply anti-corrosion coating technologies from aerospace...",
        "domains": ["solar", "materials-science"],
        "feasibility": {
          "technical": 0.85,
          "economic": 0.72,
          "timeline": "2-3 years"
        },
        "impactPotential": {
          "efficiency": "+15%",
          "cost": "-20%",
          "sustainability": "high"
        },
        "sources": [
          {
            "type": "academic-paper",
            "title": "Advanced Perovskite Stabilization...",
            "authors": ["Smith, J.", "Chen, L."],
            "year": 2023,
            "citations": 45,
            "url": "https://doi.org/..."
          }
        ],
        "nextSteps": [
          "Literature review of aerospace coatings",
          "Lab-scale compatibility tests",
          "Economic analysis"
        ]
      }
    ],
    "searchMetrics": {
      "totalSources": 150,
      "papers": 80,
      "patents": 35,
      "reports": 25,
      "news": 10,
      "searchDuration": 8500
    },
    "timestamp": "2024-01-15T12:00:00Z"
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `ideas` | array | Array of discovery ideas |
| `ideas[].id` | string | Unique identifier |
| `ideas[].title` | string | Innovation title |
| `ideas[].description` | string | Detailed explanation |
| `ideas[].domains` | string[] | Combined domains |
| `ideas[].feasibility` | object | Technical/economic feasibility scores (0-1) |
| `ideas[].impactPotential` | object | Expected improvements |
| `ideas[].sources` | array | Supporting academic sources |
| `ideas[].nextSteps` | string[] | Recommended actions |
| `searchMetrics` | object | Search performance statistics |

**Status Codes:**
- `200` - Success
- `400` - Invalid request (missing/invalid domains)
- `429` - Rate limit exceeded
- `500` - Server error (AI service failure)

**Example cURL:**
```bash
curl -X POST http://localhost:3000/api/discovery \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": {
      "description": "Combine wind and battery storage",
      "domains": ["wind", "battery-storage"]
    }
  }'
```

---

## Simulations API

### POST /api/simulations/run

Execute physics-based simulations using the 3-tier computational system.

**Endpoint:** `POST /api/simulations/run`

**Request Body:**
```json
{
  "config": {
    "title": "Solar Panel Efficiency Simulation",
    "description": "Evaluate perovskite solar cell performance",
    "tier": "browser",
    "type": "solar",
    "parameters": {
      "capacity": 100,
      "efficiency": 0.22,
      "temperature": 25,
      "irradiance": 1000,
      "area": 1.6,
      "degradationRate": 0.005
    },
    "options": {
      "iterations": 1000,
      "uncertaintyAnalysis": true,
      "optimizationMode": false
    }
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `config.title` | string | Yes | Simulation name |
| `config.description` | string | No | Detailed description |
| `config.tier` | string | Yes | "local", "browser", or "cloud" |
| `config.type` | string | Yes | System type (see types below) |
| `config.parameters` | object | Yes | Type-specific parameters |
| `config.options` | object | No | Advanced options |

**Simulation Types:**

**Solar (`type: "solar"`)**
```json
"parameters": {
  "capacity": 100,              // kW
  "efficiency": 0.22,           // 0-1
  "temperature": 25,            // °C
  "irradiance": 1000,           // W/m²
  "area": 1.6,                  // m²
  "degradationRate": 0.005      // per year
}
```

**Wind (`type: "wind"`)**
```json
"parameters": {
  "capacity": 2000,             // kW
  "windSpeed": 12,              // m/s
  "rotorDiameter": 80,          // m
  "hubHeight": 100,             // m
  "airDensity": 1.225,          // kg/m³
  "powerCoefficient": 0.45      // 0-1
}
```

**Battery (`type: "battery"`)**
```json
"parameters": {
  "capacity": 100,              // kWh
  "power": 50,                  // kW
  "efficiency": 0.95,           // 0-1
  "cycleLife": 5000,            // cycles
  "doD": 0.8,                   // depth of discharge (0-1)
  "temperature": 25             // °C
}
```

**Hydrogen (`type: "hydrogen"`)**
```json
"parameters": {
  "electrolyzerPower": 1000,    // kW
  "efficiency": 0.70,           // 0-1
  "pressure": 30,               // bar
  "temperature": 80,            // °C
  "productionRate": 20          // kg/day
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "sim_xyz789",
    "config": { /* original config */ },
    "tier": "browser",
    "status": "completed",
    "executionTime": 45000,
    "cost": 0,
    "metrics": {
      "efficiency": {
        "value": 0.218,
        "unit": "%",
        "uncertainty": 0.012,
        "description": "System efficiency"
      },
      "output": {
        "value": 21.8,
        "unit": "kW",
        "uncertainty": 1.2
      },
      "performanceRatio": {
        "value": 0.85,
        "unit": "",
        "uncertainty": 0.05
      }
    },
    "visualizations": [
      {
        "type": "line",
        "title": "Power Output Over Time",
        "data": {
          "labels": ["0h", "1h", "2h", ...],
          "datasets": [
            {
              "label": "Power (kW)",
              "data": [0, 15.2, 21.8, ...]
            }
          ]
        }
      }
    ],
    "recommendations": [
      "Increase panel area by 15% for target output",
      "Consider anti-reflective coating for +2% efficiency"
    ],
    "rawData": {
      "timeSteps": [...],
      "powerOutput": [...],
      "efficiency": [...]
    }
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid configuration
- `402` - Payment required (Tier 3, insufficient funds)
- `500` - Simulation execution failed
- `503` - Cloud GPU unavailable (Tier 3)

---

### GET /api/simulations/:id

Retrieve a previously run simulation by ID.

**Endpoint:** `GET /api/simulations/:id`

**Parameters:**
- `:id` - Simulation ID (e.g., `sim_xyz789`)

**Response:**
```json
{
  "success": true,
  "data": {
    /* Same structure as POST response */
  }
}
```

---

## TEA Generator API

### POST /api/tea/generate

Generate a comprehensive Techno-Economic Analysis report.

**Endpoint:** `POST /api/tea/generate`

**Request Body:**
```json
{
  "project": {
    "name": "Community Solar Farm",
    "description": "100 kW rooftop solar installation",
    "technology": "solar-pv",
    "location": "California, USA"
  },
  "technical": {
    "capacity": 100,
    "capacity_unit": "kW",
    "efficiency": 0.22,
    "lifetime": 25,
    "degradation_rate": 0.005
  },
  "economic": {
    "capex": 150000,
    "opex": 5000,
    "currency": "USD",
    "discount_rate": 0.08,
    "electricity_price": 0.12,
    "escalation_rate": 0.02
  },
  "options": {
    "include_sensitivity": true,
    "include_risk": true,
    "sensitivity_vars": ["electricity_price", "capex", "efficiency"]
  }
}
```

**Request Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `project.name` | string | Yes | Project name |
| `project.technology` | string | Yes | Technology type |
| `technical.capacity` | number | Yes | System capacity |
| `technical.lifetime` | number | Yes | Project lifetime (years) |
| `economic.capex` | number | Yes | Capital expenditure |
| `economic.opex` | number | Yes | Annual operating cost |
| `economic.discount_rate` | number | Yes | Discount rate (0-1) |
| `options.include_sensitivity` | boolean | No | Run sensitivity analysis |

**Response:**
```json
{
  "success": true,
  "data": {
    "report_id": "tea_report_abc123",
    "summary": {
      "npv": 45000,
      "irr": 0.12,
      "payback_period": 8.5,
      "lcoe": 0.08,
      "roi": 0.30
    },
    "sections": {
      "executive_summary": "This analysis evaluates...",
      "technical_overview": "...",
      "cost_breakdown": {
        "capex": {
          "total": 150000,
          "items": [
            { "name": "Solar Panels", "cost": 80000 },
            { "name": "Inverters", "cost": 25000 },
            { "name": "Installation", "cost": 30000 },
            { "name": "Other", "cost": 15000 }
          ]
        },
        "opex": {
          "annual": 5000,
          "items": [...]
        }
      },
      "cash_flow": {
        "years": [0, 1, 2, ...],
        "revenue": [0, 12000, 12240, ...],
        "costs": [150000, 5000, 5000, ...],
        "net": [-150000, 7000, 7240, ...]
      },
      "sensitivity_analysis": {
        "tornado_chart": {
          "variables": ["electricity_price", "capex", "efficiency"],
          "npv_range": [
            { "var": "electricity_price", "low": 20000, "high": 70000 },
            { "var": "capex", "low": 30000, "high": 60000 },
            { "var": "efficiency", "low": 35000, "high": 55000 }
          ]
        }
      },
      "risk_assessment": {
        "risks": [
          {
            "category": "technical",
            "risk": "Panel degradation faster than expected",
            "likelihood": "medium",
            "impact": "medium",
            "mitigation": "Use tier-1 panels with strong warranties"
          }
        ]
      },
      "recommendations": [
        "Project is economically viable with 12% IRR",
        "Consider larger scale for better economics",
        "Monitor degradation rates closely"
      ]
    },
    "pdf_url": "/api/tea/download/tea_report_abc123",
    "generated_at": "2024-01-15T12:00:00Z"
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Invalid input parameters
- `500` - Report generation failed

---

### POST /api/tea/extract

Extract TEA parameters from uploaded files using AI.

**Endpoint:** `POST /api/tea/extract`

**Content-Type:** `multipart/form-data`

**Request:**
```bash
# File upload form data
file: <uploaded_file>
```

**Supported Formats:**
- PDF
- Excel (.xlsx, .xls)
- CSV
- Plain text (.txt)

**Response:**
```json
{
  "success": true,
  "data": {
    "extracted_params": {
      "project": {
        "name": "Community Solar Farm",
        "technology": "solar-pv"
      },
      "technical": {
        "capacity": 100,
        "efficiency": 0.22
      },
      "economic": {
        "capex": 150000,
        "opex": 5000
      }
    },
    "confidence": 0.85,
    "missing_fields": ["discount_rate", "lifetime"],
    "warnings": [
      "CAPEX value seems high for stated capacity"
    ]
  }
}
```

---

## Error Handling

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_REQUEST` | 400 | Malformed request or missing required fields |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMIT` | 429 | Too many requests |
| `AI_SERVICE_ERROR` | 500 | AI provider (Gemini/OpenAI) failure |
| `SIMULATION_ERROR` | 500 | Simulation execution failed |
| `CLOUD_GPU_UNAVAILABLE` | 503 | Modal Labs service unavailable |

### Error Response Example
```json
{
  "success": false,
  "error": {
    "code": "SIMULATION_ERROR",
    "message": "Simulation failed: Invalid parameter range",
    "details": {
      "parameter": "efficiency",
      "value": 1.5,
      "validRange": "0.0 - 1.0"
    }
  },
  "timestamp": "2024-01-15T12:00:00Z"
}
```

---

## Rate Limiting

### Current Limits (per user/IP)

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/discovery` | 10 requests | 1 hour |
| `/api/simulations/run` (Tier 1/2) | 20 requests | 1 hour |
| `/api/simulations/run` (Tier 3) | 5 requests | 1 hour |
| `/api/tea/generate` | 15 requests | 1 hour |
| `/api/tea/extract` | 10 requests | 1 hour |

### Rate Limit Headers
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1642262400
```

### Rate Limit Exceeded Response
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT",
    "message": "Rate limit exceeded. Try again in 45 minutes.",
    "details": {
      "limit": 10,
      "windowSeconds": 3600,
      "resetAt": "2024-01-15T13:00:00Z"
    }
  }
}
```

---

## Examples

### Complete Discovery Workflow

**1. Generate Discoveries**
```bash
curl -X POST http://localhost:3000/api/discovery \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": {
      "description": "Improve hydrogen production efficiency",
      "domains": ["hydrogen", "materials-science"],
      "targetImpact": "high"
    }
  }'
```

**2. Use Discovery to Generate Experiment**
```javascript
// In frontend code
const discovery = await fetch('/api/discovery', { /* ... */ })
const idea = discovery.data.ideas[0]

// Navigate to experiments page with pre-filled data
router.push(`/experiments?idea=${idea.id}`)
```

### Complete Simulation Workflow

**1. Run Local Simulation (Tier 1)**
```bash
curl -X POST http://localhost:3000/api/simulations/run \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "title": "Quick Solar Test",
      "tier": "local",
      "type": "solar",
      "parameters": {
        "capacity": 100,
        "efficiency": 0.22,
        "temperature": 25,
        "irradiance": 1000
      }
    }
  }'
```

**2. If Satisfied, Upgrade to Browser (Tier 2)**
```bash
curl -X POST http://localhost:3000/api/simulations/run \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "title": "Detailed Solar Analysis",
      "tier": "browser",
      "type": "solar",
      "parameters": { /* same as above */ },
      "options": {
        "uncertaintyAnalysis": true
      }
    }
  }'
```

**3. For Production, Use Cloud GPU (Tier 3)**
```bash
curl -X POST http://localhost:3000/api/simulations/run \
  -H "Content-Type: application/json" \
  -d '{
    "config": {
      "title": "High-Accuracy Solar Simulation",
      "tier": "cloud",
      "type": "solar",
      "parameters": { /* same as above */ },
      "options": {
        "iterations": 10000,
        "uncertaintyAnalysis": true,
        "optimizationMode": true
      }
    }
  }'
```

### Complete TEA Workflow

**1. Upload File for Parameter Extraction**
```bash
curl -X POST http://localhost:3000/api/tea/extract \
  -F "file=@project_data.xlsx"
```

**2. Review and Adjust Extracted Parameters**
```javascript
const extracted = await response.json()
// Manually fill missing fields
extracted.data.extracted_params.economic.discount_rate = 0.08
```

**3. Generate Report**
```bash
curl -X POST http://localhost:3000/api/tea/generate \
  -H "Content-Type: application/json" \
  -d '{ /* adjusted parameters */ }'
```

**4. Download PDF**
```bash
curl -O http://localhost:3000/api/tea/download/tea_report_abc123
```

---

## Changelog

### v1.0.0 (2024-01-15)
- Initial API release
- Discovery, Simulations, and TEA endpoints
- Real external API integrations
- 3-tier simulation system

### Upcoming (v1.1.0)
- WebSocket support for real-time simulation updates
- Batch simulation endpoints
- Comparison API for side-by-side analysis
- Enhanced caching with Redis

---

## Support

**API Issues:**
- GitHub: [github.com/your-repo/issues](https://github.com)
- Email: api@exergylab.com

**API Status:**
- Status page: [status.exergylab.com](https://status.exergylab.com)

---

**Last Updated:** December 2024
**API Version:** 1.0.0
**Documentation Version:** 1.0.0
