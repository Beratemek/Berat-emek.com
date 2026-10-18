// Yazar ajanının blok çıktısını sitedeki editörün (Tiptap) JSON formatına çevirir.
// Böylece taslak admin panelinde doğrudan açılıp düzenlenebilir.

function inline(text) {
  return String(text ?? '')
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part) =>
      part.length > 4 && part.startsWith('**') && part.endsWith('**')
        ? { type: 'text', text: part.slice(2, -2), marks: [{ type: 'bold' }] }
        : { type: 'text', text: part }
    )
}

const paragraph = (text) => ({ type: 'paragraph', content: inline(text) })

export function blocksToDoc(blocks, sources = [], note) {
  const content = []

  for (const b of blocks || []) {
    if (!b) continue
    if (b.type === 'h2' || b.type === 'h3') {
      if (String(b.text ?? '').trim()) {
        content.push({ type: 'heading', attrs: { level: b.type === 'h2' ? 2 : 3 }, content: inline(b.text) })
      }
    } else if (b.type === 'ul') {
      const items = (b.items || []).filter((t) => String(t ?? '').trim())
      if (items.length) {
        content.push({ type: 'bulletList', content: items.map((t) => ({ type: 'listItem', content: [paragraph(t)] })) })
      }
    } else if (b.type === 'code') {
      if (String(b.text ?? '').trim()) {
        content.push({ type: 'codeBlock', content: [{ type: 'text', text: String(b.text).trim() }] })
      }
    } else if (b.type === 'quote') {
      if (String(b.text ?? '').trim()) content.push({ type: 'blockquote', content: [paragraph(b.text)] })
    } else if (String(b.text ?? '').trim()) {
      content.push(paragraph(b.text))
    }
  }

  if (sources.length) {
    content.push({ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Kaynaklar' }] })
    content.push({
      type: 'bulletList',
      content: sources.map((s) => ({
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: `${s.source}: ` },
              {
                type: 'text',
                text: s.title,
                marks: [{ type: 'link', attrs: { href: s.url, target: '_blank', rel: 'noopener noreferrer nofollow' } }],
              },
            ],
          },
        ],
      })),
    })
  }

  if (note) {
    content.push({ type: 'paragraph', content: [{ type: 'text', text: note, marks: [{ type: 'italic' }] }] })
  }

  return { type: 'doc', content }
}

export function slugify(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)
}
