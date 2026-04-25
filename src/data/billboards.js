// Dashboard bağlandığında bu veri API'den gelecek.
// Şema: { id, kind: 'blog'|'project', title, excerpt, tag, href, cover }
// cover: public dizinindeki bir resmin yolu, ya da null.

export const billboardFeeds = {
  // Sol pano — Blog yazıları
  left: {
    heading: 'BLOG',
    accent: '#f59e42',
    posts: [
      {
        id: 'b1',
        kind: 'blog',
        title: 'React Three Fiber ile İzometrik Dünyalar',
        excerpt: 'Jesse-Zhou tarzı sahneleri R3F + drei ile inşa ederken öğrendiklerim.',
        tag: 'WebGL',
        href: '#',
        cover: null,
      },
      {
        id: 'b2',
        kind: 'blog',
        title: 'MERN Stack Production Notları',
        excerpt: 'Gerçek bir e-ticaret projesini uçtan uca yayına aldığımda karşılaştığım 7 dert.',
        tag: 'Backend',
        href: '#',
        cover: null,
      },
      {
        id: 'b3',
        kind: 'blog',
        title: 'Framer Motion ile Yumuşak UI',
        excerpt: "Spring fizik değerlerini user-research'le eşleştirmenin kısa rehberi.",
        tag: 'Frontend',
        href: '#',
        cover: null,
      },
    ],
  },
  // Sağ pano — Projeler
  right: {
    heading: 'PROJELER',
    accent: '#38bdf8',
    posts: [
      {
        id: 'p1',
        kind: 'project',
        title: 'TÜBİTAK 2209-A',
        excerpt: 'Derin öğrenme tabanlı akciğer sesi sınıflandırma — CNN ile anomali tespiti.',
        tag: 'AI/ML',
        href: '#',
        cover: null,
      },
      {
        id: 'p2',
        kind: 'project',
        title: "Cucu's Cafe",
        excerpt: 'Uçtan uca MERN stack e-ticaret: sipariş akışı, admin paneli, ödeme.',
        tag: 'MERN',
        href: '#',
        cover: null,
      },
      {
        id: 'p3',
        kind: 'project',
        title: 'VizioWise AI',
        excerpt: 'Full-Stack Developer olarak katkı verdiğim AI ürünleri ve orkestrasyon akışları.',
        tag: 'AI',
        href: '#',
        cover: null,
      },
    ],
  },
}

export const ROTATE_MS = 5000