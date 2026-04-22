Harika, sistemin asıl "zekasını" konuşturacağımız yere geldik! **Adım 2: Sosyal Nesneler ve Hedefleme Motoru (social_objects)**.

Bu tablo, sıradan bir "gönderiler" tablosu değildir. Hem Frontend'in (ViteJS) ekranı nasıl çizeceğini belirten `ui_payload` verisini, hem de Backend'in bu içeriği kimlere göstereceğini belirten `targeting_rules` kural setini içinde barındırır.

Bu mimarinin en büyük avantajı: **Yeni bir anket türü veya yeni bir hedefleme kuralı eklemek istediğinizde veritabanı şemasına dokunmanıza gerek kalmaz.**

İşte Adım 2 için PostgreSQL tasarımı, JSONB şemaları ve örnek sorgular:

### 1. SQL Tablo Tasarımı (PostgreSQL)

```sql
-- İçerik tiplerini belirliyoruz. Bu tipler Frontend'in hangi componenti render edeceğini söyler.
CREATE TYPE social_object_type_enum AS ENUM (
    'mood_checkin',     -- Büyük emojili duygu durumu
    'slider_survey',    -- 1-5 veya 1-100 arası kaydırıcı
    'multiple_choice',  -- Çoktan seçmeli anket/akademik soru
    'free_text',        -- Serbest metin/fikir toplama
    'announcement'      -- Sadece okunacak statik duyuru
);

CREATE TABLE social_objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Gönderiyi kimin/hangi sistemin oluşturduğu (Opsiyonel: Sistem otomatik atmışsa null olabilir)
    created_by UUID REFERENCES master_identities(id) ON DELETE SET NULL,
    
    -- 2.1 Nesne Tipi
    object_type social_object_type_enum NOT NULL,
    
    -- 2.2 Dinamik Hedefleme Motoru (Kimin akışına düşecek?)
    targeting_rules JSONB DEFAULT '{"must_match_all": {}, "must_match_any": {}, "exclude": {}}'::jsonb,
    
    -- 2.3 İçerik ve UI Payload'u (Ekranda ne görünecek?)
    ui_payload JSONB NOT NULL,
    
    -- 2.4 Yaşam Döngüsü ve Tetikleyiciler (Fiziksel Olaylar)
    trigger_event VARCHAR(255), -- Örn: 'location_scan_yemekhane' (Fiziksel tetikleyici yoksa NULL)
    
    -- TTL (Time-To-Live) Zaman Sınırları
    active_from TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    active_until TIMESTAMPTZ, -- Gönderinin yayından kalkacağı saat
    
    -- Durum
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Hızlı akış (feed) oluşturmak için indekslemeler
CREATE INDEX idx_social_objects_active ON social_objects (is_active, active_from, active_until);
CREATE INDEX idx_social_objects_trigger ON social_objects (trigger_event);
-- JSONB içindeki kuralları hızlı okumak için GIN
CREATE INDEX idx_social_objects_targeting ON social_objects USING GIN (targeting_rules);
```

### 2. JSONB Yapılarının Detaylı Şeması

Bu şemalar, sistemi kodlarken en çok işinize yarayacak kısımlardır.

**`targeting_rules` (Hedefleme Kural Seti) Örneği:**
Frontend bu kuralı bilmez, sadece Backend bu JSON'u okur, `master_identities` tablosuyla karşılaştırır ve eşleşen kullanıcılara bu nesneyi gönderir.
```json
{
  "must_match_all": {
    "role": "participant",
    "big_five.extraversion_gt": 70  // Dışa dönüklük > 70 olmalı
  },
  "must_match_any": {
    "career_interests": ["Yapay Zeka", "Veri Bilimi"] // İkisinden biri olsa yeterli
  },
  "exclude": {
    "system_tags": ["Disiplinsiz", "Uyarı_Aldı"] // Bu etiketlere sahip olanlar GÖREMEZ
  }
}
```

**`ui_payload` (Arayüz ve İçerik Paketi) Örneği:**
Frontend (ViteJS), Backend'den gelen bu JSON'u alır ve saniyesinde UI'a çevirir. Backend UI'ın rengine kadar her şeyi dikte eder.
```json
{
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
    "time_limit_seconds": 15,          // Hızlı cevaplama stresi ölçümü için
    "allow_change_mind": true          // Fikrini değiştirmeye izin ver
  }
}
```

### 3. Örnek Veri Ekleme (INSERT) Sorguları

Sistemin esnekliğini göstermek için 2 farklı senaryo ekliyorum. Biri "Sadece İçe Dönüklere" giden bir anket, diğeri ise Yemekhane'de QR okutunca tetiklenen (Trigger_event) bir fiziksel anket.

```sql
-- Örnek 1: Sadece "İçe Dönük" ve "Teorik" öğrenenlere gidecek, süreli bir Slider Anketi
INSERT INTO social_objects (
    object_type, targeting_rules, ui_payload, active_until
) VALUES (
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
    CURRENT_TIMESTAMP + INTERVAL '12 hours' -- 12 saat sonra yayından kalkar
);


-- Örnek 2: Zaman veya hedef kitle bağımsız, sadece YEMEKHANE'DE QR okutulduğunda anında telefonuna düşecek olan Duygu Durumu Anketi
INSERT INTO social_objects (
    object_type, targeting_rules, ui_payload, trigger_event, is_active
) VALUES (
    'mood_checkin',
    '{"must_match_all": {}, "must_match_any": {}, "exclude": {}}'::jsonb, -- Herkese açık ama sadece tetikleyiciyle çalışır
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
    'location_scan_yemekhane', -- Kullanıcı Adım 5'teki yoklama sisteminde bu işlemi yaptığı an tetiklenir
    TRUE
);
```

### Bu Tasarım Nasıl Çalışacak? (Mental Model)
Kullanıcı uygulamayı açtığında Backend şunları yapar:
1. `master_identities` tablosundan kullanıcının `cognitive_profile` ve etiketlerini çeker.
2. `social_objects` tablosunda `is_active=TRUE` olan gönderileri süzer.
3. Gönderilerin `targeting_rules` kuralları ile kullanıcının profili kesişiyorsa nesneyi "Feed" (Akış) olarak JSON listesi halinde Frontend'e (ViteJS) gönderir.
4. Frontend sadece `ui_payload` okur ve butonları, renkleri, metinleri ekrana çizer.

Adım 2 de tamamsa, kullanıcının bu anketlere verdiği cevapları, kararsızlık sürelerini ve pasif/aktif etkileşimlerini (veri madenciliğinin kalbini) yakalayacağımız **"Adım 3: Kullanıcı Etkileşimleri ve Anket Yanıtları"** tablosuna geçmek için **Adım 3** yazabilirsiniz!