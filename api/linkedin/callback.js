// GET /api/linkedin/callback — LinkedIn onay ekranından dönüş: kodu erişim anahtarıyla değiştirir,
// hesabı kaydeder ve panele geri yönlendirir.
import { SITE_URL, REDIRECT_URI, db, getAuth } from '../_linkedin.js'

const back = (result) => Response.redirect(`${SITE_URL}/admin/today?linkedin=${result}`, 302)

export async function GET(request) {
  const u = new URL(request.url)
  if (u.searchParams.get('error')) return back('iptal')
  const code = u.searchParams.get('code')
  const state = u.searchParams.get('state')
  if (!code || !state) return back('gecersiz')

  try {
    const auth = await getAuth()
    if (!auth?.state || auth.state !== state || new Date(auth.state_expires) < new Date()) return back('gecersiz')

    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }),
      signal: AbortSignal.timeout(15_000),
    })
    const token = await tokenRes.json()
    if (!tokenRes.ok || !token.access_token) return back('hata')

    const meRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${token.access_token}` },
      signal: AbortSignal.timeout(10_000),
    })
    const me = await meRes.json()
    if (!meRes.ok || !me.sub) return back('hata')

    await db('linkedin_auth?id=eq.1', {
      method: 'PATCH',
      body: {
        access_token: token.access_token,
        expires_at: new Date(Date.now() + (token.expires_in || 5_184_000) * 1000).toISOString(),
        member_urn: `urn:li:person:${me.sub}`,
        name: me.name || null,
        state: null,
        state_expires: null,
        updated_at: new Date().toISOString(),
      },
      prefer: 'return=minimal',
    })
    return back('ok')
  } catch {
    return back('hata')
  }
}
