import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { track, entryReferrer } from '../lib/analytics.js'

const READ_STEPS = [25, 50, 75, 100]

/**
 * Görünmez bileşen: sayfa görüntüleme, okuma derinliği, sayfada kalma süresi ve
 * tıklamaları (iletişim, dışarı giden linkler, data-track işaretli düğmeler) kaydeder.
 */
export default function AnalyticsTracker() {
  const { pathname } = useLocation()

  // Sayfa görüntüleme + okuma derinliği + aktif süre
  useEffect(() => {
    if (pathname.startsWith('/admin')) return
    track('pageview', { detail: entryReferrer(), path: pathname })

    const isPost = /^\/(blog|project)\//.test(pathname)
    const sent = new Set()
    let visibleSince = document.visibilityState === 'visible' ? Date.now() : null
    let activeMs = 0

    const measure = () => {
      if (!isPost) return
      const el = document.documentElement
      const depth = ((window.scrollY + window.innerHeight) / Math.max(el.scrollHeight, 1)) * 100
      for (const step of READ_STEPS) {
        if (depth >= step - 2 && !sent.has(step)) {
          sent.add(step)
          track('read', { value: step, path: pathname })
        }
      }
    }
    const flush = () => {
      if (visibleSince) {
        activeMs += Date.now() - visibleSince
        visibleSince = null
      }
      const seconds = Math.round(activeMs / 1000)
      if (seconds >= 3) track('engaged', { value: Math.min(seconds, 3600), path: pathname })
      activeMs = 0
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
      else visibleSince = Date.now()
    }
    // İçerik geç yüklenebilir; kısa yazılarda kaydırmadan sona ulaşılmış olabilir
    const late = setTimeout(measure, 2500)

    window.addEventListener('scroll', measure, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearTimeout(late)
      window.removeEventListener('scroll', measure)
      document.removeEventListener('visibilitychange', onVisibility)
      flush()
    }
  }, [pathname])

  // Tıklamalar: data-track="tür:ayrıntı" > e-posta > dışarı giden link
  useEffect(() => {
    const onClick = (e) => {
      if (location.pathname.startsWith('/admin')) return
      const el = e.target.closest?.('a, [data-track]')
      if (!el) return
      const tag = el.getAttribute('data-track')
      if (tag) {
        const [type, detail] = tag.split(':')
        track(type, { detail })
        return
      }
      const href = el.getAttribute('href') || ''
      if (href.startsWith('mailto:')) {
        track('contact', { detail: 'email' })
        return
      }
      if (/^https?:\/\//.test(href)) {
        try {
          const host = new URL(href).hostname.replace(/^www\./, '')
          if (host !== location.hostname.replace(/^www\./, '')) track('outbound', { detail: host })
        } catch {
          // geçersiz link: yok say
        }
      }
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  return null
}
