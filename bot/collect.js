// 1. adım: Haber toplama. Burada yapay zeka YOK — sadece RSS ve ücretsiz API'ler.
import {
  FEEDS, HN_MIN_POINTS, HF_MAX_AGE_DAYS,
  GITHUB_MAX_AGE_DAYS, GITHUB_MIN_STARS, GITHUB_QUERIES,
  YOUTUBE_QUERIES, YOUTUBE_MIN_VIEWS, MAJOR_ORGS, POPULAR_REPO_QUERIES,
} from './config.js'

const UA = 'Mozilla/5.0 (compatible; beratemek-haber-botu/1.0; +https://berat-emek.com)'

// Genel kaynaklardaki (HN, Simon Willison vb.) başlıkları yapay zekaya göre süzmek için
const AI_RE =
  /\b(ai|a\.i\.|yapay zeka|llms?|gpt[-\w.]*|chatgpt|openai|anthropic|claude|claude code|codex|gemini|gemma|deepmind|llama|llama\.cpp|ollama|vllm|mistral|qwen|deepseek|grok|xai|copilot|cursor|mcp|model context protocol|vibe[- ]coding|hugging ?face|transformers?|diffusion|neural|machine learning|deep learning|agents?|agentic|inference|fine-?tun\w*|rag|embeddings?|multimodal|reasoning)\b|yapay zek[aâ]/i

// Uygunsuz içerik asla aday olmasın
const BLOCK_RE = /\b(nsfw|porn\w*|sex\w*|hentai|nude|onlyfans)\b/i

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Büyük sayılar "320 bin" biçiminde: "320.437" gibi Türkçe binlik noktası modelde ondalıkla karışıyordu
const kfmt = (n) => (n >= 10000 ? `${Math.round(n / 1000)} bin` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(".", ",")} bin` : String(n))

export async function fetchText(url, { timeoutMs = 20000, headers = {} } = {}) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, ...headers },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

/* ---------- Metin yardımcıları ---------- */

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' }

export function decodeEntities(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m
    }
    return ENTITIES[e.toLowerCase()] ?? m
  })
}

export function stripHtml(html) {
  return decodeEntities(
    String(html)
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim()
}

/** Bir makale sayfasından ana metni kabaca çıkarır (doğrulama adımı için). */
export function mainText(html) {
  const metaDesc =
    html.match(/<meta[^>]+(?:name|property)=["'](?:og:)?description["'][^>]+content=["']([^"']*)["']/i)?.[1] || ''
  const block =
    html.match(/<article\b[\s\S]*?<\/article>/i)?.[0] ||
    html.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ||
    html.match(/<body\b[\s\S]*?<\/body>/i)?.[0] ||
    html
  const text = stripHtml(block.replace(/<(nav|header|footer|aside|form|svg|noscript)\b[\s\S]*?<\/\1>/gi, ' '))
  return [decodeEntities(metaDesc), text].filter(Boolean).join('\n')
}

/* ---------- RSS / Atom ayrıştırma ---------- */

function unwrap(s) {
  const cdata = s.match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/)
  return cdata ? cdata[1] : decodeEntities(s)
}

function tagContent(block, names) {
  for (const name of names) {
    const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'))
    if (m) return unwrap(m[1])
  }
  return ''
}

function linkOf(block) {
  // Atom: <link rel="alternate" href="..."/>
  for (const m of block.matchAll(/<link\b([^>]*)>/gi)) {
    const attrs = m[1]
    const href = attrs.match(/href\s*=\s*["']([^"']+)["']/i)?.[1]
    const rel = attrs.match(/rel\s*=\s*["']([^"']+)["']/i)?.[1]
    if (href && (!rel || rel === 'alternate')) return decodeEntities(href)
  }
  // RSS: <link>https://...</link>, yoksa guid
  const text = tagContent(block, ['link']).trim()
  if (/^https?:\/\//.test(text)) return text
  const guid = tagContent(block, ['guid', 'id']).trim()
  return /^https?:\/\//.test(guid) ? guid : ''
}

export function parseFeed(xml) {
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || []
  return blocks
    .map((b) => {
      const date = new Date(tagContent(b, ['pubDate', 'published', 'updated', 'dc:date']).trim())
      return {
        title: stripHtml(tagContent(b, ['title'])),
        url: linkOf(b),
        date: Number.isNaN(date.getTime()) ? null : date,
        summary: stripHtml(tagContent(b, ['description', 'summary', 'content:encoded', 'content'])).slice(0, 400),
      }
    })
    .filter((x) => x.title && x.url && x.date)
}

/* ---------- Kaynaklar ---------- */

async function fromFeed(feed, since) {
  const items = parseFeed(await fetchText(feed.url)).slice(0, feed.limit ?? Infinity)
  return items
    .filter((x) => x.date.getTime() >= since)
    .filter((x) => !feed.aiFilter || AI_RE.test(`${x.title} ${x.summary}`))
    .map((x) => ({ ...x, source: feed.name, type: feed.type, engagement: 0 }))
}

async function fromHackerNews(since) {
  const params = new URLSearchParams({
    tags: 'story',
    numericFilters: `created_at_i>${Math.floor(since / 1000)},points>=${HN_MIN_POINTS}`,
    hitsPerPage: '300',
  })
  const data = JSON.parse(await fetchText(`https://hn.algolia.com/api/v1/search_by_date?${params}`))
  return (data.hits || [])
    .filter((h) => h.title && AI_RE.test(h.title))
    .map((h) => ({
      title: h.title,
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      discussionUrl: `https://news.ycombinator.com/item?id=${h.objectID}`,
      date: new Date(h.created_at),
      summary: `Hacker News: ${h.points} puan, ${h.num_comments ?? 0} yorum`,
      source: 'Hacker News',
      type: 'community',
      engagement: h.points || 0,
    }))
}

