// Kapak görseli olmayan yazı/projeler için üretilen kapak: koyu zemin, tek ışık,
// konuya göre seçilen ikon ve etrafında yörünge halkaları. Başlıktan türetilen ton ve
// düğüm yerleşimi sayesinde her kapak farklı ama tutarlı; görsel hazırlamaya gerek kalmaz.
import {
  Plug, Bot, SquareTerminal, Sparkles, Workflow, Cpu, Factory, Trophy, ChartNoAxesColumn,
  ShoppingBag, Box, Smartphone, Newspaper, GraduationCap, Rocket, BrainCircuit, Coffee, Heart,
} from 'lucide-react'

// [ışık, derin ton] — hepsi sitenin sıcak paletinden
const ACCENTS = [
  ['240, 173, 108', '162, 74, 34'],
  ['245, 194, 122', '140, 74, 28'],
  ['233, 146, 92', '122, 46, 23'],
  ['243, 210, 155', '154, 106, 44'],
  ['232, 160, 122', '138, 58, 42'],
]

// Konu → ikon. Sıra önemli: ilk eşleşen kazanır (ör. "Claude Code'da skill" → terminal değil skill).
const TOPICS = [
  [/\bmcp\b|model context/i, Plug],
  [/\bskill/i, Sparkles],
  [/claude code|codex|cursor|terminal|cli\b/i, SquareTerminal],
  [/ajan|agent/i, Bot],
  [/langchain|langgraph|crewai|iş akışı|workflow/i, Workflow],
  [/yerel|local|ollama|llama|gguf|\bllm\b|dil model/i, Cpu],
  [/kurumsal|sanayi|enterprise|erp|scada|morf/i, Factory],
  [/datathon|kaggle|python|veri bilimi|f1/i, ChartNoAxesColumn],
  [/eğitim sistemi|öğrenci|ölçme/i, GraduationCap],
  [/uzay|moon|ay yüzeyi|rover/i, Rocket],
  [/hackathon|yarışma|ödül/i, Trophy],
  [/haber|news/i, Newspaper],
  [/kafe|cafe|coffee/i, Coffee],
  [/tanışma|dating|vault/i, Heart],
  [/e-ticaret|mağaza|shop/i, ShoppingBag],
  [/\b3d\b|three|webxr|artırılmış/i, Box],
  [/mobil|mobile|android|ios/i, Smartphone],
  [/derin öğrenme|makine öğrenmesi|transformer|sinir ağ|deep learning|yapay zeka|\bai\b/i, BrainCircuit],
]

const RINGS = [9, 15, 21, 27, 33, 39, 45]

function hash(text) {
  let h = 0
  for (const ch of String(text)) h = (h * 31 + ch.codePointAt(0)) >>> 0
  return h
}

export function topicIcon(topic) {
  const text = String(topic || '')
  return TOPICS.find(([re]) => re.test(text))?.[1] ?? Sparkles
}

export default function GenCover({ seed, label, word, topic, className = '' }) {
  const h = hash(seed)
  const [glow, deep] = ACCENTS[h % ACCENTS.length]
  const compact = /\bthumb\b|post-thumb/.test(className)
  const Icon = topicIcon(`${word || ''} ${topic || ''} ${seed || ''}`)

  // Halkaların üzerinde, başlığa göre yerleşen birkaç düğüm (ağ hissi)
  const nodes = Array.from({ length: 5 }, (_, i) => {
    const r = RINGS[1 + ((h >> (i * 3)) % 5)]
    const a = (((h >> (i * 4)) % 360) * Math.PI) / 180 + i * 1.3
    return { x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a), bright: i === 0 }
  })

  return (
    <div
      className={`gen-cover${compact ? ' is-compact' : ''} ${className}`}
      style={{ '--gc-glow': glow, '--gc-deep': deep }}
      aria-hidden="true"
    >
      <svg className="gc-orbit" viewBox="0 0 100 100">
        {RINGS.map((r) => (
          <circle key={r} cx="50" cy="50" r={r} />
        ))}
        {nodes.map((n, i) => (
          <circle key={`n${i}`} className={n.bright ? 'gc-node is-bright' : 'gc-node'} cx={n.x} cy={n.y} r={n.bright ? 0.9 : 0.55} />
        ))}
      </svg>
      <span className="gc-icon">
        <Icon strokeWidth={1.4} />
      </span>
      {label && <span className="gc-tag">{label}</span>}
      {word && !compact && <span className="gc-word">{word}</span>}
    </div>
  )
}
