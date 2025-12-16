#!/bin/bash

# Modal Labs Deployment Script for Clean Energy Simulations
# This script deploys the GPU simulation service to Modal

set -e  # Exit on any error

echo "🚀 Deploying Clean Energy GPU Simulations to Modal..."

# Check if modal CLI is installed
if ! command -v modal &> /dev/null; then
    echo "❌ Error: Modal CLI is not installed"
    echo "Install it with: pip install modal"
    exit 1
fi

# Check if user is authenticated
if ! modal token set 2>/dev/null; then
    echo "❌ Error: Not authenticated with Modal"
    echo "Run: modal token new"
    exit 1
fi

echo "✅ Modal CLI found and authenticated"

# Deploy the application
echo "📦 Deploying simulation_runner.py..."
modal deploy simulation_runner.py

echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Copy the endpoint URL from the Modal dashboard"
echo "2. Add it to your .env.local file as MODAL_ENDPOINT"
echo "3. Set ENABLE_CLOUD_GPU=true to enable GPU simulations"
echo ""
echo "🔗 View your deployment: https://modal.com/apps"
