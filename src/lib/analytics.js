// Çerezsiz ziyaretçi analitiği: olaylar doğrudan Supabase'deki analytics_events tablosuna yazılır.
// IP ya da kişisel veri tutulmaz; her tarayıcı rastgele bir kimlikle sayılır.
// Admin olarak giriş yapılmış tarayıcı (Berat'ın kendi ziyaretleri) ve yerel geliştirme sayılmaz.

const URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

function storedId(store, key) {
  try {
    let v = store.getItem(key)
    if (!v) {
      v = crypto.randomUUID?.() || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`
      store.setItem(key, v)
    }
    return v
  } catch {
    return 'anon'
  }
}

function isDisabled() {
  if (!URL || !KEY || typeof window === 'undefined') return true
  if (/^(localhost|127\.|192\.168\.)/.test(location.hostname)) return true
  if (/HeadlessChrome|bot|crawler|spider|preview/i.test(navigator.userAgent)) return true
  try {
    // Supabase oturumu varsa bu tarayıcı admin'in; kendi ziyaretlerini sayma
    return Object.keys(localStorage).some((k) => /^sb-.+-auth-token$/.test(k))
  } catch {
    return false
  }
}

function device() {
  const ua = navigator.userAgent
  if (/iPad|Tablet/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'tablet'
  if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile'
  return 'desktop'
}

function lang() {
  try {
    return localStorage.getItem('site-lang') || document.documentElement.lang || null
  } catch {
    return document.documentElement.lang || null
  }
}

/** /blog/x → { post_kind: 'blog', post_slug: 'x' } */
export function postFromPath(path) {
  const m = path.match(/^\/(blog|project)\/([^/?#]+)/)
  return m ? { post_kind: m[1], post_slug: decodeURIComponent(m[2]) } : {}
}

/**
 * Bir olayı kaydeder. `detail` olayın ayrıntısıdır: sayfa görüntülemede geldiği site
 * (linkedin.com, google.com…), tıklamalarda hedef (email, github.com, linkedin…).
 * Tabloda `referrer` sütununa yazılır.
 */
export function track(type, { detail, value, path = location.pathname } = {}) {
  if (isDisabled()) return
  const body = {
    visitor_id: storedId(localStorage, 'bx-vid'),
    session_id: storedId(sessionStorage, 'bx-sid'),
    type,
    path: path.slice(0, 300),
    ...postFromPath(path),
    value: value == null ? null : Math.max(0, Math.min(86400, Math.round(value))),
    referrer: detail ? String(detail).slice(0, 200) : null,
    lang: lang(),
    device: device(),
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
  }
  fetch(`${URL}/rest/v1/analytics_events`, {
    method: 'POST',
    keepalive: true,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  }).catch(() => {})
}

/** Oturumun ilk sayfasında dışarıdan gelinen site; sonraki sayfalarda yok. */
export function entryReferrer() {
  try {
    if (sessionStorage.getItem('bx-ref-done')) return null
    sessionStorage.setItem('bx-ref-done', '1')
  } catch {
    // depolama kapalıysa her seferinde dene
  }
  const params = new URLSearchParams(location.search)
  const utm = params.get('utm_source') || params.get('ref')
  if (utm) return utm.toLowerCase()
  try {
    const host = new window.URL(document.referrer).hostname.replace(/^www\./, '')
    if (!host || host === location.hostname.replace(/^www\./, '')) return 'direct'
    if (/(^|\.)lnkd\.in$|linkedin/.test(host)) return 'linkedin'
    if (/google\./.test(host)) return 'google'
    if (/(^|\.)t\.co$|twitter|x\.com/.test(host)) return 'x'
    if (/github/.test(host)) return 'github'
    return host
  } catch {
    return 'direct'
  }
}
