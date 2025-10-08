# Database Schema: JobFlow/Satori Data Model

## Complete Database Schema (PostgreSQL)

### Core User Management
```sql
-- Users table (authentication & basic info)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Profile completion tracking
    onboarding_completed BOOLEAN DEFAULT FALSE,
    frame_storming_completed BOOLEAN DEFAULT FALSE,
    
    -- Subscription & features
    subscription_tier VARCHAR(20) DEFAULT 'free', -- free, premium, enterprise
    subscription_expires_at TIMESTAMP,
    
    -- Privacy settings
    data_sharing_consent BOOLEAN DEFAULT FALSE,
    analytics_consent BOOLEAN DEFAULT TRUE
);

-- User profiles (detailed professional information)
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Basic profile info
    full_name VARCHAR(255),
    location VARCHAR(255),
    timezone VARCHAR(50),
    
    -- Professional background
    current_title VARCHAR(255),
    experience_years INTEGER,
    career_level VARCHAR(50), -- junior, mid, senior, staff, principal, executive
    
    -- Skills & expertise  
    skills JSONB, -- ["Product Management", "Python", "SQL", ...]
    industries JSONB, -- ["Fintech", "Climate Tech", "AI/ML", ...]
    
    -- Work preferences
    target_roles JSONB,
    target_industries JSONB, 
    target_company_stages JSONB, -- ["seed", "series_a", "series_b", "growth", "public"]
    remote_preference VARCHAR(20), -- remote, hybrid, onsite
    
    -- Compensation expectations
    salary_min INTEGER,
    salary_max INTEGER,
    equity_importance INTEGER, -- 1-10 scale
    
    -- Resume & documents
    resume_text TEXT,
    portfolio_url VARCHAR(500),
    linkedin_url VARCHAR(500),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Local PWA (IndexedDB) Schema for MVP

To support offline-first development, the PWA maintains a local schema that mirrors core server entities. These fields should map directly to the PostgreSQL design above where applicable.

### opportunities (key: id)
- identity: id, company, role, job_url, segment, location, created_at, posted_at, deadline, hash
- pipeline: status, stage_history[], applied_at, interviewed_at, outcome, outcome_at
- scoring: base_score, culture_score, timing_score, alumni_score, work_style_score, total_fit, energy_score, honesty_label, honesty_evidence[], culture_dims{comm,pace,feedback,collab}, barriers[]
- planning: next_action{ type, durationMin, planned_at, planned_source }, sessions[{ planned_at, started_at, ended_at, type, durationMin, outcome, note }]
- import/aux: applicant_volume, interest_score, notes
- decision_context at apply: { frame_id, frame_committed, gates_used, force_accept, fit_at_apply, energy_at_apply, honesty_at_apply }

### profile (key: profile)
- stated.work_style: { comm, pace, feedback, collab }
- stated.vibe_axes: { professionalism, chill, follow_through, ethics, gsd_tilt }
- gates: { min_fit, min_energy }
- weights: { base, culture, timing, alumni, work_style } (normalized; timing/alumni ≤ 0.10 each)
- learned (same shape) and tag_prefs (e.g., { casual_athleisure: 0, casual_snuggie: 0, ... })
- segment_overrides: map of segment → partial overrides
- current_frame: { id, title, summary, committed_at }

### reflections (key: id)
- ts, type (‘pre_apply’ | ‘post_interview’ | ‘weekly’ | ‘frame_storm’), text, tags[], sentiment

### analytics_snapshots (key: id)
- week, fper, time_to_first_interview, conversions{ applied, interview, offer }, by_segment{}

### goals (key: key)
- weekly_target_sessions, fper_target, streak, history

### user_preferences (key: key)
- ui flags (e.g., gated view toggle)

### Work Style & Personality Assessment  
```sql
-- Work style preferences (4-dimensional matrix)
CREATE TABLE work_style_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- 4-dimensional work style (1-10 scales)
    communication_style INTEGER, -- 1=formal, 10=informal
    work_pace INTEGER, -- 1=chill, 10=intense
    feedback_style INTEGER, -- 1=kind, 10=blunt  
    collaboration_level INTEGER, -- 1=independent, 10=collaborative
    
    -- Energy patterns
    energy_drivers JSONB, -- ["autonomy", "mastery", "purpose", "recognition"]
    energy_drains JSONB, -- ["politics", "bureaucracy", "micromanagement"]
    
    -- Personality assessment
    mbti_type VARCHAR(4),
    big5_scores JSONB, -- {openness: 8, conscientiousness: 7, ...}
    
    -- Confidence scores
    assessment_confidence DECIMAL(3,2) DEFAULT 0.5,
    last_validated TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Shadow work & bias tracking
