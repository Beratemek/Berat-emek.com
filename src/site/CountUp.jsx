import { useEffect, useRef, useState } from 'react'

/** Ekrana girince sıfırdan hedef sayıya yumuşakça sayar; hareket azaltma tercihine uyar. */
export default function CountUp({ value, decimals = 0, locale, format = (s) => s, duration = 1400 }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el || value == null) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      setShown(value)
      return
    }
    let frame = 0
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const tick = (now) => {
        const p = Math.min(1, (now - t0) / duration)
        setShown(value * (1 - Math.pow(1 - p, 3)))
        if (p < 1) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
    })
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [value, duration])

  const text =
    value == null
      ? '—'
      : new Intl.NumberFormat(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(
          decimals ? shown : Math.round(shown)
        )
  return <span ref={ref}>{format(text)}</span>
}
