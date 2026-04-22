Elbette! Sistemin beyninin (Python) duyu organlarını, yani tüm veritabanlarıyla ve yapay zeka motoruyla (Ollama) konuşmasını sağlayacak olan istemci (client) kodlarını hazırladım.

Oluşturduğumuz `ai_worker` klasörünün içindeki ilgili dosyalara bu kodları yapıştır. Her dosyanın başında `.env` dosyasını okuyarak şifre ve port gibi hassas bilgileri güvenli bir şekilde almasını sağladım.

---

### 1. PostgreSQL İstemcisi

Bu kod, PostgreSQL veritabanına bağlanır ve diğer fonksiyonların kullanabilmesi için hazır bir "connection" nesnesi sunar.

**Dosya:** `connections/pg_client.py`
```python
import os
import psycopg2
from dotenv import load_dotenv

# .env dosyasındaki değişkenleri yükle
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
        print("✅ PostgreSQL'e başarıyla bağlandı.")
        return conn
    except psycopg2.OperationalError as e:
        print(f"❌ PostgreSQL bağlantı hatası: {e}")
        return None

# Uygulama genelinde kullanmak için bir bağlantı nesnesi oluştur
db_conn = get_db_connection()
```

---

### 2. Redis İstemcisi

Redis'e bağlanır. `decode_responses=True` parametresi, Redis'ten gelen verileri otomatik olarak metne (string) çevirir, bu da işimizi çok kolaylaştırır.

**Dosya:** `connections/redis_client.py`
```python
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
            decode_responses=True # Cevapları otomatik olarak string'e çevir
        )
        r.ping() # Bağlantıyı test et
        print("✅ Redis'e başarıyla bağlandı.")
        return r
    except redis.exceptions.ConnectionError as e:
        print(f"❌ Redis bağlantı hatası: {e}")
        return None

# Uygulama genelinde kullanmak için bir redis istemcisi oluştur
redis_client = get_redis_connection()
```

---

### 3. Qdrant İstemcisi

Vektör veritabanı Qdrant'a bağlanır. Bu istemci üzerinden vektör ekleme, arama ve koleksiyon yönetimi yapacağız.

**Dosya:** `connections/qdrant_client.py`
```python
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
        # Sağlık kontrolü için koleksiyonları listelemeyi deneyebiliriz
        client.get_collections()
        print("✅ Qdrant'a başarıyla bağlandı.")
        return client
    except Exception as e:
        print(f"❌ Qdrant bağlantı hatası: {e}")
        return None

# Uygulama genelinde kullanmak için bir qdrant istemcisi oluştur
qdrant_client = get_qdrant_connection()
```

---

### 4. Neo4j İstemcisi

Graf veritabanı Neo4j'ye bağlanır. Neo4j, bir `driver` nesnesi üzerinden çalışır. Bu nesne, uygulama boyunca açık kalır ve gerektiğinde bağlantı havuzundan (connection pool) oturumlar (session) açar.

**Dosya:** `connections/neo4j_client.py`
```python
import os
from neo4j import GraphDatabase
from dotenv import load_dotenv

load_dotenv()

def get_neo4j_driver():
    """Neo4j (Graf Veritabanı) sunucusuna bir driver nesnesi oluşturur."""
    uri = os.getenv("NEO4J_URI")
    user = os.getenv("NEO4J_USER")
    password = os.getenv("NEO4J_PASSWORD")
    
    try:
        driver = GraphDatabase.driver(uri, auth=(user, password))
        driver.verify_connectivity()
        print("✅ Neo4j'e başarıyla bağlandı.")
        return driver
    except Exception as e:
        print(f"❌ Neo4j bağlantı hatası: {e}")
        return None

def close_neo4j_driver(driver):
    """Neo4j driver'ını düzgün bir şekilde kapatır."""
    if driver:
        driver.close()
        print("Neo4j bağlantısı kapatıldı.")

# Uygulama genelinde kullanmak için bir neo4j driver'ı oluştur
neo4j_driver = get_neo4j_driver()
```

---

### 5. Ollama Servisi (Yapay Zeka Motoru)

Bu bir veritabanı değil, yapay zeka modelinin kendisiyle konuşacak olan servisimiz. Bir metni alıp vektöre çevirme (`generate_embedding`) ve bir metin hakkında analiz yapma (`generate_completion`) gibi iki temel görevi olacak.

