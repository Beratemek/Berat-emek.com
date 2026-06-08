import { useRef, useState } from 'react'
import { Upload, X, Loader2, ImageIcon, Move, RotateCcw } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'

const MAX_SIZE_MB = 5
const ALLOWED = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/avif']
const DEFAULT_POS = '50% 50%'

function parsePos(p) {
  const [x = '50%', y = '50%'] = (p || DEFAULT_POS).split(' ')
  return { x: parseFloat(x) || 50, y: parseFloat(y) || 50 }
}

export default function ImageUpload({
  value,
  onChange,
  position = DEFAULT_POS,
  onPositionChange,
  bucket = 'covers',
  folder = 'posts',
}) {
  const inputRef = useRef(null)
  const dragRef = useRef(null)
  const drag = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState(null)

  const canPosition = typeof onPositionChange === 'function'

  function onPointerDown(e) {
    if (!canPosition) return
    const rect = dragRef.current.getBoundingClientRect()
    const { x, y } = parsePos(position)
    drag.current = { sx: e.clientX, sy: e.clientY, x, y, w: rect.width, h: rect.height }
    setDragging(true)
    try { e.currentTarget.setPointerCapture(e.pointerId) } catch {}
  }

  function onPointerMove(e) {
    if (!drag.current) return
    const d = drag.current
    // Görseli sürükleme yönü: aşağı çekince üst kısım görünür → yüzde azalır
    const nx = Math.min(100, Math.max(0, d.x - ((e.clientX - d.sx) / d.w) * 100))
    const ny = Math.min(100, Math.max(0, d.y - ((e.clientY - d.sy) / d.h) * 100))
    onPositionChange(`${Math.round(nx)}% ${Math.round(ny)}%`)
  }

  function endDrag() {
    drag.current = null
    setDragging(false)
  }

  async function handleFile(file) {
    if (!file) return
    setErr(null)

    if (!ALLOWED.includes(file.type)) {
      setErr('Desteklenmeyen dosya türü. PNG, JPG, WebP, GIF veya AVIF yükle.')
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setErr(`Dosya ${MAX_SIZE_MB} MB'den küçük olmalı.`)
      return
    }

    setUploading(true)
    try {
      // DEBUG: bucket listesini kontrol et
      const { data: buckets, error: listErr } = await supabase.storage.listBuckets()
      console.log('[ImageUpload] Available buckets:', buckets, 'listError:', listErr)
      console.log('[ImageUpload] Trying to upload to bucket:', bucket, 'folder:', folder)

      const ext = file.name.split('.').pop().toLowerCase()
      const rand = Math.random().toString(36).slice(2, 10)
      const path = `${folder}/${Date.now()}-${rand}.${ext}`

      const { error: upErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: '3600', upsert: false })
      if (upErr) {
        console.error('[ImageUpload] Upload error details:', JSON.stringify(upErr, null, 2))
        throw upErr
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      onChange(data.publicUrl)
    } catch (e) {
      console.error('[ImageUpload] Full error:', e)
      setErr(e.message || 'Yükleme başarısız')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function remove() {
    onChange('')
    setErr(null)
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {value ? (
        <div
          style={{
            position: 'relative',
            width: '100%',
            borderRadius: 10,
            overflow: 'hidden',
            border: '1px solid rgba(28,22,51,0.12)',
            background: '#fafafe',
          }}
        >
          <img
            ref={dragRef}
            src={value}
            alt="Cover preview"
            draggable={false}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            style={{
              width: '100%',
              height: 180,
              objectFit: 'cover',
              objectPosition: position,
              display: 'block',
              touchAction: canPosition ? 'none' : 'auto',
              userSelect: 'none',
              cursor: canPosition ? (dragging ? 'grabbing' : 'grab') : 'default',
            }}
          />

          {/* Konumlandırma ipucu + sıfırla */}
          {canPosition && (
            <div
              style={{
                position: 'absolute',
                left: 8,
                bottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '5px 9px',
                borderRadius: 8,
                background: 'rgba(0,0,0,0.55)',
                color: '#fff',
                fontSize: 11,
                fontWeight: 600,
                pointerEvents: 'none',
                backdropFilter: 'blur(2px)',
              }}
            >
              <Move size={13} />
              Sürükleyerek konumlandır
            </div>
          )}
          {canPosition && position !== DEFAULT_POS && (
            <button
              type="button"
              onClick={() => onPositionChange(DEFAULT_POS)}
              title="Konumu ortala"
              style={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 9px',
                borderRadius: 8,
                background: 'rgba(0,0,0,0.55)',
                border: 'none',
                color: '#fff',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={12} /> Ortala
            </button>
          )}

          <button
            type="button"
            onClick={remove}
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 32,
              height: 32,
              borderRadius: 16,
              background: 'rgba(239,68,68,0.95)',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            }}
            aria-label="Görseli kaldır"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <label
          htmlFor="image-upload-input"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: '32px 20px',
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
              <ImageIcon size={22} />
              <span style={{ fontSize: 14, fontWeight: 600 }}>Görsel seç veya buraya bırak</span>
              <span style={{ fontSize: 11, color: 'rgba(28,22,51,0.5)' }}>
                PNG · JPG · WebP · GIF · AVIF — maks {MAX_SIZE_MB} MB
              </span>
            </>
          )}
        </label>
      )}

      <input
        id="image-upload-input"
        ref={inputRef}
        type="file"
        accept={ALLOWED.join(',')}
        onChange={(e) => handleFile(e.target.files?.[0])}
        style={{ display: 'none' }}
        disabled={uploading}
      />

      {value && !uploading && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="btn btn-secondary"
          style={{ justifySelf: 'start' }}
        >
          <Upload size={14} /> Yeni görsel seç
        </button>
      )}

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