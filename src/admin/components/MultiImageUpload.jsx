import { useRef, useState } from 'react'
import { Upload, X, Loader2, ImageIcon, Plus } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'

const MAX_SIZE_MB = 5
const ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/avif']

export default function MultiImageUpload({ value = [], onChange, bucket = 'covers', folder = 'gallery' }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState(null)

  async function handleFiles(files) {
    if (!files || files.length === 0) return
    setErr(null)
    setUploading(true)

    const newUrls = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!ALLOWED.includes(file.type)) {
        setErr('Desteklenmeyen dosya türü. PNG, JPG, WebP, GIF veya AVIF yükle.')
        continue
      }
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        setErr(`Dosya ${MAX_SIZE_MB} MB'den küçük olmalı.`)
        continue
      }

      try {
        const ext = file.name.split('.').pop().toLowerCase()
        const rand = Math.random().toString(36).slice(2, 10)
        const path = `${folder}/${Date.now()}-${rand}.${ext}`

        const { error: upErr } = await supabase.storage
          .from(bucket)
          .upload(path, file, { cacheControl: '3600', upsert: false })
        if (upErr) throw upErr

        const { data } = supabase.storage.from(bucket).getPublicUrl(path)
        newUrls.push(data.publicUrl)
      } catch (e) {
        console.error('[MultiImageUpload] Error:', e)
        setErr(e.message || 'Yükleme başarısız')
      }
    }

    if (newUrls.length > 0) {
      onChange([...value, ...newUrls])
    }
    
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  function remove(indexToRemove) {
    onChange(value.filter((_, i) => i !== indexToRemove))
    setErr(null)
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {value.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10 }}>
          {value.map((url, i) => (
            <div
              key={i}
              style={{
                position: 'relative',
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid rgba(28,22,51,0.12)',
                background: '#fafafe',
                aspectRatio: '1',
              }}
            >
              <img
                src={url}
                alt="Gallery item"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <button
                type="button"
                onClick={() => remove(i)}
                style={{
                  position: 'absolute',
                  top: 6,
                  right: 6,
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  background: 'rgba(239,68,68,0.95)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                }}
                title="Kaldır"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      <label
        htmlFor="multi-image-upload-input"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '24px 20px',
          borderRadius: 10,
          border: '2px dashed rgba(167,139,250,0.4)',
          background: 'rgba(167,139,250,0.04)',
          cursor: uploading ? 'wait' : 'pointer',
          color: '#7c3aed',
          transition: 'all 0.15s',
        }}
      >
        {uploading ? (
          <>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>Yükleniyor…</span>
          </>
        ) : (
          <>
            <Plus size={22} />
            <span style={{ fontSize: 14, fontWeight: 600 }}>Galeriye Görsel Ekle</span>
            <span style={{ fontSize: 11, color: 'rgba(28,22,51,0.5)' }}>
              Birden fazla seçebilirsin (Maks {MAX_SIZE_MB} MB)
            </span>
          </>
        )}
      </label>

      <input
        id="multi-image-upload-input"
        ref={inputRef}
        type="file"
        multiple
        accept={ALLOWED.join(',')}
        onChange={(e) => handleFiles(e.target.files)}
        style={{ display: 'none' }}
        disabled={uploading}
      />

      {err && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#b91c1c',
            fontSize: 12,
          }}
        >
          {err}
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}