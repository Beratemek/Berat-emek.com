import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wallet, RefreshCw, Loader2, AlertTriangle, Info } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { serverApi } from '../lib/serverApi.js'
import '../spend.css'

// Harcama kalemleri. Ajan kayıtlarındaki details.kind ile eşleşir; eski kayıtlar özetten tahmin edilir.
const CATS = [
  { key: 'daily', label: 'Günlük bot', hint: 'Her sabah gündem taraması; bomba haber günü yazı ve kapak dahil' },
  { key: 'create', label: 'İçerik oluştur', hint: 'Panelden istenen yazı + LinkedIn metni' },
  { key: 'revise', label: 'Revize', hint: 'Talimatla düzeltmeler' },
  { key: 'cover', label: 'Kapak görselleri', hint: 'Panelden istenen kapaklar' },
  { key: 'translate', label: 'Çeviri', hint: '9 dile çeviri' },
  { key: 'quality', label: 'Kalite incelemesi', hint: 'Yayın öncesi yapay zeka kontrolü' },
  { key: 'analysis', label: 'Haftalık analiz', hint: 'Pazartesi raporu' },
  { key: 'other', label: 'Diğer', hint: '' },
]
const CAT = Object.fromEntries(CATS.map((c) => [c.key, c]))

function classify(run) {
  const k = run.details?.kind
  if (k && CAT[k]) return k
  const s = run.summary || ''
  if (run.agent === 'ceviri') return 'translate'
  if (run.agent === 'analiz') return 'analysis'
  if (run.agent === 'kalite') return 'quality'
  if (/^İçerik oluştur/.test(s)) return 'create'
  if (/^Revize/.test(s)) return 'revise'
  if (/^Kapak görseli/.test(s)) return 'cover'
  if (run.agent === 'gundem') return 'daily'
  return 'other'
}

