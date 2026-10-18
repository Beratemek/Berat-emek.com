import { useState } from 'react'
import { Sparkles, Loader2, Check, ShieldCheck, ShieldAlert, AlertTriangle, ArrowRightLeft, Circle } from 'lucide-react'
import { serverApi } from '../lib/serverApi.js'
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
  'tek-kaynak': { label: 'Tek kaynak', cls: 'low' },
}
const STEPS = [
  { key: 'verify', label: 'Kaynaklar okunuyor ve doğrulanıyor' },
  { key: 'write', label: 'Yazı ve LinkedIn metni yazılıyor' },
  { key: 'check', label: 'Doğrulanmış bilgilere karşı kontrol ediliyor' },
]

/** Günün gündemi: her konu için aciliyet, gerekçe ve tek tıkla içerik üretimi. */
export default function TopicBoard({ brief, onChanged }) {
  const [run, setRun] = useState(null) // { index, step }
  const [errors, setErrors] = useState({})
  const topics = Array.isArray(brief.topics) ? brief.topics : []

  async function create(index) {
    setErrors((e) => ({ ...e, [index]: null }))
    try {
      for (const s of STEPS) {
        setRun({ index, step: s.key })
        const out = await serverApi('/api/content/create', { method: 'POST', body: { briefId: brief.id, index, step: s.key } })
        if (out.ok === false) throw new Error(out.error || 'Adım tamamlanamadı')
      }
      await onChanged()
    } catch (e) {
      setErrors((x) => ({ ...x, [index]: e.message }))
      await onChanged() // yarım kalan adımın kaydı (doğrulama vb.) görünsün
    } finally {
      setRun(null)
    }
  }

  async function activate(index) {
    setRun({ index, step: 'activate' })
    try {
      await serverApi('/api/content/create', { method: 'POST', body: { briefId: brief.id, index, step: 'activate' } })
      await onChanged()
    } catch (e) {
      setErrors((x) => ({ ...x, [index]: e.message }))
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
          const isActive = t.content?.post_id && t.content.post_id === brief.post_id
          const busyHere = run?.index === i
          const stepIdx = busyHere ? STEPS.findIndex((s) => s.key === run.step) : -1
          return (
            <li key={i} className={`tb-topic${isActive ? ' is-active' : ''}${u ? ` u-${u.cls}` : ''}`}>
              <div className="tb-head">
                {u && <span className={`tb-urgency u-${u.cls}`}>{u.label}</span>}
                {t.rating != null && <span className="tb-rating">{t.rating}/10</span>}
                <strong className="tb-title">{t.topic}</strong>
              </div>

              {t.angle && <p className="tb-angle">{t.angle}</p>}
              {t.why?.length > 0 && (
                <ul className="tb-why">
                  {t.why.map((w, j) => (
                    <li key={j}>{w}</li>
                  ))}
                </ul>
              )}

              <div className="tb-meta">
                <span className={`chip trust-${trust.cls}`}>
                  {trust.cls === 'low' ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />} {trust.label}
                </span>
                {t.verified === true && <span className="chip trust-ok">Doğrulandı</span>}
                {t.verified === false && <span className="chip trust-low">Doğrulanamadı</span>}
                <span className="tb-sources">
                  {(t.sources || []).slice(0, 4).map((s, j) => (
                    <a key={j} href={s.url} target="_blank" rel="noreferrer" title={s.title}>
                      {s.name}
                    </a>
                  ))}
                </span>
              </div>

              <div className="tb-actions">
                {isActive ? (
                  <span className="tb-active">
                    <Check size={14} /> Seçili içerik — aşağıda düzenleyip paylaşabilirsin
                  </span>
                ) : t.content?.post_id ? (
                  <button type="button" className="btn btn-secondary btn-sm" disabled={Boolean(run)} onClick={() => activate(i)}>
                    {busyHere ? <Loader2 size={14} className="spin" /> : <ArrowRightLeft size={14} />} Bu içeriği kullan
                  </button>
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
            </li>
          )
        })}
      </ol>
    </section>
  )
}
