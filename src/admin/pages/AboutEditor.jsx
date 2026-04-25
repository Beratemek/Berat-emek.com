import { useEffect, useState } from 'react'
import { Save, Loader2, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import InfoBox from '../InfoBox.jsx'

export default function AboutEditor() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [ok, setOk] = useState(false)

  const [form, setForm] = useState({
    kicker: '',
    body: '',
    highlights: [''],
  })

  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase.from('profile').select('*').eq('id', 1).maybeSingle()
      if (!error && data) {
        setForm({
          kicker: data.kicker || '',
          body: data.body || '',
          highlights: (data.highlights && data.highlights.length ? data.highlights : ['']),
        })
      }
      setLoading(false)
    })()
  }, [])

  function setH(i, value) {
    setForm((f) => {
      const h = [...f.highlights]
      h[i] = value
      return { ...f, highlights: h }
    })
  }
  function addH() {
    setForm((f) => ({ ...f, highlights: [...f.highlights, ''] }))
  }
  function removeH(i) {
    setForm((f) => ({ ...f, highlights: f.highlights.filter((_, idx) => idx !== i) }))
  }

  async function handleSave() {
    setSaving(true)
    setErr(null)
    setOk(false)
    const payload = {
      id: 1,
      kicker: form.kicker,
      body: form.body,
      highlights: form.highlights.filter((x) => x.trim().length > 0),
    }
    const { error } = await supabase.from('profile').upsert(payload)
    if (error) setErr(error.message)
    else setOk(true)
    setSaving(false)
    setTimeout(() => setOk(false), 2500)
  }

  if (loading) return <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />

  return (
    <div>
      <div className="page-kicker">Profil</div>
      <h1>Hakkımda</h1>
      <p className="page-desc">Siteyi ziyaret edenlerin Hakkımda panelinde göreceği içerik.</p>

      <InfoBox>
        <b>Alt başlık (kicker):</b> Hakkımda panelinin en üstünde minik büyük-harf yazı olarak görünür (örn. "Senior · Full-Stack Developer").
        <br />
        <b>Metin:</b> Panelin ana paragrafı — kendini tanıttığın 2-4 cümlelik özet.
        <br />
        <b>Öne çıkanlar:</b> Metnin altında kart dizisi olarak çıkan kısa maddeler (okul, uzmanlık, teknoloji etiketleri vb.).
      </InfoBox>

      {err && (
        <div className="admin-card" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)', color: '#b91c1c' }}>{err}</div>
      )}
      {ok && (
        <div className="admin-card" style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.3)', color: '#15803d' }}>Kaydedildi.</div>
      )}

      <div className="admin-card">
        <div className="admin-form">
          <label>
            Alt başlık (kicker)
            <input
              type="text"
              value={form.kicker}
              onChange={(e) => setForm((f) => ({ ...f, kicker: e.target.value }))}
              placeholder="Senior · Full-Stack Developer"
            />
          </label>

          <label>
            Metin
            <textarea
              rows={6}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              placeholder="Erciyes Üniversitesi Bilgisayar Mühendisliği..."
            />
          </label>

          <div>
            <label style={{ marginBottom: 8 }}>
              Öne çıkanlar
              <span className="hint">— kısa maddeler, kartlar halinde render edilir</span>
            </label>
            {form.highlights.map((h, i) => (
              <div key={i} className="highlight-row">
                <input
                  type="text"
                  value={h}
                  onChange={(e) => setH(i, e.target.value)}
                  placeholder="Full-Stack · MERN · TypeScript"
                />
                <button type="button" className="btn btn-danger" onClick={() => removeH(i)} style={{ padding: '8px 10px' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary" onClick={addH}>
              <Plus size={14} /> Madde Ekle
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
          Kaydet
        </button>
      </div>
    </div>
  )
}