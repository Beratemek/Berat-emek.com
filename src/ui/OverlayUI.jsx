import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Mail, Globe, ArrowUpRight, Sun, Moon } from 'lucide-react'
import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import TiptapLink from '@tiptap/extension-link'
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
      slug: p.slug,
      cover: p.cover || null,
      content: p.content || null,
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
      slug: p.slug,
      kind: p.kind || 'blog',
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
  const isMobile = useIsMobile()

  const mobilePanelStyle = isMobile ? {
    ...panelStyle,
    width: '100vw',
    padding: '40px 20px',
    borderLeft: 'none',
  } : panelStyle

  const mobileHeadingStyle = isMobile ? {
    ...headingStyle,
    fontSize: 36,
    letterSpacing: -0.5,
  } : headingStyle

  return (
    <>
      <HudCorners theme={theme} onToggleTheme={onToggleTheme} isMobile={isMobile} />

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
            style={mobilePanelStyle}
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
              style={mobileHeadingStyle}
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

function HudCorners({ theme = 'day', onToggleTheme, isMobile = false }) {
  const T = THEMES[theme]

  return (
    <>
      <div
        style={{
          ...hudLeftStyle,
          color: T.hud.text,
          textShadow: T.hud.textShadow,
          top: isMobile ? 14 : 28,
          left: isMobile ? 14 : 28,
        }}
      >
        <div style={{ fontSize: isMobile ? 12 : 14, fontWeight: 600 }}>Berat Emek</div>
        <div style={{ fontSize: isMobile ? 10 : 12, opacity: 0.7 }}>Full-Stack Developer</div>
      </div>

      {/* Tema toggle butonu — her zaman görünür */}
      <motion.button
        onClick={onToggleTheme}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        aria-label={theme === 'day' ? 'Gece moduna geç' : 'Gündüz moduna geç'}
        style={{
          position: 'fixed',
          top: isMobile ? 14 : 28,
          right: isMobile ? 14 : 28,
          zIndex: 6,
          width: isMobile ? 38 : 48,
          height: isMobile ? 38 : 48,
          borderRadius: isMobile ? 19 : 24,
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
  const [selected, setSelected] = useState(null)

  return (
    <>
      <div style={{ display: 'grid', gap: 14 }}>
        {data.items.map((p, i) => (
          <motion.article
            key={p.name}
            {...fade(i)}
            style={{ ...projectCardStyle, cursor: 'pointer' }}
            whileHover={{ y: -3, boxShadow: '0 8px 30px rgba(167,139,250,0.18)' }}
            onClick={() => setSelected(p)}
            layoutId={`project-${p.name}`}
          >
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

      {/* Büyüyen proje detay modalı */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
            style={{
              position: 'fixed', inset: 0, zIndex: 60,
              background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20,
            }}
          >
            <motion.div
              layoutId={`project-${selected.name}`}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="panel-scroll"
              style={{
                background: 'linear-gradient(180deg, #fff 0%, #faf8ff 100%)',
                borderRadius: 20, padding: 0,
                maxWidth: 580, width: '100%',
                maxHeight: '85vh', overflowY: 'auto',
                boxShadow: '0 24px 80px rgba(100,60,180,0.25)',
                border: '1px solid rgba(167,139,250,0.2)',
              }}
            >
              {/* Kapak görseli */}
              {selected.cover && (
                <div style={{
                  width: '100%', height: 200,
                  background: `url(${selected.cover}) center/cover`,
                  borderRadius: '20px 20px 0 0',
                }} />
              )}

              {/* Gradient başlık şeridi (cover yoksa) */}
              {!selected.cover && (
                <div style={{
                  width: '100%', height: 8,
                  background: 'linear-gradient(90deg, #a78bfa, #38bdf8, #f472b6)',
                  borderRadius: '20px 20px 0 0',
                }} />
              )}

              <div style={{ padding: '28px 32px 32px' }}>
                {/* Kapat butonu */}
                <button
                  onClick={() => setSelected(null)}
                  style={{
                    position: 'absolute', top: selected.cover ? 212 : 20, right: 20,
                    width: 36, height: 36, borderRadius: 18,
                    background: 'rgba(58,42,74,0.08)', border: '1px solid rgba(58,42,74,0.12)',
                    color: '#3a2a4a', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 700,
                  }}
                >
                  ✕
                </button>

                {/* Etiketler */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                  {selected.tags.map((t) => (
                    <span key={t} style={tagStyle}>{t}</span>
                  ))}
                </div>

                {/* Başlık */}
                <h2 style={{
                  fontSize: 28, fontWeight: 800, color: '#1c1633',
                  lineHeight: 1.2, marginBottom: 12, letterSpacing: -0.5,
                }}>
                  {selected.name}
                </h2>

                {/* Ayırıcı */}
                <div style={{
                  height: 2, width: 60,
                  background: 'linear-gradient(90deg, #38bdf8, #a78bfa)',
                  borderRadius: 1, marginBottom: 20,
                }} />

                {/* Açıklama */}
                <p style={{
                  fontSize: 15, lineHeight: 1.75, color: 'rgba(58,42,74,0.8)',
                  marginBottom: 20,
                }}>
                  {selected.desc}
                </p>

                {/* Tam içerik (varsa) */}
                {selected.content && (
                  <ProjectContent content={selected.content} />
                )}

                {/* Sayfaya git butonu */}
                {selected.slug && (
                  <a
                    href={`/project/${selected.slug}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      marginTop: 16, padding: '10px 20px', borderRadius: 10,
                      background: 'linear-gradient(135deg, #a78bfa, #38bdf8)',
                      color: '#fff', textDecoration: 'none',
                      fontWeight: 600, fontSize: 14,
                      boxShadow: '0 4px 16px rgba(167,139,250,0.3)',
                    }}
                  >
                    Tam Sayfada Oku <ArrowUpRight size={16} />
                  </a>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function ProjectContent({ content }) {
  try {
    const html = generateHTML(content, [StarterKit, TiptapLink])
    return (
      <div
        className="post-content"
        style={{ fontSize: 14, lineHeight: 1.7 }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  } catch {
    return null
  }
}

function Blog({ data }) {
  const fmtDate = (iso) =>
    new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })

  const handleClick = (p) => {
    if (p.slug) {
      window.location.href = `/${p.kind || 'blog'}/${p.slug}`
    }
  }

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
            cursor: p.slug ? 'pointer' : 'default',
          }}
          whileHover={{ y: -2, borderColor: 'rgba(167,139,250,0.5)' }}
          onClick={() => handleClick(p)}
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
          {p.slug && (
            <div style={{ marginTop: 10, fontSize: 13, fontWeight: 600, color: '#7c3aed' }}>
              Yazıyı Oku →
            </div>
          )}
        </motion.article>
      ))}
    </div>
  )
}

function Contact({ data }) {
  const [showMailPicker, setShowMailPicker] = useState(false)
  const [mailAddress, setMailAddress] = useState('')

  const handleLinkClick = (e, l) => {
    if (l.icon === 'mail' && l.href?.startsWith('mailto:')) {
      e.preventDefault()
      setMailAddress(l.href.replace('mailto:', ''))
      setShowMailPicker(true)
    }
  }

  const mailOptions = [
    {
      name: 'Gmail',
      icon: '📧',
      url: `https://mail.google.com/mail/?view=cm&to=${mailAddress}`,
    },
    {
      name: 'Outlook',
      icon: '📬',
      url: `https://outlook.live.com/mail/0/deeplink/compose?to=${mailAddress}`,
    },
    {
      name: 'Yahoo Mail',
      icon: '📮',
      url: `https://compose.mail.yahoo.com/?to=${mailAddress}`,
    },
  ]

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
              onClick={(e) => handleLinkClick(e, l)}
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

      {/* E-posta sağlayıcı seçim popup'ı */}
      <AnimatePresence>
        {showMailPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowMailPicker(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 50,
              background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 20,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff', borderRadius: 16, padding: 28,
                maxWidth: 340, width: '100%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              }}
            >
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#3a2a4a', marginBottom: 4 }}>
                E-posta Gönder
              </h3>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 18 }}>
                <strong>{mailAddress}</strong> adresine hangi uygulama ile göndermek istersin?
              </p>
              <div style={{ display: 'grid', gap: 8 }}>
                {mailOptions.map((opt) => (
                  <a
                    key={opt.name}
                    href={opt.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setShowMailPicker(false)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 16px', borderRadius: 10,
                      border: '1px solid rgba(167,139,250,0.2)',
                      background: 'rgba(250,248,255,0.8)',
                      textDecoration: 'none', color: '#3a2a4a',
                      fontSize: 14, fontWeight: 500,
                      transition: 'all 0.15s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(124,58,237,0.08)'
                      e.currentTarget.style.borderColor = 'rgba(124,58,237,0.3)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(250,248,255,0.8)'
                      e.currentTarget.style.borderColor = 'rgba(167,139,250,0.2)'
                    }}
                  >
                    <span style={{ fontSize: 22 }}>{opt.icon}</span>
                    {opt.name}
                  </a>
                ))}
              </div>
              <button
                onClick={() => setShowMailPicker(false)}
                style={{
                  marginTop: 14, width: '100%', padding: '10px',
                  borderRadius: 8, border: '1px solid #e0dce8',
                  background: 'transparent', color: '#888',
                  cursor: 'pointer', fontSize: 13,
                }}
              >
                İptal
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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

/* Hook: mobil mi? */
function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  )

  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [breakpoint])

  return mobile
}