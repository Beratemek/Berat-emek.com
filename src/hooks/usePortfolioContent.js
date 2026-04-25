import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const EMPTY = { profile: null, blogPosts: [], projectPosts: [], contact: [], loading: true }

export function usePortfolioContent() {
  const [data, setData] = useState(EMPTY)

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
      setData({
        profile: profileRes.data || null,
        blogPosts: allPosts.filter((p) => p.kind === 'blog'),
        projectPosts: allPosts.filter((p) => p.kind === 'project'),
        contact: contactRes.data || [],
        loading: false,
      })
    })()
    return () => {
      cancel = true
    }
  }, [])

  return data
}