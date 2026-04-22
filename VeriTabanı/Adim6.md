Harika ilerliyoruz. Sensörlerden, ekran kaydırmalarından ve fiziksel QR okutmalarından gelen devasa "soğuk" verinin yanına, şimdi "sıcak" bir dokunuş ekliyoruz: İnsan faktörü.

**Adım 6: Mentor Gözlemleri ve Sistem Değerlendirmeleri (evaluations)**.

Bu adımda, Mentorların katılımcılar hakkındaki sübjektif yorumları toplanır. Ancak sıradan bir not defteri değil! Mentorun girdiği serbest metin (gizli not), arka planda **NLP (Doğal Dil İşleme)** ile anında analiz edilecek ve kişinin profiline etiket olarak (Örn: "Lider", "Gergin", "Empati Yoksunu") yansıyacaktır.

İşte Adım 6 için PostgreSQL tasarımı, JSONB şemaları ve örnek sorgular:

### 1. SQL Tablo Tasarımı (PostgreSQL)

```sql
-- Değerlendirmenin ana kategorisini belirliyoruz
CREATE TYPE evaluation_category_enum AS ENUM (
    'technical_skills', -- Teknik/Akademik başarı (Kodlama, teorik bilgi)
    'team_dynamics',    -- Takım içi uyum, liderlik, çatışma yönetimi
    'behavioral',       -- Disiplin, genel tutum, saygı
    'milestone'         -- Belirli bir proje veya kamp aşaması bitiş değerlendirmesi
);

CREATE TABLE evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 6.1 Değerlendiren ve Değerlendirilen (Actor -> Target)
    evaluator_id UUID NOT NULL REFERENCES master_identities(id) ON DELETE CASCADE, -- Mentor veya Admin
    target_id UUID NOT NULL REFERENCES master_identities(id) ON DELETE CASCADE,    -- Öğrenci/Katılımcı
    
    -- 6.2 Kategori Yönetimi
    category evaluation_category_enum NOT NULL,
    
    -- 6.3 Sayısal Metrikler (Opsiyonel: Bazen sadece metin yazılır, bazen hem metin hem puan verilir)
    score_1_to_100 INT CHECK (score_1_to_100 >= 1 AND score_1_to_100 <= 100),
    score_1_to_5 INT CHECK (score_1_to_5 >= 1 AND score_1_to_5 <= 5),
    
    -- Mentorun kendi yazdığı ham not (Öğrenci asla görmez)
    raw_mentor_note TEXT,
    
    -- 6.4 NLP ve Yapay Zeka Tarafından Çıkarılan Analiz Sonuçları (Sistem bu notu anlar)
    ai_extracted_insights JSONB DEFAULT '{}'::jsonb,
    
    -- Değerlendirmenin yapıldığı tarih
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Aynı mentorun aynı kişiye aynı kategoride çok kısa sürede spam yapmasını engellemek için (İsteğe bağlı)
    -- CONSTRAINT unique_eval UNIQUE (evaluator_id, target_id, category, created_at::DATE) 
);

-- Raporlamalar ve AI beslemeleri için indeksler
CREATE INDEX idx_evaluations_target ON evaluations (target_id);
CREATE INDEX idx_evaluations_evaluator ON evaluations (evaluator_id);
CREATE INDEX idx_evaluations_category ON evaluations (category);
CREATE INDEX idx_evaluations_insights ON evaluations USING GIN (ai_extracted_insights);
```

### 2. JSONB Yapılarının Detaylı Şeması

Bu JSON alanı, Mentorun yazdığı `raw_mentor_note` (Ham Metin) verisini Ollama (LLM) veya benzeri bir modelin okuyup yapılandırdığı (Structured Data) halidir. Sistem, bu JSON'u kullanarak Adım 1'deki `master_identities` tablosunu otomatik günceller.

