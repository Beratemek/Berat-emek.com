// GET /api/linkedin/status — panel için bağlantı durumu (anahtarın kendisi asla döndürülmez).
import { json, requireAdmin, missingConfig, getAuth, isConnected } from '../_linkedin.js'

export async function GET(request) {
  if (!(await requireAdmin(request))) return json({ error: 'Yetkisiz' }, 401)
  const missing = missingConfig()
  if (missing.length) return json({ configured: false, missing })
  let auth
  try {
    auth = await getAuth()
  } catch {
    return json({ configured: true, tableMissing: true })
  }
  return json({
    configured: true,
    connected: isConnected(auth),
    name: auth?.name || null,
    expiresAt: auth?.expires_at || null,
  })
}
