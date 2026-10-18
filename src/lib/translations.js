// Yazı/proje çevirileri (post_translations). Türkçe ana dildir; seçili dilde çeviri yoksa
// içerik Türkçe gösterilir. Çeviriler bot/translate.js ile üretilir.
import { supabase } from './supabase.js'

const cache = new Map() // `${lang}|${içerikli mi}|${post_id}` → satır | null

/** Verilen yazılar için seçili dildeki çevirileri getirir: Map(post_id → satır) */
export async function loadTranslations(lang, ids, { withContent = false } = {}) {
  if (!lang || lang === 'tr' || !ids?.length) return new Map()
  const key = (id) => `${lang}|${withContent ? 1 : 0}|${id}`
  const missing = ids.filter((id) => !cache.has(key(id)))
  if (missing.length) {
    const cols = withContent ? 'post_id, title, excerpt, tags, content' : 'post_id, title, excerpt, tags'
    const { data, error } = await supabase.from('post_translations').select(cols).eq('lang', lang).in('post_id', missing)
    if (error) return new Map() // tablo henüz yoksa sessizce Türkçeye düş
    for (const id of missing) cache.set(key(id), null)
    for (const row of data || []) cache.set(key(row.post_id), row)
  }
  return new Map(ids.map((id) => [id, cache.get(key(id))]).filter(([, row]) => row))
}

/** Yazıyı çevirisiyle birleştirir; `_lang` gösterilen içeriğin dilidir. */
export function translatePost(post, row, lang) {
  if (!row) return { ...post, _lang: 'tr' }
  return {
    ...post,
    title: row.title || post.title,
    excerpt: row.excerpt ?? post.excerpt,
    tags: row.tags?.length ? row.tags : post.tags,
    content: row.content || post.content,
    _lang: lang,
  }
}
