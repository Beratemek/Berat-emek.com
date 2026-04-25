import { AnimatePresence, motion } from 'framer-motion'
import { X, Mail, Globe, ArrowUpRight, Sun, Moon } from 'lucide-react'
import { content } from '../data/portfolio.js'
import { THEMES } from '../data/themes.js'

const GithubIcon = (props) => (
  <svg viewBox="0 0 24 24" width={props.size ?? 18} height={props.size ?? 18} fill="currentColor" aria-hidden>
    <path d="M12 .5C5.73.5.77 5.46.77 11.73c0 4.96 3.22 9.16 7.68 10.65.56.1.77-.24.77-.54v-1.9c-3.12.68-3.78-1.5-3.78-1.5-.5-1.28-1.24-1.62-1.24-1.62-1.02-.7.08-.68.08-.68 1.12.08 1.72 1.15 1.72 1.15 1 1.72 2.62 1.22 3.26.94.1-.74.39-1.22.71-1.5-2.49-.28-5.12-1.24-5.12-5.53 0-1.22.44-2.22 1.15-3-.12-.28-.5-1.42.1-2.96 0 0 .94-.3 3.08 1.14.9-.25 1.86-.38 2.82-.38.96 0 1.92.13 2.82.38 2.14-1.44 3.08-1.14 3.08-1.14.6 1.54.22 2.68.1 2.96.71.78 1.15 1.78 1.15 3 0 4.3-2.64 5.24-5.14 5.52.4.34.76 1 .76 2.02v3c0 .3.2.64.78.54 4.46-1.5 7.68-5.7 7.68-10.65C23.23 5.46 18.27.5 12 .5z" />
  </svg>
)

const LinkedinIcon = (props) => (
  <svg viewBox="0 0 24 24" width={props.size ?? 18} height={props.size ?? 18} fill="currentColor" aria-hidden>
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.66H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.47v6.27zM5.34 7.43a2.07 2.07 0 11.01-4.14 2.07 2.07 0 01-.01 4.14zm1.78 13.02H3.56V9h3.56v11.45zM22.23 0H1.77C.79 0 0 .78 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .78 23.21 0 22.23 0z" />
  </svg>
)

const iconMap = { mail: Mail, github: GithubIcon, linkedin: LinkedinIcon, globe: Globe }

function buildPanelData(sectionId, live) {
  if (!sectionId) return null
  const fallback = content[sectionId]

  if (sectionId === 'about') {
    const p = live?.profile
    return {
      title: 'Hakkımda',
      kicker: p?.kicker || fallback.kicker,
      body: p?.body || fallback.body,
      highlights: p?.highlights?.length ? p.highlights : fallback.highlights,
    }
  }

  if (sectionId === 'projects') {
    const items = (live?.projectPosts || []).map((p) => ({
      name: p.title,
      desc: p.excerpt || '',
      tags: p.tags || [],
    }))
    return {
      title: 'Projeler',
      kicker: fallback.kicker,
      items: items.length ? items : fallback.items,
    }
  }

  if (sectionId === 'blog') {
    const posts = (live?.blogPosts || []).map((p) => ({
      title: p.title,
      date: p.created_at,
      tag: (p.tags && p.tags[0]) || 'Yazı',
      excerpt: p.excerpt || '',
    }))
    return {
      title: 'Blog',
      kicker: fallback.kicker,
      posts: posts.length ? posts : fallback.posts,
    }
  }

  if (sectionId === 'contact') {
    const links = (live?.contact || []).map((l) => ({
      label: l.label,
      value: l.value,
      href: l.href,
      icon: l.icon || 'globe',
    }))
    return {
      title: 'İletişim',
      kicker: fallback.kicker,
      body: fallback.body,
      links: links.length ? links : fallback.links,
    }
  }

  return fallback
}

export default function OverlayUI({ activeSection, onClose, theme = 'day', onToggleTheme, content: live }) {
  const data = buildPanelData(activeSection, live)

  return (
    <>
      <HudCorners theme={theme} onToggleTheme={onToggleTheme} />

      <AnimatePresence>
        {activeSection && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 8,
              background:
                'radial-gradient(ellipse at 25% 50%, rgba(10,6,22,0.55), transparent 65%)',
              cursor: 'pointer',
            }}
          />
        )}

        {activeSection && data && (
          <motion.aside
            key={`panel-${activeSection}`}
            initial={{ x: '105%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '105%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 140, damping: 22 }}
            className="panel-scroll"
            style={panelStyle}
          >
            <button onClick={onClose} style={closeBtnStyle} aria-label="Kapat">
              <X size={18} />
            </button>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              style={kickerStyle}
            >
              {data.kicker ?? `Section · ${data.title}`}
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 }}
              style={headingStyle}
            >
              {data.title}
            </motion.h1>

            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.25, duration: 0.5 }}
              style={dividerStyle}
            />

            <div style={{ marginTop: 28 }}>
              <PanelContent sectionId={activeSection} data={data} />
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}

