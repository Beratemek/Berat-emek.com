// Yazılarda arama: Türkçe ve aksanlı harflere duyarsız, çok kelimeli, ağırlıklı (başlık > etiket > özet > içerik).
import { parseContent } from './format.js'

/** "Yerel Modeller" ~ "yerel model": küçük harf, Türkçe harfler sadeleşir, aksanlar atılır. */
export function normalize(s) {
  return String(s || '')
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** Tiptap içeriğinden düz metin (arama için). */
function contentText(raw) {
  const doc = parseContent(raw)
  if (!doc || typeof doc === 'string') return typeof doc === 'string' ? doc.replace(/<[^>]+>/g, ' ') : ''
  const out = []
  ;(function walk(n) {
    if (!n) return
    if (n.text) out.push(n.text)
    if (Array.isArray(n.content)) n.content.forEach(walk)
  })(doc)
  return out.join(' ')
}

/** Her yazı için bir kez hazırlanan arama dizini. */
export function buildIndex(posts) {
  return posts.map((p) => ({
    post: p,
    title: normalize(p.title),
    tags: normalize((p.tags || []).join(' ')),
    excerpt: normalize(p.excerpt),
    body: normalize(contentText(p.content)),
  }))
}

/** Sorguya uyan yazılar, en alakalıdan başlayarak. Her kelime en az bir alanda geçmeli. */
export function search(index, query) {
  const words = normalize(query).split(/\s+/).filter(Boolean)
  if (!words.length) return null
  const hits = []
  for (const e of index) {
    let score = 0
    let all = true
    for (const w of words) {
      const s = (e.title.includes(w) ? 6 : 0) + (e.tags.includes(w) ? 3 : 0) + (e.excerpt.includes(w) ? 2 : 0) + (e.body.includes(w) ? 1 : 0)
      if (!s) {
        all = false
        break
      }
      score += s
    }
    if (all) hits.push({ post: e.post, score })
  }
  return hits.sort((a, b) => b.score - a.score).map((h) => h.post)
}
