import { useState } from 'react'
import { Sparkles, Loader2, Check, ShieldCheck, ShieldAlert, AlertTriangle, ArrowRightLeft, Circle } from 'lucide-react'
import { serverApi } from '../lib/serverApi.js'
import { autoCover, isNoCredit } from '../lib/covers.js'
import '../today-content.css'

const URGENCY = {
  kesin: { label: 'Kesin paylaş', cls: 'hot' },
  onerilir: { label: 'Paylaşılabilir', cls: 'good' },
  'istege-bagli': { label: 'İsteğe bağlı', cls: 'mid' },
  'gerek-yok': { label: 'Gerek yok', cls: 'low' },
}
const TRUST = {
  birincil: { label: 'Resmi kaynak', cls: 'ok' },
  'coklu-medya': { label: 'Çoklu medya', cls: 'mid' },
  topluluk: { label: 'Topluluk gündemi', cls: 'mid' },
  'tek-kaynak': { label: 'Tek kaynak', cls: 'low' },
}
const STEPS = [
  { key: 'verify', label: 'Kaynaklar okunuyor ve doğrulanıyor' },
  { key: 'write', label: 'Yazı ve LinkedIn metni yazılıyor' },
  { key: 'check', label: 'Doğrulanmış bilgilere karşı kontrol ediliyor' },
  { key: 'cover', label: 'Konuya özel kapak görseli hazırlanıyor' }, // tarayıcıda: renkli görsel, olmazsa markalı kapak
]

