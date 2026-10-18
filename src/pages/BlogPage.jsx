import { useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Search, X } from 'lucide-react'
import Layout from '../site/Layout.jsx'
import Reveal from '../site/Reveal.jsx'
import { PostList, FeaturedPost, PostListSkeleton } from '../site/PostList.jsx'
import { usePortfolioContent } from '../hooks/usePortfolioContent.js'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { buildIndex, search } from '../site/search.js'
import { SITE } from '../data/site.js'
import '../site/search.css'

export default function BlogPage() {
  const { t, lang } = useI18n()
  const { blogPosts, loading } = usePortfolioContent()
  const [params, setParams] = useSearchParams()
  const active = params.get('etiket')
  const query = params.get('ara') || ''
  const inputRef = useRef(null)

  const tags = useMemo(() => {
    const count = new Map()
    for (const p of blogPosts) for (const tag of p.tags || []) count.set(tag, (count.get(tag) || 0) + 1)
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag)
  }, [blogPosts])

  const index = useMemo(() => buildIndex(blogPosts), [blogPosts])
  const byTag = active ? blogPosts.filter((p) => (p.tags || []).includes(active)) : blogPosts
  const found = query.trim() ? search(index, query) : null
  const visible = found ? found.filter((p) => byTag.includes(p)) : byTag
  const [featured, ...rest] = visible

  // Adres çubuğu: ?etiket=…&ara=… (arama sonucunun bağlantısı paylaşılabilsin)
  const update = (patch) => {
    const next = { etiket: active, ara: query, ...patch }
    setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v)), { replace: true })
  }

  // "/" tuşu arama kutusuna odaklar
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return
      e.preventDefault()
      inputRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Layout>
      <Helmet>
        <title>{`${t('blog.title')} — ${SITE.name}`}</title>
        <meta name="description" content={t('blog.intro')} />
        <link rel="canonical" href={`${SITE.url}/blog`} />
      </Helmet>

      <div className="wrap blog-page">
        <Reveal as="header" className="page-head">
          <p className="kicker">{t('blog.kicker')}</p>
          <h1>{t('blog.title')}</h1>
          <p>{t('blog.intro')}</p>
          {lang !== 'tr' && blogPosts.some((p) => p._lang === 'tr') && t('blog.langNote') && <p className="lang-note">{t('blog.langNote')}</p>}
        </Reveal>

        <div className="blog-search" role="search">
          <Search size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => update({ ara: e.target.value })}
            placeholder={t('blog.search')}
            aria-label={t('blog.searchLabel')}
            autoComplete="off"
            spellCheck="false"
            enterKeyHint="search"
          />
          {query ? (
            <button type="button" className="blog-search-clear" onClick={() => update({ ara: '' })} aria-label={t('blog.clear')}>
              <X size={16} />
            </button>
          ) : (
            <kbd aria-hidden="true">/</kbd>
          )}
        </div>

        {tags.length > 1 && (
          <div className="filter-row" role="group" aria-label={t('blog.filter')}>
            <button type="button" className="filter-chip" aria-pressed={!active} onClick={() => update({ etiket: null })}>
              {t('blog.all')}
            </button>
            {tags.map((tag) => (
              <button key={tag} type="button" className="filter-chip" aria-pressed={active === tag} onClick={() => update({ etiket: tag })}>
                {tag}
              </button>
            ))}
          </div>
        )}

        {found && !loading && (
          <p className="blog-search-count" aria-live="polite">
            {visible.length ? t('blog.results', { n: visible.length }) : t('blog.noResults')}
          </p>
        )}

        {loading ? (
          <PostListSkeleton rows={5} />
        ) : found ? (
          visible.length > 0 && <PostList posts={visible} />
        ) : featured ? (
          <>
            <Reveal><FeaturedPost post={featured} /></Reveal>
            {rest.length > 0 && <Reveal delay={100}><PostList posts={rest} /></Reveal>}
          </>
        ) : (
          <p className="empty">{active ? t('blog.emptyTag') : t('posts.empty')}</p>
        )}
      </div>
    </Layout>
  )
}
