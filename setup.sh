#!/bin/bash

# Exergy Lab Setup Script
# This script sets up the development environment

set -e

echo "🔬 Exergy Lab - Development Environment Setup"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
echo "📦 Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"
echo ""

# Start PostgreSQL
echo "🗄️  Starting PostgreSQL..."
if docker ps | grep -q exergy-postgres; then
    echo -e "${YELLOW}PostgreSQL container already running${NC}"
else
    docker run -d \
        --name exergy-postgres \
        -e POSTGRES_USER=postgres \
        -e POSTGRES_PASSWORD=postgres \
        -e POSTGRES_DB=exergy_lab \
        -p 5432:5432 \
        postgres:16

    echo "Waiting for PostgreSQL to be ready..."
    sleep 5
fi
echo -e "${GREEN}✅ PostgreSQL ready${NC}"
echo ""

# Setup backend environment
echo "🐍 Setting up backend..."
cd backend

if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}⚠️  Please edit backend/.env and add your ANTHROPIC_API_KEY${NC}"
fi

# Activate virtual environment
if [ ! -d .venv ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv .venv
fi

source .venv/bin/activate

# Install Poetry if not already installed
if ! command -v poetry &> /dev/null; then
    echo "Installing Poetry..."
    pip install poetry
fi

# Install dependencies
echo "Installing Python dependencies..."
poetry install --no-root

# Run database migrations
echo "Running database migrations..."
poetry run alembic upgrade head

cd ..
echo -e "${GREEN}✅ Backend setup complete${NC}"
echo ""

# Setup frontend environment
echo "⚛️  Setting up frontend..."
cd frontend

if [ ! -f .env.local ]; then
    echo "Creating .env.local from .env.example..."
    cp .env.example .env.local
fi

# Dependencies should already be installed, but check
if [ ! -d node_modules ]; then
    echo "Installing Node dependencies..."
    npm install
fi

cd ..
echo -e "${GREEN}✅ Frontend setup complete${NC}"
echo ""

echo "=============================================="
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env and add your ANTHROPIC_API_KEY"
echo "2. Start the backend:"
echo "   cd backend && source .venv/bin/activate && poetry run uvicorn src.main:app --reload"
echo "3. In a new terminal, start the frontend:"
echo "   cd frontend && npm run dev"
echo "4. Open http://localhost:3000 in your browser"
echo ""
echo "To stop PostgreSQL:"
echo "   docker stop exergy-postgres"
echo "To remove PostgreSQL (WARNING: deletes all data):"
echo "   docker rm exergy-postgres"
echo ""
