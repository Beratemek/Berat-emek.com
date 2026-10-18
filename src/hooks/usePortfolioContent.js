import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { loadTranslations, translatePost } from '../lib/translations.js'
import { useI18n } from '../i18n/I18nProvider.jsx'

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
  const { lang } = useI18n()
  const [data, setData] = useState(() => {
    const cached = readCache()
    return cached ? { ...cached, loading: false } : EMPTY
  })
  const [translations, setTranslations] = useState({ lang: 'tr', map: new Map() })

  useEffect(() => {
    let cancel = false
    // Veritabanı yavaşsa ya da kapalıysa sayfa iskelette takılı kalmasın:
    // 2,5 sn içinde cevap gelmezse yedek içerik gösterilir, gerçek veri sonra gelirse yerine geçer.
    const fallbackTimer = setTimeout(() => {
      if (!cancel) setData((d) => (d.loading ? { ...d, loading: false } : d))
    }, 2500)
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

      clearTimeout(fallbackTimer)
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
      clearTimeout(fallbackTimer)
    }
  }, [])

  // Seçili dil Türkçe değilse yazı/proje başlık, özet ve etiketlerinin çevirileri
  const ids = useMemo(() => [...data.blogPosts, ...data.projectPosts].map((p) => p.id).filter(Boolean), [data.blogPosts, data.projectPosts])
  useEffect(() => {
    let cancel = false
    if (lang === 'tr' || !ids.length) {
      setTranslations({ lang, map: new Map() })
      return
    }
    loadTranslations(lang, ids).then((map) => {
      if (!cancel) setTranslations({ lang, map })
    })
    return () => {
      cancel = true
    }
  }, [lang, ids])

  return useMemo(() => {
    if (translations.lang !== lang || lang === 'tr') return data
    const tr = (p) => translatePost(p, translations.map.get(p.id), lang)
    return { ...data, blogPosts: data.blogPosts.map(tr), projectPosts: data.projectPosts.map(tr) }
  }, [data, translations, lang])
}
