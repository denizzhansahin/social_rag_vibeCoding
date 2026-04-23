# 🧬 Vizyon Analitik: Kullanıcı ve Yönetici Paneli UI/UX Standartları

Bu belge, sistemi geliştirecek tasarımcı ve Frontend yazılımcıları için iki farklı dünyanın çarpışmasını açıklar: **Gençlere hitap eden gamified (oyunlaştırılmış) akışkan bir Sosyal Algı Motoru** ile **Yöneticilere hitap eden siber/istihbarat (Palantir) analitik beyni.**
// Copyright (c) 2026 Denizhan Şahin. All Rights Reserved. See LICENSE file for details.
---

## BÖLÜM 1: KULLANICI ARAYÜZÜ (GENÇ_VİZYON)

> **Ana Felsefe:** Hiçbir kullanıcı teste tabi tutulduğunu veya analiz edildiğini hissetmemeli. Ekranda geçirdiği her süre TikTok/Twitter(X) rahatlığında ve oyun hissi vermeli.

### 1. Renk ve Tipografi
*   **Theme:** Şık Dark Mode (Gece Modu) veya Vibrant Light Mode. Dark Mode ana hedef kitlemiz için caziptir.
*   **Ana Renk Uzayı:** Deep Indigo (`#1e1b4b`), Neon Mint (`#10b981`) ve Coral Red (`#ef4444` - kısıtlı odak kullanım).
*   **Tipografi:** Modern, okunaklı Sans-Serif fontlar (Örn: *Inter, Roboto, Urbanist* veya *Outfit*). Metinler sıkıcı uzunlukta olmamalı.

### 2. Mimari: "The Feed" (Akış)
Kullanıcı bir ankete veya foruma girmez, bir **Akışa (Feed)** düşer.
*   Feed, farklı renklere sahip oyunlaştırılmış objelerden (`Social Objects`) oluşur. (Mini-slider, Emoji-rating, Swipable Cards).
*   **Sonsuz Kaydırma (Infinite Scroll):** Gittikçe yüklenmeli (`Skeleton Loaders` kullanımı kritik). Hızlı kaydırma yapan kullanıcının hızı Telemetriye gönderilmeli.
*   **Haptics (Titreşim/Animasyon):** Bir butona (Örn. Beğeni veya Seçenek) basıldığında arayüz haptik feedback (uygulama ise) ve parçacık animasyonu (`Confetti` veya `Ripple`) fırlatmalıdır.

### 3. Davranışsal Takip (Görünmez Kancalar)
*   **Sildirme/Tuşlama (Backspace):** Text inputlara özel bir JS bind (EventListener) yazılmalı. Her silme tuşuna basışı `useState` içinde tutulmalı ve API'ye basılmalı.
*   **Kararsızlık Süresi:** Eğer ekranda çoktan seçmeli bir soru var, kullanıcı fareyi 2 şık arasında gezdirip 5 saniye sonra cevap verdiyse "Hesitation" event'i tetiklenmelidir.

---

## BÖLÜM 2: YÖNETİCİ & İSTİHBARAT PANELİ (PALANTIR_GOTHAM)

> **Ana Felsefe:** Yönetici ekrana baktığında devasa bir sistemin nabzını tutan bir "Göz" (Omniscient) gibi hissetmelidir. Standart sıkıcı Bootstrap admin panellerinin ötesine geçilmeli.

### 1. Tasarım Dili (Siber-Analitik)
*   **Theme:** Sadece Dark Mode. Arka plan `#0d1117` veya `#010409` (GitHub Dark Dimmed ayarında) olmalı.
*   **Renkler:** Accent/Vurgu rengi olarak Elektrik Mavisi (`#00f2fe`) veya Fosfor Yeşili kullanılmalı. Veri noktaları parlak kontrastla ayrılmalı. 
*   **Tipografi:** UI elementlerinde Mono-space (Örn: *Fira Code, JetBrains Mono* veya *Space Grotesk*) ve Data-Table sistemleri.

### 2. Bileşenler (Components)
*   **The Blueprint Node Graph (Ağ Grafiği):** Neo4j içindeki verileri döküp, `[:SAT_NEXT_TO]`, `[:CONFLICT_RISK_WITH]` gibi graf ağlarını görselleştirmek zorunludur. Bunun için `D3.js`, `React Flow` veya `Vis.js` kütüphaneleri idealdir.
*   **Heatmaps (Sıcaklık Haritaları):** Spatial Loglar (Yoklama/Etkinliğe katılım) için mekansal zaman haritaları çizilmeli. (Etkinliğe geç kalan erkekler kırmızı bölge vs).
*   **Palantir AI Command Terminal (Chat Arayüzü):** Panelin en altında, MacOS 'Spotlight' veya ChatGPT tarzında çalışan bir Chat / Command input barı olmalıdır.

### 3. Palantir Chat Arayüz Sistemi
Yönetici, sistemden saf veri yerine "hikaye ve çıkarım" (RAG) istemelidir. 
*   **Soru:** *"Bugün yapılan liderlik anketinde neden kızlar sessiz kaldı?"*
*   **Sistem Arkası İşleyiş:** AI Chat Agent -> Qdrant'tan anket yorumlarını tarar -> Neo4j'ten ilişkileri okur -> Ollama ile metne döker.
*   **UI Tepkisi:** Yöneticinin ekranında bir konsol harfi daktilo atar gibi (Typewriter effect) cevap dökülür; "*AI Analizini tamamladı: Kızların %70'i anket süresince çok fazla backspace tuşu kullanmış... İlişki ağına bakıldığında...*"

### 4. İstihbarat Detay Kartı (Dossier Mode)
Bir kullanıcının (Öğrencinin) profiline tıklandığında "Profili Dezenle" sayfası DEĞİL, **"Karakter Dosyası (Dossier)"** açılır.
*   Özet Yapay Zeka Teşhisi (Tags: `[Analitik]`, `[Stresli]`, `[Dürtüsel]`).
*   Potansiyel Mentor ve Muhtemel Çatışma Yaşayacağı kişiler listesi.
*   Sistem boyunca yaptığı tüm etkileşimlerin Heatmap (Timeline) özeti.
