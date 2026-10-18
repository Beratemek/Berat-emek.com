// Yayındaki yazı ve projeleri 9 dile çevirip post_translations tablosuna yazar.
// Yalnızca yeni ya da Türkçesi değişmiş içerikler çevrilir (Türkçe içeriğin özeti saklanır).
// Kullanım: node translate.js            → eksik/eskimiş tüm çeviriler
//           node translate.js --dry      → ilk içeriği İngilizceye çevirip ekrana basar, yazmaz
//           node translate.js --langs=en,de --only=slug
import { createHash } from 'node:crypto'
import { askJSON, getUsage } from './llm.js'
import { rest, hasDb } from './db.js'
import { MODEL } from './config.js'

const LANGS = {
  en: 'English',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  pt: 'Brazilian Portuguese',
  ru: 'Russian',
  zh: 'Simplified Chinese',
  ja: 'Japanese',
}
const TRANSLATE_MODEL = process.env.BOT_TRANSLATE_MODEL || MODEL
const CONCURRENCY = 4

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')))
const dry = 'dry' in args

const system = (language) => `You translate the personal website of Berat Emek, a Turkish full-stack & AI developer, from Turkish into ${language}.
Rules:
- Natural, idiomatic ${language} that reads as if written in it originally; keep the confident, clear, technical tone. Not word-for-word.
- Keep unchanged: product, company and brand names (Claude Code, MCP, LangChain, LangGraph, Ollama, Morf, VizioWise, Unity, Three.js, Supabase…), code, commands, file names, URLs, numbers and units.
- "texts" are consecutive fragments of rich text (bold, links and list items are split into separate fragments). Translate each fragment in place so they still read correctly when joined; never merge, split, drop or reorder fragments.
- Return JSON only: {"title": string, "excerpt": string, "tags": string[], "texts": string[]} with "tags" and "texts" exactly as long as the input arrays.`

/** Tiptap içeriğindeki çevrilecek metin düğümleri (kod blokları ve satır içi kod hariç) */
function textNodes(node, out = [], inCode = false) {
  if (!node || typeof node !== 'object') return out
  const code = inCode || node.type === 'codeBlock'
  if (node.type === 'text' && typeof node.text === 'string' && node.text.trim() && !code && !node.marks?.some((m) => m.type === 'code')) {
    out.push(node)
  }
  for (const child of node.content || []) textNodes(child, out, code)
  return out
}

const parseContent = (c) => {
  if (!c) return null
  if (typeof c === 'string') {
    try {
      return JSON.parse(c)
    } catch {
      return null
    }
  }
  return c
}

const sourceHash = (p) =>
  createHash('sha256').update(JSON.stringify([p.title, p.excerpt, p.tags || [], parseContent(p.content)])).digest('hex').slice(0, 32)

/** Baştaki/sondaki boşlukları kaynağınkiyle aynı tutar (parçalar birleşince kelimeler yapışmasın) */
const keepSpacing = (orig, next) => `${orig.match(/^\s*/)[0]}${String(next).trim()}${orig.match(/\s*$/)[0]}`

async function translateOne(post, lang) {
  const content = structuredClone(parseContent(post.content))
  const nodes = content ? textNodes(content) : []
  const input = { title: post.title || '', excerpt: post.excerpt || '', tags: post.tags || [], texts: nodes.map((n) => n.text) }
  const approxTokens = Math.ceil(JSON.stringify(input).length / 2.5)

  for (let attempt = 1; attempt <= 2; attempt++) {
    const out = await askJSON({
      label: `çeviri ${post.slug} → ${lang}`,
      system: system(LANGS[lang]),
      user: JSON.stringify(input),
      model: TRANSLATE_MODEL,
      temperature: 0.2,
      maxTokens: Math.min(16000, Math.max(4000, approxTokens * 3)),
    })
    if (!Array.isArray(out.texts) || out.texts.length !== nodes.length || !Array.isArray(out.tags)) {
      console.warn(`  ! ${post.slug} → ${lang}: parça sayısı tutmadı (${out.texts?.length}/${nodes.length}), deneme ${attempt}`)
      continue
    }
    nodes.forEach((n, i) => {
      n.text = keepSpacing(n.text, out.texts[i])
    })
    return {
      post_id: post.id,
      lang,
      title: String(out.title || post.title).trim(),
      excerpt: post.excerpt ? String(out.excerpt || '').trim() : null,
      tags: out.tags.length === (post.tags || []).length ? out.tags.map((t) => String(t).trim()) : post.tags || [],
      content,
      source_hash: sourceHash(post),
      updated_at: new Date().toISOString(),
    }
  }
  throw new Error(`${post.slug} → ${lang} çevrilemedi`)
}

async function pool(items, worker, size) {
  const results = []
  let i = 0
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) {
        const item = items[i++]
        results.push(await worker(item).catch((e) => ({ error: e.message, item })))
      }
    })
  )
  return results
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY) {
    console.log('OPENROUTER_API_KEY yok; çeviri atlandı.')
    return
  }
  if (!hasDb()) throw new Error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli')

  const langs = (args.langs ? args.langs.split(',') : Object.keys(LANGS)).filter((l) => LANGS[l])
  let posts = await rest('posts?select=id,slug,title,excerpt,tags,content&published=eq.true&order=created_at.desc')
  if (args.only) posts = posts.filter((p) => p.slug === args.only)

  let existing = []
  try {
    existing = await rest('post_translations?select=post_id,lang,source_hash')
  } catch (e) {
    if (e.code === 'PGRST205' || e.code === '42P01') throw new Error('post_translations tablosu yok: supabase/translations.sql dosyasını çalıştır')
    throw e
  }
  const have = new Map(existing.map((r) => [`${r.post_id}|${r.lang}`, r.source_hash]))

  if (dry) {
    const row = await translateOne(posts[0], args.langs?.split(',')[0] || 'en')
    console.log(JSON.stringify({ ...row, content: textNodes(row.content).slice(0, 8).map((n) => n.text) }, null, 2))
    console.log('kullanım:', getUsage())
    return
  }

  const tasks = []
  for (const p of posts) for (const lang of langs) if (have.get(`${p.id}|${lang}`) !== sourceHash(p)) tasks.push({ post: p, lang })
  console.log(`${posts.length} içerik × ${langs.length} dil → ${tasks.length} çeviri gerekiyor`)
  if (!tasks.length) return

  let done = 0
  const results = await pool(
    tasks,
    async ({ post, lang }) => {
      const row = await translateOne(post, lang)
      await rest('post_translations?on_conflict=post_id,lang', {
        method: 'POST',
        body: row,
        prefer: 'resolution=merge-duplicates,return=minimal',
      })
      console.log(`  ✓ ${++done}/${tasks.length} ${post.slug} → ${lang}`)
      return row
    },
    CONCURRENCY
  )
  const failed = results.filter((r) => r.error)
  for (const f of failed) console.error(`  ✗ ${f.item.post.slug} → ${f.item.lang}: ${f.error}`)
  console.log(`Bitti: ${tasks.length - failed.length} çeviri yazıldı, ${failed.length} hata. Kullanım:`, getUsage())
  if (failed.length === tasks.length) process.exitCode = 1
}

main().catch((e) => {
  console.error('Çeviri başarısız:', e.message)
  process.exitCode = 1
})
