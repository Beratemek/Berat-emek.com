import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PortfolioApp from './PortfolioApp.jsx'
import AdminApp from './admin/AdminApp.jsx'
import { AuthProvider } from './admin/AuthProvider.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<PortfolioApp />} />
          <Route path="/admin/*" element={<AdminApp />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}