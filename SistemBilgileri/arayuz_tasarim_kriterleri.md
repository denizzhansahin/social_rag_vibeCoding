# 🚀 Vizyon Analitik (Genç_Vizyon) - Arayüz Tasarım & Telemetri Kılavuzu

Bu doküman, Vizyon Analitik platformunun önyüz (Front-end) tasarımını yaparken dikkat etmeniz gereken mimari, etkileşim (UI/UX) ve veri toplama (Telemetri) gereksinimlerini çok detaylı bir şekilde açıklar. Sistem, anket izlenimi vermeyen bir **X (eski adıyla Twitter) vari sosyal medya feed'i** vizyonuyla inşa edilmiştir.

> **Ana Kural:** Kullanıcı, ondan psikolojik bir test veya telemetrik bir veri aldığınızı hissetmemelidir. Her şey akışın (Feed'in) sıradan bir içerik objesi (Social Object) gibi görünmelidir.

---

## 1. Mimari Layout (Görünüm Beklentisi)

Arayüz "Akışta Kalma (Flow State)" odaklı olmalıdır:

*   **Ana Akış (Home Feed):** Ekranın merkezinde yukarıdan aşağıya akan sosyal objeler (Sorular, Slider anketler, duyurular). Sonsuz kaydırma (Infinite Scroll) desteklenmelidir.
*   **Aksiyon Odaklı Kartlar:** Gelen bir anket (mesela; *"Şu an ortamdaki gürültü çalışma verimini ne kadar etkiliyor?"*) akışta güzel bir kartvizit (Border-radius: 12px, soft gölgeler) olarak çıkmalı.
*   **Kimlik ve Gamification (Sol/Sağ Panel):** (Masaüstü için) Kullanıcının o gün kazandığı puanlar, etkinliklere zamanında girme serisi (Streak) gibi teşvik edici unsurlar küçük widgetlar olarak sunulabilir.

---

## 2. Telemetri Kancaları (Hook'lar) Beklentisi

Arka planda (Python AI Worker) kişinin "Dürtüsel (Impulsive)" mi yoksa "Analitik (Analytical)" mi karar verdiğini ayıklayabilmesi için arayüzünüzün yakalaması zorunlu metrikler vardır.

Siz bu verileri yakaladığınızda arka plandaki `CreateTelemetryStream` veya `CreateContentEngagement` GraphQL endpoint'lerine yollayacaksınız.

### A. Karar Süresi ve Tereddüt Ölçümü
Eğer kullanıcı bir seçenek işaretleyecekse, arayüzünüz şu verileri saniye/ms cinsinden loglamalıdır:
1.  **Görülme Anı (`seen_at`):** Kart kullanıcının viewport'una (ekrana) girdiği an. (React'ta `IntersectionObserver` veya `useInView` hook'u ile).
2.  **Etkileşim Anı (`interacted_at`):** Seçeneğe tıklandığı an.
3.  **Fikir Değiştirme (`changed_mind_count`):** Eğer çoktan seçmeli bir falansa, kullanıcı A'yı seçip sonra B'yi seçti mi? Kaç kere tıklamasını değiştirdi?
4.  **Hover Süresi (`hover_duration_ms`):** (Sadece Web'de) Kullanıcı butonlar üzerinde fareyi ne kadar süre karar vermeden tuttu?

### B. Yazım Dinamikleri (Typing Dynamics)
Eğer Serbest Metin (Free Text) alanlı bir "Bize bugün neler hissettiğini yaz" kartı varsa:
1.  **Toplam Tuş Vuruşu (`total_keystrokes`):** Klavyede basılan tüm karakter sayısı.
2.  **Silme/Düzeltme (`backspace_count`):** Backspace veya Delete tuşuna kaç kere basıldı? *(Çok yüksekse = Kişiyi özgüvensiz, stresli veya aşırı takıntılı (perfectionist) olarak etiketleyeceğiz).*
3.  **Bekleme/Tereddüt (`hesitation_pauses_gt_2s`):** Klavyeye yazarken 2 saniyeden uzun süre duraksadı ve bir şey yazmadıysa bunu +1 olarak say.
4.  **Toplam Yazım Süresi (`total_typing_time_ms`):** İlk tuşla son Submit butonu arası geçen süre.

### C. Pasif Tüketim (Scroll Analytics)
Kullanıcı cevap vermiyorsa bile davranış sergiliyor demektir:
1.  **Ekranı Hızlı Kaydırma (`scroll_speed_px_sec`):** Çok hızlı (Örn: 3000px/sn) kaydırıp gönderileri geçiyorsa bunu yakalamalıyız (Sistem bunu "ilgisiz", "odaksız" veya "Tüketim odaklı" etiketler).
2.  **Ignored (Görmezden Gelme):** Viewport'ta bir anket %80 oranında en az 2 saniye görünür kalıp, sonra hiçbir etkileşim almadan yukarı veya aşağı kaybolursa buna `ignored` (Pas geçildi) aksiyonu diyoruz.

---

## 3. Sosyal Obje (Kart) Şablonları

PostgreSQL'deki `social_objects` tablosunda oluşturulan görevleri Feed'e dökerken kart tiplerine dikkat etmelisiniz:

### `slider_survey` Kartı
*   **Görünüm:** Üstünde bir soru, altında iPhone "parlaklık" ayarı gibi yumuşak ve akışkan bir kaydırıcı bar (Range Input).
*   **Telemetri Spesifiği:** Başlangıç değerinde bırakıp mı kaydetti, yoksa tam ortalarda bir nokta bulup ince ayar mı yaptı? (İnce ayar = Detaycı).

### `multiple_choice` Kartı
*   **Görünüm:** X anketleri gibi şık kolonlar veya yan yana kare "Tile" tarzı butonlar.
*   **Telemetri Spesifiği:** Fikir değiştirme tıklamasını izlemek zorunludur.

### `mood_checkin` Kartı
*   **Görünüm:** Basit ve sevimli 3 ila 5 adet Emoji. Hızlı cevap vermeye çok müsait tasarlanmalı.

---

## 4. GraphQL Veri Gönderim Akışı

Geliştireceğiniz React/Vite arayüzü ile NestJS'e verileri tek potada aşağıdaki gibi aktaracaksınız. 

**Örnek Mutasyon: Bir anketi (Engagement) cevaplama gönderimi**
```graphql
mutation {
  createEngagement(input: {
    userId: "KULLANICI_UUID",
    objectId: "ANKET_UUID",
    nature: "explicit",          # Doğrudan seçim mi, pasif görmezden gelme mi (implicit)?
    action: "answered",         # answered, liked, ignored, abandoned...
    seenAt: "2026-04-05T10:00:00Z",
    interactedAt: "2026-04-05T10:00:03Z",
    responseData: {
      "selected_value": "Python"
    },
    behavioralMetrics: {
      "decision_time_ms": 3000,
      "changed_mind_count": 1,
      "hover_duration_ms": 500
    }
  }) {
    id
  }
}
```

**Örnek Mutasyon: Sayfa genelinde yakalanan telemetri gönderimi**
Bunu her dakika başı veya önemli ekran değişimlerinde batch (toplu) atabilirsiniz.
```graphql
mutation {
  createTelemetryStream(input: {
    userId: "KULLANICI_UUID",
    sessionId: "GEÇERLİ_OTURUM_UUID",
    eventType: "typing_dynamics",
    targetPath: "/home_feed/feedback_modal_1",
    metrics: {
      "backspace_count": 12,
      "hesitation_pauses_gt_2s": 2,
      "wpm_estimated": 45
    }
  }) {
    id
  }
}
```

---

## 5. UI/UX Tavsiyeler & İlham
Sizin arayüzünüzü çok havalı yapacak 3 trick:
*   **Micro-İnteraksiyonlar:** Bir butona tıklandığında hemen sonuçlanmasın, küçük bir parıltı (shimmer effect) ve konfeti/check ikonu geçişleri olsun.
*   **Gece Modu (Dark Mode) Gücü:** Koyu lacivert / Koyu indigo (Örn: `#0d1117`) arayüzleri gençler arasında her zaman daha profesyonel ve gamified algılanır.
*   **İzinsiz Kesiciler Yok:** Asla ekrana Pop-up olarak anket fırlatmayın. Ekranda her şey feed içinde organik bir gönderi gibi akmalıdır.

> *Backend Notu: Siz bu tasarımlarda telemetri verilerini GraphQL ile fırlattığınız an, Python AI-Worker gelen "backspace, decision\_time" değerlerini kapıp ilgili kişiye anında "Detaycı", "Çekingen", "Odak Sorunu Yaşıyor" gibi tagleri Neo4j ve Qdrant üzerinden basıyor olacak!*
