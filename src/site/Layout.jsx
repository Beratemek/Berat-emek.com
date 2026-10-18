import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Languages, Moon, Sun, Check } from 'lucide-react'
import { SITE } from '../data/site.js'
import { LANGS } from '../i18n/translations.js'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { useTheme } from './theme.js'

/** Sayfa değişince başa dön; /#projeler gibi bağlantılarda ilgili bölüme kaydır. */
function useScrollOnNavigate() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return
    }
    const id = decodeURIComponent(hash.slice(1))
    let tries = 0
    let timer
    const tryScroll = () => {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      else if (tries++ < 20) timer = setTimeout(tryScroll, 100)
    }
    tryScroll()
    return () => clearTimeout(timer)
  }, [pathname, hash])
}

function useScrolled(threshold = 40) {
  const [scrolled, setScrolled] = useState(() => window.scrollY > threshold)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [threshold])
  return scrolled
}

function LangMenu() {
  const { lang, setLang, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="lang-menu" ref={ref}>
      <button
        type="button"
        className="icon-btn"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={t('ui.language')}
        onClick={() => setOpen((o) => !o)}
      >
        <Languages size={16} />
        <span className="lang-code">{lang.toUpperCase()}</span>
      </button>
      {open && (
        <ul className="lang-list">
          {LANGS.map((l) => (
            <li key={l.code}>
              <button
                type="button"
                lang={l.code}
                className={l.code === lang ? 'is-active' : ''}
                onClick={() => {
                  setLang(l.code)
                  setOpen(false)
                }}
              >
                <span>{l.native}</span>
                {l.code === lang ? <Check size={14} /> : <span className="lang-code">{l.code.toUpperCase()}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ThemeToggle() {
  const { t } = useI18n()
  const [theme, toggle] = useTheme()
  const label = theme === 'dark' ? t('ui.toLight') : t('ui.toDark')
  return (
    <button type="button" className="icon-btn" onClick={toggle} aria-label={label} title={label}>
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}

/** overlay: ana sayfada başlık, koyu giriş alanının üstünde şeffaf durur. */
export default function Layout({ children, overlay = false }) {
  useScrollOnNavigate()
  const { t } = useI18n()
  const scrolled = useScrolled()
  const headerClass = ['site-header', overlay && 'is-fixed', overlay && !scrolled && 'is-overlay'].filter(Boolean).join(' ')

  return (
    <div className="site">
      <a href="#icerik" className="skip-link">{t('nav.skip')}</a>

      <header className={headerClass}>
        <div className="wrap header-inner">
          <Link to="/" className="brand" aria-label={SITE.name}>
            <span className="brand-mark" aria-hidden>BE</span>
            <span className="brand-name">{SITE.name}</span>
          </Link>
          <div className="header-right">
            <nav className="nav" aria-label={t('nav.main')}>
              <NavLink to="/blog">{t('nav.posts')}</NavLink>
              <Link to="/#projeler" className="hide-sm">{t('nav.projects')}</Link>
              <Link to="/#hakkimda" className="hide-md">{t('nav.about')}</Link>
              <Link to="/#iletisim" className="nav-cta">{t('nav.contact')}</Link>
            </nav>
            <LangMenu />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="icerik">{children}</main>

      <footer className="site-footer">
        <div className="wrap footer-inner">
          <span>© {new Date().getFullYear()} {SITE.name} · Full-Stack &amp; AI Developer</span>
          <nav className="footer-links" aria-label={t('nav.footer')}>
            <Link to="/blog">{t('nav.posts')}</Link>
            <Link to="/#projeler">{t('nav.projects')}</Link>
            <Link to="/#iletisim">{t('nav.contact')}</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
