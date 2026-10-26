import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Wand2, ImagePlus, Loader2, Pencil, AlertTriangle, CheckCircle2, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import { serverApi } from '../lib/serverApi.js'
import { saveCover as uploadCover, brandCover, isNoCredit } from '../lib/covers.js'
import '../agents.css'
import '../today-content.css'

const TARGETS = [
  { key: 'linkedin', label: 'LinkedIn metni' },
  { key: 'blog', label: 'Blog yazısı' },
  { key: 'both', label: 'İkisi' },
]
const EXAMPLES = ['Daha kısa ve net yaz', 'Girişi somut bir sayıyla başlat', 'Yorum kısmını daha keskin yap', 'Teknik terimleri sadeleştir']

/** Bir içeriğin araçları: talimatla revize et, konuya özel kapak üret, editörde aç. */
export default function ContentTools({ brief, index, content, onChanged }) {
  const postId = content?.post_id
  const [post, setPost] = useState(null)
  const [instruction, setInstruction] = useState('')
  const [target, setTarget] = useState('both')
  const [busy, setBusy] = useState(null) // 'revise' | 'image' | 'brand'
  const [msg, setMsg] = useState(null) // ['ok' | 'err', text]
  const canReviseBlog = Boolean(content?.blocks?.length)

  useEffect(() => {
    setMsg(null)
    setInstruction('')
    setTarget(canReviseBlog ? 'both' : 'linkedin')
  }, [index]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!postId) return setPost(null)
    supabase
      .from('posts')
      .select('id, slug, title, cover, published')
      .eq('id', postId)
      .maybeSingle()
      .then(({ data }) => setPost(data || null))
  }, [postId, content?.linkedin])

  async function revise() {
    setBusy('revise')
    setMsg(null)
    try {
      const out = await serverApi('/api/content/revise', { method: 'POST', body: { briefId: brief.id, index, instruction, target } })
      setMsg(['ok', out.blogUpdated ? 'LinkedIn metni ve blog yazısı güncellendi.' : 'LinkedIn metni güncellendi.'])
      setInstruction('')
      await onChanged()
    } catch (e) {
      setMsg(['err', e.message])
    } finally {
      setBusy(null)
    }
  }

  /** Görseli kapak yapar ve karttaki önizlemeyi günceller. */
  async function saveCover(dataUrl, folder) {
    const { url, info } = await uploadCover(post, dataUrl, folder)
    setPost((p) => ({ ...p, cover: url }))
    return info
  }

  async function makeCover() {
    if (!post) return
    if (!window.confirm('Konuya özel kapak görseli üretilecek (yaklaşık 0,07 $). Devam edilsin mi?')) return
    setBusy('image')
    setMsg(null)
    try {
      const out = await serverApi('/api/content/image', { method: 'POST', body: { briefId: brief.id, index } })
      setMsg(['ok', `Kapak eklendi (${await saveCover(out.image, 'ai')}).`])
    } catch (e) {
      setMsg(['err', isNoCredit(e.message) ? 'OpenRouter, yapay zeka görseli için hesapta en az 1 $ bakiye istiyor. Bakiye yükleyene kadar "Markalı kapak" ücretsiz çalışır.' : e.message])
    } finally {
      setBusy(null)
    }
  }

  // Ücretsiz markalı kapak: başlık, ağ küresi ve imza tarayıcıda çizilir (yapay zeka ve bakiye gerekmez)
  async function makeBrandCover() {
    if (!post) return
    setBusy('brand')
    setMsg(null)
    try {
      const { url, info } = await brandCover(post)
      setPost((p) => ({ ...p, cover: url }))
      setMsg(['ok', `Markalı kapak eklendi (${info}).`])
    } catch (e) {
      setMsg(['err', e.message])
    } finally {
      setBusy(null)
    }
  }

  if (!postId) return null

  return (
    <section className="admin-card ct">
      <div className="card-head">
        <h3>
          <Wand2 size={16} /> {post?.title || content?.title || 'İçerik'}
        </h3>
        <Link to={`/admin/posts/${postId}`} className="btn btn-secondary btn-sm">
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
              {TARGETS.map((t) => {
                const off = t.key !== 'linkedin' && !canReviseBlog
                return (
                  <button
                    key={t.key}
                    type="button"
                    role="radio"
                    aria-checked={target === t.key}
                    className={target === t.key ? 'on' : ''}
                    disabled={off}
                    title={off ? 'Bu yazının blog hâli editörden düzenlenir' : ''}
                    onClick={() => setTarget(t.key)}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
            <button type="button" className="btn btn-primary btn-sm" disabled={!instruction.trim() || Boolean(busy)} onClick={revise}>
              {busy === 'revise' ? <Loader2 size={14} className="spin" /> : <Wand2 size={14} />} Revize et
            </button>
          </div>
          <p className="muted-line">Revize, kaydedilmiş metin üzerinden çalışır; aşağıdaki kutuda elle yaptığın değişiklikler revizede kaybolur.</p>
        </div>

        <div className="ct-cover">
          <div className={`ct-thumb${post?.cover ? '' : ' is-empty'}`} style={post?.cover ? { backgroundImage: `url(${post.cover})` } : undefined}>
            {!post?.cover && <span>Kapak yok · sitede otomatik desen görünür</span>}
          </div>
          <button type="button" className="btn btn-secondary btn-sm" disabled={!post || Boolean(busy)} onClick={makeBrandCover} title="Başlık, ağ küresi ve imzayla sitenin renklerinde kapak; yapay zeka kullanmaz">
            {busy === 'brand' ? <Loader2 size={14} className="spin" /> : <ImageIcon size={14} />} Markalı kapak · ücretsiz
          </button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={!post || Boolean(busy)} onClick={makeCover}>
            {busy === 'image' ? <Loader2 size={14} className="spin" /> : <ImagePlus size={14} />}{' '}
            {post?.cover ? 'Yeni yapay zeka kapağı' : 'Konuya özel kapak üret'} · ~0,07 $
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
