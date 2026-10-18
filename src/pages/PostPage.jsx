import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft, ExternalLink, Link2, Check, Headphones, Pause, Play, Square } from 'lucide-react'
import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import TiptapImage from '@tiptap/extension-image'
import { supabase } from '../lib/supabase.js'
import { loadTranslations, translatePost } from '../lib/translations.js'
import { LANGS } from '../i18n/translations.js'
import Layout from '../site/Layout.jsx'
import { PostList } from '../site/PostList.jsx'
import { LinkedinIcon } from '../site/icons.jsx'
import { fmtDate, parseContent } from '../site/format.js'
import { SITE } from '../data/site.js'
import { useI18n } from '../i18n/I18nProvider.jsx'
import NotFound from './NotFound.jsx'

/** Sayfanın üstünde okuma ilerleme çubuğu */
function ReadProgress() {
  const ref = useRef(null)
  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      ref.current?.style.setProperty('--p', max > 0 ? Math.min(1, window.scrollY / max) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])
  return <div className="read-progress" aria-hidden="true"><span ref={ref} /></div>
}

export default function PostPage() {
  const { t, locale, lang } = useI18n()
  const { slug } = useParams()
  const [state, setState] = useState({ loading: true, post: null })
  const [related, setRelated] = useState([])

  useEffect(() => {
    let cancel = false
    setState({ loading: true, post: null })
    setRelated([])
    ;(async () => {
      const { data } = await supabase
        .from('posts')
        .select('*')
        .eq('slug', slug)
        .eq('published', true)
        .maybeSingle()
      if (cancel) return
      if (!data) {
        setState({ loading: false, post: null })
        return
      }
      // Seçili dilde çevirisi varsa onu göster, yoksa Türkçe
      const trs = await loadTranslations(lang, [data.id], { withContent: true })
      if (cancel) return
      setState({ loading: false, post: translatePost(data, trs.get(data.id), lang) })

      const rel = await supabase
        .from('posts')
        .select('id, slug, kind, title, excerpt, tags, created_at, content')
        .eq('published', true)
        .eq('kind', data.kind)
        .neq('id', data.id)
        .order('created_at', { ascending: false })
        .limit(3)
      if (cancel || !rel.data) return
      const relTrs = await loadTranslations(lang, rel.data.map((p) => p.id))
      if (!cancel) setRelated(rel.data.map((p) => translatePost(p, relTrs.get(p.id), lang)))
    })()
    return () => {
      cancel = true
    }
  }, [slug, lang])

  const { loading, post } = state

  if (loading) {
    return (
      <Layout>
        <div className="wrap narrow article" aria-busy="true">
          <div className="skeleton" style={{ height: 14, width: 90 }} />
          <div className="skeleton" style={{ height: 44, width: '85%', marginTop: 32 }} />
          <div className="skeleton" style={{ height: 20, width: '65%', marginTop: 18 }} />
          <div className="skeleton" style={{ height: 300, marginTop: 44 }} />
        </div>
      </Layout>
    )
  }

  if (!post) {
    return <NotFound title={t('post.notFoundTitle')} text={t('post.notFoundText')} />
  }

  const isProject = post.kind === 'project'
  const canonicalUrl = `${SITE.url}/${isProject ? 'project' : 'blog'}/${post.slug}`
  const metaDescription = post.excerpt || `${post.title} — ${SITE.name}`
  const ogImage = post.cover || `${SITE.url}/og-cover.png`
  const html = renderContent(post.content)

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': isProject ? 'CreativeWork' : 'BlogPosting',
    headline: post.title,
    description: metaDescription,
    image: ogImage,
    datePublished: post.created_at,
    dateModified: post.updated_at || post.created_at,
    url: canonicalUrl,
    inLanguage: LANGS.find((l) => l.code === post._lang)?.locale || 'tr-TR',
    keywords: (post.tags || []).join(', '),
    author: { '@type': 'Person', name: SITE.name, url: SITE.url },
    publisher: { '@type': 'Person', name: SITE.name, url: SITE.url },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
  }

  return (
    <Layout>
      <Helmet>
        <title>{`${post.title} — ${SITE.name}`}</title>
        <meta name="description" content={metaDescription} />
        <link rel="canonical" href={canonicalUrl} />
        {post.tags?.length > 0 && <meta name="keywords" content={post.tags.join(', ')} />}

        <meta property="og:type" content={isProject ? 'website' : 'article'} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:locale" content="tr_TR" />
        <meta property="og:site_name" content={SITE.name} />
        {!isProject && <meta property="article:published_time" content={post.created_at} />}
        {!isProject && <meta property="article:modified_time" content={post.updated_at || post.created_at} />}
        {!isProject && <meta property="article:author" content={SITE.name} />}

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={ogImage} />

        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
      </Helmet>

      <ReadProgress />
      <article className="wrap narrow article">
        <Link to={isProject ? '/#projeler' : '/blog'} className="crumb">
          <ArrowLeft size={15} /> {isProject ? t('post.backProjects') : t('post.back')}
        </Link>

        <header className="article-head">
          {/* Konular baloncuk yerine sade bir satırda */}
          {post.tags?.length > 0 && <p className="article-topics">{post.tags.slice(0, 3).join(' · ')}</p>}
          <h1>{post.title}</h1>
          {post.excerpt && <p className="article-lead">{post.excerpt}</p>}
          <div className="article-meta">
            <time dateTime={post.created_at}>{fmtDate(post.created_at, 'long', locale)}</time>
            <span className="meta-actions">
              <ListenButton title={post.title} html={html} lang={post._lang} />
              {post.project_url && (
                <a href={post.project_url} target="_blank" rel="noopener noreferrer" className="s-btn primary small">
                  <ExternalLink size={15} /> {t('post.visit')}
                </a>
              )}
            </span>
          </div>
        </header>

        {post.cover && (
          <div
            className="article-cover"
            role="img"
            aria-label={post.title}
            style={{ backgroundImage: `url(${post.cover})`, backgroundPosition: post.cover_position || 'center' }}
          />
        )}

        <Prose html={html} />

        <ShareRow url={canonicalUrl} />

        {related.length > 0 && (
          <section className="related">
            <p className="kicker">{t('post.more')}</p>
            <h2>{isProject ? t('post.otherProjects') : t('post.otherPosts')}</h2>
            <PostList posts={related} />
          </section>
        )}
      </article>
    </Layout>
  )
}

