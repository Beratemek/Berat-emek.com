import { useMemo } from 'react'
import { Layers, CheckCircle2, Circle } from 'lucide-react'
import ContentTools from './ContentTools.jsx'
import LinkedInShare from './LinkedInShare.jsx'
import '../today-content.css'

/** Günün içerikleri: aynı gün birden fazla içerik olabilir; her biri kendi sekmesinde düzenlenip paylaşılır. */
export function dayContents(brief) {
  const list = (brief.topics || []).map((t, i) => ({ topic: t, index: i, content: t.content })).filter((x) => x.content?.post_id)
  // Eski biçim: içerik bir konuya bağlı değilse günün tek içeriğini de göster
  if (brief.post_id && !list.some((x) => x.content.post_id === brief.post_id)) {
    list.unshift({
      topic: { topic: brief.headline || 'Günün içeriği' },
      index: -1,
      content: { post_id: brief.post_id, linkedin: brief.linkedin_text, shared: brief.stats?.linkedin || null },
    })
  }
  return list
}

export default function ContentDesk({ brief, focus, onFocus, onChanged }) {
  const contents = useMemo(() => dayContents(brief), [brief])
  if (!contents.length) return null
  const current = contents.find((x) => x.index === focus) || contents[contents.length - 1]

  return (
    <>
      <section id="icerikler" className="admin-card desk">
        <div className="card-head">
          <h3>
            <Layers size={16} /> İçeriklerin
          </h3>
          <span className="muted-line">
            {contents.length} içerik · her birini ayrı düzenleyip paylaşabilirsin
          </span>
        </div>
        <div className="desk-tabs" role="tablist" aria-label="Günün içerikleri">
          {contents.map((x) => {
            const on = x.index === current.index
            return (
              <button
                key={x.index}
                type="button"
                role="tab"
                aria-selected={on}
                className={`desk-tab${on ? ' on' : ''}${x.content.shared ? ' is-shared' : ''}`}
                onClick={() => onFocus(x.index)}
              >
                {x.content.shared ? <CheckCircle2 size={14} /> : <Circle size={12} />}
                <span className="desk-tab-title">{x.content.title || x.topic.topic}</span>
                <span className="desk-tab-state">{x.content.shared ? 'Paylaşıldı' : x.content.existing ? 'Sitede hazır' : 'Hazır'}</span>
              </button>
            )
          })}
        </div>
      </section>

      <ContentTools brief={brief} index={current.index} content={current.content} onChanged={onChanged} />
      <LinkedInShare brief={brief} index={current.index} content={current.content} onChanged={onChanged} />
    </>
  )
}
