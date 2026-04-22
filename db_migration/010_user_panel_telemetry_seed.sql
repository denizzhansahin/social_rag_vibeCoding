-- ============================================================
-- V-RAG Migration 010: User Panel Telemetry Seed Data
-- Kullanıcı paneli için zenginleştirilmiş telemetri verileri
-- ============================================================

-- 1. Mood Checkin Social Objects
INSERT INTO social_objects (object_type, created_by, targeting_rules, ui_payload, trigger_event, is_active)
SELECT 
    'mood_checkin',
    (SELECT id FROM master_identities WHERE role = 'admin' LIMIT 1),
    '{"must_match_all": {}, "must_match_any": {}, "exclude": {}}'::jsonb,
    jsonb_build_object(
        'question', CASE i 
            WHEN 1 THEN 'Bugün kendini nasıl hissediyorsun?'
            WHEN 2 THEN 'Atölye öncesi enerji seviyeniz?'
            WHEN 3 THEN 'Sabah ruh haliniz nasıl?'
            WHEN 4 THEN 'Grup çalışması sonrası motivasyonunuz?'
            WHEN 5 THEN 'Kamptaki ilk haftanızı nasıl geçirdiniz?'
            ELSE 'Genel motivasyonunuz nasıl?'
        END,
        'emojis', ARRAY['😴', '😟', '😐', '😊', '🔥'],
        'labels', ARRAY['Yorgun', 'Endişeli', 'Normal', 'İyi', 'Harika']
    ),
    'session_start',
    true
FROM generate_series(1, 6) AS i
ON CONFLICT DO NOTHING;

-- 2. Multiple Choice Social Objects
INSERT INTO social_objects (object_type, created_by, targeting_rules, ui_payload, is_active)
SELECT 
    'multiple_choice',
    (SELECT id FROM master_identities WHERE role = 'admin' LIMIT 1),
    '{"must_match_all": {}, "must_match_any": {}, "exclude": {}}'::jsonb,
    jsonb_build_object(
        'question', CASE i 
            WHEN 1 THEN 'Hangi programlama dili seni en çok heyecanlandırıyor?'
            WHEN 2 THEN 'Bu kampta en çok hangi alanda gelişmek istiyorsun?'
            WHEN 3 THEN 'Sabah oturumları kaçta başlamalı?'
            WHEN 4 THEN 'En çok hangi etkinlik türünü tercih ediyorsun?'
            WHEN 5 THEN 'Gelecekte hangi sektörde çalışmak istiyorsun?'
            ELSE 'Hangi takım çalışması yöntemi daha verimli?'
        END,
        'options', CASE i
            WHEN 1 THEN ARRAY['Python', 'JavaScript', 'Rust', 'Go']
            WHEN 2 THEN ARRAY['Yapay Zeka', 'Girişimcilik', 'Liderlik', 'Veri Bilimi']
            WHEN 3 THEN ARRAY['08:00', '09:00', '10:00', '11:00']
            WHEN 4 THEN ARRAY['Workshop', 'Panel', 'Hackathon', 'Networking']
            WHEN 5 THEN ARRAY['Teknoloji', 'Finans', 'Sağlık', 'Eğitim']
            ELSE ARRAY['Agile', 'Waterfall', 'Kanban', 'Scrum']
        END
    ),
    true
FROM generate_series(1, 6) AS i
ON CONFLICT DO NOTHING;

-- 3. Slider Survey Social Objects
INSERT INTO social_objects (object_type, created_by, ui_payload, is_active)
SELECT 
    'slider_survey',
    (SELECT id FROM master_identities WHERE role = 'admin' LIMIT 1),
    jsonb_build_object(
        'question', CASE i 
            WHEN 1 THEN 'Ortamdaki gürültü çalışma verimini ne kadar etkiliyor?'
            WHEN 2 THEN 'Bugünkü atölyeye girmeden önce enerjin nasıl?'
            WHEN 3 THEN 'Kamptaki yemek kalitesini puanla!'
            WHEN 4 THEN 'Grup çalışmalarının verimliliği ne düzeyde?'
            WHEN 5 THEN 'Mentor desteğinden ne kadar memnunsun?'
        END,
        'sliderMin', 0,
        'sliderMax', 100,
        'labels', ARRAY['Düşük', 'Yüksek']
    ),
    true
