// Ajanlar: Kümeleyici → Doğrulayıcı → Yazar → Kontrolcü → Editör (+ zayıf günlerde Fikir ajanı)
// Her ajan tek bir model çağrısıdır; günde toplam ~7-8 çağrı.
import { askJSON } from './llm.js'
import { fetchText, mainText } from './collect.js'
import { PERSONA, FOCUS, WRITER_MODEL, CONTENT_RULES, PLAIN_LANGUAGE, GOLD_LINKEDIN } from './config.js'

const JSON_ONLY = 'Yalnızca geçerli JSON döndür; JSON dışında hiçbir şey yazma.'

const TYPE_LABEL = { primary: 'resmi', media: 'medya', community: 'topluluk' }

/* ---------------------------------------------------------------
 * 1) KÜMELEYİCİ — aynı olayı anlatan haberleri gruplar, odağa uygunluğu puanlar
 * ------------------------------------------------------------- */
export async function clusterNews(items) {
  const lines = items.map(
    (it) =>
      `${it.id} | ${TYPE_LABEL[it.type]} · ${it.source} | ${it.title}${it.summary ? ` — ${it.summary.slice(0, 160)}` : ''}`
  )

  const out = await askJSON({
    label: 'kümeleyici',
    system: `Sen Berat'ın içerik editörüsün. Sana son saatlerde toplanan yapay zeka başlıkları veriliyor.

${FOCUS}

Görevin:
1. AYNI OLAYI veya AYNI PROJEYİ anlatan başlıkları tek kümede topla (aynı genel tema yetmez; aynı somut olay olmalı).
   Bir GitHub projesi, onu konuşan Reddit/Hacker News gönderisiyle aynı kümeye girer.
2. Her kümeye kısa, tarafsız, Türkçe bir başlık yaz (en fazla 12 kelime).
3. relevance: YANKI potansiyeli. 0 = İLGİSİZ listesinde ya da yapay zeka/yazılım dışı, 1 = niş, dar bir kitle, 2 = geniş teknoloji ve geliştirici kitlesi konuşur, 3 = dünya ya da Türkiye gündemine girer, herkes konuşur.
4. newsworthy=false: görüş yazısı, kişisel deneme, reklam, sadece hata düzeltmesi içeren sürüm notu, relevance=0 olan her şey.
5. category: arac | ozellik | model | acik-kaynak | yontem | diger
Yapay zekayla ilgisi olmayan başlıkları hiçbir kümeye koyma. Tek başlıklık küme olabilir; bir başlık tek kümede yer alır.
Çıktı: {"clusters":[{"topic":"...","item_ids":["n1","n7"],"category":"arac","relevance":3,"newsworthy":true}]}
${JSON_ONLY}`,
    user: `Başlıklar (id | kaynak türü · kaynak | başlık — özet):\n${lines.join('\n')}`,
    maxTokens: 6000,
  })

  const byId = new Map(items.map((it) => [it.id, it]))
  const used = new Set()
  return (out.clusters || [])
    .map((c) => {
      const members = (c.item_ids || [])
        .filter((id) => byId.has(id) && !used.has(id))
        .map((id) => (used.add(id), byId.get(id)))
      const relevance = Math.max(0, Math.min(3, Math.round(Number(c.relevance) || 0)))
      return {
        topic: String(c.topic || '').trim(),
        category: c.category || 'diger',
        relevance,
        newsworthy: c.newsworthy !== false && relevance > 0,
        items: members,
      }
    })
    .filter((c) => c.topic && c.items.length)
}

/* ---------------------------------------------------------------
 * Puanlama — modelde değil kodda: kaç kaynak, resmi kaynak var mı,
 * toplulukta ne kadar ilgi gördü (HN puanı, GitHub yıldızı, izlenme…)
 * ------------------------------------------------------------- */
const RELEVANCE_WEIGHT = [0, 0.6, 1, 1.5]

export function scoreClusters(clusters) {
  const total = clusters.reduce((n, c) => n + c.items.length, 0) || 1
  const top = (c, source) => Math.max(0, ...c.items.filter((i) => i.source === source).map((i) => i.engagement || 0))
  return clusters
    .map((c) => {
      const media = new Set(c.items.filter((i) => i.type === 'media').map((i) => i.source)).size
      const hasPrimary = c.items.some((i) => i.type === 'primary')
      const reddit = new Set(c.items.filter((i) => i.source.startsWith('r/')).map((i) => i.source)).size
      const community =
        Math.min(3, top(c, 'Hacker News') / 150) +
        Math.min(3, top(c, 'GitHub Trend') / 400) +
        Math.min(2, top(c, 'YouTube') / 100000) +
        Math.min(2, top(c, 'Hugging Face Trend') / 300) +
        Math.min(3, top(c, 'GitHub Sürüm') / 50000) +
        Math.min(2, reddit)
      const base = media * 1.5 + (hasPrimary ? 2 : 0) + community + Math.min(3, (c.items.length - 1) * 0.5)
      const score = base * RELEVANCE_WEIGHT[c.relevance]
      // Güven seviyesi: resmi kaynak varsa en yüksek; yoksa en az 2 bağımsız medya şart
      // Topluluk gündemi: resmi kaynak ya da iki medya yok ama geliştiriciler yoğun konuşuyor
      const hn = top(c, 'Hacker News')
      const trust = hasPrimary ? 'birincil' : media >= 2 ? 'coklu-medya' : hn >= 300 || (media >= 1 && (hn >= 150 || reddit >= 2)) ? 'topluluk' : 'tek-kaynak'
      return {
        ...c,
        score: Math.round(score * 10) / 10,
        share: Math.round((c.items.length / total) * 100),
        trust,
        sourceCount: new Set(c.items.map((i) => i.source)).size,
        // Editörün "neden bu puan" açıklaması için ham sinyaller
        signals: { media, hasPrimary, reddit, hn: top(c, 'Hacker News'), github: top(c, 'GitHub Trend'), hf: top(c, 'Hugging Face Trend'), release: top(c, 'GitHub Sürüm'), youtube: top(c, 'YouTube'), items: c.items.length },
      }
    })
    .sort((a, b) => b.score - a.score)
}

