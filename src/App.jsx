import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import HomePage from './pages/HomePage.jsx'
import { AuthProvider } from './admin/AuthProvider.jsx'
import { I18nProvider } from './i18n/I18nProvider.jsx'
import AnalyticsTracker from './site/AnalyticsTracker.jsx'

const BlogPage = lazy(() => import('./pages/BlogPage.jsx'))
const PostPage = lazy(() => import('./pages/PostPage.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'))

function RouteFallback() {
  return <div style={{ minHeight: '100vh', background: 'var(--paper)' }} aria-busy="true" />
}

export default function App() {
  return (
    <HelmetProvider>
      <I18nProvider>
        <BrowserRouter>
          <AnalyticsTracker />
          <AuthProvider>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:slug" element={<PostPage />} />
                <Route path="/project/:slug" element={<PostPage />} />
                <Route path="/admin/*" element={<AdminApp />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </I18nProvider>
    </HelmetProvider>
  )
}
