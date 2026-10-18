import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { useI18n } from '../i18n/I18nProvider.jsx'
import GenCover from './GenCover.jsx'
import { coverWord, fmtDate, postPath, readMinutes } from './format.js'

export function PostList({ posts }) {
  const { t, locale } = useI18n()
  return (
    <ul className="post-list">
      {posts.map((p) => (
        <li key={p.id || p.slug} className="post-item">
          <Link to={postPath(p)}>
            {/* Küçük kapak yalnızca telefonda görünür; liste metin yığını gibi durmasın */}
            {p.cover ? (
              <div className="post-thumb cover-img" style={{ backgroundImage: `url(${p.cover})`, backgroundPosition: p.cover_position || 'center' }} />
            ) : (
              <GenCover className="post-thumb" seed={p.slug || p.title} topic={`${p.title} ${(p.tags || []).join(" ")}`} />
            )}
            <time className="post-date" dateTime={p.created_at}>
              {fmtDate(p.created_at, 'short', locale)}
            </time>
            <div>
              <h3 className="post-title">{p.title}</h3>
              {p.excerpt && <p className="post-excerpt">{p.excerpt}</p>}
              {p.tags?.length > 0 && (
                <div className="s-tags">
                  {p.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="s-tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
            <span className="post-side">
              {t('posts.min', { n: readMinutes(p.content) })} <ArrowUpRight size={15} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** Kapaklı küçük yazı kartı (ana sayfa): metin değil görsel ağırlıklı. */
export function PostCard({ post }) {
  const { t, locale } = useI18n()
  return (
    <Link to={postPath(post)} className="post-card">
      {post.cover ? (
        <div
          className="post-card-media cover-img"
          style={{ backgroundImage: `url(${post.cover})`, backgroundPosition: post.cover_position || 'center' }}
        />
      ) : (
        <GenCover className="post-card-media" seed={post.slug || post.title} word={coverWord(post)} topic={`${post.title} ${(post.tags || []).join(" ")}`} />
      )}
      <div className="post-card-body">
        <div className="post-card-meta">
          <time dateTime={post.created_at}>{fmtDate(post.created_at, 'short', locale)}</time>
          <span>· {t('posts.min', { n: readMinutes(post.content) })}</span>
        </div>
        <h3 className="post-card-title">{post.title}</h3>
      </div>
    </Link>
  )
}

/** Öne çıkan (en yeni) yazı: büyük kart, kapak yoksa üretilmiş kapak. */
export function FeaturedPost({ post }) {
  const { t, locale } = useI18n()
  return (
    <Link to={postPath(post)} className="featured">
      {post.cover ? (
        <div
          className="featured-media cover-img"
          style={{ backgroundImage: `url(${post.cover})`, backgroundPosition: post.cover_position || 'center' }}
        />
      ) : (
        <GenCover className="featured-media" seed={post.slug || post.title} label={t('posts.featured')} word={coverWord(post)} topic={`${post.title} ${(post.tags || []).join(" ")}`} />
      )}
      <div className="featured-body">
        <div className="featured-meta">
          <span className="s-tag accent">{t('posts.featured')}</span>
          <time dateTime={post.created_at}>{fmtDate(post.created_at, 'long', locale)}</time>
          <span>· {t('posts.minLong', { n: readMinutes(post.content) })}</span>
        </div>
        <h3>{post.title}</h3>
        {post.excerpt && <p>{post.excerpt}</p>}
        <span className="featured-cta">
          {t('post.more')} <ArrowUpRight size={16} />
        </span>
      </div>
    </Link>
  )
}

export function PostListSkeleton({ rows = 3 }) {
  return (
    <ul className="post-list" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className="post-item">
          <div style={{ display: 'grid', gap: 10, padding: '26px 0', borderBottom: '1px solid var(--line)' }}>
            <div className="skeleton" style={{ height: 14, width: 120 }} />
            <div className="skeleton" style={{ height: 20, width: '70%' }} />
            <div className="skeleton" style={{ height: 14, width: '90%' }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
