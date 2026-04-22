import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def get_db_connection():
    """PostgreSQL veritabanına bir bağlantı kurar ve döndürür."""
    try:
        conn = psycopg2.connect(
            host=os.getenv("PG_HOST"),
            port=os.getenv("PG_PORT"),
            user=os.getenv("PG_USER"),
            password=os.getenv("PG_PASSWORD"),
            dbname=os.getenv("PG_DB")
        )
        conn.autocommit = False
        print("✅ PostgreSQL'e başarıyla bağlandı.")
        return conn
    except psycopg2.OperationalError as e:
        print(f"❌ PostgreSQL bağlantı hatası: {e}")
        return None

db_conn = get_db_connection()
