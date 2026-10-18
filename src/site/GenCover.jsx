// Kapak görseli olmayan yazı/projeler için üretilen sıcak tonlu kapak.
// Başlıktan türetilen renk paleti sayesinde her yazının kapağı farklı ama tutarlı.

const PALETTES = [
  ['#2e1d14', '#a24a22', '#f0b46a'],
  ['#231812', '#6e3f22', '#d99a55'],
  ['#3a2417', '#b4572a', '#f5cf93'],
  ['#1e1611', '#5a3a26', '#c98a4f'],
  ['#33201a', '#8c3b24', '#e9a76b'],
]

function hash(text) {
  let h = 0
  for (const ch of String(text)) h = (h * 31 + ch.codePointAt(0)) >>> 0
  return h
}

export default function GenCover({ seed, label, word, className = '' }) {
  const h = hash(seed)
  const [base, mid, light] = PALETTES[h % PALETTES.length]
  const cx = 70 + (h % 25)
  const cy = 30 + ((h >> 3) % 45)
  const background = `radial-gradient(120% 90% at ${cx}% ${100 - cy}%, ${light} 0%, transparent 52%), radial-gradient(90% 90% at 8% 100%, ${mid} 0%, transparent 62%), ${base}`

  return (
    <div className={`gen-cover ${className}`} style={{ background }} aria-hidden="true">
      <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">
        {[40, 80, 120, 160, 200, 240].map((r) => (
          <circle key={r} cx={(cx / 100) * 400} cy={(1 - cy / 100) * 240} r={r} fill="none" stroke="rgba(255,240,225,0.5)" strokeWidth="0.6" />
        ))}
      </svg>
      {label && <span className="gc-tag">{label}</span>}
      {word && <span className="gc-word">{word}</span>}
    </div>
  )
}
