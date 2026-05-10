import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import PortfolioApp from './PortfolioApp.jsx'
import AdminApp from './admin/AdminApp.jsx'
import PostPage from './pages/PostPage.jsx'
import { AuthProvider } from './admin/AuthProvider.jsx'

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<PortfolioApp />} />
            <Route path="/blog/:slug" element={<PostPage />} />
            <Route path="/project/:slug" element={<PostPage />} />
            <Route path="/admin/*" element={<AdminApp />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  )
}
