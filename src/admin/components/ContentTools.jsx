import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wand2, ImagePlus, Loader2, Pencil, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { serverApi } from '../lib/serverApi.js'
import '../agents.css'
import '../today-content.css'

const TARGETS = [
  { key: 'linkedin', label: 'LinkedIn metni' },
  { key: 'blog', label: 'Blog yazısı' },
  { key: 'both', label: 'İkisi' },
]
const EXAMPLES = ['Daha kısa ve net yaz', 'Girişi somut bir sayıyla başlat', 'Yorum kısmını daha keskin yap', 'Teknik terimleri sadeleştir']

/** PNG'yi tarayıcıda WebP'ye sıkıştırır (en fazla 1600 px genişlik). */
function toWebp(dataUrl, maxWidth = 1600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const w = Math.min(maxWidth, img.naturalWidth)
      const h = Math.round((img.naturalHeight * w) / img.naturalWidth)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Görsel sıkıştırılamadı'))), 'image/webp', quality)
    }
    img.onerror = () => reject(new Error('Görsel okunamadı'))
    img.src = dataUrl
  })
}

/** Günün seçili içeriği: talimatla revize et, konuya özel kapak üret, editörde aç. */
export default function ContentTools({ brief, onChanged }) {
  const [post, setPost] = useState(null)
  const [instruction, setInstruction] = useState('')
  const [target, setTarget] = useState('both')
  const [busy, setBusy] = useState(null) // 'revise' | 'image'
  const [msg, setMsg] = useState(null) // ['ok' | 'err', text]

  useEffect(() => {
    if (!brief.post_id) return setPost(null)
    supabase
      .from('posts')
      .select('id, slug, title, cover, published')
      .eq('id', brief.post_id)
      .maybeSingle()
      .then(({ data }) => setPost(data || null))
  }, [brief.post_id, brief.linkedin_text])

  async function revise() {
    setBusy('revise')
    setMsg(null)
    try {
      const out = await serverApi('/api/content/revise', { method: 'POST', body: { briefId: brief.id, instruction, target } })
      setMsg(['ok', out.blogUpdated ? 'LinkedIn metni ve blog yazısı güncellendi.' : 'LinkedIn metni güncellendi.'])
      setInstruction('')
      await onChanged()
    } catch (e) {
      setMsg(['err', e.message])
    } finally {
      setBusy(null)
    }
  }

  async function makeCover() {
    if (!post) return
    if (!window.confirm('Konuya özel kapak görseli üretilecek (yaklaşık 0,07 $). Devam edilsin mi?')) return
    setBusy('image')
    setMsg(null)
    try {
      const out = await serverApi('/api/content/image', { method: 'POST', body: { briefId: brief.id } })
      const blob = await toWebp(out.image)
      const path = `ai/${post.slug.slice(0, 60)}-${Date.now().toString(36)}.webp`
      const up = await supabase.storage.from('covers').upload(path, blob, { contentType: 'image/webp', cacheControl: '31536000' })
      if (up.error) throw up.error
      const url = supabase.storage.from('covers').getPublicUrl(path).data.publicUrl
      const { error } = await supabase.from('posts').update({ cover: url, cover_position: '50% 50%' }).eq('id', post.id)
      if (error) throw error
      setPost((p) => ({ ...p, cover: url }))
      setMsg(['ok', `Kapak eklendi (${Math.round(blob.size / 1024)} KB).`])
    } catch (e) {
      setMsg(['err', e.message])
    } finally {
      setBusy(null)
    }
  }

  if (!brief.post_id) return null

  return (
    <section className="admin-card ct">
      <div className="card-head">
        <h3>
          <Wand2 size={16} /> Seçili içerik
        </h3>
        <Link to={`/admin/posts/${brief.post_id}`} className="btn btn-secondary btn-sm">
          <Pencil size={14} /> Editörde aç
        </Link>
      </div>

      <div className="ct-grid">
        <div className="ct-revise">
          <label className="li-field">
            <span>Ne değişsin?</span>
            <textarea
              rows={3}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Ör. LinkedIn metnini daha kısa yaz, girişi somut bir sayıyla başlat"
              disabled={busy === 'revise'}
            />
          </label>
          <div className="ct-examples">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" className="ct-chip" onClick={() => setInstruction(ex)}>
                {ex}
              </button>
            ))}
          </div>
          <div className="ct-row">
            <div className="seg" role="radiogroup" aria-label="Neyi revize edelim">
              {TARGETS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="radio"
                  aria-checked={target === t.key}
                  className={target === t.key ? 'on' : ''}
                  onClick={() => setTarget(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-primary btn-sm" disabled={!instruction.trim() || Boolean(busy)} onClick={revise}>
              {busy === 'revise' ? <Loader2 size={14} className="spin" /> : <Wand2 size={14} />} Revize et
            </button>
          </div>
          <p className="muted-line">Revize, kaydedilmiş metin üzerinden çalışır; aşağıdaki kutuda elle yaptığın değişiklikleri önce paylaşmadan revize etme.</p>
        </div>

        <div className="ct-cover">
          <div className={`ct-thumb${post?.cover ? '' : ' is-empty'}`} style={post?.cover ? { backgroundImage: `url(${post.cover})` } : undefined}>
            {!post?.cover && <span>Kapak yok · sitede otomatik desen görünür</span>}
          </div>
          <button type="button" className="btn btn-secondary btn-sm" disabled={!post || Boolean(busy)} onClick={makeCover}>
            {busy === 'image' ? <Loader2 size={14} className="spin" /> : <ImagePlus size={14} />}{' '}
            {post?.cover ? 'Yeni kapak üret' : 'Konuya özel kapak üret'} · ~0,07 $
          </button>
        </div>
      </div>

      {msg && (
        <div className={`alert ${msg[0]}`}>
          {msg[0] === 'ok' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />} {msg[1]}
        </div>
      )}
    </section>
  )
}