**Dosya:** `services/ollama_service.py`
```python
import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

OLLAMA_URL = os.getenv("OLLAMA_URL")

def generate_embedding(text: str, model: str = "mxbai-embed-large"):
    """
    Verilen metni Ollama kullanarak bir vektör (embedding) haline getirir.
    Bu vektör Qdrant'a kaydedilecek.
    """
    try:
        url = f"{OLLAMA_URL}/api/embeddings"
        payload = {
            "model": model,
            "prompt": text
        }
        response = requests.post(url, json=payload)
        response.raise_for_status() # HTTP hatası varsa exception fırlat
        return response.json().get("embedding")
    except requests.exceptions.RequestException as e:
        print(f"❌ Ollama embedding hatası: {e}")
        return None

def generate_completion(prompt: str, model: str = "llama3"):
    """
    Verilen bir prompt'a Ollama ile metin tabanlı bir cevap üretir.
    (Örn: "Bu cümlenin duygu analizi nedir?")
    """
    try:
        url = f"{OLLAMA_URL}/api/generate"
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False # Cevabı tek parça halinde al
        }
        response = requests.post(url, json=payload)
        response.raise_for_status()
        
        # Gelen cevabı JSON olarak parse et ve sadece 'response' alanını döndür
        response_data = response.json()
        return response_data.get("response")
    except requests.exceptions.RequestException as e:
        print(f"❌ Ollama completion hatası: {e}")
        return None
```

---

### Sonraki Adım: Ana Döngüyü Yazmak!

Artık sistemin tüm parçaları birbirleriyle konuşabiliyor. Sıradaki adım, Redis'ten gelen mesajları dinleyecek, bu mesajlara göre ilgili servisleri (Ollama, Qdrant vb.) tetikleyecek ve en sonunda PostgreSQL'deki veriyi güncelleyecek olan `main.py` dosyasını yazmak.

Hazırsan, **"main.py dosyasını yazalım"** demen yeterli



Elbette! Sistemin kalbini, yani Redis'ten sürekli olarak görevleri dinleyip ilgili yapay zeka operasyonlarını tetikleyecek olan ana döngüyü (`main.py`) ve bu süreçte kullanacağımız veri yapılarını (`models.py`) yazıyoruz.

Bu yapı, "İşlem Yönlendirici" (Task Dispatcher) olarak adlandırılır. `main.py` gelen görevin adını okur ve o görevi yerine getirecek olan doğru fonksiyonu çağırır.

---

### 1. Pydantic Modelleri (Veri Şemaları)

Öncelikle, Redis'ten gelen veya AI'ın ürettiği JSON verilerinin her zaman belirli bir yapıda olduğundan emin olmak için Pydantic modellerimizi oluşturalım. Bu, kodumuzu çok daha güvenilir ve hataya dayanıklı hale getirir.

**Dosya:** `models.py`
```python
from pydantic import BaseModel, Field
from typing import List, Dict, Any
from uuid import UUID

# Redis'ten gelen ana görev paketinin şeması
class RedisTask(BaseModel):
    task_name: str
    payload: Dict[str, Any]

# Mentor değerlendirmesini analiz etme görevinin payload'u
class MentorEvaluationPayload(BaseModel):
    evaluation_id: UUID

# Anket cevabını vektöre çevirme görevinin payload'u
class VectorizationPayload(BaseModel):
    engagement_id: UUID

# AI'ın bir metinden çıkardığı ve Postgres'e yazacağımız JSON yapısı
class AIExtractedInsights(BaseModel):
    sentiment_score: float = Field(..., description="Duygu skoru (-1.0 ile 1.0 arası)")
    detected_traits: List[str] = Field(default_factory=list, description="Tespit edilen karakter özellikleri")
    needs_intervention: bool = Field(False, description="Müdahale gerektirip gerektirmediği")
    intervention_reason: str | None = None
```

---

### 2. Ana Döngü ve Görev Yönlendirici

Şimdi, sistemin asıl işçisi olan `main.py` dosyasını hazırlıyoruz. Bu dosya, Redis'i dinleyecek, gelen görevleri ayrıştıracak ve ilgili fonksiyonları çağırarak yapay zeka işlemlerini başlatacak.

