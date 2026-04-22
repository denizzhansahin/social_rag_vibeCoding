import json
from uuid import UUID
from qdrant_client.models import Filter
from connections.pg_client import db_conn
from connections.qdrant_client import qdrant_conn
from connections.neo4j_client import neo4j_driver
from services.ollama_service import generate_completion, generate_embedding

def gather_context_for_query(query_text: str) -> dict:
    """Veritabanlarından (Postgres, Neo4j, Qdrant) sorgu özelinde bağlam toplar."""
    context = {"qdrant": [], "neo4j": [], "postgres_evals": [], "postgres_stats": []}
    print(f"📡 [Palantir] Soru Vektörel Olarak Analiz Ediliyor...")

    # 1. QDRANT: Vektörel Arama (Semantic Context)
    query_vector = generate_embedding(query_text)
    if query_vector and qdrant_conn:
        try:
            search_results = qdrant_conn.search(
                collection_name="cognitive_memory_bank",
                query_vector=query_vector,
                limit=5
            )
            for hit in search_results:
                context["qdrant"].append(hit.payload.get("original_text", ""))
            print(f"   ✔️ Qdrant: {len(search_results)} ilgili anket yanıtı bulundu.")
        except Exception as e:
            print(f"   ❌ Qdrant Arama Hatası: {e}")

    # 2. NEO4J: Davranışsal Bağlantılar (Graph Context)
    if neo4j_driver:
        try:
            with neo4j_driver.session() as session:
                graph_result = session.run("""
                    MATCH (n)-[r]->(m) 
                    RETURN type(r) as relType, count(r) as freq 
                    ORDER BY freq DESC LIMIT 5
                """)
                for record in graph_result:
                    context["neo4j"].append(f"Ağ İçindeki Genel Davranış: {record['freq']} adet {record['relType']} eylemi tespit edildi.")
                
                # Also get node counts by label
                label_result = session.run("""
                    MATCH (n) RETURN labels(n)[0] as label, count(n) as cnt
                    ORDER BY cnt DESC LIMIT 10
                """)
                for record in label_result:
                    context["neo4j"].append(f"Graf Düğüm Tipi: {record['label']} → {record['cnt']} adet")

            print("   ✔️ Neo4j: Profil ilişkileri derlendi.")
        except Exception as e:
            print(f"   ❌ Neo4j Hata: {e}")

    # 3. POSTGRES: Temel Metrikler (SQL Context)
    if db_conn:
        try:
            with db_conn.cursor() as cur:
                # Son 5 Mentor Değerlendirme Analizi (Yapay zeka çıkarımları jsonb içinde)
                cur.execute("SELECT ai_extracted_insights FROM evaluations WHERE ai_extracted_insights IS NOT NULL ORDER BY created_at DESC LIMIT 5")
                for row in cur.fetchall():
                    if row[0]:
                        context["postgres_evals"].append(str(row[0]))
            print("   ✔️ Postgres: Mentor analizleri derlendi.")
        except Exception as e:
            print(f"   ❌ Postgres Eval Hata: {e}")

        # 3b. POSTGRES: Genel İstatistikler
        try:
            with db_conn.cursor() as cur:
                # Kullanıcı sayıları
                cur.execute("SELECT role, COUNT(*) FROM master_identities GROUP BY role")
                rows = cur.fetchall()
                for row in rows:
                    context["postgres_stats"].append(f"Rol: {row[0]} → {row[1]} kullanıcı")

                # Grup sayısı ve üye dağılımı
                cur.execute("""
                    SELECT g.name, COUNT(gm.user_id) as member_count 
                    FROM groups g 
                    LEFT JOIN group_members gm ON g.id = gm.group_id 
                    GROUP BY g.name ORDER BY member_count DESC LIMIT 10
                """)
                for row in cur.fetchall():
                    context["postgres_stats"].append(f"Grup: {row[0]} → {row[1]} üye")

                # Son gönderi istatistikleri
                cur.execute("""
                    SELECT post_type, COUNT(*) as cnt, 
                           COUNT(DISTINCT author_id) as unique_authors
                    FROM feed_posts 
                    WHERE created_at > NOW() - INTERVAL '7 days'
                    GROUP BY post_type
                """)
                for row in cur.fetchall():
                    context["postgres_stats"].append(f"Son 7 gün gönderi: {row[0]} tipinde {row[1]} gönderi, {row[2]} farklı yazar")

                # Etkinlik katılım oranları
                cur.execute("""
                    SELECT e.title, COUNT(ea.id) as assignment_count
                    FROM events e
                    LEFT JOIN event_assignments ea ON e.id = ea.event_id
                    GROUP BY e.title ORDER BY assignment_count DESC LIMIT 5
                """)
                for row in cur.fetchall():
                    context["postgres_stats"].append(f"Etkinlik: {row[0]} → {row[1]} atama")

                # Onboarding durumu
                cur.execute("""
                    SELECT 
                        COUNT(*) FILTER (WHERE has_completed_onboarding = true) as completed,
                        COUNT(*) FILTER (WHERE has_completed_onboarding = false OR has_completed_onboarding IS NULL) as pending
                    FROM master_identities WHERE role = 'participant'
                """)
                row = cur.fetchone()
                if row:
                    context["postgres_stats"].append(f"Onboarding: {row[0]} tamamladı, {row[1]} bekliyor")

            print("   ✔️ Postgres: Genel istatistikler derlendi.")
        except Exception as e:
            print(f"   ❌ Postgres Stats Hata: {e}")

    return context


