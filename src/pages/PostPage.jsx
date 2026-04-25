import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { ArrowLeft, Calendar, Tag, Clock } from 'lucide-react'
import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import TiptapLink from '@tiptap/extension-link'
import TiptapImage from '@tiptap/extension-image'

export default function PostPage() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    document.body.style.overflow = 'auto'
    document.body.style.height = 'auto'
    document.documentElement.style.overflow = 'auto'
    const root = document.getElementById('root')
    if (root) { root.style.overflow = 'auto'; root.style.height = 'auto' }

    return () => {
      document.body.style.overflow = ''
      document.body.style.height = ''
      document.documentElement.style.overflow = ''
      if (root) { root.style.overflow = ''; root.style.height = '' }
    }
  }, [])

  useEffect(() => {
    let cancel = false
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .single()

      if (cancel) return
      if (error) {
        setError('Yazı bulunamadı.')
      } else {
        setPost(data)
      }
      setLoading(false)
    })()
    return () => { cancel = true }
  }, [slug])

  if (loading) {
    return (
      <div style={pageWrap}>
        <div style={container}>
          <div style={{ textAlign: 'center', padding: '120px 0', color: '#888' }}>
            Yükleniyor...
          </div>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div style={pageWrap}>
        <div style={container}>
          <div style={{ textAlign: 'center', padding: '120px 0' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>📄</div>
            <h1 style={{ fontSize: 28, fontWeight: 700, color: '#3a2a4a', marginBottom: 8 }}>
              Yazı Bulunamadı
            </h1>
            <p style={{ color: '#888', marginBottom: 24 }}>
              Aradığın yazı silinmiş veya yayından kaldırılmış olabilir.
            </p>
            <Link to="/" style={backBtnStyle}>
              <ArrowLeft size={16} /> Ana Sayfa
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })

  const readTime = () => {
    if (!post.content) return '1 dk'
    const text = JSON.stringify(post.content)
    const words = text.split(/\s+/).length
    return `${Math.max(1, Math.ceil(words / 200))} dk okuma`
  }

  let htmlContent = ''
  try {
    if (post.content) {
      htmlContent = generateHTML(post.content, [
        StarterKit,
        TiptapLink.configure({ openOnClick: true }),
        TiptapImage,
      ])
    }
  } catch {
    htmlContent = '<p>İçerik yüklenemedi.</p>'
  }

  return (
    <div style={pageWrap}>
      <div style={container}>
        {/* Geri butonu */}
        <Link to="/" style={backBtnStyle}>
          <ArrowLeft size={16} /> Ana Sayfa
        </Link>

        {/* Kapak görseli */}
        {post.cover && (
          <div style={{
            width: '100%', height: 'clamp(200px, 40vw, 420px)',
            borderRadius: 16, overflow: 'hidden', marginBottom: 32,
            background: `url(${post.cover}) center/cover`,
            boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
          }} />
        )}

        {/* Meta bilgiler */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 16, alignItems: 'center' }}>
          {post.tags?.length > 0 && post.tags.map((t) => (
            <span key={t} style={tagStyle}>
              <Tag size={12} /> {t}
            </span>
          ))}
          <span style={metaStyle}>
            <Calendar size={13} /> {fmtDate(post.created_at)}
          </span>
          <span style={metaStyle}>
            <Clock size={13} /> {readTime()}
          </span>
        </div>

        {/* Başlık */}
        <h1 style={titleStyle}>{post.title}</h1>

        {/* Özet */}
        {post.excerpt && (
          <p style={excerptStyle}>{post.excerpt}</p>
        )}

        {/* Ayırıcı */}
        <div style={{
          height: 2, width: 80,
          background: 'linear-gradient(90deg, #7c3aed, #f472b6)',
          borderRadius: 1, margin: '32px 0',
        }} />

        {/* İçerik */}
        <article
          className="post-content"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />

        {/* Alt geri butonu */}
        <div style={{ borderTop: '1px solid #e8e5f0', paddingTop: 32, marginTop: 48 }}>
          <Link to="/" style={backBtnStyle}>
            <ArrowLeft size={16} /> Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  )
}

/* --- Styles --- */
const pageWrap = {
  minHeight: '100vh',
  background: 'linear-gradient(180deg, #f8f7fc 0%, #fff 40%)',
  fontFamily: "'Inter', system-ui, sans-serif",
  padding: '40px 20px 80px',
}

const container = {
  maxWidth: 720,
  margin: '0 auto',
}

const backBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  color: '#7c3aed', textDecoration: 'none', fontWeight: 600,
  fontSize: 14, marginBottom: 24,
  padding: '8px 16px', borderRadius: 8,
  background: 'rgba(124,58,237,0.06)',
  border: '1px solid rgba(124,58,237,0.15)',
  transition: 'all 0.2s',
}

const tagStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase',
  padding: '5px 12px', borderRadius: 999,
  background: 'rgba(124,58,237,0.08)', color: '#7c3aed',
  border: '1px solid rgba(124,58,237,0.18)', fontWeight: 700,
}

const metaStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  fontSize: 13, color: '#999',
}

const titleStyle = {
  fontSize: 'clamp(28px, 5vw, 48px)',
  fontWeight: 800, lineHeight: 1.15,
  color: '#1c1633', letterSpacing: -1,
  marginBottom: 16,
}

const excerptStyle = {
  fontSize: 18, lineHeight: 1.7,
  color: '#666', fontStyle: 'italic',
}
