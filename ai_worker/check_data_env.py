import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()

def check_data():
    conn = psycopg2.connect(
        host=os.getenv("PG_HOST", "127.0.0.1"),
        port=os.getenv("PG_PORT", "5432"),
        user=os.getenv("PG_USER"),
        password=os.getenv("PG_PASSWORD"),
        dbname=os.getenv("PG_DB")
    )
    cur = conn.cursor()
    
    print("--- ROLES ---")
    cur.execute("SELECT role, count(*) FROM master_identities GROUP BY role;")
    for r in cur.fetchall():
        print(f"Role: '{r[0]}' | Count: {r[1]}")
        
    print("\n--- RECENT MATCHES ---")
    cur.execute("SELECT * FROM ai_matching_results LIMIT 5;")
    for m in cur.fetchall():
        print(m)
        
    cur.close()
    conn.close()

if __name__ == "__main__":
    check_data()
