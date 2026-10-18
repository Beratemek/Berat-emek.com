import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Languages, Moon, Sun, Check, Menu, X, ArrowUpRight } from 'lucide-react'
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

/** Telefonda tüm bağlantıları içeren tam ekran menü (başlığın altında açılır). */
function MobileMenu({ open, onClose }) {
  const { t } = useI18n()
  const { pathname, hash } = useLocation()
  useEffect(() => {
    onClose()
  }, [pathname, hash]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.documentElement.classList.add('menu-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.documentElement.classList.remove('menu-open')
    }
  }, [open, onClose])

  const links = [
    ['/blog', t('nav.posts')],
    ['/#projeler', t('nav.projects')],
    ['/#hakkimda', t('nav.about')],
    ['/#iletisim', t('nav.contact')],
  ]
  return (
    <div id="mobil-menu" className={`mobile-menu${open ? ' is-open' : ''}`} aria-hidden={!open} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <nav aria-label={t('nav.main')}>
        {links.map(([to, label], i) => (
          <Link key={to} to={to} style={{ '--i': i }} tabIndex={open ? 0 : -1} onClick={onClose}>
            <span className="mm-num">0{i + 1}</span>
            {label}
            <ArrowUpRight size={20} />
          </Link>
        ))}
      </nav>
      <div className="mm-foot">
        <a href={SITE.linkedin} target="_blank" rel="noreferrer" tabIndex={open ? 0 : -1}>LinkedIn</a>
        <a href={SITE.github} target="_blank" rel="noreferrer" tabIndex={open ? 0 : -1}>GitHub</a>
        <a href={`mailto:${SITE.email}`} tabIndex={open ? 0 : -1}>{SITE.email}</a>
      </div>
    </div>
  )
}

/** overlay: ana sayfada başlık, koyu giriş alanının üstünde şeffaf durur. */
export default function Layout({ children, overlay = false }) {
  useScrollOnNavigate()
  const { t } = useI18n()
  const scrolled = useScrolled()
  const [menuOpen, setMenuOpen] = useState(false)
  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const headerClass = ['site-header', overlay && 'is-fixed', overlay && !scrolled && !menuOpen && 'is-overlay', menuOpen && 'is-menu'].filter(Boolean).join(' ')

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
              <Link to="/#projeler">{t('nav.projects')}</Link>
              <Link to="/#hakkimda">{t('nav.about')}</Link>
              <Link to="/#iletisim" className="nav-cta">{t('nav.contact')}</Link>
            </nav>
            <LangMenu />
            <ThemeToggle />
            <button
              type="button"
              className="icon-btn menu-btn"
              aria-expanded={menuOpen}
              aria-controls="mobil-menu"
              aria-label={menuOpen ? t('nav.close') : t('nav.menu')}
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>
      <MobileMenu open={menuOpen} onClose={closeMenu} />

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