/** "kurulus/ad" büyük bir laboratuvara/araca mı ait? Değilse trend listesi yalnızca topluluk sinyalidir. */
const isMajor = (fullName) => MAJOR_ORGS.includes(String(fullName).split('/')[0].toLowerCase())

async function fromHuggingFace() {
  const data = JSON.parse(
    await fetchText('https://huggingface.co/api/models?sort=trendingScore&direction=-1&limit=40')
  )
  const cutoff = Date.now() - HF_MAX_AGE_DAYS * 864e5
  return data
    .filter((m) => m.createdAt && new Date(m.createdAt).getTime() >= cutoff)
    .slice(0, 10)
    .map((m) => ({
      title: `Hugging Face'te trend model: ${m.id}`,
      url: `https://huggingface.co/${m.id}`,
      date: new Date(m.createdAt),
      summary: `${m.pipeline_tag || 'model'} · ${m.likes ?? 0} beğeni · ${m.downloads ?? 0} indirme · trend skoru ${m.trendingScore ?? 0}`,
      source: 'Hugging Face Trend',
      type: isMajor(m.id) ? 'primary' : 'community',
      engagement: m.trendingScore || 0,
    }))
}

/** GitHub'da son günlerde açılıp hızla yıldız toplayan yapay zeka projeleri. */
async function fromGitHub() {
  const since = new Date(Date.now() - GITHUB_MAX_AGE_DAYS * 864e5).toISOString().slice(0, 10)
  const headers = { Accept: 'application/vnd.github+json' }
  // GitHub Actions'ta otomatik gelen token istek sınırını yükseltir
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  const seen = new Set()
  const items = []
  for (const q of GITHUB_QUERIES) {
    const params = new URLSearchParams({
      q: `${q} in:name,description,topics created:>${since} stars:>=${GITHUB_MIN_STARS}`,
      sort: 'stars',
      order: 'desc',
      per_page: '10',
    })
    const data = JSON.parse(await fetchText(`https://api.github.com/search/repositories?${params}`, { headers }))
    for (const r of data.items || []) {
      if (seen.has(r.full_name)) continue
      seen.add(r.full_name)
      const desc = (r.description || '').slice(0, 160)
      items.push({
        title: `GitHub'da hızla yükselen proje: ${r.full_name}${desc ? ` — ${desc}` : ''}`,
        url: r.html_url,
        date: new Date(r.created_at),
        summary: `${r.stargazers_count} yıldız${r.language ? ` · ${r.language}` : ''}${r.topics?.length ? ` · ${r.topics.slice(0, 5).join(', ')}` : ''}`,
        source: 'GitHub Trend',
        type: isMajor(r.full_name) ? 'primary' : 'community',
        engagement: r.stargazers_count,
      })
    }
    await sleep(1500) // arama API'si dakikada sınırlı
  }
  return items.sort((a, b) => b.engagement - a.engagement).slice(0, 12)
}

