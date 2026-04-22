import os
from qdrant_client import QdrantClient
from dotenv import load_dotenv

load_dotenv()

def get_qdrant_connection():
    """Qdrant (Vektör Veritabanı) sunucusuna bağlanır."""
    try:
        client = QdrantClient(
            host=os.getenv("QDRANT_HOST"), 
            port=int(os.getenv("QDRANT_PORT"))
        )
        client.get_collections()
        print("✅ Qdrant'a başarıyla bağlandı.")
        return client
    except Exception as e:
        print(f"❌ Qdrant bağlantı hatası: {e}")
        return None

qdrant_conn = get_qdrant_connection()
