// POST /api/content/image — günün seçili içeriği için konuya özel kapak görseli üretir (~0,07 $).
// PNG döndürür; WebP'ye sıkıştırma ve depolamaya yükleme tarayıcıda yapılır (sunucuda görüntü kütüphanesi yok).
import { json, requireAdmin } from '../_linkedin.js'
import { loadBrief, pickTopic } from '../_content.js'
import { generateIllustration, imageCost } from '../../bot/image.js'
import { canUseAI, recordRun } from '../../bot/agentkit.js'

export async function POST(request) {
  if (!(await requireAdmin(request))) return json({ error: 'Yetkisiz' }, 401)
  let input
  try {
    input = await request.json()
  } catch {
    return json({ error: 'Geçersiz istek' }, 400)
  }
  const brief = await loadBrief(input?.briefId)
  if (!brief) return json({ error: 'Günlük özet bulunamadı' }, 404)
  const { topic } = pickTopic(brief, input?.index)
  const postId = topic?.content?.post_id || brief.post_id
  if (!postId) return json({ error: 'Kapak üretilecek bir taslak yok' }, 400)
  const prompt =
    topic?.content?.image_prompt ||
    `A clean editorial illustration about this developer topic: ${topic?.topic || brief.headline || 'artificial intelligence'}. Concrete objects and a clear visual metaphor.`

  const budget = await canUseAI('gundem', { reserve: 0.2 })
  if (!budget.ok) return json({ error: `Kapak üretilemedi: ${budget.reason}` }, 402)

  const before = imageCost()
  try {
    const png = await generateIllustration(prompt)
    return json({ ok: true, postId, image: `data:image/png;base64,${png.toString('base64')}` })
  } catch (e) {
    return json({ error: `Görsel üretilemedi: ${e.message}` }, 502)
  } finally {
    const cost = imageCost() - before
    if (cost > 0) await recordRun('gundem', { summary: `Kapak görseli: ${topic?.topic || brief.headline || ''}`, cost, details: { kind: 'cover' } }).catch(() => {})
  }
}