/* ---------------------------------------------------------------
 * 2) DOĞRULAYICI — kaynak metinleri okur, sadece açıkça yazanı kabul eder
 * ------------------------------------------------------------- */
async function readSources(cluster, max = 3) {
  const order = { primary: 0, media: 1, community: 2 }
  const picks = [...cluster.items]
    .filter((i) => !/reddit\.com|news\.ycombinator\.com|youtube\.com/.test(i.url))
    .sort((a, b) => order[a.type] - order[b.type])
    .slice(0, max)

  return Promise.all(
    picks.map(async (it) => {
      let text = ''
      try {
        text = mainText(await fetchText(it.url, { timeoutMs: 15000 })).slice(0, 7000)
      } catch {
        // Sayfa botları engelliyorsa RSS özetiyle yetin
      }
      return { ...it, text: text || it.summary || '' }
    })
  )
}

export async function verifyCandidate(cluster) {
  const sources = await readSources(cluster)
  const blocks = sources.map(
    (s, i) =>
      `### Kaynak ${i + 1} (${TYPE_LABEL[s.type]} · ${s.source})\nURL: ${s.url}\nBaşlık: ${s.title}\nMetin: ${s.text}`
  )
  const others = cluster.items
    .filter((i) => !sources.some((s) => s.url === i.url))
    .map((i) => `- ${i.source}: ${i.title}${i.summary ? ` (${i.summary})` : ''}`)

  const out = await askJSON({
    label: 'doğrulayıcı',
    system: `Sen titiz bir doğrulama editörüsün. Bir konu ve bu konuyla ilgili kaynak metinler veriliyor.
Görevin: kaynak metinlerde AÇIKÇA yazan bilgileri çıkarmak ve yazmayanları ayırmak.
Kurallar:
- Sadece verilen metinlere dayan. Kendi bilgini EKLEME, tahmin yürütme.
- Sayılar, tarihler, model adları, fiyatlar metinde birebir geçmiyorsa "facts"e koyma.
- Her bilginin hangi kaynaktan geldiğini source_url ile belirt.
- Kurulum/kullanım adımları (komutlar, gereksinimler, ayarlar) metinde açıkça geçiyorsa "how_to"ya birebir aktar; yoksa boş bırak.
- Başlıkta iddia edilip metinde desteklenmeyenleri "unverified"e yaz.
- verified=true yalnızca olayın kendisi (ne oldu / proje ne yapıyor?) en az bir kaynak metinde açıkça doğrulanıyorsa.
- Söylenti, sızıntı veya "iddia" düzeyindeyse verified=false.
Çıktı: {"verified":true,"confidence":"yuksek|orta|dusuk","what_happened":"1-2 cümle Türkçe","facts":[{"fact":"Türkçe tek cümle","source_url":"..."}],"how_to":["adım veya komut"],"unverified":["..."],"why_it_matters":"1-2 cümle Türkçe, geliştirici gözünden, abartısız"}
${JSON_ONLY}`,
    user: `Konu: ${cluster.topic}\n\n${blocks.join('\n\n')}${others.length ? `\n\nAynı konuyu konuşan diğer başlıklar:\n${others.join('\n')}` : ''}`,
  })

  return {
    verified: out.verified === true && Array.isArray(out.facts) && out.facts.length > 0,
    confidence: out.confidence || 'dusuk',
    whatHappened: out.what_happened || '',
    facts: (out.facts || []).filter((f) => f?.fact),
    howTo: (out.how_to || []).filter(Boolean).slice(0, 6),
    unverified: (out.unverified || []).filter(Boolean),
    whyItMatters: out.why_it_matters || '',
  }
}

/* ---------------------------------------------------------------
 * 3) YAZAR — kısa LinkedIn gönderisi + blog taslağı
 * ------------------------------------------------------------- */
function factSheet(cluster, v) {
  return `Konu: ${cluster.topic}
Ne oldu: ${v.whatHappened}
Neden önemli (doğrulayıcının notu): ${v.whyItMatters}
Doğrulanmış bilgiler:
${v.facts.map((f) => `- ${f.fact} (kaynak: ${f.source_url})`).join('\n')}
Kaynakta geçen kurulum/kullanım adımları:
${v.howTo.length ? v.howTo.map((h) => `- ${h}`).join('\n') : '- yok'}
Doğrulanmamış iddialar:
${v.unverified.length ? v.unverified.map((u) => `- ${u}`).join('\n') : '- yok'}`
}

