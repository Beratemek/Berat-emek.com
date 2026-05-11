import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import PortfolioApp from './PortfolioApp.jsx'
import { AuthProvider } from './admin/AuthProvider.jsx'

const PostPage = lazy(() => import('./pages/PostPage.jsx'))
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))

function RouteFallback() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(180deg, #f8f7fc 0%, #fff 40%)',
      color: '#7c3aed', fontFamily: "'Inter', system-ui, sans-serif",
      fontSize: 14, fontWeight: 600,
    }}>
      Yükleniyor…
    </div>
  )
}

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<PortfolioApp />} />
              <Route path="/blog/:slug" element={<PostPage />} />
              <Route path="/project/:slug" element={<PostPage />} />
              <Route path="/admin/*" element={<AdminApp />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  )
}
