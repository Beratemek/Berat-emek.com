// Haber botu — her sabah GitHub Actions tarafından çalıştırılır.
//
//   node run.js                → tam çalışma, sonucu Supabase'e yazar
//   node run.js --dry          → tam çalışma, Supabase'e yazmaz; sonucu out/ klasörüne kaydeder
//   node run.js --no-image     → kapak görseli üretmez (deneme çalışmalarında para harcamamak için)
//   node run.js --collect-only → sadece haberleri toplar (model çağrısı yok, ücretsiz)
//
// Akış: topla → kümele → doğrula → gündem editörü sıralar.
//   "Kesin paylaş" günü: en iyi konu için yazı + LinkedIn metni + kapak hazırlanır (yazar: kaliteli model).
//   Diğer günler: yalnızca sıralı konu listesi; içerik panelden "İçerik oluştur" denince üretilir.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { HOURS, MODEL, WRITER_MODEL, TOP_CANDIDATES, BLOG_NOTE } from './config.js'
import { collectAll } from './collect.js'
import {
  clusterNews, scoreClusters, verifyCandidate, writeDraft, checkDraft, decide, suggestIdeas, triage, sourceList,
} from './agents.js'
import { getUsage } from './llm.js'
import { blocksToDoc, slugify } from './tiptap.js'
import { hasDb, recentBriefs, recentPostTitles, insertDraftPost, upsertBrief, uploadCover } from './db.js'
import { renderCover, compressImage } from './cover.js'
import { generateIllustration, imageCost } from './image.js'
import { recordRun } from './agentkit.js'

const envFile = fileURLToPath(new URL('./.env', import.meta.url))
if (existsSync(envFile)) process.loadEnvFile(envFile)

const args = new Set(process.argv.slice(2))
const DRY = args.has('--dry')
const NO_IMAGE = args.has('--no-image')
const COLLECT_ONLY = args.has('--collect-only')

const TZ = 'Europe/Istanbul'
const briefDate = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
const todayLabel = new Intl.DateTimeFormat('tr-TR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())
const dateShort = new Intl.DateTimeFormat('tr-TR', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())

const log = (...a) => console.log(...a)
const LABEL = { kesin: '🔥 BUGÜN KESİN PAYLAŞ', onerilir: '✅ BUGÜN PAYLAŞ', 'istege-bagli': '🟡 İSTERSEN PAYLAŞ', 'gerek-yok': '⏸️  BUGÜN PAYLAŞMA' }
const URGENCY_TEXT = { kesin: 'Kesin paylaş', onerilir: 'Paylaşılabilir', 'istege-bagli': 'İsteğe bağlı', 'gerek-yok': 'Gerek yok' }

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
    // Panelden "İçerik oluştur" denince konuyu yeniden kurabilmek için ham bilgiler
    sourceCount: c.sourceCount,
    signals: c.signals,
    items: c.items.slice(0, 8).map((i) => ({
      id: i.id,
      source: i.source,
      type: i.type,
      title: i.title,
      url: i.url,
      summary: (i.summary || '').slice(0, 280),
      engagement: i.engagement || 0,
    })),
    verification: c.verification || null,
  }
}

/** Ajan paneline çalışma kaydı (deneme modunda ve anahtar yoksa yazılmaz) */
async function logRun(ok, summary, details = {}) {
  if (DRY || !hasDb()) return
  await recordRun('gundem', { ok, summary, cost: getUsage().costUsd + imageCost(), details: { kind: 'daily', ...details } })
}