export async function writeDraft(cluster, v) {
  const out = await askJSON({
    label: 'yazar',
    model: WRITER_MODEL,
    temperature: 0.6,
    maxTokens: 10000,
    system: `${PERSONA}

${CONTENT_RULES}

${PLAIN_LANGUAGE}

Görevin: doğrulanmış bilgilerden kısa bir LinkedIn gönderisi ve bir blog yazısı taslağı hazırlamak.
Kesin kurallar:
- YALNIZCA verilen bilgileri kullan. Listede olmayan sayı, tarih, isim, özellik, komut UYDURMA.
- Doğrulanmamış bir iddiadan bahsedeceksen açıkça "henüz doğrulanmadı" de.
- "Devrim", "her şey değişti", "oyunun kuralları" gibi abartılı kalıplar yok.

Berat haber muhabiri DEĞİL. Amaç: güncel bir gelişmeyi Berat'ın blog yazısında sade bir dille anlatmak ve
LinkedIn'de kısa bir yorumla bu yazıya yönlendirmek. Asıl iş blog yazısıdır.

Blog yazısı (ana ürün, Berat'ın ağzından, sade ve anlaşılır):
- 400-700 kelime. İlk blok "**Kısaca:**" ile başlayan 2-3 cümlelik paragraf (ne oldu, okura neden önemli).
  Bölümler: "Ne oldu?", konunun anahtar kavramı varsa onu açıklayan kısa bir bölüm (ör. "Açık kaynak ne demek?"), "Neden önemli?",
  "Nasıl denenir?" (yalnızca adım verildiyse; okurun gerçekten yazacağı komutları "code" bloğuyla ver, önüne ne işe yaradığını söyleyen bir cümle koy),
  "Dikkat" (doğrulanmamış iddialar ve riskler; yoksa atla), "Benim yorumum".
- Teknik bilgisi olmayan bir okur yazının sonunda konuyu anlamış, yazılımcı da nasıl deneyeceğini biliyor olmalı.
- Kalite çıtası (hedef: okurlar "bu adam kaliteli haber paylaşıyor" desin): haber özetini tekrar etmek yetmez. Yazı, haberin
  kendisinde yazmayan bir bağlam ya da çıkarım vermeli: neden şimdi oldu, kim kazanır kim kaybeder, okurun işinde ne değişir.
  Bu çıkarım görüştür, yeni olgu değildir; yalnızca doğrulanmış bilgilerden yola çık.
- Konunun anahtar terimleri (ürün ya da şirket adı ve alanı: "siber güvenlik", "açık kaynak" gibi) başlıkta ve ilk paragrafta geçsin;
  insanlar bu kelimelerle arıyor.

LinkedIn gönderisi (blog yazısına yönlendiren kısa giriş):
- 60-130 kelime, kısa paragraflar. İlk iki satır gelişmeyi ve okur için anlamını söylesin (LinkedIn "devamını gör"den önce yalnızca ilk 2 satırı gösterir).
- En çarpıcı 2-3 somut nokta (• ile başlayan satırlar; varsa sayılarla).
- İlk cümle en çarpıcı somut bilgiyle açılsın (rakam, ölçek, bir ilk: "bir haftada 240 bin yıldız" gibi); ürün ya da repo adıyla açma.
- Maddeler herkesin anlayacağı etkiler olsun: ne yapıyor, kimin işine yarıyor, nasıl denenir. Sürüm numarası, ortam değişkeni,
  platform ve sürüm gereksinimi gibi ayrıntıları blog yazısına bırak.
- "Benim yorumum" net bir görüş olsun (neyi değiştiriyor, kimin için ne anlama geliyor); "doğrulanmadı" gibi çekingen uyarıları
  yorumun yerine koyma. Yorum haberde yazmayan bir çıkarım taşısın (ne değişiyor, kim kazanıyor); "ilginç bir gelişme" gibi boş yorum yok.
- Konunun anahtar terimleri ilk iki satırda doğal biçimde geçsin (LinkedIn araması gönderi metnini tarar).
- 1-2 cümlelik "Benim yorumum:".
- Hashtag'lerden önceki satır yazıya yönlendiren tek cümle ve ":" ile biter (ör. "Detayları yazımda sade bir dille anlattım:"); yazının bağlantısı paylaşırken otomatik eklenecek.
- Haber bülteni dili ("Ne oldu?" başlığı, ajans dili) kullanma; soru cümlesiyle bitirme. En sonda 3-5 hashtag: #YapayZeka, konunun ana terimi (ör. #DeepSeek) ve 1-2 geniş kitle etiketi (#Teknoloji, #Yazılım, #SiberGüvenlik gibi); daha fazlası spam gibi görünür. Gövdede link verme. En fazla 1 emoji.
- Örnek (ton ve yapı için; kalıbı ve cümleleri kopyalama, kendi konuna göre yaz):
---
${GOLD_LINKEDIN}
---
- title: en fazla 70 karakter, net. excerpt: en fazla 200 karakter. tags: 2-4 kısa etiket.
- Kaynaklar listesini yazma; sistem ekleyecek.
- blocks içindeki type yalnızca: p, h2, h3, ul, quote, code. Vurgu için **kalın** kullanabilirsin.

Kapak görseli fikri (image_prompt): yazının konusunu anlatan, renkli ve somut bir görsel metafor; İNGİLİZCE, 1-2 cümle.
Ne görüneceğini tarif et (nesneler, sahne, hareket). Marka logosu, yazı, rakam, ekran metni İSTEME; gerçek kişi çizdirme.

Çıktı: {"linkedin":"...","image_prompt":"...","blog":{"title":"...","excerpt":"...","tags":["..."],"blocks":[{"type":"p","text":"..."},{"type":"h2","text":"..."},{"type":"ul","items":["..."]},{"type":"code","text":"npx ..."}]}}
${JSON_ONLY}`,
    user: factSheet(cluster, v),
  })

  if (!out.linkedin || !out.blog?.title || !Array.isArray(out.blog?.blocks)) {
    throw new Error('[yazar] eksik çıktı döndü')
  }
  return out
}

/* ---------------------------------------------------------------
 * 4) KONTROLCÜ — taslağı doğrulanmış bilgilere karşı denetler ve düzeltir
 * ------------------------------------------------------------- */