CREATE TABLE shadow_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- The seven career demons (0-10 severity scales)
    ego_demon_strength INTEGER DEFAULT 0,
    hubris_demon_strength INTEGER DEFAULT 0,
    greed_demon_strength INTEGER DEFAULT 0,
    fear_demon_strength INTEGER DEFAULT 0,
    comparison_demon_strength INTEGER DEFAULT 0,
    perfectionism_demon_strength INTEGER DEFAULT 0,
    identity_demon_strength INTEGER DEFAULT 0,
    
    -- Detected biases & patterns
    detected_biases JSONB,
    bias_interventions JSONB,
    integration_progress JSONB,
    
    -- Shadow work engagement
    total_interventions_received INTEGER DEFAULT 0,
    interventions_accepted INTEGER DEFAULT 0,
    shadow_work_sessions INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Frame Storming & Career Clarity
```sql
-- Frame storming sessions
CREATE TABLE frame_storming_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Session metadata
    session_type VARCHAR(50), -- initial, evolution, crisis, periodic
    duration_minutes INTEGER,
    completion_status VARCHAR(20), -- started, completed, abandoned
    
    -- Frame elicitation
    initial_frames JSONB,
    frame_quality_score DECIMAL(3,2),
    detected_distortions JSONB,
    
    -- Reframing process
    alternative_frames JSONB,
    frame_testing_results JSONB,
    final_clarified_frame JSONB,
    
    -- Confidence & validation
    frame_confidence DECIMAL(3,2),
    evidence_supporting JSONB,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Frame evolution tracking  
CREATE TABLE frame_evolutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Evolution tracking
    previous_frame JSONB,
    new_frame JSONB,
    evolution_trigger VARCHAR(100), -- outcome, reflection, crisis, growth
    evolution_description TEXT,
    
    -- Impact analysis
    search_behavior_changes JSONB,
    outcome_improvements JSONB,
    satisfaction_changes JSONB,
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Opportunities & Companies
```sql
-- Companies (enriched data about potential employers)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    domain VARCHAR(255),
    
    -- Basic info
    size_category VARCHAR(20), -- startup, growth, enterprise
    employee_count_min INTEGER,
    employee_count_max INTEGER,
    industry VARCHAR(100),
    
    -- Funding & growth
    stage VARCHAR(50), -- seed, series_a, series_b, series_c, growth, public
    last_funding_amount BIGINT,
    last_funding_date DATE,
    total_funding BIGINT,
    valuation BIGINT,
    
    -- Culture signals (computed)
    communication_style_score INTEGER, -- 1-10 (formal to informal)
    work_pace_score INTEGER, -- 1-10 (chill to intense)  
    feedback_style_score INTEGER, -- 1-10 (kind to blunt)
    collaboration_score INTEGER, -- 1-10 (independent to collaborative)
    
    -- Reputation data
    glassdoor_rating DECIMAL(3,2),
    glassdoor_reviews_count INTEGER,
    glassdoor_ceo_approval DECIMAL(3,2),
    
    -- Social presence
    linkedin_followers INTEGER,
    website_tone_analysis JSONB,
    
    -- Hiring patterns
    typical_hiring_timeline INTEGER, -- days
    hiring_velocity_score INTEGER, -- 1-10
    alumni_networks JSONB,
    
    -- Data quality
    data_confidence DECIMAL(3,2) DEFAULT 0.5,
    last_enriched TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Opportunities (job openings with enhanced data)
