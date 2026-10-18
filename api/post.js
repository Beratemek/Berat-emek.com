// Vercel Function — sosyal medya botları için yazıya özel link önizlemesi.
//
// LinkedIn, X, WhatsApp gibi platformlar önizleme oluştururken JavaScript çalıştırmaz.
// Site tek sayfalık (SPA) olduğu için her yazı linki ana sayfanın başlığı ve görseliyle
// görünürdü. vercel.json yalnızca bu botları buraya yönlendirir; normal ziyaretçiler
// doğrudan statik siteyi alır, bu fonksiyondan etkilenmez.

const SITE_URL = 'https://berat-emek.com'
const FALLBACK_IMAGE = `${SITE_URL}/og-cover.png`

const esc = (s) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

async function fetchPost(slug) {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key || !slug) return null
  const q = new URLSearchParams({
    select: 'title,excerpt,cover,kind,created_at',
    slug: `eq.${slug}`,
    published: 'eq.true',
    limit: '1',
  })
  const res = await fetch(`${url}/rest/v1/posts?${q}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) return null
  const rows = await res.json()
  return rows[0] || null
}

export function injectMeta(shell, post, pageUrl) {
  const title = `${post.title} — Berat Emek`
  const desc = post.excerpt || title
  const image = post.cover || FALLBACK_IMAGE
  const isArticle = post.kind !== 'project'

  const tags = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(desc)}" />`,
    `<link rel="canonical" href="${esc(pageUrl)}" />`,
    `<meta property="og:type" content="${isArticle ? 'article' : 'website'}" />`,
    `<meta property="og:url" content="${esc(pageUrl)}" />`,
    `<meta property="og:title" content="${esc(post.title)}" />`,
    `<meta property="og:description" content="${esc(desc)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:locale" content="tr_TR" />`,
    `<meta property="og:site_name" content="Berat Emek" />`,
    isArticle && post.created_at && `<meta property="article:published_time" content="${esc(post.created_at)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(post.title)}" />`,
    `<meta name="twitter:description" content="${esc(desc)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
  ]
    .filter(Boolean)
    .join('\n    ')

  // Ana sayfanın genel etiketlerini çıkar, yazıya özel olanları ekle
  const cleaned = shell
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+(?:name|property)="(?:title|description|og:[^"]+|twitter:[^"]+)"[^>]*>\s*/gi, '')
    .replace(/<link\s+rel="canonical"[^>]*>\s*/i, '')
  return cleaned.replace('</head>', `    ${tags}\n  </head>`)
}

export async function GET(request) {
  const reqUrl = new URL(request.url)
  const fromPath = reqUrl.pathname.match(/^\/(blog|project)\/([^/]+)/)
  const kind = (reqUrl.searchParams.get('kind') || fromPath?.[1]) === 'project' ? 'project' : 'blog'
  const slug = reqUrl.searchParams.get('slug') || (fromPath ? decodeURIComponent(fromPath[2]) : '')
  const pageUrl = `${SITE_URL}/${kind}/${encodeURIComponent(slug)}`

  let html = await fetch(new URL('/index.html', reqUrl.origin)).then((r) => r.text())
  try {
    const post = await fetchPost(slug)
    if (post) html = injectMeta(html, post, pageUrl)
  } catch {
    // Supabase'e ulaşılamazsa genel etiketlerle devam et
  }

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400',
    },
  })
}
