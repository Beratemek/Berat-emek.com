// POST /api/linkedin/share — admin'in onayladığı metni LinkedIn profilinde yayınlar.
// Günlük özetin blog taslağı varsa önce yazıyı sitede yayınlar ve gönderiye yazının bağlantısını
// kart olarak ekler (asıl amaç: ayrıntılar blogda, LinkedIn'de yorum + yönlendirme).
import { SITE_URL, json, requireAdmin, getAuth, isConnected, db, linkedinRest, escapeLittleText, uploadLinkedInImage } from '../_linkedin.js'
import { shareableImage } from '../_image.js'

export async function POST(request) {
  if (!(await requireAdmin(request))) return json({ error: 'Yetkisiz' }, 401)

  let input
  try {
    input = await request.json()
  } catch {
    return json({ error: 'Geçersiz istek' }, 400)
  }
  const text = String(input?.text || '').trim()
  const comment = String(input?.comment || '').trim()
  const withArticle = input?.withArticle !== false
  const briefId = /^[0-9a-f-]{36}$/i.test(input?.briefId || '') ? input.briefId : null
  if (!text) return json({ error: 'Gönderi metni boş' }, 400)
  if (text.length > 3000) return json({ error: 'LinkedIn gönderisi en fazla 3000 karakter olabilir' }, 400)

  const auth = await getAuth().catch(() => null)
  if (!isConnected(auth)) return json({ error: 'LinkedIn bağlı değil ya da bağlantının süresi dolmuş; yeniden bağla.' }, 400)

  // Blog yazısı: önce sitede yayınla, sonra bağlantısını gönderiye kart olarak ekle
  let brief = null
  let article = null
  if (briefId) brief = (await db(`daily_briefs?id=eq.${briefId}&select=id,post_id,stats,topics`).catch(() => []))?.[0] || null
  // Aynı gün birden fazla içerik olabilir: index verilmişse o konunun içeriği paylaşılır
  const topics = Array.isArray(brief?.topics) ? brief.topics : []
  const topic = Number.isInteger(input?.index) ? topics[input.index] : null
  const postId = topic?.content?.post_id || brief?.post_id || null
  if (withArticle && postId) {
    const post = (await db(`posts?id=eq.${postId}&select=id,slug,title,excerpt,published,cover`))?.[0]
    if (post) {
      if (!post.published) {
        await db(`posts?id=eq.${post.id}`, {
          method: 'PATCH',
          body: { published: true, created_at: new Date().toISOString() },
          prefer: 'return=minimal',
        })
      }
      article = { source: `${SITE_URL}/blog/${post.slug}`, title: post.title, description: (post.excerpt || '').slice(0, 250) }
      // Kapak görseli kartın küçük resmi olur (yüklenemezse kart görselsiz gider)
      if (post.cover) {
        const thumbnail = await uploadLinkedInImage(auth.access_token, auth.member_urn, await shareableImage(post.cover))
        if (thumbnail) article.thumbnail = thumbnail
      }
    }
  }

  const body = (art) => ({
    author: auth.member_urn,
    commentary: escapeLittleText(text),
    visibility: 'PUBLIC',
    distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
    ...(art && { content: { article: art } }),
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  })
  let post = await linkedinRest('posts', auth.access_token, body(article))
  // Görsel henüz işlenmediyse ya da reddedildiyse kartı görselsiz yeniden dene
  if (!post.res.ok && article?.thumbnail) {
    const { thumbnail, ...rest } = article
    post = await linkedinRest('posts', auth.access_token, body(rest))
  }
  if (!post.res.ok) return json({ error: `LinkedIn paylaşımı reddetti (${post.res.status}): ${post.text.slice(0, 300)}` }, 502)

  const urn = post.res.headers.get('x-restli-id') || post.res.headers.get('x-linkedin-id')
  const url = urn ? `https://www.linkedin.com/feed/update/${urn}/` : null

  // İsteğe bağlı ilk yorum (ör. kaynaklar)
  let commentOk = null
  if (comment && urn) {
    const c = await linkedinRest(`socialActions/${encodeURIComponent(urn)}/comments`, auth.access_token, {
      actor: auth.member_urn,
      object: urn,
      message: { text: comment },
    })
    commentOk = c.res.ok
  }

  if (brief) {
    try {
      const sharedAt = new Date().toISOString()
      const stats = { ...(brief.stats || {}), linkedin: { url, urn, article: article?.source || null, sharedAt } }
      if (topic?.content) topic.content.shared = { url, urn, article: article?.source || null, at: sharedAt, via: 'api' }
      await db(`daily_briefs?id=eq.${brief.id}`, { method: 'PATCH', body: { status: 'paylasildi', stats, ...(topic && { topics }) }, prefer: 'return=minimal' })
    } catch {
      // Paylaşım yapıldı; işaretleme başarısızsa panelden elle işaretlenebilir
    }
  }

  return json({ ok: true, url, article: article?.source || null, commentOk })
}
