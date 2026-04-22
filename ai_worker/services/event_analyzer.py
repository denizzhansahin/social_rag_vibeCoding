"""
V-RAG Event Analyzer: Etkinlik bazlı kök neden (root-cause) analizi üretici.
Bir etkinliğin nabzını, katılım oranını ve duygu durumunu analiz eder.
"""
import json
from connections.pg_client import db_conn
from services.ollama_service import generate_completion


def analyze_event(event_id: str) -> str:
    """Bir etkinliğin katılım, duygu ve performans analizini yapar."""
    print(f"\n📊 [EVENT_ANALYZER] Etkinlik analizi başladı: {event_id}")

    context_parts = []

    try:
        with db_conn.cursor() as cur:
            # 1. Katılım verileri
            cur.execute("""
                SELECT punctuality, count(*) FROM spatial_temporal_logs 
                WHERE session_id = %s GROUP BY punctuality
            """, (event_id,))
            attendance = dict(cur.fetchall())
            context_parts.append(f"Katılım: Zamanında={attendance.get('on_time', 0)}, Geç={attendance.get('late', 0)}, Yok={attendance.get('absent', 0)}")

            # 2. Etkileşim verileri (bu etkinliğe bağlı social_objects varsa)
            cur.execute("""
                SELECT ce.action, count(*) 
                FROM content_engagements ce
                JOIN social_objects so ON ce.object_id = so.id
                WHERE so.trigger_event = %s
                GROUP BY ce.action
            """, (event_id,))
            engagements = dict(cur.fetchall())
            context_parts.append(f"Etkileşimler: Cevaplanan={engagements.get('answered', 0)}, Beğenilen={engagements.get('liked', 0)}, Görmezden Gelinen={engagements.get('ignored', 0)}")

            # 3. Telemetri (backspace ortalaması — stres göstergesi)
            cur.execute("""
                SELECT AVG((metrics->>'backspace_count')::int) as avg_bs
                FROM telemetry_streams 
                WHERE session_id = %s AND event_type = 'typing_dynamics'
            """, (event_id,))
            avg_bs_row = cur.fetchone()
            if avg_bs_row and avg_bs_row[0]:
                context_parts.append(f"Ortalama Backspace (Stres): {round(avg_bs_row[0], 1)}")

            # 4. Mentor notları
            cur.execute("""
                SELECT raw_mentor_note FROM evaluations 
                WHERE ai_extracted_insights->>'session_id' = %s
                ORDER BY created_at DESC LIMIT 3
            """, (event_id,))
            notes = [r[0] for r in cur.fetchall() if r[0]]
            if notes:
                context_parts.append(f"Mentor Notları: {'; '.join(notes[:3])}")

    except Exception as e:
        print(f"   ❌ Veri toplama hatası: {e}")

    context_text = "\n".join(context_parts) if context_parts else "Bu etkinlik için yeterli veri bulunamadı."

    prompt = f"""Sen V-RAG İstihbarat sistemisin. Aşağıdaki etkinlik verilerini analiz edip Türkçe bir kök neden (root-cause) raporu yaz.
Raporun kısa, profesyonel ve madde işaretli olsun. Eğer veri yetersizse bunu doğrudan belirt.

[ETKINLIK VERİLERİ]
{context_text}

Kök neden analizi raporu yaz:
"""
    report = generate_completion(prompt)
    print(f"   ✅ Etkinlik raporu üretildi ({len(report or '')} karakter)")
    return report or "Rapor üretilemedi."
