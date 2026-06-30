import { useCallback, useState } from 'react'
import Scene from './scene/Scene.jsx'
import OverlayUI from './ui/OverlayUI.jsx'
import { usePortfolioContent } from './hooks/usePortfolioContent.js'

export default function PortfolioApp() {
  const [activeSection, setActiveSection] = useState(null)
  const [theme, setTheme] = useState('night')
  const content = usePortfolioContent()

  const handleSelect = useCallback((id) => setActiveSection(id), [])
  const handleClose = useCallback(() => setActiveSection(null), [])
  const toggleTheme = useCallback(
    () => setTheme((t) => (t === 'day' ? 'night' : 'day')),
    []
  )

  return (
    <>
      <Scene
        activeSection={activeSection}
        onSelect={handleSelect}
        theme={theme}
        content={content}
      />
      <OverlayUI
        activeSection={activeSection}
        onClose={handleClose}
        theme={theme}
        onToggleTheme={toggleTheme}
        content={content}
      />

      {/* Sol-alt: sevgilime özel bağımsız sayfa (statik /sevgilim) */}
      <a
        href="/sevgilim/"
        aria-label="Sevgilime özel"
        title="Sevgilime özel 💖"
        style={{
          position: 'fixed',
          left: 'clamp(14px, 3vw, 28px)',
          bottom: 'clamp(14px, 3vw, 28px)',
          zIndex: 6,
          width: 48,
          height: 48,
          borderRadius: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          lineHeight: 1,
          textDecoration: 'none',
          background: 'rgba(244,114,182,0.16)',
          border: '1px solid rgba(244,114,182,0.42)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          boxShadow: '0 6px 22px rgba(244,114,182,0.32)',
          cursor: 'pointer',
          transition: 'transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease',
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.06)'
          e.currentTarget.style.background = 'rgba(244,114,182,0.28)'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0) scale(1)'
          e.currentTarget.style.background = 'rgba(244,114,182,0.16)'
        }}
      >
        💖
      </a>
    </>
  )
}