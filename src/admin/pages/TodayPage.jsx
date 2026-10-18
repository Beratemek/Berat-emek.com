import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Loader2, Pencil, CheckCircle2, SkipForward,
  AlertTriangle, RotateCcw, Lightbulb,
} from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import TopicBoard from '../components/TopicBoard.jsx'
import ContentDesk, { dayContents } from '../components/ContentDesk.jsx'

const TZ = 'Europe/Istanbul'
const todayKey = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
const fmtDay = (d, opts = { weekday: 'long', day: 'numeric', month: 'long' }) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('tr-TR', opts)

const STATUS = { bekliyor: 'Bekliyor', paylasildi: 'Paylaşıldı', atlandi: 'Atlandı' }
// Editörün aciliyet derecesi (bot/agents.js → decide)
const URGENCY_LABEL = {
  kesin: 'Bugün kesin paylaş',
  onerilir: 'Bugün paylaş',
  'istege-bagli': 'İstersen paylaş',
  'gerek-yok': 'Bugün paylaşma',
}
// LinkedIn bağlantı akışından dönüşte gösterilecek mesaj (?linkedin=…)
const LINKEDIN_RESULT = {
  ok: ['ok', 'LinkedIn hesabın bağlandı. Artık gönderiyi buradan tek tıkla paylaşabilirsin.'],
  iptal: ['err', 'LinkedIn bağlantısı iptal edildi.'],
  gecersiz: ['err', 'Bağlantı isteğinin süresi doldu ya da geçersiz; yeniden dene.'],
  hata: ['err', 'LinkedIn bağlantısı kurulamadı. Uygulamadaki yönlendirme adresini ve ürünleri kontrol et.'],
}

export default function TodayPage() {
  const [briefs, setBriefs] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)
  const [focus, setFocus] = useState(null) // açık içerik sekmesi (konu sırası)
  const [linkedinResult] = useState(() => LINKEDIN_RESULT[new URLSearchParams(window.location.search).get('linkedin')])

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('daily_briefs')
      .select('*')
      .order('brief_date', { ascending: false })
      .limit(14)
    if (error) setErr(error)
    else setBriefs(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

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
  const editor = latest.stats?.editor

  // Karar kutusu her zaman günün en yüksek puanlı konusunu anlatır (puan ve gerekçe ona ait)
  const topTopic = [...(latest.topics || [])].filter((t) => t.rating != null).sort((a, b) => b.rating - a.rating)[0]

  // Açık içerik sekmesi: seçilmediyse en son oluşturulan içerik
  const contents = dayContents(latest)
  const newest = [...contents].sort((a, b) => String(b.content.created_at || '').localeCompare(String(a.content.created_at || '')))[0]
  const currentFocus = contents.some((x) => x.index === focus) ? focus : newest?.index ?? null
  const openContent = (index) => {
    setFocus(index)
    requestAnimationFrame(() => document.getElementById('icerikler')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  return (
    <div className="today">
      {header}
      {linkedinResult && <div className={`alert ${linkedinResult[0]}`}>{linkedinResult[1]}</div>}

      {!isToday && (
        <div className="today-notice">
          Bugünün özeti henüz hazır değil (bot her sabah 08:00'de çalışır). Aşağıda en son özet var:{' '}
          <strong>{fmtDay(latest.brief_date)}</strong>.
        </div>
      )}

      {/* Karar */}
      <section className={`admin-card today-verdict ${share ? 'is-share' : 'is-skip'}`}>
        <div className="verdict-top">
          <span className={`verdict-badge${editor?.urgency === 'kesin' ? ' is-hot' : ''}`}>
            {URGENCY_LABEL[editor?.urgency] || (share ? 'Bugün paylaş' : 'Bugün paylaşma')}
          </span>
          {latest.score != null && <span className="verdict-score">{latest.score}/10</span>}
          {share && latest.best_time && <span className="verdict-time">Önerilen saat: {latest.best_time}</span>}
          <span className={`verdict-status st-${latest.status}`}>{STATUS[latest.status]}</span>
        </div>
        {(topTopic?.topic || latest.headline) && <h2 className="verdict-headline">{topTopic?.topic || latest.headline}</h2>}
        <p className="verdict-reason">{latest.reason}</p>
        {editor?.why?.length > 0 && (
          <div className="verdict-why">
            <strong>Neden {latest.score}/10?</strong>
            <ul>
              {editor.why.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}
        {(editor?.tip || editor?.week) && (
          <div className="verdict-plan">
            {editor.week && (
              <span className="verdict-week">
                Bu hafta <b>{editor.week.sharedThisWeek}/{editor.week.target}</b> paylaşım
              </span>
            )}
            {editor.tip && (
              <span className="verdict-tip">
                <Lightbulb size={14} /> {editor.tip}
              </span>
            )}
          </div>
        )}
        {share && latest.status === 'bekliyor' && (
          <div className="verdict-actions">
            {contents.length ? (
              // Birden fazla içerik olabilir: paylaşım ve 'Paylaştım' işareti her içeriğin kendi kartında
              <button className="btn btn-dark" onClick={() => openContent(currentFocus)}>
                <CheckCircle2 size={16} /> İçeriklere git
              </button>
            ) : (
              <button className="btn btn-dark" disabled={saving} onClick={() => setStatus(latest, 'paylasildi')}>
                <CheckCircle2 size={16} /> Paylaştım
              </button>
            )}
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

      {/* Günün konuları: her konuya tek tıkla içerik */}
      <TopicBoard brief={latest} onChanged={load} focus={currentFocus} onOpen={openContent} />

      {/* Günün içerikleri: her biri kendi sekmesinde revize, kapak, LinkedIn */}
      <ContentDesk brief={latest} focus={currentFocus} onFocus={setFocus} onChanged={load} />

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
