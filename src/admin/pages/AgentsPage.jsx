import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Newspaper, Languages, LineChart, ShieldCheck, Radar, Wallet, Sparkles, Check, X, ExternalLink,
  Loader2, RefreshCw, Inbox, AlertTriangle, Bot, CircleCheck, Clock,
} from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { serverApi } from '../lib/serverApi.js'
import '../agents.css'

// Ajanların tanımı. Anahtarlar bot/ ve api/ tarafındaki kayıtlarla (agent_runs.agent) aynı.
export const AGENTS = [
  {
    key: 'gundem',
    name: 'Gündem editörü',
    icon: Newspaper,
    ai: true,
    schedule: 'Her sabah 08:00',
    desc: 'Yapay zeka gündemini tarar, konuları önem sırasına koyar; bomba haber günü yazıyı, LinkedIn metnini ve kapağı hazırlar. Diğer günler Bugün sayfasından istediğin konuya "İçerik oluştur" ve "Revize et" diyebilirsin.',
    note: 'Okurun gördüğü metni kaliteli model (Claude Sonnet) yazar; sıralama, doğrulama ve kontrol en ucuz modelde.',
  },
  {
    key: 'ceviri',
    name: 'Çevirmen',
    icon: Languages,
    ai: true,
    schedule: '6 saatte bir',
    desc: 'Yeni ya da değişen her yazıyı ve projeyi 9 dile çevirir; sitenin dili değişince içerik de değişir.',
  },
  {
    key: 'analiz',
    name: 'Analiz yorumcusu',
    icon: LineChart,
    ai: true,
    schedule: 'Pazartesi 09:00',
    desc: 'Haftanın okuma verisini rapora döker: neyin okunduğunu, nereden gelindiğini ve sırada ne yazılabileceğini söyler.',
  },
  {
    key: 'kalite',
    name: 'Kalite kapısı',
    icon: ShieldCheck,
    ai: true,
    schedule: 'Her yayında',
    desc: 'Yayından önce metni tarar: şirket içi bilgi, kişisel veri, kaldırılan projeler, klişe ve abartı. Kural kontrolü her kayıtta; yazı editöründeki "Yapay zekayla kontrol et" dili ve içeriği de okur.',
  },
  {
    key: 'demo',
    name: 'Proje ve demo bekçisi',
    icon: Radar,
    ai: false,
    schedule: 'Her gün 09:00',
    desc: 'Canlı demoların açık olduğunu kontrol eder; GitHub’daki hareketlerden proje güncellemesi ve gönderi fırsatı çıkarır.',
  },
  {
    key: 'butce',
    name: 'Bütçe bekçisi',
    icon: Wallet,
    ai: false,
    schedule: 'Her gün 09:00',
    desc: 'OpenRouter harcamasını izler; bakiye azalınca ya da bir ajan aylık bütçesine yaklaşınca uyarır.',
  },
]
const AGENT_BY_KEY = Object.fromEntries(AGENTS.map((a) => [a.key, a]))

const KIND_LABEL = {
  'demo-down': 'Demo kapalı',
  'project-activity': 'Proje hareketi',
  'project-release': 'Yeni sürüm',
  'budget-low': 'Bakiye',
  'budget-agent': 'Bütçe',
  'weekly-report': 'Haftalık rapor',
}

const AI_RESERVE = 0.75 // bot/agentkit.js → AI_RESERVE_USD ile aynı

