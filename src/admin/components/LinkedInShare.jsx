import { useEffect, useState } from 'react'
import { Loader2, Send, Link2, ExternalLink, Copy, Check, AlertTriangle, CheckCircle2, FileText, Download, Undo2 } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { serverApi } from '../lib/serverApi.js'
import { LinkedinIcon } from '../../site/icons.jsx'

const LIMIT = 3000
const SITE = 'https://berat-emek.com'

/** LinkedIn için kapağın JPEG kopyası (varsa); yoksa kapağın kendisi. */
async function shareableCover(cover) {
  if (!cover) return null
  const base = cover.split('?')[0]
  if (!/\.webp$/i.test(base)) return cover
  const jpg = base.replace(/\.webp$/i, '.jpg')
  const ok = await fetch(jpg, { method: 'HEAD' }).then((r) => r.ok).catch(() => false)
  return ok ? jpg : cover
}

function CopyBtn({ text, label }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className="btn btn-secondary btn-sm"
      onClick={async () => {
        await navigator.clipboard?.writeText(text).catch(() => {})
        setDone(true)
        setTimeout(() => setDone(false), 1600)
      }}
    >
      {done ? <Check size={14} /> : <Copy size={14} />} {done ? 'Kopyalandı' : label}
    </button>
  )
}

/**
 * Bir içeriğin LinkedIn gönderisi: metni düzenle, tek tıkla paylaş ya da kopyalayıp görseli indir.
 * index: içeriğin günlük özetteki konu sırası (-1 = eski biçimde günün tek içeriği).
 */