export async function checkDraft(cluster, v, draft) {
  try {
    const out = await askJSON({
      label: 'kontrolcü',
      maxTokens: 12000,
      system: `Sen yayın öncesi kontrol editörüsün. Sana doğrulanmış bilgi listesi ve bir LinkedIn gönderisi + blog yazısı taslağı veriliyor.
Görevin:
1. Taslakta doğrulanmış bilgilerde OLMAYAN her iddiayı bul (sayı, tarih, isim, özellik, komut, karşılaştırma).
2. Abartılı veya yanıltıcı ifadeleri bul.
3. Uydurma kişisel deneyim ifadelerini bul ("denedim", "kullandım" gibi).
   ÖNEMLİ: "Benim yorumum" kısmı Berat'ın GÖRÜŞÜDÜR; görüş, değerlendirme ve öneri cümleleri ("…için değerlendirilmeli", "kendi görevlerinizde test edin") doğrulanmış bilgide geçmek zorunda değildir ve sorun sayılmaz. Yalnızca bu kısımda yeni bir OLGU (sayı, tarih, özellik, kıyas sonucu) uydurulmuşsa sorun say.
4. Türkçe dil ve anlatım hatalarını bul; açıklanmamış teknik terimleri ve uzun, ağır cümleleri de bul (okur teknik bilgisi olmayan biri) ve düzeltilmiş metinde sadeleştir.
5. LinkedIn metnini bu sorunlardan arındırılmış haliyle döndür (sorun yoksa aynen). Uzunluğu ve yapıyı koru. Doğrulanmamış iddiayı silmek ya da "kaynağa göre" diye yumuşatmak çoğu zaman yeterlidir.
6. Blog bloklarını düzeltilmiş haliyle eksiksiz döndür (aynı blok yapısı).
Her sorun için döndürdüğün düzeltilmiş metinde o sorunu giderdiysen "fixed": true, gideremediysen (ör. konunun kendisi doğrulanamıyor) "fixed": false yaz.
Çıktı: {"issues":[{"severity":"kritik|orta|kucuk","text":"Türkçe açıklama","fixed":true}],"linkedin":"...","blog_blocks":[...]}
${JSON_ONLY}`,
      user: `${factSheet(cluster, v)}\n\n--- LinkedIn taslağı ---\n${draft.linkedin}\n\n--- Blog blokları (JSON) ---\n${JSON.stringify(draft.blog.blocks)}`,
    })
    return {
      issues: (out.issues || []).filter((i) => i?.text),
      linkedin: out.linkedin || draft.linkedin,
      blocks: Array.isArray(out.blog_blocks) && out.blog_blocks.length ? out.blog_blocks : draft.blog.blocks,
    }
  } catch (e) {
    return {
      issues: [{ severity: 'orta', text: `Kontrol adımı çalışmadı (${e.message}). Taslağı yayınlamadan önce kendin kontrol et.` }],
      linkedin: draft.linkedin,
      blocks: draft.blog.blocks,
    }
  }
}

/* ---------------------------------------------------------------
 * 5) EDİTÖR — bugün paylaşılmalı mı?
 * ------------------------------------------------------------- */
const URGENCY = ['kesin', 'onerilir', 'istege-bagli', 'gerek-yok']

// Paylaşım temposu ve kalite çıtası (Berat: "2-3 günde bir, yalnızca üst düzey haber").
// Modelin önerisini puana ve paylaşım aralığına göre sınırlar; talimata uymasa bile çıta korunur.
export const PACE = { target: 3, minGapDays: 2, quietDays: 4 }
export function gateUrgency(urgency, rating, cadence = {}) {
  const r = Number(rating) || 0
  const since = cadence.daysSinceLast
  const rested = since == null || since >= PACE.minGapDays // son paylaşımdan bu yana yeterli ara var mı
  const quiet = since == null || since >= PACE.quietDays // uzun süredir paylaşım yok mu
  const weekFull = (cadence.sharedThisWeek || 0) >= PACE.target
  let u = URGENCY.includes(urgency) ? urgency : 'gerek-yok'
  if (u === 'kesin' && r < 9) u = 'onerilir'
  if (u === 'onerilir') {
    const goodEnough = r >= 8 || (r === 7 && quiet)
    if (!goodEnough || ((!rested || weekFull) && r < 9)) u = 'istege-bagli'
  }
  return u
}

