import { useCallback, useEffect, useState } from 'react'
import { Routes, Route, NavLink, Navigate, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Newspaper, FileText, FolderGit2, User, Phone, Settings, LogOut,
  Loader2, Search, Menu, X, Sun, Moon, Plus, ExternalLink, ShieldAlert,
} from 'lucide-react'

import './admin.css'
import { useAuth, signOut } from './AuthProvider.jsx'
import { AdminDataProvider, useAdminData, istanbulDay } from './AdminData.jsx'
import { useTheme } from '../site/theme.js'
import Login from './Login.jsx'
import CommandPalette from './components/CommandPalette.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import TodayPage from './pages/TodayPage.jsx'
import PostsList from './pages/PostsList.jsx'
import PostEditor from './pages/PostEditor.jsx'
import AboutEditor from './pages/AboutEditor.jsx'
import ContactEditor from './pages/ContactEditor.jsx'

const ADMIN_EMAIL = 'emekberat19@gmail.com'

export default function AdminApp() {
  // Site sayfaları gövdeyi kaydırmaya kapatabiliyor; panelde tam kaydırma aç
  useEffect(() => {
    document.body.classList.add('admin-mode')
    const root = document.getElementById('root')
    const prev = { overflow: document.body.style.overflow, height: document.body.style.height }
    document.body.style.overflow = 'auto'
    document.body.style.height = 'auto'
    return () => {
      document.body.classList.remove('admin-mode')
      document.body.style.overflow = prev.overflow
      document.body.style.height = prev.height
      if (root) {
        root.style.overflow = ''
        root.style.height = ''
      }
    }
  }, [])

  const { session, user, loading } = useAuth()

  if (loading) {
    return (
      <div className="admin-root admin-center">
        <Loader2 size={28} className="spin" />
      </div>
    )
  }

  if (!session) return <Login />

  // Sadece izinli e-posta panele girebilir (asıl koruma veritabanındaki RLS kurallarında)
  if (user?.email !== ADMIN_EMAIL) {
    return (
      <div className="admin-root admin-center">
        <div className="admin-card denied">
          <ShieldAlert size={28} />
          <h1>Yetkisiz erişim</h1>
          <p>
            Bu panel yalnızca site yöneticisine açık. <strong>{user?.email}</strong> hesabının erişim yetkisi yok.
          </p>
          <button
            className="btn btn-primary"
            onClick={async () => {
              await signOut()
              window.location.reload()
            }}
          >
            Çıkış yap
          </button>
        </div>
      </div>
    )
  }

  return (
    <AdminDataProvider>
      <Shell />
    </AdminDataProvider>
  )
}

