// Markalı kapak (1200×630 PNG): bot/cover.js'teki tasarımın tarayıcıda çizilen hâli —
// sitenin koyu-bakır zemini, başlığa göre şekillenen ağ küresi, başlık ve imza.
// Yapay zeka kullanmaz, ücretsizdir; OpenRouter bakiyesi yokken de çalışır.
const W = 1200
const H = 630
const PAD_X = 76
const PAD_Y = 64

function hash(text) {
  let h = 7
  for (const ch of String(text)) h = (h * 31 + ch.codePointAt(0)) % 2147483647
  return h || 7
}

/** Ağ küresi: aynı başlık her zaman aynı küreyi verir (bot/cover.js ile aynı hesap). */
function drawSphere(c, title) {
  let seed = hash(title)
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const N = 170
  const g = Math.PI * (3 - Math.sqrt(5))
  const nodes = []
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const t = g * i
    const d = 0.72 + rnd() * 0.34
    nodes.push({ x: Math.cos(t) * r * d, y: y * d, z: Math.sin(t) * r * d, hub: rnd() < 0.08 })
  }
  const rx = 0.3 + rnd() * 0.3
  const ry = rnd() * 6
  const cx = 920
  const cy = 315
  const R = 290
  const f = 2.6
  const P = nodes.map((n) => {
    const x1 = n.x * Math.cos(ry) - n.z * Math.sin(ry)
    const z1 = n.x * Math.sin(ry) + n.z * Math.cos(ry)
    const y1 = n.y * Math.cos(rx) - z1 * Math.sin(rx)
    const z2 = n.y * Math.sin(rx) + z1 * Math.cos(rx)
    const s = f / (f + z2)
    return { x: cx + x1 * R * s, y: cy + y1 * R * s, z: z2, s, hub: n.hub }
  })
  const E = []
  nodes.forEach((a, i) =>
    nodes
      .map((b, j) => ({ j, d: (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2 }))
      .filter((o) => o.j !== i)
      .sort((p, q) => p.d - q.d)
      .slice(0, 3)
      .forEach((o) => E.push([i, o.j]))
  )
  E.forEach(([a, b]) => {
    const pa = P[a]
    const pb = P[b]
    const al = 0.05 + (1 - ((pa.z + pb.z) / 2 + 1) / 2) * 0.25
    c.strokeStyle = `rgba(236,170,110,${al})`
    c.beginPath()
    c.moveTo(pa.x, pa.y)
    c.lineTo(pb.x, pb.y)
    c.stroke()
  })
  c.globalCompositeOperation = 'lighter'
  P.forEach((p) => {
    const near = 1 - (p.z + 1) / 2
    const sz = (p.hub ? 2.8 : 1.5) * p.s * (0.8 + near * 0.6)
    if (p.hub) {
      const gr = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, sz * 8)
      gr.addColorStop(0, 'rgba(232,140,70,.35)')
      gr.addColorStop(1, 'rgba(232,140,70,0)')
      c.fillStyle = gr
      c.beginPath()
      c.arc(p.x, p.y, sz * 8, 0, 7)
      c.fill()
    }
    c.fillStyle = `rgba(255,226,190,${0.3 + near * 0.6})`
    c.beginPath()
    c.arc(p.x, p.y, sz, 0, 7)
    c.fill()
  })
  for (let k = 0; k < 22; k++) {
    const e = E[Math.floor(rnd() * E.length)]
    const t = rnd()
    const pa = P[e[0]]
    const pb = P[e[1]]
    const x = pa.x + (pb.x - pa.x) * t
    const y = pa.y + (pb.y - pa.y) * t
    const gr = c.createRadialGradient(x, y, 0, x, y, 12)
    gr.addColorStop(0, 'rgba(255,236,200,.9)')
    gr.addColorStop(0.35, 'rgba(232,140,70,.3)')
    gr.addColorStop(1, 'rgba(194,90,44,0)')
    c.fillStyle = gr
    c.beginPath()
    c.arc(x, y, 12, 0, 7)
    c.fill()
  }
  c.globalCompositeOperation = 'source-over'
}

