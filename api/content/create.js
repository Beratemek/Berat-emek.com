// POST /api/content/create — panelden "İçerik oluştur": seçilen gündem konusu için
// doğrula (ucuz model) → yaz (kaliteli model) → kontrol et (ucuz model) → blog taslağı + LinkedIn metni.
// Her adım ayrı bir istek; ara sonuçlar günlük özetteki konunun yanında saklanır.
// step: 'verify' | 'write' | 'check' | 'activate' (hazır içeriği günün seçili içeriği yapar)
import { json, requireAdmin } from '../_linkedin.js'
import { loadBrief, saveBrief, toCluster, activePatch } from '../_content.js'
import { verifyCandidate, writeDraft, checkDraft, sourceList } from '../../bot/agents.js'
import { blocksToDoc, slugify } from '../../bot/tiptap.js'
import { insertDraftPost } from '../../bot/db.js'
import { getUsage } from '../../bot/llm.js'
import { canUseAI, recordRun } from '../../bot/agentkit.js'
import { BLOG_NOTE } from '../../bot/config.js'

const STEP_LABEL = { verify: 'doğrulama', write: 'yazım', check: 'kontrol' }

export async function POST(request) {
  if (!(await requireAdmin(request))) return json({ error: 'Yetkisiz' }, 401)
  let input
  try {
    input = await request.json()
  } catch {
    return json({ error: 'Geçersiz istek' }, 400)
  }
  const step = input?.step
  const brief = await loadBrief(input?.briefId)
  if (!brief) return json({ error: 'Günlük özet bulunamadı' }, 404)
  const topics = Array.isArray(brief.topics) ? brief.topics : []
  const topic = topics[Number(input?.index)]
  if (!topic) return json({ error: 'Konu bulunamadı' }, 404)

  if (step === 'activate') {
    if (!topic.content?.post_id) return json({ error: 'Bu konunun hazır bir içeriği yok' }, 400)
    await saveBrief(brief.id, activePatch(topic))
    return json({ ok: true })
  }
  if (!STEP_LABEL[step]) return json({ error: 'Bilinmeyen adım' }, 400)
  if (!topic.items?.length) {
    return json({ error: 'Bu konu eski biçimde kaydedilmiş; yarın sabahki listeden itibaren içerik oluşturulabilir.' }, 400)
  }

  const budget = await canUseAI('gundem', { reserve: 0.2 })
  if (!budget.ok) return json({ error: `İçerik oluşturulamadı: ${budget.reason}` }, 402)

  const cluster = toCluster(topic)
  const before = getUsage().costUsd
  try {
    if (step === 'verify') {
      if (!topic.verification?.verified) {
        topic.verification = await verifyCandidate(cluster)
        topic.verified = topic.verification.verified
        await saveBrief(brief.id, { topics })
      }
      if (!topic.verification.verified) {
        return json({ ok: false, error: 'Bu konu kaynak metinlerde doğrulanamadı; üzerine güvenilir bir yazı çıkmaz.' })
      }
      return json({ ok: true })
    }

    if (step === 'write') {
      if (!topic.verification?.verified) return json({ error: 'Önce doğrulama adımı tamamlanmalı' }, 400)
      topic.work = { draft: await writeDraft(cluster, topic.verification) }
      await saveBrief(brief.id, { topics })
      return json({ ok: true })
    }

    // check
    const draft = topic.work?.draft
    if (!draft) return json({ error: 'Önce yazım adımı tamamlanmalı' }, 400)
    const checked = await checkDraft(cluster, topic.verification, draft)
    const sources = sourceList(cluster)
    const row = await insertDraftPost({
      title: draft.blog.title,
      slug: slugify(draft.blog.title),
      excerpt: draft.blog.excerpt || '',
      tags: (draft.blog.tags || []).slice(0, 4),
      content: blocksToDoc(checked.blocks, sources, BLOG_NOTE),
    })
    topic.content = {
      post_id: row.id,
      title: draft.blog.title,
      excerpt: draft.blog.excerpt || '',
      linkedin: checked.linkedin,
      blocks: checked.blocks,
      issues: checked.issues,
      image_prompt: draft.image_prompt || '',
      created_at: new Date().toISOString(),
    }
    delete topic.work
    await saveBrief(brief.id, { topics, ...activePatch(topic) })
    return json({ ok: true, postId: row.id })
  } catch (e) {
    return json({ error: `${STEP_LABEL[step]} adımı başarısız: ${e.message}` }, 500)
  } finally {
    const cost = getUsage().costUsd - before
    if (cost > 0) {
      await recordRun('gundem', { summary: `İçerik oluştur · ${STEP_LABEL[step]}: ${topic.topic}`, cost, details: { kind: 'create', step } }).catch(() => {})
    }
  }
}
