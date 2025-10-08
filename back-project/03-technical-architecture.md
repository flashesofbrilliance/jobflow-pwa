# Technical Architecture: JobFlow/Satori System Design

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                         │
├─────────────────────────────────────────────────────────┤
│  React PWA (TypeScript)                                 │
│  ├── Frame Storming Interface                           │
│  ├── Discovery Feed                                     │
│  ├── Opportunity Tracker (Kanban)                       │
│  ├── Analytics Dashboard                                │
│  ├── Reflection Journal                                 │
│  └── Shadow Work Tools                                  │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│                    API GATEWAY                          │
├─────────────────────────────────────────────────────────┤
│  FastAPI (Python)                                      │
│  ├── Authentication & Authorization                     │
│  ├── Rate Limiting & Caching                           │
│  ├── Request Validation                                 │
│  └── API Documentation                                  │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│                 CORE SERVICES LAYER                     │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ Frame       │ │ Discovery   │ │ Haystack    │       │
│  │ Storming    │ │ Engine      │ │ Algorithm   │       │
│  │ Service     │ │ Service     │ │ v2.0        │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ Brutal      │ │ Shadow Work │ │ Analytics   │       │
│  │ Honesty     │ │ Engine      │ │ Engine      │       │
│  │ Engine      │ │             │ │             │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│               AI/ML PROCESSING LAYER                    │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ OpenAI      │ │ Hugging     │ │ Custom ML   │       │
│  │ GPT-4       │ │ Face        │ │ Models      │       │
│  │ Integration │ │ Transformers│ │             │       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────────────────────────────────────────┘
                           │
┌─────────────────────────────────────────────────────────┐
│                  DATA LAYER                             │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ PostgreSQL  │ │ Redis       │ │ Vector      │       │
│  │ Primary DB  │ │ Cache       │ │ Database    │       │
│  │             │ │             │ │ (Embeddings)│       │
│  └─────────────┘ └─────────────┘ └─────────────┘       │
└─────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend (PWA)
```typescript
{
  "framework": "React 18.x",
  "language": "TypeScript 5.x",
  "build_tool": "Vite 5.x",
  "styling": "Tailwind CSS + CSS Modules",
  "state_management": "Zustand + React Query",
  "routing": "React Router v6",
  "pwa_tools": "Workbox",
  "testing": "Vitest + React Testing Library",
  "e2e_testing": "Playwright"
}
```

### MVP Frontend Decisions (PWA)

- Offline-first, strict CSP, no live external fetches in the client; all discovery is done via Node scripts and CSV import.
- Minimal UI primitives via CSS tokens; for a11y and consistency we may selectively use Shoelace Web Components (dialog, progress, badge, tabs) bundled locally. No React/TS migration for MVP.
- Delta-only sourcing pipeline as default to minimize noise and repeat decisions.
- Plan & Timebox flow replaces “snooze”: schedule short sessions with ICS and Google Calendar deep links; local reminders via Notification API.
- Gated decisions by Fit + Energy + no barriers; “Force Accept” allowed with one-line justification (logged), never automatic.

### Adaptive Preference Layer (Client)

- Stated preferences (Profile sliders) set initial work style and vibe axes; revealed preferences learned gradually from outcomes and micro-signals.
- Adaptive learning uses bounded EWMA updates; Base + Culture always ≥60% combined; Timing + Alumni ≤20% combined (≤10% each). Weak/ambiguous evidence → neutral contribution.
- Flavor axes (Professionalism, Chill, Follow‑Through, Ethics, GSD/process) and culture tags (e.g., casual_athleisure vs casual_snuggie) contribute small, capped deltas within Culture (≤25%).
- “Kairos” prompts ask consent to adopt changes when divergence between stated and learned is strong and evidence is consistent; segment‑only or global adoption supported.

### Backend (API)
```python
{
  "framework": "FastAPI 0.100+",
  "language": "Python 3.11+",
  "async_framework": "asyncio + uvloop",
  "database_orm": "SQLAlchemy 2.0 (async)",
  "migrations": "Alembic",
  "validation": "Pydantic v2",
  "authentication": "JWT + OAuth2",
  "testing": "pytest + pytest-asyncio",
  "background_jobs": "Celery + Redis"
}
```