CREATE TABLE opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    
    -- Basic job info
    title VARCHAR(500) NOT NULL,
    department VARCHAR(100),
    location VARCHAR(255),
    remote_type VARCHAR(20), -- remote, hybrid, onsite
    
    -- Compensation
    salary_min INTEGER,
    salary_max INTEGER,
    equity_offered BOOLEAN DEFAULT FALSE,
    equity_range VARCHAR(100),
    
    -- Job details
    description TEXT,
    requirements TEXT,
    responsibilities TEXT,
    
    -- Metadata
    source VARCHAR(100), -- linkedin, angellist, company_site, referral
    external_url VARCHAR(500),
    posted_date DATE,
    application_deadline DATE,
    
    -- Enhanced data (computed)
    seniority_level VARCHAR(50),
    skills_required JSONB,
    experience_years_min INTEGER,
    experience_years_max INTEGER,
    
    -- Difficulty & demand analysis
    competition_level INTEGER, -- 1-10 (estimated)
    urgency_level INTEGER, -- 1-10 (how quickly they need to fill)
    
    -- Timing intelligence
    market_timing_score INTEGER, -- 1-10 (market conditions)
    company_timing_score INTEGER, -- 1-10 (company specific timing)
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- active, filled, expired, removed
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### User-Opportunity Interactions & Scoring
```sql
-- User opportunity scoring & tracking
CREATE TABLE user_opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES opportunities(id),
    
    -- Fit scoring (Haystack Algorithm v2.0)
    base_score DECIMAL(5,2), -- Skills/experience match
    culture_score DECIMAL(5,2), -- Work style compatibility  
    timing_score DECIMAL(5,2), -- Chronos/Kairos analysis
    alumni_score DECIMAL(5,2), -- Team archetype similarity
    work_style_score DECIMAL(5,2), -- Communication preferences
    composite_score DECIMAL(5,2), -- Weighted final score
    
    -- Scoring metadata
    weights_used JSONB, -- Weight matrix used for scoring
    scoring_confidence DECIMAL(3,2),
    scoring_timestamp TIMESTAMP DEFAULT NOW(),
    
    -- Brutal honesty assessment
    honesty_assessment VARCHAR(20), -- realistic_shot, long_shot, brutal_reality
    honesty_reasoning TEXT,
    success_probability DECIMAL(3,2), -- 0.0 to 1.0
    
    -- Energy & bias predictions
    energy_prediction INTEGER, -- 1-10 predicted energy level
    detected_biases JSONB, -- Biases that might affect this decision
    bias_adjustments JSONB, -- Applied bias corrections
    
    -- User interaction tracking
    first_seen TIMESTAMP DEFAULT NOW(),
    last_viewed TIMESTAMP,
    view_count INTEGER DEFAULT 1,
    time_spent_seconds INTEGER DEFAULT 0,
    
    -- Application pipeline status
    status VARCHAR(20) DEFAULT 'discovered', 
    -- discovered, saved, qualified, applied, interviewing, offered, rejected, accepted, withdrawn
    status_updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Application details
    applied_at TIMESTAMP,
    application_method VARCHAR(50), -- direct, referral, recruiter
    application_notes TEXT,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Application outcomes & feedback
CREATE TABLE application_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_opportunity_id UUID REFERENCES user_opportunities(id) ON DELETE CASCADE,
    
    -- Outcome details
    outcome_type VARCHAR(20), -- interview, rejection, ghosted, offer, hired, withdrawn
    outcome_date TIMESTAMP DEFAULT NOW(),
    time_to_outcome_days INTEGER,
    
    -- Detailed feedback
    rejection_reason VARCHAR(100), -- skills_gap, culture_mismatch, experience, overqualified, timing
    interview_stages_completed INTEGER,
    final_interview_feedback TEXT,
    
    -- Accuracy validation
    predicted_outcome VARCHAR(20),
    prediction_accuracy BOOLEAN,
    surprise_factors JSONB, -- What the user didn't expect
    
    -- Energy & satisfaction tracking
    actual_energy_level INTEGER, -- 1-10 how energizing was the process
    process_satisfaction INTEGER, -- 1-10 satisfaction with interview process
    
    -- Long-term tracking (if hired)
    six_month_satisfaction INTEGER, -- 1-10 job satisfaction after 6 months
    twelve_month_satisfaction INTEGER,
    role_duration_days INTEGER,
    
    -- Learning & insights
    user_reflection TEXT,
    key_learnings JSONB,
    would_apply_again BOOLEAN,
    
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Analytics & Pattern Recognition
```sql
-- User analytics (aggregated performance data)
CREATE TABLE user_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Time period
    period_start DATE,
    period_end DATE,
    period_type VARCHAR(20), -- weekly, monthly, quarterly, annual
    
    -- Application metrics
    total_applications INTEGER DEFAULT 0,
    total_interviews INTEGER DEFAULT 0,
    total_offers INTEGER DEFAULT 0,
    
    -- Conversion rates
    application_to_interview_rate DECIMAL(5,4),
    interview_to_offer_rate DECIMAL(5,4),
    overall_success_rate DECIMAL(5,4),
    
    -- False Positive Error Rate (FPER)
    false_positive_applications INTEGER, -- Applications that went nowhere
    false_positive_rate DECIMAL(5,4),
    fper_improvement_trend DECIMAL(5,4), -- vs previous period
    
    -- Time efficiency  
    average_time_per_application INTEGER, -- minutes
    total_time_invested INTEGER, -- minutes
    time_to_first_interview_days INTEGER,
    time_to_first_offer_days INTEGER,
    
    -- Pattern analysis
    most_successful_company_types JSONB,
    most_successful_role_types JSONB,
    energy_boosting_patterns JSONB,
    energy_draining_patterns JSONB,
    
    -- Bias & shadow work progress
    bias_interventions_received INTEGER,
    bias_interventions_accepted INTEGER,
    shadow_work_engagement_score INTEGER, -- 1-10
    
    -- Scoring accuracy
    haystack_prediction_accuracy DECIMAL(5,4),
    brutal_honesty_accuracy DECIMAL(5,4),
    energy_prediction_accuracy DECIMAL(5,4),
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Pattern insights (ML-generated insights about user behavior)  
CREATE TABLE pattern_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Insight metadata
    insight_type VARCHAR(50), -- success_pattern, failure_pattern, bias_detection, opportunity
    confidence_level DECIMAL(3,2),
    actionability_score INTEGER, -- 1-10 how actionable this insight is
    
    -- Insight content
    title VARCHAR(255),
    description TEXT,
    evidence JSONB, -- Supporting data for the insight
    
    -- Recommendations
    suggested_actions JSONB,
    behavioral_changes JSONB,
    
    -- User interaction
    shown_to_user BOOLEAN DEFAULT FALSE,
    user_acknowledged BOOLEAN DEFAULT FALSE,
    user_rating INTEGER, -- 1-10 how useful was this insight
    
    -- Impact tracking
    actions_taken JSONB,
    outcome_improvement JSONB,
    
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP -- Insights can become stale
);
```

### Reflection & Personal Development
```sql
-- Reflection sessions & journaling
CREATE TABLE reflections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Reflection metadata
    reflection_type VARCHAR(50), -- daily, weekly, monthly, decision, crisis, celebration
    prompt_text TEXT,
    time_boxed_minutes INTEGER,
    
    -- Reflection content
    user_response TEXT,
    reflection_depth INTEGER, -- 1-10 subjective depth score
    
    -- Context
    related_opportunity_id UUID,
    related_outcome_id UUID,
    trigger_event VARCHAR(100), -- rejection, offer, milestone, scheduled
    
    -- Analysis (ML-generated)
    sentiment_score DECIMAL(3,2), -- -1 to 1
    themes_extracted JSONB,
    insights_generated JSONB,
    patterns_detected JSONB,
    
    -- Personal development tracking
    growth_areas_identified JSONB,
    progress_celebrated JSONB,
    next_actions JSONB,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Goal setting & accountability
