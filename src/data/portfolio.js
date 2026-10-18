import { SITE } from './site.js'

// Supabase'den veri gelmezse (ilk kurulum, bağlantı hatası) gösterilecek yedek içerik.
export const content = {
  about: {
    kicker: 'Full-Stack & AI Developer',
    body: "Yapay zekayı uçtan uca ürünlere dönüştüren bir geliştiriciyim. Büyük dil modeli entegrasyonlarından çok ajanlı otomasyonlara, ölçeklenebilir backend mimarilerinden kullanıcı arayüzlerine kadar ürünün tamamında çalışıyorum. VizioWise'da sanayi için kurumsal yapay zeka platformu Morf üzerinde çalışıyorum: viziowise.com'u ben geliştirdim; ürün geliştirmenin yanında reklamdan satışa ve müşteri görüşmelerine kadar bir girişimin ihtiyaç duyduğu her alanda yer alıyorum, reklam süreçlerinin tamamı benim sorumluluğumda. TÜBİTAK 2209-A kapsamında derin öğrenme araştırması yürüttüm; Trendyol Datathon ve bir uzay hackathonunda yarıştım.",
    highlights: [
      "LLM entegrasyonları ve çok ajanlı sistemler",
      "VizioWise — ürün, reklam ve satış",
      "Derin öğrenme araştırması — TÜBİTAK 2209-A",
      "Bilgisayar Mühendisliği — Erciyes Üniversitesi",
    ],
  },
  projects: {
    items: [
      {
        name: "Morf — sanayi için kurumsal yapay zeka",
        desc: "VizioWise'da üzerinde çalıştığım platform: ERP'den SCADA'ya tüm veriyi tek yapay zeka katmanında birleştiren soru-cevap, canlı panel ve otomasyon. viziowise.com'u ben geliştirdim.",
        tags: ["Kurumsal AI", "LLM", "Full-Stack"],
        url: "https://viziowise.com",
      },
      {
        name: "Trendyol E-Ticaret Datathon 2026",
        desc: "3,36 milyon arama-ürün çiftinde alaka tahmini: 0,903 macro-F1. En büyük kazanç (+0,06) model eğitmeden, karar eşiğini matematikle bulmaktan geldi.",
        tags: ["Python", "NLP", "Datathon"],
        url: "https://github.com/Beratemek/trendyol-datathon",
      },
      {
        name: "MetalsMarket MCP Sunucusu",
        desc: "Metal ve emtia fiyatlarını toplayıp Claude Desktop ve Cursor gibi MCP istemcilerine stdio ve Streamable HTTP üzerinden 3 araçla sunan, kendi sunucunda çalışan araç seti.",
        tags: ["MCP", "Python", "LLM Araçları"],
        url: "https://github.com/Beratemek/metalsmarket-bot",
      },
      {
        name: "Sektörel Haber & Agent Platformu",
        desc: "Firma bazlı, çok kiracılı haber takip platformu: kaynakları tarar, mükerrerleri eler, Claude ile kaynak önerir, arşivi MCP ile yapay zeka asistanlarına açar.",
        tags: ["Ajanlar", "MCP", "TypeScript"],
        url: "https://github.com/Beratemek/news-bot",
      },
      {
        name: "Yapay Zeka Destekli Eğitim Sistemi",
        desc: "Hackathon MVP: kazanımdan soruya, cevaptan puana ölçme-değerlendirmeyi yapay zekayla hızlandırır; nihai kararı her zaman eğitmene bırakır.",
        tags: ["Hackathon", "Next.js", "AI SDK"],
        url: "https://ai-egitim-sistemi.vercel.app",
      },
      {
        name: "MoonProject — TUA Astro Hackathonu",
        desc: "TUA Astro Hackathon'unda 48 saatte sıfırdan geliştirdiğimiz, Ay yüzeyinde otonom rover rotasını risk, enerji ve arazi zorluğuna göre A* ile optimize eden 3B simülasyon. 19 ekip arasında 6. olduk.",
        tags: ["Hackathon", "Three.js", "A*"],
        url: "https://github.com/FatihEmre44/MoonProject",
      },
      {
        name: "EmekShop — 3D mobilya e-ticaret",
        desc: "Mobilya için yapay zeka destekli 3D e-ticaret: tek bir 2D ürün fotoğrafından saniyeler içinde web'e uygun 3D model üretiyor, müşteriye artırılmış gerçeklikle \"Odamda Gör\" deneyimi sunuyor.",
        tags: ["3D", "Artırılmış Gerçeklik", "Yapay Zeka"],
        url: "https://github.com/Beratemek/emek-shop",
      },
      {
        name: "Cucu's Coffee & Cake",
        desc: "Bir kafe için uçtan uca web uygulaması: ürün ve kampanya yönetimli admin paneli, Fırsat Çarkı. İşletmenin talebiyle yayından kaldırıldı; kodlar GitHub'da.",
        tags: ["E-ticaret", "Admin Paneli", "MongoDB"],
        url: "https://github.com/Beratemek/cucus-cafe-web-side",
      },
      {
        name: "The Vault — tanışma uygulaması",
        desc: "İlk projelerimden: Tinder tarzı bir tanışma uygulaması. Web arayüzü, mobil sürüm ve sunucu tek depoda.",
        tags: ["Mobil + Web", "React", "Node.js"],
        url: "https://beratemek.github.io/the-vault/",
      },
      {
        name: "TÜBİTAK 2209-A",
        desc: "Derin öğrenme tabanlı akciğer sesi sınıflandırma projesi. CNN mimarileriyle solunum anomalilerinin tespiti.",
        tags: ["Python", "Deep Learning", "Signal Processing"],
      },
    ],
  },
  contact: {
    links: [
      { label: 'E-posta', value: SITE.email, href: `mailto:${SITE.email}`, icon: 'mail' },
      { label: 'GitHub', value: SITE.github.replace('https://', ''), href: SITE.github, icon: 'github' },
      ...(SITE.linkedin
        ? [{ label: 'LinkedIn', value: SITE.linkedin.replace(/^https:\/\/(www\.)?/, ''), href: SITE.linkedin, icon: 'linkedin' }]
        : []),
    ],
  },
}
