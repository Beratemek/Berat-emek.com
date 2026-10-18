// Site bekçisi — her sabah GitHub Actions ("Ajanlar") tarafından çalıştırılır.
// Yapay zeka KULLANMAZ; ücretsizdir. Bulduklarını admin panelindeki öneri kutusuna bırakır.
//
//   1) Canlı demolar: yayındaki projelerin demo adresleri açılıyor mu?           (ajan: demo)
//   2) GitHub: projelerin depolarında bu hafta hareket ya da yeni sürüm var mı?  (ajan: demo)
//   3) Bütçe: OpenRouter bakiyesi ve ajanların aylık bütçeleri                   (ajan: butce)
//
//   node watch.js        → kontrol eder, önerileri ve çalışma kaydını Supabase'e yazar
//   node watch.js --dry  → aynı kontroller, hiçbir şey yazmaz; ne yazılacağını ekrana basar
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { hasDb, rest } from './db.js'
import { AI_RESERVE_USD, agentsReady, settingsFor, monthSpend, openRouterBalance, recordRun, suggest } from './agentkit.js'

const envFile = fileURLToPath(new URL('./.env', import.meta.url))
if (existsSync(envFile)) process.loadEnvFile(envFile)

const DRY = process.argv.slice(2).includes('--dry')

const TZ = 'Europe/Istanbul'
const UA = 'beratemek-site-bekcisi/1.0'
const GH_OWNER = 'beratemek'
const DEMO_TIMEOUT_MS = 20_000
const RETRY_WAIT_MS = 20_000
const ACTIVITY_DAYS = 7
const MIN_COMMITS = 3
const BALANCE_WARN_USD = 1
const BALANCE_CRITICAL_USD = 0.5
const AGENT_BUDGET_WARN = 0.8
const CREDITS_URL = 'https://openrouter.ai/settings/credits'

const AGENT_LABEL = {
  gundem: 'Gündem',
  ceviri: 'Çeviri',
  analiz: 'Haftalık analiz',
  kalite: 'Kalite',
  demo: 'Bekçi',
  butce: 'Bütçe',
}

const today = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()) // YYYY-MM-DD
const month = today.slice(0, 7)
const todayLabel = new Intl.DateTimeFormat('tr-TR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())

const log = (...a) => console.log(...a)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const usd = (n) => (n == null ? '—' : `${Number(n).toFixed(2)} $`)

/** ISO hafta numarası: 2026-W42 */
function isoWeek(ymd) {
  const d = new Date(`${ymd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const week = Math.ceil(((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

/* ---------------------------------------------------------------
 * Proje içeriğinden bağlantı çıkarma (Tiptap JSON; bazen metin olarak saklanmış)
 * ------------------------------------------------------------- */
function parseContent(c) {
  if (!c) return null
  if (typeof c !== 'string') return c
  try {
    return JSON.parse(c)
  } catch {
    return null
  }
}

function walk(node, fn) {
  if (!node || typeof node !== 'object') return
  fn(node)
  for (const child of node.content || []) walk(child, fn)
}

const textOf = (node) => (node?.type === 'text' ? node.text || '' : (node?.content || []).map(textOf).join(''))

function hrefsOf(node) {
  const out = []
  walk(node, (n) => {
    for (const m of n.marks || []) if (m.type === 'link' && m.attrs?.href) out.push(m.attrs.href)
  })
  return out
}

const DEMO_LINE = /^\s*canl[ıi]\s+demo\s*:/i

/** "Canlı demo:" ile başlayan paragraf ve liste maddelerindeki adresler */
function demoLinks(doc) {
  const out = []
  walk(doc, (n) => {
    if (n.type !== 'paragraph' && n.type !== 'listItem') return
    const text = textOf(n)
    if (!DEMO_LINE.test(text)) return
    const hrefs = hrefsOf(n)
    if (hrefs.length) return out.push(...hrefs)
    // Bağlantı işareti yoksa düz metindeki alan adını al (ör. "Canlı demo: ornek.vercel.app")
    const m = text.replace(DEMO_LINE, '').match(/(https?:\/\/)?([a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?)/i)
    if (m) out.push(m[1] ? m[0] : `https://${m[0]}`)
  })
  return out
}

/** Karşılaştırma anahtarı: aynı adresin sondaki "/" farkı tekrar sayılmasın */
function urlKey(u) {
  try {
    const x = new URL(u)
    if (!/^https?:$/.test(x.protocol)) return null
    return `${x.hostname.toLowerCase()}${x.pathname.replace(/\/+$/, '')}${x.search}`
  } catch {
    return null
  }
}

