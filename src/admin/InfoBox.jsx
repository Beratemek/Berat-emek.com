import { Info, AlertTriangle } from 'lucide-react'

export default function InfoBox({ children, tone = 'info' }) {
  const Icon = tone === 'warn' ? AlertTriangle : Info
  return (
    <div className={`info-box${tone === 'warn' ? ' is-warn' : ''}`}>
      <Icon size={18} />
      <div>{children}</div>
    </div>
  )
}
