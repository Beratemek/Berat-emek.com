import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Users, Eye, BookOpenCheck, Timer, Headphones, Share2, Mail, ArrowUpRight, Smartphone, Monitor,
  Tablet, Radio, Globe, Languages, MapPin, TrendingUp, TrendingDown, Minus, Activity,
} from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { useAdminData, istanbulDay } from '../AdminData.jsx'
import { LANGS } from '../../i18n/translations.js'

const DAY = 864e5
const RANGES = [
  { id: 7, label: '7 gün' },
  { id: 30, label: '30 gün' },
  { id: 90, label: '90 gün' },
]
const SOURCE_LABELS = { direct: 'Doğrudan', linkedin: 'LinkedIn', google: 'Google', x: 'X (Twitter)', github: 'GitHub' }
const SOURCE_FROM = { linkedin: "LinkedIn'den", google: "Google'dan", x: "X'ten", github: "GitHub'dan" }
const DEVICE = {
  mobile: { label: 'Telefon', icon: Smartphone },
  desktop: { label: 'Bilgisayar', icon: Monitor },
  tablet: { label: 'Tablet', icon: Tablet },
}
const LANG_LABEL = Object.fromEntries(LANGS.map((l) => [l.code, l.native]))
const rtf = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' })
const nf = new Intl.NumberFormat('tr-TR')

function ago(iso) {
  const s = Math.round((new Date(iso) - Date.now()) / 1000)
  if (Math.abs(s) < 60) return 'az önce'
  if (Math.abs(s) < 3600) return rtf.format(Math.round(s / 60), 'minute')
  if (Math.abs(s) < 86400) return rtf.format(Math.round(s / 3600), 'hour')
  return rtf.format(Math.round(s / 86400), 'day')
}

function duration(sec) {
  if (!sec) return '0 sn'
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return m ? `${m} dk ${s} sn` : `${s} sn`
}

function city(tz) {
  if (!tz) return 'Bilinmiyor'
  const name = tz.split('/').pop().replace(/_/g, ' ')
  return name === 'Istanbul' ? 'İstanbul' : name
}

/** Supabase satır sınırına takılmadan aralıktaki tüm olayları sayfa sayfa çeker. */
async function fetchEvents(sinceIso) {
  const all = []
  const PAGE = 1000
  for (let page = 0; page < 60; page++) {
    const { data, error } = await supabase
      .from('analytics_events')
      .select('created_at, visitor_id, session_id, type, path, post_kind, post_slug, value, referrer, lang, device, tz')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1)
    if (error) throw error
    all.push(...data)
    if (data.length < PAGE) break
  }
  return all
}

function summarize(events) {
  const views = events.filter((e) => e.type === 'pageview')
  const visitors = new Set(views.map((e) => e.visitor_id))
  const sessions = new Set(views.map((e) => e.session_id))
  const engaged = events.filter((e) => e.type === 'engaged').reduce((sum, e) => sum + (e.value || 0), 0)
  const blogViewers = new Set(views.filter((e) => e.post_kind === 'blog').map((e) => `${e.visitor_id}|${e.post_slug}`))
  const blogReaders = new Set(
    events.filter((e) => e.type === 'read' && e.post_kind === 'blog' && e.value >= 75).map((e) => `${e.visitor_id}|${e.post_slug}`)
  )
  return {
    visitors: visitors.size,
    views: views.length,
    reads: blogReaders.size,
    readRate: blogViewers.size ? Math.round((blogReaders.size / blogViewers.size) * 100) : 0,
    avgTime: sessions.size ? Math.round(engaged / sessions.size) : 0,
  }
}

function Delta({ now, before }) {
  if (!before && !now) return <span className="an-delta is-flat"><Minus size={12} /> veri yok</span>
  if (!before) return <span className="an-delta is-up"><TrendingUp size={12} /> yeni</span>
  const pct = Math.round(((now - before) / before) * 100)
  const Icon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus
  return (
    <span className={`an-delta ${pct > 0 ? 'is-up' : pct < 0 ? 'is-down' : 'is-flat'}`}>
      <Icon size={12} /> {pct > 0 ? '+' : ''}{pct}% <em>önceki döneme göre</em>
    </span>
  )
}

