// Yazı kapakları: görseli tarayıcıda WebP (site) + aynı adla JPEG (LinkedIn) olarak yükler.
// autoCover: önce konuya özel renkli yapay zeka görseli (~0,07 $), olmazsa ücretsiz markalı kapak.
import { supabase } from '../../lib/supabase.js'
import { serverApi } from './serverApi.js'
import { renderBrandCover } from './brandCover.js'

/** Görseli tarayıcıda yeniden kodlar (en fazla 1600 px genişlik). */
export function encode(dataUrl, type, quality, maxWidth = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const w = Math.min(maxWidth, img.naturalWidth)
      const h = Math.round((img.naturalHeight * w) / img.naturalWidth)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (type === 'image/jpeg') {
        ctx.fillStyle = '#ffffff' // JPEG saydamlık taşımaz
        ctx.fillRect(0, 0, w, h)
      }
      ctx.drawImage(img, 0, 0, w, h)
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Görsel sıkıştırılamadı'))), type, quality)
    }
    img.onerror = () => reject(new Error('Görsel okunamadı'))
    img.src = dataUrl
  })
}

/** Görseli yazının kapağı yapar: site için WebP, LinkedIn için JPEG kopyası (LinkedIn WebP'yi güvenilir göstermiyor). */
export async function saveCover(post, dataUrl, folder) {
  const base = `${folder}/${post.slug.slice(0, 60)}-${Date.now().toString(36)}`
  const [webp, jpg] = await Promise.all([encode(dataUrl, 'image/webp', 0.85), encode(dataUrl, 'image/jpeg', 0.86)])
  const store = supabase.storage.from('covers')
  const up = await store.upload(`${base}.webp`, webp, { contentType: 'image/webp', cacheControl: '31536000' })
  if (up.error) throw up.error
  const upJpg = await store.upload(`${base}.jpg`, jpg, { contentType: 'image/jpeg', cacheControl: '31536000' })
  if (upJpg.error) throw upJpg.error
  const url = store.getPublicUrl(`${base}.webp`).data.publicUrl
  const { error } = await supabase.from('posts').update({ cover: url, cover_position: '50% 50%' }).eq('id', post.id)
  if (error) throw error
  return { url, info: `site için ${Math.round(webp.size / 1024)} KB, LinkedIn için JPEG ${Math.round(jpg.size / 1024)} KB` }
}

export const isNoCredit = (msg) => /1\.00 in balance|requires at least|402|bütçe|budget/i.test(String(msg))
const todayTr = () =>
  new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())

/** Ücretsiz markalı kapak (başlık + ağ küresi + imza). */
export async function brandCover(post) {
  return saveCover(post, await renderBrandCover({ title: post.title, date: todayTr() }), 'brand')
}

/**
 * Yazının kapağı yoksa ekler: önce konuya özel renkli görsel, olmazsa markalı kapak.
 * Dönüş: { kind: 'ai' | 'brand' | 'var', reason? }
 */
export async function autoCover({ briefId, index, postId }) {
  const { data: post } = await supabase.from('posts').select('id, slug, title, cover').eq('id', postId).maybeSingle()
  if (!post) return { kind: 'yok' }
  if (post.cover) return { kind: 'var' }
  try {
    const out = await serverApi('/api/content/image', { method: 'POST', body: { briefId, index } })
    await saveCover(post, out.image, 'ai')
    return { kind: 'ai' }
  } catch (e) {
    await brandCover(post)
    return { kind: 'brand', reason: e.message }
  }
}
