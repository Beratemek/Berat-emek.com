// LinkedIn bağlantısı için ortak yardımcılar (Vercel fonksiyonları; "_" ile başladığı için kendisi bir adres değildir).
//
// Gizli değerler yalnızca Vercel ortam değişkenlerinde durur:
//   LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, SUPABASE_SERVICE_ROLE_KEY
// LinkedIn erişim anahtarı Supabase'deki linkedin_auth tablosunda tutulur; bu tablonun hiçbir
// okuma kuralı yoktur, yani tarayıcı (admin oturumu dahil) okuyamaz — yalnızca bu fonksiyonlar.

export const SITE_URL = 'https://berat-emek.com'
export const REDIRECT_URI = `${SITE_URL}/api/linkedin/callback`
const ADMIN_EMAIL = 'emekberat19@gmail.com'

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  })

export function missingConfig() {
  return ['LINKEDIN_CLIENT_ID', 'LINKEDIN_CLIENT_SECRET', 'SUPABASE_SERVICE_ROLE_KEY'].filter((k) => !process.env[k])
}

const supabaseUrl = () => (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')

/** Supabase REST, service role ile (RLS'e takılmaz) */
export async function db(path, { method = 'GET', body, prefer } = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const headers = { apikey: key, 'Content-Type': 'application/json' }
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`
  if (prefer) headers.Prefer = prefer
  const res = await fetch(`${supabaseUrl()}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  })
  const text = await res.text()
  if (!res.ok) {
    const err = new Error(`Supabase ${res.status}: ${text.slice(0, 200)}`)
    err.status = res.status
    throw err
  }
  return text ? JSON.parse(text) : null
}

/** İstek, panele giriş yapmış admin'den mi geliyor? (Supabase oturum anahtarı doğrulanır) */
export async function requireAdmin(request) {
  const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const res = await fetch(`${supabaseUrl()}/auth/v1/user`, {
    headers: { apikey: process.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8_000),
  })
  if (!res.ok) return null
  const user = await res.json()
  return user?.email === ADMIN_EMAIL ? user : null
}

export async function getAuth() {
  const rows = await db('linkedin_auth?select=*&id=eq.1')
  return rows?.[0] || null
}

export const isConnected = (auth) => Boolean(auth?.access_token && auth.expires_at && new Date(auth.expires_at) > new Date())

/**
 * Posts API metni "little text" biçimindedir: bu karakterler kaçırılmazsa LinkedIn metni
 * keser ya da reddeder. Kaçırılan karakterler gönderide normal görünür.
 */
export const escapeLittleText = (s) => String(s).replace(/[\\|{}@[\]()<>#*_~]/g, (c) => `\\${c}`)

/**
 * LinkedIn REST çağrısı. LinkedIn-Version (YYYYMM) yaklaşık bir yıl desteklendiği için
 * geçerli olan en yeni ay bulunana kadar geriye doğru denenir.
 */
export async function linkedinRest(path, token, body) {
  let last
  for (let back = 1; back <= 12; back++) {
    const d = new Date()
    d.setUTCDate(1)
    d.setUTCMonth(d.getUTCMonth() - back)
    const version = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    const res = await fetch(`https://api.linkedin.com/rest/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'LinkedIn-Version': version,
        'X-Restli-Protocol-Version': '2.0.0',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    })
    const text = await res.text()
    last = { res, text, version }
    if (res.status === 426 || /NONEXISTENT_VERSION|VERSION_MISSING|not supported for version/i.test(text)) continue
    return last
  }
  return last
}
