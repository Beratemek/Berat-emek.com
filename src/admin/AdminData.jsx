import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

// Panelin ortak verisi: yazılar/projeler ve botun günlük özetleri.
// Genel Bakış, Yazılar listesi, komut paleti ve kenar menüsü aynı veriyi kullanır.
const AdminDataContext = createContext(null)

const POST_FIELDS = 'id, kind, title, slug, excerpt, tags, cover, cover_position, published, created_at, updated_at'

export function AdminDataProvider({ children }) {
  const [state, setState] = useState({ posts: [], briefs: [], loading: true, error: null, briefsMissing: false })

  const refresh = useCallback(async () => {
    const since = new Date(Date.now() - 200 * 864e5).toISOString().slice(0, 10)
    const [postsRes, briefsRes] = await Promise.all([
      supabase.from('posts').select(POST_FIELDS).order('created_at', { ascending: false }),
      supabase
        .from('daily_briefs')
        .select('id, brief_date, decision, status, headline, score, reason')
        .gte('brief_date', since)
        .order('brief_date', { ascending: false }),
    ])
    setState({
      posts: postsRes.data || [],
      briefs: briefsRes.error ? [] : briefsRes.data || [],
      // Bot tablosu henüz kurulmadıysa panel yine çalışsın
      briefsMissing: Boolean(briefsRes.error),
      error: postsRes.error?.message || null,
      loading: false,
    })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  /** Tek bir yazıyı yerelde güncelle (ör. yayın anahtarı) — yeniden yüklemeden */
  const patchPost = useCallback((id, patch) => {
    setState((s) => ({ ...s, posts: s.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)) }))
  }, [])

  const removePost = useCallback((id) => {
    setState((s) => ({ ...s, posts: s.posts.filter((p) => p.id !== id) }))
  }, [])

  return (
    <AdminDataContext.Provider value={{ ...state, refresh, patchPost, removePost }}>
      {children}
    </AdminDataContext.Provider>
  )
}

export function useAdminData() {
  const ctx = useContext(AdminDataContext)
  if (!ctx) throw new Error('useAdminData, AdminDataProvider içinde kullanılmalı')
  return ctx
}

/** Türkiye saatine göre YYYY-MM-DD */
export const istanbulDay = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date(date))
