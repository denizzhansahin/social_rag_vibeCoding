-- ============================================================
-- V-RAG Migration 011: User Chat System
-- Kullanıcı AI sohbet sistemi tabloları
-- ============================================================

-- 1. Kullanıcı Chat Logları
CREATE TABLE IF NOT EXISTS user_chat_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES master_identities(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    ai_response_text TEXT,
    context_used JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    model_used VARCHAR(50) DEFAULT 'gemma3:4b',
    response_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_user_chat_user ON user_chat_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_chat_status ON user_chat_logs(status);
CREATE INDEX IF NOT EXISTS idx_user_chat_created ON user_chat_logs(created_at DESC);

-- 2. Günlük AI Özetleri
CREATE TABLE IF NOT EXISTS daily_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES master_identities(id) ON DELETE CASCADE,
    summary_text TEXT NOT NULL,
    summary_date DATE DEFAULT CURRENT_DATE,
    xp_gained INTEGER DEFAULT 0,
    metrics_snapshot JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, summary_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_summary_user ON daily_summaries(user_id, summary_date DESC);

-- 3. Örnek Chat Verisi (Seed)
DO $$
DECLARE
    participant_ids UUID[];
    p_id UUID;
    i INT;
    sample_messages TEXT[] := ARRAY[
        'Bugün nasıl performans gösterdim?',
        'Güçlü yanlarım neler?',
        'Hangi alanlarda gelişmeliyim?',
        'Kiminle iyi anlaşabilirim?',
        'Motivasyonumu nasıl artırabilirim?',
        'Stres yönetimi hakkında önerilerin var mı?',
        'Takım çalışmam nasıl?',
        'Kampta bugün ne yapmalıyım?'
    ];
    sample_responses TEXT[] := ARRAY[
        'Bugün harika bir gün geçirdin! 🚀 Özellikle takım çalışmasında gösterdiğin liderlik etkileyiciydi. Yarınki atölyede bu enerjini kullanmaya devam et!',
        'Güçlü yanların arasında iletişim becerilerin ve hızlı karar alma yeteneğin öne çıkıyor. 💪 Ayrıca yaratıcı düşünme konusunda akranlarından öne çıkıyorsun.',
        'Zaman yönetimi ve dakiklik konusunda biraz daha dikkatli olabilirsin. ⏰ Sabah rutinini biraz öne çekersen gün içindeki verimlilik artacaktır. Ama genel olarak çok iyi gidiyorsun!',
        'Profiline göre Ayşe ve Mehmet ile çok iyi bir sinerji oluşturabilirsin! 🤝 Onlarla farklı bakış açılarınız birbirini tamamlıyor.',
        'Motivasyon için küçük hedefler koy ve her birini tamamladığında kendini ödüllendir. 🎯 Streak''ini sürdürmek de motivation için harika bir yol!',
        'Stres yönetimi için 5 dakikalık mini molalar vermeyi dene. 🧘 Ayrıca kampın bu yoğun temposunda yeterli uyku çok önemli.',
        'Takım çalışması performansın gayet iyi! 🌟 Son 3 gruptaki katkıların hep pozitif olmuş. Daha fazla insiyatif alabilirsin.',
        'Bugün sabah 09:00''da Python atölyesi var, katılmanı şiddetle tavsiye ederim! 📚 Sonrasında ise networking etkinliği mükemmel bir fırsat olacak.'
    ];
BEGIN
    SELECT ARRAY(SELECT id FROM master_identities WHERE role = 'participant' ORDER BY random() LIMIT 15) INTO participant_ids;

    FOR i IN 1..LEAST(8, array_length(participant_ids, 1)) LOOP
        p_id := participant_ids[i];
        INSERT INTO user_chat_logs (user_id, message_text, ai_response_text, status, response_time_ms)
        VALUES (
            p_id,
            sample_messages[i],
            sample_responses[i],
            'completed',
            floor(random() * 3000 + 1000)::int
        ) ON CONFLICT DO NOTHING;
    END LOOP;

    RAISE NOTICE 'Chat seed verileri oluşturuldu.';
END $$;

SELECT 'MIGRATION 011 TAMAMLANDI — User Chat System' AS status;