export async function decide({ cluster, v, linkedin, issues, recent, today, cadence }) {
  const s = cluster.signals || {}
  const out = await askJSON({
    label: 'editör',
    system: `Sen Berat'ın LinkedIn büyüme stratejistisin. Berat, yapay zeka alanında güncel gelişmeleri takip edip
kendi blog yazılarıyla anlatan, piyasada tanınan bir geliştirici sesi olmak istiyor. Haber sitesi değil: az ama
ama üst düzey paylaşım: 2-3 günde bir, haftada 2-3 gönderi. Hedef, takipçilerin "bu adam kaliteli haber paylaşıyor" demesi;
sıradan bir haberle boşluk doldurmak bu itibarı zedeler.

${FOCUS}

Aciliyet derecesi seç:
- "kesin" (9-10): büyük bir laboratuvarın/aracın önemli sürümü ya da geliştirici topluluğunun bugün konuştuğu bir gelişme;
  birden fazla bağımsız kaynak ve güçlü topluluk sinyali var. Haftalık hedef dolmuş olsa bile paylaşılır.
- "onerilir" (8; 7 yalnızca son paylaşımdan bu yana 4+ gün geçtiyse): doğrulanmış, geniş yankı uyandıran sağlam bir konu.
- "istege-bagli" (5-7): fena değil ama üst düzey değil; Berat isterse paylaşır, bot önermez.
- "gerek-yok" (1-4): odak dışı, doğrulanamadı, tekrar ya da çözülmemiş kritik sorun var.
Puan çıpaları (sıkı uygula). Belirleyici olan YANKI ve ETKİ: konu dünyada ya da Türkiye'de ne kadar konuşuluyor, kaç kişiyi
etkiliyor? Berat'ın kişisel ilgi alanıyla örtüşmesi puanı belirlemez.
- 9-10: Dünya gündemi: büyük bir laboratuvarın amiral ürünü/modeli, milyonları etkileyen bir değişiklik, herkesin konuştuğu viral
  araç ya da proje (ör. yüz binlerce GitHub yıldızı, Hacker News ön sayfası, çok sayıda medya) ya da Türkiye'de geniş yankı
  uyandıran bir yapay zeka gelişmesi.
- 7-8: Geniş teknoloji ve geliştirici kitlesinde yankı uyandıran, birden çok bağımsız kaynakta konuşulan gelişme.
- 5-6: Niş ama ilginç: dar bir kitle, tek bir proje, deneysel araç. Büyük gelişme olmayan günlerde paylaşılabilir.
- 1-4: Yankısı yok, tekrar ya da zayıf.
Takipçi testi: Berat'ı takip eden biri bunu akışında görünce "bunu kaçırmamam gerekiyordu, iyi ki gördüm" der mi, yoksa
"yine rastgele bir repo" mu der? İkincisiyse en fazla 5. "Kesin" haftada bir bile çıkmayabilir; çıkmaması normaldir.
Paylaşım temposu: son paylaşımdan bu yana 2 günden az geçtiyse ya da bu hafta 3 paylaşım olduysa yalnızca 9-10 puanlı konu
paylaşılır. Uzun süredir (4+ gün) paylaşım yoksa en sağlam 7'lik konu "onerilir" olabilir; ama zayıf bir konuyla asla boşluk doldurma.
Son günlerde paylaşılan konunun tekrarı "gerek-yok"tur.

why: puanın gerekçesi, 3-4 kısa madde, mümkün olduğunca SAYILARLA (kaç bağımsız kaynak, resmi kaynak var mı,
Hacker News puanı / GitHub yıldızı, odak uyumu, haftalık durum). Abartma: neden bomba olmadığını da söyle.
tip: Berat'a bugün için tek cümlelik strateji tavsiyesi (ör. paylaşım saati, seriyi sürdürmek, yorumlara cevap vermek).
reason: Berat'a hitaben 1-2 cümle özet. best_time: önerilen saat aralığı (ör. "09:00-10:00"); hafta sonunu dikkate al.
Çıktı: {"urgency":"kesin|onerilir|istege-bagli|gerek-yok","score":7,"reason":"...","why":["..."],"tip":"...","best_time":"..."}
${JSON_ONLY}`,
    user: `Bugün: ${today}
Haftalık durum: son 7 günde ${cadence.sharedThisWeek} paylaşım (hedef 2-3, en az 2 gün arayla) · son paylaşımdan bu yana ${cadence.daysSinceLast ?? 'hiç paylaşım yok'} gün
Aday konu: ${cluster.topic} (kategori: ${cluster.category}, odak uygunluğu: ${cluster.relevance}/3)
Kaynaklar: ${cluster.sourceCount} farklı kaynak · güven: ${cluster.trust} · resmi kaynak: ${s.hasPrimary ? 'var' : 'yok'} · bağımsız medya: ${s.media ?? 0}
Topluluk sinyali: Hacker News ${s.hn || 0} puan · GitHub ${s.github || 0} yıldız · Hugging Face ${s.hf || 0} · Reddit ${s.reddit || 0} topluluk
Doğrulama: ${v.verified ? 'doğrulandı' : 'doğrulanamadı'} (güven: ${v.confidence})
Neden önemli: ${v.whyItMatters}
Kontrol notları:
${issues.length ? issues.map((i) => `- [${i.severity}] ${i.text}`).join('\n') : '- sorun yok'}
Son 7 günün konuları:
${recent.length ? recent.map((r) => `- ${r.brief_date}: ${r.headline || '-'} (${r.decision}, ${r.status})`).join('\n') : '- kayıt yok'}

--- LinkedIn taslağı ---
${linkedin}`,
  })

  const score = Math.max(1, Math.min(10, Math.round(Number(out.score) || 1)))
  const urgency = gateUrgency(out.urgency, score, cadence)
  return {
    urgency,
    decision: urgency === 'gerek-yok' ? 'paylasma' : 'paylas',
    score,
    reason: out.reason || '',
    why: (Array.isArray(out.why) ? out.why : []).filter(Boolean).slice(0, 4),
    tip: out.tip || '',
    bestTime: out.best_time || '',
  }
}

/* ---------------------------------------------------------------
 * 6) FİKİR AJANI — paylaşılacak haber yoksa bilgilendirici yazı önerir
 * ------------------------------------------------------------- */
export async function suggestIdeas({ topics, recent }) {
  try {
    const out = await askJSON({
      label: 'fikir',
      temperature: 0.7,
      system: `Sen Berat'ın içerik stratejistisin. Bugün paylaşmaya değer bir haber yok; bunun yerine Berat'ın
kendi bilgisiyle yazabileceği BİLGİLENDİRİCİ yazılar öner (ör. "Claude Code'da skill nasıl yazılır?",
"MCP sunucusu kurmanın 3 yolu", "Yapay zeka kodlama asistanında token tasarrufu").

${FOCUS}

Kurallar:
- Öneriler geliştiricilerin bu hafta konuştuğu konulara bağlansın (aşağıdaki gündem başlıklarını kullan) ama haber değil, rehber/ipucu olsun.
- Son günlerde paylaşılan konuları tekrarlama.
${CONTENT_RULES}
- Her öneri: title (en fazla 70 karakter), angle (yazının ana fikri, 1 cümle), why (neden şimdi, 1 cümle).
Çıktı: {"ideas":[{"title":"...","angle":"...","why":"..."}]}
${JSON_ONLY}`,
      user: `Bu haftanın geliştirici gündeminden başlıklar:
${topics.length ? topics.map((t) => `- ${t.topic} (${t.category})`).join('\n') : '- belirgin bir gündem yok'}
Son 7 günün paylaşımları:
${recent.length ? recent.map((r) => `- ${r.headline || '-'}`).join('\n') : '- kayıt yok'}`,
    })
    return (out.ideas || []).filter((i) => i?.title).slice(0, 3)
  } catch {
    return []
  }
}


