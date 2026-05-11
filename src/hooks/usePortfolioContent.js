import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const EMPTY = { profile: null, blogPosts: [], projectPosts: [], contact: [], loading: true }

const CACHE_KEY = 'portfolio_content_v1'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 dakika

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    if (Date.now() - parsed.t > CACHE_TTL_MS) return null
    return parsed.d
  } catch {
    return null
  }
}

function writeCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), d: data }))
  } catch {
    // sessionStorage doluysa veya erişim engeli varsa sessizce yoksay
  }
}

export function usePortfolioContent() {
  const [data, setData] = useState(() => {
    const cached = readCache()
    return cached ? { ...cached, loading: false } : EMPTY
  })

  useEffect(() => {
    let cancel = false
    ;(async () => {
      const [profileRes, postsRes, contactRes] = await Promise.all([
        supabase.from('profile').select('*').eq('id', 1).maybeSingle(),
        supabase
          .from('posts')
          .select('*')
          .eq('published', true)
          .order('created_at', { ascending: false }),
        supabase.from('contact_links').select('*').order('position'),
      ])

      if (cancel) return

      const allPosts = postsRes.data || []
      const fresh = {
        profile: profileRes.data || null,
        blogPosts: allPosts.filter((p) => p.kind === 'blog'),
        projectPosts: allPosts.filter((p) => p.kind === 'project'),
        contact: contactRes.data || [],
      }
      writeCache(fresh)
      setData({ ...fresh, loading: false })
    })()
    return () => {
      cancel = true
    }
  }, [])

  return data
}
