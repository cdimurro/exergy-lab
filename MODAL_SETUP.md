# Modal Labs GPU Setup Guide

This guide shows how to set up Modal Labs for GPU-accelerated simulations in the Breakthrough Engine.

## Prerequisites

- Python 3.8+ installed
- Modal account (free tier available)
- Terminal/command line access

## Step 1: Install Modal

```bash
pip install modal
```

Or if using pip3:
```bash
pip3 install modal
```

## Step 2: Create Modal Account & Get API Token

1. Go to [modal.com](https://modal.com) and sign up for a free account
2. After signing up, you'll get **$30 in free credits** to start
3. Generate an API token from the Modal dashboard

## Step 3: Authenticate Modal CLI

Run the authentication command:

```bash
modal token new
```

This will:
1. Open your browser to authenticate
2. Generate a token
3. Save it to `~/.modal.toml`

Verify authentication:
```bash
modal token list
```

You should see your active token.

## Step 4: Deploy GPU Functions

Navigate to the project directory:

```bash
cd /Users/chrisdimurro/Desktop/clean-energy-platform
```

Deploy the GPU-accelerated simulations:

```bash
modal deploy modal-simulations/gpu_accelerated.py
```

This will:
- Build the container image with scientific libraries
- Deploy the functions to Modal's infrastructure
- Return deployment URLs for each function

## Step 5: Test GPU Functions

Run the test suite:

```bash
cd modal-simulations
modal run gpu_accelerated.py
```

This executes the `main()` function locally, which tests:
1. **Vectorized Monte Carlo** (T4 GPU) - 10K iterations on 5 hypotheses
2. **Parametric Sweep** (A10G GPU) - 400 points across 2 parameters
3. **Batch Hypothesis Validation** (T4 GPU) - 3 hypotheses in parallel

Expected output:
```
============================================================
Testing GPU-Accelerated Simulations
============================================================

1. Testing Vectorized Monte Carlo (T4)...
[GPU-T4] Processed 5 configs, 10000 iterations each
[GPU-T4] Total time: 1234ms
[GPU-T4] Throughput: 40500 iter/s
Monte Carlo: 5 results
  hyp_0: LCOE mean = $0.0428/kWh
  hyp_1: LCOE mean = $0.0401/kWh

2. Testing Parametric Sweep (A10G)...
[GPU-A10G] Sweeping 2 parameters, 400 total points
[GPU-A10G] Sweep complete in 3456ms
[GPU-A10G] Throughput: 6944 points/min
Parametric sweep: 400 points evaluated
  Optimal config: {'efficiency': 0.45, 'cost_per_kw': 75}
  Optimal LCOE: $0.0312/kWh

3. Testing Batch Hypothesis Validation (T4)...
[GPU-T4] Validated 3 hypotheses in 2345ms
Validated 3 hypotheses:
  test_hyp_0: physics_valid=True, viable=True
  test_hyp_1: physics_valid=True, viable=True
  test_hyp_2: physics_valid=True, viable=False

============================================================
All tests completed successfully!
============================================================
```

## Step 6: Configure Environment Variables

Add Modal token to your `.env.local`:

```bash
cd /Users/chrisdimurro/Desktop/clean-energy-platform/exergy-lab
echo "MODAL_TOKEN_ID=your_token_id_here" >> .env.local
echo "MODAL_TOKEN_SECRET=your_token_secret_here" >> .env.local
```

Get your token from `~/.modal.toml`:
```bash
cat ~/.modal.toml
```

## Step 7: Integration with Breakthrough Engine

The Breakthrough Engine will automatically use Modal for:

1. **Monte Carlo Validation** - Running 100K iterations per hypothesis
2. **Parametric Sweeps** - Exploring optimal configurations
3. **Batch Validation** - Processing multiple hypotheses in parallel

Functions are called via Modal's SDK from TypeScript:

```typescript
// Example: Call Monte Carlo from Node.js
import { exec } from 'child_process'

const config = {
  hypothesis_id: 'hyp_123',
  parameters: {
    efficiency_mean: 0.35,
    efficiency_std: 0.05,
    cost_mean: 100,
    cost_std: 15,
    // ... more parameters
  }
}

// Call Modal function via CLI
exec(
  `modal run modal-simulations/gpu_accelerated.py::monte_carlo_vectorized '${JSON.stringify([config])}'`,
  (error, stdout, stderr) => {
    const result = JSON.parse(stdout)
    console.log('Monte Carlo result:', result[0])
  }
)
```

## GPU Tier Pricing

Modal offers pay-as-you-go GPU pricing:

| GPU    | $/hour | Use Case                      | Cost/Run |
|--------|--------|-------------------------------|----------|
| **T4** | $0.40  | Monte Carlo (100K iter)       | ~$0.01   |
| **A10G**| $1.10 | Parametric sweeps             | ~$0.05   |
| **A100**| $3.00 | ML-MD, DFT calculations       | ~$0.25   |

**Free tier:** $30 credits = ~3,000 Monte Carlo runs or 600 parametric sweeps

## Step 8: Monitor Usage

View usage and logs in the Modal dashboard:

1. Go to [modal.com/apps](https://modal.com/apps)
2. Select `breakthrough-engine-gpu`
3. View:
   - Function calls
   - GPU time used
   - Costs per run
   - Logs and errors

## Troubleshooting

### Error: "No module named 'modal'"
```bash
pip install --upgrade modal
```

### Error: "Not authenticated"
```bash
modal token new
# Follow browser prompt
```

### Error: "GPU quota exceeded"
- Check your usage in the Modal dashboard
- Upgrade to paid tier or wait for quota reset
- Use lower GPU tiers (T4 instead of A100)

### Slow first run
- Modal builds container images on first deploy (~2-3 minutes)
- Subsequent runs use cached images (fast startup)

## Advanced Configuration

### Custom GPU Memory
```python
@stub.function(
    gpu="A10G",
    memory=16384,  # 16GB RAM
    timeout=600,
)
def custom_simulation():
    pass
```

### Concurrent Limits
```python
@stub.function(
    gpu="T4",
    concurrency_limit=10,  # Max 10 parallel runs
)
def limited_simulation():
    pass
```

### Shared Volumes (for large datasets)
```python
from modal import Volume

volume = Volume.from_name("my-dataset")

@stub.function(gpu="A100", volumes={"/data": volume})
def simulation_with_data():
    # Access data in /data directory
    pass
```

## Next Steps

1. ✅ Modal account created and authenticated
2. ✅ GPU functions deployed
3. ✅ Test runs completed successfully
4. 🔄 Integrate with Breakthrough Engine API routes
5. 🔄 Monitor costs and optimize GPU tier selection

For Google Cloud GPU setup, see [GOOGLE_CLOUD_SETUP.md](./GOOGLE_CLOUD_SETUP.md).
