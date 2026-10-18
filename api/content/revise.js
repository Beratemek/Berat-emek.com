// POST /api/content/revise — Berat'ın talimatıyla günün seçili içeriğini düzeltir (kaliteli model).
// target: 'linkedin' | 'blog' | 'both'. Bilgiler yalnızca doğrulanmış listeden kullanılır.
import { json, requireAdmin, db } from '../_linkedin.js'
import { loadBrief, saveBrief, toCluster, activeTopicIndex } from '../_content.js'
import { reviseDraft, sourceList } from '../../bot/agents.js'
import { blocksToDoc } from '../../bot/tiptap.js'
import { getUsage } from '../../bot/llm.js'
import { canUseAI, recordRun } from '../../bot/agentkit.js'
import { BLOG_NOTE } from '../../bot/config.js'

export async function POST(request) {
  if (!(await requireAdmin(request))) return json({ error: 'Yetkisiz' }, 401)
  let input
  try {
    input = await request.json()
  } catch {
    return json({ error: 'Geçersiz istek' }, 400)
  }
  const instruction = String(input?.instruction || '').trim().slice(0, 1500)
  const target = ['linkedin', 'blog', 'both'].includes(input?.target) ? input.target : 'both'
  if (!instruction) return json({ error: 'Ne değişsin? Talimat boş.' }, 400)

  const brief = await loadBrief(input?.briefId)
  if (!brief) return json({ error: 'Günlük özet bulunamadı' }, 404)
  const topics = Array.isArray(brief.topics) ? brief.topics : []
  const idx = activeTopicIndex(brief)
  const topic = idx >= 0 ? topics[idx] : null
  const content = topic?.content || null

  if (target !== 'linkedin' && !content?.blocks?.length) {
    return json({ error: 'Bu içeriğin blog hâli buradan revize edilemiyor; yazı editöründen düzenleyebilirsin.' }, 400)
  }

  const budget = await canUseAI('gundem', { reserve: 0.2 })
  if (!budget.ok) return json({ error: `Revize edilemedi: ${budget.reason}` }, 402)

  // Konu kaydı yoksa (eski özet) LinkedIn metni günün doğrulanmış bilgileriyle revize edilir
  const cluster = topic ? toCluster(topic) : { topic: brief.headline || '', items: [] }
  const v = topic?.verification || {
    whatHappened: brief.headline || '',
    whyItMatters: '',
    facts: brief.facts || [],
    howTo: [],
    unverified: [],
  }
  const linkedin = String(input?.text || '').trim() || content?.linkedin || brief.linkedin_text || ''

  const before = getUsage().costUsd
  try {
    const out = await reviseDraft({
      cluster,
      v,
      linkedin,
      blog: content ? { title: content.title, excerpt: content.excerpt, blocks: content.blocks } : null,
      instruction,
      target,
    })

    if (out.changedBlog && content?.post_id) {
      await db(`posts?id=eq.${content.post_id}`, {
        method: 'PATCH',
        body: {
          title: out.blog.title,
          excerpt: out.blog.excerpt || '',
          content: blocksToDoc(out.blog.blocks, sourceList(cluster), BLOG_NOTE),
        },
        prefer: 'return=minimal',
      })
      Object.assign(content, { title: out.blog.title, excerpt: out.blog.excerpt || '', blocks: out.blog.blocks })
    }
    if (content) content.linkedin = out.linkedin
    await saveBrief(brief.id, { linkedin_text: out.linkedin, ...(topic && { topics }) })
    return json({ ok: true, linkedin: out.linkedin, blogUpdated: Boolean(out.changedBlog) })
  } catch (e) {
    return json({ error: `Revizyon başarısız: ${e.message}` }, 500)
  } finally {
    const cost = getUsage().costUsd - before
    if (cost > 0) await recordRun('gundem', { summary: `Revize: ${instruction.slice(0, 80)}`, cost }).catch(() => {})
  }
}