/* ---------------------------------------------------------------
 * Ortak: yazının "Kaynaklar" listesi (resmi → medya; topluluk gönderileri hariç)
 * ------------------------------------------------------------- */
export function sourceList(cluster) {
  const order = { primary: 0, media: 1, community: 2 }
  return [...(cluster.items || [])]
    .sort((a, b) => order[a.type] - order[b.type])
    .filter((i) => i.type !== 'community')
    .slice(0, 4)
}

/* ---------------------------------------------------------------
 * 7) GÜNDEM EDİTÖRÜ — günün konularını yazmadan önce tek çağrıda sıralar (ucuz model).
 *    Her konuya aciliyet, puan, gerekçe ve yazının açısını verir.
 * ------------------------------------------------------------- */
const clampRating = (n) => Math.max(1, Math.min(10, Math.round(Number(n) || 1)))

export async function triage({ topics, recent, today, cadence, shared = [], ready = [] }) {
  if (!topics.length) return null
  const lines = topics.map((t, i) => {
    const s = t.signals || {}
    const v = t.verification
    const check = v
      ? v.verified
        ? `doğrulandı — ${v.whatHappened}${v.whyItMatters ? `\n   neden önemli: ${v.whyItMatters}` : ''}${
            v.facts?.length ? `\n   doğrulanmış bilgiler: ${v.facts.slice(0, 6).map((f) => f.fact).join(' · ')}` : ''
          }${v.howTo?.length ? `\n   denemek için: ${v.howTo.slice(0, 3).join(' · ')}` : ''}`
        : 'kaynak metinlerde doğrulanamadı'
      : 'henüz doğrulanmadı'
    return `${i}. ${t.topic}
   kategori ${t.category} · odak ${t.relevance}/3 · güven ${t.trust} · ${t.sourceCount ?? '?'} kaynak · resmi kaynak ${s.hasPrimary ? 'var' : 'yok'} · bağımsız medya ${s.media ?? 0} · HN ${s.hn || 0} puan · GitHub ${s.github || 0} yıldız · HF ${s.hf || 0} · popüler repo sürümü ${s.release ? `${s.release} yıldız` : 'yok'} · Reddit ${s.reddit || 0}
   ${check}
   örnek: ${(t.items || []).slice(0, 3).map((x) => `${x.source}: ${x.title.slice(0, 90)}${x.summary ? ` (${x.summary.slice(0, 90)})` : ''}`).join(' | ')}`
  })

  const out = await askJSON({
    label: 'gündem editörü',
    maxTokens: 7000,
    system: `Sen Berat'ın LinkedIn büyüme stratejistisin. Berat, yapay zeka alanındaki güncel gelişmeleri kendi blog
yazılarıyla anlatan, tanınan bir geliştirici sesi olmak istiyor. Haber sitesi değil: az ama üst düzey paylaşım.
2-3 günde bir, haftada 2-3 gönderi. Hedef, takipçilerin "bu adam kaliteli haber paylaşıyor" demesi; sıradan bir haberle boşluk
doldurmak bu itibarı zedeler.

${FOCUS}

Aciliyet dereceleri:
- "kesin" (9-10): büyük bir laboratuvarın/aracın önemli sürümü ya da geliştiricilerin bugün konuştuğu gelişme; birden fazla
  bağımsız kaynak ve güçlü topluluk sinyali var. NADİRDİR: en fazla bir konuya ver, çoğu gün hiçbir konu "kesin" değildir.
- "onerilir" (8; 7 yalnızca son paylaşımdan bu yana 4+ gün geçtiyse): doğrulanmış, geniş yankı uyandıran sağlam konu.
- "istege-bagli" (5-7): fena değil ama üst düzey değil; Berat isterse paylaşır, bot önermez.
- "gerek-yok" (1-4): odak dışı, tekrar ya da zayıf.
Puan çıpaları (sıkı uygula). Belirleyici olan YANKI ve ETKİ: konu dünyada ya da Türkiye'de ne kadar konuşuluyor, kaç kişiyi
etkiliyor? Berat'ın kişisel ilgi alanıyla örtüşmesi puanı belirlemez.
- 9-10: Dünya gündemi: büyük bir laboratuvarın amiral ürünü/modeli, milyonları etkileyen bir değişiklik, herkesin konuştuğu viral
  araç ya da proje (ör. yüz binlerce GitHub yıldızı, Hacker News ön sayfası, çok sayıda medya) ya da Türkiye'de geniş yankı
  uyandıran bir yapay zeka gelişmesi.
- 7-8: Geniş teknoloji ve geliştirici kitlesinde yankı uyandıran, birden çok bağımsız kaynakta konuşulan gelişme.
- 5-6: Niş ama ilginç: dar bir kitle, tek bir proje, deneysel araç. Büyük gelişme olmayan günlerde paylaşılabilir.
- 1-4: Yankısı yok, tekrar ya da zayıf.
Takipçi testi: Berat'ı takip eden biri bunu akışında görünce "bunu kaçırmamam gerekiyordu, iyi ki gördüm" der mi, yoksa
"yine rastgele bir repo" mu der? İkincisiyse en fazla 5. "Kesin" haftada bir bile çıkmayabilir; çıkmaması normaldir.
Uzun süredir (4+ gün) paylaşım yoksa en sağlam 7'lik konu "onerilir" olabilir; ama zayıf bir konuyla asla boşluk doldurma.
Tek kaynaklı ya da doğrulanamamış konu en fazla "istege-bagli" olabilir.
"Paylaşıldı" sayılan tek şey Berat'ın paylaştığını onayladığı konulardır: onların tekrarı "gerek-yok".
Sitede yazısı hazır olup Berat'ın henüz PAYLAŞMADIĞI bir konu elenmez: önemine göre puanla ve "ready" alanına o yazının
başlığını AYNEN yaz; angle'da "Yazı hazır: LinkedIn'de paylaş" de. Hazır içerik yeni yazı gerektirmediği için değerlidir.
Paylaşım temposu: son paylaşımdan bu yana 2 günden az geçtiyse ya da bu hafta 3 paylaşım olduysa yalnızca 9-10 puanlı konu paylaşılır.

Görevin: listedeki HER konu için:
- urgency ve rating (1-10)
- summary: haberin özeti, 2-3 cümle: ne oldu, kim yaptı, kimi etkiliyor. Okuyan konuyu buradan anlamalı.
- highlights: 2-3 çarpıcı nokta: en dikkat çekici somut bilgiler (sayılar, ilkler, fiyat, ölçek, performans).
- lessons: 1-2 öğretici nokta: okur bundan ne öğrenir, ne deneyebilir, işine nasıl yarar (geliştirici ve teknoloji okuru gözüyle).
- why: puanın gerekçesi, 1-2 kısa madde (kaç kaynak, ne kadar yankı); abartma
- angle: Berat'ın yazısı neye odaklanmalı — tek cümle; haber bülteni cümlesi değil
summary, highlights ve lessons YALNIZCA verilen bilgilere (doğrulanmış bilgiler, başlıklar, özetler) dayanmalı; sayıları kaynaktaki gibi
aynen yaz ("320 bin yıldız" gibi), dönüştürme ya da hesap yapma; bilinmeyeni uydurma,
bilgi azsa kısa tut ve "kaynakta ayrıntı yok" de. Her madde tek cümle, sade Türkçe.
Ayrıca: reason (Berat'a hitaben 1-2 cümle: bugün ne yapmalı), tip (tek cümle strateji tavsiyesi), best_time (ör. "09:00-10:00").

${CONTENT_RULES}
Çıktı: {"topics":[{"i":0,"urgency":"onerilir","rating":7,"summary":"...","highlights":["..."],"lessons":["..."],"why":["..."],"angle":"...","ready":""}],"reason":"...","tip":"...","best_time":"..."}
${JSON_ONLY}`,
    user: `Bugün: ${today}
Haftalık durum: son 7 günde ${cadence.sharedThisWeek} paylaşım (hedef 2-3, en az 2 gün arayla) · son paylaşımdan bu yana ${cadence.daysSinceLast ?? 'hiç paylaşım yok'} gün

Konular:
${lines.join('\n')}

Berat'ın paylaştığını onayladığı konular (son 14 gün):
${shared.length ? shared.map((t) => `- ${t}`).join('\n') : '- yok'}

Sitede yazısı hazır ama henüz paylaşılmamış konular:
${ready.length ? ready.map((t) => `- ${t}`).join('\n') : '- yok'}`,
  })

  const byIndex = new Map((out.topics || []).map((t) => [Number(t.i), t]))
  return {
    topics: topics.map((_, i) => {
      const t = byIndex.get(i) || {}
      const rating = clampRating(t.rating)
      return {
        urgency: gateUrgency(t.urgency, rating, cadence),
        rating,
        why: (Array.isArray(t.why) ? t.why : []).filter(Boolean).slice(0, 3),
        summary: typeof t.summary === 'string' ? t.summary.trim() : '',
        highlights: (Array.isArray(t.highlights) ? t.highlights : []).filter(Boolean).slice(0, 3),
        lessons: (Array.isArray(t.lessons) ? t.lessons : []).filter(Boolean).slice(0, 2),
        angle: t.angle || '',
        ready: typeof t.ready === 'string' ? t.ready.trim() : '',
      }
    }),
    reason: out.reason || '',
    tip: out.tip || '',
    bestTime: out.best_time || '',
  }
}

