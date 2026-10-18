// Haftalık analiz ajanı ('analiz') — her pazartesi geçen haftanın ziyaretçi raporunu öneri kutusuna bırakır.
//
//   node weekly.js           → yalnızca pazartesi (İstanbul) çalışır, raporu Supabase'e yazar
//   node weekly.js --force   → günü beklemeden çalışır
//   node weekly.js --dry     → raporu ve yazılacakları ekrana basar, hiçbir şey yazmaz
//   node weekly.js --no-ai   → yapay zeka yorumu olmadan (ücretsiz)
//
// "Bu hafta": şu andan geriye 7 gün · "geçen hafta": ondan önceki 7 gün.
// Rapor her zaman koddan üretilir; yapay zeka yalnızca yorum ve yazı fikri ekler.
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { rest, hasDb } from './db.js'
import { askJSON, getUsage } from './llm.js'
import { MODEL, CONTENT_RULES } from './config.js'
import { settingsFor, canUseAI, recordRun, suggest } from './agentkit.js'

const envFile = fileURLToPath(new URL('./.env', import.meta.url))
if (existsSync(envFile)) process.loadEnvFile(envFile)

const args = new Set(process.argv.slice(2))
const DRY = args.has('--dry')
const FORCE = args.has('--force')
const NO_AI = args.has('--no-ai')

const AGENT = 'analiz'
const TZ = 'Europe/Istanbul'
const DAY = 864e5
const PAGE = 1000
const MIN_VIEWS_FOR_AI = 5
const JSON_ONLY = 'Yalnızca geçerli JSON döndür; JSON dışında hiçbir şey yazma.'

const log = (...a) => console.log(...a)

/* ---------------------------------------------------------------
 * Tarih yardımcıları (İstanbul saati)
 * ------------------------------------------------------------- */
const ymd = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d)

const isMonday = () => new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(new Date()) === 'Mon'

