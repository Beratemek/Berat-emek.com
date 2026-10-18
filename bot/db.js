// Supabase REST API (paket gerektirmez). Bot "service role" anahtarıyla yazar;
// bu anahtar sadece GitHub Secrets'ta durur, sitede ASLA kullanılmaz.

function config() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY tanımlı olmalı')
  return { url: url.replace(/\/$/, ''), key }
}

export async function rest(path, { method = 'GET', body, prefer } = {}) {
  const { url, key } = config()
  const headers = { apikey: key, 'Content-Type': 'application/json' }
  // Eski tip (JWT) anahtarlar Authorization başlığı da ister; yeni "sb_secret_" anahtarlar istemez
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`
  if (prefer) headers.Prefer = prefer

  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  })
  const text = await res.text()
  if (!res.ok) {
    const err = new Error(`Supabase ${res.status}: ${text.slice(0, 300)}`)
    err.status = res.status
    err.code = (() => { try { return JSON.parse(text).code } catch { return undefined } })()
    throw err
  }
  return text ? JSON.parse(text) : null
}

/** Kapak görselini sitenin depolama alanına (covers) yükler, herkese açık adresini döndürür. */
export async function uploadCover(path, buffer, contentType = 'image/png') {
  const { url, key } = config()
  const headers = { apikey: key, 'Content-Type': contentType, 'x-upsert': 'true', 'Cache-Control': 'max-age=31536000' }
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`
  const res = await fetch(`${url}/storage/v1/object/covers/${path}`, { method: 'POST', headers, body: buffer, signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error(`Kapak yüklenemedi (${res.status}): ${(await res.text()).slice(0, 200)}`)
  return `${url}/storage/v1/object/public/covers/${path}`
}

export function hasDb() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export async function recentBriefs(days = 7) {
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10)
  return rest(
    `daily_briefs?select=brief_date,headline,decision,status,post_id,linkedin_text,linkedin_comment,check_notes,facts,stats,topics&brief_date=gte.${since}&order=brief_date.desc`
  )
}

/** Sitede son günlerde yayınlanan blog yazıları (paylaşılmış mı, hazır mı ayrımı için). */
export async function recentPosts(days = 14) {
  const since = new Date(Date.now() - days * 864e5).toISOString()
  return rest(`posts?kind=eq.blog&published=eq.true&created_at=gte.${since}&select=id,title,slug&order=created_at.desc`)
}

/** Blog taslağını yayınlanmamış olarak ekler. Slug çakışırsa sonuna kısa bir ek koyar. */
export async function insertDraftPost(post) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const slug = attempt === 0 ? post.slug : `${post.slug}-${Date.now().toString(36).slice(-4)}`
    try {
      const rows = await rest('posts', {
        method: 'POST',
        body: { ...post, slug, kind: 'blog', published: false },
        prefer: 'return=representation',
      })
      return rows[0]
    } catch (e) {
      if (e.code !== '23505') throw e // 23505 = unique ihlali (slug)
    }
  }
  throw new Error('Taslak için benzersiz slug üretilemedi')
}

/** Aynı gün tekrar çalışırsa o günün kaydını günceller. */
export async function upsertBrief(brief) {
  const rows = await rest('daily_briefs?on_conflict=brief_date', {
    method: 'POST',
    body: brief,
    prefer: 'resolution=merge-duplicates,return=representation',
  })
  return rows[0]
}
