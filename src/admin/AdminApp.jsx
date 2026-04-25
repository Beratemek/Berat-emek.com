import { useEffect } from 'react'
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { FileText, FolderGit2, User, Phone, LogOut, Loader2 } from 'lucide-react'

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