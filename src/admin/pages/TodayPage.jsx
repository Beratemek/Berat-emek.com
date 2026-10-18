import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Loader2, Copy, Check, ExternalLink, Pencil, CheckCircle2, SkipForward,
  ShieldCheck, ShieldAlert, AlertTriangle, RotateCcw, Lightbulb,
} from 'lucide-react'
import { supabase } from '../../lib/supabase.js'

const TZ = 'Europe/Istanbul'
const todayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
const fmtDay = (d, opts = { weekday: 'long', day: 'numeric', month: 'long' }) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('tr-TR', opts)

const TRUST = {
  birincil: { label: 'Resmi kaynak', cls: 'ok' },
  'coklu-medya': { label: 'Çoklu medya', cls: 'mid' },
  'tek-kaynak': { label: 'Tek kaynak', cls: 'low' },
}
const STATUS = { bekliyor: 'Bekliyor', paylasildi: 'Paylaşıldı', atlandi: 'Atlandı' }

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    const ta = document.createElement('textarea')
    ta.value = text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
}

function CopyButton({ text, label = 'Kopyala' }) {
  const [done, setDone] = useState(false)
  return (
    <button
      className="btn btn-secondary"
      onClick={async () => {
        await copyText(text)
        setDone(true)
        setTimeout(() => setDone(false), 1800)
      }}
    >
      {done ? <Check size={15} /> : <Copy size={15} />} {done ? 'Kopyalandı' : label}
    </button>
  )
}