/** Günün gündemi: her konu için aciliyet, gerekçe ve tek tıkla içerik üretimi. */
export default function TopicBoard({ brief, onChanged, focus, onOpen }) {
  const [run, setRun] = useState(null) // { index, step }
  const [errors, setErrors] = useState({})
  const [notes, setNotes] = useState({}) // hata olmayan bilgi notları (ör. kapak markalı kapağa düştü)
  const topics = Array.isArray(brief.topics) ? brief.topics : []

  async function create(index) {
    setErrors((e) => ({ ...e, [index]: null }))
    setNotes((n) => ({ ...n, [index]: null }))
    try {
      let postId = null
      for (const s of STEPS.filter((x) => x.key !== 'cover')) {
        setRun({ index, step: s.key })
        const out = await serverApi('/api/content/create', { method: 'POST', body: { briefId: brief.id, index, step: s.key } })
        if (out.ok === false) throw new Error(out.error || 'Adım tamamlanamadı')
        if (out.postId) postId = out.postId
      }
      // Paylaşılacak içerik görselsiz kalmasın: renkli kapak dene, olmazsa ücretsiz markalı kapak
      if (postId) {
        setRun({ index, step: 'cover' })
        try {
          const c = await autoCover({ briefId: brief.id, index, postId })
          if (c.kind === 'brand') {
            setNotes((n) => ({
              ...n,
              [index]: isNoCredit(c.reason)
                ? 'Renkli görsel için OpenRouter bakiyesi yetmedi (en az 1 $ gerekiyor); ücretsiz markalı kapak eklendi.'
                : `Renkli görsel üretilemedi (${c.reason}); ücretsiz markalı kapak eklendi.`,
            }))
          }
        } catch (e) {
          setNotes((n) => ({ ...n, [index]: `İçerik hazır ama kapak eklenemedi: ${e.message}` }))
        }
      }
      await onChanged()
      onOpen?.(index) // yeni içerik kendi sekmesinde açılsın
    } catch (e) {
      setErrors((x) => ({ ...x, [index]: e.message }))
      await onChanged() // yarım kalan adımın kaydı (doğrulama vb.) görünsün
    } finally {
      setRun(null)
    }
  }

  if (!topics.length) return null
  const hasNewFormat = topics.some((t) => t.items?.length)

  return (
    <section className="admin-card tb">
      <div className="card-head">
        <h3>Günün konuları</h3>
        <span className="muted-line">İstediğine "İçerik oluştur" de: doğrular, yazar, kontrol eder · konu başı ~0,03 $</span>
      </div>
      {!hasNewFormat && (
        <p className="tb-legacy">
          Bu özet eski biçimde kaydedildi; konulardan içerik oluşturma yarın sabahki listeden itibaren açılır.
        </p>
      )}
      <ol className="tb-list">
        {topics.map((t, i) => {
          const u = URGENCY[t.urgency]
          const trust = TRUST[t.trust] || TRUST['tek-kaynak']
          const hasContent = Boolean(t.content?.post_id)
          const isActive = hasContent && focus === i
          const busyHere = run?.index === i
          const stepIdx = busyHere ? STEPS.findIndex((s) => s.key === run.step) : -1
          return (
            <li key={i} className={`tb-topic${isActive ? ' is-active' : ''}${u ? ` u-${u.cls}` : ''}`}>
              <div className="tb-head">
                {u && <span className={`tb-urgency u-${u.cls}`}>{u.label}</span>}
                {t.rating != null && <span className="tb-rating">{t.rating}/10</span>}
                <strong className="tb-title">{t.topic}</strong>
              </div>

              {(t.summary || t.verification?.whatHappened) && <p className="tb-summary">{t.summary || t.verification.whatHappened}</p>}

              {(t.highlights?.length > 0 || t.lessons?.length > 0) && (
                <div className="tb-points">
                  {t.highlights?.length > 0 && (
                    <div>
                      <span className="tb-points-label">Çarpıcı noktalar</span>
                      <ul>
                        {t.highlights.map((h, j) => (
                          <li key={j}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {t.lessons?.length > 0 && (
                    <div>
                      <span className="tb-points-label is-learn">Öğretici noktalar</span>
                      <ul>
                        {t.lessons.map((h, j) => (
                          <li key={j}>{h}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {t.angle && (
                <p className="tb-angle">
                  <b>Yazının açısı:</b> {t.angle}
                </p>
              )}

              {t.why?.length > 0 && (
                <details className="tb-why">
                  <summary>Neden {t.rating != null ? `${t.rating}/10` : 'bu puan'}?</summary>
                  <ul>
                    {t.why.map((w, j) => (
                      <li key={j}>{w}</li>
                    ))}
                  </ul>
                </details>
              )}

              <div className="tb-meta">
                <span className={`chip trust-${trust.cls}`}>
                  {trust.cls === 'low' ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />} {trust.label}
                </span>
                {t.verified === true && <span className="chip trust-ok">Doğrulandı</span>}
                {t.verified === false && <span className="chip trust-low">Doğrulanamadı</span>}
                {t.content?.existing && <span className="chip trust-ok">Yazısı sitede hazır</span>}
                <span className="tb-sources">
                  {(t.sources || []).slice(0, 4).map((s, j) => (
                    <a key={j} href={s.url} target="_blank" rel="noreferrer" title={s.title}>
                      {s.name}
                    </a>
                  ))}
                </span>
              </div>

              <div className="tb-actions">
                {hasContent ? (
                  <>
                    <span className="tb-active">
                      <Check size={14} /> {t.content.shared ? 'Paylaşıldı' : 'İçeriği hazır'}
                    </span>
                    {!isActive && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => onOpen?.(i)}>
                        <ArrowRightLeft size={14} /> İçeriği aç
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={Boolean(run) || !t.items?.length}
                    onClick={() => create(i)}
                    title={t.items?.length ? '' : 'Eski biçimdeki konudan içerik üretilemez'}
                  >
                    {busyHere ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />} İçerik oluştur
                  </button>
                )}
              </div>

              {busyHere && stepIdx >= 0 && (
                <ol className="tb-steps" aria-live="polite">
                  {STEPS.map((s, j) => (
                    <li key={s.key} className={j < stepIdx ? 'done' : j === stepIdx ? 'now' : ''}>
                      {j < stepIdx ? <Check size={13} /> : j === stepIdx ? <Loader2 size={13} className="spin" /> : <Circle size={11} />}
                      {s.label}
                    </li>
                  ))}
                </ol>
              )}
              {errors[i] && (
                <div className="alert err">
                  <AlertTriangle size={15} /> {errors[i]}
                </div>
              )}
              {notes[i] && <p className="muted-line">{notes[i]}</p>}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