Bu dosyada, mimarimizin iki ana senaryosunu ele alacağız:
1.  **Mentor Notunu Analiz Etme:** Adım 6'daki bir notu Ollama ile analiz edip yapılandırılmış JSON'a çevirme.
2.  **Anket Cevabını Vektöre Çevirme:** Adım 3'teki bir serbest metin cevabını Ollama ile vektöre çevirip Qdrant'a kaydetme.

**Dosya:** `main.py`
```python
import time
import json
import traceback
from uuid import UUID

# Bağlantı istemcilerimizi ve servislerimizi import ediyoruz
from connections.redis_client import redis_client
from connections.pg_client import db_conn
from connections.qdrant_client import qdrant_client
from connections.neo4j_client import neo4j_driver
from services.ollama_service import generate_completion, generate_embedding

# Qdrant'ta kullanacağımız koleksiyonun adı
QDRANT_COLLECTION_NAME = "cognitive_memory_bank"

# --- GÖREV İŞLEYİCİ FONKSİYONLAR (TASK HANDLERS) ---

def handle_mentor_evaluation(payload: dict):
    """
    Bir mentor notunu alır, Ollama ile analiz eder ve sonucu Postgres'e yazar.
    """
    print(f"🔄 Görev Başladı: Mentor Değerlendirmesi Analizi (ID: {payload['evaluation_id']})")
    eval_id = payload['evaluation_id']
    
    with db_conn.cursor() as cur:
        # 1. Ham notu veritabanından çek
        cur.execute("SELECT raw_mentor_note FROM evaluations WHERE id = %s", (eval_id,))
        result = cur.fetchone()
        if not result or not result[0]:
            print(f"⚠️ Uyarı: {eval_id} için analiz edilecek not bulunamadı.")
            return

        raw_note = result[0]

        # 2. Ollama'ya göndereceğimiz prompt'u hazırlıyoruz
        prompt = f"""
        Aşağıdaki mentor notunu analiz et ve SADECE JSON formatında bir çıktı ver.
        JSON objesi şu anahtarları içermeli: "sentiment_score" (float, -1.0 ile 1.0 arası), 
        "detected_traits" (string listesi), "needs_intervention" (boolean).
        
        Not: "{raw_note}"
        """
        
        # 3. Ollama'dan analizi al
        ai_response_str = generate_completion(prompt)
        if not ai_response_str:
            print("❌ Hata: Ollama'dan analiz cevabı alınamadı.")
            return

        # 4. Gelen cevabı JSON'a çevirip Postgres'e yaz
        try:
            ai_insights = json.loads(ai_response_str)
            cur.execute(
                "UPDATE evaluations SET ai_extracted_insights = %s WHERE id = %s",
                (json.dumps(ai_insights), eval_id)
            )
            db_conn.commit()
            print(f"✅ Görev Tamamlandı: {eval_id} ID'li değerlendirme analiz edildi ve kaydedildi.")
        except json.JSONDecodeError:
            print(f"❌ Hata: Ollama'dan gelen cevap JSON formatında değil: {ai_response_str}")
        except Exception as e:
            db_conn.rollback()
            print(f"❌ Veritabanı güncelleme hatası: {e}")


def handle_vectorization(payload: dict):
    """
    Bir anket cevabını alır, vektöre çevirir ve Qdrant'a kaydeder.
    """
    print(f"🔄 Görev Başladı: Yanıt Vektörizasyonu (ID: {payload['engagement_id']})")
    engagement_id = UUID(payload['engagement_id'])

    with db_conn.cursor() as cur:
        # 1. Cevap metnini ve ilgili ID'leri veritabanından çek
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
        
        # 2. Ollama ile metni vektöre çevir
        vector = generate_embedding(text_to_embed)
        if not vector:
            print("❌ Hata: Ollama'dan vektör alınamadı.")
            return
            
        # 3. Qdrant'a kaydet
        qdrant_client.upsert(
            collection_name=QDRANT_COLLECTION_NAME,
            points=[
                {
                    "id": str(engagement_id),
                    "vector": vector,
                    "payload": {
                        "user_id": str(user_id),
                        "object_id": str(object_id),
                        "source": "free_text_survey",
                        "original_text": text_to_embed
                    }
                }
            ],
            wait=True # İşlemin bitmesini bekle
        )
        print(f"✅ Görev Tamamlandı: {engagement_id} ID'li yanıt vektöre çevrildi ve Qdrant'a kaydedildi.")


# --- GÖREV YÖNLENDİRİCİ (TASK DISPATCHER) ---

# Gelen görev adına göre hangi fonksiyonun çalışacağını belirleyen harita
TASK_HANDLERS = {
    "analyze_mentor_evaluation": handle_mentor_evaluation,
    "vectorize_engagement_response": handle_vectorization
    # Yeni görevler geldikçe buraya ekleyeceğiz...
}

def main():
    """Ana dinleyici döngüsü. Redis'i dinler ve görevleri yönlendirir."""
    print("🚀 AI Worker başlatıldı. Redis'ten görevler bekleniyor...")
    # İlk başlatmada Qdrant koleksiyonu yoksa oluştur
    try:
        qdrant_client.recreate_collection(
            collection_name=QDRANT_COLLECTION_NAME,
            vectors_config={"size": 1024, "distance": "Cosine"} # mxbai-embed-large modeli 1024 boyutlu vektör üretir
        )
        print(f"'{QDRANT_COLLECTION_NAME}' koleksiyonu Qdrant'ta oluşturuldu/kontrol edildi.")
    except Exception:
        # Koleksiyon zaten varsa hata verir, bu normal.
        print(f"'{QDRANT_COLLECTION_NAME}' koleksiyonu zaten mevcut.")

    while True:
        try:
            # Redis kuyruğunda bir mesaj belirene kadar bekle (blocking pop)
            # timeout=0 -> sonsuza kadar bekle
            message = redis_client.brpop("ai_task_queue", timeout=0)
            if message:
                # Gelen mesajı JSON'a çevir
                task_data = json.loads(message[1])
                task_name = task_data.get("task_name")
                payload = task_data.get("payload")

                # Görev adını haritadan bul ve ilgili fonksiyonu çalıştır
                handler = TASK_HANDLERS.get(task_name)
                if handler:
                    handler(payload)
                else:
                    print(f"❌ Bilinmeyen görev adı: {task_name}")

        except Exception as e:
            print("\n" + "="*50)
            print("🔥 KRİTİK HATA! Ana döngüde bir sorun oluştu:")
            print(traceback.format_exc())
            print("="*50 + "\n")
            time.sleep(5) # Hata durumunda 5 saniye bekle ve devam et

if __name__ == "__main__":
    main()

```

