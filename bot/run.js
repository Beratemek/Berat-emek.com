// Haber botu — her sabah GitHub Actions tarafından çalıştırılır.
//
//   node run.js                → tam çalışma, sonucu Supabase'e yazar
//   node run.js --dry          → tam çalışma, Supabase'e yazmaz; sonucu out/ klasörüne kaydeder
//   node run.js --collect-only → sadece haberleri toplar (model çağrısı yok, ücretsiz)
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { HOURS, MODEL, WRITER_MODEL, TOP_CANDIDATES } from './config.js'
import { collectAll } from './collect.js'
import { clusterNews, scoreClusters, verifyCandidate, writeDraft, checkDraft, decide, suggestIdeas } from './agents.js'
import { getUsage } from './llm.js'
import { blocksToDoc, slugify } from './tiptap.js'
import { hasDb, recentBriefs, insertDraftPost, upsertBrief } from './db.js'

const envFile = fileURLToPath(new URL('./.env', import.meta.url))
if (existsSync(envFile)) process.loadEnvFile(envFile)

const args = new Set(process.argv.slice(2))
const DRY = args.has('--dry')
const COLLECT_ONLY = args.has('--collect-only')

const TZ = 'Europe/Istanbul'
const briefDate = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
const todayLabel = new Intl.DateTimeFormat('tr-TR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())

const log = (...a) => console.log(...a)

function topicSummary(c) {
  return {
    topic: c.topic,
    category: c.category,
    relevance: c.relevance,
    score: c.score,
    share: c.share,
    trust: c.trust,
    verified: c.verification ? c.verification.verified : null,
    sources: c.items.slice(0, 6).map((i) => ({ name: i.source, type: i.type, title: i.title, url: i.url })),
  }
}

function sourceList(cluster) {
  const order = { primary: 0, media: 1, community: 2 }
  return [...cluster.items]
    .sort((a, b) => order[a.type] - order[b.type])
    .filter((i) => i.type !== 'community')
    .slice(0, 4)
}

async function save(brief, draftPost) {
  if (DRY || !hasDb()) {
    const dir = fileURLToPath(new URL('./out/', import.meta.url))
    mkdirSync(dir, { recursive: true })
    const file = `${dir}${briefDate}.json`
    writeFileSync(file, JSON.stringify({ brief, draftPost }, null, 2))
    log(`\n💾 Supabase'e yazılmadı (${DRY ? '--dry' : 'anahtar yok'}). Sonuç: ${file}`)
    if (brief.linkedin_text) log(`\n--- LinkedIn taslağı ---\n${brief.linkedin_text}\n\n${brief.linkedin_comment}`)
    return
  }
  if (draftPost) {
    const row = await insertDraftPost(draftPost)
    brief.post_id = row.id
    log(`📝 Blog taslağı eklendi: ${row.title} (/admin/posts/${row.id})`)
  }
  await upsertBrief(brief)
  log(`💾 Günlük özet kaydedildi: ${briefDate}`)
}

async function main() {
  const started = Date.now()
  log(`🗞️  Haber botu · ${todayLabel} · model: ${MODEL}${WRITER_MODEL !== MODEL ? ` / yazar: ${WRITER_MODEL}` : ''}`)

  // Kurulum tamamlanmadan zamanlanmış çalışma her sabah hata e-postası atmasın
  if (!COLLECT_ONLY && !process.env.OPENROUTER_API_KEY) {
    log('⚠️  OPENROUTER_API_KEY tanımlı değil; kurulum tamamlanana kadar bot atlanıyor (bkz. bot/README.md).')
    return
  }

  // 1) Topla
  log(`\n1/6 Haberler toplanıyor (son ${HOURS} saat)…`)
  const { items, report } = await collectAll({ hours: HOURS })
  for (const r of report) log(`   ${r.ok ? '✓' : '✗'} ${r.source.padEnd(22)} ${r.ok ? r.count : r.error}`)
  log(`   Toplam ${items.length} haber`)

  const stats = {
    items: items.length,
    sources_ok: report.filter((r) => r.ok).length,
    sources_failed: report.filter((r) => !r.ok).map((r) => r.source),
    model: MODEL,
  }

  if (COLLECT_ONLY) {
    for (const it of items) log(`   ${it.id.padEnd(5)} [${it.source}] ${it.title}`)
    return
  }

  const baseBrief = { brief_date: briefDate, stats }

  if (!items.length) {
    await save({ ...baseBrief, decision: 'paylasma', score: 1, reason: 'Bugün kaynaklardan haber çekilemedi. Botun çalışma kaydına bak.', topics: [] })
    return
  }

  // 2) Kümele + puanla
  log('\n2/6 Aynı olayı anlatan haberler gruplanıyor, odağa uygunluk puanlanıyor…')
  const clusters = await clusterNews(items)
  const ranked = scoreClusters(clusters).filter((c) => c.newsworthy)
  stats.off_focus = clusters.length - ranked.length
  stats.ai_items = ranked.reduce((n, c) => n + c.items.length, 0)
  stats.clusters = ranked.length
  for (const c of ranked.slice(0, 8)) {
    log(`   ${String(c.score).padStart(4)} · odak ${c.relevance}/3 · ${c.trust.padEnd(11)} · ${c.topic}`)
  }

  // 3) Doğrula — tek kaynaklı haberler aday bile olamaz
  const candidates = ranked.filter((c) => c.trust !== 'tek-kaynak').slice(0, TOP_CANDIDATES)
  log(`\n3/6 ${candidates.length} aday kaynak metinlerden doğrulanıyor…`)
  await Promise.all(
    candidates.map(async (c) => {
      try {
        c.verification = await verifyCandidate(c)
      } catch (e) {
        c.verification = { verified: false, facts: [], unverified: [], error: e.message }
      }
      log(`   ${c.verification.verified ? '✓ doğrulandı ' : '✗ doğrulanamadı'} · ${c.topic}`)
    })
  )

  stats.candidates = candidates.length
  stats.verified = candidates.filter((c) => c.verification?.verified).length

  const topics = ranked.slice(0, 8).map(topicSummary)
  const chosen = candidates.find((c) => c.verification?.verified)

  const recent = !DRY && hasDb() ? await recentBriefs(7).catch(() => []) : []

  if (!chosen) {
    log('\n💡 Paylaşılacak güçlü haber yok; bilgilendirici yazı fikirleri hazırlanıyor…')
    const ideas = await suggestIdeas({ topics, recent })
    for (const i of ideas) log(`   • ${i.title} — ${i.angle}`)
    await save({
      ...baseBrief,
      decision: 'paylasma',
      score: 2,
      reason: 'Bugün odağına uyan, doğrulanabilen güçlü bir haber yok. Haber yerine aşağıdaki bilgilendirici yazılardan birini paylaşabilirsin.',
      topics,
      ideas,
      stats: { ...stats, usage: getUsage() },
    })
    return
  }

  const v = chosen.verification

  // 4) Yaz
  log(`\n4/6 Taslak yazılıyor: ${chosen.topic}`)
  const draft = await writeDraft(chosen, v)

  // 5) Kontrol et
  log('5/6 Taslak doğrulanmış bilgilere karşı kontrol ediliyor…')
  const checked = await checkDraft(chosen, v, draft)
  for (const i of checked.issues) log(`   [${i.severity}]${i.fixed ? ' ✓ düzeltildi' : ''} ${i.text}`)
  // Kontrolcünün düzelttiği sorunlar kararı etkilemez; editör yalnızca çözülemeyenlere bakar
  const openIssues = checked.issues.filter((i) => i.fixed !== true)

  // 6) Karar
  log('6/6 Editör kararını veriyor…')
  // Haftalık plan: son 7 günde kaç paylaşım yapıldı, son paylaşımdan bu yana kaç gün geçti
  const sharedDays = recent.filter((r) => r.status === 'paylasildi').map((r) => r.brief_date).sort()
  const lastShared = sharedDays[sharedDays.length - 1]
  const cadence = {
    sharedThisWeek: sharedDays.length,
    target: 4,
    daysSinceLast: lastShared ? Math.round((new Date(`${briefDate}T12:00:00Z`) - new Date(`${lastShared}T12:00:00Z`)) / 864e5) : null,
  }
  const verdict = await decide({ cluster: chosen, v, linkedin: checked.linkedin, issues: openIssues, recent, today: todayLabel, cadence })

  const sources = sourceList(chosen)
  const ideas = verdict.decision === 'paylasma' ? await suggestIdeas({ topics, recent }) : []
  const brief = {
    ...baseBrief,
    decision: verdict.decision,
    score: verdict.score,
    reason: verdict.reason,
    best_time: verdict.bestTime,
    headline: chosen.topic,
    linkedin_text: checked.linkedin,
    linkedin_comment: `Kaynaklar:\n${sources.map((s) => `• ${s.source}: ${s.url}`).join('\n')}`,
    check_notes: checked.issues,
    facts: v.facts,
    ideas,
    topics,
    stats: { ...stats, usage: getUsage(), editor: { urgency: verdict.urgency, why: verdict.why, tip: verdict.tip, week: cadence } },
  }

  const draftPost =
    verdict.decision === 'paylas'
      ? {
          title: draft.blog.title,
          slug: slugify(draft.blog.title),
          excerpt: draft.blog.excerpt || '',
          tags: (draft.blog.tags || []).slice(0, 4),
          content: blocksToDoc(
            checked.blocks,
            sources,
            'Not: Bu yazının ilk taslağı, kaynakları tarayan yapay zeka destekli haber sistemim tarafından hazırlandı; yayınlamadan önce tarafımdan kontrol edildi.'
          ),
        }
      : null

  await save(brief, draftPost)

  const u = getUsage()
  const LABEL = { kesin: '🔥 BUGÜN KESİN PAYLAŞ', onerilir: '✅ BUGÜN PAYLAŞ', 'istege-bagli': '🟡 İSTERSEN PAYLAŞ', 'gerek-yok': '⏸️  BUGÜN PAYLAŞMA' }
  log(`\n${LABEL[verdict.urgency]} (${verdict.score}/10) — ${verdict.reason}`)
  for (const w of verdict.why) log(`   · ${w}`)
  if (verdict.tip) log(`   💡 ${verdict.tip}`)
  log(`   Bu hafta: ${cadence.sharedThisWeek}/${cadence.target} paylaşım`)
  log(`   ${u.calls} model çağrısı · ${u.promptTokens + u.completionTokens} token · $${u.costUsd} · ${((Date.now() - started) / 1000).toFixed(0)} sn`)
}

main().catch((e) => {
  console.error('\n❌ Bot hata verdi:', e.message)
  process.exit(1)
})