function HudCorners({ theme = 'day', onToggleTheme }) {
  const T = THEMES[theme]

  return (
    <>
      <div
        style={{
          ...hudLeftStyle,
          color: T.hud.text,
          textShadow: T.hud.textShadow,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 600 }}>Berat Emek</div>
        <div style={{ fontSize: 12, opacity: 0.7 }}>Full-Stack Developer</div>
      </div>

      {/* Tema toggle butonu — her zaman görünür */}
      <motion.button
        onClick={onToggleTheme}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        aria-label={theme === 'day' ? 'Gece moduna geç' : 'Gündüz moduna geç'}
        style={{
          position: 'fixed',
          top: 28,
          right: 28,
          zIndex: 6,
          width: 48,
          height: 48,
          borderRadius: 24,
          border: `1px solid ${T.hud.chipBorder}`,
          background: T.hud.chipBg,
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          color: T.hud.text,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: theme === 'day'
            ? '0 4px 20px rgba(245,158,66,0.25)'
            : '0 4px 20px rgba(80,100,255,0.35)',
          transition: 'background 0.4s, color 0.4s, box-shadow 0.4s',
        }}
      >
        <AnimatePresence mode="wait">
          {theme === 'day' ? (
            <motion.span
              key="moon"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ display: 'flex' }}
            >
              <Moon size={20} />
            </motion.span>
          ) : (
            <motion.span
              key="sun"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{ display: 'flex' }}
            >
              <Sun size={20} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

    </>
  )
}

function PanelContent({ sectionId, data }) {
  if (sectionId === 'about') return <About data={data} />
  if (sectionId === 'projects') return <Projects data={data} />
  if (sectionId === 'blog') return <Blog data={data} />
  if (sectionId === 'contact') return <Contact data={data} />
  return null
}

const fade = (i) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.3 + i * 0.06, duration: 0.45 },
})

function About({ data }) {
  return (
    <div>
      <motion.p {...fade(0)} style={bodyStyle}>
        {data.body}
      </motion.p>
      <ul style={{ listStyle: 'none', marginTop: 28, display: 'grid', gap: 10 }}>
        {data.highlights.map((h, i) => (
          <motion.li key={h} {...fade(i + 1)} style={pillCardStyle}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                background: '#7dd3fc',
                boxShadow: '0 0 12px #7dd3fc',
              }}
            />
            {h}
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

function Projects({ data }) {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {data.items.map((p, i) => (
        <motion.article key={p.name} {...fade(i)} style={projectCardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h3 style={{ fontSize: 20, fontWeight: 600 }}>{p.name}</h3>
            <ArrowUpRight size={18} style={{ color: 'rgba(58,42,74,0.4)', flexShrink: 0 }} />
          </div>
          <p style={{ color: 'rgba(58,42,74,0.75)', lineHeight: 1.6, fontSize: 14, marginTop: 8 }}>
            {p.desc}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
            {p.tags.map((t) => (
              <span key={t} style={tagStyle}>
                {t}
              </span>
            ))}
          </div>
        </motion.article>
      ))}
    </div>
  )
}

function Blog({ data }) {
  const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {data.posts.map((p, i) => (
        <motion.article
          key={p.title}
          {...fade(i)}
          style={{
            padding: '18px 20px',
            borderRadius: 14,
            border: '1px solid rgba(167,139,250,0.25)',
            background:
              'linear-gradient(135deg, rgba(196,181,253,0.18) 0%, rgba(167,139,250,0.08) 100%)',
            color: '#3a2a4a',
            cursor: 'pointer',
          }}
          whileHover={{ y: -2, borderColor: 'rgba(167,139,250,0.5)' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span
              style={{
                fontSize: 10,
                letterSpacing: 2,
                textTransform: 'uppercase',
                fontWeight: 700,
                color: '#7c3aed',
              }}
            >
              {p.tag}
            </span>
            <span style={{ fontSize: 11, color: 'rgba(58,42,74,0.55)' }}>{fmtDate(p.date)}</span>
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.3, marginBottom: 6 }}>
            {p.title}
          </h3>
          <p style={{ fontSize: 13, lineHeight: 1.55, color: 'rgba(58,42,74,0.7)' }}>{p.excerpt}</p>
        </motion.article>
      ))}
    </div>
  )
}

function Contact({ data }) {
  return (
    <div>
      <motion.p {...fade(0)} style={bodyStyle}>
        {data.body}
      </motion.p>
      <div style={{ display: 'grid', gap: 10, marginTop: 24 }}>
        {data.links.map((l, i) => {
          const Icon = iconMap[l.icon] ?? Globe
          const href = l.href || '#'
          return (
            <motion.a
              key={`${l.label}-${i}`}
              {...fade(i + 1)}
              href={href}
              target="_blank"
              rel="noreferrer"
              whileHover={{ x: 4, borderColor: 'rgba(249,168,212,0.45)' }}
              style={linkCardStyle}
            >
              <div style={linkIconStyle}>
                <Icon size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 11,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    color: 'rgba(58,42,74,0.55)',
                    fontWeight: 600,
                  }}
                >
                  {l.label}
                </div>
                <div style={{ fontSize: 15, marginTop: 2, color: '#3a2a4a', fontWeight: 500 }}>{l.value}</div>
              </div>
              <ArrowUpRight size={18} style={{ color: 'rgba(58,42,74,0.4)' }} />
            </motion.a>
          )
        })}
      </div>
    </div>
  )
}

