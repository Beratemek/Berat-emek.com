// OpenRouter üzerinden model çağrısı. Her çağrı JSON döndürür; token ve maliyet sayılır.
import { MODEL } from './config.js'

const usage = { calls: 0, promptTokens: 0, completionTokens: 0, costUsd: 0 }
export const getUsage = () => ({ ...usage, costUsd: Number(usage.costUsd.toFixed(5)) })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function parseJSON(text) {
  if (!text) throw new Error('Model boş yanıt döndü')
  const cleaned = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1))
    throw new Error('Model geçerli JSON döndürmedi')
  }
}

/**
 * Modele sistem + kullanıcı mesajı gönderir, JSON nesnesi döndürür.
 * Geçici hatalarda (429, 5xx, bozuk JSON) 3 kez dener.
 * Düşünme (reasoning) varsayılan olarak kapalı: açıkken model token hakkını düşünmeye harcayıp
 * boş cevap dönebiliyor ve maliyet katlanıyor. Gerçekten gereken çağrıda reasoning: true verilir.
 * Düşünmesi kapatılamayan modellerde (ör. Claude Sonnet 5.5) otomatik olarak en düşük seviyeye geçilir.
 */
export async function askJSON({ label, system, user, model = MODEL, temperature = 0.2, maxTokens = 4000, reasoning = false }) {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('OPENROUTER_API_KEY tanımlı değil')

  let lastErr
  let reasoningMode = reasoning ? { effort: 'medium' } : { enabled: false }
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://berat-emek.com',
          'X-Title': 'beratemek haber botu',
        },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxTokens,
          response_format: { type: 'json_object' },
          usage: { include: true },
          reasoning: reasoningMode,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
        signal: AbortSignal.timeout(180_000),
      })
      const body = await res.text()
      if (!res.ok) {
        // Düşünmesi zorunlu model: en ucuz seviyeyle hemen tekrar dene (deneme hakkından yemez)
        if (res.status === 400 && reasoningMode.enabled === false && /reasoning is mandatory|cannot be disabled/i.test(body)) {
          reasoningMode = { effort: 'low' }
          attempt--
          continue
        }
        const err = new Error(`OpenRouter HTTP ${res.status}: ${body.slice(0, 300)}`)
        // Anahtar/kredi/istek hatası tekrar denemekle düzelmez
        err.fatal = [400, 401, 402, 403, 404].includes(res.status)
        throw err
      }
      const data = JSON.parse(body)
      if (data.error) throw new Error(`OpenRouter: ${data.error.message || JSON.stringify(data.error)}`)

      usage.calls++
      usage.promptTokens += data.usage?.prompt_tokens || 0
      usage.completionTokens += data.usage?.completion_tokens || 0
      usage.costUsd += data.usage?.cost || 0

      const choice = data.choices?.[0]
      if (!choice?.message?.content && choice?.finish_reason === 'length') {
        throw new Error(`Cevap token sınırına takıldı (max_tokens=${maxTokens})`)
      }
      return parseJSON(choice?.message?.content)
    } catch (e) {
      lastErr = e
      if (e.fatal) break
      if (attempt < 3) await sleep(2000 * attempt)
    }
  }
  throw new Error(`[${label}] model çağrısı başarısız: ${lastErr?.message}`)
}
