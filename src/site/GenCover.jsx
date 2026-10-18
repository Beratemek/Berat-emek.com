// Kapak görseli olmayan yazı/projeler için üretilen sıcak tonlu kapak.
// Başlıktan türetilen renk paleti ve konuya göre seçilen ikon sayesinde her kapak farklı ama tutarlı;
// yeni bir yazı ya da proje eklendiğinde görsel hazırlamaya gerek kalmaz.
import {
  Plug, Bot, SquareTerminal, Sparkles, Workflow, Cpu, Factory, Trophy, ChartNoAxesColumn,
  ShoppingBag, Box, Smartphone, Newspaper, GraduationCap, Rocket, BrainCircuit, Coffee, Heart,
} from 'lucide-react'

const PALETTES = [
  ['#2e1d14', '#a24a22', '#f0b46a'],
  ['#231812', '#6e3f22', '#d99a55'],
  ['#3a2417', '#b4572a', '#f5cf93'],
  ['#1e1611', '#5a3a26', '#c98a4f'],
  ['#33201a', '#8c3b24', '#e9a76b'],
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
  const [base, mid, light] = PALETTES[h % PALETTES.length]
  const cx = 70 + (h % 25)
  const cy = 30 + ((h >> 3) % 45)
  const background = `radial-gradient(120% 90% at ${cx}% ${100 - cy}%, ${light} 0%, transparent 52%), radial-gradient(90% 90% at 8% 100%, ${mid} 0%, transparent 62%), ${base}`
  const Icon = topicIcon(`${word || ''} ${topic || ''} ${seed || ''}`)

  return (
    <div className={`gen-cover ${className}`} style={{ background, '--gc-x': `${cx}%`, '--gc-y': `${100 - cy}%` }} aria-hidden="true">
      <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice">
        {[40, 80, 120, 160, 200, 240].map((r) => (
          <circle key={r} cx={(cx / 100) * 400} cy={(1 - cy / 100) * 240} r={r} fill="none" stroke="rgba(255,240,225,0.5)" strokeWidth="0.6" />
        ))}
      </svg>
      <span className="gc-icon">
        <Icon strokeWidth={1.5} />
      </span>
      {label && <span className="gc-tag">{label}</span>}
      {word && <span className="gc-word">{word}</span>}
    </div>
  )
}
