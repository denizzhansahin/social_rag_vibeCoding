"""
V-RAG Profiler: Kullanıcının tüm telemetri, engagement ve spatial verilerini
toplayarak cognitive_profile JSONB alanını güncelleyen merkezi profilleme motoru.
"""
import json
from connections.pg_client import db_conn
from connections.neo4j_client import neo4j_driver


def calculate_user_profile(user_id: str) -> dict:
    """Bir kullanıcının tüm davranışsal verilerini analiz ederek profil çıkarır."""
    profile = {
        "stress_index": 0.0,
        "introvert_score": 0.5,
        "leadership_score": 0.0,
        "decision_speed": "normal",
        "engagement_style": "unknown",
        "isolation_risk": False,
        "bridge_node": False,
        "punctuality_score": 0.0,
        "survey_fatigue": False,
        "performanceMetrics": {
            "engagement": 0,
            "punctuality": 0,
            "teamwork": 50,
            "adaptation": 50
        }
    }

    try:
        with db_conn.cursor() as cur:
            # 1. Telemetri Analizi (Backspace, Scroll, Typing)
            cur.execute("""
                SELECT metrics FROM telemetry_streams 
                WHERE user_id = %s AND event_type = 'typing_dynamics'
                ORDER BY created_at DESC LIMIT 20
            """, (user_id,))
            telemetry_rows = cur.fetchall()

            total_backspace = 0
            total_entries = len(telemetry_rows)
            for row in telemetry_rows:
                metrics = row[0] if row[0] else {}
                total_backspace += metrics.get('backspace_count', 0)

            if total_entries > 0:
                avg_backspace = total_backspace / total_entries
                if avg_backspace > 30:
                    profile["stress_index"] = min(1.0, avg_backspace / 50)
                    profile["decision_speed"] = "slow"
                elif avg_backspace < 5:
                    profile["decision_speed"] = "impulsive"

            # 2. Engagement Analizi (Aktiflik, Lurker vs Poster)
            cur.execute("""
                SELECT action, count(*) FROM content_engagements 
                WHERE user_id = %s GROUP BY action
            """, (user_id,))
            action_counts = dict(cur.fetchall())

            answered = action_counts.get('answered', 0)
            liked = action_counts.get('liked', 0)
            ignored = action_counts.get('ignored', 0)
            total_actions = answered + liked + ignored

            if total_actions > 0:
                if ignored / total_actions > 0.6:
                    profile["engagement_style"] = "passive_lurker"
                elif answered / total_actions > 0.5:
                    profile["engagement_style"] = "active_contributor"
                else:
                    profile["engagement_style"] = "selective_engager"
                
                # Calculate performance metrics
                engagement_percent = int((1.0 - (ignored / total_actions)) * 100)
                profile["performanceMetrics"]["engagement"] = max(0, min(100, engagement_percent))
                profile["performanceMetrics"]["adaptation"] = min(100, 50 + int(total_actions * 2))

            # 3. Yoklama Analizi (Punctuality)
            cur.execute("""
                SELECT punctuality, count(*) FROM spatial_temporal_logs 
                WHERE user_id = %s GROUP BY punctuality
            """, (user_id,))
            p_counts = dict(cur.fetchall())
            on_time = p_counts.get('on_time', 0) + p_counts.get('early', 0)
            late = p_counts.get('late', 0)
            total_scans = on_time + late + p_counts.get('absent', 0)
            if total_scans > 0:
                profile["punctuality_score"] = round(on_time / total_scans, 2)
                profile["performanceMetrics"]["punctuality"] = int(profile["punctuality_score"] * 100)

            # 4. Neo4j İzolasyon & Liderlik
            if neo4j_driver:
                with neo4j_driver.session() as session:
                    # İzolasyon kontrolü
                    iso_result = session.run(
                        "MATCH (n {id: $uid}) OPTIONAL MATCH (n)-[r]-() RETURN count(r) AS edges",
                        uid=user_id
                    )
                    record = iso_result.single()
                    if record and record['edges'] == 0:
                        profile["isolation_risk"] = True
                        profile["introvert_score"] = 0.9

                    # Liderlik kontrolü (gelen edge sayısı)
                    lead_result = session.run(
                        "MATCH (n {id: $uid})<-[r]-() RETURN count(r) AS inDegree",
                        uid=user_id
                    )
                    lead_record = lead_result.single()
                    if lead_record and lead_record['inDegree'] >= 3:
                        profile["leadership_score"] = min(1.0, lead_record['inDegree'] / 10)
                        profile["performanceMetrics"]["teamwork"] = min(100, int(profile["leadership_score"] * 100 + 40))
                    elif not profile["isolation_risk"]:
                        profile["performanceMetrics"]["teamwork"] = 70

    except Exception as e:
        print(f"   ❌ Profil hesaplama hatası: {e}")

    return profile


def update_cognitive_profile(user_id: str):
    """Hesaplanan profili PostgreSQL'deki cognitive_profile alanına yazar."""
    print(f"\n🧬 [PROFILER] Kullanıcı profili hesaplanıyor: {user_id}")
    profile = calculate_user_profile(user_id)
    
    # Extract performanceMetrics for its own column
    perf_metrics = profile.pop("performanceMetrics", {})

    try:
        with db_conn.cursor() as cur:
            cur.execute(
                "UPDATE master_identities SET cognitive_profile = cognitive_profile || %s, performance_metrics = COALESCE(performance_metrics, '{}'::jsonb) || %s, updated_at = NOW() WHERE id = %s",
                (json.dumps(profile), json.dumps(perf_metrics), user_id)
            )
            db_conn.commit()
            print(f"   ✅ Profil güncellendi: Stres={profile['stress_index']}, Stil={profile['engagement_style']}, İzolasyon={profile['isolation_risk']}")
    except Exception as e:
        db_conn.rollback()
        print(f"   ❌ Profil güncelleme hatası: {e}")

    return profile
