import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapLink from '@tiptap/extension-link'
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
    published: false,
  })

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapLink.configure({ openOnClick: false, HTMLAttributes: { class: 'tiptap-link' } }),
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
          published: !!data.published,
        })
        editor.commands.setContent(data.content ?? '')
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
      published: form.published,
      content: editor?.getJSON() ?? null,
    }
    try {
      if (isNew) {
        const { data, error } = await supabase.from('posts').insert(payload).select().single()
        if (error) throw error
        navigate(`/admin/posts/${data.id}`, { replace: true })
      } else {
        const { error } = await supabase.from('posts').update(payload).eq('id', id)
        if (error) throw error
      }
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
        <b>Zengin editör</b> başlıklar, listeler, alıntı, kod ve link destekler. İçerik Supabase'de JSON olarak saklanır.
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
            Kapak Görseli
            <span className="hint">
              — Supabase Storage'a yüklenir. Yazı kartında ve detay sayfasında görünür.
            </span>
            <ImageUpload
              value={form.cover}
              onChange={(url) => set('cover', url)}
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