/* ---------------------------------------------------------------
 * 8) REVİZYON — Berat'ın talimatıyla LinkedIn metnini ve/veya blog yazısını düzeltir (kaliteli model)
 * ------------------------------------------------------------- */
export async function reviseDraft({ cluster, v, linkedin, blog, instruction, target = 'both' }) {
  const wantLinkedin = target !== 'blog'
  const wantBlog = target !== 'linkedin' && Boolean(blog?.blocks?.length)
  const shape = [
    wantLinkedin && '"linkedin":"..."',
    wantBlog && '"blog":{"title":"...","excerpt":"...","blocks":[{"type":"p","text":"..."}]}',
  ].filter(Boolean).join(',')

  const out = await askJSON({
    label: 'revizyon',
    model: WRITER_MODEL,
    temperature: 0.5,
    maxTokens: 10000,
    system: `${PERSONA}

${CONTENT_RULES}

${PLAIN_LANGUAGE}

Görevin: Berat'ın talimatına göre mevcut taslağı düzeltmek.
Kurallar:
- Talimatın istediğini yap; istemediği yerleri koru (yapı, bölümler, kaynak bilgisi).
- Yalnızca aşağıdaki doğrulanmış bilgileri kullan; listede olmayan sayı, tarih, isim, özellik, komut UYDURMA.
- Berat'ın yaşamadığı bir deneyimi yazma; yorumlar görüş olarak kalsın.
- LinkedIn metni: talimat aksini söylemiyorsa yazıya yönlendiren son cümleyi (":" ile biter) ve hashtag'leri koru; 60-130 kelime.
- Blog blocks tipi yalnızca p, h2, h3, ul, quote, code. Vurgu için **kalın** kullanabilirsin. Kaynaklar listesini yazma.
- Abartılı kalıp ("devrim", "her şey değişti", "oyunun kuralları") yok.
Çıktı: {${shape}}
${JSON_ONLY}`,
    user: `Talimat: ${instruction}

${factSheet(cluster, v)}${wantLinkedin ? `\n\n--- Mevcut LinkedIn metni ---\n${linkedin}` : ''}${wantBlog ? `\n\n--- Mevcut blog yazısı (JSON) ---\n${JSON.stringify({ title: blog.title, excerpt: blog.excerpt, blocks: blog.blocks })}` : ''}`,
  })

  return {
    linkedin: wantLinkedin && typeof out.linkedin === 'string' && out.linkedin.trim() ? out.linkedin.trim() : linkedin,
    blog:
      wantBlog && Array.isArray(out.blog?.blocks) && out.blog.blocks.length
        ? { title: out.blog.title || blog.title, excerpt: out.blog.excerpt ?? blog.excerpt, blocks: out.blog.blocks }
        : blog,
    changedBlog: wantBlog && Array.isArray(out.blog?.blocks) && out.blog.blocks.length > 0,
  }
}

