-- ============================================================
-- V-RAG Sistemi: Veritabanı Migration Dosyası
-- Adım 1-6 arası tüm tablolar, ENUM'lar, indeksler ve örnek veriler
-- ============================================================

-- Temiz başlangıç için (Development ONLY)
-- DROP TABLE IF EXISTS evaluations CASCADE;
-- DROP TABLE IF EXISTS spatial_temporal_logs CASCADE;
-- DROP TABLE IF EXISTS telemetry_streams CASCADE;
-- DROP TABLE IF EXISTS content_engagements CASCADE;
-- DROP TABLE IF EXISTS social_objects CASCADE;
-- DROP TABLE IF EXISTS master_identities CASCADE;

-- ============================================================
-- ADIM 1: Ana Kimlik ve Bilişsel Profilleme Sistemi
-- ============================================================

-- Rol tanımları için ENUM'lar
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('participant', 'mentor', 'admin');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status_enum AS ENUM ('active', 'suspended', 'inactive');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS master_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 1.1 Temel Kimlik ve Yetkilendirme
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role_enum DEFAULT 'participant',
    status user_status_enum DEFAULT 'active',
    
    -- 1.2 Fiziksel Eşleşme
    qr_hash VARCHAR(255) UNIQUE,
    
    -- 1.3 Cihaz ve Ağ Parmak İzi
    device_fingerprint JSONB DEFAULT '{}'::jsonb,
    
    -- 1.4 Bilişsel ve Psikolojik Profil
    cognitive_profile JSONB DEFAULT '{}'::jsonb,
    
    -- 1.5 Sistem Tarafından Üretilen Etiketler
    computed_tags JSONB DEFAULT '{"system_tags": [], "trait_flags": []}'::jsonb,
    
    -- Zaman damgaları
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMPTZ
);

-- GIN Index'ler (JSONB hızlı arama)
CREATE INDEX IF NOT EXISTS idx_master_identities_cognitive ON master_identities USING GIN (cognitive_profile);
CREATE INDEX IF NOT EXISTS idx_master_identities_tags ON master_identities USING GIN (computed_tags);
CREATE INDEX IF NOT EXISTS idx_master_identities_role_status ON master_identities(role, status);

-- ============================================================
-- ADIM 2: Sosyal Nesneler ve Hedefleme Motoru
-- ============================================================

