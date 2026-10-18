import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import Layout from '../site/Layout.jsx'
import Reveal from '../site/Reveal.jsx'
import { PostList, FeaturedPost, PostListSkeleton } from '../site/PostList.jsx'
import { usePortfolioContent } from '../hooks/usePortfolioContent.js'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { SITE } from '../data/site.js'

export default function BlogPage() {
  const { t } = useI18n()
  const { blogPosts, loading } = usePortfolioContent()
  const [params, setParams] = useSearchParams()
  const active = params.get('etiket')

  const tags = useMemo(() => {
    const count = new Map()
    for (const p of blogPosts) for (const tag of p.tags || []) count.set(tag, (count.get(tag) || 0) + 1)
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag)
  }, [blogPosts])

  const visible = active ? blogPosts.filter((p) => (p.tags || []).includes(active)) : blogPosts
  const [featured, ...rest] = visible
  const select = (tag) => setParams(tag ? { etiket: tag } : {}, { replace: true })

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
          {t('blog.langNote') && <p className="lang-note">{t('blog.langNote')}</p>}
        </Reveal>

        {tags.length > 1 && (
          <div className="filter-row" role="group" aria-label={t('blog.filter')}>
            <button type="button" className="filter-chip" aria-pressed={!active} onClick={() => select(null)}>
              {t('blog.all')}
            </button>
            {tags.map((tag) => (
              <button key={tag} type="button" className="filter-chip" aria-pressed={active === tag} onClick={() => select(tag)}>
                {tag}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <PostListSkeleton rows={5} />
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