function Tile({ icon: Icon, label, value, now, before }) {
  return (
    <div className="stat-tile">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-icon"><Icon size={16} /></span>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub"><Delta now={now} before={before} /></div>
    </div>
  )
}

/** Günlük ziyaretçi ve görüntülenme: tek eksen (ikisi de adet), üzerine gelince ayrıntı. */
function TrendChart({ series }) {
  const wrap = useRef(null)
  const [width, setWidth] = useState(640)
  const [hover, setHover] = useState(null)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const H = 220
  const pad = { l: 34, r: 12, t: 14, b: 26 }
  const max = Math.max(4, ...series.map((d) => d.views))
  const step = Math.pow(10, Math.floor(Math.log10(max)))
  const top = Math.ceil(max / step) * step
  const x = (i) => pad.l + (i / Math.max(series.length - 1, 1)) * (width - pad.l - pad.r)
  const y = (v) => pad.t + (1 - v / top) * (H - pad.t - pad.b)
  const line = (key) => series.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ')
  const area = `${line('visitors')} L${x(series.length - 1)},${y(0)} L${x(0)},${y(0)} Z`
  const ticks = [0, top / 2, top]
  const labelEvery = Math.ceil(series.length / 6)

  function onMove(e) {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.round(((e.clientX - r.left - pad.l) / (width - pad.l - pad.r)) * (series.length - 1))
    setHover(Math.max(0, Math.min(series.length - 1, i)))
  }

  const h = hover != null ? series[hover] : null
  return (
    <div className="an-chart" ref={wrap}>
      <div className="an-legend">
        <span><i className="sw is-visitors" /> Ziyaretçi</span>
        <span><i className="sw is-views" /> Görüntülenme</span>
      </div>
      <svg width={width} height={H} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label="Günlük ziyaretçi ve görüntülenme">
        <defs>
          <linearGradient id="an-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--a-accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--a-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line className="an-gridline" x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} />
            <text className="an-axis" x={pad.l - 8} y={y(t) + 4} textAnchor="end">{nf.format(t)}</text>
          </g>
        ))}
        {series.map((d, i) =>
          i % labelEvery === 0 || i === series.length - 1 ? (
            <text key={d.day} className="an-axis" x={x(i)} y={H - 6} textAnchor="middle">
              {new Date(`${d.day}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}
            </text>
          ) : null
        )}
        <path d={area} fill="url(#an-fill)" />
        <path d={line('views')} className="an-line is-views" />
        <path d={line('visitors')} className="an-line is-visitors" />
        {h && (
          <g>
            <line className="an-cross" x1={x(hover)} x2={x(hover)} y1={pad.t} y2={y(0)} />
            <circle className="an-dot is-views" cx={x(hover)} cy={y(h.views)} r="4.5" />
            <circle className="an-dot is-visitors" cx={x(hover)} cy={y(h.visitors)} r="4.5" />
          </g>
        )}
      </svg>
      {h && (
        <div className="an-tip" style={{ left: Math.min(Math.max(x(hover), 80), width - 80) }}>
          <strong>{new Date(`${h.day}T12:00:00`).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'long' })}</strong>
          <span><i className="sw is-visitors" /> {h.visitors} ziyaretçi</span>
          <span><i className="sw is-views" /> {h.views} görüntülenme</span>
        </div>
      )}
    </div>
  )
}

function BarList({ rows, empty = 'Henüz veri yok' }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  const total = rows.reduce((s, r) => s + r.value, 0) || 1
  if (!rows.length) return <p className="muted-line">{empty}</p>
  return (
    <ul className="an-bars">
      {rows.map((r) => (
        <li key={r.label}>
          <span className="an-bar" style={{ width: `${(r.value / max) * 100}%` }} />
          <span className="an-bar-label">{r.icon && <r.icon size={14} />}{r.label}</span>
          <span className="an-bar-value">
            {nf.format(r.value)} <em>%{Math.round((r.value / total) * 100)}</em>
          </span>
        </li>
      ))}
    </ul>
  )
}

function countBy(items, key) {
  const m = new Map()
  for (const it of items) {
    const k = key(it)
    if (k == null) continue
    m.set(k, (m.get(k) || 0) + 1)
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

// %25'ini, %50'sini, %75'ini, %100'ünü
const PERCENT_SUFFIX = { 25: "'ini", 50: "'sini", 75: "'ini", 100: "'ünü" }

const FEED_ICON = { pageview: Eye, read: BookOpenCheck, listen: Headphones, share: Share2, contact: Mail, outbound: ArrowUpRight }

export default function AnalyticsPage() {
  const { posts } = useAdminData()
  const [range, setRange] = useState(30)
  const [events, setEvents] = useState([])
  const [state, setState] = useState('loading') // loading | ready | missing | error
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancel = false
    setState('loading')
    fetchEvents(new Date(Date.now() - range * 2 * DAY).toISOString())
      .then((rows) => {
        if (cancel) return
        setEvents(rows)
        setState('ready')
      })
      .catch((e) => {
        if (cancel) return
        const missing = /analytics_events|does not exist|PGRST205|42P01/.test(`${e.code} ${e.message}`)
        setState(missing ? 'missing' : 'error')
        setError(e.message)
      })
    return () => {
      cancel = true
    }
  }, [range])

  const titleOf = useMemo(() => {
    const bySlug = new Map(posts.map((p) => [p.slug, p.title]))
    return (path, slug) => {
      if (slug && bySlug.get(slug)) return bySlug.get(slug)
      if (path === '/') return 'Ana sayfa'
      if (path === '/blog') return 'Blog'
      return path
    }
  }, [posts])

  const data = useMemo(() => {
    const cutoff = Date.now() - range * DAY
    const now = events.filter((e) => new Date(e.created_at).getTime() >= cutoff)
    const before = events.filter((e) => new Date(e.created_at).getTime() < cutoff)
    const views = now.filter((e) => e.type === 'pageview')

    // Günlük seri (İstanbul saatiyle)
    const days = Array.from({ length: range }, (_, i) => istanbulDay(Date.now() - (range - 1 - i) * DAY))
    const byDay = new Map(days.map((d) => [d, { day: d, visitors: new Set(), views: 0 }]))
    for (const e of views) {
      const b = byDay.get(istanbulDay(e.created_at))
      if (b) {
        b.views++
        b.visitors.add(e.visitor_id)
      }
    }
    const series = [...byDay.values()].map((b) => ({ day: b.day, views: b.views, visitors: b.visitors.size }))

    // İçerik tablosu
    const pages = new Map()
    for (const e of now) {
      if (!['pageview', 'read', 'engaged', 'listen'].includes(e.type)) continue
      const key = e.path
      if (!pages.has(key)) pages.set(key, { path: e.path, slug: e.post_slug, kind: e.post_kind, views: 0, visitors: new Set(), readers: new Set(), time: 0, listens: 0 })
      const p = pages.get(key)
      if (e.type === 'pageview') {
        p.views++
        p.visitors.add(e.visitor_id)
      } else if (e.type === 'read' && e.value >= 75) p.readers.add(e.visitor_id)
      else if (e.type === 'engaged') p.time += e.value || 0
      else if (e.type === 'listen') p.listens++
    }
    const content = [...pages.values()]
      .filter((p) => p.views > 0)
      .map((p) => ({
        ...p,
        title: titleOf(p.path, p.slug),
        visitors: p.visitors.size,
        readRate: p.slug && p.visitors.size ? Math.round((p.readers.size / p.visitors.size) * 100) : null,
        avgTime: p.views ? Math.round(p.time / p.views) : 0,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10)

    const firstSeen = new Map()
    for (const e of [...views].reverse()) if (!firstSeen.has(e.visitor_id)) firstSeen.set(e.visitor_id, e)
    const people = [...firstSeen.values()]

    const sources = countBy(views, (e) => e.referrer).map(([k, v]) => ({ label: SOURCE_LABELS[k] || k, value: v }))
    const devices = countBy(people, (e) => e.device).map(([k, v]) => ({ label: DEVICE[k]?.label || k, icon: DEVICE[k]?.icon, value: v }))
    const langs = countBy(people, (e) => e.lang).map(([k, v]) => ({ label: LANG_LABEL[k] || k, value: v }))
    const cities = countBy(people, (e) => city(e.tz)).slice(0, 6).map(([k, v]) => ({ label: k, value: v }))

    const actions = {
      listen: now.filter((e) => e.type === 'listen').length,
      share: now.filter((e) => e.type === 'share').length,
      contact: now.filter((e) => e.type === 'contact').length,
      outbound: countBy(now.filter((e) => e.type === 'outbound'), (e) => e.referrer).map(([k, v]) => ({ label: k, value: v })),
    }

    const feed = now
      .filter((e) => e.type !== 'engaged' && (e.type !== 'read' || e.value >= 75))
      .slice(0, 14)
      .map((e) => {
        const title = titleOf(e.path, e.post_slug)
        const text = {
          pageview: e.post_slug
            ? `“${title}” sayfasını açtı`
            : `${e.path === '/' ? 'Ana sayfaya' : e.path === '/blog' ? 'Blog sayfasına' : `${e.path} sayfasına`} girdi${e.referrer && e.referrer !== 'direct' ? ` · ${SOURCE_FROM[e.referrer] || `${e.referrer} üzerinden`} geldi` : ''}`,
          read: `“${title}” yazısının %${e.value}${PERCENT_SUFFIX[e.value] || "'ini"} okudu`,
          listen: `“${title}” yazısını dinlemeye başladı`,
          share: e.referrer === 'linkedin' ? `“${title}” yazısını LinkedIn'de paylaştı` : `“${title}” bağlantısını kopyaladı`,
          contact: e.referrer === 'email-copy' ? 'E-posta adresini kopyaladı' : 'E-posta göndermek için tıkladı',
          outbound: `${e.referrer} adresine gitti`,
        }[e.type]
        return { ...e, text }
      })

    return { now: summarize(now), before: summarize(before), series, content, sources, devices, langs, cities, actions, feed }
  }, [events, range, titleOf])

  const { now, before } = data

  return (
    <div className="an">
      <header className="admin-page-head an-head">
        <div>
          <p className="page-kicker">Ziyaretçiler</p>
          <h1>Analitik</h1>
          <p className="page-desc">Çerezsiz ve anonim: kimin kim olduğunu değil, ne okunduğunu görürsün. Kendi ziyaretlerin sayılmaz.</p>
        </div>
        <div className="seg" role="tablist" aria-label="Zaman aralığı">
          {RANGES.map((r) => (
            <button key={r.id} type="button" role="tab" aria-selected={range === r.id} className={range === r.id ? 'active' : ''} onClick={() => setRange(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
      </header>

      {state === 'missing' && (
        <div className="alert warn">Analitik tablosu bulunamadı. supabase/analytics.sql dosyasını Supabase → SQL Editor'de bir kez çalıştır.</div>
      )}
      {state === 'error' && <div className="alert err">Veriler alınamadı: {error}</div>}

      <div className="stat-grid">
        <Tile icon={Users} label="Tekil ziyaretçi" value={state === 'loading' ? '—' : nf.format(now.visitors)} now={now.visitors} before={before.visitors} />
        <Tile icon={Eye} label="Sayfa görüntüleme" value={state === 'loading' ? '—' : nf.format(now.views)} now={now.views} before={before.views} />
        <Tile icon={BookOpenCheck} label="Sonuna kadar okunan" value={state === 'loading' ? '—' : `${nf.format(now.reads)}`} now={now.reads} before={before.reads} />
        <Tile icon={Timer} label="Ort. ziyaret süresi" value={state === 'loading' ? '—' : duration(now.avgTime)} now={now.avgTime} before={before.avgTime} />
      </div>

      <section className="admin-card">
        <div className="card-head">
          <div>
            <h3><Activity size={16} /> Günlük trafik</h3>
            <p className="muted-line">Son {range} gün · okuma oranı %{now.readRate} (yazıyı açanların sonuna kadar inenleri)</p>
          </div>
        </div>
        {state === 'loading' ? <div className="an-skeleton" /> : <TrendChart series={data.series} />}
      </section>

      <div className="an-grid">
        <section className="admin-card an-wide">
          <div className="card-head">
            <h3><BookOpenCheck size={16} /> En çok ilgi gören içerikler</h3>
          </div>
          {data.content.length === 0 ? (
            <p className="muted-line">{state === 'loading' ? 'Yükleniyor…' : 'Henüz ziyaret yok. İlk ziyaretler geldikçe burada görünecek.'}</p>
          ) : (
            <div className="an-table-wrap">
              <table className="an-table">
                <thead>
                  <tr>
                    <th>Sayfa</th>
                    <th>Görüntülenme</th>
                    <th>Ziyaretçi</th>
                    <th>Okuma</th>
                    <th>Ort. süre</th>
                    <th>Dinleme</th>
                  </tr>
                </thead>
                <tbody>
                  {data.content.map((p) => (
                    <tr key={p.path}>
                      <td>
                        <a href={p.path} target="_blank" rel="noreferrer" className="an-page">
                          <span>{p.title}</span>
                          <em>{p.kind === 'project' ? 'Proje' : p.kind === 'blog' ? 'Yazı' : 'Sayfa'}</em>
                        </a>
                      </td>
                      <td>
                        <span className="an-num">{nf.format(p.views)}</span>
                        <span className="an-mini" style={{ width: `${(p.views / data.content[0].views) * 100}%` }} />
                      </td>
                      <td className="an-num">{nf.format(p.visitors)}</td>
                      <td className="an-num">{p.readRate == null ? '—' : `%${p.readRate}`}</td>
                      <td className="an-num">{duration(p.avgTime)}</td>
                      <td className="an-num">{p.listens || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="admin-card">
          <div className="card-head">
            <h3><Radio size={16} /> Nereden geldiler</h3>
          </div>
          <BarList rows={data.sources} />
        </section>

        <section className="admin-card">
          <div className="card-head">
            <h3><Monitor size={16} /> Cihaz</h3>
          </div>
          <BarList rows={data.devices} />
        </section>

        <section className="admin-card">
          <div className="card-head">
            <h3><MapPin size={16} /> Şehir (saat dilimine göre)</h3>
          </div>
          <BarList rows={data.cities} />
        </section>

        <section className="admin-card">
          <div className="card-head">
            <h3><Languages size={16} /> Site dili</h3>
          </div>
          <BarList rows={data.langs} />
        </section>

        <section className="admin-card">
          <div className="card-head">
            <h3><Share2 size={16} /> Etkileşimler</h3>
          </div>
          <ul className="an-actions">
            <li><Headphones size={15} /> Yazı dinleme <b>{data.actions.listen}</b></li>
            <li><Share2 size={15} /> Paylaşım <b>{data.actions.share}</b></li>
            <li><Mail size={15} /> E-posta tıklama / kopyalama <b>{data.actions.contact}</b></li>
            {data.actions.outbound.map((o) => (
              <li key={o.label}><Globe size={15} /> {o.label} <b>{o.value}</b></li>
            ))}
          </ul>
        </section>

        <section className="admin-card an-wide">
          <div className="card-head">
            <div>
              <h3><Activity size={16} /> Son hareketler</h3>
              <p className="muted-line">Ziyaretçilerin sitede yaptıkları, en yeniden eskiye</p>
            </div>
          </div>
          {data.feed.length === 0 ? (
            <p className="muted-line">{state === 'loading' ? 'Yükleniyor…' : 'Henüz hareket yok.'}</p>
          ) : (
            <ul className="an-feed">
              {data.feed.map((e, i) => {
                const Icon = FEED_ICON[e.type] || Eye
                const Dev = DEVICE[e.device]?.icon || Monitor
                return (
                  <li key={`${e.created_at}-${i}`}>
                    <span className={`an-feed-icon is-${e.type}`}><Icon size={14} /></span>
                    <span className="an-feed-text">{e.text}</span>
                    <span className="an-feed-meta">
                      <Dev size={13} /> {city(e.tz)} · {ago(e.created_at)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
