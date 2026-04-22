import os
import redis
from dotenv import load_dotenv

load_dotenv()

def get_redis_connection():
    """Redis sunucusuna bir bağlantı kurar ve döndürür."""
    try:
        r = redis.Redis(
            host=os.getenv("REDIS_HOST"),
            port=int(os.getenv("REDIS_PORT")),
            decode_responses=True
        )
        r.ping()
        print("✅ Redis'e başarıyla bağlandı.")
        return r
    except redis.exceptions.ConnectionError as e:
        print(f"❌ Redis bağlantı hatası: {e}")
        return None

redis_client = get_redis_connection()
