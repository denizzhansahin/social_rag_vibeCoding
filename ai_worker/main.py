#burası conda ortamı ile çalışır. conda activate ai_core ile çalıştır.
import time
import json
import traceback
import signal
import sys
import logging
from uuid import UUID
from datetime import datetime

from connections.redis_client import redis_client
from connections.pg_client import db_conn
from connections.qdrant_client import qdrant_conn
from connections.neo4j_client import neo4j_driver
from services.ollama_service import generate_completion, generate_embedding, check_ollama_health

from qdrant_client.models import Distance, VectorParams, PointStruct

# Structured logging setup
logger = logging.getLogger('vrag_ai_worker')
logger.setLevel(logging.INFO)

# File handler
fh = logging.FileHandler('log_worker.txt')
fh.setLevel(logging.INFO)

# Console handler
ch = logging.StreamHandler()
ch.setLevel(logging.INFO)

# Formatter
formatter = logging.Formatter('%(asctime)s [%(levelname)s] %(message)s')
fh.setFormatter(formatter)
ch.setFormatter(formatter)

logger.addHandler(fh)
logger.addHandler(ch)

# Qdrant koleksiyon adı
QDRANT_COLLECTION_NAME = "cognitive_memory_bank"
# Redis kuyruk adı
REDIS_QUEUE_NAME = "ai_task_queue"


# --- GÖREV İŞLEYİCİ FONKSİYONLAR (TASK HANDLERS) ---