const TZ = 'Europe/Istanbul'
const dayKey = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(d))
const fmtDay = (key, opts = { day: 'numeric', month: 'short' }) => new Date(`${key}T12:00:00`).toLocaleDateString('tr-TR', opts)
const fmtTime = (iso) =>
  new Date(iso).toLocaleString('tr-TR', { timeZone: TZ, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const usd = (n, digits = 2) => (n == null ? '—' : `$${Number(n).toFixed(digits)}`)
const usdSmall = (n) => (n == null ? '—' : n >= 0.01 ? usd(n) : n > 0 ? `$${Number(n).toFixed(4)}` : '$0')
const monthStart = () => {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString()
}

export default function SpendPage() {
  const [runs, setRuns] = useState(null)
  const [error, setError] = useState(null)
  const [budget, setBudget] = useState(null)
  const [busy, setBusy] = useState(false)
  const [hover, setHover] = useState(null)

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 31 * 864e5).toISOString()
    const { data, error: e } = await supabase
      .from('agent_runs')
      .select('id, agent, started_at, ok, summary, cost_usd, details')
      .gte('started_at', since)
      .order('started_at', { ascending: false })
      .limit(2000)
    if (e) return setError(/agent_|schema cache|does not exist/i.test(e.message) ? 'missing' : e.message)
    setRuns(data || [])
    const snap = (data || []).find((r) => r.agent === 'butce' && r.details?.remaining != null)
    if (snap) setBudget((b) => b ?? { ...snap.details, at: snap.started_at })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function refresh() {
    setBusy(true)
    try {
      setBudget(await serverApi('/api/agents/budget', { method: 'POST' }))
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const m = useMemo(() => {
    if (!runs) return null
    const paid = runs.filter((r) => Number(r.cost_usd) > 0)
    const today = dayKey(Date.now())
    const mStart = monthStart()

    // Son 30 gün, gün gün
    const days = []
    for (let i = 29; i >= 0; i--) days.push(dayKey(Date.now() - i * 864e5))
    const byDay = Object.fromEntries(days.map((d) => [d, { total: 0, cats: {} }]))
    const byCat = Object.fromEntries(CATS.map((c) => [c.key, { total: 0, count: 0 }]))
    let monthTracked = 0
    for (const r of paid) {
      const c = Number(r.cost_usd)
      const d = dayKey(r.started_at)
      const k = classify(r)
      if (byDay[d]) {
        byDay[d].total += c
        byDay[d].cats[k] = (byDay[d].cats[k] || 0) + c
      }
      if (r.started_at >= mStart) {
        monthTracked += c
        byCat[k].total += c
        byCat[k].count++
      }
    }

    // Takip ilk kaydından bu yana kaç gün (en fazla 7) → günlük ortalama
    const first = paid.length ? paid[paid.length - 1].started_at : null
    const coveredDays = first ? Math.min(7, Math.max(1, Math.ceil((Date.now() - new Date(first)) / 864e5))) : 0
    const last7 = days.slice(-7).reduce((n, d) => n + byDay[d].total, 0)
    const perDay = coveredDays ? last7 / coveredDays : 0

    return {
      paid,
      days,
      byDay,
      byCat,
      monthTracked,
      today: byDay[today]?.total || 0,
      perDay,
      coveredDays,
      firstDay: first ? dayKey(first) : null,
      max: Math.max(0.0001, ...days.map((d) => byDay[d].total)),
    }
  }, [runs])

  const header = (
    <>
      <div className="page-kicker">Yapay zeka</div>
      <h1>Harcamalar</h1>
      <p className="page-desc">OpenRouter bakiyen neye ne kadar gidiyor: gün gün, kalem kalem.</p>
    </>
  )

  if (error === 'missing') {
    return (
      <div>
        {header}
        <div className="admin-card today-empty">
          <AlertTriangle size={20} />
          <p>Harcama kayıtları için Supabase'de <code>supabase/agents.sql</code> çalıştırılmalı.</p>
        </div>
      </div>
    )
  }
  if (!m) {
    return (
      <div>
        {header}
        <div className="agents-loading">
          <Loader2 size={22} className="spin" />
        </div>
      </div>
    )
  }

  const untracked = budget?.usageMonthly != null ? Math.max(0, budget.usageMonthly - m.monthTracked) : null
  const daysLeft = budget?.remaining != null && m.perDay > 0 ? Math.floor(budget.remaining / m.perDay) : null
  const catRows = CATS.map((c) => ({ ...c, ...m.byCat[c.key] })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total)
  const catMax = Math.max(0.0001, ...catRows.map((c) => c.total))
  if (untracked > 0.005) catRows.push({ key: 'untracked', label: 'Takip öncesi', hint: 'Kayıt başlamadan önceki harcama (ör. sitedeki kapakların toplu üretimi)', total: untracked, count: null })

  // Grafik ölçüleri
  const W = 720
  const H = 200
  const padL = 44
  const padB = 24
  const plotW = W - padL - 8
  const plotH = H - padB - 10
  const bw = plotW / m.days.length
  const yMax = niceMax(m.max)
  const ticks = [0, yMax / 2, yMax]
  const hov = hover != null ? m.days[hover] : null

  return (
    <div className="spend">
      {header}

      <div className="spend-tiles">
        <div className="admin-card spend-tile is-main">
          <span className="spend-label">
            <Wallet size={14} /> Kalan bakiye
          </span>
          <strong className={budget?.remaining != null && budget.remaining < 0.75 ? 'is-low' : ''}>{usd(budget?.remaining)}</strong>
          <span className="spend-sub">
            {budget?.limit != null ? `${usd(budget.limit)} limitten` : 'ölçüm yok'}
            <button type="button" className="link-btn" onClick={refresh} disabled={busy}>
              {busy ? <Loader2 size={12} className="spin" /> : <RefreshCw size={12} />} Ölç
            </button>
          </span>
        </div>
        <div className="admin-card spend-tile">
          <span className="spend-label">Bu ay</span>
          <strong>{usd(budget?.usageMonthly ?? m.monthTracked)}</strong>
          <span className="spend-sub">{budget?.usageMonthly != null ? 'OpenRouter’a göre' : 'kayıtlara göre'}</span>
        </div>
        <div className="admin-card spend-tile">
          <span className="spend-label">Bugün</span>
          <strong>{usdSmall(m.today)}</strong>
          <span className="spend-sub">kayıtlı işlemler</span>
        </div>
        <div className="admin-card spend-tile">
          <span className="spend-label">Bu tempoyla</span>
          <strong>{daysLeft != null ? `~${daysLeft} gün` : '—'}</strong>
          <span className="spend-sub">günde ortalama {usdSmall(m.perDay)}</span>
        </div>
      </div>

      {m.coveredDays > 0 && m.coveredDays < 7 && (
        <p className="spend-note">
          <Info size={14} /> Kalem kalem takip {fmtDay(m.firstDay, { day: 'numeric', month: 'long' })} tarihinde başladı; tahmin birkaç gün
          içinde netleşir. Test ve kurulum günleri ortalamayı yukarı çekebilir.
        </p>
      )}

      <section className="admin-card spend-chart">
        <div className="card-head">
          <h3>Son 30 gün</h3>
          <span className="muted-line">Günlük toplam · üstüne gel, kalem kalem gör</span>
        </div>
        <div className="chart-wrap" onMouseLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Son 30 günün günlük yapay zeka harcaması">
            {ticks.map((t) => {
              const y = 10 + plotH - (t / yMax) * plotH
              return (
                <g key={t}>
                  <line x1={padL} x2={W - 8} y1={y} y2={y} className="grid" />
                  <text x={padL - 8} y={y + 4} className="axis" textAnchor="end">
                    {t === 0 ? '$0' : `$${t < 0.1 ? t.toFixed(3) : t.toFixed(2)}`}
                  </text>
                </g>
              )
            })}
            {m.days.map((d, i) => {
              const v = m.byDay[d].total
              const h = v > 0 ? Math.max(3, (v / yMax) * plotH) : 0
              const x = padL + i * bw + 1
              const y = 10 + plotH - h
              return (
                <g key={d}>
                  {h > 0 && <path d={roundedTop(x, y, Math.max(2, bw - 2), h, 4)} className={`bar${hover === i ? ' is-hover' : ''}`} />}
                  <rect x={padL + i * bw} y={10} width={bw} height={plotH} className="hit" onMouseEnter={() => setHover(i)} />
                  {i % 5 === 4 && (
                    <text x={x + (bw - 2) / 2} y={H - 6} className="axis" textAnchor="middle">
                      {fmtDay(d)}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
          {hov && (
            <div className="chart-tip" style={{ left: `${((padL + hover * bw + bw / 2) / W) * 100}%` }}>
              <strong>{fmtDay(hov, { weekday: 'short', day: 'numeric', month: 'long' })}</strong>
              <span className="tip-total">{usdSmall(m.byDay[hov].total)}</span>
              {Object.entries(m.byDay[hov].cats)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => (
                  <span key={k} className="tip-row">
                    {CAT[k]?.label || k} <b>{usdSmall(v)}</b>
                  </span>
                ))}
              {m.byDay[hov].total === 0 && <span className="tip-row">Harcama yok</span>}
            </div>
          )}
        </div>
      </section>

      <div className="spend-grid">
        <section className="admin-card">
          <div className="card-head">
            <h3>Bu ay neye gitti?</h3>
          </div>
          {catRows.length === 0 ? (
            <p className="muted-line">Bu ay kayıtlı harcama yok.</p>
          ) : (
            <ul className="cat-list">
              {catRows.map((c) => (
                <li key={c.key} title={c.hint} className={c.key === 'untracked' ? 'is-untracked' : ''}>
                  <div className="cat-top">
                    <span className="cat-name">{c.label}</span>
                    <span className="cat-num">
                      {usdSmall(c.total)}
                      {c.count != null && <em> · {c.count} işlem</em>}
                    </span>
                  </div>
                  <div className="meter thin">
                    <span style={{ width: c.key === 'untracked' ? '100%' : `${(c.total / catMax) * 100}%` }} className={c.key === 'untracked' ? 'is-muted' : ''} />
                  </div>
                  {c.hint && <span className="cat-hint">{c.hint}</span>}
                </li>
              ))}
            </ul>
          )}
          <p className="spend-foot">
            Bütçe sınırlarını ve ajanları <Link to="/admin/agents">Ajanlar</Link> sayfasından yönetebilirsin.
          </p>
        </section>

        <section className="admin-card">
          <div className="card-head">
            <h3>Son harcamalar</h3>
          </div>
          {m.paid.length === 0 ? (
            <p className="muted-line">Henüz ücretli bir işlem kaydı yok.</p>
          ) : (
            <table className="spend-table">
              <thead>
                <tr>
                  <th>Zaman</th>
                  <th>Kalem</th>
                  <th className="num">Tutar</th>
                </tr>
              </thead>
              <tbody>
                {m.paid.slice(0, 40).map((r) => (
                  <tr key={r.id}>
                    <td className="when">{fmtTime(r.started_at)}</td>
                    <td>
                      <span className="chip">{CAT[classify(r)]?.label}</span>
                      <span className="what" title={r.summary}>
                        {r.summary?.length > 140 ? `${r.summary.slice(0, 140)}…` : r.summary}
                      </span>
                    </td>
                    <td className="num">{usdSmall(Number(r.cost_usd))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}

/** Eksen için yuvarlak üst sınır */
function niceMax(v) {
  const steps = [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10]
  return steps.find((s) => s >= v) || Math.ceil(v)
}

/** Üstü yuvarlatılmış, tabana oturan çubuk */
function roundedTop(x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h)
  return `M${x},${y + h} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + w - rr} Q${x + w},${y} ${x + w},${y + rr} V${y + h} Z`
}
