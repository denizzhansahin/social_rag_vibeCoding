-- ============================================================
-- V-RAG Migration 013: Onboarding & Social Profile Integration
-- ============================================================

-- 1. Social Links ve Onboarding Flag'in Eklenmesi
ALTER TABLE master_identities ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb;
ALTER TABLE master_identities ADD COLUMN IF NOT EXISTS has_completed_onboarding BOOLEAN DEFAULT FALSE;

-- 2. Tanışma (Onboarding) Soruları Tablosu (Admin yönetecek)
CREATE TABLE IF NOT EXISTS onboarding_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) DEFAULT 'text', -- 'text', 'multiple_choice', 'slider'
    options JSONB DEFAULT '[]'::jsonb, -- çoktan seçmeli için
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Kullanıcıların Verdiği Yanıtlar
CREATE TABLE IF NOT EXISTS onboarding_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES master_identities(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES onboarding_questions(id) ON DELETE CASCADE,
    response_data TEXT NOT NULL, -- metin veya JSON
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_question UNIQUE (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_resp_user ON onboarding_responses(user_id);

-- 4. Temel Örnek Sorular Dolduralım
INSERT INTO onboarding_questions (question_text, question_type, options, order_index)
VALUES 
  ('Seni hayatta en çok motive eden şey nedir?', 'text', '[]'::jsonb, 1),
  ('Yakın bir arkadaşınla anlaşmazlık yaşadığında nasıl bir yol izlersin?', 'text', '[]'::jsonb, 2),
  ('En enerjik hissettiğin zaman dilimi hangisi?', 'multiple_choice', '["Sabah Erken", "Öğlen", "Akşam", "Gece Yarısı"]'::jsonb, 3),
  ('Takım çalışmasında kendini en çok hangi rolde görüyorsun?', 'multiple_choice', '["Lider/Yönlendirici", "Sessiz Gözlemci", "Detaycı", "Köprü Kurucu"]'::jsonb, 4)
ON CONFLICT DO NOTHING;

SELECT 'MIGRATION 013 (Onboarding & Social) TAMAMLANDI' AS status;
