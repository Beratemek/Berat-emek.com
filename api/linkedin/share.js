// POST /api/linkedin/share — admin'in onayladığı metni LinkedIn profilinde yayınlar,
// kaynakları ilk yoruma ekler ve günlük özeti "paylaşıldı" olarak işaretler.
import { json, requireAdmin, getAuth, isConnected, db, linkedinRest, escapeLittleText } from '../_linkedin.js'

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
  const briefId = /^[0-9a-f-]{36}$/i.test(input?.briefId || '') ? input.briefId : null
  if (!text) return json({ error: 'Gönderi metni boş' }, 400)
  if (text.length > 3000) return json({ error: 'LinkedIn gönderisi en fazla 3000 karakter olabilir' }, 400)

  const auth = await getAuth().catch(() => null)
  if (!isConnected(auth)) return json({ error: 'LinkedIn bağlı değil ya da bağlantının süresi dolmuş; yeniden bağla.' }, 400)

  const post = await linkedinRest('posts', auth.access_token, {
    author: auth.member_urn,
    commentary: escapeLittleText(text),
    visibility: 'PUBLIC',
    distribution: { feedDistribution: 'MAIN_FEED', targetEntities: [], thirdPartyDistributionChannels: [] },
    lifecycleState: 'PUBLISHED',
    isReshareDisabledByAuthor: false,
  })
  if (!post.res.ok) return json({ error: `LinkedIn paylaşımı reddetti (${post.res.status}): ${post.text.slice(0, 300)}` }, 502)

  const urn = post.res.headers.get('x-restli-id') || post.res.headers.get('x-linkedin-id')
  const url = urn ? `https://www.linkedin.com/feed/update/${urn}/` : null

  // Kaynak linkleri ilk yoruma (gönderi gövdesindeki linkler erişimi düşürür)
  let commentOk = null
  if (comment && urn) {
    const c = await linkedinRest(`socialActions/${encodeURIComponent(urn)}/comments`, auth.access_token, {
      actor: auth.member_urn,
      object: urn,
      message: { text: comment },
    })
    commentOk = c.res.ok
  }

  if (briefId) {
    try {
      const rows = await db(`daily_briefs?id=eq.${briefId}&select=stats`)
      const stats = { ...(rows?.[0]?.stats || {}), linkedin: { url, urn, sharedAt: new Date().toISOString() } }
      await db(`daily_briefs?id=eq.${briefId}`, { method: 'PATCH', body: { status: 'paylasildi', stats }, prefer: 'return=minimal' })
    } catch {
      // Paylaşım yapıldı; işaretleme başarısızsa panelden elle işaretlenebilir
    }
  }

  return json({ ok: true, url, commentOk })
}
