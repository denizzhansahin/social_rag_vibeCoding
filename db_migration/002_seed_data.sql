-- ============================================================
-- V-RAG Sistemi: Örnek Veri Seti (Seed Data)
-- Tüm tablolar için test verileri
-- ============================================================

-- ============================================================
-- ADIM 1 Örnek Verileri: master_identities
-- ============================================================

-- Öğrenci 1: Dışa dönük, pratik, girişimci
INSERT INTO master_identities (
    id, email, password_hash, role, qr_hash, device_fingerprint, cognitive_profile, computed_tags
) VALUES (
    'a1111111-1111-1111-1111-111111111111',
    'ali.yilmaz@example.com', 
    'hashed_password_string_1', 
    'participant', 
    'qr_hash_abc123_xyz',
    '{"os": "Android 14", "device_model": "Samsung S23", "screen_resolution": "1080x2340", "connection_type": "5G", "app_version": "1.0.4"}'::jsonb,
    '{
        "big_five": {"extraversion": 88, "conscientiousness": 75, "agreeableness": 80, "stress_tolerance": 60, "openness_to_experience": 90},
        "learning_style": "practical",
        "decision_making": "impulsive",
        "belbin_role": "Şekillendirici",
        "motivation_anchor": "external_appreciation",
        "career_interests": ["Girişimcilik", "Yapay Zeka"]
    }'::jsonb,
    '{"system_tags": ["Sosyal Kelebek", "Risk Alıcı"], "trait_flags": ["quick_responder"], "last_ai_analysis_at": null}'::jsonb
);

-- Öğrenci 2: İçe dönük, analitik, teorik
INSERT INTO master_identities (
    id, email, password_hash, role, qr_hash, device_fingerprint, cognitive_profile, computed_tags
) VALUES (
    'a2222222-2222-2222-2222-222222222222',
    'zeynep.kara@example.com', 
    'hashed_password_string_2', 
    'participant', 
    'qr_hash_def456_uvw',
    '{"os": "iOS 17.1", "device_model": "iPhone 15", "screen_resolution": "1179x2556", "connection_type": "WIFI", "app_version": "1.0.4"}'::jsonb,
    '{
        "big_five": {"extraversion": 35, "conscientiousness": 92, "agreeableness": 88, "stress_tolerance": 55, "openness_to_experience": 78},
        "learning_style": "theoretical",
        "decision_making": "analytical",
        "belbin_role": "Fikir Üretici",
        "motivation_anchor": "internal_success",
        "career_interests": ["Veri Bilimi", "Psikoloji"]
    }'::jsonb,
    '{"system_tags": ["Derin Düşünür", "Gece Kuşu"], "trait_flags": ["detail_oriented"], "last_ai_analysis_at": null}'::jsonb
);

-- Öğrenci 3: Dengeli, koordinatör tipi
INSERT INTO master_identities (
    id, email, password_hash, role, qr_hash, device_fingerprint, cognitive_profile, computed_tags
) VALUES (
    'a3333333-3333-3333-3333-333333333333',
    'mehmet.demir@example.com', 
    'hashed_password_string_3', 
    'participant', 
    'qr_hash_ghi789_rst',
    '{"os": "Android 13", "device_model": "Pixel 8", "screen_resolution": "1080x2400", "connection_type": "WIFI", "app_version": "1.0.3"}'::jsonb,
    '{
        "big_five": {"extraversion": 65, "conscientiousness": 85, "agreeableness": 90, "stress_tolerance": 80, "openness_to_experience": 70},
        "learning_style": "practical",
        "decision_making": "analytical",
        "belbin_role": "Koordinatör",
        "motivation_anchor": "process_enjoyment",
        "career_interests": ["Eğitim Teknolojileri", "IoT"]
    }'::jsonb,
    '{"system_tags": ["Arabulucu", "Sessiz Lider"], "trait_flags": ["team_player", "high_empathy"], "last_ai_analysis_at": null}'::jsonb
);

-- Mentor 1: Analitik, teorik
INSERT INTO master_identities (
    id, email, password_hash, role, qr_hash, device_fingerprint, cognitive_profile, computed_tags
) VALUES (
    'm1111111-1111-1111-1111-111111111111',
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
);

-- Admin
INSERT INTO master_identities (
    id, email, password_hash, role, qr_hash, device_fingerprint, cognitive_profile, computed_tags
) VALUES (
    'ad111111-1111-1111-1111-111111111111',
    'admin@vizyonkampi.com', 
    'hashed_password_admin', 
    'admin', 
    'qr_hash_admin_001',
    '{"os": "macOS 14", "device_model": "MacBook Pro M3", "connection_type": "WIFI"}'::jsonb,
    '{}'::jsonb,
    '{"system_tags": ["Sistem Yöneticisi"], "trait_flags": [], "last_ai_analysis_at": null}'::jsonb
);