/** İsteğe bağlı: YOUTUBE_API_KEY varsa son 3 günün en çok izlenen yapay zeka videoları. */
/**
 * GitHub'ın trend sayfası (günlük + haftalık): oluşturulma tarihinden bağımsız, şu an en hızlı yıldız alan repolar.
 * Yalnızca yapay zekayla ilgili olanlar alınır.
 */
async function fromGitHubTrending() {
  const items = []
  const seen = new Set()
  for (const [since, label] of [['daily', 'bugün'], ['weekly', 'bu hafta']]) {
    const html = await fetchText(`https://github.com/trending?since=${since}`, { headers: { Accept: 'text/html' } })
    for (const block of html.split('<article class="Box-row"').slice(1)) {
      const name = /<h2 class="h3 lh-condensed">\s*<a[^>]*href="\/([^"]+)"/.exec(block)?.[1]
      if (!name || seen.has(name)) continue
      const desc = decodeEntities(stripHtml(/<p class="col-9[^"]*">([\s\S]*?)<\/p>/.exec(block)?.[1] || '')).trim()
      if (!AI_RE.test(`${name} ${desc}`)) continue
      seen.add(name)
      const total = Number((/href="\/[^"]+\/stargazers"[^>]*>[\s\S]*?([\d,]+)\s*<\/a>/.exec(block)?.[1] || '0').replace(/,/g, ''))
      const gained = Number((/([\d,]+) stars (?:today|this week)/.exec(block)?.[1] || '0').replace(/,/g, ''))
      items.push({
        title: `GitHub'da gündemde: ${name}${desc ? ` — ${desc.slice(0, 160)}` : ''}`,
        url: `https://github.com/${name}`,
        date: new Date(),
        summary: `${kfmt(total)} toplam yıldız · ${label} +${kfmt(gained)} yıldız`,
        source: 'GitHub Trend',
        type: isMajor(name) ? 'primary' : 'community',
        // Haftalık artış günlüğe çevrilir ki iki liste aynı ölçekte olsun
        engagement: since === 'daily' ? gained : Math.round(gained / 7),
      })
    }
  }
  return items
}

/** Çok popüler yapay zeka repolarının son saatlerdeki sürümleri (ör. 300 bin yıldızlı bir aracın yeni sürümü). */
async function fromPopularReleases(since) {
  const headers = { Accept: 'application/vnd.github+json' }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  const pushed = new Date(since).toISOString().slice(0, 10)
  const repos = new Map()
  for (const q of POPULAR_REPO_QUERIES) {
    const params = new URLSearchParams({ q: `${q} pushed:>=${pushed}`, sort: 'stars', order: 'desc', per_page: '10' })
    const data = JSON.parse(await fetchText(`https://api.github.com/search/repositories?${params}`, { headers }))
    for (const r of data.items || []) repos.set(r.full_name, r)
    await sleep(1500)
  }
  const top = [...repos.values()].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 15)
  const items = []
  for (const r of top) {
    let rel
    try {
      rel = JSON.parse(await fetchText(`https://api.github.com/repos/${r.full_name}/releases?per_page=1`, { headers }))[0]
    } catch {
      continue
    }
    if (!rel?.published_at || new Date(rel.published_at).getTime() < since) continue
    const notes = stripHtml(rel.body || '').replace(/\s+/g, ' ').slice(0, 220)
    items.push({
      title: `${r.full_name} ${rel.tag_name} yayınlandı — ${(r.description || '').slice(0, 140)}`,
      url: rel.html_url,
      date: new Date(rel.published_at),
      summary: `${kfmt(r.stargazers_count)} yıldızlı proje · ${rel.name || rel.tag_name}${notes ? ` · ${notes}` : ''}`,
      source: 'GitHub Sürüm',
      type: 'primary',
      engagement: r.stargazers_count,
    })
  }
  return items
}

