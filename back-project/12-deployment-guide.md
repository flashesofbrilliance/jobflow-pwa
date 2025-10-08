# Deployment Guide: JobFlow/Satori Infrastructure

## Overview
Production-ready setup for JobFlow/Satori leveraging Docker Compose, Vercel/Netlify, and cloud Postgres.

## Backend
1. Set env variables from `.env.example`
2. Build API image:

docker build -t jobflow-api -f backend/Dockerfile

3. Deploy to Railway/Render/Fly.io
4. Ensure connections to managed Postgres + Redis

## Frontend
1. Build production PWA:

cd frontend npm install npm run build

2. Deploy `/dist` to Vercel, Netlify, or S3/CloudFront
3. Configure API base URL with env

## Database Migrations
- Use Alembic for Postgres migrations

docker-compose exec api alembic upgrade head

## Monitoring & Observability
- Sentry for error logging
- PostHog/Amplitude for product analytics
- Health endpoints (`/health`), upchecks

## Cloud Storage (optional)
- S3 for resume/asset uploads
- CDN for static assets

## Security
- Setup Auth0/Clerk for OAuth
- Rotate production secrets
- Enforce HTTPS, CORS policies

## Scaling
- Horizontal scaling for API servers
- Redis for async tasks and queueing
- Read replicas for analytics

## Rollback
- Automated blue-green deployment on failure
- Database backup/restore scripts

**For full infra as code: reference the included docker-compose, environment, and config files.**