-- ============================================================
-- ADIM 2 Örnek Verileri: social_objects
-- ============================================================

-- Anket 1: Slider Survey - Sadece içe dönüklere
INSERT INTO social_objects (
    id, created_by, object_type, targeting_rules, ui_payload, active_until
) VALUES (
    'b1111111-1111-1111-1111-111111111111',
    'ad111111-1111-1111-1111-111111111111',
    'slider_survey',
    '{
        "must_match_all": {"learning_style": "theoretical"},
        "must_match_any": {},
        "exclude": {"system_tags": ["Sosyal Kelebek"]}
    }'::jsonb,
    '{
        "header": {
            "title": "Odaklanma Durumun",
            "subtitle": "Şu an ortamdaki gürültü seviyesi çalışmanı ne kadar etkiliyor?",
            "bg_color": "#1a1a2e"
        },
        "interaction": {
            "slider_min": 1,
            "slider_max": 100,
            "min_label": "Hiç Etkilemiyor",
            "max_label": "Çok Dağıtıyor",
            "time_limit_seconds": 30
        }
    }'::jsonb,
    CURRENT_TIMESTAMP + INTERVAL '12 hours'
);

-- Anket 2: Çoktan seçmeli - AI sorusu, herkese
INSERT INTO social_objects (
    id, created_by, object_type, targeting_rules, ui_payload, active_until
) VALUES (
    'b2222222-2222-2222-2222-222222222222',
    'ad111111-1111-1111-1111-111111111111',
    'multiple_choice',
    '{
        "must_match_all": {"role": "participant"},
        "must_match_any": {"career_interests": ["Yapay Zeka", "Veri Bilimi"]},
        "exclude": {}
    }'::jsonb,
    '{
        "header": {
            "title": "Günün AI Sorusu!",
            "subtitle": "Hangi dil yapay zekanın geleceği?",
            "bg_color": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
        },
        "interaction": {
            "options": [
                {"id": "opt_1", "label": "Python", "icon": "🐍"},
                {"id": "opt_2", "label": "Rust", "icon": "🦀"},
                {"id": "opt_3", "label": "C++", "icon": "⚙️"}
            ],
            "time_limit_seconds": 15,
            "allow_change_mind": true
        }
    }'::jsonb,
    CURRENT_TIMESTAMP + INTERVAL '24 hours'
);

-- Anket 3: Yemekhane tetiklemeli - Mood Checkin
INSERT INTO social_objects (
    id, created_by, object_type, targeting_rules, ui_payload, trigger_event, is_active
) VALUES (
    'b3333333-3333-3333-3333-333333333333',
    'ad111111-1111-1111-1111-111111111111',
    'mood_checkin',
    '{"must_match_all": {}, "must_match_any": {}, "exclude": {}}'::jsonb,
    '{
        "header": {
            "title": "Afiyet Olsun!",
            "subtitle": "Günün menüsünü nasıl buldun?",
            "bg_color": "#ff9a9e"
        },
        "interaction": {
            "options": [
                {"id": "m_1", "label": "Mükemmel", "icon": "😍", "value": 5},
                {"id": "m_2", "label": "İdare Eder", "icon": "😐", "value": 3},
                {"id": "m_3", "label": "Beğenmedim", "icon": "🤢", "value": 1}
            ]
        }
    }'::jsonb,
    'location_scan_yemekhane',
    TRUE
);

-- ============================================================
-- ADIM 3 Örnek Verileri: content_engagements
-- ============================================================

-- Etkileşim 1: Ali hızlı ve net cevapladı (dürtüsel)
INSERT INTO content_engagements (
    user_id, object_id, nature, action, response_data, behavioral_metrics, seen_at, interacted_at
) VALUES (
    'a1111111-1111-1111-1111-111111111111',
    'b2222222-2222-2222-2222-222222222222',
    'explicit', 
    'answered',
    '{"selected_option_id": "opt_1", "selected_value": "Python"}'::jsonb,
    '{"decision_time_ms": 1200, "changed_mind_count": 0, "hover_duration_ms": 0}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '1 hour',
    CURRENT_TIMESTAMP - INTERVAL '1 hour' + INTERVAL '1.2 seconds'
);

-- Etkileşim 2: Zeynep kararsız kaldı, 3 kere fikir değiştirdi (analitik)
INSERT INTO content_engagements (
    user_id, object_id, nature, action, response_data, behavioral_metrics, seen_at, interacted_at
) VALUES (
    'a2222222-2222-2222-2222-222222222222',
    'b2222222-2222-2222-2222-222222222222',
    'explicit', 
    'answered',
    '{"selected_option_id": "opt_3", "selected_value": "C++"}'::jsonb,
    '{"decision_time_ms": 8450, "changed_mind_count": 3, "hover_duration_ms": 2100}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '55 minutes',
    CURRENT_TIMESTAMP - INTERVAL '55 minutes' + INTERVAL '8.45 seconds'
);

