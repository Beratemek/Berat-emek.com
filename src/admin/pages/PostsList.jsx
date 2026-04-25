import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import InfoBox from '../InfoBox.jsx'

export default function PostsList({ filterKind }) {
  const location = useLocation()
  const kind = filterKind ?? (location.pathname.includes('projects') ? 'project' : 'blog')

  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('kind', kind)
      .order('created_at', { ascending: false })
    if (!error) setPosts(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [kind])

  async function remove(id) {
    if (!confirm('Silmek istediğinden emin misin?')) return
    const { error } = await supabase.from('posts').delete().eq('id', id)
    if (!error) setPosts((p) => p.filter((x) => x.id !== id))
    else alert(error.message)
  }

  const fmtDate = (iso) => new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })

  const title = kind === 'blog' ? 'Blog Yazıları' : 'Projeler'
  const kicker = kind === 'blog' ? 'Tüm yazılar' : 'Tüm projeler'

  const helpText = kind === 'blog'
    ? 'Buradan eklediğin yazılar 3D sitedeki sol reklam panosunda dönüşümlü gösterilir ve "BLOG" bölümünün yan panelinde listelenir. Sadece "Yayında" olarak işaretlediklerin görünür.'
    : 'Buradan eklediğin projeler 3D sitedeki sağ reklam panosunda dönüşümlü gösterilir ve "PROJELER" bölümünün yan panelinde listelenir. Sadece "Yayında" olarak işaretlediklerin görünür.'

  return (
    <div>
      <div className="page-kicker">{kicker}</div>
      <div className="admin-toolbar">
        <h1>{title}</h1>
        <Link to={`/admin/posts/new?kind=${kind}`} className="btn btn-primary">
          <Plus size={16} /> Yeni {kind === 'blog' ? 'Yazı' : 'Proje'}
        </Link>
      </div>

      <InfoBox>{helpText}</InfoBox>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : posts.length === 0 ? (
        <div className="admin-card" style={{ textAlign: 'center', color: 'rgba(28,22,51,0.6)' }}>
          Henüz {kind === 'blog' ? 'yazı' : 'proje'} yok. Yeni bir tane ekle.
        </div>
      ) : (
        posts.map((p) => (
          <div key={p.id} className="post-row">
            <span className={`kind-chip ${p.kind}`}>{p.kind === 'blog' ? 'Blog' : 'Proje'}</span>
            <div>
              <div className="title">{p.title}</div>
              <div className="meta">{fmtDate(p.created_at)} · {(p.tags || []).join(' · ') || 'etiketsiz'}</div>
            </div>
            <span className={`status ${p.published ? 'published' : 'draft'}`}>
              {p.published ? 'Yayında' : 'Taslak'}
            </span>
            <Link to={`/admin/posts/${p.id}`} className="btn btn-secondary" style={{ padding: '8px 12px' }}>
              <Pencil size={14} /> Düzenle
            </Link>
            <button onClick={() => remove(p.id)} className="btn btn-danger" style={{ padding: '8px 12px' }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))
      )}
    </div>
  )
}