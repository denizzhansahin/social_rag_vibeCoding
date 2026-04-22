-- ============================================================
-- V-RAG Migration 012: Production Mentor System
-- Çoklu mentör desteği, feed posts, social_objects güncelleme
-- ============================================================

-- 1. Çoklu Mentör M:N Tablosu
CREATE TABLE IF NOT EXISTS group_mentors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    mentor_id UUID NOT NULL REFERENCES master_identities(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_group_mentor UNIQUE (group_id, mentor_id)
);

CREATE INDEX IF NOT EXISTS idx_group_mentors_group ON group_mentors(group_id);
CREATE INDEX IF NOT EXISTS idx_group_mentors_mentor ON group_mentors(mentor_id);

-- 2. Feed Posts Tablosu (Dual Feed: Global + Group)
CREATE TABLE IF NOT EXISTS feed_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES master_identities(id) ON DELETE CASCADE,
    group_id UUID REFERENCES groups(id) ON DELETE CASCADE, -- NULL = global akış
    content_text TEXT NOT NULL,
    post_type VARCHAR(30) DEFAULT 'text' CHECK (post_type IN ('text', 'announcement', 'system', 'mood_checkin', 'survey', 'multiple_choice')),
    scope VARCHAR(10) DEFAULT 'global' CHECK (scope IN ('global', 'group')),
    is_pinned BOOLEAN DEFAULT FALSE,
    is_system BOOLEAN DEFAULT FALSE,
    attachments JSONB DEFAULT '[]'::jsonb,
    reactions JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feed_posts_author ON feed_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_group ON feed_posts(group_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_scope ON feed_posts(scope);
CREATE INDEX IF NOT EXISTS idx_feed_posts_pinned ON feed_posts(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_feed_posts_created ON feed_posts(created_at DESC);

-- 3. social_objects güncelleme (grup hedefleme ve sabitleme)
ALTER TABLE social_objects ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES groups(id) ON DELETE SET NULL;
ALTER TABLE social_objects ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- 4. Mevcut mentor_id verilerini group_mentors'a taşı
INSERT INTO group_mentors (group_id, mentor_id, is_primary)
SELECT id, mentor_id, TRUE FROM groups WHERE mentor_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- 5. Seed: Çoklu mentör verisi
DO $$
DECLARE
    grp RECORD;
    mentor_ids UUID[];
    m_id UUID;
    i INT;
BEGIN
    -- İlk 2 gruba 2. mentör ekle
    SELECT ARRAY(SELECT id FROM master_identities WHERE role = 'mentor' ORDER BY random() LIMIT 8) INTO mentor_ids;
    
    FOR grp IN SELECT id FROM groups LIMIT 2 LOOP
        FOR i IN 1..2 LOOP
            IF i <= array_length(mentor_ids, 1) THEN
                INSERT INTO group_mentors (group_id, mentor_id, is_primary)
                VALUES (grp.id, mentor_ids[i], i = 1)
                ON CONFLICT DO NOTHING;
            END IF;
        END LOOP;
        -- Shift indexes
        mentor_ids := mentor_ids[3:];
    END LOOP;
    
    RAISE NOTICE 'Çoklu mentör verileri oluşturuldu.';
END $$;

-- 6. Seed: Örnek feed posts
DO $$
DECLARE
    admin_id UUID;
    grp_id UUID;
BEGIN
    SELECT id INTO admin_id FROM master_identities WHERE role = 'admin' LIMIT 1;
    SELECT id INTO grp_id FROM groups LIMIT 1;

    -- Global posts
    INSERT INTO feed_posts (author_id, content_text, scope, is_system, is_pinned)
    VALUES 
        (admin_id, 'Kamp programı güncellendi! Yeni etkinlikler eklendi.', 'global', TRUE, TRUE),
        (admin_id, 'Yarınki hackathon için son kayıt bugün!', 'global', TRUE, FALSE);

    -- Group posts
    IF grp_id IS NOT NULL THEN
        INSERT INTO feed_posts (author_id, group_id, content_text, scope, is_system, is_pinned)
        VALUES 
            (admin_id, grp_id, 'Grup toplantısı saat 14:00''de başlayacak.', 'group', TRUE, TRUE);
    END IF;

    RAISE NOTICE 'Feed post seed verileri oluşturuldu.';
END $$;

SELECT 'MIGRATION 012 TAMAMLANDI — Production Mentor System' AS status;