-- Etkileşim 3: Mehmet görmezden geldi (pasif)
INSERT INTO content_engagements (
    user_id, object_id, nature, action, response_data, behavioral_metrics, seen_at, interacted_at
) VALUES (
    'a3333333-3333-3333-3333-333333333333',
    'b1111111-1111-1111-1111-111111111111',
    'implicit', 
    'ignored',
    '{}'::jsonb,
    '{"scroll_speed_px_sec": 850, "decision_time_ms": null}'::jsonb,
    CURRENT_TIMESTAMP - INTERVAL '50 minutes',
    CURRENT_TIMESTAMP - INTERVAL '50 minutes' + INTERVAL '0.3 seconds'
);

-- ============================================================
-- ADIM 4 Örnek Verileri: telemetry_streams
-- ============================================================

-- Session başlangıcı
INSERT INTO telemetry_streams (
    user_id, session_id, event_type, target_path, metrics
) VALUES (
    'a1111111-1111-1111-1111-111111111111', 
    'se111111-1111-1111-1111-111111111111', 
    'session_start', 
    '/home_feed',
    '{"os_state": "foreground", "battery_level": 82, "network_quality": "wifi_good"}'::jsonb
);

-- Hızlı kaydırma (Skimming)
INSERT INTO telemetry_streams (
    user_id, session_id, event_type, target_path, metrics
) VALUES (
    'a1111111-1111-1111-1111-111111111111', 
    'se111111-1111-1111-1111-111111111111', 
    'scroll_activity', 
    '/home_feed',
    '{"direction": "down", "max_speed_px_sec": 3100, "avg_speed_px_sec": 1200, "scroll_pauses": 0}'::jsonb
);

-- Stresli yazım (yüksek backspace)
INSERT INTO telemetry_streams (
    user_id, session_id, event_type, target_path, metrics
) VALUES (
    'a2222222-2222-2222-2222-222222222222', 
    'se222222-2222-2222-2222-222222222222', 
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
-- ADIM 5 Örnek Verileri: spatial_temporal_logs
-- ============================================================

-- Ali: Erken geldi, atanan koltuğa oturdu
INSERT INTO spatial_temporal_logs (
    user_id, session_id, terminal_id, physical_zone, 
    scan_time, expected_time, delay_minutes, punctuality, spatial_context
) VALUES (
    'a1111111-1111-1111-1111-111111111111', 
    'ev111111-1111-1111-1111-111111111111', 
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

-- Zeynep: Geç kaldı, farklı koltuğa oturdu
INSERT INTO spatial_temporal_logs (
    user_id, session_id, terminal_id, physical_zone, 
    scan_time, expected_time, delay_minutes, punctuality, spatial_context
) VALUES (
    'a2222222-2222-2222-2222-222222222222', 
    'ev111111-1111-1111-1111-111111111111', 
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

-- Mehmet: Tam zamanında, Ali'nin yanına oturdu
INSERT INTO spatial_temporal_logs (
    user_id, session_id, terminal_id, physical_zone, 
    scan_time, expected_time, delay_minutes, punctuality, spatial_context
) VALUES (
    'a3333333-3333-3333-3333-333333333333', 
    'ev111111-1111-1111-1111-111111111111', 
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
-- ADIM 6 Örnek Verileri: evaluations
-- ============================================================

-- Pozitif değerlendirme: Mehmet harika takım oyuncusu
INSERT INTO evaluations (
    evaluator_id, target_id, category, score_1_to_5, raw_mentor_note, ai_extracted_insights
) VALUES (
    'm1111111-1111-1111-1111-111111111111', 
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

-- Negatif değerlendirme: Ali disiplin sorunu
INSERT INTO evaluations (
    evaluator_id, target_id, category, score_1_to_100, raw_mentor_note, ai_extracted_insights
) VALUES (
    'm1111111-1111-1111-1111-111111111111', 
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

-- Teknik değerlendirme: Zeynep teknik olarak güçlü ama çekingen
INSERT INTO evaluations (
    evaluator_id, target_id, category, score_1_to_100, score_1_to_5, raw_mentor_note, ai_extracted_insights
) VALUES (
    'm1111111-1111-1111-1111-111111111111', 
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
SELECT 'ORNEK VERILER BASARIYLA EKLENDI' AS durum;
SELECT 
    (SELECT COUNT(*) FROM master_identities) AS kullanicilar,
    (SELECT COUNT(*) FROM social_objects) AS anketler,
    (SELECT COUNT(*) FROM content_engagements) AS etkilesimler,
    (SELECT COUNT(*) FROM telemetry_streams) AS telemetri,
    (SELECT COUNT(*) FROM spatial_temporal_logs) AS yoklama,
    (SELECT COUNT(*) FROM evaluations) AS degerlendirmeler;
