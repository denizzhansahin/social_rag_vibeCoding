Harika bir başlangıç noktası! Sistemin kalbini oluşturacak 4 ana veritabanını (PostgreSQL, Redis, Qdrant, Neo4j) ve PostgreSQL'i görsel olarak yönetmenizi sağlayacak **pgAdmin** aracını tek bir komutla ayağa kaldıracak olan `docker-compose.yml` dosyasını hazırladım.

Hatırlatmakta fayda var: Kararlaştırdığımız mimari gereği **Ollama** bu dosyada yok, çünkü onu bilgisayarınıza (veya sunucuya) doğrudan (Host olarak) kuracağız ki ekran kartı (GPU) veya işlemci gücünü kayıpsız kullanabilsin.

Aşağıdaki kodu projenizin ana dizininde `docker-compose.yml` adında bir dosya oluşturup içine yapıştırın:

### `docker-compose.yml`

```yaml
version: '3.8'

services:
  # 1. PostgreSQL (Sistemin Ana Omurgası)
  postgres:
    image: postgres:15-alpine
    container_name: ai_postgres
    restart: "no"
    environment:
      POSTGRES_USER: ai_user
      POSTGRES_PASSWORD: ai_password_123
      POSTGRES_DB: cognitive_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - ai_network

  # 2. pgAdmin (Postgres'i Görsel Olarak Yönetmek İçin)
  pgadmin:
    image: dpage/pgadmin4
    container_name: ai_pgadmin
    restart: "no"
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@admin.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    depends_on:
      - postgres
    networks:
      - ai_network

  # 3. Redis (Mesaj Kuyruğu ve Cache Katmanı)
  redis:
    image: redis:7-alpine
    container_name: ai_redis
    restart: "no"
    command: redis-server --save 60 1 --loglevel warning
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - ai_network

  # 4. Qdrant (Vektör ve Semantik Hafıza Veritabanı)
  qdrant:
    image: qdrant/qdrant:latest
    container_name: ai_qdrant
    restart: "no"
    ports:
      - "6333:6333" # REST API Portu
      - "6334:6334" # gRPC Portu (Python daha hızlı bağlansın diye)
    volumes:
      - qdrant_data:/qdrant/storage
    networks:
      - ai_network

  # 5. Neo4j (Graf ve Sosyal Ağ Veritabanı)
  neo4j:
    image: neo4j:5.12.0
    container_name: ai_neo4j
    restart: "no"
    environment:
      # Kullanıcı adı: neo4j, Şifre: ai_neo4j_password
      NEO4J_AUTH: neo4j/ai_neo4j_password 
    ports:
      - "7474:7474" # Tarayıcı arayüzü (Browser HTTP)
      - "7687:7687" # Bolt portu (Veri yazmak için)
    volumes:
      - neo4j_data:/data
    networks:
      - ai_network

# Verilerin container silinse bile kaybolmaması için Volume tanımları
volumes:
  postgres_data:
  redis_data:
  qdrant_data:
  neo4j_data:

# Tüm container'ların kendi aralarında rahatça konuşabilmesi için ortak ağ
networks:
  ai_network:
    driver: bridge
```

### Kurulum ve Çalıştırma Adımları:

1.  Terminali açın, `docker-compose.yml` dosyasının bulunduğu dizine gidin.
2.  Şu komutu çalıştırın:
    ```bash
    docker-compose up -d
    ```
3.  Docker, imajları indirecek ve hepsini arka planda (detached mode) çalıştıracaktır.

---

### Sisteminize Giriş Kapıları (Port Haritası)

Docker ayağa kalktığında tarayıcınızdan şuralara girerek sistemin çalıştığını test edebilirsiniz:

*   **pgAdmin (PostgreSQL Arayüzü):** `http://localhost:5050`
    *   *Giriş:* admin@admin.com / admin
    *   *(İçeri girdikten sonra "Add Server" deyip Host kısmına `postgres`, kullanıcı adına `ai_user`, şifreye `ai_password_123` yazarak veritabanına bağlanabilirsiniz).*
*   **Neo4j (Sosyal Ağ Görsel Arayüzü):** `http://localhost:7474`
    *   *Giriş:* neo4j / ai_neo4j_password
*   **Qdrant (Vektör DB Dashboard'u):** `http://localhost:6333/dashboard`
    *   *Giriş:* (Şifresiz, direkt açılır)
*   **Redis ve PostgreSQL (Portlar):** Sırasıyla `6379` ve `5432` portlarından arka planda Python ve NestJS'i bekliyorlar.

---

### Ollama Notu (Docker Dışı):
Bu esnada arka planda veya ayrı bir terminalde Ollama'yı bilgisayarınıza kurup şu komutlarla modelleri indirerek hazır edebilirsiniz:
*   `ollama run gemma3:4b` (Metin analizi ve NLP işlemleri için)
*   `ollama pull embeddinggemma` (Vektör oluşturma işlemi için harika ve hızlı bir model)

Bu adımları tamamlayıp veritabanlarını ayağa kaldırdığınızda bana **"Docker ayağa kalktı, FAZ 2'ye (Python & Conda) geçelim"** diyebilirsiniz. İşin "Zeka" kısmını kodlamaya başlayacağız!