const dateParts = (d) =>
  Object.fromEntries(
    new Intl.DateTimeFormat('tr-TR', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' })
      .formatToParts(d)
      .map((p) => [p.type, p.value])
  )

/** 12–18 Ekim · 28 Eylül – 4 Ekim · 28 Aralık 2026 – 3 Ocak 2027 */
function rangeLabel(start, end) {
  const a = dateParts(start)
  const b = dateParts(new Date(end.getTime() - 1))
  if (a.year !== b.year) return `${a.day} ${a.month} ${a.year} – ${b.day} ${b.month} ${b.year}`
  if (a.month !== b.month) return `${a.day} ${a.month} – ${b.day} ${b.month}`
  return `${a.day}–${b.day} ${b.month}`
}

/** ISO yıl-hafta: 2026-W42 */
function isoWeek(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const year = d.getUTCFullYear()
  const week = Math.ceil(((d - Date.UTC(year, 0, 1)) / DAY + 1) / 7)
  return `${year}-W${String(week).padStart(2, '0')}`
}

/* ---------------------------------------------------------------
 * Veri
 * ------------------------------------------------------------- */
/** Aralıktaki tüm olaylar, eskiden yeniye (Supabase satır sınırı için sayfa sayfa). */
async function fetchEvents(from, to) {
  const cols = 'created_at,visitor_id,session_id,type,path,post_kind,post_slug,value,referrer,lang,device'
  const range = `created_at=gte.${encodeURIComponent(from.toISOString())}&created_at=lt.${encodeURIComponent(to.toISOString())}`
  const all = []
  let offset = 0
  for (let page = 0; page < 200; page++) {
    const rows = await rest(`analytics_events?select=${cols}&${range}&order=id.asc&limit=${PAGE}&offset=${offset}`)
    if (!rows?.length) break
    all.push(...rows)
    offset += rows.length
  }
  return all
}

async function fetchTitles() {
  const posts = await rest('posts?published=eq.true&select=slug,title,kind')
  const map = new Map()
  for (const p of posts) {
    map.set(`${p.kind}|${p.slug}`, p.title)
    if (!map.has(p.slug)) map.set(p.slug, p.title)
  }
  return map
}

/* ---------------------------------------------------------------
 * Hesaplama
 * ------------------------------------------------------------- */
const contentKey = (e) => (e.post_slug ? `${e.post_kind || ''}|${e.post_slug}` : null)
const isFullRead = (e) => e.type === 'read' && e.value >= 75 && e.post_slug

function countBy(items, key) {
  const m = new Map()
  for (const it of items) {
    const k = key(it)
    if (k == null) continue
    m.set(k, (m.get(k) || 0) + 1)
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

/** Bir haftanın temel sayıları. */
function summarize(events) {
  const views = events.filter((e) => e.type === 'pageview')
  const sessions = new Set(views.map((e) => e.session_id))
  const engaged = events.filter((e) => e.type === 'engaged').reduce((n, e) => n + (e.value || 0), 0)
  // Okuma olayı %25/50/75/100 adımlarında ayrı ayrı gelir: aynı kişi aynı yazıyı bir kez sayılır
  const reads = new Set(events.filter(isFullRead).map((e) => `${e.visitor_id}|${contentKey(e)}`))
  const count = (type) => events.filter((e) => e.type === type).length
  return {
    pageviews: views.length,
    visitors: new Set(views.map((e) => e.visitor_id)).size,
    sessions: sessions.size,
    reads: reads.size,
    avgEngagedSec: sessions.size ? Math.round(engaged / sessions.size) : 0,
    listens: count('listen'),
    shares: count('share'),
    contacts: count('contact'),
    outbound: count('outbound'),
  }
}

/** En çok görüntülenen 5 yazı/proje. Okuma oranı: sonuna kadar okuyan kişi / açan kişi. */
function topContent(events, titles) {
  const m = new Map()
  for (const e of events) {
    const key = contentKey(e)
    if (!key) continue
    if (!m.has(key)) m.set(key, { kind: e.post_kind, slug: e.post_slug, pageviews: 0, viewers: new Set(), readers: new Set(), engaged: 0 })
    const c = m.get(key)
    if (e.type === 'pageview') {
      c.pageviews++
      c.viewers.add(e.visitor_id)
    } else if (isFullRead(e)) c.readers.add(e.visitor_id)
    else if (e.type === 'engaged') c.engaged += e.value || 0
  }
  return [...m.values()]
    .filter((c) => c.pageviews > 0)
    .sort((a, b) => b.pageviews - a.pageviews || b.readers.size - a.readers.size)
    .slice(0, 5)
    .map((c) => ({
      title: titles.get(`${c.kind}|${c.slug}`) || titles.get(c.slug) || c.slug,
      kind: c.kind,
      slug: c.slug,
      pageviews: c.pageviews,
      visitors: c.viewers.size,
      fullReads: c.readers.size,
      readRate: Math.min(100, Math.round((c.readers.size / c.viewers.size) * 100)),
      avgEngagedSec: Math.round(c.engaged / c.pageviews),
    }))
}

const SOURCE_LABEL = { direct: '(doğrudan)', '': '(doğrudan)', linkedin: 'LinkedIn', google: 'Google', x: 'X (Twitter)', github: 'GitHub' }
const DEVICE_LABEL = { mobile: 'Telefon', desktop: 'Bilgisayar', tablet: 'Tablet' }
const LANG_LABEL = {
  tr: 'Türkçe', en: 'İngilizce', de: 'Almanca', fr: 'Fransızca', es: 'İspanyolca',
  it: 'İtalyanca', pt: 'Portekizce', ru: 'Rusça', zh: 'Çince', ja: 'Japonca',
}

function buildStats({ now, prev, titles, start, end, prevStart }) {
  const views = now.filter((e) => e.type === 'pageview')

  // Geliş kaynağı yalnızca oturumun ilk sayfasında yazılır; her oturum bir kez sayılır.
  // İlk sayfası sayılmamış oturum (ör. yönetici girişi kapatılınca devam eden sekme) "bilinmiyor".
  const entry = new Map()
  for (const e of views) {
    if (!entry.has(e.session_id) || (entry.get(e.session_id) == null && e.referrer != null)) entry.set(e.session_id, e.referrer)
  }
  const referrers = countBy([...entry.values()], (r) => (r == null ? '(bilinmiyor)' : SOURCE_LABEL[r.trim()] || r.trim()))
    .slice(0, 6)
    .map(([source, sessions]) => ({ source, sessions }))

  // Cihaz ve dil kişi başına (kişinin haftadaki ilk sayfası)
  const firstView = new Map()
  for (const e of views) if (!firstView.has(e.visitor_id)) firstView.set(e.visitor_id, e)
  const people = [...firstView.values()]
  const devices = countBy(people, (e) => DEVICE_LABEL[e.device] || e.device || 'bilinmiyor').map(([device, visitors]) => ({ device, visitors }))
  const languages = countBy(people, (e) => LANG_LABEL[e.lang] || e.lang || 'bilinmiyor')
    .slice(0, 3)
    .map(([lang, visitors]) => ({ lang, visitors }))

  // Geri dönen: geçen hafta da sitede görülen tarayıcı
  const seenBefore = new Set(prev.map((e) => e.visitor_id))
  const returning = people.filter((e) => seenBefore.has(e.visitor_id)).length

  const startDay = ymd(start)
  return {
    range: {
      label: rangeLabel(start, end),
      prevLabel: rangeLabel(prevStart, start),
      start: start.toISOString(),
      end: end.toISOString(),
      isoWeek: isoWeek(startDay),
    },
    thisWeek: summarize(now),
    lastWeek: summarize(prev),
    topContent: topContent(now, titles),
    referrers,
    devices,
    languages,
    visitorTypes: { new: people.length - returning, returning },
  }
}

/* ---------------------------------------------------------------
 * Metin rapor (yapay zeka gerekmez)
 * ------------------------------------------------------------- */
const nf = new Intl.NumberFormat('tr-TR')

function change(now, before) {
  if (!now && !before) return '—'
  if (!before) return 'yeni'
  const pct = Math.round(((now - before) / before) * 100)
  if (pct === 0) return 'aynı'
  return `${pct > 0 ? '+' : '-'}%${Math.abs(pct)}`
}

function duration(sec) {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return m ? `${m} dk ${s} sn` : `${s} sn`
}

/** Uzun satırları kelime sınırından böler; devam satırları girintili. */
function wrap(text, width = 72, indent = '') {
  const out = []
  let line = ''
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    if (line && (indent.length + line.length + 1 + word.length) > width) {
      out.push(line)
      line = word
    } else line = line ? `${line} ${word}` : word
  }
  if (line) out.push(line)
  return out.map((l, i) => (i ? indent + l : l)).join('\n')
}

const METRICS = [
  ['pageviews', 'Görüntülenme'],
  ['visitors', 'Ziyaretçi'],
  ['sessions', 'Oturum'],
  ['reads', 'Okuma (%75+)'],
  ['avgEngagedSec', 'Süre/oturum (sn)'],
  ['listens', 'Dinleme'],
  ['shares', 'Paylaşım'],
  ['contacts', 'İletişim'],
  ['outbound', 'Dış tıklama'],
]
const KIND_LABEL = { blog: 'yazı', project: 'proje' }

function buildReport(s) {
  const L = []
  L.push(`Haftalık rapor · ${s.range.label}`)
  L.push(`Karşılaştırma: ${s.range.prevLabel}`)
  L.push('')
  L.push(`${''.padEnd(17)}${'Bu hafta'.padStart(9)}${'Geçen'.padStart(7)}${'Değişim'.padStart(9)}`)
  for (const [key, label] of METRICS) {
    const a = s.thisWeek[key]
    const b = s.lastWeek[key]
    L.push(`${label.padEnd(17)}${nf.format(a).padStart(9)}${nf.format(b).padStart(7)}${change(a, b).padStart(9)}`)
  }
  L.push('')
  L.push(`Yeni ziyaretçi: ${s.visitorTypes.new} · geri dönen: ${s.visitorTypes.returning}`)
  if (s.devices.length) L.push(`Cihaz: ${s.devices.map((d) => `${d.device} ${d.visitors}`).join(' · ')}`)
  if (s.languages.length) L.push(`Dil: ${s.languages.map((l) => `${l.lang} ${l.visitors}`).join(' · ')}`)

  L.push('')
  L.push('En çok okunanlar')
  if (!s.topContent.length) L.push('Bu hafta hiçbir yazı ya da proje sayfası açılmadı.')
  s.topContent.forEach((c, i) => {
    // Küçük sayılarda yüzde yanıltır (1/1 = %100); yüzde ancak 10 kişiden sonra eklenir
    const read = `sona kadar ${c.fullReads}/${c.visitors} kişi${c.visitors >= 10 ? ` (%${c.readRate})` : ''}`
    L.push(wrap(`${i + 1}. ${c.title}`, 72, '   '))
    L.push(`   ${KIND_LABEL[c.kind] || 'sayfa'} · ${c.pageviews} görüntülenme · ${read} · ort. ${duration(c.avgEngagedSec)}`)
  })

  L.push('')
  L.push('Nereden geldiler (oturum)')
  if (!s.referrers.length) L.push('Kayıt yok.')
  for (const r of s.referrers) L.push(`${r.source.padEnd(24)}${String(r.sessions).padStart(5)}`)
  return L.join('\n')
}

function aiSection(ai) {
  const L = ['', 'Yorum']
  for (const i of ai.insights) L.push(`- ${wrap(i, 72, '  ')}`)
  L.push('', 'Bu hafta yazılabilecekler')
  ai.ideas.forEach((idea, i) => {
    L.push(wrap(`${i + 1}. ${idea.title}`, 72, '   '))
    if (idea.why) L.push(`   ${wrap(idea.why, 72, '   ')}`)
  })
  return L.join('\n')
}

/* ---------------------------------------------------------------
 * Yapay zeka yorumu (isteğe bağlı, tek çağrı)
 * ------------------------------------------------------------- */
async function commentary(stats, publishedTitles) {
  const out = await askJSON({
    label: 'haftalık analiz',
    system: `Sen Berat Emek'in LinkedIn ve blog büyüme stratejistisin. Berat yapay zeka ve full-stack geliştirici; kendi blog yazıları ve projeleriyle LinkedIn'de kişisel marka kuruyor. Site haber sitesi değil, müşteri de aranmıyor: amaç geliştiricilerin yazıları bulması, sonuna kadar okuması ve Berat'ı takip etmesi.

Sana sitenin bu haftaki ve geçen haftaki ziyaretçi istatistikleri JSON olarak veriliyor:
- thisWeek / lastWeek: pageviews (sayfa görüntüleme), visitors (tekil ziyaretçi), sessions (oturum), reads (yazıyı ya da projeyi %75'ine kadar okuyan kişi), avgEngagedSec (oturum başına aktif saniye), listens (sesli dinleme başlatma), shares (paylaşım), contacts (e-posta tıklaması), outbound (dış bağlantı tıklaması)
- topContent: bu hafta en çok açılan yazı/projeler; fullReads/visitors = açan kişilerden kaçı sonuna kadar indi, readRate = bunun yüzdesi (yalnızca 10+ kişide verilir; yoksa "1/1 kişi" gibi yaz, yüzde söyleme), avgEngagedSec = görüntüleme başına aktif saniye.
  Kısa sayfalar ekrana sığdığı için açılır açılmaz "sona kadar okundu" sayılabilir: süre 15 saniyenin altındaysa bunu gerçek okuma diye yorumlama.
- referrers: oturumların nereden geldiği; devices ve languages: kişi sayısı; visitorTypes: yeni ve geçen hafta da gelmiş ziyaretçi
- publishedTitles: sitede zaten yayında olan başlıklar

Görevin:
1. insights: tam 4 madde. Her madde en az bir sayı içersin ve bir sonuç söylesin (ne oldu, ne anlama geliyor). Veride olmayan bir şeyi çıkarma, tahmini gerçek gibi yazma.
   Veri azsa (ör. haftada 50'nin altında görüntülenme) bunu açıkça söyle; küçük sayılardaki yüzde değişimleri büyütme, mutlak sayıyı ver.
2. ideas: tam 2 yazı fikri. Her biri okurların bu hafta gerçekten açtığı, okuduğu ya da uzun kaldığı içeriğe dayansın; "why" alanında hangi içeriğe ve hangi sayıya dayandığını yaz. publishedTitles'taki konuları tekrar önerme.
Kurallar: sade, profesyonel Türkçe; JSON alan adlarını (reads, pageviews…) metne yazma, Türkçe karşılığını kullan. Klişe ve genel tavsiye yasak ("tutarlı paylaşım yapın", "etkileşimi artırın", "değer katın" gibi). Hype, ünlem, emoji yok. Her madde en fazla 2 cümle.
${CONTENT_RULES}
Çıktı: {"insights":["..."],"ideas":[{"title":"...","why":"..."}]}
${JSON_ONLY}`,
    // Küçük sayılarda yüzde yanıltır (1/1 = %100): 10 kişinin altında okuma oranı modele gitmez
    user: JSON.stringify({
      ...stats,
      topContent: stats.topContent.map(({ readRate, ...c }) => (c.visitors >= 10 ? { ...c, readRate } : c)),
      publishedTitles,
    }),
    temperature: 0.4,
    maxTokens: 1500,
  })
  const insights = (Array.isArray(out.insights) ? out.insights : []).map((s) => String(s).trim()).filter(Boolean).slice(0, 4)
  const ideas = (Array.isArray(out.ideas) ? out.ideas : [])
    .filter((i) => i?.title)
    .slice(0, 2)
    .map((i) => ({ title: String(i.title).trim(), why: String(i.why || '').trim() }))
  if (!insights.length) throw new Error('Model yorum maddesi döndürmedi')
  return { insights, ideas }
}

/** Yapay zeka çalışmayacaksa nedeni; çalışabilirse null. */
async function aiSkipReason(stats) {
  if (NO_AI) return '--no-ai ile çalıştırıldı'
  if (stats.thisWeek.pageviews < MIN_VIEWS_FOR_AI) {
    return `bu hafta yalnızca ${stats.thisWeek.pageviews} görüntülenme var (en az ${MIN_VIEWS_FOR_AI} gerekli)`
  }
  if (!process.env.OPENROUTER_API_KEY) return 'OPENROUTER_API_KEY tanımlı değil'
  const gate = await canUseAI(AGENT)
  return gate.ok ? null : gate.reason
}

/* ---------------------------------------------------------------
 * Akış
 * ------------------------------------------------------------- */
async function main() {
  if (!hasDb()) {
    log('SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY tanımlı değil; haftalık rapor atlandı.')
    return
  }
  if (!FORCE && !isMonday()) {
    log('Bugün pazartesi değil; haftalık rapor atlandı.')
    return
  }
  const settings = await settingsFor(AGENT)
  if (!settings.enabled) {
    log('Analiz ajanı panelden kapatılmış; haftalık rapor atlandı.')
    return
  }

  const end = new Date()
  const start = new Date(end.getTime() - 7 * DAY)
  const prevStart = new Date(end.getTime() - 14 * DAY)
  log(`Haftalık analiz · ${rangeLabel(start, end)}${DRY ? ' · deneme modu' : ''}`)

  const [events, titles] = await Promise.all([fetchEvents(prevStart, end), fetchTitles()])
  const now = events.filter((e) => new Date(e.created_at) >= start)
  const prev = events.filter((e) => new Date(e.created_at) < start)
  log(`   ${events.length} olay okundu (bu hafta ${now.length}, geçen hafta ${prev.length})`)

  const stats = buildStats({ now, prev, titles, start, end, prevStart })
  let report = buildReport(stats)

  let ai = null
  let aiNote = null
  const skip = await aiSkipReason(stats)
  if (skip) {
    aiNote = `Yapay zeka yorumu atlandı: ${skip}.`
  } else {
    log(`   Yapay zeka yorumu isteniyor (${MODEL})…`)
    try {
      const published = [...new Set([...titles.entries()].filter(([k]) => k.includes('|')).map(([, t]) => t))].slice(0, 60)
      ai = await commentary(stats, published)
    } catch (e) {
      aiNote = `Yapay zeka yorumu alınamadı: ${e.message}`
    }
  }
  report += ai ? `\n${aiSection(ai)}` : `\n\n${aiNote}`

  const cost = getUsage().costUsd
  const s = stats.thisWeek
  const suggestion = {
    agent: AGENT,
    kind: 'weekly-report',
    title: `Haftalık rapor: ${stats.range.label}`,
    body: report,
    data: { stats, ...(ai ? { ai } : {}), link: '/admin/analytics' },
    dedupeKey: `weekly-report:${stats.range.isoWeek}`,
  }
  const run = {
    summary: `${s.pageviews} görüntülenme · ${s.visitors} ziyaretçi`,
    cost,
    details: { week: stats.range.label, isoWeek: stats.range.isoWeek, ai: ai ? 'ok' : aiNote },
  }

  if (DRY) {
    log(`\n${'-'.repeat(60)}\n${report}\n${'-'.repeat(60)}`)
    log('\nDeneme modu: hiçbir şey yazılmadı. Yazılacaklar:')
    log(`   öneri: [${suggestion.kind}] ${suggestion.title} · dedupe: ${suggestion.dedupeKey}`)
    log(`   çalışma kaydı: ${run.summary} · $${cost}`)
    log(`   stats: ${JSON.stringify(stats, null, 2)}`)
    return
  }

  const row = await suggest(suggestion)
  log(row ? `   Öneri kutusuna eklendi: ${suggestion.title}` : '   Öneri eklenmedi (bu hafta zaten var ya da ajan tabloları kurulmamış)')
  await recordRun(AGENT, run)
  log(`   ${run.summary} · $${cost}`)
}

main().catch((e) => {
  console.error('Haftalık analiz hata verdi:', e.message)
  process.exitCode = 1
})
