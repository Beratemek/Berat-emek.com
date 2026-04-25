export const sections = [
  {
    id: 'about',
    label: 'HAKKIMDA',
    title: 'Hakkımda',
    islandPos: [-4.2, 0, -4.2],
    position: [-4.2, 4.8, -4.2],
    color: '#f9b572',
    accent: '#f59e42',
  },
  {
    id: 'projects',
    label: 'PROJELER',
    title: 'Projeler',
    islandPos: [4.2, 0, -4.2],
    position: [4.2, 4.8, -4.2],
    color: '#7dd3fc',
    accent: '#38bdf8',
  },
  {
    id: 'blog',
    label: 'BLOG',
    title: 'Blog',
    islandPos: [-4.2, 0, 4.2],
    position: [-4.2, 4.8, 4.2],
    color: '#c4b5fd',
    accent: '#a78bfa',
  },
  {
    id: 'contact',
    label: 'ILETISIM',
    title: 'İletişim',
    islandPos: [4.2, 0, 4.2],
    position: [4.2, 4.8, 4.2],
    color: '#f9a8d4',
    accent: '#f472b6',
  },
]

export const content = {
  about: {
    title: 'Hakkımda',
    kicker: 'Full-Stack Developer',
    body: "Erciyes Üniversitesi Bilgisayar Mühendisliği 6. dönem öğrencisiyim. JavaScript ve MERN Stack (MongoDB, Express, React, Node.js) teknolojilerine odaklanan bir Full-Stack Geliştiriciyim. Modern web mimarileri, 3D / WebGL deneyimleri ve AI entegrasyonları üzerine çalışıyorum.",
    highlights: [
      'Erciyes Üniversitesi — Bilgisayar Mühendisliği',
      'Full-Stack · MERN · TypeScript',
      'WebGL · R3F · AI Entegrasyonları',
    ],
  },
  projects: {
    title: 'Projeler',
    kicker: 'Seçilmiş çalışmalar',
    items: [
      {
        name: 'TÜBİTAK 2209-A',
        desc: 'Derin öğrenme tabanlı akciğer sesi sınıflandırma projesi. CNN mimarileriyle solunum anomalilerinin tespiti.',
        tags: ['Python', 'Deep Learning', 'Signal Processing'],
      },
      {
        name: "Cucu's Cafe",
        desc: 'Uçtan uca MERN stack ile geliştirilmiş ticari platform. Ürün yönetimi, sipariş akışı ve admin paneli.',
        tags: ['MongoDB', 'Express', 'React', 'Node.js'],
      },
      {
        name: 'VizioWise AI',
        desc: 'Full-Stack Developer olarak görev aldım. Modern web mimarileri ve AI ürün akışları üzerine çalıştım.',
        tags: ['Next.js', 'API', 'AI Integration'],
      },
    ],
  },
  blog: {
    title: 'Blog',
    kicker: 'Son yazılar',
    posts: [
      {
        title: 'React Three Fiber ile İzometrik Dünyalar',
        date: '2026-04-15',
        tag: 'WebGL',
        excerpt: 'Jesse-Zhou tarzı sahneleri R3F + drei ile inşa ederken öğrendiklerim.',
      },
      {
        title: 'MERN Stack Production Notları',
        date: '2026-03-28',
        tag: 'Backend',
        excerpt: 'Gerçek bir e-ticaret projesini uçtan uca yayına aldığımda karşılaştığım 7 dert.',
      },
      {
        title: 'Framer Motion ile Yumuşak UI',
        date: '2026-03-10',
        tag: 'Frontend',
        excerpt: "Spring fizik değerlerini user-research ile eşleştirmenin kısa rehberi.",
      },
    ],
  },
  contact: {
    title: 'İletişim',
    kicker: 'Birlikte bir şey inşa edelim',
    body: "VizioWise AI'da Full-Stack Geliştirici olarak görev aldım. Yeni bir ürün, ortaklık veya sadece bir fikir için benimle iletişime geçebilirsin.",
    links: [
      { label: 'E-posta', value: 'hello@beratemek.com', href: 'mailto:hello@beratemek.com', icon: 'mail' },
      { label: 'GitHub', value: 'github.com/beratemek', href: 'https://github.com/', icon: 'github' },
      { label: 'LinkedIn', value: 'linkedin.com/in/beratemek', href: 'https://linkedin.com/', icon: 'linkedin' },
      { label: 'Web', value: 'beratemek.com', href: 'https://beratemek.com', icon: 'globe' },
    ],
  },
}