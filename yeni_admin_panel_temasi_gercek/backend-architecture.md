# Palantir Gotham Tarzı İstihbarat Sistemi - Mimari Tasarım

Bu proje, sosyal medya görünümlü ancak arka planda detaylı bir istihbarat ve analiz sistemi (Palantir Gotham benzeri) olarak tasarlanmıştır. İstenilen teknoloji yığını (Python, NestJS, Neo4j) ile bu mimarinin nasıl kurgulandığı aşağıda açıklanmıştır.

## Teknoloji Yığını (Tech Stack)

1. **Frontend (İstemci):** React, Vite, Tailwind CSS, Recharts, React-Force-Graph
2. **API Gateway & Core Backend:** NestJS (Node.js)
3. **AI & Veri İşleme Servisi:** Python (FastAPI / Flask)
4. **Graf Veritabanı:** Neo4j

## Mimari Bileşenler

### 1. Neo4j (Graf Veritabanı)
Palantir tarzı sistemlerin kalbi ilişkisel ağlardır. Neo4j, kullanıcılar, gruplar, etkinlikler ve bu varlıklar arasındaki karmaşık ilişkileri (kim kiminle aynı grupta, kim hangi etkinliğe katıldı, kim kime yorum yaptı) tutmak için kullanılır.
- **Düğümler (Nodes):** `User`, `Group`, `Event`, `Comment`, `Survey`
- **İlişkiler (Relationships):** `BELONGS_TO`, `ATTENDED`, `INTERACTED_WITH`, `MENTORED_BY`

### 2. NestJS (Core API Gateway)
NestJS, frontend'in iletişim kurduğu ana sunucudur. Güvenlik, yetkilendirme (Auth), CRUD işlemleri ve WebSocket üzerinden gerçek zamanlı veri akışını yönetir.
- **Görevleri:**
  - Frontend'den gelen REST ve GraphQL isteklerini karşılamak.
  - Neo4j veritabanına bağlanıp temel verileri (Kullanıcı profilleri, etkinlik listeleri) çekmek.
  - Gerçek zamanlı durum güncellemeleri (online/offline) için WebSocket (Socket.io) sunmak.
  - Karmaşık analiz ve yapay zeka isteklerini Python servisine yönlendirmek.

### 3. Python (AI & Data Processing Service)
Python, veri bilimi ve yapay zeka entegrasyonları için en uygun dildir. Bu servis, NestJS'ten gelen verileri işler ve analiz sonuçları üretir.
- **Görevleri:**
  - **Gemini AI Entegrasyonu:** Kullanıcı davranışlarını analiz edip "Riskli", "Lider" gibi etiketler üretmek.
  - **Ağ Analizi (Network Analysis):** Neo4j'den alınan graf verileri üzerinde algoritmalar (PageRank, Centrality) çalıştırarak kilit kişileri (Köprü Kurucu, Lider) tespit etmek.
  - **NLP (Doğal Dil İşleme):** Kullanıcıların yorumlarını ve anket cevaplarını analiz ederek duygu analizi (sentiment analysis) yapmak.

## Veri Akışı (Data Flow)

1. **Kullanıcı Etkileşimi:** Frontend'de bir admin, bir grubun detaylarına tıklar.
2. **API İsteği:** Frontend, NestJS'e `/api/groups/123/insights` isteği atar.
3. **Yönlendirme:** NestJS, bu isteğin karmaşık bir analiz gerektirdiğini anlar ve Python servisine `/analyze/group/123` isteği gönderir.
4. **Veri Çekme:** Python servisi, Neo4j veritabanına bağlanıp o gruptaki tüm kullanıcıların etkileşim grafiğini çeker.
5. **Yapay Zeka Analizi:** Python, Gemini API'sini kullanarak bu etkileşimleri yorumlar ve "Grup içi iletişimde kopukluklar var" gibi bir içgörü (insight) üretir.
6. **Yanıt:** Python -> NestJS -> Frontend zinciriyle veri admin paneline ulaşır ve ekranda gösterilir.

## Kurulum (Docker Compose)

Proje kök dizinindeki `docker-compose.yml` dosyası ile tüm backend altyapısı tek komutla ayağa kaldırılabilir:

```bash
docker-compose up -d
```

Bu komut; Neo4j veritabanını, NestJS API sunucusunu ve Python Yapay Zeka servisini birbiriyle konuşacak şekilde başlatır.
