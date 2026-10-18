// POST /api/agents/budget — OpenRouter bakiyesini anlık okur, bütçe bekçisinin kaydına yazar.
// Anahtar yalnızca Vercel ortam değişkeninde durur; tarayıcıya gönderilmez.
import { json, requireAdmin, db } from '../_linkedin.js'

const fmt = (n) => (n == null ? '?' : Number(n).toFixed(2))

export async function POST(request) {
  if (!(await requireAdmin(request))) return json({ error: 'Yetkisiz' }, 401)
  const key = process.env.OPENROUTER_API_KEY
  if (!key) return json({ error: 'Sunucuda OPENROUTER_API_KEY tanımlı değil' }, 500)

  let d
  try {
    const res = await fetch('https://openrouter.ai/api/v1/key', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return json({ error: `OpenRouter yanıt vermedi (${res.status})` }, 502)
    d = (await res.json()).data || {}
  } catch {
    return json({ error: 'OpenRouter’a ulaşılamadı' }, 502)
  }

  const details = {
    limit: d.limit ?? null,
    remaining: d.limit_remaining ?? null,
    usageMonthly: d.usage_monthly ?? d.usage ?? null,
    usageDaily: d.usage_daily ?? null,
  }
  await db('agent_runs', {
    method: 'POST',
    body: { agent: 'butce', ok: true, summary: `Kalan ${fmt(details.remaining)} $ · bu ay ${fmt(details.usageMonthly)} $`, details },
    prefer: 'return=minimal',
  }).catch(() => {}) // agents.sql çalıştırılmadıysa yine de bakiyeyi döndür
  return json({ ...details, at: new Date().toISOString() })
}
