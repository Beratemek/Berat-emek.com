import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, LayoutDashboard, Newspaper, FileText, FolderGit2, User, Phone, Settings,
  Plus, ExternalLink, SunMoon, CornerDownLeft,
} from 'lucide-react'
import { useAdminData } from '../AdminData.jsx'

const GROUP_ORDER = ['Sayfalar', 'Eylemler', 'Yazılar', 'Projeler']
const norm = (s) => String(s || '').toLocaleLowerCase('tr-TR')

/** Ctrl/⌘+K ile açılan komut paleti: sayfalara, işlemlere ve yazılara klavyeden atla. */
export default function CommandPalette({ open, onClose, onToggleTheme }) {
  const navigate = useNavigate()
  const { posts } = useAdminData()
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const items = useMemo(() => {
    const go = (to) => () => navigate(to)
    const all = [
      { group: 'Sayfalar', icon: LayoutDashboard, label: 'Genel Bakış', run: go('/admin') },
      { group: 'Sayfalar', icon: Newspaper, label: 'Bugün — botun özeti', run: go('/admin/today') },
      { group: 'Sayfalar', icon: FileText, label: 'Yazılar', run: go('/admin/posts') },
      { group: 'Sayfalar', icon: FolderGit2, label: 'Projeler', run: go('/admin/projects') },
      { group: 'Sayfalar', icon: User, label: 'Hakkımda', run: go('/admin/about') },
      { group: 'Sayfalar', icon: Phone, label: 'İletişim', run: go('/admin/contact') },
      { group: 'Sayfalar', icon: Settings, label: 'Ayarlar', run: go('/admin/settings') },
      { group: 'Eylemler', icon: Plus, label: 'Yeni blog yazısı', run: go('/admin/posts/new?kind=blog') },
      { group: 'Eylemler', icon: Plus, label: 'Yeni proje', run: go('/admin/posts/new?kind=project') },
      { group: 'Eylemler', icon: ExternalLink, label: 'Siteyi yeni sekmede aç', run: () => window.open('/', '_blank') },
      { group: 'Eylemler', icon: SunMoon, label: 'Temayı değiştir (aydınlık / karanlık)', run: onToggleTheme },
      ...posts.map((p) => ({
        group: p.kind === 'project' ? 'Projeler' : 'Yazılar',
        icon: p.kind === 'project' ? FolderGit2 : FileText,
        label: p.title || '(başlıksız)',
        meta: p.published ? 'Yayında' : 'Taslak',
        id: p.id,
        run: go(`/admin/posts/${p.id}`),
      })),
    ]
    const q = norm(query).trim()
    const filtered = q
      ? all.filter((i) => norm(i.label).includes(q) || norm(i.group).includes(q))
      : [
          ...all.filter((i) => i.group === 'Sayfalar' || i.group === 'Eylemler'),
          ...all.filter((i) => i.group === 'Yazılar').slice(0, 5),
        ]
    // Gruplar her zaman aynı sırada; klavye sırası görünen sırayla aynı olsun
    return filtered
      .map((item, i) => ({ item, i }))
      .sort((a, b) => GROUP_ORDER.indexOf(a.item.group) - GROUP_ORDER.indexOf(b.item.group) || a.i - b.i)
      .map(({ item }) => item)
  }, [query, posts, navigate, onToggleTheme])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setIndex(0)
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => setIndex(0), [query])

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [index])

  if (!open) return null

  const run = (item) => {
    onClose()
    item.run?.()
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setIndex((i) => Math.min(items.length - 1, i + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setIndex((i) => Math.max(0, i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (items[index]) run(items[index])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const groups = [...new Set(items.map((i) => i.group))]

  return (
    <div className="cmdk-overlay" onMouseDown={onClose}>
      <div className="cmdk" role="dialog" aria-modal="true" aria-label="Komut paleti" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cmdk-input">
          <Search size={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Sayfa, yazı ya da işlem ara…"
            aria-label="Ara"
          />
          <kbd>Esc</kbd>
        </div>
        <div className="cmdk-list" ref={listRef}>
          {items.length === 0 && <div className="cmdk-empty">"{query}" için sonuç yok</div>}
          {groups.map((group) => (
            <div key={group} className="cmdk-group">
              <div className="cmdk-group-label">{group}</div>
              {items
                .filter((i) => i.group === group)
                .map((item) => {
                  const position = items.indexOf(item)
                  const active = position === index
                  const Icon = item.icon
                  return (
                    <button
                      key={`${group}-${item.id || item.label}`}
                      type="button"
                      className="cmdk-item"
                      data-active={active}
                      onMouseMove={() => position !== index && setIndex(position)}
                      onClick={() => run(item)}
                    >
                      <Icon size={16} />
                      <span className="cmdk-label">{item.label}</span>
                      {item.meta && <span className={`cmdk-meta ${item.meta === 'Yayında' ? 'is-live' : ''}`}>{item.meta}</span>}
                      {active && <CornerDownLeft size={14} className="cmdk-enter" />}
                    </button>
                  )
                })}
            </div>
          ))}
        </div>
        <div className="cmdk-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> gez</span>
          <span><kbd>Enter</kbd> aç</span>
          <span><kbd>Ctrl</kbd> <kbd>K</kbd> aç / kapat</span>
        </div>
      </div>
    </div>
  )
}
