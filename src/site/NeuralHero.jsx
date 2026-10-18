import { useEffect, useRef } from 'react'

// Ana sayfa girişindeki canlı "sinir ağı".
// - Açılışta dağınık noktalar toplanıp küreye dönüşür
// - Kenarlar boyunca sinyaller akar; fare düğümleri hafifçe iter
// - Tıklanınca en yakın düğümden bir sinyal dalgası yayılır
// Kütüphane kullanmaz (canvas 2D + perspektif). Ekranda değilse veya sekme
// arka plandaysa durur; "hareketi azalt" tercihinde tek kare çizer.

const TAU = Math.PI * 2
const INTRO_MS = 2400
const easeOut = (t) => 1 - Math.pow(1 - t, 3)

// Temaya göre çizim: karanlıkta espresso üstünde parlayan ışık,
// aydınlıkta krem kâğıda mürekkeple çizilmiş ince bir teknik çizim
const PALETTES = {
  dark: {
    ink: false, blend: 'lighter', edge: '236, 170, 110', edgeBoost: 1, node: '255, 226, 190', glow: '232, 140, 70',
    pointer: '246, 207, 142', core: '255, 236, 200', mid: '240, 160, 80', fade: '194, 90, 44',
  },
  light: {
    ink: true, blend: 'source-over', edge: '112, 68, 40', edgeBoost: 1, node: '78, 44, 24', glow: '180, 87, 42',
    pointer: '180, 87, 42', core: '178, 80, 34', mid: '232, 153, 79', fade: '232, 153, 79',
  },
}
const palette = () => PALETTES[document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light']

function buildNetwork(count) {
  const nodes = []
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = golden * i
    const depth = 0.72 + Math.random() * 0.34
    // Açılış animasyonu için uzak, dağınık bir başlangıç noktası
    const sr = 2.2 + Math.random() * 2.4
    const st = Math.random() * TAU
    const sp = Math.acos(2 * Math.random() - 1)
    nodes.push({
      x: Math.cos(theta) * r * depth,
      y: y * depth,
      z: Math.sin(theta) * r * depth,
      sx: Math.sin(sp) * Math.cos(st) * sr,
      sy: Math.cos(sp) * sr,
      sz: Math.sin(sp) * Math.sin(st) * sr,
      hub: Math.random() < 0.08,
      phase: Math.random() * TAU,
      delay: Math.random() * 0.35,
    })
  }

  const edges = []
  const seen = new Set()
  const adjacency = nodes.map(() => [])
  nodes.forEach((a, i) => {
    const nearest = nodes
      .map((b, j) => ({ j, d: (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2 }))
      .filter((n) => n.j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, 3)
    for (const { j } of nearest) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`
      if (seen.has(key)) continue
      seen.add(key)
      edges.push([i, j])
      adjacency[i].push(j)
      adjacency[j].push(i)
    }
  })
  return { nodes, edges, adjacency }
}

export default function NeuralHero() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const isSmall = window.innerWidth < 760
    const { nodes, edges, adjacency } = buildNetwork(isSmall ? 95 : 160)

    let width = 0
    let height = 0
    let raf = 0
    let running = false
    let visible = true
    let startTime = null

    const rot = { x: 0.35, y: 0, tx: 0.35 }
    const pointer = { x: -9999, y: -9999, active: false }
    const projected = nodes.map(() => ({ x: 0, y: 0, z: 0, s: 1 }))

    const newPulse = (from, fast = false) => {
      const start = from ?? Math.floor(Math.random() * nodes.length)
      const options = adjacency[start]
      const to = options[Math.floor(Math.random() * options.length)] ?? start
      return { from: start, to, t: from == null ? Math.random() : 0, speed: (fast ? 0.03 : 0.006) + Math.random() * 0.012, hops: fast ? 3 : Infinity }
    }
    const pulses = Array.from({ length: isSmall ? 16 : 28 }, () => newPulse())

    function resize() {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    function frame(time) {
      if (startTime === null) startTime = time
      const elapsed = time - startTime
      const wide = width >= 900
      const cx = wide ? width * 0.71 : width * 0.5
      const cy = wide ? height * 0.5 : height * 0.25
      const radius = wide ? Math.min(width * 0.29, height * 0.4) : Math.min(width * 0.44, height * 0.21)
      const focal = 2.6

      if (!reduceMotion) rot.y += 0.0015
      rot.x += (rot.tx - rot.x) * 0.04
      const cosY = Math.cos(rot.y), sinY = Math.sin(rot.y)
      const cosX = Math.cos(rot.x), sinX = Math.sin(rot.x)

      nodes.forEach((n, i) => {
        const raw = reduceMotion ? 1 : Math.min(1, Math.max(0, (elapsed / INTRO_MS - n.delay) / (1 - n.delay)))
        const k = easeOut(raw)
        const breathe = reduceMotion ? 1 : 1 + Math.sin(time * 0.0008 + n.phase) * 0.015
        const x = (n.sx + (n.x * breathe - n.sx) * k)
        const y = (n.sy + (n.y * breathe - n.sy) * k)
        const z = (n.sz + (n.z * breathe - n.sz) * k)
        const x1 = x * cosY - z * sinY
        const z1 = x * sinY + z * cosY
        const y1 = y * cosX - z1 * sinX
        const z2 = Math.max(-2.2, y * sinX + z1 * cosX)
        const s = focal / (focal + z2)
        const p = projected[i]
        p.x = cx + x1 * radius * s
        p.y = cy + y1 * radius * s
        p.z = Math.max(-1, Math.min(1, z2))
        p.s = s
        p.k = k
        // Fare yakınındaki düğümleri hafifçe it (mercek etkisi)
        if (pointer.active) {
          const dx = p.x - pointer.x
          const dy = p.y - pointer.y
          const d = Math.hypot(dx, dy)
          if (d < 170 && d > 0.01) {
            const push = (1 - d / 170) ** 2 * 26
            p.x += (dx / d) * push
            p.y += (dy / d) * push
          }
        }
      })

      ctx.clearRect(0, 0, width, height)
      const pal = palette()

      // Kenarlar (aydınlıkta kılcal mürekkep çizgisi)
      ctx.lineWidth = pal.ink ? 0.75 : 1
      for (const [a, b] of edges) {
        const pa = projected[a], pb = projected[b]
        const near = 1 - ((pa.z + pb.z) / 2 + 1) / 2
        const alpha = (0.06 + near * 0.3) * Math.min(pa.k, pb.k) * pal.edgeBoost
        if (alpha < 0.01) continue
        ctx.strokeStyle = `rgba(${pal.edge}, ${alpha.toFixed(3)})`
        ctx.beginPath()
        ctx.moveTo(pa.x, pa.y)
        ctx.lineTo(pb.x, pb.y)
        ctx.stroke()
      }

      // Fareden en yakın düğümlere ince bağlar
      if (pointer.active) {
        for (const p of projected) {
          const d = Math.hypot(p.x - pointer.x, p.y - pointer.y)
          if (d < 190) {
            ctx.strokeStyle = `rgba(${pal.pointer}, ${((1 - d / 190) * 0.4).toFixed(3)})`
            ctx.beginPath()
            ctx.moveTo(pointer.x, pointer.y)
            ctx.lineTo(p.x, p.y)
            ctx.stroke()
          }
        }
      }

      ctx.globalCompositeOperation = pal.blend
      ctx.lineWidth = 1

      // Düğümler
      nodes.forEach((n, i) => {
        const p = projected[i]
        const near = 1 - (p.z + 1) / 2
        const size = (n.hub ? 2.7 : 1.45) * p.s * (0.8 + near * 0.6)
        let alpha = (0.3 + near * 0.65) * (0.25 + p.k * 0.75)
        if (pointer.active && Math.hypot(p.x - pointer.x, p.y - pointer.y) < 170) alpha = 1
        if (n.hub && pal.ink) {
          // Aydınlıkta merkez düğümler: ince bakır halka
          ctx.strokeStyle = `rgba(${pal.glow}, ${(alpha * 0.55).toFixed(3)})`
          ctx.beginPath()
          ctx.arc(p.x, p.y, size * 3.2, 0, TAU)
          ctx.stroke()
        } else if (n.hub) {
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 7)
          glow.addColorStop(0, `rgba(${pal.glow}, ${(alpha * 0.4).toFixed(3)})`)
          glow.addColorStop(1, `rgba(${pal.glow}, 0)`)
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(p.x, p.y, size * 7, 0, TAU)
          ctx.fill()
        }
        ctx.fillStyle = `rgba(${pal.node}, ${alpha.toFixed(3)})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, size, 0, TAU)
        ctx.fill()
      })

      // Sinyaller (açılış bitince başlar)
      if (reduceMotion || elapsed > INTRO_MS * 0.6) {
        for (let k = pulses.length - 1; k >= 0; k--) {
          const pulse = pulses[k]
          if (!reduceMotion) pulse.t += pulse.speed
          if (pulse.t >= 1) {
            if (pulse.hops === Infinity) pulses[k] = newPulse(pulse.to)
            else if (pulse.hops > 1) pulses[k] = { ...newPulse(pulse.to, true), hops: pulse.hops - 1 }
            else pulses.splice(k, 1)
            continue
          }
          const a = projected[pulse.from], b = projected[pulse.to]
          const x = a.x + (b.x - a.x) * pulse.t
          const y = a.y + (b.y - a.y) * pulse.t
          const near = 1 - ((a.z + b.z) / 2 + 1) / 2
          if (pal.ink) {
            // Aydınlıkta: küçük yumuşak hale + net bakır nokta (leke yok)
            ctx.fillStyle = `rgba(${pal.mid}, ${(0.16 + near * 0.14).toFixed(3)})`
            ctx.beginPath()
            ctx.arc(x, y, 6 * (0.6 + near), 0, TAU)
            ctx.fill()
            ctx.fillStyle = `rgba(${pal.core}, ${(0.7 + near * 0.3).toFixed(3)})`
            ctx.beginPath()
            ctx.arc(x, y, 1.9 * (0.7 + near * 0.6), 0, TAU)
            ctx.fill()
            continue
          }
          const r = (pulse.hops === Infinity ? 10 : 13) * (0.5 + near)
          const glow = ctx.createRadialGradient(x, y, 0, x, y, r)
          glow.addColorStop(0, `rgba(${pal.core}, ${(0.6 + near * 0.4).toFixed(3)})`)
          glow.addColorStop(0.35, `rgba(${pal.mid}, ${(0.3 * near + 0.12).toFixed(3)})`)
          glow.addColorStop(1, `rgba(${pal.fade}, 0)`)
          ctx.fillStyle = glow
          ctx.beginPath()
          ctx.arc(x, y, r, 0, TAU)
          ctx.fill()
        }
      }

      ctx.globalCompositeOperation = 'source-over'
      if (running) raf = requestAnimationFrame(frame)
    }

    function start() {
      if (running || reduceMotion || !visible || document.hidden) return
      running = true
      raf = requestAnimationFrame(frame)
    }
    function stop() {
      running = false
      cancelAnimationFrame(raf)
    }

    function onPointerMove(e) {
      const rect = canvas.getBoundingClientRect()
      pointer.x = e.clientX - rect.left
      pointer.y = e.clientY - rect.top
      pointer.active = e.pointerType !== 'touch' && pointer.y >= 0 && pointer.y <= rect.height
      rot.tx = 0.35 + (pointer.y / rect.height - 0.5) * 0.5
      rot.y += (pointer.x / rect.width - 0.5) * 0.004
      if (reduceMotion) frame(performance.now())
    }
    function onPointerLeave() {
      pointer.active = false
    }
    function onPointerDown(e) {
      if (e.target.closest('a, button, input, textarea')) return
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      if (y < 0 || y > rect.height) return
      // En yakın düğümden hızlı bir sinyal dalgası başlat
      let best = 0
      let bestD = Infinity
      projected.forEach((p, i) => {
        const d = Math.hypot(p.x - x, p.y - y)
        if (d < bestD) { bestD = d; best = i }
      })
      for (let i = 0; i < 10; i++) pulses.push(newPulse(best, true))
      if (pulses.length > 120) pulses.splice(0, pulses.length - 120)
    }
    function onVisibility() {
      document.hidden ? stop() : start()
    }

    resize()
    frame(reduceMotion ? 0 : performance.now())
    start()

    const ro = new ResizeObserver(() => {
      resize()
      if (!running) frame(performance.now())
    })
    ro.observe(canvas)
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      visible ? start() : stop()
    })
    io.observe(canvas)
    const themeWatch = new MutationObserver(() => !running && frame(performance.now()))
    themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    document.addEventListener('pointerleave', onPointerLeave)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      stop()
      ro.disconnect()
      io.disconnect()
      themeWatch.disconnect()
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('pointerleave', onPointerLeave)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return <canvas ref={canvasRef} className="hero-canvas" aria-hidden="true" />
}