function Shell() {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [theme, toggleTheme] = useTheme()
  const location = useLocation()

  // Ctrl/⌘ + K → komut paleti
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Sayfa değişince telefondaki menüyü kapat
  useEffect(() => setMenuOpen(false), [location.pathname])

  const closePalette = useCallback(() => setPaletteOpen(false), [])

  return (
    <div className={`admin-root admin-shell${menuOpen ? ' menu-open' : ''}`}>
      <Sidebar onNavigate={() => setMenuOpen(false)} />
      <div className="sidebar-scrim" onClick={() => setMenuOpen(false)} aria-hidden />

      <div className="admin-body">
        <header className="admin-topbar">
          <button type="button" className="icon-button only-mobile" onClick={() => setMenuOpen(true)} aria-label="Menüyü aç">
            <Menu size={18} />
          </button>
          <button type="button" className="search-trigger" onClick={() => setPaletteOpen(true)}>
            <Search size={16} />
            <span>Ara ya da bir işlem seç…</span>
            <kbd>Ctrl K</kbd>
          </button>
          <div className="topbar-actions">
            <button
              type="button"
              className="icon-button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Aydınlık moda geç' : 'Karanlık moda geç'}
              title={theme === 'dark' ? 'Aydınlık mod' : 'Karanlık mod'}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <Link to="/admin/posts/new?kind=blog" className="btn btn-primary btn-sm hide-mobile">
              <Plus size={15} /> Yeni yazı
            </Link>
          </div>
        </header>

        <main className="admin-main">
          <Routes>
            <Route index element={<DashboardPage />} />
            <Route path="today" element={<TodayPage />} />
            <Route path="posts" element={<PostsList />} />
            <Route path="posts/new" element={<PostEditor />} />
            <Route path="posts/:id" element={<PostEditor />} />
            <Route path="projects" element={<PostsList filterKind="project" />} />
            <Route path="about" element={<AboutEditor />} />
            <Route path="contact" element={<ContactEditor />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={closePalette} onToggleTheme={toggleTheme} />
    </div>
  )
}

function Sidebar({ onNavigate }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { posts, briefs } = useAdminData()
  const today = istanbulDay()
  const brief = briefs.find((b) => b.brief_date === today)
  const shareToday = brief?.decision === 'paylas' && brief.status === 'bekliyor'
  const drafts = posts.filter((p) => !p.published && p.kind === 'blog').length

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin')
  }

  const item = (to, Icon, label, extra, end) => (
    <NavLink to={to} end={end} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} onClick={onNavigate}>
      <Icon size={18} />
      <span>{label}</span>
      {extra}
    </NavLink>
  )

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-brand">
        <span className="sidebar-mark">BE</span>
        <div>
          <div className="sidebar-name">Berat Emek</div>
          <div className="sidebar-sub">Yönetim paneli</div>
        </div>
        <button type="button" className="icon-button only-mobile sidebar-close" onClick={onNavigate} aria-label="Menüyü kapat">
          <X size={18} />
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Panel menüsü">
        <div className="nav-label">Genel</div>
        {item('/admin', LayoutDashboard, 'Genel Bakış', null, true)}
        {item('/admin/today', Newspaper, 'Bugün', shareToday ? <span className="nav-dot" title="Bugün paylaşım önerisi var" /> : null)}

        <div className="nav-label">İçerik</div>
        {item('/admin/posts', FileText, 'Yazılar', drafts ? <span className="nav-count">{drafts}</span> : null)}
        {item('/admin/projects', FolderGit2, 'Projeler')}

        <div className="nav-label">Site</div>
        {item('/admin/about', User, 'Hakkımda')}
        {item('/admin/contact', Phone, 'İletişim')}
        {item('/admin/settings', Settings, 'Ayarlar')}
        <a href="/" target="_blank" rel="noreferrer" className="nav-item">
          <ExternalLink size={18} />
          <span>Siteyi aç</span>
        </a>
      </nav>

      <div className="sidebar-user">
        <span className="avatar">B</span>
        <div className="sidebar-user-text">
          <div className="sidebar-user-name">Berat</div>
          <div className="sidebar-user-mail">{user?.email}</div>
        </div>
        <button type="button" className="icon-button" onClick={handleSignOut} aria-label="Çıkış yap" title="Çıkış yap">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}

function SettingsPage() {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [msg, setMsg] = useState(null)
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMsg(null)
    setErr(null)
    if (pw.length < 6) return setErr('Şifre en az 6 karakter olmalı.')
    if (pw !== pw2) return setErr('Şifreler eşleşmiyor.')

    setLoading(true)
    try {
      const { supabase } = await import('../lib/supabase.js')
      const { error } = await supabase.auth.updateUser({ password: pw })
      if (error) throw error
      setMsg('Şifre güncellendi. Artık şifreyle giriş yapabilirsin.')
      setPw('')
      setPw2('')
    } catch (e) {
      setErr(e.message || 'Şifre güncellenemedi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="page-kicker">Hesap</div>
      <h1>Ayarlar</h1>
      <p className="page-desc">Şifre belirleyerek sihirli link yerine şifreyle giriş yapabilirsin.</p>

      <div className="admin-card narrow-card">
        <h3>Şifre belirle</h3>
        {msg && <div className="alert ok">{msg}</div>}
        {err && <div className="alert err">{err}</div>}
        <form onSubmit={handleSubmit} className="admin-form">
          <label>
            Yeni şifre
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="En az 6 karakter" required />
          </label>
          <label>
            Şifre tekrar
            <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} placeholder="Aynı şifreyi tekrar gir" required />
          </label>
          <div>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Kaydediliyor…' : 'Şifreyi kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