/* --- styles --- */

const panelStyle = {
  position: 'fixed',
  top: 0,
  right: 0,
  bottom: 0,
  zIndex: 10,
  width: 'min(560px, 94vw)',
  padding: '56px 44px',
  background:
    'linear-gradient(180deg, rgba(255,250,245,0.92) 0%, rgba(250,232,240,0.94) 100%)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  borderLeft: '1px solid rgba(255,255,255,0.5)',
  boxShadow: '-30px 0 80px rgba(100,60,120,0.15)',
  overflowY: 'auto',
  color: '#3a2a4a',
}

const closeBtnStyle = {
  position: 'absolute',
  top: 20,
  right: 20,
  width: 40,
  height: 40,
  borderRadius: 20,
  background: 'rgba(58,42,74,0.06)',
  border: '1px solid rgba(58,42,74,0.12)',
  color: '#3a2a4a',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background 0.2s',
}

const kickerStyle = {
  fontSize: 12,
  letterSpacing: 3,
  textTransform: 'uppercase',
  color: '#c2563f',
  fontWeight: 600,
}

const headingStyle = {
  fontSize: 56,
  fontWeight: 800,
  margin: '10px 0 20px',
  letterSpacing: -1.5,
  lineHeight: 1.05,
  background: 'linear-gradient(135deg, #3a2a4a 0%, #a78bfa 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}

const dividerStyle = {
  height: 2,
  width: 72,
  background: 'linear-gradient(90deg, #f59e42, #f472b6)',
  borderRadius: 1,
  transformOrigin: 'left',
}

const bodyStyle = {
  lineHeight: 1.7,
  fontSize: 16,
  color: 'rgba(58,42,74,0.82)',
}

const pillCardStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '14px 18px',
  borderRadius: 12,
  border: '1px solid rgba(167,139,250,0.22)',
  background: 'rgba(255,255,255,0.55)',
  fontSize: 14,
  color: '#3a2a4a',
}

const projectCardStyle = {
  padding: '20px 22px',
  borderRadius: 16,
  border: '1px solid rgba(167,139,250,0.25)',
  background:
    'linear-gradient(135deg, rgba(253,224,198,0.6) 0%, rgba(244,188,213,0.45) 100%)',
  color: '#3a2a4a',
}

const tagStyle = {
  fontSize: 11,
  letterSpacing: 1.2,
  textTransform: 'uppercase',
  padding: '5px 10px',
  borderRadius: 999,
  background: 'rgba(56,189,248,0.18)',
  color: '#0e7490',
  border: '1px solid rgba(56,189,248,0.3)',
  fontWeight: 600,
}


const linkCardStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 14,
  padding: '14px 18px',
  borderRadius: 12,
  border: '1px solid rgba(167,139,250,0.22)',
  background: 'rgba(255,255,255,0.55)',
  textDecoration: 'none',
  color: '#3a2a4a',
  transition: 'all 0.2s',
}

const linkIconStyle = {
  width: 40,
  height: 40,
  borderRadius: 10,
  background: 'rgba(244,114,182,0.15)',
  color: '#be185d',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const hudLeftStyle = {
  position: 'fixed',
  top: 28,
  left: 28,
  zIndex: 5,
  pointerEvents: 'none',
  color: 'rgba(58,42,74,0.9)',
  textShadow: '0 1px 2px rgba(255,255,255,0.5)',
}