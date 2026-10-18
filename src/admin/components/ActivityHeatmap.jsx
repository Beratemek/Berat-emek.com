import { useEffect, useMemo, useRef, useState } from 'react'
import { istanbulDay } from '../AdminData.jsx'

// Son 26 haftanın paylaşım takvimi (GitHub tarzı). Tek renk tonu, açıktan koyuya:
// bir günde yayınlanan yazı + LinkedIn paylaşımı sayısı = koyuluk. Bot "paylaş"
// dediği hâlde boş geçen günler küçük bir noktayla işaretlenir.
const WEEKS = 26
const DAY_MS = 864e5
const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
const LEVEL_TEXT = ['Etkinlik yok', '1 paylaşım', '2 paylaşım', '3+ paylaşım']

export default function ActivityHeatmap({ posts, briefs }) {
  const wrapRef = useRef(null)
  const scrollRef = useRef(null)
  const [tip, setTip] = useState(null)

  const data = useMemo(() => {
    const todayKey = istanbulDay()
    const today = new Date(`${todayKey}T12:00:00Z`)
    const dow = (today.getUTCDay() + 6) % 7 // Pazartesi = 0
    const start = new Date(today.getTime() - (dow + (WEEKS - 1) * 7) * DAY_MS)

    const byDay = new Map()
    const entry = (key) => {
      if (!byDay.has(key)) byDay.set(key, { posts: [], shared: null, suggested: null })
      return byDay.get(key)
    }
    for (const p of posts) if (p.published) entry(istanbulDay(p.created_at)).posts.push(p.title || 'Yazı')
    for (const b of briefs) {
      if (b.status === 'paylasildi') entry(b.brief_date).shared = b.headline || 'LinkedIn paylaşımı'
      else if (b.decision === 'paylas') entry(b.brief_date).suggested = b.headline || 'Paylaşım önerisi'
    }

    const weeks = []
    let activeDays = 0
    let streak = 0
    let best = 0
    let current = 0
    for (let w = 0; w < WEEKS; w++) {
      const days = []
      for (let d = 0; d < 7; d++) {
        const date = new Date(start.getTime() + (w * 7 + d) * DAY_MS)
        const key = date.toISOString().slice(0, 10)
        const future = key > todayKey
        const info = byDay.get(key) || { posts: [], shared: null, suggested: null }
        const level = Math.min(3, info.posts.length + (info.shared ? 1 : 0))
        if (!future) {
          if (level > 0) {
            activeDays++
            streak++
            best = Math.max(best, streak)
          } else if (key !== todayKey) {
            streak = 0 // bugün henüz bitmedi; seriyi bugün bozma
          }
          current = streak
        }
        days.push({ key, date, level, future, ...info })
      }
      weeks.push(days)
    }
    const months = weeks.map((days, i) => {
      const m = days[0].date.getUTCMonth()
      const prev = i > 0 ? weeks[i - 1][0].date.getUTCMonth() : -1
      return m !== prev ? MONTHS[m] : ''
    })
    return { weeks, months, activeDays, best, current }
  }, [posts, briefs])

  // Telefonda en yeni haftalar görünsün
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [data])

  function showTip(e, day) {
    const cell = e.currentTarget.getBoundingClientRect()
    const wrap = wrapRef.current.getBoundingClientRect()
    setTip({ x: cell.left - wrap.left + cell.width / 2, y: cell.top - wrap.top, day })
  }

  const fmt = (date) =>
    date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long', timeZone: 'UTC' })

  return (
    <div className="heatmap-wrap" ref={wrapRef}>
      <div className="heatmap-scroll" ref={scrollRef}>
        <div
          className="heatmap"
          role="img"
          aria-label={`Son 6 ayda ${data.activeDays} aktif gün; en uzun seri ${data.best} gün.`}
          onMouseLeave={() => setTip(null)}
        >
          <div className="heat-months" aria-hidden>
            {data.months.map((m, i) => (
              <span key={i}>{m}</span>
            ))}
          </div>
          <div className="heat-body">
            <div className="heat-days" aria-hidden>
              <span>Pzt</span>
              <span />
              <span>Çar</span>
              <span />
              <span>Cum</span>
              <span />
              <span />
            </div>
            <div className="heat-grid">
              {data.weeks.map((days, w) => (
                <div key={w} className="heat-col">
                  {days.map((d) => (
                    <span
                      key={d.key}
                      className={`heat-cell l${d.level}${d.future ? ' is-future' : ''}${d.suggested && !d.level ? ' is-suggested' : ''}`}
                      onMouseEnter={d.future ? undefined : (e) => showTip(e, d)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="heat-foot">
        <span className="heat-summary">
          <strong>{data.activeDays}</strong> aktif gün · en uzun seri <strong>{data.best}</strong> gün
          {data.current > 1 && <> · şu anki seri <strong>{data.current}</strong> gün</>}
        </span>
        <span className="heat-legend" aria-hidden>
          Az
          <i className="heat-cell l0" />
          <i className="heat-cell l1" />
          <i className="heat-cell l2" />
          <i className="heat-cell l3" />
          Çok
          <i className="heat-cell l0 is-suggested" /> Bot önerdi
        </span>
      </div>

      {tip && (
        <div className="heat-tip" style={{ left: tip.x, top: tip.y }} role="status">
          <strong>{fmt(tip.day.date)}</strong>
          <span className="heat-tip-level">{LEVEL_TEXT[tip.day.level]}</span>
          {tip.day.posts.map((t, i) => (
            <span key={i}>Yazı: {t}</span>
          ))}
          {tip.day.shared && <span>LinkedIn: {tip.day.shared}</span>}
          {tip.day.suggested && !tip.day.level && <span>Bot önerdi: {tip.day.suggested}</span>}
        </div>
      )}
    </div>
  )
}
