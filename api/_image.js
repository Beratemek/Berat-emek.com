// LinkedIn ve sosyal önizlemeler WebP'yi güvenilir göstermiyor (LinkedIn görsel yükleme API'si yalnızca JPG/PNG/GIF alır).
// Her WebP kapağın yanında aynı adla bir JPEG kopyası tutulur (kapak.webp → kapak.jpg); varsa onu kullan.

/** Kapağın JPEG kopyası varsa onun adresi, yoksa kapağın kendisi. */
export async function shareableImage(cover) {
  if (!cover) return null
  const base = String(cover).split('?')[0]
  if (!/\.webp$/i.test(base)) return cover
  const jpg = base.replace(/\.webp$/i, '.jpg')
  try {
    const res = await fetch(jpg, { method: 'HEAD', signal: AbortSignal.timeout(4000) })
    if (res.ok) return jpg
  } catch {
    // kopya yoksa ya da ulaşılamıyorsa asıl kapağa düş
  }
  return cover
}
