// Yazı içeriğini (TipTap JSON) sade markdown'a çevirir ve geri dönüştürür.
// Yapay zekaya yazı düzelttirirken kullanılır: model markdown okur/yazar, editör JSON'u geri alır.
// Desteklenen: # / ## / ### başlık, paragraf, - madde, 1. sıralı madde, ``` kod, > alıntı, --- çizgi,
// ![açıklama](adres) görsel, **kalın**, *italik*, ~~üstü çizili~~, `kod`, [metin](adres)

const LINK_ATTRS = { target: '_blank', rel: 'noopener noreferrer nofollow' }
// Görselin altındaki açıklama (title) korunur: ![alt](adres "açıklama")
const imageMd = (a = {}) => `![${a.alt || ''}](${a.src || ''}${a.title ? ` "${String(a.title).replace(/"/g, "'")}"` : ''})`

// ---------- JSON → markdown
function inlineMd(node) {
  return (node.content || [])
    .map((c) => {
      if (c.type === 'hardBreak') return ' '
      if (c.type === 'image') return imageMd(c.attrs)
      if (c.type !== 'text') return inlineMd(c)
      let t = c.text
      const marks = c.marks || []
      if (marks.some((m) => m.type === 'code')) t = `\`${t}\``
      if (marks.some((m) => m.type === 'italic')) t = `*${t}*`
      if (marks.some((m) => m.type === 'bold')) t = `**${t}**`
      if (marks.some((m) => m.type === 'strike')) t = `~~${t}~~`
      const link = marks.find((m) => m.type === 'link')
      if (link) t = `[${t}](${link.attrs.href})`
      return t
    })
    .join('')
}

/** Liste maddesi: paragraflar tek satıra birleşir; madde içindeki görseller listenin hemen altına taşınır. */
function listItems(list, marker) {
  const images = []
  const lines = list.content.map((li, i) => {
    const parts = []
    for (const child of li.content || []) {
      if (child.type === 'paragraph') parts.push(inlineMd(child))
      else if (child.type === 'image') images.push(imageMd(child.attrs))
      else throw new Error(`madde içinde desteklenmeyen öğe: ${child.type}`)
    }
    return `${marker(i)} ${parts.join(' ')}`
  })
  return [lines.join('\n'), ...images].join('\n\n')
}

/** Desteklenmeyen düğüm varsa hata fırlatır (içerik kaybı olmasın diye). */
export function toMd(doc) {
  const out = []
  for (const c of doc?.content || []) {
    if (c.type === 'heading') out.push(`${'#'.repeat(c.attrs?.level || 2)} ${inlineMd(c)}`)
    else if (c.type === 'paragraph') out.push(inlineMd(c))
    else if (c.type === 'bulletList') out.push(listItems(c, () => '-'))
    else if (c.type === 'orderedList') out.push(listItems(c, (i) => `${(c.attrs?.start || 1) + i}.`))
    else if (c.type === 'codeBlock') out.push('```\n' + (c.content || []).map((t) => t.text).join('') + '\n```')
    else if (c.type === 'blockquote') {
      if (c.content.some((p) => p.type !== 'paragraph')) throw new Error('alıntı içinde desteklenmeyen öğe')
      out.push(c.content.map((p) => `> ${inlineMd(p)}`).join('\n'))
    }
    else if (c.type === 'image') out.push(imageMd(c.attrs))
    else if (c.type === 'horizontalRule') out.push('---')
    else throw new Error(`desteklenmeyen öğe: ${c.type}`)
  }
  return out.filter((s) => s.trim()).join('\n\n') + '\n'
}

// ---------- markdown → JSON
function parseInline(text, marks = []) {
  const out = []
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*(.+?)\*\*|~~(.+?)~~|`([^`]+)`|\*([^*\s][^*]*?)\*/g
  let last = 0
  let m
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ type: 'text', text: text.slice(last, m.index), ...(marks.length && { marks }) })
    if (m[1] != null) out.push(...parseInline(m[1], [...marks, { type: 'link', attrs: { href: m[2], ...LINK_ATTRS } }]))
    else if (m[3] != null) out.push(...parseInline(m[3], [...marks, { type: 'bold' }]))
    else if (m[4] != null) out.push(...parseInline(m[4], [...marks, { type: 'strike' }]))
    else if (m[5] != null) out.push({ type: 'text', text: m[5], marks: [...marks, { type: 'code' }] })
    else out.push(...parseInline(m[6], [...marks, { type: 'italic' }]))
    last = re.lastIndex
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last), ...(marks.length && { marks }) })
  return out.filter((n) => n.text)
}
const para = (text) => {
  const content = parseInline(text.trim())
  return { type: 'paragraph', ...(content.length && { content }) }
}
const IMAGE_LINE = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/
const BLOCK_START = /^(```|#{1,3} |- |\d+\. |> |---\s*$|!\[)/

export function toDoc(md) {
  const lines = String(md || '').replace(/\r\n/g, '\n').split('\n')
  const content = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }
    if (line.startsWith('```')) {
      const code = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++])
      i++
      const text = code.join('\n')
      content.push({ type: 'codeBlock', ...(text && { content: [{ type: 'text', text }] }) })
      continue
    }
    const img = line.match(IMAGE_LINE)
    if (img) { content.push({ type: 'image', attrs: { src: img[2], alt: img[1] || null, title: img[3] || null } }); i++; continue }
    if (/^---\s*$/.test(line)) { content.push({ type: 'horizontalRule' }); i++; continue }
    const h = line.match(/^(#{1,3}) (.+)/)
    if (h) { content.push({ type: 'heading', attrs: { level: h[1].length }, content: parseInline(h[2].trim()) }); i++; continue }
    if (/^- /.test(line)) {
      const items = []
      while (i < lines.length && /^- /.test(lines[i])) items.push(lines[i++].slice(2))
      content.push({ type: 'bulletList', content: items.map((t) => ({ type: 'listItem', content: [para(t)] })) })
      continue
    }
    if (/^\d+\. /.test(line)) {
      const start = Number(line.match(/^(\d+)/)[1])
      const items = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) items.push(lines[i++].replace(/^\d+\. /, ''))
      content.push({ type: 'orderedList', attrs: { start, type: null }, content: items.map((t) => ({ type: 'listItem', content: [para(t)] })) })
      continue
    }
    if (line.startsWith('> ')) {
      const ps = []
      while (i < lines.length && lines[i].startsWith('> ')) ps.push(lines[i++].slice(2))
      content.push({ type: 'blockquote', content: ps.map(para) })
      continue
    }
    const buf = []
    while (i < lines.length && lines[i].trim() && !BLOCK_START.test(lines[i])) buf.push(lines[i++].trim())
    if (!buf.length) buf.push(lines[i++].trim()) // tanınmayan blok başı: düz paragraf say
    content.push(para(buf.join(' ')))
  }
  return { type: 'doc', content }
}
