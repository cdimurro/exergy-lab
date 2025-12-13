# Clean Energy Intelligence Platform

> The intelligence platform for the clean energy transition

## Vision

Build the Bloomberg Terminal for clean energy - but accessible to everyone.

| Feature | Bloomberg Terminal | Our Platform |
|---------|-------------------|--------------|
| Price | $24,000/year | $19.99-499/month |
| Audience | Wall Street | Everyone |
| Data | Financial markets | Clean energy science |
| Analysis | Trading signals | TEA/LCA/Exergy/Discovery |

## Tech Stack

### Frontend
- **Vite** + React + TypeScript
- **TailwindCSS v4** + ShadCN/UI
- **Apache ECharts** - Enterprise-grade visualizations
- **TanStack Query** - Server state management
- **Zustand** - Client state

### Backend
- **Python + FastAPI** - Async API
- **PostgreSQL + TimescaleDB** - Time-series data
- **Redis** - Caching & job queue
- **Celery** - Background jobs

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL 15+
- Redis

### Development

```bash
# Install frontend dependencies
npm install

# Set up Python environment
cd backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Run both frontend and backend
npm run dev:all
```

## Project Structure

```
clean-energy-platform/
├── frontend/          # Vite + React + TypeScript
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom hooks
│   │   ├── lib/          # Utilities
│   │   └── services/     # API clients
│   └── ...
├── backend/           # FastAPI
│   ├── app/
│   │   ├── api/          # API routes
│   │   ├── core/         # Config, security
│   │   ├── models/       # SQLAlchemy models
│   │   ├── schemas/      # Pydantic schemas
│   │   ├── services/     # Business logic
│   │   └── tea/          # TEA calculation engine
│   └── ...
└── shared/            # Shared types/constants
```

## License

Proprietary - All rights reserved.
