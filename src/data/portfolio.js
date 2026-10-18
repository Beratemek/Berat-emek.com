import { SITE } from './site.js'

// Supabase'den veri gelmezse (ilk kurulum, bağlantı hatası) gösterilecek yedek içerik.
export const content = {
  about: {
    kicker: 'Full-Stack & AI Developer',
    body: "Yapay zekayı uçtan uca ürünlere dönüştüren bir geliştiriciyim. Büyük dil modeli entegrasyonlarından çok ajanlı otomasyonlara, ölçeklenebilir backend mimarilerinden kullanıcı arayüzlerine kadar ürünün tamamında çalışıyorum. VizioWise AI'da yapay zeka ürün akışları geliştirdim; TÜBİTAK 2209-A kapsamında derin öğrenme araştırması yürüttüm.",
    highlights: [
      'LLM entegrasyonları ve çok ajanlı sistemler',
      'Uçtan uca ürün geliştirme',
      'Derin öğrenme araştırması — TÜBİTAK 2209-A',
      'Bilgisayar Mühendisliği — Erciyes Üniversitesi',
    ],
  },
  projects: {
    items: [
      {
        name: 'TÜBİTAK 2209-A',
        desc: 'Derin öğrenme tabanlı akciğer sesi sınıflandırma projesi. CNN mimarileriyle solunum anomalilerinin tespiti.',
        tags: ['Python', 'Deep Learning', 'Signal Processing'],
      },
      {
        name: "Cucu's Cafe",
        desc: 'Uçtan uca geliştirdiğim ticari platform: ürün yönetimi, sipariş akışı ve yönetim paneli.',
        tags: ['E-ticaret', 'Full-Stack', 'Yönetim Paneli'],
      },
      {
        name: 'VizioWise AI',
        desc: 'Yapay zeka ürün akışları ve modern web mimarileri üzerine full-stack geliştirici olarak çalıştım.',
        tags: ['AI Ürün', 'LLM', 'Full-Stack'],
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
