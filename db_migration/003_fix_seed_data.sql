-- ============================================================
-- V-RAG Sistemi: Düzeltilmiş Eksik Veriler
-- (Geçersiz UUID'ler düzeltildi)
-- ============================================================

-- Önce hatalı verilerden kaynaklanan eksikleri temizle
DELETE FROM evaluations;
DELETE FROM spatial_temporal_logs;
DELETE FROM telemetry_streams;
DELETE FROM master_identities WHERE id = 'a0000000-0000-0000-0000-000000000001';

-- Mentor 1: Geçerli UUID ile yeniden ekle
INSERT INTO master_identities (
    id, email, password_hash, role, qr_hash, device_fingerprint, cognitive_profile, computed_tags
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'ayse.mentor@example.com', 
    'hashed_password_string_m1', 
    'mentor', 
    'qr_hash_mentor_789',
    '{"os": "macOS 14", "device_model": "MacBook Pro", "connection_type": "WIFI"}'::jsonb,
    '{
        "big_five": {"extraversion": 40, "conscientiousness": 95, "agreeableness": 85, "stress_tolerance": 90, "openness_to_experience": 75},
        "learning_style": "theoretical",
        "decision_making": "analytical",
        "belbin_role": "Koordinatör",
        "motivation_anchor": "internal_success",
        "career_interests": ["Psikoloji", "Veri Bilimi"]
    }'::jsonb,
    '{"system_tags": ["Derin Düşünür", "Analitik Uzman"], "trait_flags": ["detail_oriented", "patient"], "last_ai_analysis_at": null}'::jsonb
) ON CONFLICT (email) DO UPDATE SET id = EXCLUDED.id, qr_hash = EXCLUDED.qr_hash;

-- ============================================================
-- ADIM 4 Tekrar: telemetry_streams (Geçerli session UUID'leri)
-- ============================================================

INSERT INTO telemetry_streams (
    user_id, session_id, event_type, target_path, metrics
) VALUES (
    'a1111111-1111-1111-1111-111111111111', 
    'a0000001-0001-0001-0001-000000000001', 
    'session_start', 
    '/home_feed',
    '{"os_state": "foreground", "battery_level": 82, "network_quality": "wifi_good"}'::jsonb
);

INSERT INTO telemetry_streams (
    user_id, session_id, event_type, target_path, metrics
) VALUES (
    'a1111111-1111-1111-1111-111111111111', 
    'a0000001-0001-0001-0001-000000000001', 
    'scroll_activity', 
    '/home_feed',
    '{"direction": "down", "max_speed_px_sec": 3100, "avg_speed_px_sec": 1200, "scroll_pauses": 0}'::jsonb
);

INSERT INTO telemetry_streams (
    user_id, session_id, event_type, target_path, metrics
) VALUES (
    'a2222222-2222-2222-2222-222222222222', 
    'a0000002-0002-0002-0002-000000000002', 
    'typing_dynamics', 
    '/evaluations/mentor_feedback',
    '{
        "input_field_id": "feedback_text", 
        "total_keystrokes": 210, 
        "backspace_count": 65, 
        "hesitation_pauses_gt_2s": 7, 
        "total_typing_time_ms": 58000,
        "wpm_estimated": 28
    }'::jsonb
);

-- ============================================================
-- ADIM 5 Tekrar: spatial_temporal_logs (Geçerli event UUID'leri)
-- ============================================================

INSERT INTO spatial_temporal_logs (
    user_id, session_id, terminal_id, physical_zone, 
    scan_time, expected_time, delay_minutes, punctuality, spatial_context
) VALUES (
    'a1111111-1111-1111-1111-111111111111', 
    'a0000003-0003-0003-0003-000000000003', 
    'TERM_ANA_SALON_01', 
    'Ana_Salon_On_Sira',
    CURRENT_TIMESTAMP - INTERVAL '2 hours' - INTERVAL '10 minutes',
    CURRENT_TIMESTAMP - INTERVAL '2 hours',
    -10, 
    'early',
    '{
        "assigned_seat": "A-01", 
        "actual_seat": "A-01", 
        "concurrent_scans_30sec": ["a3333333-3333-3333-3333-333333333333"],
        "cluster_density": "low"
    }'::jsonb
);

