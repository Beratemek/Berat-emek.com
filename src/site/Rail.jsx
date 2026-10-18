import { Children, useEffect, useRef, useState } from 'react'

/**
 * Bilgisayarda normal ızgara, telefonda parmakla yana kaydırılan kart şeridi.
 * Izgara/şerit geçişi CSS'te (.rail); burada yalnızca telefondaki nokta göstergesi var.
 */
export default function Rail({ className = '', label, children }) {
  const ref = useRef(null)
  const [index, setIndex] = useState(0)
  const count = Children.toArray(children).length

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const items = [...el.children].filter((c) => c.offsetParent !== null)
        if (!items.length) return
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 4) return setIndex(items.length - 1)
        const start = el.getBoundingClientRect().left + parseFloat(getComputedStyle(el).paddingLeft)
        let best = 0
        items.forEach((item, i) => {
          if (Math.abs(item.getBoundingClientRect().left - start) < Math.abs(items[best].getBoundingClientRect().left - start)) best = i
        })
        setIndex(best)
      })
    }
    el.addEventListener('scroll', update, { passive: true })
    return () => {
      el.removeEventListener('scroll', update)
      cancelAnimationFrame(frame)
    }
  }, [])

  function go(i) {
    const item = ref.current?.children[i]
    item?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
  }

  return (
    <>
      <div ref={ref} className={`rail ${className}`} aria-label={label}>
        {children}
      </div>
      {count > 1 && (
        <div className="rail-dots" aria-hidden="true">
          {Array.from({ length: count }, (_, i) => (
            <button key={i} type="button" tabIndex={-1} className={i === index ? 'is-active' : ''} onClick={() => go(i)} />
          ))}
        </div>
      )}
    </>
  )
}
