// Ajanların ortak araçları: aç/kapat ve bütçe kontrolü, çalışma kaydı, öneri kutusu.
// Tablolar supabase/agents.sql ile kurulur. Kurulmadıysa ajanlar sessizce eski davranışa döner.
import { rest } from './db.js'

/** OpenRouter bakiyesi bunun altına inince yapay zekalı ajanlar (günlük gündem hariç) çalışmaz. */
export const AI_RESERVE_USD = 0.75

const monthStart = () => {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString()
}

const isMissingTable = (e) => e?.status === 404 || e?.code === 'PGRST205' || e?.code === '42P01'

/** agents.sql çalıştırılmış mı? */
export async function agentsReady() {
  try {
    await rest('agent_settings?select=agent&limit=1')
    return true
  } catch (e) {
    if (isMissingTable(e)) return false
    throw e
  }
}

export async function settingsFor(agent) {
  try {
    const rows = await rest(`agent_settings?agent=eq.${agent}&select=enabled,monthly_budget_usd`)
    if (rows[0]) return { enabled: rows[0].enabled, budget: Number(rows[0].monthly_budget_usd) }
  } catch (e) {
    if (!isMissingTable(e)) throw e
  }
  return { enabled: true, budget: 1 }
}

/** Ajanın bu ay yapay zekaya harcadığı tutar (dolar). */
export async function monthSpend(agent) {
  try {
    const rows = await rest(`agent_runs?agent=eq.${agent}&started_at=gte.${monthStart()}&select=cost_usd`)
    return rows.reduce((n, r) => n + Number(r.cost_usd || 0), 0)
  } catch (e) {
    if (isMissingTable(e)) return 0
    throw e
  }
}

/** OpenRouter anahtarının bakiyesi: { limit, remaining, usageMonthly } ya da null. */
export async function openRouterBalance() {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return null
  try {
    const res = await fetch('https://openrouter.ai/api/v1/key', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return null
    const d = (await res.json()).data || {}
    return {
      limit: d.limit ?? null,
      remaining: d.limit_remaining ?? null,
      usageMonthly: d.usage_monthly ?? d.usage ?? null,
      usageDaily: d.usage_daily ?? null,
    }
  } catch {
    return null
  }
}

/**
 * Bu ajan şimdi yapay zeka kullanabilir mi? Kapalıysa, aylık bütçesi dolduysa ya da
 * OpenRouter bakiyesi yedeğin altındaysa hayır. { ok, reason }
 */
export async function canUseAI(agent, { reserve = AI_RESERVE_USD } = {}) {
  const s = await settingsFor(agent)
  if (!s.enabled) return { ok: false, reason: 'Ajan panelden kapatılmış' }
  const spent = await monthSpend(agent)
  if (s.budget > 0 && spent >= s.budget) {
    return { ok: false, reason: `Aylık bütçe doldu (${spent.toFixed(2)} / ${s.budget.toFixed(2)} $)` }
  }
  const bal = await openRouterBalance()
  if (bal?.remaining != null && bal.remaining < reserve) {
    return { ok: false, reason: `OpenRouter bakiyesi düşük (${bal.remaining.toFixed(2)} $); günlük bot için ayrıldı` }
  }
  return { ok: true, spent, budget: s.budget }
}

/** Çalışma kaydı bırakır (tablo yoksa sessizce geçer). */
export async function recordRun(agent, { ok = true, summary = '', cost = 0, details = {} } = {}) {
  try {
    await rest('agent_runs', {
      method: 'POST',
      body: { agent, ok, summary: String(summary).slice(0, 500), cost_usd: Number(cost) || 0, details },
      prefer: 'return=minimal',
    })
  } catch (e) {
    if (!isMissingTable(e)) console.error(`   ! çalışma kaydı yazılamadı: ${e.message}`)
  }
}

/**
 * Öneri kutusuna öneri bırakır. dedupeKey aynıysa ikinci kez eklenmez.
 * Döner: eklendiyse satır, tekrar ya da tablo yoksa null.
 */
export async function suggest({ agent, kind, title, body = '', data = {}, dedupeKey = null }) {
  try {
    const rows = await rest('agent_suggestions?on_conflict=dedupe_key', {
      method: 'POST',
      body: { agent, kind, title: String(title).slice(0, 200), body, data, dedupe_key: dedupeKey },
      prefer: 'resolution=ignore-duplicates,return=representation',
    })
    return rows?.[0] || null
  } catch (e) {
    if (isMissingTable(e)) return null
    throw e
  }
}
