-- ============================================================
-- V-RAG: Gelişmiş Veri Fabrikası (400+ Kullanıcı & Dinamik İlişkiler)
-- ============================================================

DO $$ 
DECLARE 
    mentor_ids UUID[];
    teacher_ids UUID[];
    participant_ids UUID[];
    event_ids UUID[];
    group_ids UUID[];
    u_id UUID;
    e_id UUID;
    g_id UUID;
    i INT;
BEGIN
    -- 1. Mentörleri Oluştur (20 Adet)
    FOR i IN 1..20 LOOP
        u_id := gen_random_uuid();
        INSERT INTO master_identities (id, email, password_hash, role, cognitive_profile, computed_tags)
        VALUES (
            u_id, 
            'mentor_' || i || '@vizyon.com', 
            'hash_pass_123', 
            'mentor', 
            jsonb_build_object('name', 'Mentor ' || i, 'expertise', ARRAY['Leadership', 'Tech', 'Networking']),
            jsonb_build_object('system_tags', ARRAY['experienced', 'mentor_role'], 'trait_flags', ARRAY['Lider'])
        ) ON CONFLICT (email) DO NOTHING;
    END LOOP;

    -- 2. Eğitmenleri / Hocaları Oluştur (10 Adet)
    FOR i IN 1..10 LOOP
        u_id := gen_random_uuid();
        INSERT INTO master_identities (id, email, password_hash, role, cognitive_profile)
        VALUES (
            u_id, 
            'hoca_' || i || '@vizyon.com', 
            'hash_pass_123', 
            'admin', 
            jsonb_build_object('name', 'Dr. Eğitmen ' || i, 'academic_info', 'PhD Computer Science')
        ) ON CONFLICT (email) DO NOTHING;
    END LOOP;

    -- 3. Katılımcıları Oluştur (400 Adet)
    -- Mevcutları silip temiz bir 400 kişi yapmak için truncate veya delete kullanmıyoruz, sadece eksikleri tamamlıyoruz.
    FOR i IN 1..400 LOOP
        u_id := gen_random_uuid();
        INSERT INTO master_identities (id, email, password_hash, role, cognitive_profile, computed_tags)
        VALUES (
            u_id, 
            'katilimci_' || i || '@vizyon.com', 
            'hash_pass_123', 
            'participant', 
            jsonb_build_object(
                'name', 'Katılımcı ' || i, 
                'stress_index', floor(random() * 100), 
                'engagement_score', floor(random() * 100),
                'leadership_score', floor(random() * 100)
            ),
            jsonb_build_object(
                'system_tags', ARRAY['vamp_2026'], 
                'trait_flags', CASE 
                    WHEN i % 10 = 0 THEN ARRAY['Lider']
                    WHEN i % 7 = 0 THEN ARRAY['Stresli']
                    WHEN i % 5 = 0 THEN ARRAY['Köprü Kurucu']
                    ELSE ARRAY['Gözlemci']
                END
            )
        ) ON CONFLICT (email) DO NOTHING;
    END LOOP;

    -- IDs collection for reliable mapping (fetching what we just inserted or already had)
    SELECT ARRAY(SELECT id FROM master_identities WHERE role = 'mentor') INTO mentor_ids;
    SELECT ARRAY(SELECT id FROM master_identities WHERE role = 'admin') INTO teacher_ids;
    SELECT ARRAY(SELECT id FROM master_identities WHERE role = 'participant') INTO participant_ids;

    -- 4. Grupları Oluştur (8 Büyük Grup)
    FOR i IN 1..8 LOOP
        g_id := gen_random_uuid();
        INSERT INTO groups (id, name, mentor_id, metadata)
        VALUES (
            g_id, 
            'Grup ' || CHR(64 + i),
            mentor_ids[i % array_length(mentor_ids, 1) + 1],
            jsonb_build_object('focus', 'Deep Dive ' || i)
        ) ON CONFLICT DO NOTHING;
    END LOOP;
    
    SELECT ARRAY(SELECT id FROM groups) INTO group_ids;

    -- Grup Üyeliklerini Ata (Her grup için yaklaşık 50 kişi)
    FOR i IN 1..array_length(group_ids, 1) LOOP
        FOR j IN 1..50 LOOP
            u_id := participant_ids[((i-1)*50 + j) % array_length(participant_ids, 1) + 1];
            INSERT INTO group_members (group_id, user_id)
            VALUES (group_ids[i], u_id) ON CONFLICT DO NOTHING;
        END LOOP;
    END LOOP;

    -- 5. Etkinlikleri Oluştur (10 Adet)
    FOR i IN 1..10 LOOP
        e_id := gen_random_uuid();
        INSERT INTO events (id, title, description, event_type, location, start_time, end_time)
        VALUES (
            e_id, 
            'Zirve Oturumu ' || i, 
            'Yapay Zeka ve Gelecek Vizyonu ' || i,
            CASE WHEN i % 3 = 0 THEN 'workshop' WHEN i % 2 = 0 THEN 'conference' ELSE 'social' END,
            'Ana Salon ' || i,
            NOW() + (i || ' hours')::interval,
            NOW() + (i + 2 || ' hours')::interval
        ) ON CONFLICT DO NOTHING;
    END LOOP;

    SELECT ARRAY(SELECT id FROM events) INTO event_ids;

    -- Her etkinliğe 2 mentor, 1 hoca ve 2 grup ata
    FOR i IN 1..array_length(event_ids, 1) LOOP
        e_id := event_ids[i];
        
        -- Mentorlar
        INSERT INTO event_assignments (event_id, user_id, role) VALUES (e_id, mentor_ids[i % array_length(mentor_ids, 1) + 1], 'mentor') ON CONFLICT DO NOTHING;
        INSERT INTO event_assignments (event_id, user_id, role) VALUES (e_id, mentor_ids[(i+1) % array_length(mentor_ids, 1) + 1], 'mentor') ON CONFLICT DO NOTHING;
        
        -- Hoca
        INSERT INTO event_assignments (event_id, user_id, role) VALUES (e_id, teacher_ids[i % array_length(teacher_ids, 1) + 1], 'teacher') ON CONFLICT DO NOTHING;
        
        -- Gruplar
        INSERT INTO event_groups (event_id, group_id) VALUES (e_id, group_ids[i % array_length(group_ids, 1) + 1]) ON CONFLICT DO NOTHING;
        INSERT INTO event_groups (event_id, group_id) VALUES (e_id, group_ids[(i+1) % array_length(group_ids, 1) + 1]) ON CONFLICT DO NOTHING;
    END LOOP;

    -- 6. Rastgele Etkileşimler (Anketler ve Yanıtlar)
    -- Bu kısım UI grafiklerinin dolu gözükmesi için önemlidir
    RAISE NOTICE 'Veri fabrikası çalışması tamamlandı.';
END $$;

SELECT '400+ KULLANICI VE ILISKILERI BASARIYLA ORETLDI' AS sonuc;
