import { useCallback, useState } from 'react'

const STORAGE_KEY = 'site-theme'

// İlk tema index.html'deki küçük betikle sayfa çizilmeden önce ayarlanır
// (yanıp sönme olmasın diye); bu kanca sadece okur ve değiştirir.
export function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light')

  const toggle = useCallback(() => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Tercih kaydedilemezse bu oturumla sınırlı kalır
    }
    setTheme(next)
  }, [])

  return [theme, toggle]
}
