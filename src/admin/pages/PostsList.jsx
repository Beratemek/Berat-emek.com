import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Plus, Pencil, Trash2, Search, ExternalLink, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { useAdminData } from '../AdminData.jsx'
import GenCover from '../../site/GenCover.jsx'

const FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'live', label: 'Yayında' },
  { id: 'draft', label: 'Taslak' },
]

const fmtDate = (iso) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
const norm = (s) => String(s || '').toLocaleLowerCase('tr-TR')

export default function PostsList({ filterKind }) {
  const location = useLocation()
  const kind = filterKind ?? (location.pathname.includes('projects') ? 'project' : 'blog')
  const { posts, loading, patchPost, removePost } = useAdminData()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState(null)

  const ofKind = useMemo(() => posts.filter((p) => p.kind === kind), [posts, kind])
  const counts = {
    all: ofKind.length,
    live: ofKind.filter((p) => p.published).length,
    draft: ofKind.filter((p) => !p.published).length,
  }
  const visible = ofKind.filter((p) => {
    if (filter === 'live' && !p.published) return false
    if (filter === 'draft' && p.published) return false
    const q = norm(query).trim()
    return !q || norm(p.title).includes(q) || (p.tags || []).some((t) => norm(t).includes(q))
  })

  async function togglePublish(p) {
    setErr(null)
    setBusy(p.id)
    const next = !p.published
    patchPost(p.id, { published: next }) // anında göster, hata olursa geri al
    const { error } = await supabase.from('posts').update({ published: next }).eq('id', p.id)
    if (error) {
      patchPost(p.id, { published: !next })
      setErr(error.message)
    }
    setBusy(null)
  }

  async function remove(p) {
    if (!confirm(`"${p.title || 'Başlıksız'}" silinsin mi? Bu işlem geri alınamaz.`)) return
    const { error } = await supabase.from('posts').delete().eq('id', p.id)
    if (error) setErr(error.message)
    else removePost(p.id)
  }

  const isBlog = kind === 'blog'

  return (
    <div>
      <div className="admin-page-head">
        <div>
          <div className="page-kicker">İçerik</div>
          <h1>{isBlog ? 'Yazılar' : 'Projeler'}</h1>
          <p className="page-desc">
            {isBlog
              ? 'Yayındaki yazılar ana sayfada ve /blog sayfasında görünür. Botun hazırladığı taslaklar da burada.'
              : 'Yayındaki projeler ana sayfada kart olarak görünür; kapak görseli eklersen kartta çıkar.'}
          </p>
        </div>
        <Link to={`/admin/posts/new?kind=${kind}`} className="btn btn-primary">
          <Plus size={16} /> {isBlog ? 'Yeni yazı' : 'Yeni proje'}
        </Link>
      </div>

      <div className="list-toolbar">
        <label className="search-input">
          <Search size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Başlık ya da etikette ara…" />
        </label>
        <div className="seg" role="tablist" aria-label="Duruma göre filtrele">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              className={filter === f.id ? 'active' : ''}
              onClick={() => setFilter(f.id)}
            >
              {f.label} <span>{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </div>

      {err && <div className="alert err">{err}</div>}

      {loading ? (
        <div className="admin-card empty-state">
          <Loader2 size={22} className="spin" />
        </div>
      ) : visible.length === 0 ? (
        <div className="admin-card empty-state">
          <p>{ofKind.length ? 'Bu filtreye uyan içerik yok.' : `Henüz ${isBlog ? 'yazı' : 'proje'} yok.`}</p>
          {!ofKind.length && (
            <Link to={`/admin/posts/new?kind=${kind}`} className="btn btn-secondary">
              <Plus size={15} /> İlkini oluştur
            </Link>
          )}
        </div>
      ) : (
        <ul className="post-list-admin">
          {visible.map((p) => (
            <li key={p.id} className="post-row">
              <Link to={`/admin/posts/${p.id}`} className="post-row-main">
                {p.cover ? (
                  <span className="thumb" style={{ backgroundImage: `url(${p.cover})`, backgroundPosition: p.cover_position || 'center' }} />
                ) : (
                  <GenCover className="thumb" seed={p.slug || p.title} />
                )}
                <span className="post-row-text">
                  <span className="title">{p.title || '(başlıksız)'}</span>
                  <span className="meta">
                    {fmtDate(p.created_at)}
                    {(p.tags || []).slice(0, 3).map((t) => (
                      <span key={t} className="tag">{t}</span>
                    ))}
                  </span>
                </span>
              </Link>

              <div className="post-row-actions">
                <button
                  type="button"
                  className={`switch${p.published ? ' on' : ''}`}
                  role="switch"
                  aria-checked={p.published}
                  aria-label={p.published ? 'Yayından kaldır' : 'Yayınla'}
                  title={p.published ? 'Yayında — kaldırmak için tıkla' : 'Taslak — yayınlamak için tıkla'}
                  disabled={busy === p.id}
                  onClick={() => togglePublish(p)}
                >
                  <span className="switch-knob" />
                  <span className="switch-label">{p.published ? 'Yayında' : 'Taslak'}</span>
                </button>
                {p.published && p.slug && (
                  <a
                    className="icon-button"
                    href={`/${p.kind === 'project' ? 'project' : 'blog'}/${p.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    title="Sitede gör"
                    aria-label="Sitede gör"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
                <Link to={`/admin/posts/${p.id}`} className="icon-button" title="Düzenle" aria-label="Düzenle">
                  <Pencil size={16} />
                </Link>
                <button type="button" className="icon-button danger" onClick={() => remove(p)} title="Sil" aria-label="Sil">
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
