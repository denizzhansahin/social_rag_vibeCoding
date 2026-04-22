DO $$
DECLARE
    new_user_id UUID;
    system_admin_id UUID := '11111111-1111-1111-1111-111111111111';
    new_obj_id UUID := '22222222-2222-2222-2222-222222222222';
    session1_id UUID := 'bbbbbbbb-1111-4ccc-8ddd-eeeeeeeeeeee';
    i INT;
    v_gender TEXT;
    v_age INT;
    v_sentiment TEXT;
BEGIN
    -- Bir adet admin/mentor olusturalim
    INSERT INTO master_identities (id, email, password_hash, role, status)
    VALUES (system_admin_id, 'admin_test_bot@vizyon.com', 'hash', 'admin'::user_role_enum, 'active'::user_status_enum)
    ON CONFLICT (email) DO NOTHING;

    -- Bir adet sosyal obje (anket)
    INSERT INTO social_objects (id, created_by, object_type, ui_payload)
    VALUES (new_obj_id, system_admin_id, 'multiple_choice'::social_object_type_enum, '{"q": "Etkinlikte nasilsin?"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    FOR i IN 1..50 LOOP
        new_user_id := md5(random()::text || clock_timestamp()::text)::uuid;
        
        -- Cinsiyet
        IF i % 3 = 0 THEN
            v_gender := 'Kız';
            v_age := 17 + (i % 3);
            v_sentiment := 'Biraz çekingen ama potansiyeli yüksek, odak sorunu yaşıyor.';
        ELSE
            v_gender := 'Erkek';
            v_age := 16 + (i % 5);
            v_sentiment := 'Genel olarak çok uyumlu, enerjisi çok yüksek.';
        END IF;

        -- 1. Identity
        INSERT INTO master_identities (id, email, password_hash, role, status, cognitive_profile)
        VALUES (
            new_user_id, 
            'katilimci_v2_' || i || '@vizyon.com',
            'dummy_hash_123',
            'participant'::user_role_enum, 
            'active'::user_status_enum, 
            jsonb_build_object('name', 'Katılımcı_' || i, 'age', v_age, 'gender', v_gender)
        );

        -- 2. Telemetri
        INSERT INTO telemetry_streams (user_id, session_id, event_type, target_path, metrics)
        VALUES (
            new_user_id, session1_id, 'typing_dynamics'::telemetry_event_type_enum, '/survey/1', 
            jsonb_build_object('backspace_count', CASE WHEN v_gender = 'Kız' THEN 45 + (i % 15) ELSE 10 + (i % 5) END)
        );

        -- 3. Evaluations (Mentor Yorumları - RAG BEYNI BUNU OKUYOR)
        INSERT INTO evaluations (evaluator_id, target_id, category, score_1_to_5, score_1_to_100, raw_mentor_note, ai_extracted_insights)
        VALUES (
            system_admin_id, new_user_id, 'behavioral'::evaluation_category_enum, 3+(i%3), 70+(i%30), v_sentiment, 
            jsonb_build_object(
                'sentiment_score', CASE WHEN v_gender = 'Erkek' THEN 0.9 ELSE 0.4 END,
                'detected_traits', CASE WHEN v_gender = 'Erkek' THEN ARRAY['mutlu', 'enerjik'] ELSE ARRAY['çekingen', 'kaygılı'] END
            )
        );

        -- 4. Engagements (Ürettikleri Metinler - RAG BUNU DA OKUYOR)
        INSERT INTO content_engagements (user_id, object_id, nature, action, response_data, behavioral_metrics, seen_at)
        VALUES (
            new_user_id, new_obj_id, 'explicit'::interaction_nature_enum, 'answered'::action_type_enum, 
            jsonb_build_object('free_text_answer', CASE WHEN v_gender = 'Erkek' THEN i || ' Numaralı Erkek Katılımcı: Etkinlik acayip güzeldi, aşırı mutlu ve heyecanlı hissettim.' ELSE i || ' Numaralı Kız Katılımcı: Ortam biraz stresliydi bence.' END), 
            jsonb_build_object('decision_time_ms', 2000), NOW()
        );
        
    END LOOP;
END $$;
