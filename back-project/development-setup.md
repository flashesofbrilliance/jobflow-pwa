# Development Setup Files

## package.json (Frontend Dependencies)
```json
{
  "name": "jobflow-pwa",
  "version": "1.0.0", 
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:e2e": "playwright test",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "format": "prettier --write \"src/**/*.{ts,tsx,css,md}\"",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.1",
    "@tanstack/react-query": "^4.24.6",
    "zustand": "^4.3.2",
    "@dnd-kit/core": "^6.0.7",
    "@dnd-kit/sortable": "^7.0.2",
    "@dnd-kit/utilities": "^3.2.1",
    "framer-motion": "^10.0.1",
    "date-fns": "^2.29.3",
    "recharts": "^2.5.0",
    "react-hook-form": "^7.43.1",
    "@hookform/resolvers": "^2.9.11",
    "zod": "^3.20.6",
    "clsx": "^1.2.1",
    "tailwind-merge": "^1.10.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.27",
    "@types/react-dom": "^18.0.10",
    "@typescript-eslint/eslint-plugin": "^5.54.0",
    "@typescript-eslint/parser": "^5.54.0",
    "@vitejs/plugin-react": "^3.1.0",
    "typescript": "^4.9.3",
    "vite": "^4.1.0",
    "vite-plugin-pwa": "^0.14.4",
    "workbox-window": "^6.5.4",
    "eslint": "^8.35.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.3.4",
    "vitest": "^0.28.5",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^5.16.5",
    "jsdom": "^21.1.0",
    "playwright": "^1.31.0",
    "prettier": "^2.8.4",
    "tailwindcss": "^3.2.7",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.21"
  },
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
```

## requirements.txt (Python Backend Dependencies)
```
# Core Framework
fastapi==0.100.1
uvicorn[standard]==0.23.2
python-multipart==0.0.6

# Database
sqlalchemy==2.0.19
alembic==1.11.1
asyncpg==0.28.0
psycopg2-binary==2.9.7

# Authentication & Security
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-oauth2==1.1.1

# Validation & Serialization  
pydantic==2.1.1
pydantic-settings==2.0.2

# AI/ML & NLP
openai==0.27.8
transformers==4.32.0
torch==2.0.1
scikit-learn==1.3.0
pandas==2.0.3
numpy==1.24.3

# Background Jobs
celery==5.3.1
redis==4.6.0

# HTTP & External APIs
httpx==0.24.1
aiohttp==3.8.5

# Utilities
python-dateutil==2.8.2
pytz==2023.3
loguru==0.7.0

# Development
pytest==7.4.0
pytest-asyncio==0.21.1
black==23.7.0
isort==5.12.0
mypy==1.5.1
pre-commit==3.3.3

# Monitoring
sentry-sdk[fastapi]==1.29.2

# Environment
python-dotenv==1.0.0
```

## docker-compose.yml (Local Development)
```yaml
version: '3.8'

services:
  # PostgreSQL Database
  postgres:
    image: postgres:15-alpine
    container_name: jobflow_postgres
    environment:
      POSTGRES_DB: jobflow_dev
      POSTGRES_USER: jobflow
      POSTGRES_PASSWORD: dev_password_change_in_prod
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U jobflow -d jobflow_dev"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis Cache
  redis:
    image: redis:7-alpine
    container_name: jobflow_redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Backend API
  api:
    build: 
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: jobflow_api
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://jobflow:dev_password_change_in_prod@postgres:5432/jobflow_dev
      - REDIS_URL=redis://redis:6379
      - ENVIRONMENT=development
      - LOG_LEVEL=debug
    volumes:
      - ./backend:/app
      - /app/.venv
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Celery Worker (Background Jobs)
  celery:
    build:
      context: ./backend
      dockerfile: Dockerfile.dev
    container_name: jobflow_celery
    environment:
      - DATABASE_URL=postgresql://jobflow:dev_password_change_in_prod@postgres:5432/jobflow_dev
      - REDIS_URL=redis://redis:6379
      - ENVIRONMENT=development
    volumes:
      - ./backend:/app
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    command: celery -A app.worker worker --loglevel=info

  # Frontend (Development)
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    container_name: jobflow_frontend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - VITE_API_BASE_URL=http://localhost:8000
      - VITE_ENVIRONMENT=development
    command: npm run dev

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    name: jobflow_network
```