const isGithubCom = (u) => {
  try {
    return /(^|\.)github\.com$/i.test(new URL(u).hostname)
  } catch {
    return false
  }
}

/** github.com/Beratemek/<depo> bağlantıları (şirket depoları hariç) */
function githubRepos(text) {
  const out = []
  for (const m of String(text || '').matchAll(/github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)/gi)) {
    if (m[1].toLowerCase() !== GH_OWNER) continue
    const repo = m[2].replace(/\.git$/i, '').replace(/\.+$/, '')
    // VizioWise şirket kodudur; hiçbir yerde gösterilmez
    if (!repo || /^viziowise/i.test(repo)) continue
    out.push({ owner: m[1], repo })
  }
  return out
}

/* ---------------------------------------------------------------
 * 1) Canlı demolar
 * ------------------------------------------------------------- */
function errorText(e) {
  if (e?.name === 'TimeoutError' || e?.name === 'AbortError') return `zaman aşımı (${DEMO_TIMEOUT_MS / 1000} sn)`
  const code = e?.cause?.code
  const known = {
    ENOTFOUND: 'alan adı bulunamadı (DNS)',
    EAI_AGAIN: 'alan adı çözümlenemedi (DNS)',
    ECONNREFUSED: 'bağlantı reddedildi',
    ECONNRESET: 'bağlantı koptu',
    UND_ERR_CONNECT_TIMEOUT: 'bağlantı zaman aşımına uğradı',
    CERT_HAS_EXPIRED: 'SSL sertifikasının süresi dolmuş',
    ERR_TLS_CERT_ALTNAME_INVALID: 'SSL sertifikası bu alan adına ait değil',
  }
  return known[code] || code || e?.message || String(e)
}

async function probe(url) {
  const t0 = Date.now()
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      headers: { 'User-Agent': UA, Accept: 'text/html,*/*' },
      signal: AbortSignal.timeout(DEMO_TIMEOUT_MS),
    })
    // Vercel silinmiş projede 404 + "x-vercel-error: DEPLOYMENT_NOT_FOUND" döner
    const vercelError = res.headers.get('x-vercel-error')
    await res.body?.cancel().catch(() => {})
    const ok = res.status >= 200 && res.status < 400 && !vercelError
    return { ok, status: res.status, error: vercelError || null, ms: Date.now() - t0 }
  } catch (e) {
    return { ok: false, status: null, error: errorText(e), ms: Date.now() - t0 }
  }
}

const statusText = (r) => (r.status ? `HTTP ${r.status}${r.error ? ` (${r.error})` : ''}` : r.error)

function whatToCheck(url) {
  const host = new URL(url).hostname
  if (host.endsWith('.vercel.app')) {
    return 'Kontrol et: Vercel panelinde projenin son dağıtımı başarılı mı; proje silinmiş ya da adı değişmiş olabilir.'
  }
  if (host.endsWith('.github.io')) {
    return 'Kontrol et: depodaki GitHub Pages iş akışı (Actions) son çalışmada başarılı mı, Settings → Pages hâlâ açık mı.'
  }
  return 'Kontrol et: sitenin barındırıldığı yer (Vercel ya da sunucu) ve alan adı ayarları.'
}

async function checkDemos(demos) {
  const results = await Promise.all(demos.map(async (d) => ({ ...d, ...(await probe(d.url)), attempts: 1 })))
  const down = results.filter((r) => !r.ok)
  if (down.length) {
    log(`   ${down.length} demo açılmadı; ${RETRY_WAIT_MS / 1000} sn sonra bir kez daha denenecek…`)
    await sleep(RETRY_WAIT_MS)
    await Promise.all(down.map(async (r) => Object.assign(r, await probe(r.url), { attempts: 2 })))
  }
  return results
}

/* ---------------------------------------------------------------
 * 2) GitHub hareketi
 * ------------------------------------------------------------- */
async function gh(path) {
  const headers = { Accept: 'application/vnd.github+json', 'User-Agent': UA, 'X-GitHub-Api-Version': '2022-11-28' }
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`
  const res = await fetch(`https://api.github.com${path}`, { headers, signal: AbortSignal.timeout(20_000) })
  if (!res.ok) {
    const err = new Error(`GitHub ${res.status}`)
    err.status = res.status
    err.rateLimited = res.headers.get('x-ratelimit-remaining') === '0'
    throw err
  }
  return res.json()
}