def process_admin_query(chat_id: str, query: str, admin_id: str):
    """NestJS'ten gelen yönetici sorularını Agent olarak yanıtlar."""
    print(f"\n🧠 [PALANTIR_GOTHAM] İstihbarat Analizi Başladı (Log ID: {chat_id})")
    
    # Adım 1: RAG Bağlamını topla
    context = gather_context_for_query(query)
    
    # Adım 2: Ollama Prompt'unu Dev Context ile Kur
    qdrant_text = "\n".join(context["qdrant"]) if context["qdrant"] else "Hiçbir semantik metin bulunamadı."
    neo4j_text = "\n".join(context["neo4j"]) if context["neo4j"] else "Graph bağlantısı bulunamadı."
    pg_text = "\n".join(context["postgres_evals"]) if context["postgres_evals"] else "Mentor değerlendirmesi bulunamadı."
    stats_text = "\n".join(context["postgres_stats"]) if context["postgres_stats"] else "İstatistik verisi bulunamadı."
    
    system_prompt = f"""You are 'Palantir V-RAG', a highly advanced intelligence agent for a gamified youth event. 
Your goal is to answer the Administrator's question using ONLY the provided Tri-Data Context (Qdrant, Neo4j, PostgreSQL). 
Act like a professional data-analyst, psychologist and intelligence officer. Speak in Turkish. DO NOT guess; if data is insufficient, state that.
Pay special attention to whether the question asks for "Kişi Analizi" (Personal Analysis), "Grup Analizi" (Group Dynamics), or "Etkinlik Analizi" (Event Success).

[CONTEXT FROM QDRANT - USER SURVEY RESPONSES]
{qdrant_text}

[CONTEXT FROM NEO4J - BEHAVIORAL GRAPH]
{neo4j_text}

[CONTEXT FROM POSTGRESQL - MENTOR EVALUATIONS]
{pg_text}

[CONTEXT FROM POSTGRESQL - PLATFORM STATISTICS]
{stats_text}

Question/Command from Admin: "{query}"

Provide a detailed, analytical, and professional intelligence report answering the question. Include bullet points when analyzing behavior and use Markdown formatting.
"""

    print("⏳ [Palantir] LLM Çıkarımı Yapılıyor (Gemma3:4b)...")
    ai_response = generate_completion(system_prompt)

    if not ai_response:
        ai_response = "Sistem Hatası: LLM sunucusu yanıt veremedi veya meşgul."

    # Adım 3: Sonucu PostgreSQL'e geri (UPDATE) yaz
    try:
        with db_conn.cursor() as cur:
            cur.execute(
                """
                UPDATE agent_chat_logs 
                SET ai_response_text = %s, context_used = %s, status = 'completed', updated_at = NOW() 
                WHERE id = %s
                """,
                (ai_response, json.dumps(context), chat_id)
            )
            db_conn.commit()
            print("✅ [PALANTIR_GOTHAM] Görev Tamamlandı. Zeka Raporu veri tabanına işlendi.")
    except Exception as e:
        db_conn.rollback()
        print(f"❌ [PALANTIR_GOTHAM] DB Update Hatası: {e}")
        try:
            with db_conn.cursor() as cur:
                cur.execute("UPDATE agent_chat_logs SET status = 'failed' WHERE id = %s", (chat_id,))
                db_conn.commit()
        except: pass
