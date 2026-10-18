# Haber botu (sadece senin için)

Her sabah 08:00'de (Türkiye) arka planda çalışır ve admin panelindeki **Bugün** sayfasına özel bir özet bırakır. Ziyaretçiler botu görmez; sitede sadece senin yayınladığın yazılar görünür.

**Odak:** geliştiricilerin ilgisini çeken, etrafı kasıp kavuran konular. Bunlar yeni araçlar, MCP sunucuları, Claude Code/Codex özellikleri, hızla yayılan açık kaynak projeler ve önemli modellerdir. Mahkeme, regülasyon, yatırım ve magazin haberleri elenir. Odak tanımı `config.js` → `FOCUS` içinde; istediğin gibi değiştirebilirsin.

1. **Topla:** Claude Code ve Codex sürüm notları, şirket blogları, teknoloji medyası, Hacker News, Hugging Face trendleri, **GitHub'da hızla yükselen projeler**, r/mcp, r/ClaudeAI, r/LocalLLaMA (isteğe bağlı YouTube). Bu adımda yapay zeka çalışmaz, ücretsizdir.
2. **Kümele ve puanla:** Aynı olay ya da projeden bahseden başlıkları birleştirir. Her konuya 0-3 arası "odağa uygunluk" puanı verir; 0 alan konular elenir. Asıl puan kodda hesaplanır: kaç kaynakta geçtiği, resmi kaynak olup olmadığı, HN puanı, GitHub yıldızı ve izlenme sayısı.
3. **Doğrula:** Kaynak metni okur ve sadece açıkça yazanı kabul eder. Kurulum adımlarını da kaynaktan birebir alır.
4. **Yaz:** Kısa bir LinkedIn gönderisi ve bir blog taslağı hazırlar. Kaynakta kurulum adımları varsa "Nasıl denersin?" bölümü de ekler.
5. **Kontrol et:** Taslakta uydurma, abartı ya da yaşanmamış bir deneyim var mı diye denetler.
6. **Karar ver:** "Bugün paylaş / paylaşma" der.
7. **Fikir:** Paylaşılacak güçlü bir haber yoksa haber yerine 3 bilgilendirici yazı fikri önerir (ör. "Claude Code'da skill nasıl yazılır?").

Bot **hiçbir zaman kendisi paylaşım yapmaz**. "Paylaş" derse blog taslağı admin → Blog'a *Taslak* olarak düşer. Sen kendi ağzınla düzenler, yayınlar ve LinkedIn metnini Bugün sayfasından kopyalarsın.

## Kurulum (bir kez)

1. **Supabase:** SQL Editor'ü aç ve `supabase/news-bot.sql` dosyasını çalıştır.
2. **OpenRouter:** [openrouter.ai](https://openrouter.ai)'da hesap aç, *Keys* sayfasından yeni bir anahtar oluştur. *Credits*'e küçük bir bakiye yükle; istersen anahtara harcama limiti koy.
3. **GitHub:** repo → *Settings → Secrets and variables → Actions → New repository secret*:
   - `OPENROUTER_API_KEY`: OpenRouter anahtarı
   - `SUPABASE_URL`: Vercel'deki `VITE_SUPABASE_URL` ile aynı
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase → *Project Settings → API Keys* → service_role / secret anahtar. **Gizli tut, sitede asla kullanma.**
   - (İsteğe bağlı) `YOUTUBE_API_KEY`: Google Cloud'da ücretsiz YouTube Data API anahtarı. Eklersen son 3 günün en çok izlenen yapay zeka videoları da taranır.
   - (İsteğe bağlı, *Variables* sekmesi) `BOT_MODEL`, `BOT_WRITER_MODEL`
4. **Dene:** *Actions → Haber botu → Run workflow*'u aç ve "Deneme modu"nu işaretle. Kayıtta (log) taslağı görürsün. Beğenirsen işaretsiz çalıştır; sonuç `/admin/today`'de çıkar.

> Zamanlanmış çalışma sadece `main` dalında aktif olur. GitHub, 60 gün commit almayan public repolarda zamanlanmış iş akışlarını durdurur. Böyle olursa e-posta gelir; *Actions* sayfasından tek tıkla tekrar açarsın.

## Yerelde çalıştırma

```bash
cd bot
cp .env.example .env        # anahtarları doldur
node run.js --collect-only  # sadece haberleri listeler, ücretsiz
node run.js --dry           # tam çalışma, Supabase'e yazmaz → out/GÜN.json
node run.js                 # tam çalışma, Supabase'e yazar
```

## Maliyet

Günde 5-8 model çağrısı, toplam yaklaşık 40-60 bin token. `deepseek/deepseek-v4.1-flash` ile (Ekim 2026 OpenRouter fiyatı: girdi $0.065, çıktı $0.144 / milyon token) günde yarım sentin altında tutar. Her çalışmanın gerçek maliyeti Bugün sayfasının en altında yazar.

## Özelleştirme

- Odak konuları, kaynaklar, model, üslup: `config.js`
- Ajanların talimatları: `agents.js`
- Puanlama formülü: `agents.js` → `scoreClusters`