## .env.example (Environment Variables)
```bash
# Application
ENVIRONMENT=development
DEBUG=true
SECRET_KEY=your-secret-key-change-in-production
API_BASE_URL=http://localhost:8000

# Database
DATABASE_URL=postgresql://jobflow:password@localhost:5432/jobflow_dev
DB_HOST=localhost
DB_PORT=5432
DB_NAME=jobflow_dev
DB_USER=jobflow
DB_PASSWORD=password

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Authentication
JWT_SECRET_KEY=your-jwt-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# OAuth Providers
AUTH0_DOMAIN=your-auth0-domain
AUTH0_CLIENT_ID=your-auth0-client-id  
AUTH0_CLIENT_SECRET=your-auth0-client-secret

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# AI/ML Services
OPENAI_API_KEY=your-openai-api-key
OPENAI_ORG_ID=your-openai-org-id

HUGGINGFACE_API_KEY=your-huggingface-api-key

# External APIs
CRUNCHBASE_API_KEY=your-crunchbase-api-key
GLASSDOOR_API_KEY=your-glassdoor-api-key
LINKEDIN_API_TOKEN=your-linkedin-api-token

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Monitoring & Analytics
SENTRY_DSN=your-sentry-dsn
POSTHOG_API_KEY=your-posthog-api-key
GRAFANA_API_KEY=your-grafana-api-key

# Storage (if using cloud storage)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=jobflow-assets

# Feature Flags
ENABLE_SHADOW_WORK=true
ENABLE_FRAME_STORMING=true
ENABLE_BRUTAL_HONESTY=true
ENABLE_ANALYTICS=true

# Rate Limiting
RATE_LIMIT_PER_MINUTE=100
RATE_LIMIT_BURST=200

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Development
HOT_RELOAD=true
AUTO_MIGRATION=true
SEED_DATABASE=true
```

## Dockerfile (Production)
```dockerfile
# Multi-stage build for production

# Frontend Build Stage
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ ./
RUN npm run build

# Backend Build Stage  
FROM python:3.11-slim AS backend-build
WORKDIR /app/backend

# Install system dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        curl \
        libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Production Stage
FROM python:3.11-slim AS production

# Install runtime dependencies
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libpq5 \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r jobflow && useradd -r -g jobflow jobflow

# Set up application directory
WORKDIR /app
RUN chown -R jobflow:jobflow /app

# Copy Python dependencies
COPY --from=backend-build /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=backend-build /usr/local/bin /usr/local/bin

# Copy application code
COPY --chown=jobflow:jobflow backend/ ./backend/
COPY --from=frontend-build --chown=jobflow:jobflow /app/frontend/dist ./frontend/dist/

# Switch to non-root user
USER jobflow

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# Start application
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Quick Start Instructions

### Prerequisites
```bash
# Install required tools
- Docker & Docker Compose
- Node.js 18+ & npm
- Python 3.11+ & pip
- Git
```

### Setup (5 minutes)
```bash
# 1. Clone repository
git clone <repository-url>
cd jobflow

# 2. Copy environment variables
cp .env.example .env
# Edit .env with your actual values

# 3. Start development environment
docker-compose up -d

# 4. Run database migrations
docker-compose exec api alembic upgrade head

# 5. Seed development data
docker-compose exec api python scripts/seed_dev_data.py

# 6. Access applications
# - Frontend: http://localhost:3000
# - Backend API: http://localhost:8000
# - API Docs: http://localhost:8000/docs
```

### Development Workflow
```bash
# Run tests
npm test                    # Frontend tests
docker-compose exec api pytest  # Backend tests

# Format code
npm run format             # Frontend formatting
docker-compose exec api black .  # Backend formatting

# View logs
docker-compose logs -f api      # Backend logs
docker-compose logs -f frontend # Frontend logs

# Reset database
docker-compose exec api alembic downgrade base
docker-compose exec api alembic upgrade head
```

This setup provides a complete development environment that matches production architecture while enabling rapid iteration and testing.