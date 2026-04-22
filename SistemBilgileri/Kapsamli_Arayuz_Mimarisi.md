# 🚀 V-RAG (Genç_Vizyon) AI Studio & LLM Ön-Yüz Geliştirme Kılavuzu

Bu belge; yapay zeka (Google AI Studio, Claude vb.) asistanların sistemi sıfırdan **React/** kullanarak hatasız kodlayabilmesi için hazırlanmış "Component Tree", "JSON Şema" ve "Prompt" dokümanıdır.

**SİSTEMİN AMACI:** V-RAG, gençlere anket dolduruluyormuş hissi vermeyen, X (Twitter) vari akıcı bir sosyal medya platformudur. Arka planda telemetri kullanılarak mikro-davranışları (backspace, karar süresi) ölçer ve bir Neo4j Graph Network paneli üzerinden Gelişmiş Palantir İstihbaratı sağlar.

---

## 1. COMPONENT AĞACI (ROUTING & TREE)

Sistem 3 Ana Dünyaya Ayrılır: **A. Authentication (Giriş) // B. Sosyal Feed (User) // C. Yönetici Dashboard (Admin)**

```text
src/
 ├─ components/
 │   ├─ Auth/
 │   │   └─ LoginForm.jsx (E-posta, Şifre, Animasyonlu Geçiş)
 │   ├─ Feed/
 │   │   ├─ SocialPostCard.jsx (Feed içindeki standart gönderi kartı)
 │   │   ├─ SliderSurveyComponent.jsx (Sürüklemeli Anket UI)
 │   │   ├─ EngagementButtons.jsx (Yorum, Beğeni, Pas Geç Butonları)
 │   ├─ Shared/
 │   │   └─ QRScannerWrapper.jsx (Kamerayı kullanarak Yoklama alan modül)
 ├─ hooks/
 │   └─ useTelemetryTracker.js (Görünmez veri toplayıcısı *Kritik*)
 ├─ pages/
 │   ├─ login.jsx
 │   ├─ feed/HomeFeed.jsx
 │   └─ admin/
 │       ├─ PalantirChat.jsx
 │       └─ Neo4jNetworkMap.jsx
```

---

## 2. VERİ & JSON ŞEMALARI (BACKEND'DEN DÖNECEK MOCK DATALAR)

Yapay zekaya kodlama yaptırırken aşağıdaki örnek verileri (Mock Data) kendi bileşenlerinin State'lerine kurmasını isteyin.

### ŞEMA 1: Auth (Giriş) ve Kimlik `loginUser`
```json
{
  "token": "jwt_header.payload.signature",
  "user": {
    "id": "2222-aaaa",
    "email": "denizhan@vizyon.com",
    "role": "participant", 
    "cognitive_profile": { "name": "Denizhan", "age": 18, "trait": "Lider" }
  }
}
```

### ŞEMA 2: Social Object (Sosyal Feed'e Düşen Gönderi) `getHomeFeed`
```json
[
  {
    "id": "obj-9991",
    "objectType": "slider_survey",
    "createdBy": "admin-1111",
    "createdAt": "2026-04-05T10:00:00Z",
    "uiPayload": {
      "question": "Atölyeye girmeden önce enerjin nasıl?",
      "sliderMin": 0,
      "sliderMax": 100,
      "labels": ["Çok Düşük", "Harika!"],
      "media": "https://s3.vizyon.com/images/enerji_arkaplan.jpg"
    }
  },
  {
    "id": "obj-9992",
    "objectType": "text_post",
    "uiPayload": {
      "text": "Bugün Boğaz turu çok güzeldi! 📸",
      "author": "Ayşe Y.",
      "allowComments": true
    }
  }
]
```

### ŞEMA 3: İstihbarat Ağı `getNetworkGraph` (Neo4j RAG)
```json
{
  "nodes": [
    { "id": "1", "name": "Ali", "label": "Stresli" },
    { "id": "2", "name": "Can", "label": "Hiperaktif" },
    { "id": "3", "name": "Ayşe", "label": "Köprü Kurucu (Bridge)" }
  ],
  "links": [
    { "source": "1", "target": "2", "label": "CONFLICT_RISK_WITH" },
    { "source": "3", "target": "1", "label": "ATTEMPTED_TO_HELP" }
  ]
}
```

---

## 3. SAYFALARIN İŞLEV & VİZYON DETAYLARI

### MODÜL A: Giriş Ekranı (Login Page)
*   **Açıklama:** Sistemin giriş noktası. E-Posta ve Şifre alanı bulunur. UI karanlık / uzay konseptinde olmalı (Dark Indigo `#0d1117`).
*   **Özellikler:** Jwt Token tabanlı giriş. Backend'den dönen `role: 'admin'` ise kullanıcıyı `/admin` rotasına, `participant` ise `/feed` rotasına atar.

### MODÜL B: Sosyal Kullanıcı Ağı (User Home Feed)
*   **Amaç:** Yukarıdan aşağı sınırsız akan gönderiler bütünü.
*   **Gereksinimler:** 
    1.  **Etkileşim (Engagement):** Her postun altında Beğeni, Katılıyorum/Katılmıyorum, ve Yorum ikonu olur. Tıklandığında GraphQL `submitEngagement` Mutasyonu ateşlenir.
    2.  **Telemetry Hook'u:** Yorum yaparken (kullanıcı textArea içerisindeyken) arka planda dinleyici çalışır. `onKeyDown={handleKeyDown}` fonksiyonu kullanıcının sildiği/düzelttiği karakter (Backspace) sayısını toplar ve submit edildiğinde backend'e gizlice ekler. (JSON Şemasına `backspace_count` olarak yollanır).
    3.  **QR Kod Yoklaması:** Üst menüde devasa bir "Karekod Oku" butonu. Tıklandığında telefonun kamerasını açar (`react-qr-reader`), okutulan veriyi API `createSpatialLog` ucu ile NestJS'e ulaştırır.

### MODÜL C: Palantir Yönetici Paneli (Admin Dashboard)
*   **Amaç:** Siber güvenlik / istihbarat ofisi tasarımı. Gelişmiş veri haritalama arayüzü.
*   **Gereksinimler:**
    1.  **Etkinlik / Gönderi Yaratma (Post Builder):** Adminin yeni bir Anket veya Gönderi yaratıp sisteme basmasını sağlar. (Ekranda Radio Button ile 'Text', 'Slider', 'Image' seçimi yaptırılır ve hedefleme, örn. "Sadece Kızlar", "Sadece 1. Salon" ruleset olarak ayarlanır).
    2.  **Yapay Zeka Chat (V-RAG Terminal):** `PalantirChat.jsx`. Sistemle konuşma alanı. Prompt gönderimi yapılır, cevaplar yeşil daktilo (Typewriter) efektiyle düşer.
    3.  **Neo4j Risk Radarı:** Sayfanın yarısını kaplayan siyah bir tuval. `react-force-graph-2d` modülüne Backend'den gelen `getNetworkGraph` JSON'u verilir. Düğümler (Öğrenciler) ekranda stres/etkileşim durumlarına göre gruplaşır.

---

## 4. YAPAY ZEKAYA (LLM) YAPILACAK İLK GİRİŞ PROMPTU (KOPYALA & YAPIŞTIR)

*(Bu metni kopyalayıp doğrudan Google AI Studio veya kullanacağınız araca yapıştırın)*

> "Seninle birlikte **V-RAG (Vizyon Analitik)** adında React ve GraphQL tabanlı büyük bir sosyal ağ ve AI İstihbarat platformunu sıfırdan inşa edeceğiz. Bu sayfa klasik form doldurma değil, kullanıcılara gizli telemetri uygulayan oyunlaştırılmış (Gamification) bir X (Twitter) benzeri uygulamadır. Ana renklerimiz Dark Indigo (#0d1117), Neon Yeşil (#238636) ve Buz Mavisidir (#58a6ff).  
> 
> Lütfen önce "Login (Eposta + Şifre)" ekranını ve başarılı girişte yönlenen "Sonsuz akışlı HomeFeed" bileşenini kodla. HomeFeed içerisine bir adet "Slider Anket" ve bir adet "Açık Uçlu Yorum Gönderisi" bileşeni (Mock olarak) yerleştir. Yorum yapma modülüne sessiz çalışan bir `useTelemetryTracker` Hook'u takarak klavye vuruşlarını hesaplat. Kodları modüler, React standartlarında ve TailwindCSS veya inline-style kullanarak üret."
