import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DICT, LANGS } from './translations.js'

const STORAGE_KEY = 'site-lang'
const I18nContext = createContext(null)

function detectLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && DICT[saved]) return saved
  } catch {
    // Depolama kapalıysa tarayıcı diline bak
  }
  const prefs = navigator.languages?.length ? navigator.languages : [navigator.language || 'tr']
  return prefs.map((l) => l.slice(0, 2).toLowerCase()).find((l) => DICT[l]) || 'tr'
}

function lookup(dict, path) {
  return path.split('.').reduce((node, key) => (node == null ? undefined : node[key]), dict)
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((code) => {
    if (!DICT[code]) return
    setLangState(code)
    try {
      localStorage.setItem(STORAGE_KEY, code)
    } catch {
      // Tercih kaydedilemezse bu oturumla sınırlı kalır
    }
  }, [])

  const value = useMemo(() => {
    const locale = LANGS.find((l) => l.code === lang)?.locale || 'tr-TR'
    /** t('hero.headline') · t('radar.sources', { n: 3 }) — eksik çeviride Türkçeye düşer */
    const t = (path, vars) => {
      let value = lookup(DICT[lang], path)
      if (value === undefined) value = lookup(DICT.tr, path)
      if (value === undefined) return path
      if (typeof value === 'string' && vars) {
        return value.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m))
      }
      return value
    }
    return { lang, locale, setLang, t }
  }, [lang, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n, I18nProvider içinde kullanılmalı')
  return ctx
}
