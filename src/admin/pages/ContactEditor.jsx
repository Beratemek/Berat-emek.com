import { useEffect, useState } from 'react'
import { Plus, Save, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import InfoBox from '../InfoBox.jsx'

const ICONS = [
  { value: 'mail', label: 'Mail' },
  { value: 'github', label: 'GitHub' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'globe', label: 'Web' },
]

const empty = () => ({
  id: null,
  label: '',
  value: '',
  href: '',
  icon: 'mail',
  position: 0,
  _new: true,
})

export default function ContactEditor() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)
  const [ok, setOk] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('contact_links').select('*').order('position')
    if (!error) setRows((data || []).map((r) => ({ ...r })))
    setLoading(false)
  }

  function setCell(i, key, value) {
    setRows((rs) => {
      const next = [...rs]
      next[i] = { ...next[i], [key]: value, _dirty: true }
      return next
    })
  }

  function add() {
    setRows((rs) => [...rs, { ...empty(), position: rs.length }])
  }

  async function removeRow(i) {
    const row = rows[i]
    if (row.id && !row._new) {
      const { error } = await supabase.from('contact_links').delete().eq('id', row.id)
      if (error) return alert(error.message)
    }
    setRows((rs) => rs.filter((_, idx) => idx !== i))
  }

  async function handleSave() {
    setSaving(true)
    setErr(null)
    setOk(false)
    try {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        const payload = {
          label: r.label,
          value: r.value,
          href: r.href,
          icon: r.icon,
          position: i,
        }
        if (r._new) {
          const { error } = await supabase.from('contact_links').insert(payload)
          if (error) throw error
        } else if (r._dirty) {
          const { error } = await supabase.from('contact_links').update(payload).eq('id', r.id)
          if (error) throw error
        }
      }
      await load()
      setOk(true)
      setTimeout(() => setOk(false), 2500)
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />

  return (
    <div>
      <div className="page-kicker">Sosyal</div>
      <h1>İletişim Linkleri</h1>
      <p className="page-desc">İletişim panelinde sıralı olarak gösterilir. Sırayı listedeki pozisyon belirler.</p>

      <InfoBox>
        <b>İkon:</b> Linkin solundaki yuvarlak kutuya çizilir.
        <br />
        <b>Etiket:</b> Üst küçük yazı (örn. "GitHub").
        <br />
        <b>Gösterilen değer:</b> Kartın üzerinde görünecek metin.
        <br />
        <b>Link:</b> Tıklanınca yeni sekmede açılacak tam URL (<code>https://</code> ile başlamalı).
        <br />
        <b>Not:</b> Değişiklik kaybolmasın diye en alttaki <b>Kaydet</b> butonuna basmayı unutma.
      </InfoBox>

      {err && <div className="admin-card" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)', color: '#b91c1c' }}>{err}</div>}
      {ok && <div className="admin-card" style={{ background: 'rgba(34,197,94,0.08)', borderColor: 'rgba(34,197,94,0.3)', color: '#15803d' }}>Kaydedildi.</div>}

      <div className="admin-card">
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 100px auto', gap: 10, fontSize: 12, fontWeight: 600, color: 'rgba(28,22,51,0.55)', padding: '0 14px 8px' }}>
          <div>İKON</div>
          <div>ETİKET</div>
          <div>GÖSTERİLEN DEĞER</div>
          <div>LINK</div>
          <div></div>
        </div>

        {rows.map((r, i) => (
          <div key={r.id ?? `new-${i}`} className="contact-row">
            <select value={r.icon || 'mail'} onChange={(e) => setCell(i, 'icon', e.target.value)}>
              {ICONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input
              type="text"
              value={r.label || ''}
              onChange={(e) => setCell(i, 'label', e.target.value)}
              placeholder="E-posta"
            />
            <input
              type="text"
              value={r.value || ''}
              onChange={(e) => setCell(i, 'value', e.target.value)}
              placeholder="hello@beratemek.com"
            />
            <input
              type="url"
              value={r.href || ''}
              onChange={(e) => setCell(i, 'href', e.target.value)}
              placeholder="https://…"
            />
            <button className="btn btn-danger" onClick={() => removeRow(i)} style={{ padding: '8px 10px' }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        <button className="btn btn-secondary" onClick={add} style={{ marginTop: 8 }}>
          <Plus size={14} /> Link Ekle
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
          Kaydet
        </button>
      </div>
    </div>
  )
}