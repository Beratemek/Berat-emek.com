import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  ArrowRight, ArrowUpRight, ArrowDown, Copy, Check, Globe, Gamepad2, Factory, ShieldCheck,
} from 'lucide-react'
import Layout from '../site/Layout.jsx'
import NeuralHero from '../site/NeuralHero.jsx'
import Reveal from '../site/Reveal.jsx'
import GenCover from '../site/GenCover.jsx'
import Rail from '../site/Rail.jsx'
import CountUp from '../site/CountUp.jsx'
import { PostCard, FeaturedPost, PostListSkeleton } from '../site/PostList.jsx'
import { iconMap, LinkedinIcon } from '../site/icons.jsx'
import { coverWord, postPath } from '../site/format.js'
import { usePortfolioContent } from '../hooks/usePortfolioContent.js'
import { useI18n } from '../i18n/I18nProvider.jsx'
import { content as fallback } from '../data/portfolio.js'
import { SITE } from '../data/site.js'

const CAPABILITY_ICONS = [Gamepad2, Factory, ShieldCheck] // mobil oyun, Morf, gizlilik geçidi
const PROJECTS_PREVIEW = 6 // ana sayfada ilk 6 proje; gerisi butonla açılır
const PINNED_PROJECT = 'morf' // şu an çalıştığım şirketin projesi, tarihinden bağımsız hep başta
const pinFirst = (list) => [...list].sort((a, b) => (b.slug === PINNED_PROJECT) - (a.slug === PINNED_PROJECT))

/** Giriş metnini ilk cümle ve devamı olarak böler; telefonda yalnızca ilk cümle görünür. */
function splitLead(text) {
  const m = String(text).match(/^(.+?[.!?。！？])\s*([\s\S]+)$/)
  return m ? [m[1], m[2]] : [text, '']
}

/** Başlığı kelime kelime canlandırır; vurgulu kısmı gradyanla gösterir. */
function AnimatedHeadline({ text, accent }) {
  const i = accent ? text.indexOf(accent) : -1
  const parts = i < 0 ? [{ text }] : [{ text: text.slice(0, i) }, { text: accent, em: true }, { text: text.slice(i + accent.length) }]
  let n = 0
  return (
    <h1>
      {parts.map((part, pi) => {
        const words = part.text.split(/(\s+)/).filter(Boolean).map((w, wi) =>
          /^\s+$/.test(w) ? ' ' : (
            <span key={wi} className="word" style={{ '--i': n++ }}>{w}</span>
          )
        )
        return part.em ? <em key={pi}>{words}</em> : <span key={pi}>{words}</span>
      })}
    </h1>
  )
}

/** Bölüm başlığı: vurgulu kısım italik ve renkli. */
function Accent({ text, accent }) {
  const i = accent ? text.indexOf(accent) : -1
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <em>{accent}</em>
      {text.slice(i + accent.length)}
    </>
  )
}

function spotlight(e) {
  const r = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
}

function tilt(e) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  const x = (e.clientX - r.left) / r.width
  const y = (e.clientY - r.top) / r.height
  el.style.setProperty('--rx', `${((0.5 - y) * 7).toFixed(2)}deg`)
  el.style.setProperty('--ry', `${((x - 0.5) * 9).toFixed(2)}deg`)
}
function untilt(e) {
  e.currentTarget.style.setProperty('--rx', '0deg')
  e.currentTarget.style.setProperty('--ry', '0deg')
}

