# berat-emek.com

Kişisel site (Full-Stack & AI Developer konumlandırması) + yapay zeka haber botu. İçerik ve kod yorumları Türkçe.

## Yapı
- `src/` — React 18 + Vite SPA, React Router; veri Supabase'den (`src/lib/supabase.js`)
  - `pages/` HomePage (/), BlogPage (/blog), PostPage (/blog/:slug, /project/:slug), NotFound
  - `site/` Layout (dil menüsü, tema düğmesi), NeuralHero (kütüphanesiz canvas 3D ağ, temaya duyarlı), PostList, Reveal, GenCover
  - `i18n/` 10 dilli arayüz metinleri (`translations.js`) + `I18nProvider`; yeni metin eklerken 10 dilin hepsine ekle
  - Tema: `index.html`deki betik `data-theme`i (light/dark) çizimden önce ayarlar; renk tokenları `index.css` `:root` ve `[data-theme=dark]`
  - `admin/` /admin paneli (Tiptap editör); `admin/pages/TodayPage.jsx` botun günlük özeti
  - `data/site.js` ad/adres · `data/portfolio.js` Supabase boşsa yedek içerik
  - `index.css` site stilleri (sıcak krem/espresso paleti, sade Inter tipografi) · admin stilleri `admin/admin.css`
- `bot/` — bağımlılıksız Node betiği; `.github/workflows/haber-botu.yml` her gün 05:00 UTC çalıştırır. Model OpenRouter üzerinden. Ayrıntı: `bot/README.md`
- `api/post.js` — Vercel fonksiyonu; `vercel.json`'daki user-agent kuralıyla sadece sosyal medya botlarına yazıya özel meta etiketleri döner
- `supabase/*.sql` — şema; tablolar: posts, profile, contact_links, daily_briefs

## Komutlar
- `npm run dev` — yerel geliştirme (.env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)
- `npm run build` — sitemap üretir + vite build
- `cd bot && node run.js --collect-only` — sadece haber toplama (model çağrısı yok) · `--dry` tam çalışma, Supabase'e yazmaz

## Kurallar
- Bot yalnızca Berat içindir (admin → Bugün); ziyaretçiler sadece Berat'ın yayınladığı yazıları görür. Bot kendisi paylaşım yapmaz.
- Bot odağı (`bot/config.js` → FOCUS): geliştiricilerin ilgisini çeken araç/özellik/açık kaynak/model haberleri; hukuk, regülasyon, yatırım, magazin elenir.
- Bot yalnızca doğrulanmış bilgiyle yazar; tek kaynaklı haber aday olamaz (`bot/agents.js` → `scoreClusters`).
- Supabase service role anahtarı sadece GitHub Secrets'ta; frontend yalnızca anon key kullanır.
- Ana sayfada teknoloji listesi yerine "Full-Stack & AI Developer" kimliği öne çıkar.