async function save(brief, draftPost, imagePrompt) {
  // Kapak görseli: önce konuya özel renkli illüstrasyon; olmazsa markalı kahverengi kapak.
  // Blog kapağı, bağlantı önizlemesi ve LinkedIn kart görseli olarak kullanılır.
  let cover = null // { buf, type, ext }
  if (draftPost && imagePrompt && !NO_IMAGE) {
    try {
      const png = await generateIllustration(imagePrompt)
      const webp = compressImage(png)
      cover = webp ? { buf: webp, type: 'image/webp', ext: 'webp' } : { buf: png, type: 'image/png', ext: 'png' }
      log(`🎨 Konuya özel görsel üretildi (${Math.round(cover.buf.length / 1024)} KB, ${imageCost()})`)
    } catch (e) {
      log(`   ! Görsel üretilemedi, markalı kapağa geçiliyor: ${e.message}`)
    }
  }
  if (draftPost && !cover) {
    const png = renderCover({ title: draftPost.title, kicker: 'Yapay zeka gündemi', date: dateShort })
    if (png) cover = { buf: png, type: 'image/png', ext: 'png' }
    log(png ? '🖼️  Markalı kapak üretildi' : '🖼️  Kapak üretilemedi (Chrome bulunamadı); kapaksız devam ediliyor')
  }
  if (DRY || !hasDb()) {
    const dir = fileURLToPath(new URL('./out/', import.meta.url))
    mkdirSync(dir, { recursive: true })
    const file = `${dir}${briefDate}.json`
    writeFileSync(file, JSON.stringify({ brief, draftPost }, null, 2))
    if (cover) writeFileSync(`${dir}${briefDate}.${cover.ext}`, cover.buf)
    log(`\n💾 Supabase'e yazılmadı (${DRY ? '--dry' : 'anahtar yok'}). Sonuç: ${file}`)
    if (brief.linkedin_text) log(`\n--- LinkedIn taslağı ---\n${brief.linkedin_text}\n\n${brief.linkedin_comment}`)
    return
  }
  if (draftPost) {
    if (cover) {
      try {
        draftPost.cover = await uploadCover(`bot/${briefDate}-${draftPost.slug}.${cover.ext}`, cover.buf, cover.type)
        draftPost.cover_position = '50% 50%'
      } catch (e) {
        log(`   ! ${e.message}`)
      }
    }
    const row = await insertDraftPost(draftPost)
    brief.post_id = row.id
    // Panelde konunun yanında "hazır içerik" olarak görünsün
    const owner = brief.topics?.find((t) => t.content && !t.content.post_id)
    if (owner) owner.content.post_id = row.id
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
  log(`\n1/5 Haberler toplanıyor (son ${HOURS} saat)…`)
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
    await logRun(false, 'Kaynaklardan haber çekilemedi')
    return
  }

  // 2) Kümele + puanla
  log('\n2/5 Aynı olayı anlatan haberler gruplanıyor, odağa uygunluk puanlanıyor…')
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
  log(`\n3/5 ${candidates.length} aday kaynak metinlerden doğrulanıyor…`)
  await Promise.all(candidates.map(verifySafe))
  stats.candidates = candidates.length
  stats.verified = candidates.filter((c) => c.verification?.verified).length

  const recent = !DRY && hasDb() ? await recentBriefs(7).catch(() => []) : []
  const published = hasDb() ? await recentPostTitles(14).catch(() => []) : []
  // Haftalık plan: son 7 günde kaç paylaşım yapıldı, son paylaşımdan bu yana kaç gün geçti
  const sharedDays = recent.filter((r) => r.status === 'paylasildi').map((r) => r.brief_date).sort()
  const lastShared = sharedDays[sharedDays.length - 1]
  const cadence = {
    sharedThisWeek: sharedDays.length,
    target: 4,
    daysSinceLast: lastShared ? Math.round((new Date(`${briefDate}T12:00:00Z`) - new Date(`${lastShared}T12:00:00Z`)) / 864e5) : null,
  }

  // 4) Gündem editörü: konuları yazmadan önce tek çağrıda sırala (ucuz model)
  log('\n4/5 Gündem editörü konuları sıralıyor…')
  const pool = ranked.slice(0, 6)
  const topicsRaw = pool.map(topicSummary)
  let tri = null
  try {
    tri = await triage({ topics: topicsRaw, recent, today: todayLabel, cadence, published })
  } catch (e) {
    log(`   ! Gündem editörü çalışmadı, puan sırası kullanılıyor: ${e.message}`)
  }
  if (tri) topicsRaw.forEach((t, i) => Object.assign(t, tri.topics[i]))
  const order = topicsRaw
    .map((_, i) => i)
    .sort((a, b) => (topicsRaw[b].rating ?? 0) - (topicsRaw[a].rating ?? 0) || topicsRaw[b].score - topicsRaw[a].score)
  const topics = order.map((i) => topicsRaw[i])
  const clustersByTopic = order.map((i) => pool[i])
  for (const t of topics) log(`   ${String(t.rating ?? '-').padStart(2)}/10 · ${(URGENCY_TEXT[t.urgency] || '-').padEnd(14)} · ${t.topic}`)

  // Bomba haber mi? Değilse yalnızca sıralı liste bırakılır; içerik panelden istenince üretilir.
  const top = topics[0]
  let chosen = top?.urgency === 'kesin' ? clustersByTopic[0] : null
  if (chosen && !chosen.verification?.verified) {
    await verifySafe(chosen)
    top.verification = chosen.verification
    top.verified = chosen.verification.verified
    if (!chosen.verification.verified) {
      log('   ✗ "Kesin" konu kaynaklarda doğrulanamadı; bugün yalnızca konu listesi bırakılıyor.')
      top.urgency = 'istege-bagli'
      chosen = null
    }
  }

  if (!chosen) {
    const worthy = topics.some((t) => ['onerilir', 'istege-bagli'].includes(t.urgency))
    const ideas = worthy ? [] : await suggestIdeas({ topics, recent })
    for (const i of ideas) log(`   • ${i.title} — ${i.angle}`)
    await save({
      ...baseBrief,
      decision: top?.urgency === 'onerilir' ? 'paylas' : 'paylasma',
      score: top?.rating ?? 2,
      reason:
        tri?.reason ||
        (worthy
          ? 'Bugün bomba bir haber yok. Aşağıdaki konulardan istediğine "İçerik oluştur" diyebilirsin.'
          : 'Bugün odağına uyan güçlü bir haber yok. Haber yerine aşağıdaki bilgilendirici yazılardan birini paylaşabilirsin.'),
      best_time: tri?.bestTime || null,
      // headline, linkedin_text, post_id gönderilmez: gün içinde ikinci çalışma, o günün hazır içeriğini silmesin
      topics,
      ideas,
      stats: {
        ...stats,
        usage: getUsage(),
        editor: top ? { urgency: top.urgency, why: top.why || [], tip: tri?.tip || '', week: cadence } : undefined,
      },
    })
    const u = getUsage()
    log(`\n${LABEL[top?.urgency] || LABEL['gerek-yok']} — ${topics.length} konu listelendi; içerik panelden istenince üretilecek.`)
    log(`   ${u.calls} model çağrısı · $${u.costUsd} · ${((Date.now() - started) / 1000).toFixed(0)} sn`)
    await logRun(true, `${topics.length} konu sıralandı · en iyisi ${top?.rating ?? '-'}/10: ${top?.topic || '-'}`, { urgency: top?.urgency })
    return
  }

  const v = chosen.verification

  // 5) Kesin gün: yaz (kaliteli model) → kontrol et (ucuz model) → editör son kararı versin
  log(`\n5/5 Bomba haber: taslak yazılıyor → ${chosen.topic}`)
  const draft = await writeDraft(chosen, v)
  log('   Taslak doğrulanmış bilgilere karşı kontrol ediliyor…')
  const checked = await checkDraft(chosen, v, draft)
  for (const i of checked.issues) log(`   [${i.severity}]${i.fixed ? ' ✓ düzeltildi' : ''} ${i.text}`)
  // Kontrolcünün düzelttiği sorunlar kararı etkilemez; editör yalnızca çözülemeyenlere bakar
  const openIssues = checked.issues.filter((i) => i.fixed !== true)
  const verdict = await decide({ cluster: chosen, v, linkedin: checked.linkedin, issues: openIssues, recent, today: todayLabel, cadence })

  const sources = sourceList(chosen)
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
    ideas: [],
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
          content: blocksToDoc(checked.blocks, sources, BLOG_NOTE),
        }
      : null

  if (draftPost) {
    // Panelde revize edilebilsin diye içeriğin ham hâli konunun yanında durur
    topics[0].content = {
      post_id: null, // save() taslağı ekleyince doldurur
      title: draftPost.title,
      excerpt: draftPost.excerpt,
      linkedin: checked.linkedin,
      blocks: checked.blocks,
      issues: checked.issues,
      image_prompt: draft.image_prompt || '',
      created_at: new Date().toISOString(),
    }
  }

  // Görsel bütçesi: konuya özel AI kapak (~0,07 $) yalnızca "kesin paylaş" günlerinde
  await save(brief, draftPost, verdict.urgency === 'kesin' ? draft.image_prompt : null)

  const u = getUsage()
  log(`\n${LABEL[verdict.urgency]} (${verdict.score}/10) — ${verdict.reason}`)
  for (const w of verdict.why) log(`   · ${w}`)
  if (verdict.tip) log(`   💡 ${verdict.tip}`)
  log(`   Bu hafta: ${cadence.sharedThisWeek}/${cadence.target} paylaşım`)
  log(`   ${u.calls} model çağrısı · ${u.promptTokens + u.completionTokens} token · $${u.costUsd} · ${((Date.now() - started) / 1000).toFixed(0)} sn`)
  await logRun(true, `${LABEL[verdict.urgency].replace(/^\S+\s+/, '')} (${verdict.score}/10): ${chosen.topic}`, {
    urgency: verdict.urgency,
    items: items.length,
  })
}

async function verifySafe(c) {
  try {
    c.verification = await verifyCandidate(c)
  } catch (e) {
    c.verification = { verified: false, facts: [], howTo: [], unverified: [], error: e.message }
  }
  log(`   ${c.verification.verified ? '✓ doğrulandı ' : '✗ doğrulanamadı'} · ${c.topic}`)
}

main().catch(async (e) => {
  console.error('\n❌ Bot hata verdi:', e.message)
  await logRun(false, `Hata: ${e.message}`).catch(() => {})
  process.exit(1)
})
