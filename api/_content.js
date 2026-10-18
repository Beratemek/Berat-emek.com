// Panelden içerik üretimi için ortak yardımcılar ("_" ile başladığı için kendisi bir adres değildir).
// Günlük özetteki (daily_briefs.topics) konu kayıtları üzerinde çalışır; bot ile aynı ajanları kullanır.
import { db } from './_linkedin.js'
import { sourceList } from '../bot/agents.js'

export async function loadBrief(id) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id || ''))) return null
  const rows = await db(`daily_briefs?id=eq.${id}&select=*`)
  return rows?.[0] || null
}

export async function saveBrief(id, patch) {
  await db(`daily_briefs?id=eq.${id}`, { method: 'PATCH', body: patch, prefer: 'return=minimal' })
}

/** Panelde kayıtlı konudan ajanların beklediği küme nesnesini kurar. */
export function toCluster(t) {
  return {
    topic: t.topic,
    category: t.category,
    relevance: t.relevance,
    trust: t.trust,
    score: t.score,
    sourceCount: t.sourceCount,
    signals: t.signals || {},
    items: t.items || [],
    verification: t.verification || null,
  }
}

/** Bu konunun içeriğini günün "seçili içeriği" yapar (LinkedIn kartı ve blog taslağı buna bağlanır). */
export function activePatch(topic) {
  const c = topic.content
  const sources = sourceList(toCluster(topic))
  return {
    decision: 'paylas',
    headline: topic.topic,
    linkedin_text: c.linkedin,
    linkedin_comment: sources.length ? `Kaynaklar:\n${sources.map((s) => `• ${s.source}: ${s.url}`).join('\n')}` : null,
    check_notes: c.issues || [],
    facts: topic.verification?.facts || [],
    post_id: c.post_id,
  }
}

/** Günün seçili içeriğinin konusu (bot ya da panel üretmiş olabilir). */
export function activeTopicIndex(brief) {
  const topics = Array.isArray(brief.topics) ? brief.topics : []
  return topics.findIndex((t) => t.content?.post_id && t.content.post_id === brief.post_id)
}

/** İstenen içerik (konu sırası) ya da günün seçili içeriği. { topics, index, topic } */
export function pickTopic(brief, index) {
  const topics = Array.isArray(brief.topics) ? brief.topics : []
  const n = Number(index)
  const i = Number.isInteger(n) && n >= 0 && topics[n] ? n : activeTopicIndex(brief)
  return { topics, index: i, topic: i >= 0 ? topics[i] : null }
}