INSERT INTO spatial_temporal_logs (
    user_id, session_id, terminal_id, physical_zone, 
    scan_time, expected_time, delay_minutes, punctuality, spatial_context
) VALUES (
    'a2222222-2222-2222-2222-222222222222', 
    'a0000003-0003-0003-0003-000000000003', 
    'TERM_ANA_SALON_02', 
    'Ana_Salon_Arka_Sira',
    CURRENT_TIMESTAMP - INTERVAL '2 hours' + INTERVAL '15 minutes',
    CURRENT_TIMESTAMP - INTERVAL '2 hours',
    15, 
    'late',
    '{
        "assigned_seat": "A-15", 
        "actual_seat": "C-42", 
        "concurrent_scans_30sec": [],
        "cluster_density": "high"
    }'::jsonb
);

INSERT INTO spatial_temporal_logs (
    user_id, session_id, terminal_id, physical_zone, 
    scan_time, expected_time, delay_minutes, punctuality, spatial_context
) VALUES (
    'a3333333-3333-3333-3333-333333333333', 
    'a0000003-0003-0003-0003-000000000003', 
    'TERM_ANA_SALON_01', 
    'Ana_Salon_On_Sira',
    CURRENT_TIMESTAMP - INTERVAL '2 hours',
    CURRENT_TIMESTAMP - INTERVAL '2 hours',
    0, 
    'on_time',
    '{
        "assigned_seat": "A-02", 
        "actual_seat": "A-02", 
        "concurrent_scans_30sec": ["a1111111-1111-1111-1111-111111111111"],
        "cluster_density": "low"
    }'::jsonb
);

-- ============================================================
-- ADIM 6 Tekrar: evaluations (Düzeltilmiş mentor UUID'si)
-- ============================================================

INSERT INTO evaluations (
    evaluator_id, target_id, category, score_1_to_5, raw_mentor_note, ai_extracted_insights
) VALUES (
    'a0000000-0000-0000-0000-000000000001', 
    'a3333333-3333-3333-3333-333333333333', 
    'team_dynamics', 
    5, 
    'Grup içindeki gerginliği çok iyi yönetti. Herkesin fikrini almadan ilerlemiyor, harika bir arabulucu.',
    '{
        "sentiment_score": 0.85,
        "detected_traits": ["high_empathy", "mediator", "inclusive_leader"],
        "belbin_role_suggestion": "Koordinatör",
        "needs_intervention": false
    }'::jsonb
);

INSERT INTO evaluations (
    evaluator_id, target_id, category, score_1_to_100, raw_mentor_note, ai_extracted_insights
) VALUES (
    'a0000000-0000-0000-0000-000000000001', 
    'a1111111-1111-1111-1111-111111111111', 
    'behavioral', 
    40, 
    'Verilen görevleri bazen erteliyor. Fikirlerini çok hızlı söylüyor ama başkalarını dinlemekte zorlanıyor.',
    '{
        "sentiment_score": -0.3,
        "detected_traits": ["impulsive", "dominant", "low_listening"],
        "belbin_role_suggestion": "Şekillendirici",
        "needs_intervention": false,
        "intervention_reason": null
    }'::jsonb
);

INSERT INTO evaluations (
    evaluator_id, target_id, category, score_1_to_100, score_1_to_5, raw_mentor_note, ai_extracted_insights
) VALUES (
    'a0000000-0000-0000-0000-000000000001', 
    'a2222222-2222-2222-2222-222222222222', 
    'technical_skills', 
    85,
    4,
    'Teknik bilgisi grubun en güçlüsü ama sunumlarda çok sessiz kalıyor, kendini ifade etmekte zorluk çekiyor.',
    '{
        "sentiment_score": 0.4,
        "detected_traits": ["technically_strong", "shy", "introverted", "deep_thinker"],
        "belbin_role_suggestion": "Fikir Üretici",
        "needs_intervention": true,
        "intervention_reason": "İfade becerisini geliştirmek için cesaretlendirme gerekli."
    }'::jsonb
);

-- ============================================================
-- SONUÇ RAPORU
-- ============================================================
SELECT 'DUZELTILMIS VERILER BASARIYLA EKLENDI' AS durum;
SELECT 
    (SELECT COUNT(*) FROM master_identities) AS kullanicilar,
    (SELECT COUNT(*) FROM social_objects) AS anketler,
    (SELECT COUNT(*) FROM content_engagements) AS etkilesimler,
    (SELECT COUNT(*) FROM telemetry_streams) AS telemetri,
    (SELECT COUNT(*) FROM spatial_temporal_logs) AS yoklama,
    (SELECT COUNT(*) FROM evaluations) AS degerlendirmeler;