/** Yazı gövdesi; içindeki görsele tıklayınca tam boy açılır (ekran görüntüleri sütunda küçük kalıyor). */
function Prose({ html }) {
  const [zoom, setZoom] = useState(null)
  useEffect(() => {
    if (!zoom) return
    const onKey = (e) => e.key === 'Escape' && setZoom(null)
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [zoom])

  return (
    <>
      <div
        className="prose"
        dangerouslySetInnerHTML={{ __html: html }}
        onClick={(e) => e.target.tagName === 'IMG' && setZoom({ src: e.target.currentSrc || e.target.src, alt: e.target.alt })}
      />
      {zoom && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={zoom.alt} onClick={() => setZoom(null)}>
          <img src={zoom.src} alt={zoom.alt} />
          {zoom.alt && <p>{zoom.alt}</p>}
        </div>
      )}
    </>
  )
}

/**
 * Yazıyı cihazın Türkçe sesiyle sesli okur (Web Speech API — ücretsiz, sunucu gerektirmez).
 * Yazı hangi dilde gösteriliyorsa (çeviri ya da Türkçe asıl) o dilin sesiyle okunur.
 */
function ListenButton({ title, html, lang = 'tr' }) {
  const { t } = useI18n()
  const [state, setState] = useState('idle') // idle | playing | paused
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  useEffect(() => () => supported && window.speechSynthesis.cancel(), [supported])
  if (!supported) return null
  const synth = window.speechSynthesis

  function start() {
    synth.cancel()
    const doc = new DOMParser().parseFromString(html, 'text/html')
    const blocks = [title, ...[...doc.body.querySelectorAll('h1, h2, h3, p, li, blockquote')].map((el) => el.textContent.trim())]
      .filter(Boolean)
    // Tarayıcılar uzun metni yarıda kesebildiği için her bloğu kısa parçalara böl
    const chunks = []
    for (const block of blocks) {
      let current = ''
      for (const sentence of block.match(/[^.!?…。！？]+[.!?…。！？]*/g) || [block]) {
        if (current && current.length + sentence.length > 200) {
          chunks.push(current)
          current = ''
        }
        current = `${current} ${sentence.trim()}`.trim()
      }
      if (current) chunks.push(current)
    }
    const speechLocale = LANGS.find((l) => l.code === lang)?.locale || 'tr-TR'
    const voice = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith(lang))
    chunks.forEach((text, i) => {
      const u = new SpeechSynthesisUtterance(text)
      u.lang = speechLocale
      if (voice) u.voice = voice
      if (i === chunks.length - 1) u.onend = () => setState('idle')
      synth.speak(u)
    })
    setState('playing')
  }

  if (state === 'idle') {
    return (
      <button type="button" className="s-btn ghost small" onClick={start} data-track="listen">
        <Headphones size={15} /> {t('post.listen')}
      </button>
    )
  }
  return (
    <span className="listen-controls">
      {state === 'playing' ? (
        <button type="button" className="s-btn ghost small" onClick={() => { synth.pause(); setState('paused') }}>
          <Pause size={15} /> {t('post.pause')}
        </button>
      ) : (
        <button type="button" className="s-btn ghost small" onClick={() => { synth.resume(); setState('playing') }}>
          <Play size={15} /> {t('post.resume')}
        </button>
      )}
      <button type="button" className="icon-btn" onClick={() => { synth.cancel(); setState('idle') }} aria-label={t('post.stop')} title={t('post.stop')}>
        <Square size={13} />
      </button>
    </span>
  )
}

function ShareRow({ url }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Pano erişimi yoksa sessizce geç
    }
  }

  return (
    <div className="share-row">
      <p>{t('post.share')}</p>
      <div className="share-actions">
        <a
          className="s-btn ghost small"
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noreferrer"
          data-track="share:linkedin"
        >
          <LinkedinIcon size={15} /> {t('post.shareLinkedin')}
        </a>
        <button type="button" className="s-btn ghost small" onClick={copy} data-track="share:copy-link">
          {copied ? <Check size={15} /> : <Link2 size={15} />} {copied ? t('ui.copied') : t('post.copyLink')}
        </button>
      </div>
    </div>
  )
}

/** Tiptap JSON içeriğini HTML'e çevirir (StarterKit v3 link desteğini zaten içerir). */
function renderContent(raw) {
  const content = parseContent(raw)
  if (!content) return ''
  if (typeof content === 'string') return content
  if (content.type !== 'doc' || !Array.isArray(content.content) || !content.content.length) return ''
  try {
    return generateHTML(content, [StarterKit, TiptapImage])
  } catch (e) {
    console.error('[PostPage] İçerik çevrilemedi:', e)
    return ''
  }
}
