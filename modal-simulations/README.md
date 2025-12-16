# Modal GPU Simulations

High-accuracy physics-based simulations for clean energy systems using GPU acceleration via Modal Labs.

## Overview

This service provides Tier 3 (Cloud GPU) simulations with:
- ±2% accuracy using Monte Carlo analysis (10,000 iterations)
- GPU-accelerated computations (T4/A100)
- Real-time physics-based modeling
- Detailed uncertainty quantification

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Authenticate with Modal

```bash
# Create a Modal account at https://modal.com
modal token new
```

### 3. Test Locally

```bash
# Run a test simulation
modal run simulation_runner.py
```

This will execute a test simulation and print the results.

### 4. Deploy to Production

```bash
# Deploy the service
chmod +x deploy.sh
./deploy.sh
```

Or manually:
```bash
modal deploy simulation_runner.py
```

### 5. Get the Endpoint URL

After deployment:
1. Go to https://modal.com/apps
2. Find your `clean-energy-simulations` app
3. Copy the `run_simulation` function URL
4. Add to your Next.js `.env.local`:

```bash
MODAL_API_KEY=your_modal_api_key
MODAL_ENDPOINT=https://your-app--run-simulation.modal.run
ENABLE_CLOUD_GPU=true
```

## Usage

The service exposes a `run_simulation` function that accepts:

```python
{
  "title": "Simulation Title",
  "description": "Simulation description",
  "parameters": [
    {"name": "Input Power (kW)", "value": 150, "unit": "kW"},
    {"name": "Temperature (C)", "value": 30, "unit": "°C"},
    {"name": "Operating Hours", "value": 8760, "unit": "hours"}
  ]
}
```

Returns:

```python
{
  "metrics": [
    {
      "name": "System Efficiency",
      "value": 35.2,
      "unit": "%",
      "uncertainty": 2,
      "confidenceInterval": [34.5, 35.9]
    },
    # ... more metrics
  ],
  "visualizations": [
    {
      "type": "line",
      "data": [...],  # Time-series data points
      "xAxis": "timestamp",
      "yAxis": ["efficiency", "powerOutput"],
      "title": "System Performance Over Time"
    }
  ],
  "raw_data": {
    "monte_carlo_iterations": 10000,
    "efficiency_distribution": {...},
    "power_distribution": {...}
  },
  "execution_time_ms": 12500
}
```

## Cost Estimation

GPU costs on Modal:
- **T4 GPU**: ~$0.40/hour = ~$0.001/second
- **A100 GPU**: ~$3.00/hour = ~$0.008/second

Typical simulation:
- Execution time: 10-60 seconds
- Cost: $0.01 - $0.50 per simulation

## Development

### Running Tests

```bash
modal run simulation_runner.py
```

### Monitoring

View logs and metrics:
```bash
modal logs clean-energy-simulations
```

### Updating the Service

After making changes:
```bash
modal deploy simulation_runner.py
```

## GPU Selection

The service uses T4 GPUs by default (cost-effective). For more intensive simulations, upgrade to A100:

```python
@stub.function(
    gpu="A100",  # Change from "T4" to "A100"
    ...
)
```

## Troubleshooting

### Authentication Issues

```bash
# Re-authenticate
modal token set
```

### Deployment Failures

Check the logs:
```bash
modal logs clean-energy-simulations
```

### Timeout Errors

Increase the timeout in `simulation_runner.py`:
```python
@stub.function(
    timeout=900,  # 15 minutes
    ...
)
```

## Architecture

```
Next.js App (User Request)
    ↓
Simulation Engine (exergy-lab/src/lib/simulation-engine.ts)
    ↓
Modal API Endpoint (HTTPS)
    ↓
GPU Function (simulation_runner.py)
    ↓ [T4/A100 GPU]
Monte Carlo Analysis (10,000 iterations)
    ↓
Results (metrics + visualizations)
```

## Support

- Modal Docs: https://modal.com/docs
- Modal Discord: https://discord.gg/modal
- Issues: https://github.com/your-repo/issues
