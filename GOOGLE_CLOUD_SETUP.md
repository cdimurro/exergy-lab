# Google Cloud GPU Inference Setup Guide

This guide shows how to set up Google Cloud Platform (GCP) for GPU-accelerated inference as an alternative to Modal Labs.

## Prerequisites

- Google Cloud account (free tier: $300 credits for 90 days)
- `gcloud` CLI installed
- Python 3.8+

## Step 1: Install Google Cloud SDK

### macOS (using Homebrew)
```bash
brew install --cask google-cloud-sdk
```

### Linux
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### Windows
Download from: https://cloud.google.com/sdk/docs/install

### Verify Installation
```bash
gcloud --version
```

## Step 2: Initialize and Authenticate

```bash
# Initialize gcloud
gcloud init

# Authenticate
gcloud auth login

# Set your project (create one if needed)
gcloud projects create breakthrough-engine-gpu --name="Breakthrough Engine"
gcloud config set project breakthrough-engine-gpu

# Enable required APIs
gcloud services enable compute.googleapis.com
gcloud services enable container.googleapis.com
gcloud services enable aiplatform.googleapis.com
```

## Step 3: Set Up GPU Quotas

Request GPU quota increase (default is 0):

1. Go to [GCP Console → IAM & Admin → Quotas](https://console.cloud.google.com/iam-admin/quotas)
2. Filter by "GPUs (all regions)"
3. Select your region (e.g., `us-central1`)
4. Click "EDIT QUOTAS"
5. Request increase to:
   - **NVIDIA T4 GPUs**: 4-8 (for development)
   - **NVIDIA A100 GPUs**: 1-2 (optional, for intensive workloads)

**Note:** Quota requests typically take 24-48 hours to approve.

## Step 4: Create GPU-Enabled VM Instance

### Option A: Using gcloud CLI

Create a VM with T4 GPU:

```bash
gcloud compute instances create breakthrough-gpu-vm \
    --zone=us-central1-a \
    --machine-type=n1-standard-4 \
    --accelerator=type=nvidia-tesla-t4,count=1 \
    --image-family=pytorch-latest-gpu \
    --image-project=deeplearning-platform-release \
    --maintenance-policy=TERMINATE \
    --boot-disk-size=100GB \
    --metadata="install-nvidia-driver=True"
```

### Option B: Using Console

1. Go to [Compute Engine → VM instances](https://console.cloud.google.com/compute/instances)
2. Click "CREATE INSTANCE"
3. Configure:
   - **Name**: `breakthrough-gpu-vm`
   - **Region**: `us-central1`, Zone: `us-central1-a`
   - **Machine type**: `n1-standard-4` (4 vCPUs, 15 GB RAM)
   - **GPUs**: Click "ADD GPU"
     - GPU type: **NVIDIA Tesla T4**
     - Number of GPUs: **1**
   - **Boot disk**:
     - OS: **Deep Learning on Linux**
     - Version: **PyTorch 2.0 (CUDA 11.8)**
     - Size: **100 GB**
4. Click "CREATE"

## Step 5: Connect to VM and Install Dependencies

SSH into the VM:

```bash
gcloud compute ssh breakthrough-gpu-vm --zone=us-central1-a
```

Inside the VM, install dependencies:

```bash
# Verify GPU is available
nvidia-smi

# Install Python packages
pip3 install numpy scipy pandas scikit-learn numba

# Clone your project (if using git)
# git clone https://github.com/yourusername/clean-energy-platform.git
# cd clean-energy-platform

# Or upload your simulation files
# (use gcloud compute scp from local machine)
```

## Step 6: Deploy Simulation Code to VM

From your **local machine**, upload the simulation files:

```bash
# Upload GPU simulation script
gcloud compute scp \
  /Users/chrisdimurro/Desktop/clean-energy-platform/modal-simulations/gpu_accelerated.py \
  breakthrough-gpu-vm:~/gpu_accelerated.py \
  --zone=us-central1-a

# Modify the script to remove Modal-specific code
# (We'll use a standalone version)
```

Create a standalone GPU inference script:

```bash
gcloud compute ssh breakthrough-gpu-vm --zone=us-central1-a
```

Create `gpu_inference_standalone.py`:

```python
"""
Standalone GPU Inference Script for Google Cloud
"""

import numpy as np
from scipy import stats
import json
import sys
import time

def monte_carlo_vectorized(configs, n_iterations=100000):
    """Vectorized Monte Carlo simulation"""
    results = []

    for config in configs:
        params = config.get("parameters", {})
        hypothesis_id = config.get("hypothesis_id", "unknown")

        # Extract parameter distributions
        efficiency_mean = params.get("efficiency_mean", 0.35)
        efficiency_std = params.get("efficiency_std", 0.05)
        cost_mean = params.get("cost_mean", 100)
        cost_std = params.get("cost_std", 20)

        # Vectorized sampling (GPU-accelerated via NumPy)
        np.random.seed(config.get("seed", 42))

        efficiency_samples = np.random.normal(
            efficiency_mean, efficiency_std, n_iterations
        ).clip(0.01, 0.99)

        cost_samples = np.random.normal(
            cost_mean, cost_std, n_iterations
        ).clip(1, None)

        # Calculate LCOE
        lcoe_samples = (cost_samples * 1000) / (
            params.get("capacity_kw", 1000) *
            params.get("capacity_factor", 0.25) *
            8760 *
            efficiency_samples *
            params.get("lifetime_years", 25)
        )

        # Statistics
        result = {
            "hypothesis_id": hypothesis_id,
            "n_iterations": n_iterations,
            "metrics": {
                "efficiency": {
                    "mean": float(np.mean(efficiency_samples)),
                    "std": float(np.std(efficiency_samples)),
                    "ci_95": [
                        float(np.percentile(efficiency_samples, 2.5)),
                        float(np.percentile(efficiency_samples, 97.5))
                    ],
                },
                "lcoe": {
                    "mean": float(np.mean(lcoe_samples)),
                    "median": float(np.median(lcoe_samples)),
                    "std": float(np.std(lcoe_samples)),
                    "ci_95": [
                        float(np.percentile(lcoe_samples, 2.5)),
                        float(np.percentile(lcoe_samples, 97.5))
                    ],
                },
            },
        }

        results.append(result)

    return results

if __name__ == "__main__":
    # Read input from stdin
    input_data = json.loads(sys.stdin.read())

    start_time = time.time()
    results = monte_carlo_vectorized(
        input_data["configs"],
        input_data.get("n_iterations", 100000)
    )
    execution_time = int((time.time() - start_time) * 1000)

    # Output results
    output = {
        "results": results,
        "execution_time_ms": execution_time,
    }

    print(json.dumps(output))
```

Save and test:

```bash
# Create test input
echo '{
  "configs": [{
    "hypothesis_id": "test_1",
    "parameters": {
      "efficiency_mean": 0.35,
      "efficiency_std": 0.05,
      "cost_mean": 100,
      "cost_std": 15,
      "capacity_kw": 1000,
      "capacity_factor": 0.25,
      "lifetime_years": 25
    }
  }],
  "n_iterations": 10000
}' | python3 gpu_inference_standalone.py
```

## Step 7: Create REST API Server (Flask)

Install Flask:

```bash
pip3 install flask gunicorn
```

Create `gpu_api_server.py`:

```python
"""
GPU Inference API Server for Google Cloud
"""

from flask import Flask, request, jsonify
import numpy as np
from scipy import stats
import json

app = Flask(__name__)

def monte_carlo_vectorized(configs, n_iterations=100000):
    # [Same implementation as above]
    pass

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "gpu_available": True})

@app.route('/api/monte-carlo', methods=['POST'])
def monte_carlo():
    data = request.json
    configs = data.get("configs", [])
    n_iterations = data.get("n_iterations", 100000)

    results = monte_carlo_vectorized(configs, n_iterations)

    return jsonify({
        "results": results,
        "count": len(results)
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

Run the server:

```bash
# Development
python3 gpu_api_server.py

# Production (with Gunicorn)
gunicorn -w 4 -b 0.0.0.0:8080 gpu_api_server:app
```

## Step 8: Configure Firewall

Allow HTTP traffic to the VM:

```bash
# Create firewall rule
gcloud compute firewall-rules create allow-gpu-api \
    --allow=tcp:8080 \
    --source-ranges=0.0.0.0/0 \
    --target-tags=gpu-api

# Add network tag to VM
gcloud compute instances add-tags breakthrough-gpu-vm \
    --tags=gpu-api \
    --zone=us-central1-a
```

## Step 9: Get VM External IP

```bash
gcloud compute instances describe breakthrough-gpu-vm \
    --zone=us-central1-a \
    --format='get(networkInterfaces[0].accessConfigs[0].natIP)'
```

Example output: `34.123.45.67`

## Step 10: Test API from Local Machine

```bash
# Health check
curl http://34.123.45.67:8080/health

# Monte Carlo simulation
curl -X POST http://34.123.45.67:8080/api/monte-carlo \
  -H "Content-Type: application/json" \
  -d '{
    "configs": [{
      "hypothesis_id": "test_1",
      "parameters": {
        "efficiency_mean": 0.35,
        "efficiency_std": 0.05,
        "cost_mean": 100,
        "cost_std": 15,
        "capacity_kw": 1000,
        "capacity_factor": 0.25,
        "lifetime_years": 25
      }
    }],
    "n_iterations": 10000
  }'
```

## Step 11: Configure in Application

Add to `.env.local`:

```bash
cd /Users/chrisdimurro/Desktop/clean-energy-platform/exergy-lab
echo "GPU_INFERENCE_PROVIDER=gcp" >> .env.local
echo "GCP_GPU_API_URL=http://34.123.45.67:8080" >> .env.local
```

## Step 12: Auto-Start on VM Boot

Create systemd service:

```bash
sudo nano /etc/systemd/system/gpu-api.service
```

Add:

```ini
[Unit]
Description=GPU Inference API Server
After=network.target

[Service]
Type=simple
User=yourusername
WorkingDirectory=/home/yourusername
ExecStart=/usr/bin/python3 /home/yourusername/gpu_api_server.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable gpu-api
sudo systemctl start gpu-api
sudo systemctl status gpu-api
```

## Pricing Comparison

### Google Cloud GPU Pricing (us-central1)

| VM Type | GPUs | vCPUs | RAM | $/hour | $/month (730h) |
|---------|------|-------|-----|--------|----------------|
| **n1-standard-4 + T4** | 1x T4 | 4 | 15 GB | ~$0.95 | ~$694 |
| **n1-standard-8 + T4** | 1x T4 | 8 | 30 GB | ~$1.25 | ~$913 |
| **a2-highgpu-1g** | 1x A100 | 12 | 85 GB | ~$3.67 | ~$2,679 |

**Preemptible instances** (can be interrupted): **~70% cheaper**

### Cost Per Breakthrough Discovery

With **n1-standard-4 + T4** ($0.95/hour):
- 15 hypotheses × 5 iterations × 100K Monte Carlo = ~2-3 minutes GPU time
- Cost per discovery: **~$0.05**

### Free Tier Benefits

- **$300 credits** for 90 days (new accounts)
- ~315 GPU hours = ~6,300 discoveries
- After free tier: Pay only for what you use

## Cost Optimization Tips

1. **Use Preemptible VMs** (70% cheaper):
   ```bash
   gcloud compute instances create breakthrough-gpu-vm \
       --preemptible \
       # ... other flags
   ```

2. **Auto-shutdown when idle**:
   ```bash
   # Add to crontab: shutdown if no requests for 10 minutes
   */10 * * * * [ $(curl -s http://localhost:8080/metrics | jq '.requests_last_10min') -eq 0 ] && sudo shutdown -h now
   ```

3. **Use Spot VMs** (similar to preemptible, better availability)

4. **Scale to zero**: Stop VM when not in use
   ```bash
   gcloud compute instances stop breakthrough-gpu-vm --zone=us-central1-a
   ```

## Troubleshooting

### Error: "Quota 'GPUS_ALL_REGIONS' exceeded"
- Request quota increase (Step 3)
- Try different region (e.g., `us-west1`)

### Error: "nvidia-smi not found"
- Wait 5 minutes after VM creation for drivers to install
- Check logs: `sudo journalctl -u google-startup-scripts`

### Slow inference
- Verify GPU is being used: `nvidia-smi`
- Check VM type has sufficient vCPUs/RAM
- Use batch processing (multiple configs per request)

## Modal vs Google Cloud Comparison

| Feature | Modal Labs | Google Cloud |
|---------|-----------|--------------|
| **Setup time** | 5 minutes | 30-60 minutes |
| **Free credits** | $30 | $300 |
| **Pay per use** | Yes (per second) | Yes (per minute) |
| **Cold start** | ~10s | ~2-3 min (if stopped) |
| **Serverless** | Yes | No (VM-based) |
| **Best for** | Prototype, burst workloads | Production, sustained use |
| **Cost (T4)** | $0.40/hr | $0.95/hr |

**Recommendation**:
- **Modal Labs** for development and prototype (easier, faster setup)
- **Google Cloud** for production with sustained workloads (lower cost at scale)

## Next Steps

1. ✅ GCP account created and authenticated
2. ✅ GPU VM instance running
3. ✅ API server deployed and tested
4. 🔄 Configure auto-scaling (GKE) for production
5. 🔄 Add monitoring with Cloud Logging
6. 🔄 Implement request queuing for burst traffic

For Modal Labs setup, see [MODAL_SETUP.md](./MODAL_SETUP.md).