CREATE TABLE career_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Goal definition
    goal_type VARCHAR(50), -- outcome, behavior, learning, growth
    title VARCHAR(255),
    description TEXT,
    
    -- SMART goal criteria
    specific_criteria JSONB,
    measurable_metrics JSONB,
    achievable_confidence INTEGER, -- 1-10
    relevant_reasoning TEXT,
    time_bound_deadline DATE,
    
    -- Progress tracking
    status VARCHAR(20), -- active, paused, completed, abandoned
    completion_percentage INTEGER DEFAULT 0,
    milestones_achieved JSONB,
    
    -- Accountability
    check_in_frequency VARCHAR(20), -- daily, weekly, biweekly, monthly
    last_check_in TIMESTAMP,
    accountability_partner_email VARCHAR(255),
    
    -- Outcome
    completion_date TIMESTAMP,
    success_level INTEGER, -- 1-10 how successful was achievement
    learnings JSONB,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### System Configuration & Meta-data
```sql
-- Weight matrices for personalized scoring
CREATE TABLE weight_matrices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Weight configuration
    matrix_type VARCHAR(20), -- personal, cohort, global
    
    -- Haystack algorithm weights (must sum to 1.0)
    base_weight DECIMAL(3,2) DEFAULT 0.35,
    culture_weight DECIMAL(3,2) DEFAULT 0.25,
    timing_weight DECIMAL(3,2) DEFAULT 0.20,
    alumni_weight DECIMAL(3,2) DEFAULT 0.15,
    work_style_weight DECIMAL(3,2) DEFAULT 0.05,
    
    -- Bias correction weights
    ego_correction_strength DECIMAL(3,2) DEFAULT 0.5,
    hubris_correction_strength DECIMAL(3,2) DEFAULT 0.5,
    fear_correction_strength DECIMAL(3,2) DEFAULT 0.5,
    
    -- Meta-parameters
    confidence_level DECIMAL(3,2) DEFAULT 0.5,
    sample_size INTEGER DEFAULT 0, -- Outcomes used to train these weights
    performance_score DECIMAL(5,4), -- How well these weights predict outcomes
    
    -- Lifecycle
    active BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- System configuration & feature flags
CREATE TABLE system_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB,
    description TEXT,
    
    -- Change management
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## Indexes for Performance

```sql
-- User lookup indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;

