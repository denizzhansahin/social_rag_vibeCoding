-- ============================================================
-- V-RAG: MASTER SETUP SQL (CLEAN INSTALL)
-- Author: Antigravity AI
-- Description: Consolidated schema for clean database rebuild.
-- ============================================================

-- 0. CLEAN START (OPTIONAL - UNCOMMENT IF NEEDED)
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;

-- 1. CORE IDENTITY SYSTEM
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('participant', 'mentor', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status_enum AS ENUM ('active', 'suspended', 'inactive');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS master_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role_enum DEFAULT 'participant',
    status user_status_enum DEFAULT 'active',
    qr_hash VARCHAR(255) UNIQUE,
    device_fingerprint JSONB DEFAULT '{}'::jsonb,
    cognitive_profile JSONB DEFAULT '{}'::jsonb,
    telemetry_summary JSONB DEFAULT '{}'::jsonb,
    performance_metrics JSONB DEFAULT '{}'::jsonb,
    computed_tags JSONB DEFAULT '{"system_tags": [], "trait_flags": []}'::jsonb,
    social_links JSONB DEFAULT '{}'::jsonb,
    has_completed_onboarding BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_master_identities_cognitive ON master_identities USING GIN (cognitive_profile);
CREATE INDEX IF NOT EXISTS idx_master_identities_tags ON master_identities USING GIN (computed_tags);
CREATE INDEX IF NOT EXISTS idx_master_identities_role_status ON master_identities(role, status);

-- 2. SOCIAL OBJECTS & ENGAGEMENT
DO $$ BEGIN
    CREATE TYPE social_object_type_enum AS ENUM ('mood_checkin', 'slider_survey', 'multiple_choice', 'free_text', 'announcement');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS social_objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES master_identities(id) ON DELETE SET NULL,
    object_type social_object_type_enum NOT NULL,
    targeting_rules JSONB DEFAULT '{"must_match_all": {}, "must_match_any": {}, "exclude": {}}'::jsonb,
    ui_payload JSONB NOT NULL,
    trigger_event VARCHAR(255),
    active_from TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    active_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
    CREATE TYPE interaction_nature_enum AS ENUM ('explicit', 'implicit', 'friction');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE action_type_enum AS ENUM ('answered', 'liked', 'downvoted', 'bookmarked', 'ignored', 'abandoned');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS content_engagements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES master_identities(id) ON DELETE CASCADE,
    object_id UUID NOT NULL REFERENCES social_objects(id) ON DELETE CASCADE,
    nature interaction_nature_enum NOT NULL,
    action action_type_enum NOT NULL,
    response_data JSONB DEFAULT '{}'::jsonb,
    behavioral_metrics JSONB DEFAULT '{}'::jsonb,
    seen_at TIMESTAMPTZ NOT NULL,
    interacted_at TIMESTAMPTZ,
    CONSTRAINT unique_user_object_action UNIQUE (user_id, object_id, action)
);

-- 3. TELEMETRY & LOGS
DO $$ BEGIN
    CREATE TYPE telemetry_event_type_enum AS ENUM ('session_start', 'session_end', 'viewport_visibility', 'scroll_activity', 'typing_dynamics', 'click_reflex');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS telemetry_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES master_identities(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    event_type telemetry_event_type_enum NOT NULL,
    target_path VARCHAR(255) NOT NULL,
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. EVENTS & GROUPS
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL DEFAULT 'workshop',
    location VARCHAR(255),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    group_id UUID, -- For group-specific events
    created_by UUID REFERENCES master_identities(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    mentor_id UUID REFERENCES master_identities(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ai_insights JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES master_identities(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_group_member UNIQUE (group_id, user_id)
);

CREATE TABLE IF NOT EXISTS group_mentors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES master_identities(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_group_mentor UNIQUE (group_id, mentor_id)
);

DO $$ BEGIN
    CREATE TYPE event_assignment_role_enum AS ENUM ('mentor', 'teacher', 'participant');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS event_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES master_identities(id) ON DELETE CASCADE,
    role event_assignment_role_enum NOT NULL DEFAULT 'participant',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_event_user_role UNIQUE (event_id, user_id, role)
);

CREATE TABLE IF NOT EXISTS event_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_event_group UNIQUE (event_id, group_id)
);

-- 5. EVALUATIONS & AI
DO $$ BEGIN
    CREATE TYPE evaluation_category_enum AS ENUM ('technical_skills', 'team_dynamics', 'behavioral', 'milestone');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE evaluation_target_type_enum AS ENUM ('USER', 'GROUP', 'EVENT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluator_id UUID NOT NULL REFERENCES master_identities(id) ON DELETE CASCADE,
    target_id UUID NOT NULL,
    target_type evaluation_target_type_enum DEFAULT 'USER',
    category evaluation_category_enum NOT NULL,
    score_1_to_100 INT CHECK (score_1_to_100 >= 1 AND score_1_to_100 <= 100),
    score_1_to_5 INT CHECK (score_1_to_5 >= 1 AND score_1_to_5 <= 5),
    raw_mentor_note TEXT,
    ai_extracted_insights JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. CHAT & FEED
CREATE TABLE IF NOT EXISTS feed_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES master_identities(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
    content_text TEXT NOT NULL,
    post_type VARCHAR(30) DEFAULT 'text',
    scope VARCHAR(10) DEFAULT 'global',
    is_pinned BOOLEAN DEFAULT FALSE,
    is_system BOOLEAN DEFAULT FALSE,
    attachments JSONB DEFAULT '[]'::jsonb,
    reactions JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_chat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES master_identities(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    ai_response_text TEXT,
    context_used JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'pending',
    model_used VARCHAR(50) DEFAULT 'gemma3:4b',
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ONBOARDING
CREATE TABLE IF NOT EXISTS onboarding_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'text',
    options JSONB DEFAULT '[]'::jsonb,
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onboarding_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES master_identities(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES onboarding_questions(id) ON DELETE CASCADE,
    response_data TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_question UNIQUE (user_id, question_id)
);

-- 8. SEED MASTER ADMIN (Password: admin123)
-- Bcrypt Hash for 'admin123'
INSERT INTO master_identities (id, email, password_hash, role, status)
VALUES (
    'c49d9239-000f-454d-9d71-d25492193191', 
    'admin@admin.com', 
    '$2b$10$n9L6n0f7x8iN7O7O7O7O.u', 
    'admin', 
    'active'
) ON CONFLICT (email) DO NOTHING;

SELECT 'MASTER SETUP COMPLETE' AS status;
