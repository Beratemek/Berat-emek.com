// Görselli LinkedIn gönderisinde bağlantı kartı olmaz: yazının adresi metnin içine girer.
// Adres, yazıya yönlendiren cümlenin (":" ile biten son satır) hemen altına; o yoksa hashtag'lerden önceye; o da yoksa sona eklenir.
// Sunucu (api/linkedin/share.js) ve panel (LinkedInShare.jsx) aynı yerleşimi kullanır.
export function withLink(text, url) {
  const body = String(text || '').trimEnd()
  if (!url || body.includes(url)) return body
  const lines = body.split('\n')

  let at = -1
  for (let i = lines.length - 1; i >= 0; i--) {
    if (/:\s*$/.test(lines[i])) {
      at = i
      break
    }
  }
  if (at >= 0) {
    lines.splice(at + 1, 0, url)
    return lines.join('\n')
  }

  const last = lines.length - 1
  if (/^\s*#/.test(lines[last])) {
    lines.splice(last, 0, url, '')
    return lines.join('\n')
  }
  return `${body}\n\n${url}`
}
