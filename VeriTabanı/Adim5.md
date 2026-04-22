Sistemin fiziksel dünyaya dokunan en heyecan verici adımlarından birine geldik: **Adım 5: Fiziksel Konum ve QR Yoklama Matrisi (spatial_temporal_logs)**.

Bu adım, dijital psikolojik analizi *gerçek dünya davranışlarıyla* harmanlar. Kullanıcı bir eğitime veya etkinliğe zamanında mı geldi? (Disiplin). Salonda sürekli aynı kişilerin yanına mı oturuyor? (Sosyal Kümelenme). Kendi takımındaki liderin yakınına mı oturuyor yoksa uzağa mı kaçıyor? (Takım İçi Uyumu).

İşte tüm bu soruların cevaplarını çıkaracağımız PostgreSQL tasarımı, JSONB şemaları ve örnek sorgular:

### 1. SQL Tablo Tasarımı (PostgreSQL)

```sql
-- Kullanıcının okutma yaptığı andaki disiplin durumunu tutan ENUM
CREATE TYPE punctuality_status_enum AS ENUM (
    'early',      -- Etkinlikten çok önce geldi
    'on_time',    -- Tam zamanında geldi
    'late',       -- Geç kaldı
    'absent'      -- Hiç gelmedi (Sistem tarafından gün sonunda atanır)
);

CREATE TABLE spatial_temporal_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Okutma yapan kişi
    user_id UUID NOT NULL REFERENCES master_identities(id) ON DELETE CASCADE,
    
    -- Etkinlik / Oturum Referansı (Eğer bir etkinlik tablonuz varsa oraya REFERENCES verebilirsiniz)
    -- Şimdilik UUID olarak bırakıyoruz.
    session_id UUID NOT NULL, 
    
    -- 5.1 Mekansal Tanımlamalar
    terminal_id VARCHAR(50) NOT NULL, -- Hangi cihaz/okuyucu ile bu işlem yapıldı? (Örn: TERM_01)
    physical_zone VARCHAR(100) NOT NULL, -- Fiziksel bölge (Örn: 'Ana_Salon_Arka', 'Yemekhane_Giris')
    
    -- 5.2 Zaman ve Disiplin
    scan_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Okutma anı
    expected_time TIMESTAMPTZ, -- Normalde olması gereken saat
    delay_minutes INT DEFAULT 0, -- Negatifse erken, pozitifse geç kalmıştır
    punctuality punctuality_status_enum NOT NULL,
    
    -- 5.3 & 5.4 Fiziksel Yakınlık ve Yerleşim Verisi (Çok Kritik!)
    spatial_context JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Fiziksel analizler ve yoklama raporları için kritik indeksler
CREATE INDEX idx_spatial_user_session ON spatial_temporal_logs (user_id, session_id);
CREATE INDEX idx_spatial_zone_time ON spatial_temporal_logs (physical_zone, scan_time);
CREATE INDEX idx_spatial_punctuality ON spatial_temporal_logs (punctuality);
CREATE INDEX idx_spatial_context ON spatial_temporal_logs USING GIN (spatial_context);
```

### 2. JSONB Yapılarının Detaylı Şeması

Bu JSON alanı, kullanıcının o anki fiziksel çevresini modelliyor. Python (FastAPI) tarafı bu veriyi kullanarak **Neo4j (Graf Veritabanı - Adım 7)** üzerinde `[:YANYANA_OTURDU]` ilişkilerini kuracak.

**`spatial_context` Örneği:**
Bu veri, kişi terminale QR okuttuğu an, sistemin o terminalde son 30 saniye içinde okutma yapan *diğer* kişileri tespit edip buraya yazmasıyla oluşur. (Kuyrukta kiminle beraber bekliyor/sohbet ediyor analizi).
```json
{
  "assigned_seat": "A-14",          // Sistem ona nereyi atamıştı?
  "actual_seat": "C-22",            // Nereye oturdu? (Atanan yere oturmadıysa 'İsyankar' veya 'Sosyal Tercih')
  "concurrent_scans_30sec": [       // Son 30 saniye içinde aynı bölgede (terminalde) okutma yapan UUID'ler
    "22222222-2222-2222-2222-222222222222",
    "33333333-3333-3333-3333-333333333333"
  ],
  "cluster_density": "high"         // O bölgedeki genel yoğunluk (Yüksek, Orta, Düşük)
}
```

