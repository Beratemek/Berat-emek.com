import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { supabase } from '../lib/supabase.js'
import { ArrowLeft, Calendar, Tag, Clock, ExternalLink } from 'lucide-react'
import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import TiptapLink from '@tiptap/extension-link'
import TiptapImage from '@tiptap/extension-image'

const SITE_URL = 'https://berat-emek.com'

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

  const htmlContent = renderContent(post.content)

  const pathPrefix = post.kind === 'project' ? 'project' : 'blog'
  const canonicalUrl = `${SITE_URL}/${pathPrefix}/${post.slug}`
  const metaDescription = post.excerpt || `${post.title} — Berat Emek`
  const ogImage = post.cover || `${SITE_URL}/og-cover.svg`
  const ogType = post.kind === 'project' ? 'website' : 'article'

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': post.kind === 'project' ? 'CreativeWork' : 'BlogPosting',
    headline: post.title,
    description: metaDescription,
    image: ogImage,
    datePublished: post.created_at,
    dateModified: post.updated_at || post.created_at,
    url: canonicalUrl,
    inLanguage: 'tr-TR',
    keywords: (post.tags || []).join(', '),
    author: {
      '@type': 'Person',
      name: 'Berat Emek',
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Person',
      name: 'Berat Emek',
      url: SITE_URL,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
  }

  return (
    <div style={pageWrap}>
      <Helmet>
        <title>{`${post.title} — Berat Emek`}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        {post.tags?.length > 0 && <meta name="keywords" content={post.tags.join(', ')} />}

        <meta property="og:type" content={ogType} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:locale" content="tr_TR" />
        <meta property="og:site_name" content="Berat Emek" />
        {ogType === 'article' && post.created_at && (
          <meta property="article:published_time" content={post.created_at} />
        )}
        {ogType === 'article' && (post.updated_at || post.created_at) && (
          <meta property="article:modified_time" content={post.updated_at || post.created_at} />
        )}
        {ogType === 'article' && <meta property="article:author" content="Berat Emek" />}

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content={canonicalUrl} />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={ogImage} />

        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
      </Helmet>

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

        {/* Proje / Site Linki CTA */}
        {post.project_url && (
          <a
            href={post.project_url}
            target="_blank"
            rel="noopener noreferrer"
            style={projectLinkStyle}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 12px 32px rgba(124,58,237,0.35)'
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(124,58,237,0.25)'
            }}
          >
            <ExternalLink size={18} /> Siteyi Ziyaret Et
          </a>
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

const projectLinkStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 8,
  marginTop: 24,
  padding: '14px 28px', borderRadius: 12,
  background: 'linear-gradient(135deg, #7c3aed 0%, #f472b6 100%)',
  color: '#fff', textDecoration: 'none',
  fontSize: 15, fontWeight: 700, letterSpacing: 0.3,
  boxShadow: '0 6px 20px rgba(124,58,237,0.25)',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
}

/**
 * İçeriği güvenli şekilde HTML'e çevirir.
 * Supabase JSONB bazen string, bazen obje döner — hepsini handle eder.
 */
function renderContent(raw) {
  if (!raw) return ''

  let content = raw

  // Eğer string olarak geldiyse JSON parse dene
  if (typeof content === 'string') {
    try {
      content = JSON.parse(content)
    } catch {
      // Parse edilemiyorsa düz HTML/metin olarak kullan
      return content
    }
  }

  // TipTap JSON: { type: 'doc', content: [...] }
  if (content && typeof content === 'object' && content.type === 'doc') {
    const children = content.content
    if (!Array.isArray(children) || children.length === 0) return ''
    try {
      return generateHTML(content, [
        StarterKit,
        TiptapLink.configure({ openOnClick: true }),
        TiptapImage,
      ])
    } catch (e) {
      console.error('[PostPage] generateHTML hatası:', e, 'content:', content)
      return ''
    }
  }

  return ''
}