export default function LinkedInShare({ brief, index, content, onChanged }) {
  const [status, setStatus] = useState(null) // null = yükleniyor
  const [text, setText] = useState(content?.linkedin || '')
  const [comment, setComment] = useState('')
  const [article, setArticle] = useState(null)
  const [withArticle, setWithArticle] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const shared = content?.shared || (index < 0 && brief.stats?.linkedin) || null

  useEffect(() => {
    setText(content?.linkedin || '')
    setComment('')
    setError(null)
  }, [index, content?.linkedin])

  useEffect(() => {
    serverApi('/api/linkedin/status')
      .then(setStatus)
      .catch((e) => setStatus({ error: e.message }))
  }, [])

  // İçeriğin blog yazısı: paylaşırken yayınlanıp gönderiye bağlantı kartı (görselli) olarak eklenir
  useEffect(() => {
    if (!content?.post_id) return setArticle(null)
    supabase
      .from('posts')
      .select('slug, title, published, cover')
      .eq('id', content.post_id)
      .maybeSingle()
      .then(({ data }) => setArticle(data ? { ...data, url: `${SITE}/blog/${data.slug}` } : null))
  }, [content?.post_id])

  async function connect() {
    setBusy(true)
    setError(null)
    try {
      const { url } = await serverApi('/api/linkedin/start', { method: 'POST' })
      window.location.href = url
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  async function share() {
    const note = article && withArticle ? `\n\n"${article.title}" yazısı sitede yayınlanacak; bağlantısı kapak görseliyle birlikte kart olarak eklenecek.` : ''
    if (!window.confirm(`Bu metin LinkedIn profilinde herkese açık olarak paylaşılacak.${note}\n\nDevam edilsin mi?`)) return
    setBusy(true)
    setError(null)
    try {
      const out = await serverApi('/api/linkedin/share', {
        method: 'POST',
        body: { text, comment, briefId: brief.id, index: index >= 0 ? index : undefined, withArticle },
      })
      await onChanged()
      if (out.commentOk === false) setError('Gönderi paylaşıldı ama yorum eklenemedi; yorumu elle ekleyebilirsin.')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  /** Elle paylaştıysan işaretle: gündem editörü bu konuyu artık "paylaşıldı" sayar. */
  async function markShared(on) {
    setBusy(true)
    setError(null)
    try {
      const topics = (brief.topics || []).map((t) => ({ ...t, content: t.content ? { ...t.content } : t.content }))
      if (index >= 0 && topics[index]?.content) {
        topics[index].content.shared = on ? { manual: true, at: new Date().toISOString() } : null
      }
      const anyShared = topics.some((t) => t.content?.shared) || (index < 0 && on)
      const { error: e } = await supabase
        .from('daily_briefs')
        .update({ topics, status: anyShared ? 'paylasildi' : 'bekliyor' })
        .eq('id', brief.id)
      if (e) throw e
      await onChanged()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  async function downloadCover() {
    if (!article?.cover) return
    try {
      const url = await shareableCover(article.cover)
      const blob = await (await fetch(url)).blob()
      const ext = /jpe?g/.test(blob.type) ? 'jpg' : blob.type.split('/')[1] || 'png'
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${article.slug}.${ext}` })
      a.click()
      setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    } catch {
      setError('Görsel indirilemedi.')
    }
  }

  const daysLeft = status?.expiresAt ? Math.ceil((new Date(status.expiresAt) - Date.now()) / 864e5) : null
  const over = text.length > LIMIT
  const copyValue = article && withArticle ? `${text}\n${article.url}` : text

  return (
    <section className="admin-card li-share">
      <div className="card-head">
        <h3>
          <LinkedinIcon size={16} /> LinkedIn gönderisi
        </h3>
        <div className="card-actions">
          {article?.cover && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={downloadCover} title="Elle paylaşırken gönderiye eklemek için">
              <Download size={14} /> Görseli indir
            </button>
          )}
          <CopyBtn text={copyValue} label="Metni kopyala" />
        </div>
      </div>

      <div className="li-conn">
        {status === null ? (
          <span className="muted-line">
            <Loader2 size={14} className="spin" /> Bağlantı kontrol ediliyor…
          </span>
        ) : status.error ? (
          <span className="muted-line">{status.error}</span>
        ) : !status.configured ? (
          <span className="muted-line">
            Tek tuşla paylaşım henüz kurulmadı (sunucuda {status.missing?.join(', ')} eksik). O zamana kadar metni kopyalayıp
            LinkedIn'e yapıştır: yazının bağlantısı metnin sonunda, LinkedIn kapak görselini bağlantı kartında kendisi gösterir.
          </span>
        ) : status.tableMissing ? (
          <span className="muted-line">
            Supabase → SQL Editor'de <code>supabase/linkedin.sql</code> bir kez çalıştırılmalı.
          </span>
        ) : status.connected ? (
          <span className={`li-badge${daysLeft != null && daysLeft <= 7 ? ' is-warn' : ''}`}>
            <CheckCircle2 size={14} /> {status.name || 'LinkedIn'} bağlı · {daysLeft} gün sonra yeniden bağlanmalı
            {daysLeft != null && daysLeft <= 7 && (
              <button type="button" className="link-btn" onClick={connect} disabled={busy}>
                Şimdi yenile
              </button>
            )}
          </span>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={connect} disabled={busy}>
            <Link2 size={15} /> LinkedIn hesabını bağla
          </button>
        )}
      </div>

      <label className="li-field">
        <span>
          Gönderi metni <em className={over ? 'is-over' : ''}>{text.length}/{LIMIT}</em>
        </span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} disabled={Boolean(shared)} />
      </label>

      {article && (
        <label className="li-article">
          <input type="checkbox" checked={withArticle} onChange={(e) => setWithArticle(e.target.checked)} disabled={Boolean(shared)} />
          {article.cover ? <span className="li-article-thumb" style={{ backgroundImage: `url(${article.cover})` }} /> : <FileText size={16} />}
          <span>
            <strong>{article.title}</strong>
            <em>
              {article.published ? 'Yayında' : 'Taslak — paylaşınca yayınlanacak'} · kapak görseliyle bağlantı kartı ·{' '}
              {article.url.replace('https://', '')}
            </em>
          </span>
        </label>
      )}

      <label className="li-field">
        <span>İlk yorum (isteğe bağlı)</span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          placeholder="Boş bırakılırsa yorum eklenmez"
          disabled={Boolean(shared)}
        />
      </label>

      {error && (
        <div className="alert err">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      <div className="li-actions">
        {shared ? (
          <>
            <span className="li-badge">
              <CheckCircle2 size={14} /> {shared.manual ? 'Paylaştım olarak işaretlendi' : "LinkedIn'de paylaşıldı"}
            </span>
            {shared.url && (
              <a className="btn btn-secondary" href={shared.url} target="_blank" rel="noreferrer">
                <ExternalLink size={15} /> Gönderiyi aç
              </a>
            )}
            {shared.manual && (
              <button type="button" className="link-btn" onClick={() => markShared(false)} disabled={busy}>
                <Undo2 size={13} /> Geri al
              </button>
            )}
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-primary"
              onClick={share}
              disabled={busy || !status?.connected || !text.trim() || over}
              title={status?.connected ? '' : 'Önce LinkedIn hesabını bağla'}
            >
              {busy ? <Loader2 size={15} className="spin" /> : <Send size={15} />} LinkedIn'de paylaş
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => markShared(true)} disabled={busy} title="Elle paylaştıysan işaretle">
              <Check size={15} /> Paylaştım
            </button>
          </>
        )}
      </div>
    </section>
  )
}