export default function HomePage() {
  const { t, lang, locale } = useI18n()
  const { profile, blogPosts, projectPosts, contact, loading } = usePortfolioContent()
  const [aboutOpen, setAboutOpen] = useState(false)
  const [leadFirst, leadRest] = splitLead(t('hero.intro'))

  // Hakkımda metni admin panelinden Türkçe girilir; diğer dillerde çevirisi gösterilir
  const about =
    lang === 'tr'
      ? { body: profile?.body || t('about.body'), highlights: profile?.highlights?.length ? profile.highlights : t('about.highlights') }
      : { body: t('about.body'), highlights: t('about.highlights') }
  // Başlık her zaman sitenin kimliği; admin panelindeki eski "kicker" metni kullanılmaz
  const aboutTitle = t('hero.role')

  const projects = projectPosts.length
    ? pinFirst(projectPosts).map((p) => ({
        title: p.title, desc: p.excerpt, tags: p.tags || [], href: postPath(p),
        cover: p.cover, coverPosition: p.cover_position, seed: p.slug, word: coverWord(p),
      }))
    : loading
      ? []
      : fallback.projects.items.map((p) => ({ title: p.name, desc: p.desc, tags: p.tags, url: p.url, seed: p.name, word: p.tags[0] }))
  const [showAllProjects, setShowAllProjects] = useState(false)

  const links = contact.length ? contact : loading ? [] : fallback.contact.links
  const linkedin = links.find((l) => l.icon === 'linkedin' || /linkedin\.com/.test(l.href || ''))

  const [featured, ...restPosts] = blogPosts

  // Uzun paragraflar yerine bir bakışta okunan rakamlar
  const stats = [
    { value: loading ? null : projects.length, label: t('stats.projects') },
    { value: loading || !blogPosts.length ? null : blogPosts.length, label: t('stats.posts') },
    { value: 0.903, decimals: 3, label: t('stats.datathon') },
    { value: 6, format: (n) => t('stats.rank', { n }), label: t('stats.hackathon') },
  ]

  return (
    <Layout overlay>
      <Helmet>
        <title>{`${SITE.name} — ${t('hero.role')}`}</title>
        <meta name="description" content={`${t('hero.headline')} ${t('hero.intro')}`} />
        <link rel="canonical" href={`${SITE.url}/`} />
      </Helmet>

      {/* ---------------- Giriş ---------------- */}
      <section className="hero tone">
        <NeuralHero />
        <div className="wrap">
          <div className="hero-content">
            {featured ? (
              <Link to={postPath(featured)} className="hero-pill fade-in" style={{ '--i': 0 }}>
                <span className="dot" aria-hidden />
                <span className="hero-pill-label">{t('hero.latest')}</span>
                <span className="hero-pill-title">{featured.title}</span>
                <ArrowRight size={14} />
              </Link>
            ) : (
              <span className="hero-pill-space" />
            )}
            <p className="kicker fade-in" style={{ '--i': 1 }}>{t('hero.role')}</p>
            <AnimatedHeadline text={t('hero.headline')} accent={t('hero.accent')} />
            <p className="hero-lead fade-in" style={{ '--i': 6 }}>
              {leadFirst}
              {leadRest && <span className="lead-rest">{/[。！？]$/.test(leadFirst) ? '' : ' '}{leadRest}</span>}
            </p>
            <div className="hero-actions fade-in" style={{ '--i': 8 }}>
              <Link to="/blog" className="s-btn accent">
                {t('hero.ctaPosts')} <ArrowRight size={17} />
              </Link>
              {linkedin && (
                <a href={linkedin.href} target="_blank" rel="noreferrer" className="s-btn ghost" aria-label={t('hero.ctaLinkedin')}>
                  <LinkedinIcon size={16} />
                  <span className="lbl-long">{t('hero.ctaLinkedin')}</span>
                  <span className="lbl-short">LinkedIn</span>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="hero-foot fade-in" style={{ '--i': 10 }}>
          <div className="wrap hero-foot-inner">
            <span />
            <a href="#yetkinlikler" className="scroll-hint">
              {t('hero.scroll')} <ArrowDown size={14} />
            </a>
          </div>
        </div>
      </section>

      {/* ---------------- Rakamlar ---------------- */}
      <section className="stats-band" aria-label={t('stats.label')}>
        <div className="wrap stats">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 90} className="stat">
              <span className="stat-num">
                <CountUp value={s.value} decimals={s.decimals} locale={locale} format={s.format} />
              </span>
              <span className="stat-label">{s.label}</span>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ---------------- Neler yapıyorum ---------------- */}
      <section className="section" id="yetkinlikler">
        <div className="wrap">
          <Reveal className="section-head">
            <div>
              <p className="kicker">{t('caps.kicker')}</p>
              <h2><Accent text={t('caps.title')} accent={t('caps.accent')} /></h2>
            </div>
          </Reveal>
          <Rail className="capabilities" label={t('caps.title')}>
            {t('caps.items').map((c, i) => {
              const Icon = CAPABILITY_ICONS[i] ?? Factory
              return (
                <Reveal as="article" key={c.title} delay={i * 120} className="capability" onMouseMove={spotlight}>
                  <div className="capability-top">
                    <span className="capability-icon"><Icon size={20} /></span>
                    <span className="capability-status"><i aria-hidden /> {t('caps.status')}</span>
                  </div>
                  <h3>{c.title}</h3>
                  <p>{c.text}</p>
                </Reveal>
              )
            })}
          </Rail>
        </div>
      </section>

      {/* ---------------- Yazılar ---------------- */}
      <section className="section" id="yazilar">
        <div className="wrap">
          <Reveal className="section-head">
            <div>
              <p className="kicker">{t('posts.kicker')}</p>
              <h2>{t('posts.title')}</h2>
            </div>
            {blogPosts.length > 0 && (
              <Link to="/blog" className="more-link">
                {t('posts.all')} <ArrowRight size={15} />
              </Link>
            )}
          </Reveal>
          {loading ? (
            <PostListSkeleton />
          ) : featured ? (
            <>
              <Reveal><FeaturedPost post={featured} /></Reveal>
              {restPosts.length > 0 && (
                <Rail className="post-cards" label={t('posts.title')}>
                  {restPosts.slice(0, 3).map((p, i) => (
                    <Reveal key={p.id || p.slug} delay={i * 100}>
                      <PostCard post={p} />
                    </Reveal>
                  ))}
                </Rail>
              )}
            </>
          ) : (
            <p className="empty">{t('posts.empty')}</p>
          )}
        </div>
      </section>

      {/* ---------------- Projeler ---------------- */}
      <section className="section band" id="projeler">
        <div className="wrap">
          <Reveal className="section-head">
            <div>
              <p className="kicker">{t('projects.kicker')}</p>
              <h2>{t('projects.title')}</h2>
            </div>
          </Reveal>
          {/* Telefonda tüm projeler yana kaydırılır; bilgisayarda ilk 6'sı görünür, gerisi butonla açılır */}
          <Rail className="project-grid" label={t('projects.title')}>
            {projects.map((p, i) => {
              const body = (
                <>
                  {p.cover ? (
                    <div className="project-cover" style={{ backgroundImage: `url(${p.cover})`, backgroundPosition: p.coverPosition || 'center' }} />
                  ) : (
                    <GenCover className="project-cover" seed={p.seed || p.title} word={p.word} topic={`${p.title} ${(p.tags || []).join(" ")}`} />
                  )}
                  <div className="project-body">
                    <h3>
                      {p.title}
                      {(p.href || p.url) && <ArrowUpRight size={18} />}
                    </h3>
                    {p.desc && <p>{p.desc}</p>}
                  </div>
                </>
              )
              return (
                <Reveal key={p.title} delay={(i % 2) * 120} className={i >= PROJECTS_PREVIEW && !showAllProjects ? 'is-extra' : ''}>
                  {p.href ? (
                    <Link to={p.href} className="project-card" onMouseMove={tilt} onMouseLeave={untilt}>{body}</Link>
                  ) : p.url ? (
                    <a href={p.url} target="_blank" rel="noreferrer" className="project-card" onMouseMove={tilt} onMouseLeave={untilt}>{body}</a>
                  ) : (
                    <article className="project-card" onMouseMove={tilt} onMouseLeave={untilt}>{body}</article>
                  )}
                </Reveal>
              )
            })}
          </Rail>
          {projects.length > PROJECTS_PREVIEW && (
            <div className="more-projects">
              <button type="button" className="s-btn ghost" onClick={() => setShowAllProjects((v) => !v)}>
                {showAllProjects ? t('projects.showLess') : t('projects.showAll', { n: projects.length })}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ---------------- Hakkımda ---------------- */}
      <section className="section" id="hakkimda">
        <div className="wrap about-grid">
          <Reveal>
            <p className="kicker">{t('about.kicker')}</p>
            <h2 className="about-title">{aboutTitle}</h2>
            <div className="about-id">
              <img className="about-photo" src="/berat.jpg" alt={SITE.name} width="240" height="240" loading="lazy" decoding="async" />
              <div>
                <strong>{SITE.name}</strong>
                <span>VizioWise AI</span>
              </div>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <p className={`about-text${aboutOpen ? '' : ' clamp-sm'}`}>{about.body}</p>
            {!aboutOpen && (
              <button type="button" className="read-toggle" onClick={() => setAboutOpen(true)}>
                {t('ui.readMore')} <ArrowDown size={14} />
              </button>
            )}
            <ul className="highlights">
              {about.highlights.map((h, i) => (
                <li key={h}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  {h}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* ---------------- İletişim ---------------- */}
      <section className="section tone grain contact" id="iletisim">
        <div className="wrap contact-grid">
          <Reveal>
            <p className="kicker">{t('contact.kicker')}</p>
            <h2 className="contact-title"><Accent text={t('contact.title')} accent={t('contact.accent')} /></h2>
            <p className="contact-text">{t('contact.text')}</p>
          </Reveal>
          <Reveal as="ul" className="contact-links" delay={120}>
            {links.map((l, i) => (
              <ContactRow key={`${l.label}-${i}`} link={l} />
            ))}
          </Reveal>
        </div>
      </section>
    </Layout>
  )
}

function ContactRow({ link }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const Icon = iconMap[link.icon] ?? Globe
  const isMail = link.href?.startsWith('mailto:')
  const external = link.href && !isMail

  async function copy() {
    try {
      await navigator.clipboard.writeText(link.href.replace('mailto:', ''))
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Pano erişimi yoksa sessizce geç
    }
  }

  return (
    <li>
      <a href={link.href || '#'} {...(external && { target: '_blank', rel: 'noreferrer' })}>
        <span className="contact-icon"><Icon size={17} /></span>
        <span style={{ minWidth: 0 }}>
          <span className="contact-label">{link.label}</span>
          <span className="contact-value">{link.value}</span>
        </span>
        {!isMail && <ArrowUpRight size={18} className="contact-arrow" />}
      </a>
      {isMail && (
        <button type="button" className="copy-btn" onClick={copy} aria-label={t('ui.copyEmail')} data-track="contact:email-copy">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span className="copy-label">{copied ? t('ui.copied') : t('ui.copy')}</span>
        </button>
      )}
    </li>
  )
}
