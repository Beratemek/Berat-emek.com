// POST /api/agents/fix — yapay zeka kalite incelemesinin bulduğu sorunları yazının üzerinde düzeltir.
// Kaydetmez: düzeltilmiş başlık, özet ve içeriği editöre geri verir; Berat bakıp kaydeder ya da geri alır.
// Okurun göreceği metin olduğu için kaliteli yazar modeli kullanılır (yazı başı birkaç sent).
import { json, requireAdmin } from '../_linkedin.js'
import { askJSON, getUsage } from '../../bot/llm.js'
import { canUseAI, recordRun } from '../../bot/agentkit.js'
import { CONTENT_RULES, PERSONA, PLAIN_LANGUAGE, WRITER_MODEL } from '../../bot/config.js'
import { toMd, toDoc } from '../../src/lib/mdTiptap.js'

const LEVEL = { kritik: 'KRİTİK', uyari: 'Uyarı', oneri: 'Öneri' }
const count = (re, s) => (String(s).match(re) || []).length

export async function POST(request) {
  if (!(await requireAdmin(request))) return json({ error: 'Yetkisiz' }, 401)
  let input
  try {
    input = await request.json()
  } catch {
    return json({ error: 'Geçersiz istek' }, 400)
  }
  const title = String(input?.title || '').slice(0, 300)
  const excerpt = String(input?.excerpt || '').slice(0, 600)
  const kind = input?.kind === 'project' ? 'proje sayfası' : 'blog yazısı'
  const issues = (Array.isArray(input?.issues) ? input.issues : []).filter((i) => i?.text).slice(0, 12)
  if (!issues.length) return json({ error: 'Düzeltilecek bir not yok' }, 400)

  let md
  try {
    md = toMd(input?.doc)
  } catch (e) {
    return json({ error: `Bu yazı otomatik düzeltilemiyor (${e.message}); notları elle uygula.` }, 400)
  }
  if (md.trim().length < 40) return json({ error: 'Düzeltilecek metin çok kısa' }, 400)
  if (md.length > 30000) return json({ error: 'Yazı otomatik düzeltme için çok uzun' }, 400)

  const budget = await canUseAI('kalite', { reserve: 0.2 })
  if (!budget.ok) return json({ error: `Düzeltme yapılamadı: ${budget.reason}` }, 402)

  const before = getUsage().costUsd
  try {
    const out = await askJSON({
      label: 'kalite düzeltme',
      model: WRITER_MODEL,
      temperature: 0.4,
      maxTokens: 12000,
      system: `${PERSONA}

${CONTENT_RULES}

${PLAIN_LANGUAGE}

Sen Berat'ın editörüsün. Kalite incelemesi bu ${kind} için notlar çıkardı; Berat notları onayladı ve düzeltmeyi SENİN yapmanı istiyor.
Görevin: her notu metnin üzerinde uygulamak ve düzeltilmiş tam metni döndürmek.
Kurallar:
- Önce notları uygula. Metinde aynı türden başka sorun görürsen (dil ve yazım hatası, açıklanmamış teknik terim, çok uzun cümle,
  tekrar, abartı) onları da düzelt: amaç, düzeltilmiş metnin ikinci bir kontrolde yeni not almaması.
- Bunların dışında cümlelere dokunma; yapıyı, bölüm sırasını ve anlamı koru.
- Yeni bilgi, rakam, isim ya da kişisel deneyim ekleme. Bir not "kaynak belirt" diyorsa ve kaynak metinde yoksa iddiayı yumuşat ya da çıkar.
- Görsel satırları (![…](…)), kod blokları ve bağlantı adresleri aynen kalır.
- Metin aynı markdown biçiminde kalır: #/##/### başlık, - madde, 1. sıralı madde, > alıntı, **kalın**, *italik*, [metin](adres).
- Başlık ya da özetle ilgili not yoksa onları aynen döndür.
changes: yaptığın her düzeltme için tek kısa Türkçe cümle.
Çıktı: {"title":"...","excerpt":"...","markdown":"...","changes":["..."]}
Yalnızca geçerli JSON döndür.`,
      user: `Notlar:
${issues.map((i, k) => `${k + 1}. [${LEVEL[i.level] || 'Uyarı'}] ${i.text}${i.quote ? ` — ilgili yer: "${String(i.quote).slice(0, 160)}"` : ''}`).join('\n')}

Başlık: ${title}
Özet: ${excerpt}

Metin (markdown):
${md}`,
    })

    const fixed = typeof out.markdown === 'string' ? out.markdown : ''
    if (fixed.trim().length < md.trim().length * 0.5) return json({ error: 'Düzeltme eksik döndü; tekrar dene.' }, 502)
    const doc = toDoc(fixed)
    if (!doc.content.length) return json({ error: 'Düzeltme boş döndü; tekrar dene.' }, 502)

    const changes = (Array.isArray(out.changes) ? out.changes : []).map(String).filter(Boolean).slice(0, 15)
    // Görsel ve kod bloğu kaybolduysa uyar (model bunları korumalıydı)
    if (count(/!\[[^\]]*\]\(/g, fixed) < count(/!\[[^\]]*\]\(/g, md)) changes.push('Dikkat: düzeltilmiş metinde bir görsel eksik görünüyor; kaydetmeden önce kontrol et.')
    if (count(/^```/gm, fixed) < count(/^```/gm, md)) changes.push('Dikkat: bir kod bloğu eksik görünüyor; kaydetmeden önce kontrol et.')

    return json({
      ok: true,
      title: String(out.title || title).trim().slice(0, 300) || title,
      excerpt: typeof out.excerpt === 'string' ? out.excerpt.trim().slice(0, 600) : excerpt,
      doc,
      changes,
    })
  } catch (e) {
    return json({ error: `Düzeltme başarısız: ${e.message}` }, 500)
  } finally {
    const cost = getUsage().costUsd - before
    if (cost > 0) await recordRun('kalite', { summary: `Yapay zeka düzeltmesi: "${title.slice(0, 60)}"`, cost, details: { kind: 'fix' } }).catch(() => {})
  }
}