**`ai_extracted_insights` Örneği:**
Mentor Şunu Yazdı (Ham Metin): *"Ali projede kod yazma konusunda çok iyiydi ama grup arkadaşlarına karşı biraz kırıcı bir üslubu var. Fikirlerini dikte etmeye çalışıyor."*

**Yapay Zekanın Çıkardığı JSON Çıktısı:**
```json
{
  "sentiment_score": -0.4,              // -1 (Çok Negatif) ile +1 (Çok Pozitif) arası duygu analizi
  "detected_traits": [                  // LLM'in yakaladığı davranışsal özellikler
    "dominant",
    "low_empathy",
    "technically_strong"
  ],
  "belbin_role_suggestion": "Şekillendirici", // Belbin takım rolü tahmini (Dikte eden, sonuç odaklı)
  "needs_intervention": true,           // "Kırıcı üslup" ifadesinden dolayı uyarı bayrağı kalkar
  "intervention_reason": "Takım içi iletişim problemi ve dikte etme eğilimi."
}
```

### 3. Örnek Veri Ekleme (INSERT) Sorguları

Sistemin esnekliğini göstermek adına hem "Pozitif Takım Uyumu" hem de "Negatif Davranışsal" iki farklı değerlendirme senaryosu ekliyorum:

```sql
-- Örnek 1: Takım Dinamikleri (Olumlu Gözlem)
-- Mentor, bir öğrencinin takımı çok iyi toparladığını fark edip not düşüyor.
INSERT INTO evaluations (
    evaluator_id, target_id, category, score_1_to_5, raw_mentor_note, ai_extracted_insights
) VALUES (
    'mentor-uuid-1111', 
    'student-uuid-2222', 
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

-- Örnek 2: Davranışsal Gözlem (Olumsuz ve Uyarı İçeren)
-- Mentor, disiplinle ilgili düşük bir puan veriyor.
INSERT INTO evaluations (
    evaluator_id, target_id, category, score_1_to_100, raw_mentor_note, ai_extracted_insights
) VALUES (
    'mentor-uuid-3333', 
    'student-uuid-4444', 
    'behavioral', 
    40, 
    'Verilen görevleri sürekli erteliyor. Dışarıdan gelen eleştirilere karşı çok kapalı ve hemen savunmaya geçiyor.',
    '{
        "sentiment_score": -0.6,
        "detected_traits": ["defensive", "procrastinator", "low_openness"],
        "belbin_role_suggestion": null,
        "needs_intervention": true,
        "intervention_reason": "Eleştiriye kapalılık ve görev erteleme."
    }'::jsonb
);
```

### Bu Adımın "Büyük Haritadaki" Yeri (Sistemin Senfonisi)

Şu an bir döngüyü tamamladık:
1. **Adım 5'te (Fiziksel):** Kullanıcı etkinliğe geç kaldı.
2. **Adım 3'te (Etkileşim):** Anketi cevaplarken çok kararsız kaldı (stresliydi).
3. **Adım 6'da (Bu Adım):** Mentor onu "Eleştiriye kapalı ve savunmacı" olarak notladı.
4. **Adım 1'de (Profil):** Yapay zeka tüm bunları birleştirdi ve profilindeki *Strese Dayanıklılık (Stress Tolerance)* skorunu 80'den 45'e düşürdü.
5. **Adım 2'de (Hedefleme):** Sistem, strese dayanıklılığı 50'nin altına düşen bu kullanıcıya, akışında (Feed) otomatik olarak "Zaman Yönetimi ve Stresle Başa Çıkma" konulu bir içerik gösterdi!

Harika değil mi?

Eğer bu adım da tamamsa, tüm bu verileri **Vektörel (Qdrant)** ve **Graf (Neo4j)** veritabanlarına nasıl bağlayacağımızı tasarlayacağımız, sistemin en "Yapay Zeka" odaklı son adımı olan **"Adım 7: Qdrant (Vektör) ve Neo4j (Graf) Entegrasyon Şemaları"**na geçmek için **Adım 7** yazabilirsiniz!