// POST /api/linkedin/start — admin'in LinkedIn hesabını bağlamak için yetkilendirme adresini üretir.
import { json, requireAdmin, missingConfig, db, REDIRECT_URI } from '../_linkedin.js'

export async function POST(request) {
  if (!(await requireAdmin(request))) return json({ error: 'Yetkisiz' }, 401)
  const missing = missingConfig()
  if (missing.length) return json({ error: 'Kurulum eksik', missing }, 400)

  // Tek kullanımlık, 10 dakika geçerli "state": dönüşte yalnızca bizim başlattığımız akış kabul edilir
  const state = crypto.randomUUID()
  await db('linkedin_auth?on_conflict=id', {
    method: 'POST',
    body: { id: 1, state, state_expires: new Date(Date.now() + 10 * 60_000).toISOString() },
    prefer: 'resolution=merge-duplicates,return=minimal',
  })

  const q = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    state,
    scope: 'openid profile w_member_social',
  })
  return json({ url: `https://www.linkedin.com/oauth/v2/authorization?${q}` })
}
