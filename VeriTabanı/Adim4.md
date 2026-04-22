Harika! Sistemimizin "Büyük Birader" (Big Brother) olarak da adlandırılabilecek, ancak tamamen kullanıcının psikolojik profilini anlamaya adanmış en teknik kısmına geldik: **Adım 4: Davranışsal Telemetri ve UI Logları (telemetry_streams)**.

Adım 3'te kullanıcının anketlere verdiği tepkileri ölçmüştük. Bu adımda ise **anket dışındaki tüm genel hareketlerini** ölçeceğiz. Uygulamayı ne kadar süre açık tutuyor? Yazı yazarken ne kadar duraksıyor? Cümle kurarken kelimeleri silip baştan yazma (oto-sansür/stres) oranı nedir? 

İşte Adım 4 için PostgreSQL tasarımı, JSONB şemaları ve örnek sorgular:

### 1. SQL Tablo Tasarımı (PostgreSQL)

```sql
-- Telemetri olaylarının tiplerini belirliyoruz
CREATE TYPE telemetry_event_type_enum AS ENUM (
    'session_start',       -- Uygulamayı açma / Öne alma
    'session_end',         -- Uygulamayı kapatma / Arka plana atma
    'viewport_visibility', -- Ekranda belli bir alanın görünür kalma süresi
    'scroll_activity',     -- Kaydırma hareketi ve hızı
    'typing_dynamics',     -- Klavye basım ve silme (backspace) refleksleri
    'click_reflex'         -- Herhangi bir butona/boşluğa tıklama hızı
);

CREATE TABLE telemetry_streams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 4.1 Oturum ve Kullanıcı Bağlantısı
    user_id UUID NOT NULL REFERENCES master_identities(id) ON DELETE CASCADE,
    session_id UUID NOT NULL, -- Kullanıcının o anki aktif kullanım oturumu
    
    event_type telemetry_event_type_enum NOT NULL,
    
    -- Olayın gerçekleştiği sayfa veya UI bileşeni (Örn: '/feed', 'profile_modal', 'feedback_form')
    target_path VARCHAR(255) NOT NULL,
    
    -- 4.2, 4.3 ve 4.4 Tüm detayları tutan esnek metrik alanı
    metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Zaman damgası (Saniyenin kesirleri bile önemli olabilir)
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Telemetri tabloları ÇOK HIZLI büyür. Bu yüzden zaman ve session bazlı indeksler hayat kurtarır.
CREATE INDEX idx_telemetry_user_session ON telemetry_streams (user_id, session_id);
CREATE INDEX idx_telemetry_event_type ON telemetry_streams (event_type);
CREATE INDEX idx_telemetry_created_at ON telemetry_streams (created_at);
CREATE INDEX idx_telemetry_metrics ON telemetry_streams USING GIN (metrics);
```

### 2. JSONB Yapılarının Detaylı Şeması

