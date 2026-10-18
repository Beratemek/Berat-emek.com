import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { signInWithPassword, signInWithMagicLink } from './AuthProvider.jsx'

/** Supabase'in İngilizce/teknik hatalarını anlaşılır Türkçeye çevirir */
function loginError(e) {
  const msg = String(e?.message || '')
  if (/fetch|network|json|load failed/i.test(msg)) {
    return 'Veritabanına ulaşılamıyor. Supabase projesi duraklatılmış olabilir; panelden "Restore" ile yeniden aç.'
  }
  if (/invalid login credentials/i.test(msg)) return 'E-posta ya da şifre hatalı. Şifreni hatırlamıyorsan "Sihirli Link" ile giriş yap.'
  if (/email not confirmed/i.test(msg)) return 'E-posta adresin henüz doğrulanmamış. Gelen kutundaki onay e-postasına bak.'
  if (/rate limit|too many/i.test(msg)) return 'Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar dene.'
  return msg || 'Giriş başarısız'
}

export default function Login() {
  const [mode, setMode] = useState('password') // 'password' | 'magic'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState(null)
  const [ok, setOk] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setErr(null)
    setOk(null)
    setLoading(true)
    try {
      if (mode === 'password') {
        const { error } = await signInWithPassword(email, password)
        if (error) throw error
        // Oturum AuthProvider tarafından otomatik yüklenir; sayfa kendiliğinden Dashboard'a geçer.
      } else {
        const { error } = await signInWithMagicLink(email)
        if (error) throw error
        setOk('E-postana sihirli giriş linki gönderildi. Linke tıklayınca /admin sayfasına otomatik döneceksin.')
      }
    } catch (e) {
      setErr(loginError(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-root login-wrap">
      <form onSubmit={handleSubmit} className="login-card">
        <span className="login-mark">BE</span>
        <h1>Tekrar hoş geldin</h1>
        <div className="subtitle">berat-emek.com yönetim paneli</div>

        <div className="tabs">
          <button
            type="button"
            onClick={() => setMode('password')}
            className={mode === 'password' ? 'active' : ''}
          >
            Şifre
          </button>
          <button
            type="button"
            onClick={() => setMode('magic')}
            className={mode === 'magic' ? 'active' : ''}
          >
            Sihirli Link
          </button>
        </div>

        {err && <div className="msg err">{err}</div>}
        {ok && <div className="msg ok">{ok}</div>}

        <label>
          E-posta
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="emekberat19@gmail.com"
            autoComplete="email"
            required
          />
        </label>

        {mode === 'password' && (
          <label>
            Şifre
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
        )}

        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
          {loading ? <Loader2 size={16} className="spin" /> : null}
          {mode === 'password' ? 'Giriş Yap' : 'Sihirli Link Gönder'}
        </button>

      </form>
    </div>
  )
}