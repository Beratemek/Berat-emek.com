// Kalite kapısı — kural tabanlı ve ücretsiz. Yayından önce metni Berat'ın verdiği kararlara göre tarar.
// (Yapay zekalı ikinci aşama bakiye yüklenince eklenecek; bu kurallar her durumda çalışır.)

const L = '\\p{L}'
// Türkçe harflerde \b çalışmadığı için kelime sınırını harf olmayan karakterle tanımla
const word = (body) => new RegExp(`(?<!${L})(?:${body})(?!${L})`, 'iu')

const RULES = [
  {
    re: /t[üu]b[iı]tak/iu,
    level: 'kritik',
    text: 'TÜBİTAK geçiyor; sitede bundan bahsetmeme kararı vardı.',
  },
  {
    re: /akci[ğg]er|solunum sesi/iu,
    level: 'kritik',
    text: 'Akciğer sesi projesi geçiyor; bu proje siteden kaldırılmıştı.',
  },
  {
    re: /github\.com\/beratemek\/viziowise|viziowise-web/iu,
    level: 'kritik',
    text: 'Şirketin kod deposuna bağlantı var; şirket kodları paylaşılmıyor.',
  },
  {
    re: /gizlilik geçidi/iu,
    kinds: ['blog'],
    level: 'uyari',
    text: 'Gizlilik Geçidi geçiyor; takım onayı olmadan bu konuda yazı yayınlanmayacaktı.',
  },
  {
    re: word('devrim(?:ci|sel)?|çığır açan|oyunun kurallarını|her şey değişti|inanılmaz|muhteşem|akıl almaz|game[- ]changer'),
    level: 'uyari',
    text: (m) => `Abartılı ifade: "${m}". Somut bir bilgiyle değiştirmek daha güçlü durur.`,
  },
  {
    re: /(?:\+90[\s-]?)?0?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}/u,
    level: 'kritik',
    text: 'Telefon numarasına benzeyen bir şey var; kişisel veri paylaşma.',
  },
  {
    re: /!{2,}/u,
    level: 'uyari',
    text: 'Art arda ünlem var; profesyonel tonla uyuşmuyor.',
  },
]

const OWN_EMAILS = /emekberat19@gmail\.com|viziowise@gmail\.com/i

/**
 * @returns {{ level: 'kritik'|'uyari', text: string }[]}
 */
export function qualityCheck({ kind = 'blog', title = '', excerpt = '', body = '' }) {
  const text = `${title}\n${excerpt}\n${body}`
  const issues = []
  for (const r of RULES) {
    if (r.kinds && !r.kinds.includes(kind)) continue
    const m = text.match(r.re)
    if (m) issues.push({ level: r.level, text: typeof r.text === 'function' ? r.text(m[0]) : r.text })
  }
  // Kendi adresleri dışında e-posta
  const emails = (text.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || []).filter((e) => !OWN_EMAILS.test(e))
  if (emails.length) issues.push({ level: 'kritik', text: `Başkasına ait olabilecek e-posta adresi: ${emails[0]}` })
  return issues
}
