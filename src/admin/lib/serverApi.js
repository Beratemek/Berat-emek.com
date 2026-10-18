import { supabase } from '../../lib/supabase.js'

/**
 * Sitenin sunucu fonksiyonlarına (api/…) admin oturumuyla istek atar.
 * Oturumun süresi dolmuşsa bir kez yenileyip tekrar dener; hata mesajını Türkçe fırlatır.
 */
export async function serverApi(path, { method = 'GET', body } = {}) {
  const call = async () => {
    const { data } = await supabase.auth.getSession()
    return fetch(path, {
      method,
      headers: {
        Authorization: `Bearer ${data.session?.access_token || ''}`,
        ...(body && { 'Content-Type': 'application/json' }),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  }
  let res = await call()
  if (res.status === 401) {
    await supabase.auth.refreshSession().catch(() => {})
    res = await call()
  }
  const out = await res.json().catch(() => ({ error: `Sunucu yanıtı okunamadı (${res.status})` }))
  if (res.status === 401) throw new Error('Oturumun süresi dolmuş; panelden çıkış yapıp yeniden giriş yap.')
  if (!res.ok) throw new Error(out.error || `İstek başarısız (${res.status})`)
  return out
}