async function fromYouTube() {
  const key = process.env.YOUTUBE_API_KEY
  if (!key) return []
  const after = new Date(Date.now() - 3 * 864e5).toISOString()
  const ids = new Set()
  for (const q of YOUTUBE_QUERIES) {
    const params = new URLSearchParams({ part: 'snippet', type: 'video', order: 'viewCount', publishedAfter: after, maxResults: '10', q, key })
    const data = JSON.parse(await fetchText(`https://www.googleapis.com/youtube/v3/search?${params}`))
    for (const v of data.items || []) if (v.id?.videoId) ids.add(v.id.videoId)
  }
  if (!ids.size) return []
  const params = new URLSearchParams({ part: 'snippet,statistics', id: [...ids].join(','), key })
  const data = JSON.parse(await fetchText(`https://www.googleapis.com/youtube/v3/videos?${params}`))
  return (data.items || [])
    .map((v) => ({
      title: decodeEntities(v.snippet.title),
      url: `https://www.youtube.com/watch?v=${v.id}`,
      date: new Date(v.snippet.publishedAt),
      summary: `YouTube · ${v.snippet.channelTitle} · ${Number(v.statistics.viewCount || 0).toLocaleString('tr-TR')} izlenme`,
      source: 'YouTube',
      type: 'community',
      engagement: Number(v.statistics.viewCount || 0),
    }))
    .filter((v) => v.engagement >= YOUTUBE_MIN_VIEWS)
}

/* ---------- Hepsini topla ---------- */

function normUrl(u) {
  try {
    const url = new URL(u)
    url.hash = ''
    for (const k of [...url.searchParams.keys()]) if (/^(utm_|ref$|source$)/.test(k)) url.searchParams.delete(k)
    return `${url.host.replace(/^www\./, '')}${url.pathname.replace(/\/$/, '')}${url.search}`.toLowerCase()
  } catch {
    return u
  }
}

/**
 * Tüm kaynakları paralel çeker. Bir kaynak çökerse diğerleri devam eder.
 * @returns {{ items: object[], report: {source:string, ok:boolean, count:number, error?:string}[] }}
 */
export async function collectAll({ hours, maxItems = 160 }) {
  const since = Date.now() - hours * 3600e3
  // Reddit aynı anda gelen istekleri reddediyor (429); Reddit akışlarını aralıklı çek
  let redditIndex = 0
  const jobs = [
    ...FEEDS.map((f) => {
      const wait = f.url.includes('reddit.com') ? redditIndex++ * 3000 : 0
      return { source: f.name, run: () => sleep(wait).then(() => fromFeed(f, since)) }
    }),
    { source: 'Hacker News', run: () => fromHackerNews(since) },
    { source: 'Hugging Face Trend', run: fromHuggingFace },
    { source: 'GitHub Trend', run: fromGitHub },
    { source: 'GitHub Trend (günlük/haftalık)', run: fromGitHubTrending },
    { source: 'GitHub Sürüm', run: () => fromPopularReleases(since) },
    ...(process.env.YOUTUBE_API_KEY ? [{ source: 'YouTube', run: fromYouTube }] : []),
  ]

  const settled = await Promise.allSettled(jobs.map((j) => j.run()))
  const report = []
  const seen = new Set()
  let items = []

  settled.forEach((r, i) => {
    const source = jobs[i].source
    if (r.status === 'rejected') {
      report.push({ source, ok: false, count: 0, error: r.reason?.message || String(r.reason) })
      return
    }
    let count = 0
    for (const it of r.value) {
      if (BLOCK_RE.test(`${it.title} ${it.summary}`)) continue
      // Aynı kaynaktan aynı link bir kez; farklı kaynaklar aynı habere link verebilir (yankı sinyali)
      const key = `${it.source}|${normUrl(it.url)}`
      if (seen.has(key)) continue
      seen.add(key)
      items.push(it)
      count++
    }
    report.push({ source, ok: true, count })
  })

  items.sort((a, b) => b.date - a.date)
  items = items.slice(0, maxItems).map((it, i) => ({ id: `n${i + 1}`, ...it }))
  return { items, report }
}
