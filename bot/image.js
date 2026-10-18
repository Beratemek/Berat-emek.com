// Konuya özel renkli illüstrasyon: OpenRouter'daki görsel modeliyle üretilir (varsayılan: Nano Banana 2).
// Görselde yazı olmaz; başlık sitede ve LinkedIn kartında zaten görünür.
const IMAGE_MODEL = process.env.BOT_IMAGE_MODEL || 'google/gemini-3.1-flash-image'

// Her görselin kendine ait, sakin bir paleti olsun: sitede yan yana duran içerikler birbirinden ayırt edilsin
// ama hiçbiri gökkuşağı gibi rengarenk olmasın (bir baskın renk + bir vurgu).
export const PALETTES = [
  'deep teal with warm sand accents', 'indigo with soft gold accents', 'emerald green with cream accents',
  'burgundy with blush pink accents', 'slate blue with coral accents', 'charcoal with electric cyan accents',
  'violet with silver accents', 'forest green with amber accents', 'navy blue with orange accents',
  'terracotta with sage green accents', 'graphite gray with lime accents', 'plum with peach accents',
  'ocean blue with white accents', 'mustard yellow with charcoal accents', 'crimson with dark gray accents',
]

export const imageStyle = (palette) =>
  `Modern editorial illustration for a technology blog. Restrained, harmonious palette: ${palette} — one dominant color plus a single accent, muted-to-medium saturation; do NOT use rainbow or many competing colors. Clean confident shapes, gentle depth and lighting, high detail, tech-magazine quality, wide 16:9 composition with one clear focal point. Absolutely no text, letters, numbers, logos, watermarks or readable UI.`

function hash(text) {
  let h = 0
  for (const ch of String(text)) h = (h * 31 + ch.codePointAt(0)) >>> 0
  return h
}
let spent = 0
export const imageCost = () => Number(spent.toFixed(4))

/** Görseli üretir; PNG Buffer döner. Başarısız olursa hata fırlatır (çağıran kahverengi kapağa düşer). */
export async function generateIllustration(concept, { model = IMAGE_MODEL, palette = PALETTES[hash(concept) % PALETTES.length] } = {}) {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('OPENROUTER_API_KEY tanımlı değil')
  let lastErr
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://berat-emek.com',
          'X-Title': 'beratemek kapak görseli',
        },
        body: JSON.stringify({
          model,
          modalities: ['image', 'text'],
          image_config: { aspect_ratio: '16:9' },
          usage: { include: true },
          messages: [{ role: 'user', content: `${concept.trim()}\n\nStyle: ${imageStyle(palette)}` }],
        }),
        signal: AbortSignal.timeout(120_000),
      })
      const data = await res.json()
      spent += data.usage?.cost || 0
      const url = data.choices?.[0]?.message?.images?.[0]?.image_url?.url
      if (!res.ok || !url) throw new Error(`görsel gelmedi (${res.status}): ${JSON.stringify(data.error || data).slice(0, 200)}`)
      return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64')
    } catch (e) {
      lastErr = e
    }
  }
  throw new Error(`[görsel] ${lastErr?.message}`)
}