function wrap(c, text, maxWidth) {
  const lines = []
  let line = ''
  for (const w of String(text).split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${w}` : w
    if (line && c.measureText(next).width > maxWidth) {
      lines.push(line)
      line = w
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

/** Kapak görselini çizer; PNG veri adresi döner. */
export async function renderBrandCover({ title, kicker = 'Yapay zeka gündemi', date = '' }) {
  await Promise.all([
    document.fonts.load('700 56px Inter'),
    document.fonts.load('600 19px "JetBrains Mono"'),
    document.fonts.load('500 17px "JetBrains Mono"'),
  ]).catch(() => {})

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const c = canvas.getContext('2d')
  c.fillStyle = '#1c1410'
  c.fillRect(0, 0, W, H)
  drawSphere(c, title)

  // Sol tarafı koyulaştıran gölge: radial-gradient(ellipse 66% 88% at 20% 50%, …)
  const gx = W * 0.2
  const gy = H * 0.5
  const rX = W * 0.66
  const k = (H * 0.88) / rX
  c.save()
  c.translate(gx, gy)
  c.scale(1, k)
  const shade = c.createRadialGradient(0, 0, 0, 0, 0, rX)
  shade.addColorStop(0, 'rgba(28,20,16,.97)')
  shade.addColorStop(0.58, 'rgba(28,20,16,.7)')
  shade.addColorStop(0.82, 'rgba(28,20,16,0)')
  c.fillStyle = shade
  c.fillRect(-gx, -gy / k, W, H / k)
  c.restore()

  c.textBaseline = 'top'

  // Üst etiket ve tarih
  c.font = '600 19px "JetBrains Mono", monospace'
  c.letterSpacing = '2.66px'
  const kick = String(kicker).toLocaleUpperCase('tr-TR')
  c.fillStyle = '#f0ad6c'
  c.fillText(kick, PAD_X, PAD_Y)
  if (date) {
    let x = PAD_X + c.measureText(kick).width + 14
    c.fillStyle = '#6e5745'
    c.beginPath()
    c.arc(x + 3, PAD_Y + 10, 3, 0, 7)
    c.fill()
    x += 20
    c.fillStyle = '#a48d79'
    c.fillText(String(date).toLocaleUpperCase('tr-TR'), x, PAD_Y)
  }

  // Başlık: uzunluğa göre punto, etiketle imza arasında dikeyde ortalı
  const len = String(title).length
  const size = len <= 40 ? 64 : len <= 60 ? 56 : len <= 80 ? 48 : 42
  c.font = `700 ${size}px Inter, sans-serif`
  c.letterSpacing = `${(-0.035 * size).toFixed(2)}px`
  c.fillStyle = '#f5ece0'
  const lines = wrap(c, title, 720)
  const lh = size * 1.08
  const top = PAD_Y + 23
  const bottom = H - PAD_Y - 52
  let y = top + (bottom - top - lines.length * lh) / 2
  for (const l of lines) {
    c.fillText(l, PAD_X, y + (lh - size) / 2)
    y += lh
  }

  // İmza
  const fy = H - PAD_Y - 52
  c.letterSpacing = '0px'
  c.fillStyle = '#f5ece0'
  c.beginPath()
  c.roundRect(PAD_X, fy, 52, 52, 13)
  c.fill()
  c.fillStyle = '#1c1410'
  c.font = '600 19px "JetBrains Mono", monospace'
  c.textAlign = 'center'
  c.textBaseline = 'middle'
  c.fillText('BE', PAD_X + 26, fy + 27)
  c.textAlign = 'left'
  c.textBaseline = 'top'
  c.fillStyle = '#f5ece0'
  c.font = '700 22px Inter, sans-serif'
  c.letterSpacing = '-0.22px'
  c.fillText('Berat Emek', PAD_X + 68, fy + 1)
  c.font = '500 17px "JetBrains Mono", monospace'
  c.letterSpacing = '0px'
  c.fillStyle = '#a48d79'
  c.fillText('berat-emek.com', PAD_X + 68, fy + 31)

  return canvas.toDataURL('image/png')
}