FROM generate_series(1, 5) AS i
ON CONFLICT DO NOTHING;

-- 4. Content Engagements — 200+ Sample Responses
DO $$
DECLARE
    participant_ids UUID[];
    object_ids UUID[];
    p_id UUID;
    o_id UUID;
    i INT;
    j INT;
    action_types action_type_enum[] := ARRAY['answered', 'liked', 'downvoted', 'bookmarked', 'ignored', 'abandoned'];
    nature_types interaction_nature_enum[] := ARRAY['explicit', 'implicit', 'friction'];
BEGIN
    SELECT ARRAY(SELECT id FROM master_identities WHERE role = 'participant' ORDER BY random() LIMIT 50) INTO participant_ids;
    SELECT ARRAY(SELECT id FROM social_objects WHERE is_active = true ORDER BY random() LIMIT 20) INTO object_ids;

    FOR i IN 1..array_length(participant_ids, 1) LOOP
        p_id := participant_ids[i];
        FOR j IN 1..4 LOOP
            o_id := object_ids[(i + j) % array_length(object_ids, 1) + 1];
            INSERT INTO content_engagements (
                user_id, object_id, nature, action, 
                response_data, behavioral_metrics,
                seen_at, interacted_at
            ) VALUES (
                p_id, o_id,
                nature_types[(i + j) % 3 + 1],
                action_types[(i + j) % 6 + 1],
                jsonb_build_object(
                    'selected_value', CASE WHEN j % 3 = 0 THEN 'Python' ELSE floor(random() * 100)::text END,
                    'mood_index', floor(random() * 5)
                ),
                jsonb_build_object(
                    'decision_time_ms', floor(random() * 10000 + 500),
                    'changed_mind_count', floor(random() * 3),
                    'hover_duration_ms', floor(random() * 5000),
                    'backspace_count', floor(random() * 20),
                    'hesitation_pauses_gt_2s', floor(random() * 5),
                    'total_keystrokes', floor(random() * 200)
                ),
                NOW() - (floor(random() * 72) || ' hours')::interval,
                NOW() - (floor(random() * 72) || ' hours')::interval + (floor(random() * 60) || ' seconds')::interval
            ) ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;

    RAISE NOTICE '200+ content engagements oluşturuldu.';
END $$;

-- 5. Telemetry Streams — 100+ Session Records
DO $$
DECLARE
    participant_ids UUID[];
    p_id UUID;
    session UUID;
    i INT;
    event_types telemetry_event_type_enum[] := ARRAY['session_start', 'session_end', 'viewport_visibility', 'scroll_activity', 'typing_dynamics', 'click_reflex'];
BEGIN
    SELECT ARRAY(SELECT id FROM master_identities WHERE role = 'participant' ORDER BY random() LIMIT 40) INTO participant_ids;

    FOR i IN 1..array_length(participant_ids, 1) LOOP
        p_id := participant_ids[i];
        session := gen_random_uuid();

        -- Session start
        INSERT INTO telemetry_streams (user_id, session_id, event_type, target_path, metrics) VALUES
        (p_id, session, 'session_start', '/feed', jsonb_build_object('user_agent', 'Mozilla/5.0', 'screen_width', 390, 'screen_height', 844));

        -- Scroll activity
        INSERT INTO telemetry_streams (user_id, session_id, event_type, target_path, metrics) VALUES
        (p_id, session, 'scroll_activity', '/feed', jsonb_build_object(
            'scroll_speed_px_sec', floor(random() * 500 + 50),
            'total_scroll_distance', floor(random() * 5000 + 500),
            'fast_scroll_events', floor(random() * 5),
            'direction_changes', floor(random() * 10)
        ));

        -- Typing dynamics
        INSERT INTO telemetry_streams (user_id, session_id, event_type, target_path, metrics) VALUES
        (p_id, session, 'typing_dynamics', '/feed/comment', jsonb_build_object(
            'backspace_count', floor(random() * 15),
            'hesitation_pauses_gt_2s', floor(random() * 4),
            'total_keystrokes', floor(random() * 150 + 20),
            'wpm_estimated', floor(random() * 60 + 20),
            'total_typing_time_ms', floor(random() * 30000 + 5000)
        ));

        -- Viewport visibility
        INSERT INTO telemetry_streams (user_id, session_id, event_type, target_path, metrics) VALUES
        (p_id, session, 'viewport_visibility', '/feed', jsonb_build_object(
            'objects_viewed', floor(random() * 20 + 5),
            'objects_ignored', floor(random() * 8),
            'avg_view_duration_ms', floor(random() * 5000 + 1000),
            'max_view_duration_ms', floor(random() * 15000 + 3000)
        ));

        -- Session end
        INSERT INTO telemetry_streams (user_id, session_id, event_type, target_path, metrics) VALUES
        (p_id, session, 'session_end', '/feed', jsonb_build_object(
            'total_duration_ms', floor(random() * 600000 + 60000),
            'pages_visited', floor(random() * 8 + 2),
            'total_interactions', floor(random() * 30 + 3)
        ));
    END LOOP;

    RAISE NOTICE '200+ telemetry stream kaydı oluşturuldu.';