export default function TodayPage() {
  const [briefs, setBriefs] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancel = false
    ;(async () => {
      const { data, error } = await supabase
        .from('daily_briefs')
        .select('*')
        .order('brief_date', { ascending: false })
        .limit(14)
      if (cancel) return
      if (error) setErr(error)
      else setBriefs(data || [])
      setLoading(false)
    })()
    return () => { cancel = true }
  }, [])

  async function setStatus(brief, status) {
    setSaving(true)
    const { error } = await supabase.from('daily_briefs').update({ status }).eq('id', brief.id)
    setSaving(false)
    if (error) return alert(error.message)
    setBriefs((list) => list.map((b) => (b.id === brief.id ? { ...b, status } : b)))
  }

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  const header = (
    <>
      <div className="page-kicker">Günlük özet · {fmtDay(todayKey(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
      <h1>Bugün</h1>
    </>
  )

  if (err) {
    const missingTable = /daily_briefs|schema cache|does not exist/i.test(err.message)
    return (
      <div>
        {header}
        <div className="admin-card today-empty">
          <AlertTriangle size={20} />
          <div>
            {missingTable ? (
              <>
                <strong>Haber botu tablosu henüz yok.</strong>
                <p>Supabase → SQL Editor'de <code>supabase/news-bot.sql</code> dosyasını bir kez çalıştır.</p>
              </>
            ) : (
              <p>{err.message}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!briefs.length) {
    return (
      <div>
        {header}
        <div className="admin-card today-empty">
          <RotateCcw size={20} />
          <div>
            <strong>Bot henüz çalışmadı.</strong>
            <p>
              Bot her sabah 08:00'de çalışır. Hemen denemek için GitHub → Actions → "Haber botu" →
              Run workflow. Kurulum adımları <code>bot/README.md</code> dosyasında.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const latest = briefs[0]
  const isToday = latest.brief_date === todayKey()
  const share = latest.decision === 'paylas'
  const usage = latest.stats?.usage

  return (
    <div className="today">
      {header}

      {!isToday && (
        <div className="today-notice">
          Bugünün özeti henüz hazır değil (bot her sabah 08:00'de çalışır). Aşağıda en son özet var:{' '}
          <strong>{fmtDay(latest.brief_date)}</strong>.
        </div>
      )}

      {/* Karar */}
      <section className={`admin-card today-verdict ${share ? 'is-share' : 'is-skip'}`}>
        <div className="verdict-top">
          <span className="verdict-badge">{share ? 'Bugün paylaş' : 'Bugün paylaşma'}</span>
          {latest.score != null && <span className="verdict-score">{latest.score}/10</span>}
          {share && latest.best_time && <span className="verdict-time">Önerilen saat: {latest.best_time}</span>}
          <span className={`verdict-status st-${latest.status}`}>{STATUS[latest.status]}</span>
        </div>
        {latest.headline && <h2 className="verdict-headline">{latest.headline}</h2>}
        <p className="verdict-reason">{latest.reason}</p>
        {share && latest.status === 'bekliyor' && (
          <div className="verdict-actions">
            <button className="btn btn-dark" disabled={saving} onClick={() => setStatus(latest, 'paylasildi')}>
              <CheckCircle2 size={16} /> Paylaştım
            </button>
            <button className="btn btn-secondary" disabled={saving} onClick={() => setStatus(latest, 'atlandi')}>
              <SkipForward size={16} /> Bugün atla
            </button>
          </div>
        )}
        {latest.status !== 'bekliyor' && (
          <button className="link-btn" disabled={saving} onClick={() => setStatus(latest, 'bekliyor')}>
            Durumu geri al
          </button>
        )}
      </section>

      {/* Haber zayıfsa: bilgilendirici yazı fikirleri */}
      {latest.ideas?.length > 0 && (
        <section className="admin-card">
          <h3><Lightbulb size={16} style={{ verticalAlign: '-2px', marginRight: 6 }} />Bugün için yazı fikirleri</h3>
          <p className="muted">Haber yerine kendi bilginle yazabileceğin bilgilendirici paylaşımlar.</p>
          <ol className="ideas">
            {latest.ideas.map((idea, i) => (
              <li key={i}>
                <strong>{idea.title}</strong>
                <span>{idea.angle}</span>
                {idea.why && <em>{idea.why}</em>}
              </li>
            ))}
          </ol>
          <Link to="/admin/posts/new?kind=blog" className="btn btn-secondary" style={{ marginTop: 14 }}>
            <Pencil size={15} /> Yeni yazı başlat
          </Link>
        </section>
      )}

      {/* LinkedIn metni */}
      {latest.linkedin_text && (
        <section className="admin-card">
          <div className="card-head">
            <h3>LinkedIn gönderisi</h3>
            <div className="card-actions">
              <CopyButton text={latest.linkedin_text} />
              <a
                className="btn btn-secondary"
                href="https://www.linkedin.com/feed/?shareActive=true"
                target="_blank"
                rel="noreferrer"
                onClick={() => copyText(latest.linkedin_text)}
              >
                <ExternalLink size={15} /> Kopyala ve LinkedIn'i aç
              </a>
            </div>
          </div>
          <pre className="linkedin-text">{latest.linkedin_text}</pre>
          {latest.linkedin_comment && (
            <>
              <div className="card-head sub">
                <h4>İlk yoruma ekle</h4>
                <CopyButton text={latest.linkedin_comment} />
              </div>
              <pre className="linkedin-text small">{latest.linkedin_comment}</pre>
            </>
          )}
          {latest.post_id && (
            <Link to={`/admin/posts/${latest.post_id}`} className="btn btn-secondary" style={{ marginTop: 14 }}>
              <Pencil size={15} /> Blog taslağını düzenle ve yayınla
            </Link>
          )}
        </section>
      )}

      {/* Kontrol notları */}
      {latest.check_notes?.length > 0 && (
        <section className="admin-card">
          <h3>Kontrol notları</h3>
          <ul className="notes">
            {latest.check_notes.map((n, i) => (
              <li key={i} className={`sev-${n.severity}${n.fixed ? ' is-fixed' : ''}`}>
                <span>{n.fixed ? 'düzeltildi' : n.severity}</span> {n.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Doğrulanmış bilgiler */}
      {latest.facts?.length > 0 && (
        <details className="admin-card facts">
          <summary>Doğrulanmış bilgiler ({latest.facts.length})</summary>
          <ul>
            {latest.facts.map((f, i) => (
              <li key={i}>
                {f.fact}{' '}
                {f.source_url && (
                  <a href={f.source_url} target="_blank" rel="noreferrer">kaynak ↗</a>
                )}
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Gündem */}
      {latest.topics?.length > 0 && (
        <section className="admin-card">
          <h3>Günün gündemi</h3>
          <p className="muted">Puan: kaç bağımsız kaynağın yazdığı, resmi kaynak olup olmadığı ve topluluk ilgisi.</p>
          <ol className="topics">
            {latest.topics.map((t, i) => {
              const trust = TRUST[t.trust] || TRUST['tek-kaynak']
              return (
                <li key={i}>
                  <div className="topic-line">
                    <strong>{t.topic}</strong>
                    <span className="chip">%{t.share} gündem</span>
                    <span className={`chip trust-${trust.cls}`}>
                      {trust.cls === 'low' ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />} {trust.label}
                    </span>
                    {t.verified === true && <span className="chip trust-ok">Doğrulandı</span>}
                    {t.verified === false && <span className="chip trust-low">Doğrulanamadı</span>}
                  </div>
                  <div className="topic-sources">
                    {t.sources.map((s, j) => (
                      <a key={j} href={s.url} target="_blank" rel="noreferrer" title={s.title}>
                        {s.name}
                      </a>
                    ))}
                  </div>
                </li>
              )
            })}
          </ol>
        </section>
      )}

      {/* Geçmiş */}
      {briefs.length > 1 && (
        <section className="admin-card">
          <h3>Son günler</h3>
          <ul className="history">
            {briefs.slice(1).map((b) => (
              <li key={b.id}>
                <span className="h-date">{fmtDay(b.brief_date, { day: 'numeric', month: 'short', weekday: 'short' })}</span>
                <span className={`h-decision ${b.decision}`}>{b.decision === 'paylas' ? 'Paylaş' : 'Paylaşma'}</span>
                <span className="h-headline">{b.headline || '—'}</span>
                <span className="h-status">{STATUS[b.status]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {latest.stats && (
        <p className="today-stats">
          {latest.stats.items} haber · {latest.stats.sources_ok} kaynak
          {latest.stats.sources_failed?.length > 0 && ` (çalışmayan: ${latest.stats.sources_failed.join(', ')})`}
          {usage && ` · ${usage.calls} model çağrısı · $${usage.costUsd}`}
          {latest.stats.model && ` · ${latest.stats.model}`}
        </p>
      )}
    </div>
  )
}
