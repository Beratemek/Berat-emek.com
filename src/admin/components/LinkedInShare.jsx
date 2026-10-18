import { useEffect, useState } from 'react'
import { Loader2, Send, Link2, ExternalLink, Copy, Check, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { LinkedinIcon } from '../../site/icons.jsx'

const LIMIT = 3000

async function api(path, { method = 'GET', body } = {}) {
  const { data } = await supabase.auth.getSession()
  const res = await fetch(`/api/linkedin/${path}`, {
    method,
    headers: { Authorization: `Bearer ${data.session?.access_token || ''}`, ...(body && { 'Content-Type': 'application/json' }) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const out = await res.json().catch(() => ({ error: `Sunucu yanıtı okunamadı (${res.status})` }))
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

/** Günlük özetin LinkedIn metnini düzenleyip tek tıkla profilde paylaşır. */
export default function LinkedInShare({ brief, onShared }) {
  const [status, setStatus] = useState(null) // null = yükleniyor
  const [text, setText] = useState(brief.linkedin_text || '')
  const [comment, setComment] = useState(brief.linkedin_comment || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const shared = brief.stats?.linkedin

  useEffect(() => {
    setText(brief.linkedin_text || '')
    setComment(brief.linkedin_comment || '')
  }, [brief.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    api('status')
      .then(setStatus)
      .catch((e) => setStatus({ error: e.message }))
  }, [])

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
    if (!window.confirm('Bu metin LinkedIn profilinde herkese açık olarak paylaşılacak. Devam edilsin mi?')) return
    setBusy(true)
    setError(null)
    try {
      const out = await api('share', { method: 'POST', body: { text, comment, briefId: brief.id } })
      onShared?.({ status: 'paylasildi', stats: { ...(brief.stats || {}), linkedin: { url: out.url, sharedAt: new Date().toISOString() } } })
      if (out.commentOk === false) setError('Gönderi paylaşıldı ama kaynak yorumu eklenemedi; yorumu elle ekleyebilirsin.')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const daysLeft = status?.expiresAt ? Math.ceil((new Date(status.expiresAt) - Date.now()) / 864e5) : null
  const over = text.length > LIMIT

  return (
    <section className="admin-card li-share">
      <div className="card-head">
        <h3><LinkedinIcon size={16} /> LinkedIn gönderisi</h3>
        <div className="card-actions">
          <CopyBtn text={text} label="Kopyala" />
        </div>
      </div>

      <div className="li-conn">
        {status === null ? (
          <span className="muted-line"><Loader2 size={14} className="spin" /> Bağlantı kontrol ediliyor…</span>
        ) : status.error ? (
          <span className="muted-line">LinkedIn bağlantısı kontrol edilemedi: {status.error}</span>
        ) : !status.configured ? (
          <span className="muted-line">
            Otomatik paylaşım henüz kurulmadı (sunucuda {status.missing?.join(', ')} eksik). O zamana kadar metni kopyalayıp
            LinkedIn'de kendin paylaşabilirsin.
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
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={14} disabled={Boolean(shared)} />
      </label>
      <label className="li-field">
        <span>İlk yorum (kaynaklar)</span>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} disabled={Boolean(shared)} />
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
        <CopyBtn text={comment} label="Yorumu kopyala" />
      </div>
    </section>
  )
}