const monthStart = () => {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString()
}
const rtf = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' })
function ago(iso) {
  const s = (new Date(iso) - Date.now()) / 1000
  const abs = Math.abs(s)
  if (abs < 60) return 'az önce'
  if (abs < 3600) return rtf.format(Math.round(s / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(s / 3600), 'hour')
  return rtf.format(Math.round(s / 86400), 'day')
}
const usd = (n) => (n == null ? '—' : `$${Number(n).toFixed(2)}`)
const isMissing = (err) => Boolean(err) && /agent_|schema cache|does not exist|PGRST205|42P01/i.test(`${err.code} ${err.message}`)

export default function AgentsPage() {
  const [state, setState] = useState({ loading: true, missing: false, error: null, settings: {}, runs: [], suggestions: [] })
  const [tab, setTab] = useState('yeni')
  const [budget, setBudget] = useState(null)
  const [budgetBusy, setBudgetBusy] = useState(false)
  const [budgetErr, setBudgetErr] = useState(null)

  const load = useCallback(async () => {
    const [s, r, g] = await Promise.all([
      supabase.from('agent_settings').select('*'),
      supabase
        .from('agent_runs')
        .select('id, agent, started_at, ok, summary, cost_usd, details')
        .order('started_at', { ascending: false })
        .limit(400),
      supabase.from('agent_suggestions').select('*').order('created_at', { ascending: false }).limit(150),
    ])
    const err = s.error || r.error || g.error
    if (err) {
      setState((st) => ({ ...st, loading: false, missing: isMissing(err), error: isMissing(err) ? null : err.message }))
      return
    }
    setState({
      loading: false,
      missing: false,
      error: null,
      settings: Object.fromEntries((s.data || []).map((x) => [x.agent, x])),
      runs: r.data || [],
      suggestions: g.data || [],
    })
    const snap = (r.data || []).find((x) => x.agent === 'butce' && x.details?.remaining != null)
    if (snap) setBudget((b) => b ?? { ...snap.details, at: snap.started_at })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const month = monthStart()
  const byAgent = useMemo(() => {
    const m = Object.fromEntries(AGENTS.map((a) => [a.key, { last: null, spent: 0, runs: 0 }]))
    for (const run of state.runs) {
      const e = m[run.agent] || (m[run.agent] = { last: null, spent: 0, runs: 0 })
      if (!e.last) e.last = run
      if (run.started_at >= month) {
        e.spent += Number(run.cost_usd || 0)
        e.runs++
      }
    }
    return m
  }, [state.runs, month])

  async function saveSetting(agent, patch) {
    const cur = state.settings[agent] || {}
    const row = {
      agent,
      enabled: cur.enabled ?? true,
      monthly_budget_usd: cur.monthly_budget_usd ?? 0,
      ...patch,
      updated_at: new Date().toISOString(),
    }
    setState((st) => ({ ...st, settings: { ...st.settings, [agent]: row } }))
    const { error } = await supabase.from('agent_settings').upsert(row)
    if (error) {
      alert(error.message)
      load()
    }
  }

  async function decide(s, status) {
    const decided_at = status === 'yeni' ? null : new Date().toISOString()
    setState((st) => ({ ...st, suggestions: st.suggestions.map((x) => (x.id === s.id ? { ...x, status, decided_at } : x)) }))
    const { error } = await supabase.from('agent_suggestions').update({ status, decided_at }).eq('id', s.id)
    if (error) {
      alert(error.message)
      load()
    }
    window.dispatchEvent(new Event('agents:inbox')) // kenar menüsündeki sayaç güncellensin
  }

  async function refreshBudget() {
    setBudgetBusy(true)
    setBudgetErr(null)
    try {
      setBudget(await serverApi('/api/agents/budget', { method: 'POST' }))
      load()
    } catch (e) {
      setBudgetErr(e.message)
    } finally {
      setBudgetBusy(false)
    }
  }

  const header = (
    <>
      <div className="page-kicker">Otomasyon</div>
      <h1>Ajanlar</h1>
      <p className="page-desc">
        Siteyi senin adına izleyen ve hazırlayan ajanlar. Hiçbiri senin onayın olmadan yayınlamaz, paylaşmaz ya da silmez.
      </p>
    </>
  )

  if (state.loading) {
    return (
      <div className="agents-loading">
        <Loader2 size={22} className="spin" />
      </div>
    )
  }

  if (state.missing || state.error) {
    return (
      <div>
        {header}
        <div className="admin-card today-empty">
          <AlertTriangle size={20} />
          <div>
            {state.missing ? (
              <>
                <strong>Ajan tabloları henüz kurulmadı.</strong>
                <p>
                  Supabase → SQL Editor'de <code>supabase/agents.sql</code> dosyasını bir kez çalıştır. Ajanlar o zamana
                  kadar da çalışır ama kayıt ve öneri bırakamaz.
                </p>
              </>
            ) : (
              <p>{state.error}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  const fresh = state.suggestions.filter((s) => s.status === 'yeni')
  const history = state.suggestions.filter((s) => s.status !== 'yeni')
  const list = tab === 'yeni' ? fresh : history
  const aiAgents = AGENTS.filter((a) => a.ai)
  const totalSpent = aiAgents.reduce((n, a) => n + byAgent[a.key].spent, 0)
  const lowBalance = budget?.remaining != null && budget.remaining < AI_RESERVE
  const used = budget?.limit ? Math.min(100, Math.max(0, (1 - budget.remaining / budget.limit) * 100)) : null

  return (
    <div className="agents">
      {header}

      <ul className="agent-rules">
        <li>
          <b>Kendi başına</b> okur, ölçer, çevirir, taslak ve öneri hazırlar.
        </li>
        <li>
          <b>Senin onayınla</b> yayınlar, LinkedIn'de paylaşır, proje sayfasını değiştirir.
        </li>
        <li>
          <b>Asla</b> silmez, Hakkımda'ya dokunmaz, bütçeyi aşmaz.
        </li>
      </ul>

      <div className="agents-top">
        <section className="admin-card budget-card">
          <div className="card-head">
            <h3>
              <Wallet size={16} /> Yapay zeka bütçesi
            </h3>
            <button type="button" className="btn btn-secondary btn-sm" onClick={refreshBudget} disabled={budgetBusy}>
              {budgetBusy ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Yenile
            </button>
          </div>

          {budget ? (
            <>
              <div className="budget-big">
                <span className={`budget-num${lowBalance ? ' is-low' : ''}`}>{usd(budget.remaining)}</span>
                <span className="budget-of">kalan{budget.limit != null ? ` · ${usd(budget.limit)} limitten` : ''}</span>
              </div>
              {used != null && (
                <div className="meter" aria-label={`Bütçenin %${Math.round(used)}'i kullanıldı`}>
                  <span style={{ width: `${used}%` }} className={lowBalance ? 'is-low' : ''} />
                </div>
              )}
              <p className="muted-line">
                Bu ay harcanan {usd(budget.usageMonthly)} · {ago(budget.at)} ölçüldü
              </p>
            </>
          ) : (
            <p className="muted-line">Henüz ölçüm yok. "Yenile" ile şimdi ölçebilirsin.</p>
          )}
          {budgetErr && <div className="alert err">{budgetErr}</div>}
          {lowBalance && (
            <div className="alert err">
              Bakiye {usd(AI_RESERVE)} altında: günlük bot dışındaki yapay zekalı ajanlar duraklatıldı.{' '}
              <a href="https://openrouter.ai/settings/credits" target="_blank" rel="noreferrer">
                Bakiye yükle ↗
              </a>
            </div>
          )}

          <div className="spend-list">
            <div className="spend-head">
              Bu ay ajanların harcaması · toplam {usd(totalSpent)} · <Link to="/admin/spend">Döküm →</Link>
            </div>
            {aiAgents.map((a) => {
              const e = byAgent[a.key]
              const cap = Number(state.settings[a.key]?.monthly_budget_usd ?? 0)
              const pct = cap > 0 ? Math.min(100, (e.spent / cap) * 100) : 0
              return (
                <div key={a.key} className="spend-row">
                  <span className="spend-name">{a.name}</span>
                  <div className="meter thin">
                    <span style={{ width: `${pct}%` }} className={pct >= 80 ? 'is-low' : ''} />
                  </div>
                  <span className="spend-num">
                    {usd(e.spent)} / {cap > 0 ? usd(cap) : '∞'}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        <section className="admin-card inbox-card">
          <div className="card-head">
            <h3>
              <Inbox size={16} /> Öneri kutusu
            </h3>
            <div className="seg" role="tablist">
              <button type="button" role="tab" aria-selected={tab === 'yeni'} className={tab === 'yeni' ? 'on' : ''} onClick={() => setTab('yeni')}>
                Yeni{fresh.length > 0 && <b>{fresh.length}</b>}
              </button>
              <button type="button" role="tab" aria-selected={tab === 'gecmis'} className={tab === 'gecmis' ? 'on' : ''} onClick={() => setTab('gecmis')}>
                Geçmiş
              </button>
            </div>
          </div>
          {list.length === 0 ? (
            <div className="inbox-empty">
              <CircleCheck size={22} />
              <p>
                {tab === 'yeni'
                  ? 'Bekleyen öneri yok. Ajanlar bir şey bulunca burada görünecek.'
                  : 'Henüz karar verdiğin bir öneri yok.'}
              </p>
            </div>
          ) : (
            <ul className="inbox">
              {list.map((s) => (
                <Suggestion key={s.id} s={s} onDecide={decide} />
              ))}
            </ul>
          )}
        </section>
      </div>

      <h2 className="agents-sub">Ekip</h2>
      <div className="agent-grid">
        {AGENTS.map((a) => (
          <AgentCard
            key={a.key}
            a={a}
            setting={state.settings[a.key]}
            stats={byAgent[a.key]}
            onToggle={() => saveSetting(a.key, { enabled: !(state.settings[a.key]?.enabled ?? true) })}
            onBudget={(v) => {
              const n = Math.round(Number(String(v).replace(',', '.')) * 100) / 100
              if (Number.isFinite(n) && n >= 0) saveSetting(a.key, { monthly_budget_usd: n })
            }}
          />
        ))}
      </div>
    </div>
  )
}

function Suggestion({ s, onDecide }) {
  const a = AGENT_BY_KEY[s.agent]
  const Icon = a?.icon || Bot
  const [open, setOpen] = useState(false)
  const long = (s.body || '').length > 280 || (s.body || '').split('\n').length > 6
  const link = s.data?.link
  const internal = typeof link === 'string' && link.startsWith('/')

  return (
    <li className={`sugg kind-${s.kind} st-${s.status}`}>
      <span className="sugg-icon">
        <Icon size={16} />
      </span>
      <div className="sugg-main">
        <div className="sugg-meta">
          <span className="chip">{KIND_LABEL[s.kind] || s.kind}</span>
          <span>{a?.name || s.agent}</span>
          <span>· {ago(s.created_at)}</span>
          {s.status !== 'yeni' && (
            <span className={`sugg-status ${s.status}`}>{s.status === 'onaylandi' ? 'Tamamlandı' : 'Reddedildi'}</span>
          )}
        </div>
        <strong className="sugg-title">{s.title}</strong>
        {s.body && <div className={`sugg-body${long && !open ? ' is-clamped' : ''}`}>{s.body}</div>}
        {long && (
          <button type="button" className="link-btn" onClick={() => setOpen((o) => !o)}>
            {open ? 'Daha az göster' : 'Devamını göster'}
          </button>
        )}
        <div className="sugg-actions">
          {link &&
            (internal ? (
              <Link className="btn btn-secondary btn-sm" to={link}>
                <ExternalLink size={14} /> Aç
              </Link>
            ) : (
              <a className="btn btn-secondary btn-sm" href={link} target="_blank" rel="noreferrer">
                <ExternalLink size={14} /> Aç
              </a>
            ))}
          {s.status === 'yeni' ? (
            <>
              <button type="button" className="btn btn-dark btn-sm" onClick={() => onDecide(s, 'onaylandi')}>
                <Check size={14} /> Tamam
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => onDecide(s, 'reddedildi')}>
                <X size={14} /> Reddet
              </button>
            </>
          ) : (
            <button type="button" className="link-btn" onClick={() => onDecide(s, 'yeni')}>
              Geri al
            </button>
          )}
        </div>
      </div>
    </li>
  )
}

function AgentCard({ a, setting, stats, onToggle, onBudget }) {
  const Icon = a.icon
  const enabled = setting?.enabled ?? true
  const last = stats.last
  const saved = setting?.monthly_budget_usd != null ? String(setting.monthly_budget_usd) : ''
  const [budget, setBudget] = useState(saved)
  useEffect(() => setBudget(saved), [saved])
  const status = !enabled ? 'off' : !last ? 'idle' : last.ok ? 'ok' : 'bad'

  return (
    <article className={`agent-card is-${status}`}>
      <div className="agent-head">
        <span className="agent-icon">
          <Icon size={18} />
        </span>
        <div className="agent-title">
          <h3>{a.name}</h3>
          <div className="agent-tags">
            <span className={`chip ${a.ai ? 'chip-ai' : 'chip-free'}`}>
              {a.ai ? (
                <>
                  <Sparkles size={11} /> Yapay zeka
                </>
              ) : (
                'Ücretsiz'
              )}
            </span>
            <span className="chip">
              <Clock size={11} /> {a.schedule}
            </span>
          </div>
        </div>
        <button
          type="button"
          className={`switch${enabled ? ' on' : ''}`}
          onClick={onToggle}
          aria-pressed={enabled}
          title={enabled ? 'Ajanı durdur' : 'Ajanı çalıştır'}
        >
          <span className="switch-knob" />
          <span className="switch-label">{enabled ? 'Açık' : 'Kapalı'}</span>
        </button>
      </div>

      <p className="agent-desc">{a.desc}</p>

      <div className="agent-last">
        <span className={`dot dot-${status}`} aria-hidden />
        {last ? (
          <span>
            <b>{ago(last.started_at)}</b> · {last.summary || (last.ok ? 'Sorunsuz çalıştı' : 'Hata verdi')}
          </span>
        ) : (
          <span className="muted">Henüz çalışma kaydı yok</span>
        )}
      </div>

      {a.ai && (
        <div className="agent-budget">
          <label>
            Aylık bütçe
            <span className="input-usd">
              $
              <input
                type="number"
                min="0"
                step="0.1"
                inputMode="decimal"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                onBlur={() => budget !== saved && onBudget(budget)}
              />
            </span>
          </label>
          <span className="muted">
            Bu ay {usd(stats.spent)} · {stats.runs} çalışma
          </span>
        </div>
      )}

      {a.note && <p className="agent-note">{a.note}</p>}
    </article>
  )
}