END $$;

-- 6. QR Yoklama Verileri (Spatial Temporal Logs)
DO $$
DECLARE
    participant_ids UUID[];
    event_ids UUID[];
    p_id UUID;
    e_id UUID;
    i INT;
    j INT;
    delay_val INT;
    punct punctuality_status_enum;
BEGIN
    SELECT ARRAY(SELECT id FROM master_identities WHERE role = 'participant' ORDER BY random() LIMIT 30) INTO participant_ids;
    SELECT ARRAY(SELECT id FROM events LIMIT 5) INTO event_ids;

    IF array_length(event_ids, 1) IS NULL THEN
        RAISE NOTICE 'No events found, skipping spatial logs.';
        RETURN;
    END IF;

    FOR i IN 1..array_length(participant_ids, 1) LOOP
        p_id := participant_ids[i];
        FOR j IN 1..LEAST(3, array_length(event_ids, 1)) LOOP
            e_id := event_ids[j];
            delay_val := floor(random() * 30 - 5)::int;
            
            IF delay_val <= -3 THEN punct := 'early';
            ELSIF delay_val <= 2 THEN punct := 'on_time';
            ELSIF delay_val <= 15 THEN punct := 'late';
            ELSE punct := 'absent';
            END IF;

            INSERT INTO spatial_temporal_logs (
                user_id, session_id, terminal_id, physical_zone,
                scan_time, expected_time, delay_minutes, punctuality, spatial_context
            ) VALUES (
                p_id, e_id, 
                'terminal-' || (j % 4 + 1)::text,
                CASE j WHEN 1 THEN 'Ana Salon A' WHEN 2 THEN 'Laboratuvar 1' ELSE 'Konferans Salonu' END,
                NOW() - (floor(random() * 48) || ' hours')::interval,
                NOW() - (floor(random() * 48) || ' hours')::interval + '5 minutes'::interval,
                GREATEST(delay_val, 0),
                punct,
                jsonb_build_object(
                    'wifi_ssid', 'VizKamp-5G',
                    'signal_strength', floor(random() * 30 + 70)
                )
            ) ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'QR yoklama verileri oluşturuldu.';
END $$;

-- 7. Update telemetry_summary for all participants with enriched data
UPDATE master_identities
SET telemetry_summary = jsonb_build_object(
    'scroll_velocity', floor(random() * 100),
    'typing_indecision_score', floor(random() * 100),
    'emoji_sentiment', CASE 
        WHEN random() > 0.6 THEN 'positive' 
        WHEN random() > 0.3 THEN 'neutral' 
        ELSE 'critical' 
    END,
    'word_complexity', floor(random() * 50 + 50),
    'night_activity_ratio', round(random()::numeric, 2),
    'location_precision', floor(random() * 100),
    'avg_session_duration_ms', floor(random() * 300000 + 60000),
    'avg_interactions_per_session', floor(random() * 20 + 3),
    'feed_scroll_pattern', CASE 
        WHEN random() > 0.5 THEN 'deep_reader' 
        ELSE 'fast_scroller' 
    END
),
performance_metrics = jsonb_build_object(
    'engagement', floor(random() * 50 + 40),
    'stress_index', floor(random() * 60 + 15),
    'punctuality', floor(random() * 35 + 60),
    'peer_rating', floor(random() * 25 + 65),
    'leadership_potential', floor(random() * 40 + 30),
    'social_influence', floor(random() * 50 + 20)
)
WHERE role = 'participant';

SELECT 'MIGRATION 010 TAMAMLANDI — User Panel Telemetry Seed Data' AS status;
