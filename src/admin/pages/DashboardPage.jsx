import { Link } from 'react-router-dom'
import {
  ExternalLink, FileText, PenLine, FolderGit2, CalendarDays, ArrowRight,
  Newspaper, Sparkles, Flame,
} from 'lucide-react'
import { useAdminData, istanbulDay } from '../AdminData.jsx'
import ActivityHeatmap from '../components/ActivityHeatmap.jsx'
import GenCover from '../../site/GenCover.jsx'

const rtf = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' })

function relative(iso) {
  const days = Math.round((new Date(iso) - Date.now()) / 864e5)
  if (Math.abs(days) < 1) return 'bugün'
  if (Math.abs(days) < 30) return rtf.format(days, 'day')
  if (Math.abs(days) < 365) return rtf.format(Math.round(days / 30), 'month')
  return rtf.format(Math.round(days / 365), 'year')
}

function greeting() {
  const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Europe/Istanbul' }).format(new Date()))
  if (hour >= 5 && hour < 12) return 'Günaydın'
  if (hour >= 12 && hour < 18) return 'İyi günler'
  if (hour >= 18 && hour < 23) return 'İyi akşamlar'
  return 'İyi geceler'
}

function StatTile({ icon: Icon, label, value, sub, tone }) {
  return (
    <div className={`stat-tile${tone ? ` is-${tone}` : ''}`}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-icon"><Icon size={16} /></span>
      </div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

export default function DashboardPage() {
  const { posts, briefs, loading, briefsMissing } = useAdminData()
  const today = istanbulDay()
  const brief = briefs.find((b) => b.brief_date === today)

  const blog = posts.filter((p) => p.kind === 'blog')
  const published = blog.filter((p) => p.published)
  const drafts = posts.filter((p) => !p.published)
  const projects = posts.filter((p) => p.kind === 'project' && p.published)
  const thisMonth = published.filter((p) => istanbulDay(p.created_at).startsWith(today.slice(0, 7))).length

  // Son paylaşım: yayınlanan yazı ya da LinkedIn'de paylaşıldı işaretli gün
  const activity = [
    ...published.map((p) => istanbulDay(p.created_at)),
    ...briefs.filter((b) => b.status === 'paylasildi').map((b) => b.brief_date),
  ].sort()
  const last = activity[activity.length - 1]
  const sinceLast = last ? Math.round((new Date(`${today}T12:00:00`) - new Date(`${last}T12:00:00`)) / 864e5) : null

  const dateLabel = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' })
  const shareToday = brief?.decision === 'paylas' && brief.status === 'bekliyor'
  const summary = brief
    ? shareToday
      ? 'Bot bugün paylaşmanı öneriyor; taslak seni bekliyor.'
      : brief.status === 'paylasildi'
        ? 'Bugünün paylaşımını yaptın. Güzel iş.'
        : 'Bugün güçlü bir haber yok; bir rehber yazısı iyi gider.'
    : briefsMissing
      ? 'Haber botu henüz kurulmadı; kurulunca her sabah özet burada.'
      : 'Bot bugün henüz çalışmadı; her sabah 08:00\'de çalışır.'

  return (
    <div className="dash">
      <header className="dash-hero">
        <div>
          <p className="page-kicker">{dateLabel}</p>
          <h1>{greeting()}, Berat</h1>
          <p className="page-desc">{summary}</p>
        </div>
        <div className="dash-actions">
          <a className="btn btn-secondary" href="/" target="_blank" rel="noreferrer">
            <ExternalLink size={15} /> Siteyi aç
          </a>
        </div>
      </header>

      <div className="stat-grid">
        <StatTile icon={FileText} label="Yayındaki yazı" value={loading ? '—' : published.length} sub={`${thisMonth} tanesi bu ay`} />
        <StatTile icon={PenLine} label="Taslak" value={loading ? '—' : drafts.length} sub={drafts.length ? 'Yayın bekliyor' : 'Hepsi yayında'} />
        <StatTile icon={FolderGit2} label="Proje" value={loading ? '—' : projects.length} sub="Sitede yayında" />
        <StatTile
          icon={Flame}
          label="Son paylaşım"
          value={sinceLast === null ? '—' : sinceLast === 0 ? 'Bugün' : `${sinceLast} gün`}
          sub={sinceLast === null ? 'Henüz paylaşım yok' : sinceLast === 0 ? 'Seriyi sürdür' : 'önce'}
          tone={sinceLast !== null && sinceLast > 7 ? 'warn' : undefined}
        />
      </div>

      <div className="dash-grid">
        <section className={`admin-card bot-card${shareToday ? ' is-share' : ''}`}>
          <div className="bot-card-head">
            <span className="bot-card-icon"><Newspaper size={18} /></span>
            <div>
              <h3>Bugünün önerisi</h3>
              <p className="muted-line">Haber botunun özeti</p>
            </div>
          </div>
          {brief ? (
            <>
              <span className={`decision-pill ${brief.decision === 'paylas' ? 'is-share' : 'is-skip'}`}>
                {brief.decision === 'paylas' ? 'Bugün paylaş' : 'Bugün paylaşma'}
                {brief.score != null && <b>{brief.score}/10</b>}
              </span>
              {brief.headline && <p className="bot-headline">{brief.headline}</p>}
              {brief.reason && <p className="bot-reason">{brief.reason}</p>}
            </>
          ) : (
            <div className="bot-empty">
              <Sparkles size={18} />
              <p>{briefsMissing ? 'Kurulum adımları bot/README.md dosyasında.' : 'Bugünün özeti sabah 08:00\'de burada olacak.'}</p>
            </div>
          )}
          <Link to="/admin/today" className="btn btn-secondary bot-cta">
            Bugün sayfasına git <ArrowRight size={15} />
          </Link>
        </section>

        <section className="admin-card heat-card">
          <div className="card-head">
            <div>
              <h3><CalendarDays size={16} /> Paylaşım takvimi</h3>
              <p className="muted-line">Son 6 ay · yayınlanan yazılar ve LinkedIn paylaşımları</p>
            </div>
          </div>
          <ActivityHeatmap posts={posts} briefs={briefs} />
        </section>
      </div>

      <section className="admin-card">
        <div className="card-head">
          <h3>Son içerikler</h3>
          <Link to="/admin/posts" className="link-arrow">
            Tümü <ArrowRight size={14} />
          </Link>
        </div>
        {posts.length === 0 ? (
          <p className="muted-line">{loading ? 'Yükleniyor…' : 'Henüz içerik yok. İlk yazını oluştur.'}</p>
        ) : (
          <ul className="recent-list">
            {posts.slice(0, 6).map((p) => (
              <li key={p.id}>
                <Link to={`/admin/posts/${p.id}`} className="recent-item">
                  {p.cover ? (
                    <span className="thumb" style={{ backgroundImage: `url(${p.cover})`, backgroundPosition: p.cover_position || 'center' }} />
                  ) : (
                    <GenCover className="thumb" seed={p.slug || p.title} topic={`${p.title} ${(p.tags || []).join(" ")}`} />
                  )}
                  <span className="recent-main">
                    <span className="recent-title">{p.title || '(başlıksız)'}</span>
                    <span className="recent-meta">
                      {p.kind === 'project' ? 'Proje' : 'Blog'} · {relative(p.updated_at || p.created_at)}
                    </span>
                  </span>
                  <span className={`status ${p.published ? 'published' : 'draft'}`}>
                    {p.published ? 'Yayında' : 'Taslak'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