### Data & AI
```yaml
databases:
  primary: "PostgreSQL 15+"
  cache: "Redis 7+"
  vector: "Pinecone or Weaviate"
  
ai_ml:
  llm: "OpenAI GPT-4"
  embeddings: "OpenAI text-embedding-ada-002"
  transformers: "Hugging Face Transformers"
  ml_framework: "scikit-learn + pandas"
```

### Infrastructure
```yaml
deployment:
  frontend: "Vercel (PWA optimized)"
  backend: "Railway or Render"
  database: "Supabase or PlanetScale"
  
monitoring:
  errors: "Sentry"
  analytics: "PostHog (privacy-first)"
  performance: "Web Vitals + Grafana"
  
security:
  auth: "Auth0 or Clerk"
  secrets: "Environment variables + Vault"
  compliance: "GDPR ready architecture"
```

## Core Service Architecture

### 1. Frame Storming Service
```python
class FrameStormingService:
    """
    Helps users examine their career framing before discovery begins
    """
    
    async def elicit_frames(self, user_id: str) -> UserFrames:
        """Extract user's current career frames through questioning"""
        
    async def detect_distortions(self, frames: UserFrames) -> List[FrameDistortion]:
        """Identify ego, fear, comparison-based distortions"""
        
    async def facilitate_reframing(self, distortions: List[FrameDistortion]) -> ReframingSession:
        """Guide user through alternative framings"""
        
    async def validate_frame(self, new_frame: ClarifiedFrame) -> FrameValidation:
        """Test frame against evidence and values"""
```

### 2. Enhanced Haystack Algorithm v2.0
```python
class HaystackAlgorithmV2:
    """
    Multi-dimensional opportunity scoring with adaptive learning
    """
    
    def calculate_composite_score(self, 
                                 opportunity: Opportunity, 
                                 user_profile: UserProfile,
                                 weights: WeightMatrix) -> ScoredOpportunity:
        """
        Calculate weighted composite score across 5 dimensions:
        - Base Score (35%): Skills/experience match
        - Culture Score (25%): Work style compatibility  
        - Timing Score (20%): Chronos/Kairos analysis
        - Alumni Score (15%): Team archetype similarity
        - Work Style Score (5%): Communication preferences
        """
        
    def adapt_weights(self, 
                     user_id: str, 
                     outcome: ApplicationOutcome) -> WeightMatrix:
        """Learn from outcomes to improve personal scoring"""
```

### 3. Brutal Honesty Engine
```python
class BrutalHonestyEngine:
    """
    Reality-based opportunity assessment with evidence
    """
    
    def assess_realistic_chances(self, 
                               opportunity: Opportunity,
                               user_profile: UserProfile) -> HonestyAssessment:
        """
        Categories:
        - Realistic Shot: Good probability based on profile
        - Long Shot: Possible with connections/insider help  
        - Brutal Reality: Don't waste time, focus elsewhere
        """
        
    def generate_evidence(self, 
                         assessment: HonestyAssessment) -> Evidence:
        """Provide data backing up the assessment"""
```

### 4. Shadow Work Integration
```python
class ShadowWorkEngine:
    """
    Detect and address the seven career demons
    """
    
    def detect_active_demons(self, 
                           behavior: ApplicationBehavior) -> List[DetectedDemon]:
        """
        Detect: Ego, Hubris, Greed, Fear, Comparison, 
                Perfectionism, Identity attachment
        """
        
    def generate_interventions(self, 
                             demons: List[DetectedDemon]) -> List[Intervention]:
        """Create personalized bias correction prompts"""
```

## Data Architecture

### Entity Relationship Design
```sql
-- Core entities with relationships
Users (1:M) UserProfiles (1:M) ApplicationBehaviors
Users (1:M) Opportunities (M:M) UserOpportunities  
Users (1:M) Reflections (1:1) ReflectionInsights
Users (1:M) FrameStormingSessions (1:M) FrameEvolutions
Opportunities (1:M) CompanyCultureData
```

### Data Flow Architecture
```
External APIs → Raw Data Ingestion → Data Processing Pipeline → 
Feature Engineering → ML Model Training → Real-time Scoring → 
User Interface → User Actions → Outcome Tracking → 
Feedback Loop → Model Updates
```

## API Architecture

