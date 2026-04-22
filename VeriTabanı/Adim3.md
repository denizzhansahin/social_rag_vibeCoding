Veri madenciliğinin kalbine, sistemin en değerli verilerini toplayacağı yere geldik! **Adım 3: Kullanıcı Etkileşimleri ve Anket Yanıtları (content_engagements)**.

Kullanıcıların ne söyledikleri (Yanıt) kadar, **nasıl söyledikleri (Kararsızlık, Hız, Görmezden Gelme)** de yapay zeka için bir o kadar önemlidir. Bu tablo, kullanıcının ekrandaki bir nesneyle girdiği her türlü fiziksel ve psikolojik etkileşimi loglayacak.

İşte Adım 3 için PostgreSQL tasarımı, JSONB şemaları ve örnek sorgular:

### 1. SQL Tablo Tasarımı (PostgreSQL)

```sql
-- Etkileşimin doğasını belirliyoruz (Aktif mi, Pasif mi, Sürtünme mi?)
CREATE TYPE interaction_nature_enum AS ENUM (
    'explicit',  -- Aktif (Cevap verdi, beğendi)
    'implicit',  -- Pasif (Kaydırdı geçti, görmezden geldi)
    'friction'   -- Sürtünme/Kararsızlık (Başladı ama bitirmedi, vazgeçti)
);

-- Tam olarak ne yaptığını belirliyoruz
CREATE TYPE action_type_enum AS ENUM (
    'answered',      -- Anket/Soru cevaplandı
    'liked',         -- Beğenildi (🔥)
    'downvoted',     -- Katılmıyorum / Beğenmedim (👎)
    'bookmarked',    -- Kaydedildi (Daha sonra bakmak için)
    'ignored',       -- Ekrandaydı ama etkileşime girilmedi (Hızlıca kaydırıldı)
    'abandoned'      -- Şık seçti ama "Gönder"e basmadan sayfadan çıktı
);

CREATE TABLE content_engagements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 3.1 İlişki Kurulumu (Actor -> Target)
    user_id UUID NOT NULL REFERENCES master_identities(id) ON DELETE CASCADE,
    object_id UUID NOT NULL REFERENCES social_objects(id) ON DELETE CASCADE,
    
    -- 3.2 Etkileşim Türleri
    nature interaction_nature_enum NOT NULL,
    action action_type_enum NOT NULL,
    
    -- 3.3 Yanıt Dinamikleri (Kullanıcının verdiği asıl cevap)
    response_data JSONB DEFAULT '{}'::jsonb,
    
    -- 3.4 Kararsızlık Analizi ve Davranış (Nasıl cevap verdiği)
    behavioral_metrics JSONB DEFAULT '{}'::jsonb,
    
    -- Zaman Metrikleri (Telemetri açısından çok kritik)
    seen_at TIMESTAMPTZ NOT NULL, -- Nesnenin ekranda (viewport) tam göründüğü an
    interacted_at TIMESTAMPTZ,    -- Aksiyonun gerçekleştiği veya ekrandan çıktığı an
    
    -- Aynı nesneye mükerrer aktif cevap verilmesini engellemek için (Opsiyonel)
    CONSTRAINT unique_user_object_action UNIQUE (user_id, object_id, action)
);

-- Analiz ve AI modelleri için hızlı veri çekme indeksleri
CREATE INDEX idx_engagements_user_object ON content_engagements (user_id, object_id);
CREATE INDEX idx_engagements_nature_action ON content_engagements (nature, action);
CREATE INDEX idx_engagements_behavior ON content_engagements USING GIN (behavioral_metrics);
```

### 2. JSONB Yapılarının Detaylı Şeması

Bu yapılar, yapay zekanın "karakter analizi" yaparken besleneceği ana damarlardır. Frontend tarafı, kullanıcının hareketlerini dinler ve bu JSON'ları Backend'e yollar.

**`response_data` (Yanıt) Örneği:**
Eğer `action = answered` ise bu alan dolar.
```json
{
  "selected_option_id": "opt_2",
  "selected_value": 3,
  "free_text_answer": null,
  "is_correct": true  // Eğer akademik bir soruysa sistem tarafından eklenir
}
```