### Nasıl Çalıştırılır ve Test Edilir?

1.  **Worker'ı Başlatın:** Terminalde `conda activate ai_core` ile ortamı aktif edin ve `ai_worker` klasöründeyken şu komutu çalıştırın:
    ```bash
    python main.py
    ```
    Ekranda `AI Worker başlatıldı...` ve veritabanı bağlantı onaylarını görmelisiniz.

2.  **Manuel Test (Redis'e Görev Gönderme):**
    *   **Yeni bir terminal açın.**
    *   `redis-cli` komutunu çalıştırarak Redis komut satırına girin.
    *   NestJS'in yapacağı şeyi manuel olarak simüle edelim. Aşağıdaki komutu Redis CLI'a yapıştırıp Enter'a basın:
    ```redis
    LPUSH ai_task_queue '{"task_name": "analyze_mentor_evaluation", "payload": {"evaluation_id": "DEĞERLENDİRME_ID_NİZ"}}'
    ```
    *(Not: `DEĞERLENDİRME_ID_NİZ` kısmına, PostgreSQL'deki `evaluations` tablonuzdan, içinde `raw_mentor_note` olan bir kaydın `id`'sini yapıştırmanız gerekiyor.)*

    Bu komutu gönderdiğiniz an, Python worker'ının çalıştığı terminalde "🔄 Görev Başladı..." mesajını ve ardından başarılı veya hatalı sonuç mesajını göreceksiniz.

Tebrikler! Sistemin beyni artık çalışıyor, dinliyor ve görevleri yerine getiriyor. Sıradaki mantıklı adım, bu görevleri manuel olarak değil, **NestJS** üzerinden (örneğin bir değerlendirme eklendiği anda) Redis'e otomatik olarak göndermektir.