Frontend tarafı (örneğin bir React `useEffect` veya özel bir Telemetri Provider'ı), periyodik olarak (batch halinde) bu metrikleri Backend'e gönderecektir.

**`metrics` -> `typing_dynamics` (Klavye ve NLP) Örneği:**
Bu yapı, açık uçlu bir fikir yazarken kişinin stres seviyesini veya kendini sansürleyip sansürlemediğini (oto-sansür) tespit eder.
```json
{
  "input_field_id": "mentor_feedback_textarea",
  "total_keystrokes": 145,        // Toplam basılan tuş
  "backspace_count": 28,          // Kaç kere silme tuşuna basıldı (Çok yüksekse = Kararsızlık/Sansür)
  "hesitation_pauses_gt_2s": 4,   // 2 saniyeden uzun süren duraksama sayısı (Düşünme/Stres)
  "total_typing_time_ms": 34000,  // Yazmaya başlama ve bitirme arası süre
  "wpm_estimated": 45             // Tahmini kelime/dakika yazma hızı
}
```

**`metrics` -> `scroll_activity` (Fiziksel Etkileşim) Örneği:**
Kişinin akışta (feed) ilgisiz bir şekilde gezinip gezinmediğini gösterir.
```json
{
  "direction": "down",
  "max_speed_px_sec": 2400,       // Çok yüksekse "Skimming" (hızlıca göz gezdirme) yapıyor demektir
  "avg_speed_px_sec": 800,
  "scroll_pauses": 2              // Kaydırırken ekranda durup inceleme sayısı
}
```

**`metrics` -> `session_start` / `session_end` Örneği:**
```json
{
  "os_state": "foreground",       // Uygulama öne alındı
  "battery_level": 45,            // Fiziksel bağlam: Şarjı azalan kullanıcı stresli/aceleci olabilir
  "network_quality": "4g_good"
}
```

### 3. Örnek Veri Ekleme (INSERT) Sorguları

Bu loglar anlık olarak sisteme şu şekilde akar:

```sql
-- Örnek 1: Uygulama Oturumunun Başlaması
INSERT INTO telemetry_streams (
    user_id, session_id, event_type, target_path, metrics
) VALUES (
    '11111111-1111-1111-1111-111111111111', 
    'sess-abc-123-def', 
    'session_start', 
    '/home_feed',
    '{"os_state": "foreground", "battery_level": 82, "network": "wifi"}'::jsonb
);

-- Örnek 2: "Skimming" (Hızlı Göz Gezdirme - İlgisizlik)
INSERT INTO telemetry_streams (
    user_id, session_id, event_type, target_path, metrics
) VALUES (
    '11111111-1111-1111-1111-111111111111', 
    'sess-abc-123-def', 
    'scroll_activity', 
    '/home_feed',
    '{"direction": "down", "max_speed_px_sec": 3100, "avg_speed_px_sec": 1200, "scroll_pauses": 0}'::jsonb
);

-- Örnek 3: Yüksek Stres / Oto-Sansür İçeren Bir Metin Girişi
-- Kullanıcı bir mentor değerlendirmesi yazıyor ama sürekli silip baştan yazıyor ve duraksıyor.
INSERT INTO telemetry_streams (
    user_id, session_id, event_type, target_path, metrics
) VALUES (
    '11111111-1111-1111-1111-111111111111', 
    'sess-abc-123-def', 
    'typing_dynamics', 
    '/evaluations/mentor_feedback',
    '{
        "input_field_id": "feedback_text", 
        "total_keystrokes": 210, 
        "backspace_count": 65, 
        "hesitation_pauses_gt_2s": 7, 
        "total_typing_time_ms": 58000
    }'::jsonb
);
```

### Yapay Zeka Bu Veriyle Ne Yapacak?
*   Python tarafındaki AI ajanımız periyodik olarak `telemetry_streams` tablosunu tarayacak.
*   Eğer bir kullanıcının yazışmalarında (özellikle admin/mentor iletişimlerinde) `backspace_count` ortalamanın çok üstündeyse ve `hesitation_pauses` sık yaşanıyorsa, `master_identities` tablosundaki `computed_tags` alanına otomatik olarak **"Stres Altında", "Oto-sansür Eğilimi" veya "Çekingen"** etiketlerini basacak. 
*   Bu etiket eklendiği an, hedefleme motoru (Adım 2) otomatik olarak bu kullanıcıya "Motivasyon Arttırıcı" veya "Psikolojik Rahatlama" içerikli gönderileri göstermeye başlayacak. Sistemin muazzam döngüsü tam da burada kuruluyor!

Dijital dünyadaki (ekrandaki) telemetriyi hallettik. Şimdi kullanıcının gerçek dünyadaki fiziksel varlığını (Hangi etkinlikte nerede oturdu, kime yakınlaştı, geç mi kaldı) takip edeceğimiz **"Adım 5: Fiziksel Konum ve QR Yoklama Matrisi"** kısmına geçmek için **Adım 5** yazabilirsiniz!