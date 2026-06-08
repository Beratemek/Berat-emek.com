import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapLink from '@tiptap/extension-link'
import TiptapImage from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import {
  ArrowLeft,
  Save,
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Link as LinkIcon,
  Loader2,
  ImagePlus,
} from 'lucide-react'

import { supabase } from '../../lib/supabase.js'
import InfoBox from '../InfoBox.jsx'
import ImageUpload from '../components/ImageUpload.jsx'

function slugify(s) {
  return (s || '')
    .toLowerCase()
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80)
}

export default function PostEditor() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const isNew = !id

  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  const [form, setForm] = useState({
    kind: searchParams.get('kind') || 'blog',
    title: '',
    slug: '',
    excerpt: '',
    tags: '',
    cover: '',
    cover_position: '50% 50%',
    project_url: '',
    published: false,
  })
  const [imgUploading, setImgUploading] = useState(false)
  const imgInputRef = useRef(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapLink.configure({ openOnClick: false, HTMLAttributes: { class: 'tiptap-link' } }),
      TiptapImage.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: 'Buraya yazmaya başla…' }),
    ],
    content: '',
  })

  // Mevcut post'u yükle
  useEffect(() => {
    if (isNew || !editor) return
    let cancel = false
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase.from('posts').select('*').eq('id', id).single()
      if (cancel) return
      if (error) {
        setErr(error.message)
      } else if (data) {
        setForm({
          kind: data.kind,
          title: data.title || '',
          slug: data.slug || '',
          excerpt: data.excerpt || '',
          tags: (data.tags || []).join(', '),
          cover: data.cover || '',
          cover_position: data.cover_position || '50% 50%',
          project_url: data.project_url || '',
          published: !!data.published,
        })
        // Supabase JSONB bazen string olarak döner — parse et
        let editorContent = data.content ?? ''
        if (typeof editorContent === 'string' && editorContent.trim()) {
          try {
            editorContent = JSON.parse(editorContent)
          } catch {
            // Parse edilemiyorsa olduğu gibi bırak (düz HTML/metin)
          }
        }
        editor.commands.setContent(editorContent)
      }
      setLoading(false)
    })()
    return () => { cancel = true }
  }, [id, editor])

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    setErr(null)
    setSaving(true)
    const payload = {
      kind: form.kind,
      title: form.title,
      slug: form.slug || slugify(form.title),
      excerpt: form.excerpt,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      cover: form.cover || null,
      cover_position: form.cover_position || '50% 50%',
      project_url: form.project_url?.trim() || null,
      published: form.published,
      content: editor?.getJSON() ?? null,
    }

    // cover_position kolonu henüz oluşturulmadıysa (schema.sql migration'ı Supabase'de
    // çalıştırılmadıysa) kayıt patlamasın — kolonsuz tekrar dene.
    const save = async (body) =>
      isNew
        ? supabase.from('posts').insert(body).select().single()
        : supabase.from('posts').update(body).eq('id', id)

    try {
      let res = await save(payload)
      if (res.error && /cover_position/.test(res.error.message || '')) {
        console.warn(
          "[PostEditor] 'cover_position' kolonu bulunamadı — supabase/schema.sql'i Supabase " +
            'SQL Editor\'de çalıştır. Kayıt, konum bilgisi olmadan tamamlandı.'
        )
        const { cover_position, ...fallback } = payload
        res = await save(fallback)
      }
      if (res.error) throw res.error
      if (isNew) navigate(`/admin/posts/${res.data.id}`, { replace: true })
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  function addLink() {
    const prev = editor.getAttributes('link').href || ''
    const url = prompt('Link URL', prev)
    if (url === null) return
    if (url === '') editor.chain().focus().unsetLink().run()
    else editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  async function handleInlineImage(file) {
    if (!file || !editor) return
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/avif']
    if (!allowed.includes(file.type)) return
    if (file.size > 5 * 1024 * 1024) { setErr('Resim 5 MB\'den küçük olmalı.'); return }

    setImgUploading(true)
    try {
      const ext = file.name.split('.').pop().toLowerCase()
      const rand = Math.random().toString(36).slice(2, 10)
      const path = `${form.kind}/inline/${Date.now()}-${rand}.${ext}`

      const { error: upErr } = await supabase.storage
        .from('covers')
        .upload(path, file, { cacheControl: '3600', upsert: false })
      if (upErr) throw upErr

      const { data } = supabase.storage.from('covers').getPublicUrl(path)
      editor.chain().focus().setImage({ src: data.publicUrl }).run()
    } catch (e) {
      setErr(e.message || 'Resim yüklenemedi')
    } finally {
      setImgUploading(false)
      if (imgInputRef.current) imgInputRef.current.value = ''
    }
  }

  if (loading) {
    return <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
  }

  return (
    <div>
      <Link to="/admin/posts" className="btn btn-secondary" style={{ marginBottom: 20 }}>
        <ArrowLeft size={14} /> Geri
      </Link>

      <div className="page-kicker">{isNew ? 'Yeni içerik' : 'İçerik düzenle'}</div>
      <h1>{form.title || (form.kind === 'blog' ? 'Yeni Blog Yazısı' : 'Yeni Proje')}</h1>

      <InfoBox>
        <b>Kayıt nereye gider?</b> Tip alanına göre Blog veya Proje tablosuna eklenir.
        Sadece <b>Yayında</b> seçtiğin kayıtlar 3D sitede görünür; taslakları istediğin zaman düzenleyip yayına alabilirsin.
        <br />
        <b>Zengin editör</b> başlıklar, listeler, alıntı, kod, link ve <b>satır arası resim</b> destekler — paragrafların arasına resim koymak için cursor'u istediğin yere getir, toolbar'ın sağındaki resim ikonuna bas.
      </InfoBox>

      {err && (
        <div className="admin-card" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)', color: '#b91c1c' }}>
          {err}
        </div>
      )}

      <div className="admin-card">
        <div className="admin-form">
          <div className="row">
            <label>
              Tip
              <select value={form.kind} onChange={(e) => set('kind', e.target.value)}>
                <option value="blog">Blog</option>
                <option value="project">Proje</option>
              </select>
            </label>
            <label>
              Yayın durumu
              <select value={form.published ? '1' : '0'} onChange={(e) => set('published', e.target.value === '1')}>
                <option value="0">Taslak</option>
                <option value="1">Yayında</option>
              </select>
            </label>
          </div>

          <label>
            Başlık
            <input
              type="text"
              value={form.title}
              onChange={(e) => {
                set('title', e.target.value)
                if (!form.slug || form.slug === slugify(form.title))
                  set('slug', slugify(e.target.value))
              }}
              placeholder="Yazı / proje başlığı"
            />
          </label>

          <label>
            Slug <span className="hint">— URL'de görünecek kısa ad</span>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => set('slug', e.target.value)}
              placeholder="react-three-fiber-ile-izometrik"
            />
          </label>

          <label>
            Özet <span className="hint">— liste / kart görünümünde çıkacak kısa açıklama</span>
            <textarea
              value={form.excerpt}
              onChange={(e) => set('excerpt', e.target.value)}
              placeholder="Kısa, tek paragraf özet"
            />
          </label>

          <label>
            Etiketler <span className="hint">— virgülle ayır</span>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              placeholder="React, WebGL, UI"
            />
          </label>

          <label>
            Proje / Site Linki <span className="hint">— başlığın altında "Siteyi Ziyaret Et" butonu olarak görünür (boş bırakılırsa gösterilmez)</span>
            <input
              type="url"
              value={form.project_url}
              onChange={(e) => set('project_url', e.target.value)}
              placeholder="https://ornek-projem.com"
            />
          </label>

          <label>
            Kapak Görseli
            <span className="hint">
              — Supabase Storage'a yüklenir. Yazı kartında ve detay sayfasında görünür.
              Yükledikten sonra <b>görseli sürükleyerek</b> hangi kısmının görüneceğini ayarlayabilirsin.
            </span>
            <ImageUpload
              value={form.cover}
              onChange={(url) => set('cover', url)}
              position={form.cover_position}
              onPositionChange={(pos) => set('cover_position', pos)}
              folder={form.kind}
            />
          </label>
        </div>
      </div>

      <div className="admin-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="tiptap-editor">
          <div className="tiptap-toolbar">
            <ToolbarBtn active={editor?.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
              <Heading1 size={16} />
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
              <Heading2 size={16} />
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
              <Bold size={16} />
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
              <Italic size={16} />
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
              <Strikethrough size={16} />
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
              <List size={16} />
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
              <ListOrdered size={16} />
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
              <Quote size={16} />
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
              <Code size={16} />
            </ToolbarBtn>
            <ToolbarBtn active={editor?.isActive('link')} onClick={addLink}>
              <LinkIcon size={16} />
            </ToolbarBtn>
            <span style={{ width: 1, height: 20, background: 'rgba(28,22,51,0.1)', margin: '0 2px' }} />
            <ToolbarBtn
              onClick={() => imgInputRef.current?.click()}
              active={false}
              title="Resim ekle"
            >
              {imgUploading
                ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                : <ImagePlus size={16} />
              }
            </ToolbarBtn>
            <input
              ref={imgInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/avif"
              onChange={(e) => handleInlineImage(e.target.files?.[0])}
              style={{ display: 'none' }}
            />
          </div>
          <EditorContent editor={editor} />
        </div>
      </div>

      <div
        style={{
          position: 'sticky',
          bottom: 16,
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          marginTop: 20,
          padding: 14,
          borderRadius: 12,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(28,22,51,0.08)',
          boxShadow: '0 6px 24px rgba(28,22,51,0.08)',
          zIndex: 10,
        }}
      >
        <Link to={`/admin/${form.kind === 'project' ? 'projects' : 'posts'}`} className="btn btn-secondary">İptal</Link>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
          Kaydet
        </button>
      </div>
    </div>
  )
}

function ToolbarBtn({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={active ? 'active' : ''}>
      {children}
    </button>
  )
}