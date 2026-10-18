// POST /api/agents/quality — kalite kapısının yapay zekalı incelemesi (ucuz model, yazı başı ~0,001 $).
// Kural tabanlı kontrol tarayıcıda zaten çalışır; bu, dil, abartı, uydurma deneyim ve içerik sınırlarını okur.
import { json, requireAdmin } from '../_linkedin.js'
import { askJSON, getUsage } from '../../bot/llm.js'
import { canUseAI, recordRun } from '../../bot/agentkit.js'
import { CONTENT_RULES, PERSONA } from '../../bot/config.js'

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
  const text = String(input?.text || '').slice(0, 24000)
  const kind = input?.kind === 'project' ? 'proje sayfası' : 'blog yazısı'
  if (text.trim().length < 40) return json({ error: 'İncelenecek metin çok kısa' }, 400)

  const budget = await canUseAI('kalite', { reserve: 0.2 })
  if (!budget.ok) return json({ error: `İnceleme yapılamadı: ${budget.reason}` }, 402)

  const before = getUsage().costUsd
  try {
    const out = await askJSON({
      label: 'kalite kapısı',
      maxTokens: 3000,
      system: `Sen Berat Emek'in yayın öncesi kalite editörüsün. Metin Berat'ın kişisel sitesinde yayınlanacak.
${PERSONA}

${CONTENT_RULES}

Kontrol et:
1. İçerik sınırları ihlali (yukarıdaki kesin kurallar).
2. Uydurma kişisel deneyim ("denedim", "kullandım" — metin bunu desteklemiyorsa).
3. Abartı, klişe, hype ("devrim", "çığır açan", "inanılmaz", "oyunun kuralları"…).
4. Kaynağı belirtilmeden verilen kesin sayı ya da iddia.
5. Türkçe dil, yazım ve anlatım hataları; anlaşılmayan cümleler.
6. Başlığın içerikle uyumu, girişin ilk iki cümlede konuyu söyleyip söylemediği.
Sorun yoksa uydurma; az ve gerçek sorun bul. Her sorun: level ("kritik" yayın öncesi mutlaka düzeltilmeli · "uyari" · "oneri"),
text (Türkçe, kısa, ne yapılmalı), quote (metinden ilgili parça, en fazla 120 karakter).
verdict: "yayinlanabilir" ya da "duzeltilmeli". summary: tek cümle genel değerlendirme.
Çıktı: {"verdict":"yayinlanabilir","summary":"...","issues":[{"level":"uyari","text":"...","quote":"..."}]}
Yalnızca geçerli JSON döndür.`,
      user: `Tür: ${kind}\nBaşlık: ${title}\nÖzet: ${excerpt}\n\nMetin:\n${text}`,
    })
    const issues = (Array.isArray(out.issues) ? out.issues : [])
      .filter((i) => i?.text)
      .map((i) => ({ level: ['kritik', 'uyari', 'oneri'].includes(i.level) ? i.level : 'uyari', text: i.text, quote: i.quote || '' }))
      .slice(0, 12)
    const verdict = out.verdict === 'yayinlanabilir' && !issues.some((i) => i.level === 'kritik') ? 'yayinlanabilir' : 'duzeltilmeli'
    return json({ ok: true, verdict, summary: out.summary || '', issues })
  } catch (e) {
    return json({ error: `İnceleme başarısız: ${e.message}` }, 500)
  } finally {
    const cost = getUsage().costUsd - before
    if (cost > 0) await recordRun('kalite', { summary: `Yapay zeka incelemesi: "${title.slice(0, 60)}"`, cost }).catch(() => {})
  }
}
