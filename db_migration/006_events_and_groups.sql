-- ============================================================
-- V-RAG: Etkinlik, Grup ve Üyelik Tabloları
-- ============================================================

-- Etkinlik / Oturum / Atölye tanımları
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL DEFAULT 'workshop', -- workshop, conference, social, meal, free_time
    location VARCHAR(255),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    group_id UUID, -- For group-specific events
    created_by UUID REFERENCES master_identities(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_time ON events (start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_events_type ON events (event_type);
CREATE INDEX IF NOT EXISTS idx_events_group ON events (group_id);

-- Grup yapıları (Takım, Atölye Grubu, Oda vb.)
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    mentor_id UUID REFERENCES master_identities(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ai_insights JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_groups_event ON groups (event_id);
CREATE INDEX IF NOT EXISTS idx_groups_mentor ON groups (mentor_id);

-- Grup üyelikleri (M:N)
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES master_identities(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_group_member UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members (user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members (group_id);

-- ============================================================
SELECT 'EVENTS & GROUPS TABLOLARI OLUSTURULDU' AS durum;
