import psycopg2
import json

conn_str = "postgresql://postgres:postgres@localhost:5432/vizyon_kampi"

try:
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()
    
    # Check matching results
    cur.execute("SELECT count(*) FROM ai_matching_results;")
    count = cur.fetchone()[0]
    print(f"Total Matches in DB: {count}")
    
    if count > 0:
        cur.execute("SELECT user_a_id, user_b_id, similarity_score FROM ai_matching_results LIMIT 5;")
        rows = cur.fetchall()
        print("Sample Matches:")
        for r in rows:
            print(f"  {r[0]} <-> {r[1]} (Score: {r[2]})")
            
    # Check master_identities for these IDs
    cur.execute("SELECT id, email, role, has_completed_onboarding FROM master_identities LIMIT 5;")
    users = cur.fetchall()
    print("\nSample Users:")
    for u in users:
        print(f"  {u[0]} | {u[1]} | {u[2]} | Onboarded: {u[3]}")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error: {e}")