DO $$ BEGIN
    CREATE TYPE social_object_type_enum AS ENUM (
        'mood_checkin',
        'slider_survey',
        'multiple_choice',
        'free_text',
        'announcement'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS social_objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Gönderiyi kimin oluşturduğu
    created_by UUID REFERENCES master_identities(id) ON DELETE SET NULL,
    
    -- 2.1 Nesne Tipi
    object_type social_object_type_enum NOT NULL,
    
    -- 2.2 Dinamik Hedefleme Motoru
    targeting_rules JSONB DEFAULT '{"must_match_all": {}, "must_match_any": {}, "exclude": {}}'::jsonb,
    
    -- 2.3 İçerik ve UI Payload'u
    ui_payload JSONB NOT NULL,
    
    -- 2.4 Yaşam Döngüsü ve Tetikleyiciler
    trigger_event VARCHAR(255),
    
    -- TTL Zaman Sınırları
    active_from TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    active_until TIMESTAMPTZ,
    
    -- Durum
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_social_objects_active ON social_objects (is_active, active_from, active_until);
CREATE INDEX IF NOT EXISTS idx_social_objects_trigger ON social_objects (trigger_event);
CREATE INDEX IF NOT EXISTS idx_social_objects_targeting ON social_objects USING GIN (targeting_rules);

-- ============================================================
-- ADIM 3: Kullanıcı Etkileşimleri ve Anket Yanıtları
-- ============================================================

DO $$ BEGIN
    CREATE TYPE interaction_nature_enum AS ENUM (
        'explicit',
        'implicit',
        'friction'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE action_type_enum AS ENUM (
        'answered',
        'liked',
        'downvoted',
        'bookmarked',
        'ignored',
        'abandoned'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS content_engagements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 3.1 İlişki Kurulumu (Actor -> Target)
    user_id UUID NOT NULL REFERENCES master_identities(id) ON DELETE CASCADE,
    object_id UUID NOT NULL REFERENCES social_objects(id) ON DELETE CASCADE,
    
    -- 3.2 Etkileşim Türleri
    nature interaction_nature_enum NOT NULL,
    action action_type_enum NOT NULL,
    
    -- 3.3 Yanıt Dinamikleri
    response_data JSONB DEFAULT '{}'::jsonb,
    
    -- 3.4 Kararsızlık Analizi ve Davranış
    behavioral_metrics JSONB DEFAULT '{}'::jsonb,
    
    -- Zaman Metrikleri
    seen_at TIMESTAMPTZ NOT NULL,
    interacted_at TIMESTAMPTZ,
    
    -- Mükerrer engeli
    CONSTRAINT unique_user_object_action UNIQUE (user_id, object_id, action)
);

CREATE INDEX IF NOT EXISTS idx_engagements_user_object ON content_engagements (user_id, object_id);
CREATE INDEX IF NOT EXISTS idx_engagements_nature_action ON content_engagements (nature, action);
CREATE INDEX IF NOT EXISTS idx_engagements_behavior ON content_engagements USING GIN (behavioral_metrics);

-- ============================================================
-- ADIM 4: Davranışsal Telemetri ve UI Logları
-- ============================================================

DO $$ BEGIN
    CREATE TYPE telemetry_event_type_enum AS ENUM (
        'session_start',
        'session_end',
        'viewport_visibility',
        'scroll_activity',
        'typing_dynamics',
        'click_reflex'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS telemetry_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 4.1 Oturum ve Kullanıcı Bağlantısı
    user_id UUID NOT NULL REFERENCES master_identities(id) ON DELETE CASCADE,
    session_id UUID NOT NULL,
    
    event_type telemetry_event_type_enum NOT NULL,
    
    -- Olayın gerçekleştiği sayfa veya UI bileşeni
    target_path VARCHAR(255) NOT NULL,
    
    -- 4.2, 4.3 ve 4.4 Esnek metrik alanı
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Zaman damgası
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_telemetry_user_session ON telemetry_streams (user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_event_type ON telemetry_streams (event_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_created_at ON telemetry_streams (created_at);
CREATE INDEX IF NOT EXISTS idx_telemetry_metrics ON telemetry_streams USING GIN (metrics);

-- ============================================================
-- ADIM 5: Fiziksel Konum ve QR Yoklama Matrisi
-- ============================================================

DO $$ BEGIN
    CREATE TYPE punctuality_status_enum AS ENUM (
        'early',
        'on_time',
        'late',
        'absent'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS spatial_temporal_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Okutma yapan kişi
    user_id UUID NOT NULL REFERENCES master_identities(id) ON DELETE CASCADE,
    
    -- Etkinlik / Oturum Referansı
    session_id UUID NOT NULL,
    
    -- 5.1 Mekansal Tanımlamalar
    terminal_id VARCHAR(50) NOT NULL,
    physical_zone VARCHAR(100) NOT NULL,
    
    -- 5.2 Zaman ve Disiplin
    scan_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expected_time TIMESTAMPTZ,
    delay_minutes INT DEFAULT 0,
    punctuality punctuality_status_enum NOT NULL,
    
    -- 5.3 & 5.4 Fiziksel Yakınlık ve Yerleşim Verisi
    spatial_context JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spatial_user_session ON spatial_temporal_logs (user_id, session_id);
CREATE INDEX IF NOT EXISTS idx_spatial_zone_time ON spatial_temporal_logs (physical_zone, scan_time);
CREATE INDEX IF NOT EXISTS idx_spatial_punctuality ON spatial_temporal_logs (punctuality);
CREATE INDEX IF NOT EXISTS idx_spatial_context ON spatial_temporal_logs USING GIN (spatial_context);

-- ============================================================
-- ADIM 6: Mentor Gözlemleri ve Sistem Değerlendirmeleri
-- ============================================================

DO $$ BEGIN
    CREATE TYPE evaluation_category_enum AS ENUM (
        'technical_skills',
        'team_dynamics',
        'behavioral',
        'milestone'
    );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 6.1 Değerlendiren ve Değerlendirilen
    evaluator_id UUID NOT NULL REFERENCES master_identities(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES master_identities(id) ON DELETE CASCADE,
    
    -- 6.2 Kategori Yönetimi
    category evaluation_category_enum NOT NULL,
    
    -- 6.3 Sayısal Metrikler
    score_1_to_100 INT CHECK (score_1_to_100 >= 1 AND score_1_to_100 <= 100),
    score_1_to_5 INT CHECK (score_1_to_5 >= 1 AND score_1_to_5 <= 5),
    
    -- Mentorun ham notu
    raw_mentor_note TEXT,
    
    -- 6.4 NLP ve AI Çıkarımları
    ai_extracted_insights JSONB DEFAULT '{}'::jsonb,
    
    -- Değerlendirme tarihi
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_evaluations_target ON evaluations (target_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluator ON evaluations (evaluator_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_category ON evaluations (category);
CREATE INDEX IF NOT EXISTS idx_evaluations_insights ON evaluations USING GIN (ai_extracted_insights);

-- ============================================================
-- Tüm tablolar başarıyla oluşturuldu!
-- ============================================================
SELECT 'TABLOLAR OLUSTURULDU' AS durum;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