**`behavioral_metrics` (Kararsızlık ve Refleks) Örneği:**
Bu veri bir öğrencinin analitik mi yoksa dürtüsel mi karar verdiğini gösterir.
```json
{
  "decision_time_ms": 4250,       // Gördüğü an ile cevapladığı an arasındaki süre
  "changed_mind_count": 2,        // Şıklar arasında kaç kere gidip geldiği
  "hover_duration_ms": 1500,      // Fareyi/Parmağını bir şıkkın üzerinde ne kadar beklettiği
  "scroll_speed_px_sec": null     // Eğer 'ignored' (hızlıca geçti) ise kaydırma hızı
}
```

### 3. Örnek Veri Ekleme (INSERT) Sorguları

Farklı kullanıcı davranışlarını simüle eden 3 farklı senaryo:

```sql
-- Örnek 1: Aktif ve Net Bir Yanıt (Dürtüsel Karar)
-- Kullanıcı soruyu gördü ve hiç fikrini değiştirmeden 1.2 saniyede cevapladı.
INSERT INTO content_engagements (
    user_id, object_id, nature, action, response_data, behavioral_metrics, seen_at, interacted_at
) VALUES (
    '11111111-1111-1111-1111-111111111111', -- UUID (Örnek)
    '22222222-2222-2222-2222-222222222222', -- UUID (Örnek)
    'explicit', 
    'answered',
    '{"selected_option_id": "m_1", "selected_value": 5}'::jsonb,
    '{"decision_time_ms": 1200, "changed_mind_count": 0, "hover_duration_ms": 0}'::jsonb,
    '2024-10-25 10:00:00+00', 
    '2024-10-25 10:00:01.2+00'
);

-- Örnek 2: Kararsızlık ve Sürtünme (Analitik veya Stresli)
-- Kullanıcı soruyu gördü, şıklar arasında 3 kere gidip geldi, 8 saniye sonra cevapladı.
INSERT INTO content_engagements (
    user_id, object_id, nature, action, response_data, behavioral_metrics, seen_at, interacted_at
) VALUES (
    '33333333-3333-3333-3333-333333333333', 
    '22222222-2222-2222-2222-222222222222', 
    'explicit', 
    'answered',
    '{"selected_option_id": "opt_3", "selected_value": "Python"}'::jsonb,
    '{"decision_time_ms": 8450, "changed_mind_count": 3, "hover_duration_ms": 2100}'::jsonb,
    '2024-10-25 10:05:00+00', 
    '2024-10-25 10:05:08.45+00'
);

-- Örnek 3: Pasif Etkileşim (Görmezden Gelme / İlgisizlik)
-- Anket ekrana girdi ama kullanıcı duraksamadan yüksek hızla aşağı kaydırdı (ignored).
INSERT INTO content_engagements (
    user_id, object_id, nature, action, response_data, behavioral_metrics, seen_at, interacted_at
) VALUES (
    '44444444-4444-4444-4444-444444444444', 
    '55555555-5555-5555-5555-555555555555', 
    'implicit', 
    'ignored',
    '{}'::jsonb,
    '{"scroll_speed_px_sec": 850, "decision_time_ms": null}'::jsonb,
    '2024-10-25 10:10:00+00', 
    '2024-10-25 10:10:00.3+00'
);
```

### Yapay Zeka Bu Veriyle Ne Yapacak? (Mimarinin Gücü)
*   Eğer bir kullanıcı sürekli `changed_mind_count > 2` değerine sahipse, AI `master_identities` tablosundaki (Adım 1) `computed_tags` listesine otomatik olarak **"Kararsız"** veya **"Aşırı Analitik"** etiketini ekleyecek.
*   Bir konudaki anketleri sürekli `ignored` yapıyorsa (örn. Yapay Zeka anketlerini hızlıca geçiyorsa), hedefleme motoru (Adım 2) `exclude` kuralı gereği artık ona yapay zeka ile ilgili anket göstermeyecek.

Ekranda sadece anketlerle değil, uygulamanın geneliyle (Oturum süreleri, yazı yazma refleksleri, backspace kullanım oranları) olan etkileşimini yakalayacağımız **"Adım 4: Davranışsal Telemetri ve UI Logları"**na geçmek için **Adım 4** yazabilirsiniz!