import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { FileText, FolderGit2, User, Phone, LogOut, Loader2, Settings } from 'lucide-react'

import './admin.css'
import { useAuth, signOut } from './AuthProvider.jsx'
import Login from './Login.jsx'
import PostsList from './pages/PostsList.jsx'
import PostEditor from './pages/PostEditor.jsx'
import AboutEditor from './pages/AboutEditor.jsx'
import ContactEditor from './pages/ContactEditor.jsx'

export default function AdminApp() {
  useEffect(() => {
    document.body.classList.add('admin-mode')
    const prev = {
      bg: document.body.style.background,
      color: document.body.style.color,
      overflow: document.body.style.overflow,
      height: document.body.style.height,
      htmlOverflow: document.documentElement.style.overflow,
    }
    const root = document.getElementById('root')
    const prevRoot = { overflow: root?.style.overflow, height: root?.style.height }

    document.body.style.background = '#f7f6fb'
    document.body.style.color = '#1c1633'
    document.body.style.overflow = 'auto'
    document.body.style.height = 'auto'
    document.documentElement.style.overflow = 'auto'
    if (root) {
      root.style.overflow = 'auto'
      root.style.height = 'auto'
    }

    return () => {
      document.body.classList.remove('admin-mode')
      document.body.style.background = prev.bg
      document.body.style.color = prev.color
      document.body.style.overflow = prev.overflow
      document.body.style.height = prev.height
      document.documentElement.style.overflow = prev.htmlOverflow
      if (root) {
        root.style.overflow = prevRoot.overflow ?? ''
        root.style.height = prevRoot.height ?? ''
      }
    }
  }, [])

  const ADMIN_EMAIL = 'emekberat19@gmail.com'
  const { session, user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f7f6fb' }}>
        <Loader2 size={32} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (!session) return <Login />

  // Sadece izinli e-posta admin paneline erişebilir
  if (user?.email !== ADMIN_EMAIL) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: '#f7f6fb',
        color: '#1c1633', fontFamily: "'Inter', sans-serif", gap: 16, padding: 24,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 48 }}>🚫</div>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>Yetkisiz Erişim</h1>
        <p style={{ color: '#666', maxWidth: 360 }}>
          Bu panel yalnızca site yöneticisine açıktır.<br />
          <strong>{user?.email}</strong> hesabının erişim yetkisi yok.
        </p>
        <button
          onClick={async () => { await signOut(); window.location.reload() }}
          style={{
            marginTop: 8, padding: '10px 24px', borderRadius: 8,
            background: '#7c3aed', color: '#fff', border: 'none',
            cursor: 'pointer', fontWeight: 600, fontSize: 14,
          }}
        >
          Çıkış Yap
        </button>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <Sidebar />
      <main className="admin-main">
        <Routes>
          <Route index element={<Navigate to="posts" replace />} />
          <Route path="posts" element={<PostsList />} />
          <Route path="posts/new" element={<PostEditor />} />
          <Route path="posts/:id" element={<PostEditor />} />
          <Route path="projects" element={<PostsList filterKind="project" />} />
          <Route path="about" element={<AboutEditor />} />
          <Route path="contact" element={<ContactEditor />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="posts" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function Sidebar() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    navigate('/admin')
  }

  const navItem = ({ isActive }) => (isActive ? 'active' : '')

  return (
    <aside className="admin-sidebar">
      <div className="brand">Admin Panel</div>
      <div className="brand-name">beratemek</div>

      <NavLink to="/admin/posts" className={navItem}>
        <FileText size={17} /> Blog
      </NavLink>
      <NavLink to="/admin/projects" className={navItem}>
        <FolderGit2 size={17} /> Projeler
      </NavLink>
      <NavLink to="/admin/about" className={navItem}>
        <User size={17} /> Hakkımda
      </NavLink>
      <NavLink to="/admin/contact" className={navItem}>
        <Phone size={17} /> İletişim
      </NavLink>
      <NavLink to="/admin/settings" className={navItem}>
        <Settings size={17} /> Ayarlar
      </NavLink>

      <div className="bottom">
        <div>{user?.email}</div>
        <button className="signout" onClick={handleSignOut}>
          <LogOut size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Çıkış Yap
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

    if (pw.length < 6) {
      setErr('Şifre en az 6 karakter olmalı.')
      return
    }
    if (pw !== pw2) {
      setErr('Şifreler eşleşmiyor.')
      return
    }

    setLoading(true)
    try {
      const { supabase } = await import('../lib/supabase.js')
      const { error } = await supabase.auth.updateUser({ password: pw })
      if (error) throw error
      setMsg('Şifre başarıyla güncellendi! Artık şifre ile giriş yapabilirsin.')
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
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Ayarlar</h1>

      <div style={{
        maxWidth: 420, padding: 28, borderRadius: 14,
        background: '#fff', border: '1px solid #e8e5f0',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Şifre Belirle</h2>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
          Şifre belirleyerek magic link yerine şifre ile giriş yapabilirsin.
        </p>

        {msg && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#ecfdf5', color: '#065f46', fontSize: 13, marginBottom: 12 }}>{msg}</div>}
        {err && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#fef2f2', color: '#991b1b', fontSize: 13, marginBottom: 12 }}>{err}</div>}

        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Yeni Şifre</span>
            <input
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              placeholder="En az 6 karakter"
              required
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 4 }}>Şifre Tekrar</span>
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              placeholder="Aynı şifreyi tekrar gir"
              required
              style={inputStyle}
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px 24px', borderRadius: 8,
              background: '#7c3aed', color: '#fff', border: 'none',
              cursor: 'pointer', fontWeight: 600, fontSize: 14,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Kaydediliyor...' : 'Şifreyi Kaydet'}
          </button>
        </form>
      </div>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid #d4d0e0', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
}