-- Profile lookup indexes  
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_work_style_profiles_user_id ON work_style_profiles(user_id);

-- Opportunity discovery indexes
CREATE INDEX idx_opportunities_active ON opportunities(status) WHERE status = 'active';
CREATE INDEX idx_opportunities_posted ON opportunities(posted_date DESC);
CREATE INDEX idx_opportunities_company ON opportunities(company_id);
CREATE INDEX idx_opportunities_location ON opportunities(location);
CREATE INDEX idx_opportunities_remote ON opportunities(remote_type);

-- User-opportunity relationship indexes
CREATE INDEX idx_user_opportunities_user ON user_opportunities(user_id);
CREATE INDEX idx_user_opportunities_status ON user_opportunities(status);
CREATE INDEX idx_user_opportunities_score ON user_opportunities(composite_score DESC);
CREATE INDEX idx_user_opportunities_created ON user_opportunities(created_at DESC);

-- Analytics indexes
CREATE INDEX idx_application_outcomes_user ON application_outcomes(user_opportunity_id);
CREATE INDEX idx_user_analytics_user_period ON user_analytics(user_id, period_start);
CREATE INDEX idx_reflections_user_type ON reflections(user_id, reflection_type);

-- Performance indexes
CREATE INDEX idx_companies_domain ON companies(domain);
CREATE INDEX idx_pattern_insights_user ON pattern_insights(user_id, created_at DESC);
```

## Data Relationships Summary

- **Users** have detailed **profiles**, **work styles**, and **shadow profiles**
- **Frame storming** tracks career clarity evolution over time  
- **Companies** have enriched culture and hiring pattern data
- **Opportunities** are scored individually for each user via **user_opportunities**
- **Application outcomes** feed back into **analytics** and **pattern recognition**
- **Reflections** and **goals** support personal development journey
- **Weight matrices** enable personalized algorithm optimization

This schema supports the complete JobFlow/Satori feature set while maintaining performance, data integrity, and extensibility for future features.