async function checkRepo({ owner, repo, postId, title }) {
  const base = `/repos/${owner}/${encodeURIComponent(repo)}`
  const sinceMs = Date.now() - ACTIVITY_DAYS * 864e5
  const out = { repo, project: title, postId, commits: 0, release: null }

  let commits = []
  try {
    commits = await gh(`${base}/commits?since=${new Date(sinceMs).toISOString()}&per_page=50`)
  } catch (e) {
    if (e.rateLimited) return { ...out, skipped: 'GitHub istek sınırı doldu' }
    // 404/403: gizli ya da silinmiş depo; hiç gösterme
    if (e.status === 404 || e.status === 403) return { ...out, skipped: 'erişilemiyor (gizli ya da silinmiş)' }
    if (e.status !== 409) return { ...out, skipped: `okunamadı (${e.message})` } // 409 = boş depo
  }

  // Birleştirme commit'leri ve otomasyonun (Claude ile yapılan) commit'leri sayılmaz
  const own = commits.filter(
    (c) => (c.parents?.length || 0) < 2 && !/co-authored-by:\s*claude/i.test(c.commit?.message || '')
  )
  out.commits = own.length
  out.full = commits.length >= 50 // sayfa doldu; gerçek sayı daha fazla olabilir
  out.lines = own.map((c) => String(c.commit?.message || '').split('\n')[0].trim().slice(0, 120)).filter(Boolean)

  try {
    const [rel] = await gh(`${base}/releases?per_page=1`)
    if (rel && !rel.draft && rel.published_at && Date.parse(rel.published_at) >= sinceMs) {
      out.release = { tag: rel.tag_name, name: rel.name || '', url: rel.html_url, publishedAt: rel.published_at }
    }
  } catch {
    // Sürüm bilgisi alınamazsa commit sonucu yine geçerli
  }
  return out
}

/* ---------------------------------------------------------------
 * 1 + 2) Projeler: demo ve GitHub kontrolü
 * ------------------------------------------------------------- */
