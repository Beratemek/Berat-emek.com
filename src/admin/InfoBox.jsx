import { Info } from 'lucide-react'

export default function InfoBox({ children, tone = 'info' }) {
  const palettes = {
    info: {
      bg: '#ffffff',
      tint: 'rgba(167,139,250,0.08)',
      border: 'rgba(167,139,250,0.4)',
      icon: '#7c3aed',
    },
    warn: {
      bg: '#ffffff',
      tint: 'rgba(251,191,36,0.12)',
      border: 'rgba(251,191,36,0.5)',
      icon: '#b45309',
    },
  }
  const p = palettes[tone] ?? palettes.info

  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        padding: '14px 18px',
        borderRadius: 12,
        background: `linear-gradient(${p.tint}, ${p.tint}), ${p.bg}`,
        border: `1px solid ${p.border}`,
        marginBottom: 20,
        fontSize: 13,
        lineHeight: 1.65,
        color: '#1c1633',
        boxShadow: '0 1px 2px rgba(28,22,51,0.04)',
      }}
    >
      <Info size={18} style={{ color: p.icon, flexShrink: 0, marginTop: 2 }} />
      <div>{children}</div>
    </div>
  )
}