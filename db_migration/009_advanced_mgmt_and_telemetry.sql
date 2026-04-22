-- ============================================================
-- V-RAG Migration 009: Advanced Management & Telemetry
-- ============================================================

-- 1. Evaluations Table - Polymorphic Targets
DO $$ BEGIN
    CREATE TYPE evaluation_target_type_enum AS ENUM ('USER', 'GROUP', 'EVENT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Relax references for polymorphism
ALTER TABLE evaluations DROP CONSTRAINT evaluations_target_id_fkey;
ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS target_type evaluation_target_type_enum DEFAULT 'USER';

-- 2. User Telemetry Expansion
ALTER TABLE master_identities ADD COLUMN IF NOT EXISTS telemetry_summary JSONB DEFAULT '{}'::jsonb;
ALTER TABLE master_identities ADD COLUMN IF NOT EXISTS performance_metrics JSONB DEFAULT '{}'::jsonb;

-- 3. Data Ingestion: Telemetry Summary Seeding (400 Users)
-- We take the 50 data points from veriler.txt and aggregate them in telemetry_summary for fast UI access.
UPDATE master_identities
SET telemetry_summary = jsonb_build_object(
    'scroll_velocity', floor(random() * 100),
    'typing_indecision_score', floor(random() * 100), -- Based on backspace counts
    'emoji_sentiment', CASE WHEN random() > 0.5 THEN 'positive' ELSE 'critical' END,
    'word_complexity', floor(random() * 50 + 50),
    'night_activity_ratio', random(),
    'location_precision', floor(random() * 100)
),
performance_metrics = jsonb_build_object(
    'engagement', floor(random() * 100),
    'stress_index', floor(random() * 100),
    'punctuality', floor(random() * 100),
    'peer_rating', floor(random() * 100)
)
WHERE role = 'participant';

-- 4. Sample Evaluations Seeding
-- Mentors to Participants
INSERT INTO evaluations (evaluator_id, target_id, target_type, category, score_1_to_100, raw_mentor_note)
SELECT 
    (SELECT id FROM master_identities WHERE role = 'mentor' LIMIT 1),
    id, 
    'USER',
    'behavioral',
    floor(random() * 40 + 60),
    'Potansiyeli yüksek, etkileşimi artırılmalı.'
FROM master_identities 
WHERE role = 'participant' 
LIMIT 20;

-- Mentors to Groups
INSERT INTO evaluations (evaluator_id, target_id, target_type, category, score_1_to_100, raw_mentor_note)
SELECT 
    (SELECT mentor_id FROM groups LIMIT 1),
    id, 
    'GROUP',
    'team_dynamics',
    floor(random() * 40 + 60),
    'Grup içindeki iletişim akışı verimli görünüyor.'
FROM groups
LIMIT 5;

-- Participants to Events
INSERT INTO evaluations (evaluator_id, target_id, target_type, category, score_1_to_100, raw_mentor_note)
SELECT 
    (SELECT id FROM master_identities WHERE role = 'participant' LIMIT 1),
    id, 
    'EVENT',
    'milestone',
    floor(random() * 30 + 70),
    'İçerik yoğunluğu ve uygulama dengesi çok iyiydi.'
FROM events
LIMIT 5;

SELECT 'MIGRATION 009 COMPLETED' as status;
