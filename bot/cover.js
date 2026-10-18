// Yazı için markalı kapak görseli (1200×630 PNG): sitenin koyu-bakır zemini, ağ küresi, başlık ve imza.
// Aynı görsel blog kapağı, bağlantı önizlemesi ve LinkedIn kart görseli olarak kullanılır.
// Paket gerektirmez: makinedeki Chrome'u başsız modda çalıştırıp ekran görüntüsü alır.
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function hash(text) {
  let h = 7
  for (const ch of String(text)) h = (h * 31 + ch.codePointAt(0)) % 2147483647
  return h || 7
}

export function coverHtml({ title, kicker = 'YAPAY ZEKA', date = '', image = null }) {
  const len = String(title).length
  const size = len <= 40 ? 64 : len <= 60 ? 56 : len <= 80 ? 48 : 42
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500;700&family=JetBrains+Mono:wght@500;600&display=block" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1200px;height:630px;overflow:hidden;background:#1c1410}
body{color:#f5ece0;font-family:Inter,sans-serif;position:relative}
canvas{position:absolute;inset:0}
.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:right center}
.shade{position:absolute;inset:0;background:radial-gradient(ellipse 66% 88% at 20% 50%,rgba(28,20,16,.97) 0%,rgba(28,20,16,.7) 58%,transparent 82%)}
.c{position:absolute;inset:0;padding:64px 76px;display:flex;flex-direction:column}
.kicker{display:flex;gap:14px;align-items:center;font:600 19px 'JetBrains Mono',monospace;letter-spacing:.14em;color:#f0ad6c;text-transform:uppercase}
.kicker i{width:6px;height:6px;border-radius:50%;background:#6e5745}
.kicker span:last-child{color:#a48d79}
h1{margin-top:auto;margin-bottom:auto;font-size:${size}px;line-height:1.08;letter-spacing:-.035em;font-weight:700;max-width:720px}
.foot{display:flex;align-items:center;gap:16px}
.mark{width:52px;height:52px;border-radius:13px;background:#f5ece0;color:#1c1410;display:grid;place-items:center;font:600 19px 'JetBrains Mono',monospace}
.who{display:grid;gap:3px}.who b{font-size:22px;letter-spacing:-.01em}.who span{font:500 17px 'JetBrains Mono',monospace;color:#a48d79}
</style></head><body>
${image ? `<img class="bg" src="${image}">` : '<canvas id="cv" width="1200" height="630"></canvas>'}<div class="shade"></div>
<div class="c">
  <div class="kicker"><span>${esc(kicker)}</span>${date ? `<i></i><span>${esc(date)}</span>` : ''}</div>
  <h1>${esc(title)}</h1>
  <div class="foot"><div class="mark">BE</div><div class="who"><b>Berat Emek</b><span>berat-emek.com</span></div></div>
</div>
${image ? '' : `<script>
const c=document.getElementById('cv').getContext('2d');let seed=${hash(title)};const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
const N=170,g=Math.PI*(3-Math.sqrt(5)),nodes=[];
for(let i=0;i<N;i++){const y=1-(i/(N-1))*2,r=Math.sqrt(1-y*y),t=g*i,d=.72+rnd()*.34;nodes.push({x:Math.cos(t)*r*d,y:y*d,z:Math.sin(t)*r*d,hub:rnd()<.08})}
const rx=.3+rnd()*.3,ry=rnd()*6,cx=920,cy=315,R=290,f=2.6,P=nodes.map(n=>{const x1=n.x*Math.cos(ry)-n.z*Math.sin(ry),z1=n.x*Math.sin(ry)+n.z*Math.cos(ry),y1=n.y*Math.cos(rx)-z1*Math.sin(rx),z2=n.y*Math.sin(rx)+z1*Math.cos(rx),s=f/(f+z2);return{x:cx+x1*R*s,y:cy+y1*R*s,z:z2,s,hub:n.hub}});
const E=[];nodes.forEach((a,i)=>nodes.map((b,j)=>({j,d:(a.x-b.x)**2+(a.y-b.y)**2+(a.z-b.z)**2})).filter(o=>o.j!==i).sort((p,q)=>p.d-q.d).slice(0,3).forEach(o=>E.push([i,o.j])));
E.forEach(([a,b])=>{const pa=P[a],pb=P[b],al=.05+(1-((pa.z+pb.z)/2+1)/2)*.25;c.strokeStyle='rgba(236,170,110,'+al+')';c.beginPath();c.moveTo(pa.x,pa.y);c.lineTo(pb.x,pb.y);c.stroke()});
c.globalCompositeOperation='lighter';
P.forEach(p=>{const near=1-(p.z+1)/2,sz=(p.hub?2.8:1.5)*p.s*(.8+near*.6);if(p.hub){const gr=c.createRadialGradient(p.x,p.y,0,p.x,p.y,sz*8);gr.addColorStop(0,'rgba(232,140,70,.35)');gr.addColorStop(1,'rgba(232,140,70,0)');c.fillStyle=gr;c.beginPath();c.arc(p.x,p.y,sz*8,0,7);c.fill()}c.fillStyle='rgba(255,226,190,'+(.3+near*.6)+')';c.beginPath();c.arc(p.x,p.y,sz,0,7);c.fill()});
for(let k=0;k<22;k++){const e=E[Math.floor(rnd()*E.length)],t=rnd(),pa=P[e[0]],pb=P[e[1]],x=pa.x+(pb.x-pa.x)*t,y=pa.y+(pb.y-pa.y)*t,gr=c.createRadialGradient(x,y,0,x,y,12);gr.addColorStop(0,'rgba(255,236,200,.9)');gr.addColorStop(.35,'rgba(232,140,70,.3)');gr.addColorStop(1,'rgba(194,90,44,0)');c.fillStyle=gr;c.beginPath();c.arc(x,y,12,0,7);c.fill()}
</script>`}</body></html>`
}

export function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean)
  return candidates.find((p) => existsSync(p)) || null
}

/** Kapağı PNG olarak üretir; Chrome yoksa ya da başarısız olursa null döner (bot kapaksız devam eder). */
export function renderCover(opts) {
  const chrome = findChrome()
  if (!chrome) return null
  const dir = mkdtempSync(join(tmpdir(), 'kapak-'))
  try {
    const html = join(dir, 'kapak.html')
    const png = join(dir, 'kapak.png')
    writeFileSync(html, coverHtml(opts))
    const r = spawnSync(
      chrome,
      ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--window-size=1200,630', '--virtual-time-budget=8000', `--user-data-dir=${join(dir, 'profil')}`, `--screenshot=${png}`, pathToFileURL(html).href],
      { timeout: 60_000, stdio: 'ignore' }
    )
    if (r.status !== 0 || !existsSync(png)) return null
    return readFileSync(png)
  } catch {
    return null
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * Görseli sitede hızlı açılacak hale getirir: 1200 px genişliğe küçültüp WebP'ye çevirir
 * (~1,5 MB PNG → ~150 KB). Chrome yoksa ya da başarısız olursa null döner.
 */
export function compressImage(buffer, { width = 1200, quality = 0.82 } = {}) {
  const chrome = findChrome()
  if (!chrome) return null
  const dir = mkdtempSync(join(tmpdir(), 'sikistir-'))
  try {
    const html = join(dir, 'c.html')
    writeFileSync(
      html,
      `<!doctype html><body><script>
const img = new Image()
img.onload = () => {
  const w = Math.min(${width}, img.naturalWidth), h = Math.round(img.naturalHeight * w / img.naturalWidth)
  const c = document.createElement('canvas'); c.width = w; c.height = h
  c.getContext('2d').drawImage(img, 0, 0, w, h)
  document.body.textContent = 'VERI:' + c.toDataURL('image/webp', ${quality}) + ':SON'
}
img.src = 'data:image/png;base64,${buffer.toString('base64')}'
</script></body>`
    )
    const r = spawnSync(
      chrome,
      ['--headless=new', '--disable-gpu', '--no-sandbox', '--virtual-time-budget=8000', `--user-data-dir=${join(dir, 'profil')}`, '--dump-dom', pathToFileURL(html).href],
      { timeout: 60_000, maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' }
    )
    const m = /VERI:data:image\/webp;base64,([A-Za-z0-9+/=]+):SON/.exec(r.stdout || '')
    return m ? Buffer.from(m[1], 'base64') : null
  } catch {
    return null
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}
