-- ============================================================
-- V-RAG: Advanced Event & Group Management Refinements
-- ============================================================

-- Role defining for context-specific event assignments
DO $$ BEGIN
    CREATE TYPE event_assignment_role_enum AS ENUM ('mentor', 'teacher', 'participant');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- M:N relationship between Events and Users (Mentors, Teachers, Participants)
CREATE TABLE IF NOT EXISTS event_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES master_identities(id) ON DELETE CASCADE,
    role event_assignment_role_enum NOT NULL DEFAULT 'participant',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_event_user_role UNIQUE (event_id, user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_event_assign_event ON event_assignments (event_id);
CREATE INDEX IF NOT EXISTS idx_event_assign_user ON event_assignments (user_id);
CREATE INDEX IF NOT EXISTS idx_event_assign_role ON event_assignments (role);

-- M:N relationship between Events and Groups (multiple groups per event)
CREATE TABLE IF NOT EXISTS event_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_event_group UNIQUE (event_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_event_groups_event ON event_groups (event_id);
CREATE INDEX IF NOT EXISTS idx_event_groups_group ON event_groups (group_id);

-- ============================================================
SELECT 'ADVANCED ASSIGNMENT TABLOLARI OLUSTURULDU' AS durum;