/* ---------------------------------------------------------------
 * 9) LINKEDIN EDİTÖRÜ — metni 7 kurala göre denetler ve son hâlini yazar (kaliteli model).
 *    Berat paylaşırken metne bakmasın diye: her kural tek tek kontrol edilir, geçmeyen düzeltilir.
 * ------------------------------------------------------------- */
export const LINKEDIN_RULES = [
  'Açılış: ilk cümle en çarpıcı somut bilgiyle başlıyor (rakam, ölçek, bir ilk); ürün ya da repo adıyla açılmıyor',
  'İlk iki satır: tek başına konuyu söylüyor ve "devamını gör"e bastıracak merakı uyandırıyor',
  'Maddeler: 2-3 madde, herkesin anlayacağı etkiler (ne yapıyor, kimin işine yarıyor, nasıl denenir); sürüm numarası, ortam değişkeni, platform listesi yok',
  'Yorum: "Benim yorumum" net, savunulabilir bir görüş ve haberde yazmayan bir çıkarım taşıyor (ne değişiyor, kim kazanıyor); "ilginç gelişme" gibi boş yorum, çekingen uyarı ve uydurma kişisel deneyim yok',
  'Doğruluk: her bilgi doğrulanmış listede var; uydurma sayı, isim, özellik yok',
  'Dil: sade ve anlaşılır; teknik bilgisi olmayan biri de anlıyor; teknik terim yok ya da kısaca açıklanmış ("açık ağırlıklı" değil "açık kaynak"); kısa cümleler; çeviri kokan cümle, klişe ve abartı yok',
  'Biçim ve bulunabilirlik: 80-140 kelime; konunun anahtar terimleri ilk iki satırda geçiyor; sondan bir önceki satır yazıya yönlendiren tek cümle (":" ile biter); en sonda #YapayZeka, konunun ana terimi ve 1-2 geniş kitle etiketiyle 3-5 hashtag',
]

export async function polishLinkedIn({ cluster, v, linkedin, model = WRITER_MODEL }) {
  const out = await askJSON({
    label: 'linkedin editörü',
    model,
    temperature: 0.4,
    maxTokens: 6000,
    system: `${PERSONA}

${CONTENT_RULES}

${PLAIN_LANGUAGE}

Sen Berat'ın LinkedIn editörüsün. Berat paylaşırken metne bakmayacak; bu yüzden yayına çıkacak son hâli SEN yazıyorsun.
Görevin: verilen LinkedIn taslağını aşağıdaki kuralların HER BİRİNE göre tek tek denetlemek, geçmeyen her kuralı düzeltmek ve
son metni yazmak. Taslak zaten iyiyse gereksiz değiştirme. Bilgileri yalnızca doğrulanmış listeden kullan.

Kurallar:
${LINKEDIN_RULES.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Ton ve yapı örneği (kopyalama, örnek al):
---
${GOLD_LINKEDIN}
---

checks: her kural için {"rule": kural no, "ok": düzeltmeden önce geçiyor muydu, "note": tek cümle}.
score: SON metnin 7 üzerinden kaç kuralı geçtiği (son metin bütün kuralları geçmeli; geçemiyorsa nedenini note'a yaz).
Çıktı: {"checks":[{"rule":1,"ok":true,"note":"..."}],"score":7,"linkedin":"son metin"}
${JSON_ONLY}`,
    user: `${factSheet(cluster, v)}\n\n--- LinkedIn taslağı ---\n${linkedin}`,
  })
  const text = typeof out.linkedin === 'string' && out.linkedin.trim().length > 80 ? out.linkedin.trim() : linkedin
  const checks = (Array.isArray(out.checks) ? out.checks : [])
    .map((c) => ({ rule: Number(c.rule), ok: c.ok === true, note: String(c.note || '') }))
    .filter((c) => c.rule >= 1 && c.rule <= LINKEDIN_RULES.length)
  return {
    linkedin: text,
    quality: {
      score: Math.max(0, Math.min(LINKEDIN_RULES.length, Number(out.score) || 0)),
      of: LINKEDIN_RULES.length,
      checks,
      fixed: checks.filter((c) => !c.ok).length,
      at: new Date().toISOString(),
    },
  }
}