### RESTful Endpoints
```yaml
Authentication:
  POST /auth/register
  POST /auth/login
  POST /auth/refresh
  DELETE /auth/logout

Frame Storming:
  GET /frames/current
  POST /frames/storm-session
  PUT /frames/commitment
  GET /frames/evolution

Discovery:
  GET /opportunities/discover
  POST /opportunities/search
  GET /opportunities/{id}/details
  POST /opportunities/score-batch

Tracking:
  GET /tracking/pipeline
  POST /tracking/applications
  PUT /tracking/status/{id}
  POST /tracking/outcomes

Analytics:
  GET /analytics/dashboard  
  GET /analytics/patterns
  GET /analytics/fper-trends
  POST /analytics/track-time

Shadow Work:
  GET /shadow/demons/detect
  POST /shadow/interventions
  GET /shadow/patterns
  PUT /shadow/integration
```

### WebSocket Events (Real-time)
```yaml
Notifications:
  - new_high_fit_opportunity
  - bias_pattern_detected
  - reflection_reminder
  - goal_milestone_achieved

Live Updates:
  - opportunity_score_updated
  - pipeline_status_changed  
  - pattern_insight_generated
```

## Security Architecture

### Authentication Flow
```
1. User registers/logs in via Auth0/Clerk
2. JWT token issued with user claims
3. All API requests include Bearer token
4. Token validation on every protected endpoint
5. Refresh token rotation for security
```

### Data Protection
```yaml
encryption:
  at_rest: "AES-256 for sensitive user data"
  in_transit: "TLS 1.3 for all communications"
  
privacy:
  data_minimization: "Collect only necessary data"
  user_control: "Users can export/delete all data"
  anonymization: "Personal identifiers stripped from analytics"
  
compliance:
  gdpr_ready: "Consent management + right to deletion"
  ccpa_ready: "Data transparency + opt-out mechanisms"
```

## Performance Architecture

### Caching Strategy
```yaml
layers:
  browser: "Service Worker + IndexedDB for offline"
  cdn: "Vercel Edge Network for static assets"
  application: "Redis for API responses"
  database: "PostgreSQL query optimization"

cache_policies:
  user_profile: "24 hours TTL"
  opportunity_scores: "1 hour TTL"  
  company_culture: "7 days TTL"
  market_timing: "30 minutes TTL"
```

### Scaling Strategy
```yaml
horizontal_scaling:
  api_servers: "Auto-scaling containers"
  background_jobs: "Celery worker pools"
  
database_scaling:
  read_replicas: "For analytics queries"
  connection_pooling: "PgBouncer"
  
performance_targets:
  api_response: "<200ms p95"
  page_load: "<2 seconds"
  offline_functionality: "Core features work offline"
```

## Development Architecture

### Local Development Setup
```yaml
requirements:
  - Docker & Docker Compose
  - Node.js 18+ & npm
  - Python 3.11+ & pip
  - PostgreSQL client
  - Redis client

services:
  frontend: "localhost:3000"
  backend: "localhost:8000"  
  database: "localhost:5432"
  redis: "localhost:6379"
  
hot_reload:
  frontend: "Vite dev server"
  backend: "uvicorn --reload"
```

### CI/CD Pipeline
```yaml
stages:
  1. "Code quality: ESLint, Black, mypy"
  2. "Testing: Unit + Integration + E2E"
  3. "Security: Dependency scanning"
  4. "Build: Frontend bundle + Docker images"
  5. "Deploy: Staging → Production"
  
deployment_strategy: "Blue-green with health checks"
rollback_strategy: "Automated rollback on failure"
```

## Monitoring & Observability

### Metrics Collection
```yaml
business_metrics:
  - user_retention_rates
  - fper_improvement_trends
  - application_outcome_rates
  - feature_adoption_rates

technical_metrics:
  - api_response_times
  - error_rates_by_endpoint
  - database_query_performance
  - cache_hit_ratios

user_experience_metrics:
  - page_load_times
  - core_web_vitals
  - offline_functionality_usage
  - user_satisfaction_scores
```

### Alerting Strategy
```yaml
critical_alerts:
  - api_down_for_5_minutes
  - error_rate_above_5_percent
  - database_connection_failures

warning_alerts:
  - response_times_above_1_second
  - cache_hit_ratio_below_80_percent
  - background_job_queue_backlog
```

This architecture enables rapid development while maintaining production-grade reliability, security, and performance. The modular design allows for independent scaling and deployment of different components.
