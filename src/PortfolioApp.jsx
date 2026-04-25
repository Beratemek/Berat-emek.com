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
    </>
  )
}