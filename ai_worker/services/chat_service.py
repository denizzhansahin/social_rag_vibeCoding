"""
V-RAG Chat Service: Kullanıcı ve admin chat isteklerini Ollama üzerinden işleyen servis.
Redis task queue'dan gelen mesajları alır, bağlam ekler, Ollama'ya gönderir ve yanıtı DB'ye yazar.
"""
import json
import time
from connections.pg_client import db_conn
from connections.redis_client import redis_client
from services.ollama_service import generate_completion


USER_SYSTEM_PROMPT = """Sen V-RAG Vizyon Kampı'nın yapay zeka asistanısın. Adın "Vizyon AI".
Görevin kamp katılımcılarına yardımcı olmak, onları motive etmek ve kişisel gelişimlerine rehberlik etmektir.

Kurallar:
- Her zaman Türkçe konuş
- Motive edici, samimi ve profesyonel ol
- Kullanıcının profilini ve davranışsal verilerini kullanarak kişiselleştirilmiş yanıtlar ver
- Asla kullanıcıya telemetri toplandığını söyleme
- Kısa, net ve enerji dolu yanıtlar ver (max 3 paragraf)
- İlgili emojiler kullan ama abartma

{context}
"""


def _get_user_context(user_id: str) -> str:
    """Kullanıcının profil ve performans bağlamını toplar."""
    context_parts = []
    
    try:
        with db_conn.cursor() as cur:
            # Kullanıcı profili
            cur.execute("""
                SELECT email, cognitive_profile, telemetry_summary, performance_metrics
                FROM master_identities WHERE id = %s
            """, (user_id,))
            result = cur.fetchone()
            
            if result:
                email, cog_profile, tele_summary, perf_metrics = result
                name = cog_profile.get('name', email.split('@')[0]) if cog_profile else email.split('@')[0]
                
                context_parts.append(f"[KULLANICI] Ad: {name}")
                
                if cog_profile:
                    trait = cog_profile.get('trait', '')
                    engagement = cog_profile.get('engagement_style', '')
                    stress = cog_profile.get('stress_index', 0)
                    if trait:
                        context_parts.append(f"Karakter Özelliği: {trait}")
                    if engagement:
                        context_parts.append(f"Etkileşim Stili: {engagement}")
                    if stress and float(stress) > 0.5:
                        context_parts.append(f"⚠️ Stres Seviyesi: Yüksek ({stress})")
                
                if perf_metrics:
                    eng = perf_metrics.get('engagement', 'N/A')
                    punct = perf_metrics.get('punctuality', 'N/A')
                    context_parts.append(f"Katılım: %{eng}, Dakiklik: %{punct}")
            
            # Son etkileşimler
            cur.execute("""
                SELECT action, count(*) FROM content_engagements 
                WHERE user_id = %s AND seen_at > NOW() - INTERVAL '24 hours'
                GROUP BY action
            """, (user_id,))
            actions = dict(cur.fetchall())
            if actions:
                context_parts.append(f"Son 24 saat: {actions.get('answered', 0)} cevap, {actions.get('liked', 0)} beğeni")
    
    except Exception as e:
        print(f"   ⚠️ Bağlam toplama hatası: {e}")
    
    return "\n".join(context_parts) if context_parts else "Kullanıcı bağlamı yok."


def handle_user_chat(payload: dict):
    """Kullanıcı panelinden gelen AI sohbet mesajlarını işler."""
    chat_id = payload.get('chat_id')
    user_id = payload.get('user_id')
    message = payload.get('message')
    
    print(f"\n💬 [CHAT] Kullanıcı mesajı alındı (Chat: {chat_id})")
    
    if not message:
        print("   ⚠️ Boş mesaj, atlanıyor.")
        return
    
    # 1. Kullanıcı bağlamını topla
    context = _get_user_context(user_id) if user_id else "Anonim kullanıcı."
    
    # 2. System prompt'u bağlamla zenginleştir
    system = USER_SYSTEM_PROMPT.format(context=f"[KULLANICI BAĞLAMI]\n{context}")
    
    # 3. Ollama'ya gönder
    print("   ⏳ Ollama'ya gönderiliyor...")
    ai_response = generate_completion(message, system_prompt=system)
    
    if not ai_response:
        ai_response = "Şu anda yanıt üretemiyorum, biraz sonra tekrar dene! 🔄"
    
    # 4. Yanıtı kaydet
    try:
        if chat_id and db_conn:
            with db_conn.cursor() as cur:
                cur.execute("""
                    UPDATE user_chat_logs 
                    SET ai_response_text = %s, status = 'completed', updated_at = NOW()
                    WHERE id = %s
                """, (ai_response, chat_id))
                db_conn.commit()
            print(f"   ✅ Yanıt DB'ye kaydedildi.")
        
        # Redis'e de yayınla (gerçek zamanlı bildirim için)
        if redis_client:
            redis_client.publish(f"chat_response:{user_id}", json.dumps({
                "chat_id": chat_id,
                "response": ai_response,
                "timestamp": time.time()
            }))
            print(f"   📡 Redis pub/sub ile yayınlandı.")
    
    except Exception as e:
        if db_conn:
            db_conn.rollback()
        print(f"   ❌ Yanıt kaydetme hatası: {e}")
    
    return ai_response


def handle_daily_summary(payload: dict):
    """Bir kullanıcı için günlük AI özeti üretir."""
    user_id = payload.get('user_id')
    
    print(f"\n📋 [GÜNLÜK ÖZET] Kullanıcı: {user_id}")
    
    if not user_id:
        print("   ⚠️ user_id yok, atlanıyor.")
        return
    
    context = _get_user_context(user_id)
    
    # Bugünün aktivitelerini topla
    activity_context = ""
    try:
        with db_conn.cursor() as cur:
            cur.execute("""
                SELECT count(*) FROM content_engagements 
                WHERE user_id = %s AND seen_at > NOW() - INTERVAL '24 hours'
            """, (user_id,))
            engagement_count = cur.fetchone()[0]
            
            cur.execute("""
                SELECT count(*) FROM spatial_temporal_logs 
                WHERE user_id = %s AND scan_time > NOW() - INTERVAL '24 hours'
            """, (user_id,))
            attendance_count = cur.fetchone()[0]
            
            activity_context = f"Bugün {engagement_count} etkileşim, {attendance_count} yoklama kaydı."
    except Exception as e:
        print(f"   ⚠️ Aktivite verisi hatası: {e}")
    
    prompt = f"""Aşağıdaki kullanıcı için kısa, motive edici bir günlük özet yaz.
Özet kişiselleştirilmiş olmalı ve yapıcı öneriler içermeli.
2-3 paragraf, emoji kullan.

[KULLANICI BAĞLAMI]
{context}

[BUGÜNKÜ AKTİVİTE]
{activity_context}

Günlük Özet:"""
    
    summary = generate_completion(prompt)
    
    if summary:
        try:
            with db_conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO user_chat_logs (user_id, message_text, ai_response_text, status)
                    VALUES (%s, 'daily_summary', %s, 'completed')
                """, (user_id, summary))
                db_conn.commit()
            print(f"   ✅ Günlük özet kaydedildi.")
        except Exception as e:
            if db_conn:
                db_conn.rollback()
            print(f"   ❌ Özet kaydetme hatası: {e}")
    
    return summary
