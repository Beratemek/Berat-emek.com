export function fmtDate(iso, style = 'long', locale = 'tr-TR') {
  const opts =
    style === 'short'
      ? { day: 'numeric', month: 'short', year: 'numeric' }
      : { day: 'numeric', month: 'long', year: 'numeric' }
  return new Date(iso).toLocaleDateString(locale, opts)
}

export const postPath = (p) => `/${p.kind === 'project' ? 'project' : 'blog'}/${p.slug}`

/** Supabase JSONB bazen string, bazen obje döner. */
export function parseContent(raw) {
  if (typeof raw !== 'string') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function collectText(node, out) {
  if (!node || typeof node !== 'object') return
  if (typeof node.text === 'string') out.push(node.text)
  if (Array.isArray(node.content)) node.content.forEach((c) => collectText(c, out))
}

/** Tiptap içeriğinden tahmini okuma süresi (dakika). */
export function readMinutes(raw) {
  const content = parseContent(raw)
  let text = ''
  if (content && typeof content === 'object') {
    const out = []
    collectText(content, out)
    text = out.join(' ')
  } else if (typeof content === 'string') {
    text = content.replace(/<[^>]+>/g, ' ')
  }
  const words = text.split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}

/** Kapak üzerindeki büyük kelime: kısa etiket ya da başlığın ilk kelimesi. */
export function coverWord(post) {
  const tag = post.tags?.[0]
  if (tag && tag.length <= 14) return tag
  return (tag || post.title || '').split(/\s+/)[0]
}
