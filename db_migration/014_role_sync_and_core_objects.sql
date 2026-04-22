-- 1. Role Sync: Add 'teacher' to user_role_enum if it doesn't exist
DO $$ 
BEGIN
    ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'teacher';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Seed Core Social Objects (interactive elements for feed)
INSERT INTO social_objects (object_type, created_by, targeting_rules, ui_payload, trigger_event, is_active)
VALUES 
(
    'mood_checkin',
    (SELECT id FROM master_identities WHERE role = 'admin' LIMIT 1),
    '{"must_match_all": {}, "must_match_any": {}, "exclude": {}}'::jsonb,
    '{
        "question": "Bugün Vizyon Kampı''nda kendini nasıl hissediyorsun?",
        "emojis": ["😴", "😟", "😐", "😊", "🔥"],
        "labels": ["Yorgun", "Endişeli", "Normal", "İyi", "Harika"]
    }'::jsonb,
    'session_start',
    true
),
(
    'slider_survey',
    (SELECT id FROM master_identities WHERE role = 'admin' LIMIT 1),
    '{"must_match_all": {}, "must_match_any": {}, "exclude": {}}'::jsonb,
    '{
        "question": "Bugünkü atölye çalışmasından ne kadar verim aldın?",
        "sliderMin": 0,
        "sliderMax": 100,
        "labels": ["Hiç", "Çok Fazla"]
    }'::jsonb,
    'workshop_end',
    true
),
(
    'multiple_choice',
    (SELECT id FROM master_identities WHERE role = 'admin' LIMIT 1),
    '{"must_match_all": {}, "must_match_any": {}, "exclude": {}}'::jsonb,
    '{
        "question": "Bir sonraki oturumda hangi konuya odaklanalım?",
        "options": ["Yapay Zeka Etiği", "Büyük Dil Modelleri", "Vektör Veritabanları", "Girişimcilik"]
    }'::jsonb,
    NULL,
    true
)
ON CONFLICT DO NOTHING;

SELECT 'Migration 014 completed: teacher role added and core social objects seeded.' AS status;
