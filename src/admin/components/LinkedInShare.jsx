import { useEffect, useState } from 'react'
import { Loader2, Send, Link2, ExternalLink, Copy, Check, AlertTriangle, CheckCircle2, FileText } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { LinkedinIcon } from '../../site/icons.jsx'

const LIMIT = 3000
const SITE = 'https://berat-emek.com'

/** Sunucu fonksiyonuna admin oturumuyla istek; oturumun süresi dolmuşsa bir kez yenileyip tekrar dener. */
async function api(path, { method = 'GET', body } = {}) {
  const call = async () => {
    const { data } = await supabase.auth.getSession()
    return fetch(`/api/linkedin/${path}`, {
      method,
      headers: { Authorization: `Bearer ${data.session?.access_token || ''}`, ...(body && { 'Content-Type': 'application/json' }) },
      body: body ? JSON.stringify(body) : undefined,
    })
  }
  let res = await call()
  if (res.status === 401) {
    await supabase.auth.refreshSession().catch(() => {})
    res = await call()
  }
  const out = await res.json().catch(() => ({ error: `Sunucu yanıtı okunamadı (${res.status})` }))
  if (res.status === 401) throw new Error('Oturumun süresi dolmuş; panelden çıkış yapıp yeniden giriş yap.')
  if (!res.ok) throw new Error(out.error || `İstek başarısız (${res.status})`)
  return out
}

function CopyBtn({ text, label }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      className="btn btn-secondary"
      onClick={async () => {
        await navigator.clipboard?.writeText(text).catch(() => {})
        setDone(true)
        setTimeout(() => setDone(false), 1600)
      }}
    >
      {done ? <Check size={15} /> : <Copy size={15} />} {done ? 'Kopyalandı' : label}
    </button>
  )
}

/** Günlük özetin LinkedIn metnini düzenleyip tek tıkla paylaşır; varsa blog yazısını yayınlayıp bağlantısını ekler. */
export default function LinkedInShare({ brief, onShared }) {
  const [status, setStatus] = useState(null) // null = yükleniyor
  const [text, setText] = useState(brief.linkedin_text || '')
  const [comment, setComment] = useState('')
  const [article, setArticle] = useState(null)
  const [withArticle, setWithArticle] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const shared = brief.stats?.linkedin

  useEffect(() => {
    setText(brief.linkedin_text || '')
    setComment('')
  }, [brief.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api('status')
      .then(setStatus)
      .catch((e) => setStatus({ error: e.message }))
  }, [])

  // Günün blog taslağı: paylaşırken yayınlanıp gönderiye bağlantı kartı olarak eklenir
  useEffect(() => {
    if (!brief.post_id) return setArticle(null)
    supabase
      .from('posts')
      .select('slug, title, published')
      .eq('id', brief.post_id)
      .maybeSingle()
      .then(({ data }) => setArticle(data ? { ...data, url: `${SITE}/blog/${data.slug}` } : null))
  }, [brief.post_id])

  async function connect() {
    setBusy(true)
    setError(null)
    try {
      const { url } = await api('start', { method: 'POST' })
      window.location.href = url
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  async function share() {
    const note = article && withArticle ? `\n\n"${article.title}" yazısı da sitede yayınlanacak ve bağlantısı gönderiye eklenecek.` : ''
    if (!window.confirm(`Bu metin LinkedIn profilinde herkese açık olarak paylaşılacak.${note}\n\nDevam edilsin mi?`)) return
    setBusy(true)
    setError(null)
    try {
      const out = await api('share', { method: 'POST', body: { text, comment, briefId: brief.id, withArticle } })
      onShared?.({ status: 'paylasildi', stats: { ...(brief.stats || {}), linkedin: { url: out.url, article: out.article, sharedAt: new Date().toISOString() } } })
      if (out.commentOk === false) setError('Gönderi paylaşıldı ama yorum eklenemedi; yorumu elle ekleyebilirsin.')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const daysLeft = status?.expiresAt ? Math.ceil((new Date(status.expiresAt) - Date.now()) / 864e5) : null
  const over = text.length > LIMIT
  const copyValue = article && withArticle ? `${text}\n${article.url}` : text

  return (
    <section className="admin-card li-share">
      <div className="card-head">
        <h3><LinkedinIcon size={16} /> LinkedIn gönderisi</h3>
        <div className="card-actions">
          <CopyBtn text={copyValue} label="Kopyala" />
        </div>
      </div>

      <div className="li-conn">
        {status === null ? (
          <span className="muted-line"><Loader2 size={14} className="spin" /> Bağlantı kontrol ediliyor…</span>
        ) : status.error ? (
          <span className="muted-line">{status.error}</span>
        ) : !status.configured ? (
          <span className="muted-line">
            Otomatik paylaşım henüz kurulmadı (sunucuda {status.missing?.join(', ')} eksik). O zamana kadar "Kopyala" ile
            metni ve yazının bağlantısını alıp LinkedIn'de kendin paylaşabilirsin.
          </span>
        ) : status.tableMissing ? (
          <span className="muted-line">Supabase → SQL Editor'de <code>supabase/linkedin.sql</code> bir kez çalıştırılmalı.</span>
        ) : status.connected ? (
          <span className={`li-badge${daysLeft != null && daysLeft <= 7 ? ' is-warn' : ''}`}>
            <CheckCircle2 size={14} /> {status.name || 'LinkedIn'} bağlı · {daysLeft} gün sonra yeniden bağlanmalı
            {daysLeft != null && daysLeft <= 7 && (
              <button type="button" className="link-btn" onClick={connect} disabled={busy}>Şimdi yenile</button>
            )}
          </span>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={connect} disabled={busy}>
            <Link2 size={15} /> LinkedIn hesabını bağla
          </button>
        )}
      </div>

      <label className="li-field">
        <span>Gönderi metni <em className={over ? 'is-over' : ''}>{text.length}/{LIMIT}</em></span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={12} disabled={Boolean(shared)} />
      </label>

      {article && (
        <label className="li-article">
          <input type="checkbox" checked={withArticle} onChange={(e) => setWithArticle(e.target.checked)} disabled={Boolean(shared)} />
          <FileText size={16} />
          <span>
            <strong>{article.title}</strong>
            <em>{article.published ? 'Yayında' : 'Taslak — paylaşınca yayınlanacak'} · {article.url.replace('https://', '')}</em>
          </span>
        </label>
      )}

      <label className="li-field">
        <span>İlk yorum (isteğe bağlı)</span>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} placeholder="Boş bırakılırsa yorum eklenmez" disabled={Boolean(shared)} />
      </label>

      {error && <div className="alert err"><AlertTriangle size={15} /> {error}</div>}

      <div className="li-actions">
        {shared ? (
          <>
            <span className="li-badge"><CheckCircle2 size={14} /> LinkedIn'de paylaşıldı</span>
            {shared.url && (
              <a className="btn btn-secondary" href={shared.url} target="_blank" rel="noreferrer">
                <ExternalLink size={15} /> Gönderiyi aç
              </a>
            )}
            {shared.article && (
              <a className="btn btn-secondary" href={shared.article} target="_blank" rel="noreferrer">
                <FileText size={15} /> Yazıyı aç
              </a>
            )}
          </>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={share}
            disabled={busy || !status?.connected || !text.trim() || over}
            title={status?.connected ? '' : 'Önce LinkedIn hesabını bağla'}
          >
            {busy ? <Loader2 size={15} className="spin" /> : <Send size={15} />} LinkedIn'de paylaş
          </button>
        )}
      </div>
    </section>
  )
}
