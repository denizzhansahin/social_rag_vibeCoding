import psycopg2
import json
from uuid import uuid4
from datetime import datetime, timedelta
import random

# Veritabanı bağlantılarını doğrudan kendi modüllerimizden çekelim
from connections.pg_client import db_conn
from connections.qdrant_client import qdrant_conn
from connections.neo4j_client import neo4j_driver
from services.ollama_service import generate_embedding
import qdrant_client.models as models

def seed_highly_detailed_data():
    print("🚀 5 Kişilik Hiper Gerçekçi Veri Yüklemesi Başlıyor...")

    # Kullanıcılar: Ali (Yorgun/Stresli), Ayşe (Odaklı/Mutlu), Can (Hiperaktif/Dürtüsel), Zeynep (Analitik/Soğuk), Burak (Çekingen)
    users = [
        {"id": str(uuid4()), "name": "Ali", "gender": "Erkek", "age": 17, "trait": "stresli"},
        {"id": str(uuid4()), "name": "Ayşe", "gender": "Kız", "age": 16, "trait": "odakli"},
        {"id": str(uuid4()), "name": "Can", "gender": "Erkek", "age": 17, "trait": "durtusel"},
        {"id": str(uuid4()), "name": "Zeynep", "gender": "Kız", "age": 18, "trait": "analitik"},
        {"id": str(uuid4()), "name": "Burak", "gender": "Erkek", "age": 16, "trait": "cekingen"}
    ]
    
    admin_id = '11111111-1111-1111-1111-111111111111'
    obj_id = str(uuid4()) # Anket sorusu ID'si
    session_id = 'bbbbbbbb-1111-4ccc-8ddd-eeeeeeeeeeee'

    with db_conn.cursor() as cur:
        # Yeni anket nesnesi yarat
        cur.execute("""
            INSERT INTO social_objects (id, created_by, object_type, ui_payload)
            VALUES (%s, %s, 'free_text', '{"q": "Bugün hissettiklerini ve ekip çalışmasını anlat."}')
            ON CONFLICT DO NOTHING
        """, (obj_id, admin_id))

        for u in users:
            uid = u["id"]
            
            # --- 1. POSTGRES: Master Identity ---
            cur.execute("""
                INSERT INTO master_identities (id, email, password_hash, role, status, cognitive_profile)
                VALUES (%s, %s, 'hash', 'participant', 'active', %s)
            """, (uid, f"{u['name'].lower()}@vizyon.com", json.dumps({"name": u['name'], "age": u['age'], "gender": u['gender']})))

            # --- 2. POSTGRES: Telemetry (Ali çok backspace yapıyor ve uzun bekliyor) ---
            backspace = 50 if u["name"] == "Ali" else (5 if u["name"] == "Ayşe" else random.randint(10, 30))
            cur.execute("""
                INSERT INTO telemetry_streams (user_id, session_id, event_type, target_path, metrics)
                VALUES (%s, %s, 'typing_dynamics', '/survey/1', %s)
            """, (uid, session_id, json.dumps({'backspace_count': backspace, 'delay_sec': 120 if u["name"] == "Ali" else 20})))

            # --- 3. POSTGRES: Evaluations (Mentor Notları) ---
            if u["name"] == "Ali":
                note = "Ali bugün takım etkinliklerinde fiziksel olarak bitkin görünüyordu, tartışmalardan uzak durdu."
                traits = ["yorgun", "uyumsuz", "sessiz"]
                score = 40
            elif u["name"] == "Ayşe":
                note = "Ayşe ekibi toparlayan kişiydi, aşırı enerjik."
                traits = ["lider", "enerjik", "mutlu"]
                score = 90
            else:
                note = f"{u['name']} standart katılım gösterdi."
                traits = [u["trait"]]
                score = 70
                
            cur.execute("""
                INSERT INTO evaluations (evaluator_id, target_id, category, score_1_to_100, raw_mentor_note, ai_extracted_insights)
                VALUES (%s, %s, 'behavioral', %s, %s, %s)
            """, (admin_id, uid, score, note, json.dumps({'detected_traits': traits})))

            # --- 4. POSTGRES & QDRANT: Content Engagements (Açık Metin Yorumları) ---
            if u["name"] == "Ali":
                text = "Bugün etkinlik boyunca gözlerimi açık tutmakta zorlandım. Can durmadan konuştuğu için başım çok ağrıdı, açıkçası ekip çalışması berbattı."
            elif u["name"] == "Can":
                text = "Çok iyiydi, sürekli fikirlerimi söyledim ama Ali nedense hep bana ters ters baktı, çok durgundu anlam veremedim."
            elif u["name"] == "Ayşe":
                text = "Harika bir gün! Herkese yardım etmeye çalıştım. Ali'nin biraz canı sıkkındı sanki ama umarım yarın daha iyi hisseder."
            else:
                text = "Güzeldi, etkinlikleri sevdim."

            # Postgres Insert
            cur.execute("""
                INSERT INTO content_engagements (user_id, object_id, nature, action, response_data, seen_at)
                VALUES (%s, %s, 'explicit', 'answered', %s, NOW()) RETURNING id
            """, (uid, obj_id, json.dumps({'free_text_answer': text})))
            engagement_id = cur.fetchone()[0]

            # Qdrant Vector Insert (Metni Vektörleştirip Qdrant'a koyalım)
            print(f"[{u['name']}] İçin Qdrant Embeddings Üretiliyor...")
            embedding = generate_embedding(text)
            if embedding:
                qdrant_conn.upsert(
                    collection_name="cognitive_memory_bank",
                    points=[models.PointStruct(
                        id=str(engagement_id),
                        vector=embedding,
                        payload={"user_id": uid, "original_text": f"{u['name']} (Yaş {u['age']}): {text}", "sentiment": u["trait"]}
                    )]
                )

            # --- 5. NEO4J: Graph Bağlantıları ---
            # Ali ile Can yan yana oturmuşlar (Conflict Risk yaratmış)
            with neo4j_driver.session() as session:
                session.run("MERGE (u:Participant {id: $uid, name: $name})", uid=uid, name=u["name"])
                
        # Neo4j İlişkilerini Toplu Olarak Kurma
        print("Neo4j Üzerinde İlişkisel (Behavioral) Graph Kuruluyor...")
        with neo4j_driver.session() as session:
            # Ali ile Can Yan Yana ve Çatışma Yaşıyor
            session.run("""
                MATCH (a:Participant {name: 'Ali'}), (c:Participant {name: 'Can'})
                MERGE (a)-[:SAT_NEXT_TO {session: 'Morning_Workshop'}]->(c)
                MERGE (a)-[:CONFLICT_RISK_WITH {reason: 'Can çok konuştu', intensity: 'High'}]->(c)
            """)
            # Ayşe Ali'ye Destek Olmaya Çalışıyor
            session.run("""
                MATCH (a:Participant {name: 'Ayşe'}), (al:Participant {name: 'Ali'})
                MERGE (a)-[:ATTEMPTED_TO_HELP {status: 'Ignored'}]->(al)
            """)
            # Diğerleri Standart
            session.run("""
                MATCH (z:Participant {name: 'Zeynep'}), (b:Participant {name: 'Burak'})
                MERGE (z)-[:PARTNERED_WITH]->(b)
            """)

    db_conn.commit()
    print("✅ 5 Kişilik 'Ali Vakası' Verisi Qdrant, Neo4j ve PostgreSQL'e Sentezlendi!")

if __name__ == "__main__":
    seed_highly_detailed_data()