async function watchProjects(out) {
  const posts = await rest('posts?kind=eq.project&published=eq.true&select=id,slug,title,project_url,content')

  const demos = new Map()
  const repos = new Map()
  for (const p of posts) {
    const doc = parseContent(p.content)
    const urls = [p.project_url, ...(doc ? demoLinks(doc) : [])].filter((u) => u && !isGithubCom(u))
    for (const url of urls) {
      const key = urlKey(url)
      if (key && !demos.has(key)) demos.set(key, { url, postId: p.id, title: p.title })
    }
    const text = `${p.project_url || ''} ${doc ? JSON.stringify(doc) : ''}`
    for (const r of githubRepos(text)) {
      const key = r.repo.toLowerCase()
      if (!repos.has(key)) repos.set(key, { ...r, postId: p.id, title: p.title })
    }
  }

  log(`\n1/3 Canlı demolar (${demos.size}) ve GitHub depoları (${repos.size}) kontrol ediliyor…`)
  const [demoResults, repoResults] = await Promise.all([
    checkDemos([...demos.values()]),
    Promise.all([...repos.values()].map(checkRepo)),
  ])

  // Demolar
  log('\n   Canlı demolar')
  if (!demoResults.length) log('   Demo adresi bulunamadı.')
  for (const d of demoResults) {
    const code = String(d.status ?? '---').padEnd(4)
    log(`   ${d.ok ? '✓' : '✗'} ${code}${String(d.ms).padStart(6)} ms  ${d.url}  · ${d.title}${d.ok ? '' : `\n          → ${statusText(d)}`}`)
  }
  for (const d of demoResults.filter((r) => !r.ok)) {
    out.suggestions.push({
      agent: 'demo',
      kind: 'demo-down',
      title: `${d.title}: canlı demo açılmıyor`,
      body: [`Adres: ${d.url}`, `Durum: ${statusText(d)}. ${RETRY_WAIT_MS / 1000} sn arayla iki denemede de açılmadı.`, whatToCheck(d.url)].join('\n'),
      data: { link: d.url, postId: d.postId, status: d.status ?? d.error },
      dedupeKey: `demo-down:${d.url}:${today}`,
    })
  }

  // GitHub
  log('\n2/3 GitHub depoları (son 7 gün)')
  if (!repoResults.length) log('   Depo bulunamadı.')
  const week = isoWeek(today)
  const activeProjects = new Set()
  for (const r of repoResults) {
    if (r.skipped) {
      log(`   – ${r.repo.padEnd(24)} atlandı: ${r.skipped}`)
      continue
    }
    const n = `${r.commits}${r.full ? '+' : ''}`
    const rel = r.release ? ` · yeni sürüm ${r.release.tag}` : ''
    log(`   ${r.commits >= MIN_COMMITS || r.release ? '●' : '·'} ${r.repo.padEnd(24)} ${n} commit${rel}  · ${r.project}`)

    if (r.commits >= MIN_COMMITS) {
      activeProjects.add(r.postId)
      out.suggestions.push({
        agent: 'demo',
        kind: 'project-activity',
        title: `${r.project}: bu hafta ${n} commit`,
        body: [
          ...r.lines.slice(0, 8).map((l) => `• ${l}`),
          '',
          'Proje sayfasını güncellemek ya da geliştirme sürecini anlatan bir gönderi için iyi bir an.',
        ].join('\n'),
        data: { link: `/admin/posts/${r.postId}`, repo: r.repo, commits: r.commits },
        dedupeKey: `project-activity:${r.repo.toLowerCase()}:${week}`,
      })
    }
    if (r.release) {
      activeProjects.add(r.postId)
      const name = r.release.name && r.release.name !== r.release.tag ? `${r.release.name}\n` : ''
      out.suggestions.push({
        agent: 'demo',
        kind: 'project-release',
        title: `${r.project}: ${r.release.tag} yayınlandı`,
        body: `${name}Sürüm notu: ${r.release.url}\nProje sayfasına yeni sürümü ve öne çıkan değişikliği eklemek için iyi bir an.`,
        data: { link: `/admin/posts/${r.postId}`, repo: r.repo, tag: r.release.tag, url: r.release.url },
        dedupeKey: `project-release:${r.repo.toLowerCase()}:${r.release.tag}`,
      })
    }
  }
  const up = demoResults.filter((d) => d.ok).length
  out.runs.push({
    agent: 'demo',
    summary: `${up}/${demoResults.length} demo açık · ${activeProjects.size} projede hareket`,
    details: {
      demos: demoResults.map((d) => ({ url: d.url, ok: d.ok, status: d.status, error: d.error || undefined, ms: d.ms, project: d.title })),
      repos: repoResults.map((r) => ({
        repo: r.repo,
        project: r.project,
        commits: r.commits,
        release: r.release?.tag || null,
        skipped: r.skipped || undefined,
      })),
    },
  })
}

/* ---------------------------------------------------------------
 * 3) Bütçe
 * ------------------------------------------------------------- */
async function watchBudget(out, ready) {
  log('\n3/3 Bütçe')
  const bal = await openRouterBalance()
  if (!bal) {
    log('   ✗ OpenRouter bakiyesi okunamadı (anahtar yok ya da istek başarısız)')
    out.runs.push({ agent: 'butce', ok: false, summary: 'OpenRouter bakiyesi okunamadı', details: {} })
    return
  }

  const remainingText = bal.remaining == null ? 'bilinmiyor (anahtarda harcama limiti yok)' : usd(bal.remaining)
  log(`   OpenRouter: kalan ${remainingText} · bu ay ${usd(bal.usageMonthly)} · bugün ${usd(bal.usageDaily)}`)

  if (bal.remaining != null && bal.remaining < BALANCE_WARN_USD) {
    const critical = bal.remaining < BALANCE_CRITICAL_USD
    out.suggestions.push({
      agent: 'butce',
      kind: 'budget-low',
      title: 'OpenRouter bakiyesi azaldı',
      body: [
        `OpenRouter bakiyesinde ${usd(bal.remaining)} kaldı.`,
        `Bakiye ${usd(AI_RESERVE_USD)} altına inince günlük haber botu dışındaki yapay zekalı ajanlar (çeviri, haftalık analiz, kalite) duraklar; kalan bakiye haber botuna ayrılır.`,
        `Bakiye yüklemek için: ${CREDITS_URL}`,
      ].join('\n'),
      data: { link: CREDITS_URL, remaining: bal.remaining, usageMonthly: bal.usageMonthly },
      dedupeKey: `budget-low:${month}:${critical ? 'kritik' : 'dusuk'}`,
    })
  }

  // Ajan bütçeleri yalnızca agents.sql kuruluysa anlamlı
  let agents
  if (ready) {
    agents = []
    const rows = await rest('agent_settings?select=agent,enabled,monthly_budget_usd&order=agent')
    for (const row of rows) {
      const budget = Number(row.monthly_budget_usd) || 0
      if (budget <= 0) continue
      const spent = await monthSpend(row.agent)
      const pct = Math.round((spent / budget) * 100)
      agents.push({ agent: row.agent, spent: Math.round(spent * 1e5) / 1e5, budget, pct })
      const label = AGENT_LABEL[row.agent] || row.agent
      log(`   ${label.padEnd(16)} ${usd(spent)} / ${usd(budget)} (%${pct})${row.enabled ? '' : ' · kapalı'}`)
      if (spent >= budget * AGENT_BUDGET_WARN) {
        const full = spent >= budget
        out.suggestions.push({
          agent: 'butce',
          kind: 'budget-agent',
          title: full ? `${label} ajanının aylık bütçesi doldu` : `${label} ajanı aylık bütçesine yaklaştı`,
          body: [
            `Bu ay ${usd(spent)} harcadı; aylık bütçesi ${usd(budget)} (%${pct}).`,
            'Bütçe dolunca ajan ay sonuna kadar yapay zeka kullanmaz. Gerekirse bütçeyi artırabilir ya da ajanı kapatabilirsin.',
          ].join('\n'),
          data: { agent: row.agent, spent, budget },
          dedupeKey: `budget-agent:${row.agent}:${month}`,
        })
      }
    }
  } else {
    log('   Ajan bütçeleri: agents.sql kurulmadığı için atlandı')
  }

  out.runs.push({
    agent: 'butce',
    summary: `Kalan ${bal.remaining == null ? 'bilinmiyor' : usd(bal.remaining)} · bu ay ${usd(bal.usageMonthly)}`,
    details: { ...bal, ...(agents ? { agents } : {}) },
  })
}

