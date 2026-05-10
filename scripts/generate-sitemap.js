// Build sırasında çalışır: Supabase'den yayındaki tüm post/proje slug'larını çekip
// public/sitemap.xml'i günceller. .env'den VITE_SUPABASE_URL ve VITE_SUPABASE_ANON_KEY okur.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '..', '.env') })

const SITE = 'https://berat-emek.com'
const url = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

const staticUrls = [
  { loc: `${SITE}/`, priority: '1.0', changefreq: 'weekly' },
]

async function build() {
  let dynamicUrls = []

  if (url && anonKey) {
    try {
      const supabase = createClient(url, anonKey)
      const { data, error } = await supabase
        .from('posts')
        .select('slug, kind, updated_at')
        .eq('published', true)
      if (error) throw error
      dynamicUrls = (data || []).map((p) => ({
        loc: `${SITE}/${p.kind === 'project' ? 'project' : 'blog'}/${p.slug}`,
        lastmod: p.updated_at ? new Date(p.updated_at).toISOString().slice(0, 10) : undefined,
        changefreq: 'monthly',
        priority: '0.8',
      }))
    } catch (e) {
      console.warn('[sitemap] Supabase\'den post listesi çekilemedi, sadece statik URL\'ler eklendi:', e.message)
    }
  } else {
    console.warn('[sitemap] .env içinde Supabase anahtarları yok, sadece statik URL\'ler eklenecek.')
  }

  const all = [...staticUrls, ...dynamicUrls]

  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    all
      .map((u) => {
        const lines = [`  <url>`, `    <loc>${u.loc}</loc>`]
        if (u.lastmod) lines.push(`    <lastmod>${u.lastmod}</lastmod>`)
        if (u.changefreq) lines.push(`    <changefreq>${u.changefreq}</changefreq>`)
        if (u.priority) lines.push(`    <priority>${u.priority}</priority>`)
        lines.push(`  </url>`)
        return lines.join('\n')
      })
      .join('\n') +
    '\n</urlset>\n'

  const out = resolve(__dirname, '..', 'public', 'sitemap.xml')
  writeFileSync(out, xml, 'utf-8')
  console.log(`[sitemap] ${all.length} URL yazıldı: ${out}`)
}

build().catch((e) => {
  console.error('[sitemap] Hata:', e)
  process.exit(0)
})