### 3. Örnek Veri Ekleme (INSERT) Sorguları

Fiziksel dünyada yaşanabilecek 2 farklı senaryoyu modelledim:

```sql
-- Örnek 1: Disiplinli ve Kurallara Uyan Katılımcı
-- Beklenen saatten 10 dakika önce geldi, kendisine atanan koltuğa oturdu. Yanında 2 kişi daha var.
INSERT INTO spatial_temporal_logs (
    user_id, session_id, terminal_id, physical_zone, 
    scan_time, expected_time, delay_minutes, punctuality, spatial_context
) VALUES (
    '11111111-1111-1111-1111-111111111111', 
    'evt-ai-workshop-001', 
    'TERM_ANA_SALON_01', 
    'Ana_Salon_On_Sira',
    '2024-10-26 08:50:00+00', 
    '2024-10-26 09:00:00+00', 
    -10, 
    'early',
    '{
        "assigned_seat": "A-01", 
        "actual_seat": "A-01", 
        "concurrent_scans_30sec": ["55555555-5555-5555-5555-555555555555"],
        "cluster_density": "low"
    }'::jsonb
);


-- Örnek 2: Disiplinsiz veya Takımdan Kopuk Katılımcı
-- 15 dakika geç kaldı. Kendisine A Blok'ta yer atanmasına rağmen, gidip en arkada C Blok'a oturdu.
INSERT INTO spatial_temporal_logs (
    user_id, session_id, terminal_id, physical_zone, 
    scan_time, expected_time, delay_minutes, punctuality, spatial_context
) VALUES (
    '22222222-2222-2222-2222-222222222222', 
    'evt-ai-workshop-001', 
    'TERM_ANA_SALON_02', 
    'Ana_Salon_Arka_Sira',
    '2024-10-26 09:15:00+00', 
    '2024-10-26 09:00:00+00', 
    15, 
    'late',
    '{
        "assigned_seat": "A-15", 
        "actual_seat": "C-42", 
        "concurrent_scans_30sec": [],
        "cluster_density": "high"
    }'::jsonb
);
```

### Yapay Zeka Bu Veriyle Ne Yapacak? (Mimarinin Gücü)

1.  **Disiplin Skoru:** Bir kullanıcının sürekli `punctuality = 'late'` logları varsa, AI modeli (Adım 1'deki) Big Five profiline gider ve **"Sorumluluk Bilinci (Conscientiousness)"** skorunu otomatik olarak **düşürür**.
2.  **Sosyal Ağ Analizi (Neo4j):** Adım 7'de, `concurrent_scans_30sec` içindeki UUID'ler Neo4j'ye gönderilir. A ve B kişileri 3 farklı etkinlikte aynı saniyelerde kapıdan geçtilerse, sistem bu iki kişi arasında gizli bir bağ olduğunu `[:ARKADAS_OLABILIR]` anlar. Mentorlara "Bu ikiliyi aynı takıma koyun" önerisi sunar.
3.  **İsyankar/Uyumsuz Tespiti:** Atanan koltuk (`assigned_seat`) ile oturduğu koltuk (`actual_seat`) sürekli farklıysa, AI bu kişinin "Otoriteye uyum sağlama" konusunda sorun yaşadığını tespit edip `computed_tags` listesine **"Bağımsız"** veya **"Kurallara Esnek Yaklaşan"** etiketini ekler.

Sadece yapay zekaya ve cihazlara değil, süreci yöneten gerçek insanların (Mentorların) sisteme vereceği girdileri modellediğimiz **"Adım 6: Mentor Gözlemleri ve Sistem Değerlendirmeleri"**ne geçmek için **Adım 6** yazabilirsiniz!