/* ---------------------------------------------------------------
 * Sonuçları yaz ya da (deneme modunda) ekrana bas
 * ------------------------------------------------------------- */
async function flush(out, write) {
  log(`\n${write ? 'Öneri kutusu' : 'Önerilecekler'} (${out.suggestions.length})`)
  if (!out.suggestions.length) log('   Öneri yok.')

  let failed = 0
  for (const s of out.suggestions) {
    if (!write) {
      log(`   • [${s.kind}] ${s.title}`)
      for (const line of s.body.split('\n')) log(`       ${line}`)
      log(`       anahtar: ${s.dedupeKey}`)
      continue
    }
    try {
      const row = await suggest(s)
      log(`   ${row ? '+ yeni' : '= zaten var'}  ${s.title}`)
    } catch (e) {
      failed++
      log(`   ✗ yazılamadı: ${s.title} (${e.message})`)
    }
  }

  log(`\n${write ? 'Çalışma kayıtları' : 'Yazılacak çalışma kayıtları'}`)
  for (const r of out.runs) {
    log(`   • ${r.agent}: ${r.summary}`)
    if (write) await recordRun(r.agent, r)
  }
  if (failed) process.exitCode = 1
}

async function main() {
  log(`🛡️  Site bekçisi · ${todayLabel}${DRY ? ' · deneme modu (hiçbir şey yazılmaz)' : ''}`)

  // Kurulum tamamlanmadan zamanlanmış çalışma her sabah hata e-postası atmasın
  if (!hasDb()) {
    log('⚠️  SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY tanımlı değil; bekçi atlanıyor.')
    return
  }

  const ready = await agentsReady()
  const write = !DRY && ready
  const out = { suggestions: [], runs: [] }

  if ((await settingsFor('demo')).enabled) await watchProjects(out)
  else log('\n⏸️  Bekçi (demo) panelden kapatılmış; demo ve GitHub kontrolü atlandı.')

  if ((await settingsFor('butce')).enabled) await watchBudget(out, ready)
  else log('\n⏸️  Bütçe ajanı panelden kapatılmış; bütçe kontrolü atlandı.')

  await flush(out, write)

  if (!ready) {
    log(
      DRY
        ? '\n⚠️  Not: supabase/agents.sql henüz çalıştırılmamış; gerçek çalışmada da sonuçlar kaydedilmez.'
        : '\n⚠️  supabase/agents.sql henüz çalıştırılmamış; sonuçlar kaydedilmedi.'
    )
  } else if (DRY) {
    log(`\n💾 Deneme modu: Supabase'e hiçbir şey yazılmadı.`)
  }
}

main().catch((e) => {
  console.error('\n❌ Bekçi hata verdi:', e.message)
  process.exit(1)
})