def handle_mentor_evaluation(payload: dict):
    """
    Bir mentor notunu alır, Ollama ile analiz eder ve sonucu Postgres'e yazar.
    """
    eval_id = payload.get('evaluation_id')
    print(f"\n🔄 Görev Başladı: Mentor Değerlendirmesi Analizi (ID: {eval_id})")
    
    try:
        with db_conn.cursor() as cur:
            # 1. Ham notu veritabanından çek
            cur.execute("SELECT raw_mentor_note FROM evaluations WHERE id = %s", (eval_id,))
            result = cur.fetchone()
            if not result or not result[0]:
                print(f"⚠️ Uyarı: {eval_id} için analiz edilecek not bulunamadı.")
                return

            raw_note = result[0]

            # 2. Ollama'ya göndereceğimiz prompt'u hazırlıyoruz
            prompt = f"""Aşağıdaki mentor notunu analiz et ve SADECE JSON formatında bir çıktı ver. 
Başka hiçbir metin ekleme, sadece JSON objesi döndür.
JSON objesi şu anahtarları içermeli:
- "sentiment_score": float (-1.0 ile 1.0 arası, negatif = olumsuz, pozitif = olumlu)
- "detected_traits": string listesi (tespit edilen karakter özellikleri, İngilizce)
- "needs_intervention": boolean (müdahale gerekli mi?)
- "intervention_reason": string veya null (müdahale gerekiyorsa sebebi, Türkçe)
- "belbin_role_suggestion": string veya null (Belbin takım rolü önerisi)

Mentor Notu: "{raw_note}"
"""
            
            # 3. Ollama'dan analizi al
            ai_response_str = generate_completion(prompt)
            if not ai_response_str:
                print("❌ Hata: Ollama'dan analiz cevabı alınamadı.")
                return

            # 4. JSON'u çıkar ve Postgres'e yaz
            try:
                # Ollama bazen JSON'u markdown bloğu içinde verir, temizle
                cleaned = ai_response_str.strip()
                if cleaned.startswith("```json"):
                    cleaned = cleaned[7:]
                if cleaned.startswith("```"):
                    cleaned = cleaned[3:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                cleaned = cleaned.strip()
                
                ai_insights = json.loads(cleaned)
                cur.execute(
                    "UPDATE evaluations SET ai_extracted_insights = %s WHERE id = %s",
                    (json.dumps(ai_insights), eval_id)
                )
                db_conn.commit()
                print(f"✅ Görev Tamamlandı: {eval_id} ID'li değerlendirme analiz edildi ve kaydedildi.")
                print(f"   Duygu Skoru: {ai_insights.get('sentiment_score')}")
                print(f"   Tespit edilen özellikler: {ai_insights.get('detected_traits')}")
            except json.JSONDecodeError:
                print(f"❌ Hata: Ollama'dan gelen cevap JSON formatında değil:")
                print(f"   Ham Cevap: {ai_response_str[:200]}...")
            except Exception as e:
                db_conn.rollback()
                print(f"❌ Veritabanı güncelleme hatası: {e}")
    except Exception as e:
        db_conn.rollback()
        print(f"❌ Mentor değerlendirme analiz hatası: {e}")


def handle_vectorization(payload: dict):
    """
    Bir anket cevabını veya metni alır, vektöre çevirir ve Qdrant'a kaydeder.
    """
    engagement_id = payload.get('engagement_id')
    print(f"\n🔄 Görev Başladı: Yanıt Vektörizasyonu (ID: {engagement_id})")

    try:
        with db_conn.cursor() as cur:
            query = """
            SELECT response_data->>'free_text_answer', user_id, object_id 
            FROM content_engagements WHERE id = %s
            """
            cur.execute(query, (str(engagement_id),))
            result = cur.fetchone()

            if not result or not result[0]:
                print(f"⚠️ Uyarı: {engagement_id} için vektöre çevrilecek metin bulunamadı.")
                return
            
            text_to_embed, user_id, object_id = result
            
            # Ollama ile metni vektöre çevir
            vector = generate_embedding(text_to_embed)
            if not vector:
                print("❌ Hata: Ollama'dan vektör alınamadı.")
                return
                
            # Qdrant'a kaydet
            qdrant_conn.upsert(
                collection_name=QDRANT_COLLECTION_NAME,
                points=[
                    PointStruct(
                        id=str(engagement_id),
                        vector=vector,
                        payload={
                            "user_id": str(user_id),
                            "object_id": str(object_id),
                            "source": "free_text_survey",
                            "original_text": text_to_embed
                        }
                    )
                ],
                wait=True
            )
            print(f"✅ Görev Tamamlandı: {engagement_id} ID'li yanıt vektöre çevrildi ve Qdrant'a kaydedildi.")
    except Exception as e:
        db_conn.rollback()
        print(f"❌ Vektörizasyon hatası: {e}")


def handle_neo4j_relation(payload: dict):
    """
    Neo4j'ye yeni bir ilişki (edge) ekler.
    SECURITY: relation_type is sanitized to prevent Cypher injection.
    """
    source_id = payload.get('source_id')
    target_id = payload.get('target_id')
    relation_type = payload.get('relation_type', 'INTERACTED_WITH')
    properties = payload.get('properties', {})

    # SECURITY: Sanitize relation_type to prevent Cypher injection
    # Only allow alphanumeric characters and underscores
    import re
    if not re.match(r'^[A-Z][A-Z0-9_]*$', relation_type):
        logger.warning(f"Invalid relation_type '{relation_type}', defaulting to INTERACTED_WITH")
        relation_type = 'INTERACTED_WITH'

    logger.info(f"\n🔄 Görev Başladı: Neo4j İlişki Ekleme ({source_id} -[{relation_type}]-> {target_id})")

    try:
        with neo4j_driver.session() as session:
            # Önce düğümlerin var olduğundan emin ol (MERGE = yoksa yarat, varsa atla)
            query = f"""
            MERGE (a:User {{id: $source_id}})
            MERGE (b:User {{id: $target_id}})
            MERGE (a)-[r:{relation_type}]->(b)
            SET r += $properties
            RETURN type(r) as rel_type
            """
            result = session.run(query,
                source_id=str(source_id),
                target_id=str(target_id),
                properties=properties
            )
            record = result.single()
            if record:
                logger.info(f"✅ Görev Tamamlandı: Neo4j'ye [{record['rel_type']}] ilişkisi eklendi.")
    except Exception as e:
        logger.error(f"❌ Neo4j ilişki ekleme hatası: {e}")


def handle_engagement(payload: dict):
    """Kullanıcının ankete/içeriğe verdiği tepkiyi analiz eder ve Neo4j ağı oluşturur."""
    engagement_id = payload.get('engagement_id')
    action = payload.get('action')
    print(f"\n🔄 Görev Başladı: Etkileşim Analizi (ID: {engagement_id}, Action: {action})")
    
    try:
        with db_conn.cursor() as cur:
            cur.execute("SELECT user_id, object_id, behavioral_metrics FROM content_engagements WHERE id = %s", (engagement_id,))
            result = cur.fetchone()
            if not result:
                return
            user_id, object_id, metrics = result
            
            # Neo4j'ye etkileşim bağını ekle
            rel_type = "EXPLICITLY_ANSWERED" if action == "answered" else ("IGNORED_CONTENT" if action == "ignored" else "INTERACTED_WITH")
            handle_neo4j_relation({"source_id": str(user_id), "target_id": str(object_id), "relation_type": rel_type, "properties": metrics})
            
            # Kararsızlık analizi (Örnek: Çok fazla fikir değiştirmişse veya uzun süre beklemişse)
            if action == 'answered' and metrics:
                mind_changes = metrics.get('changed_mind_count', 0)
                if mind_changes >= 2:
                    print(f"⚠️ {user_id} UUID'li kullanıcı {mind_changes} kez kararsız kaldı. (DB'ye Etiket Basılabilir)")
    except Exception as e:
        db_conn.rollback()
        print(f"❌ Etkileşim analizi hatası: {e}")

def handle_telemetry(payload: dict):
    """UI üzerinden gelen anonim fare/klavye telemetrilerini inceler."""
    telemetry_id = payload.get('telemetry_id')
    event_type = payload.get('event_type')
    print(f"\n🔄 Görev Başladı: Telemetri Analizi (ID: {telemetry_id}, Type: {event_type})")
    
    try:
        with db_conn.cursor() as cur:
            cur.execute("SELECT user_id, target_path, metrics FROM telemetry_streams WHERE id = %s", (telemetry_id,))
            result = cur.fetchone()
            if not result:
                return
            
            user_id, target_path, metrics = result
            
            # Neo4j Entegrasyonu
            with neo4j_driver.session() as session:
                # 1. Sayfa Düğümü (Page)
                session.run("""
                MERGE (p:Page {path: $path})
                SET p.name = $path, p.label = 'Page'
                """, path=target_path)
                
                # 2. İlişki Kurma (Olay tipine göre)
                rel_type = "VISITED" if event_type in ['session_start', 'viewport_visibility'] else "INTERACTED_WITH"
                
                session.run(f"""
                MATCH (u:User {{id: $u_id}}), (p:Page {{path: $path}})
                MERGE (u)-[r:{rel_type}]->(p)
                SET r.last_seen = timestamp(),
                    r.count = COALESCE(r.count, 0) + 1,
                    r.last_event = $event_type
                """, u_id=str(user_id), path=target_path, event_type=event_type)

            if result and event_type == 'typing_dynamics':
                backspace = metrics.get('backspace_count', 0)
                if backspace > 50:
                    print(f"🧠 AI TESPİTİ: {user_id} yüksek backspace ({backspace}) tuşlayarak yazdı. Stresli veya Mükemmeliyetçi olabilir.")
    except Exception as e:
        db_conn.rollback()
        print(f"❌ Telemetri analizi hatası: {e}")

def handle_spatial_log(payload: dict):
    """Öğrencinin yoklama verisinden mekansal bağlar kurar (Kim kiminle yan yana?)"""
    log_id = payload.get('log_id')
    punctuality = payload.get('punctuality')
    print(f"\n🔄 Görev Başladı: Mekansal Log Analizi (ID: {log_id}, Punctuality: {punctuality})")
    
    try:
        with db_conn.cursor() as cur:
            cur.execute("SELECT user_id, session_id, spatial_context FROM spatial_temporal_logs WHERE id = %s", (log_id,))
            result = cur.fetchone()
            if result:
                user_id, session_id, context = result
                # Bu kişiyi "Katıldı" olarak işaretle
                handle_neo4j_relation({"source_id": str(user_id), "target_id": str(session_id), "relation_type": "ATTENDED", "properties": {"punctuality": punctuality}})
                
                # Yan yana oturanlar bağı [:SAT_NEXT_TO]
                concurrent_scans = context.get('concurrent_scans_30sec', []) if context else []
                for neighbor_id in concurrent_scans:
                    handle_neo4j_relation({
                        "source_id": str(user_id), 
                        "target_id": str(neighbor_id), 
                        "relation_type": "SAT_NEXT_TO", 
                        "properties": {"session_id": str(session_id)}
                    })
    except Exception as e:
        db_conn.rollback()
        print(f"❌ Mekansal analiz hatası: {e}")

from services.palantir_agent import process_admin_query
from services.profiler import update_cognitive_profile
from services.event_analyzer import analyze_event
from services.chat_service import handle_user_chat, handle_daily_summary

def handle_palantir_command(payload: dict):
    """NestJS üzerinden gelen Palantir Sorusu Redis task'ı."""
    process_admin_query(
        chat_id=payload.get("chat_id"),
        query=payload.get("query"),
        admin_id=payload.get("admin_id")
    )

def handle_profile_user(payload: dict):
    """Kullanıcının davranışsal profilini hesaplar ve DB'ye yazar."""
    user_id = payload.get('user_id')
    if user_id:
        update_cognitive_profile(user_id)

def handle_detect_anomalies(payload: dict):
    """Son 6 saatte hiçbir dijital ayak izi bırakmayan kullanıcıları tespit eder."""
    print("\n🔍 [ANOMALI] Son 6 saat hareketsiz kullanıcılar taranıyor...")
    try:
        with db_conn.cursor() as cur:
            cur.execute("""
                SELECT mi.id, mi.email, mi.cognitive_profile->>'name' AS name
                FROM master_identities mi
                WHERE mi.role = 'participant' AND mi.status = 'active'
                AND mi.id NOT IN (
                    SELECT DISTINCT user_id FROM telemetry_streams WHERE created_at > NOW() - INTERVAL '6 hours'
                    UNION
                    SELECT DISTINCT user_id FROM content_engagements WHERE seen_at > NOW() - INTERVAL '6 hours'
                    UNION
                    SELECT DISTINCT user_id FROM spatial_temporal_logs WHERE scan_time > NOW() - INTERVAL '6 hours'
                )
            """)
            anomalies = cur.fetchall()
            if anomalies:
                for a in anomalies:
                    print(f"   ⚠️ ANOMALI: {a[2] or a[1]} ({a[0]}) - Son 6 saatte hiçbir aktivite yok!")
            else:
                print("   ✅ Anomali yok. Tüm aktif katılımcılar 6 saat içinde etkileşim göstermiş.")
    except Exception as e:
        db_conn.rollback()
        print(f"   ❌ Anomali tespiti hatası: {e}")

def handle_event_report(payload: dict):
    """Bir etkinlik için kök neden raporu üretir."""
    event_id = payload.get('event_id')
    if event_id:
        report = analyze_event(event_id)
        print(f"\n📋 [RAPOR]\n{report}")

def handle_stress_index(payload: dict):
    """Tüm aktif katılımcıların stres endeksini hesaplar."""
    print("\n🧠 [STRES] Toplu stres endeksi hesaplanıyor...")
    try:
        with db_conn.cursor() as cur:
            cur.execute("SELECT id FROM master_identities WHERE role = 'participant' AND status = 'active'")
            users = cur.fetchall()
            for u in users:
                update_cognitive_profile(u[0])
        print(f"   ✅ {len(users)} kullanıcının profili güncellendi.")
    except Exception as e:
        db_conn.rollback()
        print(f"   ❌ Stres endeksi hatası: {e}")


def handle_group_analysis(payload: dict):
    """Bir grubun davranışsal profilini analiz eder ve AI raporu üretir."""
    group_id = payload.get('group_id')
    print(f"\n👥 [GRUP ANALİZİ] Grup: {group_id}")
    
    try:
        with db_conn.cursor() as cur:
            cur.execute("""
                SELECT mi.cognitive_profile, mi.email
                FROM group_members gm
                JOIN master_identities mi ON mi.id = gm.user_id
                WHERE gm.group_id = %s
            """, (group_id,))
            members = cur.fetchall()
            
            if not members:
                print("   ⚠️ Grup üyesi bulunamadı.")
                return

            profiles_text = []
            for profile, email in members:
                if profile:
                    stress = profile.get('stress_index', 'N/A')
                    style = profile.get('engagement_style', 'N/A')
                    isolation = profile.get('isolation_risk', False)
                    profiles_text.append(f"- {email}: Stres={stress}, Stil={style}, İzole={isolation}")

            context = "\n".join(profiles_text) if profiles_text else "Profil verisi yetersiz."

            prompt = f"""Sen V-RAG AI İstihbarat sistemisin. Aşağıdaki grup üyelerinin profillerini analiz et.
Türkçe, kısa ve profesyonel bir rapor hazırla. Şunları belirt:
- Genel grup dinamiği (uyum, çatışma riski)
- Öne çıkan endişeler (izolasyon, stres)
- Grup mentoruna öneriler

[GRUP ÜYE PROFİLLERİ]
{context}
"""
            from services.ollama_service import generate_completion
            report = generate_completion(prompt)
            print(f"   ✅ Grup analiz raporu üretildi.")
            if report:
                print(f"\n📋 [GRUP RAPORU]\n{report}")
                
                cur.execute(
                    "UPDATE groups SET ai_insights = %s WHERE id = %s",
                    (json.dumps({"ai_report": report, "generated_at": str(time.time())}), group_id)
                )
                db_conn.commit()

    except Exception as e:
        print(f"   ❌ Grup analiz hatası: {e}")
        db_conn.rollback()


def handle_user_onboarding(payload: dict):
    """
    Kullanıcı onboarding anketini doldurduğunda:
    1. Yanıtları birleştirip vektöre çevirir (Qdrant).
    2. Benzer kullanıcıları bulup Neo4j'de POTENTIAL_FRIEND bağı ekler.
    """
    user_id = payload.get('user_id')
    responses = payload.get('responses', [])
    print(f"\n🚀 [ONBOARDING] Yeni Kullanıcı Tanışma Analizi (User: {user_id})")

    try:
        if not responses:
            print("   ⚠️ Payload boş, veritabanından fallback çekiliyor...")
            with db_conn.cursor() as cur:
                cur.execute("SELECT response_data FROM onboarding_responses WHERE user_id = %s", (user_id,))
                rows = cur.fetchall()
                if rows:
                    responses = [{"responseData": r[0]} for r in rows]
                else:
                    print("   ❌ Veritabanında da yanıt bulunamadı.")
                    return

        # 1. Yanıtları birleştirip bağlam oluştur
        combined_text = " ".join([f"Soruya verilen cevap: {ans.get('responseData', '')}" for ans in responses])
        print(f"   Metin oluşturuldu: {combined_text[:50]}...")

        # 2. Embedding üret
        vector = generate_embedding(combined_text)
        if not vector:
            print("   ❌ Embedding üretilemedi.")
            return

        # 3. Qdrant'a ata
        point_id = str(UUID(user_id))
        qdrant_conn.upsert(
            collection_name=QDRANT_COLLECTION_NAME,
            points=[
                PointStruct(
                    id=point_id,
                    vector=vector,
                    payload={"user_id": user_id, "source": "onboarding"}
                )
            ],
            wait=True
        )

        # 4. En benzeyen (KNN) 3 kişiyi bul
        search_result = qdrant_conn.search(
            collection_name=QDRANT_COLLECTION_NAME,
            query_vector=vector,
            limit=4 # 1 tanesi kendisi çıkabilir
        )

        with neo4j_driver.session() as session:
            for hit in search_result:
                target_user_id = hit.payload.get("user_id")
                if target_user_id and target_user_id != user_id:
                    score = hit.score
                    if score > 0.25: # Eşik değerini 0.55'e düşürdük (Kullanıcı 0.25 yaptı)
                        print(f"   🤝 Eşleşme Bulundu: {target_user_id} (Benzerlik: {score:.2f})")
                        
                        u_a, u_b = sorted([str(user_id), str(target_user_id)])
                        
                        session.run("""
                        MERGE (u1:User {id: $u1})
                        MERGE (u2:User {id: $u2})
                        MERGE (u1)-[r:POTENTIAL_FRIEND]-(u2)
                        SET r.similarity_score = $score
                        """, u1=u_a, u2=u_b, score=score)

                        with db_conn.cursor() as cur:
                            cur.execute("""
                                UPDATE ai_matching_results 
                                SET similarity_score = GREATEST(similarity_score, %s),
                                    matched_at = NOW()
                                WHERE user_a_id = %s AND user_b_id = %s;
                            """, (score, u_a, u_b))
                            if cur.rowcount == 0:
                                cur.execute("""
                                    INSERT INTO ai_matching_results (user_a_id, user_b_id, similarity_score, matched_at)
                                    VALUES (%s, %s, %s, NOW())
                                """, (u_a, u_b, score))
                            db_conn.commit()

        print("   ✅ Tanışma analizi ve arkadaş eşleştirmesi tamamlandı.")
    except Exception as e:
        print(f"   ❌ Onboarding işlem hatası: {e}")

def handle_social_content(payload: dict):
    """
    Yeni bir gönderi veya yorum eklendiğinde Neo4j ve Qdrant senkronizasyonu yapar.
    """
    content_type = payload.get('type') # 'post' or 'comment'
    content_id = payload.get('id')
    text = payload.get('text')
    user_id = payload.get('userId')
    
    print(f"\n📝 [SOCIAL] Yeni İçerik İşleniyor: {content_type} (ID: {content_id})")
    
    try:
        # 1. Neo4j Düğümü ve İlişkisi
        with neo4j_driver.session() as session:
            session.run("""
            MERGE (u:User {id: $u_id})
            MERGE (o:SocialObject {id: $o_id})
            SET o.type = $type, o.text = $text, o.label = $label
            MERGE (u)-[:CREATED]->(o)
            """, u_id=str(user_id), o_id=str(content_id), type=content_type, text=text, label=text[:20]+"...")
            
            # Eğer yorumsa, post ile ilişkilendir
            if content_type == 'comment' and payload.get('postId'):
                session.run("""
                MATCH (c:SocialObject {id: $c_id}), (p:SocialObject {id: $p_id})
                MERGE (c)-[:COMMENTED_ON]->(p)
                """, c_id=str(content_id), p_id=str(payload.get('postId')))

        # 2. Qdrant Vektörleştirme (RAG Altyapısı)
        vector = generate_embedding(text)
        if vector and qdrant_conn:
            qdrant_conn.upsert(
                collection_name=QDRANT_COLLECTION_NAME,
                points=[
                    PointStruct(
                        id=str(UUID(str(content_id))),
                        vector=vector,
                        payload={
                            "content_id": str(content_id),
                            "userId": str(user_id),
                            "text": text,
                            "type": content_type,
                            "source": "social_feed"
                        }
                    )
                ]
            )
        print(f"   ✅ {content_type} başarıyla Neo4j ve Qdrant'a senkronize edildi.")
    except Exception as e:
        print(f"   ❌ Social sync error: {e}")

def handle_growth_analysis(payload: dict):
    """
    Kullanıcının gelişimini analiz eder, katılım ve telemetry verilerini
    AI ile yorumlayarak kalıcı gelişim özeti oluşturur.
    Eğer payload boşsa (user_id yoksa), tüm kullanıcıları analiz eder.
    """
    requested_id = payload.get("user_id")
    
    ids_to_process = []
    if requested_id:
        ids_to_process = [requested_id]
        print(f"\n📈 [GROWTH] Münferit kullanıcı analizi başlatılıyor: {requested_id}")
    else:
        print(f"\n📈 [GROWTH] Tüm kullanıcılar için toplu gelişim analizi başlatılıyor...")
        try:
            with db_conn.cursor() as tmp_cur:
                tmp_cur.execute("SELECT id FROM master_identities")
                ids_to_process = [str(row[0]) for row in tmp_cur.fetchall()]
        except Exception as e:
            print(f"   ❌ Kullanıcı listesi çekilemedi: {e}")
            return

    for user_id in ids_to_process:
        try:
            # Her kullanıcı için kendi cursor'ını ve commit'ini kullan (Hata izolasyonu)
            with db_conn.cursor() as cur:
                try:
                    # 1. Verileri topla
                    cur.execute("SELECT email, (cognitive_profile->>'name') as name FROM master_identities WHERE id = %s", (user_id,))
                    user_info = cur.fetchone()
                    if not user_info: continue
                    
                    # ::uuid cast ekledik (UUID uyuşmazlığını çözmek için)
                    cur.execute("""
                        SELECT e.event_type, COUNT(*) 
                        FROM spatial_temporal_logs s 
                        JOIN events e ON s.session_id::uuid = e.id 
                        WHERE s.user_id = %s 
                        GROUP BY e.event_type
                    """, (user_id,))
                    attendance = cur.fetchall()
                    
                    cur.execute("SELECT action, COUNT(*) FROM content_engagements WHERE user_id = %s GROUP BY action", (user_id,))
                    engagements = cur.fetchall()

                    # 2. AI Prompt Hazırla
                    prompt = f"""
                    Kullanıcı: {user_info[1] or user_info[0]}
                    Katılım Verileri: {attendance}
                    Etkileşim Verileri: {engagements}
                    
                    Yukarıdaki verilere dayanarak bu katılımcının kamp süresince gösterdiği gelişimi 3 cümlede özetle. 
                    Hangi alanlarda güçlendiğini ve bir sonraki adımda neye odaklanması gerektiğini belirt.
                    Yanıtı JSON formatında şu anahtarlarla ver: 'growth_summary' (string), 'development_index' (0-100 arası sayı).
                    """
                    
                    response = generate_completion(prompt)
                    if not response: 
                        print(f"   ⚠️ AI yanıt vermedi ({user_id})")
                        continue

                    import json
                    try:
                        # JSON temizleme (Markdown kod blokları varsa)
                        clean_response = response.replace("```json", "").replace("```", "").strip()
                        ans = json.loads(clean_response)
                    except:
                        ans = {"growth_summary": response, "development_index": 75}

                    # 3. Veritabanını Güncelle (NULL-Safe UPDATE)
                    cur.execute("""
                        UPDATE master_identities 
                        SET performance_metrics = COALESCE(performance_metrics, '{}'::jsonb) || %s::jsonb
                        WHERE id = %s
                    """, (json.dumps({
                        "growth_path": ans.get("growth_summary", ""), 
                        "growth_score": ans.get("development_index", 0),
                        "last_analyzed_at": str(datetime.now())
                    }), user_id))
                    
                    db_conn.commit()
                    print(f"   ✅ [ID: {user_id[:8]}...] Analiz tamamlandı ve kaydedildi.")
                except Exception as inner_e:
                    db_conn.rollback() 
                    print(f"   ❌ [ID: {user_id[:8]}...] Gelişim analizi hatası: {inner_e}")
                    
        except Exception as e:
            print(f"   ❌ Outer loop error for {user_id}: {e}")
    
    print("\n📈 [GROWTH] Tüm analiz işlemleri sona erdi.")

def handle_full_sync(payload: dict):
    """
    Tüm veritabanını tarar ve Neo4j grafiğini güncelleyerek/temizleyerek yeniden oluşturur.
    """
    print("\n🕸️ [NEO4J] Tüm veri senkronizasyonu başlatılıyor...")
    
    try:
        # Pre-emptive rollback to ensure a clean transaction
        try: db_conn.rollback()
        except: pass

        with db_conn.cursor() as cur:
            cur.execute("SELECT id, email, role, status, (cognitive_profile->>'name') as name FROM master_identities")
            users = cur.fetchall()
            # ... (Rest of existing sync code)

            
            with neo4j_driver.session() as session:
                for u_id, email, role, status, name in users:
                    session.run("""
                    MERGE (u:User {id: $id})
                    SET u.email = $email, u.role = $role, u.status = $status, u.name = $name, u.label = $name
                    """, id=str(u_id), email=email, role=role, status=status, name=name or email.split('@')[0])
                
                cur.execute("SELECT id, name FROM groups")
                groups = cur.fetchall()
                for g_id, g_name in groups:
                    session.run("""
                    MERGE (g:Group {id: $id})
                    SET g.name = $name, g.label = $name
                    """, id=str(g_id), name=g_name)
                
                cur.execute("SELECT id, title, event_type FROM events WHERE is_active = true")
                events = cur.fetchall()
                for e_id, title, e_type in events:
                    session.run("""
                    MERGE (e:Event {id: $id})
                    SET e.name = $title, e.type = $e_type, e.label = $title
                    """, id=str(e_id), title=title, e_type=e_type)
                
                cur.execute("SELECT id, author_id, content_text, created_at FROM feed_posts")
                posts = cur.fetchall()
                for p_id, a_id, txt, dt in posts:
                    session.run("""
                    MERGE (u:User {id: $a_id})
                    MERGE (o:SocialObject {id: $p_id})
                    SET o.type = 'post', o.text = $txt, o.label = $label
                    MERGE (u)-[:CREATED]->(o)
                    """, a_id=str(a_id), p_id=str(p_id), txt=txt, label=txt[:20]+"...")
                
                cur.execute("SELECT user_id, group_id FROM group_members")
                memberships = cur.fetchall()
                for u_id, g_id in memberships:
                    session.run("""
                    MATCH (u:User {id: $u_id}), (g:Group {id: $g_id})
                    MERGE (u)-[r:MEMBER_OF]->(g)
                    """, u_id=str(u_id), g_id=str(g_id))
                
                cur.execute("SELECT event_id, group_id FROM event_groups")
                event_groups = cur.fetchall()
                for e_id, g_id in event_groups:
                    session.run("""
                    MATCH (e:Event {id: $e_id}), (g:Group {id: $g_id})
                    MERGE (g)-[r:BOOKED_FOR]->(e)
                    """, e_id=str(e_id), g_id=str(g_id))
                
                cur.execute("SELECT event_id, user_id, role FROM event_assignments")
                event_users = cur.fetchall()
                for e_id, u_id, role in event_users:
                    session.run("""
                    MATCH (e:Event {id: $e_id}), (u:User {id: $u_id})
                    MERGE (u)-[r:ASSIGNED_TO {role: $role}]->(e)
                    """, e_id=str(e_id), u_id=str(u_id), role=role)
 
                cur.execute("SELECT user_id, session_id, punctuality FROM spatial_temporal_logs")
                attendance = cur.fetchall()
                for u_id, s_id, punct in attendance:
                    session.run("""
                    MATCH (u:User {id: $u_id}), (e:Event {id: $s_id})
                    MERGE (u)-[r:ATTENDED {punctuality: $punct}]->(e)
                    """, u_id=str(u_id), s_id=str(s_id), punct=punct)
 
                cur.execute("SELECT user_id, object_id, action FROM content_engagements")
                engagements = cur.fetchall()
                for u_id, o_id, action in engagements:
                    rel_type = "EXPLICITLY_ANSWERED" if action == "answered" else ("IGNORED_CONTENT" if action == "ignored" else "INTERACTED_WITH")
                    session.run(f"""
                    MERGE (u:User {{id: $u_id}})
                    MERGE (o:SocialObject {{id: $o_id}})
                    MERGE (u)-[r:{rel_type}]->(o)
                    """, u_id=str(u_id), o_id=str(o_id))
 
            # Qdrant Onboarding Sync & Matching
            cur.execute("SELECT user_id, question_id, response_data FROM onboarding_responses")
            onboarding = cur.fetchall()
            user_answers = {}
            for u_id, q_id, ans in onboarding:
                user_answers.setdefault(str(u_id), []).append(ans)
            
            print(f"   🔍 [SYNC] {len(onboarding)} yanıt bulundu. {len(user_answers)} benzersiz kullanıcı işleniyor.")
                
            processed_vectors = {}
            for u_id, answers in user_answers.items():
                text = " ".join([f"Cevap: {a}" for a in answers])
                vector = generate_embedding(text)
                if vector and qdrant_conn:
                    processed_vectors[u_id] = vector
                    qdrant_conn.upsert(
                        collection_name=QDRANT_COLLECTION_NAME,
                        points=[PointStruct(id=str(UUID(u_id)), vector=vector, payload={"user_id": u_id, "source": "onboarding_sync"})],
                        wait=True
                    )
            
            print(f"   🔍 [SYNC] {len(processed_vectors)} kullanıcı başarıyla vektörleştirildi.")
 
            # Telemetry Bulk Sync
            cur.execute("SELECT user_id, target_path, event_type FROM telemetry_streams")
            telemetries = cur.fetchall()
            with neo4j_driver.session() as session:
                for u_id, path, e_type in telemetries:
                    rel_type = "VISITED" if e_type in ['session_start', 'viewport_visibility'] else "INTERACTED_WITH"
                    session.run(f"""
                    MERGE (p:Page {{path: $path}})
                    SET p.name = $path, p.label = 'Page'
                    WITH p
                    MATCH (u:User {{id: $u_id}})
                    MERGE (u)-[r:{rel_type}]->(p)
                    SET r.count = COALESCE(r.count, 0) + 1
                    """, u_id=str(u_id), path=path)
 
        # --- POSTGRES CURSOR KAPANDIKTAN SONRA AI VE MATCHING İŞLEMLERİ ---
        
        # 1. Matching (Qdrant araması ve her eşleşme için commit)
        with neo4j_driver.session() as session:
            for u_id, vector in processed_vectors.items():
                search_result = qdrant_conn.search(
                    collection_name=QDRANT_COLLECTION_NAME,
                    query_vector=vector,
                    limit=4
                )
                print(f"   🔍 [SYNC] {u_id} için Qdrant araması yapıldı: {len(search_result)} sonuç.")
                for hit in search_result:
                    target_id = hit.payload.get("user_id")
                    if target_id and target_id != u_id and hit.score > 0.25:
                        u_a, u1_b = sorted([str(u_id), str(target_id)])
                        print(f"   🤝 [SYNC] Eşleşme Tespiti: {u_a} <-> {u1_b} (Skor: {hit.score:.2f})")
                        
                        session.run("""
                        MATCH (u1:User {id: $u1}), (u2:User {id: $u2})
                        MERGE (u1)-[r:POTENTIAL_FRIEND]-(u2)
                        SET r.similarity_score = $score
                        """, u1=u_a, u2=u1_b, score=hit.score)
 
                        try:
                            with db_conn.cursor() as cur_match:
                                cur_match.execute("""
                                    UPDATE ai_matching_results 
                                    SET similarity_score = GREATEST(similarity_score, %s),
                                        matched_at = NOW()
                                    WHERE user_a_id = %s AND user_b_id = %s;
                                """, (hit.score, u_a, u1_b))
                                if cur_match.rowcount == 0:
                                    cur_match.execute("""
                                        INSERT INTO ai_matching_results (user_a_id, user_b_id, similarity_score, matched_at)
                                        VALUES (%s, %s, %s, NOW())
                                    """, (u_a, u1_b, hit.score))
                                db_conn.commit()
                        except Exception as inner_e:
                            db_conn.rollback()
                            print(f"   ⚠️ Eşleşme kayıt hatası ({u_a} - {u1_b}): {inner_e}")
 
        # 2. Gelişim Analizini Tetikle (Batch Mode)
        try:
            handle_growth_analysis({})
        except Exception as e:
            print(f"   ⚠️ Toplu gelişim analizi tetikleme hatası: {e}")
 
        print("✅ [NEO4J] Senkronizasyon başarıyla tamamlandı.")
    except Exception as e:
        if db_conn: db_conn.rollback()
        print(f"❌ [NEO4J] Senkronizasyon hatası: {e}")


# --- GÖREV YÖNLENDİRİCİ (TASK DISPATCHER) ---

TASK_HANDLERS = {
    "analyze_mentor_evaluation": handle_mentor_evaluation,
    "vectorize_engagement_response": handle_vectorization,
    "create_neo4j_relation": handle_neo4j_relation,
    "analyze_engagement": handle_engagement,
    "analyze_telemetry": handle_telemetry,
    "analyze_spatial_log": handle_spatial_log,
    "process_palantir_query": handle_palantir_command,
    "profile_user_behavior": handle_profile_user,
    "detect_anomalies": handle_detect_anomalies,
    "generate_event_report": handle_event_report,
    "calculate_stress_index": handle_stress_index,
    "sync_full_graph": handle_full_sync,
    "analyze_group": handle_group_analysis,
    "handle_user_onboarding": handle_user_onboarding,
    "handle_social_content": handle_social_content,
    "user_chat": handle_user_chat,
    "daily_summary": handle_daily_summary,
    "analyze_growth": handle_growth_analysis,
}



def ensure_db_constraints():
    """Veritabanı tablolarını ve kısıtlamalarını (Constraint) kontrol eder ve eksikse oluşturur."""
    try:
        with db_conn.cursor() as cur:
            # Önce eski yanlış sütunlu tabloyu temizle (migration)
            cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'ai_matching_results' AND column_name = 'created_at'")
            if cur.fetchone():
                print("⚠️ [DB] Eski 'created_at' sütunu tespit edildi. Tablo güncelleniyor...")
                cur.execute("DROP TABLE IF EXISTS ai_matching_results CASCADE")
                db_conn.commit()

            # 1. Tablo var mı kontrol et, yoksa oluştur (UUID ve matched_at kullanarak)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS ai_matching_results (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_a_id UUID NOT NULL,
                    user_b_id UUID NOT NULL,
                    similarity_score FLOAT NOT NULL,
                    matched_at TIMESTAMPTZ DEFAULT NOW()
                )
            """)
            
            # 2. unique_user_pairs kısıtlaması var mı kontrol et (plural name consistent with gateway)
            cur.execute("SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_pairs'")
            if not cur.fetchone():
                print("🔧 [DB] 'unique_user_pairs' kısıtlaması ekleniyor...")
                cur.execute("ALTER TABLE ai_matching_results ADD CONSTRAINT unique_user_pairs UNIQUE (user_a_id, user_b_id)")
                print("✅ [DB] Kısıtlama başarıyla eklendi.")
            
            db_conn.commit()
    except Exception as e:
        print(f"⚠️ [DB] Otomatik migrasyon hatası: {e}")
        if db_conn: db_conn.rollback()

def setup_qdrant_collection():
    """İlk başlatmada Qdrant koleksiyonunu oluşturur."""
    try:
        collections = [c.name for c in qdrant_conn.get_collections().collections]
        if QDRANT_COLLECTION_NAME not in collections:
            qdrant_conn.create_collection(
                collection_name=QDRANT_COLLECTION_NAME,
                vectors_config=VectorParams(
                    size=768,  # embeddinggemma varsayılan boyut
                    distance=Distance.COSINE
                )
            )
            print(f"✅ '{QDRANT_COLLECTION_NAME}' koleksiyonu Qdrant'ta oluşturuldu.")
        else:
            print(f"ℹ️ '{QDRANT_COLLECTION_NAME}' koleksiyonu zaten mevcut.")
    except Exception as e:
        print(f"❌ Qdrant koleksiyon kurulum hatası: {e}")


def main():
    """Ana dinleyici döngüsü. Redis'i dinler ve görevleri yönlendirir."""
    
    # Graceful shutdown flag
    shutdown_requested = False
    
    def handle_signal(signum, frame):
        nonlocal shutdown_requested
        logger.warning(f"Received signal {signum}, shutting down gracefully...")
        shutdown_requested = True
    
    # Register signal handlers
    signal.signal(signal.SIGTERM, handle_signal)
    signal.signal(signal.SIGINT, handle_signal)
    
    logger.info("=" * 60)
    logger.info("🚀 V-RAG AI Worker başlatılıyor...")
    logger.info("=" * 60)

    # Sağlık kontrolleri
    logger.info("\n📡 Bağlantı Durumları:")
    logger.info(f"   PostgreSQL: {'✅' if db_conn else '❌'}")
    logger.info(f"   Redis:      {'✅' if redis_client else '❌'}")
    logger.info(f"   Qdrant:     {'✅' if qdrant_conn else '❌'}")
    logger.info(f"   Neo4j:      {'✅' if neo4j_driver else '❌'}")

    # Ollama kontrolü
    logger.info("\n🤖 Ollama Durumu:")
    check_ollama_health()

    # Qdrant koleksiyonunu kur ve DB kısıtlamalarını kontrol et
    if qdrant_conn:
        setup_qdrant_collection()
        ensure_db_constraints()

    # Otomatik Veri Senkronizasyonu (İlk kurulum veya boş grafik durumu için)
    if neo4j_driver:
        try:
            with neo4j_driver.session() as session:
                result = session.run("MATCH (n) RETURN count(n) as node_count")
                node_count = result.single()["node_count"]
                if node_count < 10:
                    logger.info("ℹ️ Neo4j ağı boş veya çok küçük. Otomatik Qdrant ve Neo4j senkronizasyonu başlatılıyor...")
                    handle_full_sync({})
        except Exception as e:
            logger.error(f"Neo4j otomatik senkronizasyon kontrol hatası: {e}")

    logger.info(f"\n⏳ Redis kuyruğu dinleniyor: '{REDIS_QUEUE_NAME}'")
    logger.info("   (NestJS'ten veya Redis CLI'dan görev bekleniyor...)\n")

    while not shutdown_requested:
        try:
            # Redis kuyruğunda bir mesaj belirene kadar bekle (blocking pop with timeout for signal checking)
            message = redis_client.brpop(REDIS_QUEUE_NAME, timeout=1)
            if message:
                try:
                    task = json.loads(message[1])
                    task_name = task.get("task_name")
                    payload = task.get("payload", {})
                    
                    handler = TASK_HANDLERS.get(task_name)
                    if handler:
                        try:
                            handler(payload)
                        except Exception as inner_e:
                            print(f"❌ '{task_name}' handler hatası: {inner_e}")
                            try: db_conn.rollback() 
                            except: pass
                    else:
                        print(f"⚠️ Bilinmeyen görev tipi: {task_name}")
                        
                except Exception as e:
                    print(f"❌ Genel görev kuyruğu hatası: {e}")
                    try: db_conn.rollback() 
                    except: pass
        except (redis.exceptions.ConnectionError, redis.exceptions.TimeoutError) as e:
            logger.error("\n" + "!" * 50)
            logger.error(f"📡 REDİS BAĞLANTI HATASI: {e}")
            logger.error("   5 saniye içinde yeniden bağlanılmaya çalışılacak...")
            logger.error("!" * 50 + "\n")
            time.sleep(5)
            # Re-initialize client if necessary or just let it retry in next loop
        except Exception as e:
            logger.error("\n" + "=" * 50)
            logger.error("🔥 KRİTİK HATA! Ana döngüde bir sorun oluştu:")
            logger.error(traceback.format_exc())
            logger.error("=" * 50 + "\n")
            time.sleep(5)

    # Temizlik
    logger.info("\n🛑 AI Worker durduruluyor, bağlantılar kapatılıyor...")
    try:
        if neo4j_driver:
            neo4j_driver.close()
        if db_conn:
            db_conn.close()
        logger.info("👋 AI Worker kapatıldı.")
    except Exception as e:
        logger.error(f"Error during shutdown: {e}")


if __name__ == "__main__":
    main()
