Harika! Temeli en sağlam şekilde atıyoruz. Adım 1, sistemin kalbidir. Kullanıcıların kimliklerini, fiziksel karşılıklarını (QR) ve en önemlisi **JSONB** esnekliği sayesinde sürekli güncellenecek olan bilişsel profillerini bu tabloda tutacağız.

PostgreSQL mimarisine uygun olarak, JSONB alanlarında yüksek performanslı aramalar yapabilmek için gerekli indekslemeleri (GIN Index) de ekliyorum.

İşte **Adım 1: Ana Kimlik ve Bilişsel Profilleme Sistemi** için veritabanı tasarımı:

### 1. SQL Tablo Tasarımı (PostgreSQL)

```sql
-- Rol tanımları için bir ENUM (Tip) oluşturuyoruz (Daha güvenli ve performanslı)
CREATE TYPE user_role_enum AS ENUM ('participant', 'mentor', 'admin');
CREATE TYPE user_status_enum AS ENUM ('active', 'suspended', 'inactive');

CREATE TABLE master_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 1.1 Temel Kimlik ve Yetkilendirme
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Şifrelenmiş parola
    role user_role_enum DEFAULT 'participant',
    status user_status_enum DEFAULT 'active',
    
    -- 1.2 Fiziksel Eşleşme
    qr_hash VARCHAR(255) UNIQUE, -- Yaka kartı veya mobil app içindeki eşsiz QR kodu
    
    -- 1.3 Cihaz ve Ağ Parmak İzi
    device_fingerprint JSONB DEFAULT '{}'::jsonb,
    
    -- 1.4 Bilişsel ve Psikolojik Profil
    cognitive_profile JSONB DEFAULT '{}'::jsonb,
    
    -- 1.5 Sistem Tarafından Üretilen Etiketler (Yapay Zeka Çıktıları)
    computed_tags JSONB DEFAULT '{"system_tags": [], "trait_flags": []}'::jsonb,
    
    -- Zaman damgaları
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMPTZ
);

-- JSONB alanları üzerinde hızlı arama yapabilmek için GIN Index'leri oluşturuyoruz.
-- Bu sayede "Belbin rolü 'Fikir Üretici' olanları getir" sorgusu milisaniyeler sürer.
CREATE INDEX idx_master_identities_cognitive ON master_identities USING GIN (cognitive_profile);
CREATE INDEX idx_master_identities_tags ON master_identities USING GIN (computed_tags);
CREATE INDEX idx_master_identities_role_status ON master_identities(role, status);
```

### 2. JSONB Yapılarının Detaylı Şeması

Bu JSONB yapıları uygulamanın beynidir. Kodlama sırasında (Backend'de Pydantic veya Frontend'de TypeScript interfaceleri yazarken) bu şemaları referans alacaksın.

**`device_fingerprint` Örneği:**
```json
{
  "os": "iOS 17.1",
  "device_model": "iPhone 13 Pro",
  "screen_resolution": "1170x2532",
  "connection_type": "WIFI",
  "browser": "Safari",
  "app_version": "1.0.4"
}
```

**`cognitive_profile` Örneği:** (Big Five, Belbin, Karar Alma vs.)
```json
{
  "big_five": {
    "extraversion": 85,
    "conscientiousness": 90,
    "agreeableness": 65,
    "stress_tolerance": 70,
    "openness_to_experience": 95
  },
  "learning_style": "practical",        // "theoretical" | "practical"
  "decision_making": "analytical",      // "impulsive" | "analytical"
  "belbin_role": "Fikir Üretici",       // "Şekillendirici" | "Koordinatör" | "İcracı"
  "motivation_anchor": "process_enjoyment", // "external_appreciation" | "internal_success" | "process_enjoyment"
  "career_interests": ["Yapay Zeka", "Girişimcilik", "IoT"]
}
```

**`computed_tags` Örneği:** (Yapay zekanın arka planda güncellediği alan)
```json
{
  "system_tags": ["Gece Kuşu", "Gizli Lider", "Veri Meraklısı"],
  "trait_flags": ["risk_taker", "high_empathy"],
  "last_ai_analysis_at": "2024-10-24T18:30:00Z"
}
```

### 3. Örnek Veri Ekleme (INSERT) Sorguları

Bu sorgular, sistemin nasıl test edileceğini gösterir. Bir katılımcı ve bir mentor profili ekliyoruz.

```sql
-- Örnek 1: Oldukça dışa dönük, analitik ve girişimcilik odaklı bir katılımcı (Öğrenci)
INSERT INTO master_identities (
    email, password_hash, role, qr_hash, device_fingerprint, cognitive_profile, computed_tags
) VALUES (
    'ali.yilmaz@example.com', 
    'hashed_password_string_1', 
    'participant', 
    'qr_hash_abc123_xyz',
    '{"os": "Android 14", "device_model": "Samsung S23", "connection_type": "5G"}'::jsonb,
    '{
        "big_five": {"extraversion": 88, "conscientiousness": 75, "agreeableness": 80, "stress_tolerance": 60, "openness_to_experience": 90},
        "learning_style": "practical",
        "decision_making": "impulsive",
        "belbin_role": "Şekillendirici",
        "motivation_anchor": "external_appreciation",
        "career_interests": ["Girişimcilik", "Yapay Zeka"]
    }'::jsonb,
    '{"system_tags": ["Sosyal Kelebek", "Risk Alıcı"], "trait_flags": ["quick_responder"]}'::jsonb
);

-- Örnek 2: Analitik, teorik, veri odaklı bir Mentor
INSERT INTO master_identities (
    email, password_hash, role, qr_hash, device_fingerprint, cognitive_profile, computed_tags
) VALUES (
    'ayse.mentor@example.com', 
    'hashed_password_string_2', 
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
    '{"system_tags": ["Derin Düşünür", "Analitik Uzman"], "trait_flags": ["detail_oriented"]}'::jsonb
);
```

### Tasarımın Gücü:
*   **Esneklik:** Yarın "Öğrenme Stilleri"ne "Görsel" veya "İşitsel" eklemek isterseniz, veritabanı şemasını değiştirmek (ALTER TABLE) zorunda değilsiniz. Sadece JSON'a eklersiniz.
*   **Hedefleme Altyapısı Hazır:** İkinci adımdaki dinamik hedefleme motoru, doğrudan buradaki GIN indeksli JSONB verilerine `WHERE cognitive_profile->'big_five'->>'extraversion' > '80'` gibi sorgular atarak inanılmaz hızlı çalışacak.

Adım 1 tamamsa, sistemin beyni olan ve kullanıcıların ana ekranını şekillendirecek **"Adım 2: Sosyal Nesneler ve Hedefleme Motoru"** veritabanı tasarımına geçmek için onayınızı (Adım 2) bekliyorum!