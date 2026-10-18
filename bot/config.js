// Botun ayarları. Kaynak eklemek/çıkarmak, odak konularını veya yazım üslubunu
// değiştirmek için sadece bu dosyayı düzenlemen yeterli.

// OpenRouter model kimlikleri — https://openrouter.ai/models
export const MODEL = process.env.BOT_MODEL || 'deepseek/deepseek-v4.1-flash'
// Yazar ajanı için istersen daha güçlü bir model seçebilirsin (ör. deepseek/deepseek-v4-pro)
// Okurun gördüğü metni yazan adım (yazar + revizyon) kaliteli modelde; mekanik adımlar ucuz modelde kalır.
// Yazı başı ~0,03 $; yalnızca "kesin paylaş" günlerinde ve panelden "İçerik oluştur" denince çalışır.
export const WRITER_MODEL = process.env.BOT_WRITER_MODEL || 'anthropic/claude-sonnet-5.5'

// Kaç saat geriye dönük haber toplanacak
export const HOURS = Number(process.env.BOT_HOURS || 36)

// Doğrulamaya gönderilecek en güçlü aday sayısı (her biri 1 model çağrısı)
export const TOP_CANDIDATES = 3

export const PERSONA = `Berat Emek adına yazıyorsun: Full-Stack & AI Developer; VizioWise'da kurumsal yapay zeka platformu Morf'u geliştiriyor.
LinkedIn'de Türkçe, az ve öz paylaşım yapıyor: geliştiricilerin ilgisini çeken yapay zeka gelişmeleri ve pratik rehberler.
Üslup: net, samimi ama profesyonel, abartısız. Hype yok, clickbait yok.
Berat'ın yaşamadığı bir deneyimi ("denedim, çok hızlıydı" gibi) ASLA yazma; yorumlar görüş olarak kalsın.`

// İçerik sınırları: Berat'ın kararları. Yazı, fikir ya da öneri üreten her ajan bunlara uyar.
export const CONTENT_RULES = `İçerik sınırları (kesin):
- VizioWise ve Morf'un iç teknik detayları, mimarisi, müşterileri, verisi ya da kodu hakkında yazı/fikir ÖNERME; Morf'tan yalnızca genel hatlarıyla, ürün adı olarak bahsedilebilir.
- TÜBİTAK başvurusu ve akciğer sesi projesi hiç geçmesin.
- Gizlilik Geçidi (bitirme projesi) hakkında takım onayı olmadan yazı önerme.
- Kişisel veri (telefon, adres, başkasının e-postası) yok.`

// Bot taslaklarının sonuna eklenen şeffaflık notu (bot ve panelden üretilen içerik aynı notu taşır)
export const BLOG_NOTE = 'Not: Bu yazının ilk taslağı, kaynakları tarayan yapay zeka destekli haber sistemim tarafından hazırlandı; yayınlamadan önce tarafımdan kontrol edildi.'

// Ürünleri "resmi kaynak" sayılan büyük kuruluşlar (GitHub / Hugging Face hesap adları, küçük harf).
// Bunların dışındaki trend projeler resmi duyuru değil, topluluk sinyalidir.
export const MAJOR_ORGS = [
  'openai', 'anthropics', 'google', 'google-deepmind', 'google-gemini', 'googleapis', 'meta-llama', 'facebookresearch',
  'microsoft', 'nvidia', 'deepseek-ai', 'qwen', 'qwenlm', 'mistralai', 'xai-org', 'apple', 'huggingface', 'github',
  'modelcontextprotocol', 'ollama', 'ggml-org', 'ggerganov', 'langchain-ai', 'vercel', 'cursor', 'getcursor',
  'moonshotai', 'zai-org', 'thudm', 'allenai', 'stabilityai', 'ibm-granite', 'cohereforai', 'amazon', 'aws',
]

// Editoryal odak: bot neyi haber sayar, neyi eler? (Kümeleyici, yazar ve editör bunu kullanır)
export const FOCUS = `Berat bir haber sitesi DEĞİL; yapay zeka dünyasında YANKI uyandıran gelişmeleri kendi yorumuyla anlatan bir geliştirici.
Konuyu seçen ölçüt Berat'ın kişisel ilgi alanı değil: gelişmenin dünyada ya da Türkiye'de ne kadar konuşulduğu ve kaç kişiyi etkilediği.

İLGİLİ (yankı sırasıyla):
- Büyük yapay zeka laboratuvarlarının ve ürünlerinin önemli duyuruları: yeni modeller, büyük özellikler, fiyat ve erişim değişiklikleri
  (OpenAI, Anthropic, Google, Meta, Microsoft, Apple, NVIDIA, DeepSeek, Qwen, Mistral, xAI…)
- Herkesin konuştuğu viral yapay zeka araçları ve açık kaynak projeler (GitHub'da patlayan, Hacker News ön sayfasına çıkan, çok sayıda medyada yer alan)
- Milyonlarca kullanıcıyı ya da geliştiriciyi etkileyen değişiklikler; dünyayı etkileyen büyük regülasyon ve kararlar (geliştirici gözüyle anlatılabiliyorsa)
- Türkiye'de geniş yankı uyandıran yapay zeka gelişmeleri (Türk şirketleri, kamu, Türkçe modeller)
- Geliştirici dünyasının büyük gelişmeleri: yapay zeka kodlama araçları, ajanlar, MCP, yerel modeller

İLGİSİZ (haber değeri YOK say):
- Küçük yatırım turları, değerlemeler, yönetici değişiklikleri, iş dünyası dedikodusu (dünyayı etkileyen dev hamleler hariç)
- Magazin, ünlü tartışmaları, "yapay zeka toplumu nasıl etkiler" türü genel yorum yazıları
- Reklam, etkinlik duyurusu, yalnızca hata düzeltmesi içeren küçük sürüm notları
- Yapay zeka ve yazılımla ilgisi olmayan haberler`

// type:
//   primary   → haberin ilk çıktığı resmi kaynak (şirket blogu, sürüm notu, model/proje sayfası)
//   media     → haber sitesi / uzman blogu
//   community → topluluk sinyali (ne kadar ilgi gördüğünü ölçmek için)
// aiFilter: kaynak sadece yapay zekaya odaklı değilse başlıklar anahtar kelimeyle süzülür
// limit:    akıştaki ilk N öğe alınır (gürültülü kaynaklar için)
export const FEEDS = [
  // Yapay zeka kodlama araçlarının resmi sürüm notları
  { name: 'Claude Code', url: 'https://github.com/anthropics/claude-code/releases.atom', type: 'primary' },
  { name: 'OpenAI Codex', url: 'https://github.com/openai/codex/releases.atom', type: 'primary' },
  { name: 'MCP', url: 'https://github.com/modelcontextprotocol/modelcontextprotocol/releases.atom', type: 'primary' },
  { name: 'Ollama Sürümleri', url: 'https://github.com/ollama/ollama/releases.atom', type: 'primary' },
  { name: 'LangChain', url: 'https://blog.langchain.com/rss.xml', type: 'primary' },

  // Şirket ve model blogları
  { name: 'OpenAI', url: 'https://openai.com/news/rss.xml', type: 'primary' },
  { name: 'Google DeepMind', url: 'https://deepmind.google/blog/rss.xml', type: 'primary' },
  { name: 'Google AI', url: 'https://blog.google/technology/ai/rss/', type: 'primary' },
  { name: 'Hugging Face Blog', url: 'https://huggingface.co/blog/feed.xml', type: 'primary' },
  { name: 'Mistral AI', url: 'https://mistral.ai/rss.xml', type: 'primary' },
  { name: 'Qwen', url: 'https://qwenlm.github.io/blog/index.xml', type: 'primary' },
  { name: 'Ollama', url: 'https://ollama.com/blog/rss.xml', type: 'primary' },
  { name: 'GitHub Blog', url: 'https://github.blog/ai-and-ml/feed/', type: 'primary' },

  // Teknoloji medyası ve uzman bloglar (doğrulama için ikinci kaynak)
  { name: 'Simon Willison', url: 'https://simonwillison.net/atom/everything/', type: 'media', aiFilter: true },
  { name: 'The Decoder', url: 'https://the-decoder.com/feed/', type: 'media' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/category/artificial-intelligence/feed/', type: 'media' },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed', type: 'media' },
  // Türkiye: yerelde yankı uyandıran yapay zeka gelişmeleri
  { name: 'Webrazzi', url: 'https://webrazzi.com/kategori/yapay-zeka/feed/', type: 'media' },
  { name: 'Webtekno', url: 'https://www.webtekno.com/rss.xml', type: 'media', aiFilter: true, limit: 25 },
  { name: 'ShiftDelete', url: 'https://shiftdelete.net/feed', type: 'media', aiFilter: true, limit: 20 },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', type: 'media' },
  { name: 'Ars Technica', url: 'https://arstechnica.com/ai/feed/', type: 'media' },

  // Topluluk: neyin "etrafı kasıp kavurduğunu" buradan anlıyoruz
  { name: 'r/LocalLLaMA', url: 'https://www.reddit.com/r/LocalLLaMA/top/.rss?t=day', type: 'community', limit: 10 },
  { name: 'r/mcp', url: 'https://www.reddit.com/r/mcp/top/.rss?t=day', type: 'community', limit: 8 },
  { name: 'r/ClaudeAI', url: 'https://www.reddit.com/r/ClaudeAI/top/.rss?t=day', type: 'community', limit: 8 },
  { name: 'r/LangChain', url: 'https://www.reddit.com/r/LangChain/top/.rss?t=day', type: 'community', limit: 6 },
]

// Hacker News'ten en az bu kadar puan almış yapay zeka başlıkları alınır
export const HN_MIN_POINTS = 40

// Hugging Face'te son kaç gün içinde yayınlanmış trend modeller alınır
export const HF_MAX_AGE_DAYS = 14

// GitHub'da son kaç günde açılmış ve en az kaç yıldız almış projeler "hızla yükselen" sayılır
export const GITHUB_MAX_AGE_DAYS = 10
export const GITHUB_MIN_STARS = 150
// Çok popüler yapay zeka repoları: yeni sürümleri izlenir (eski ama bir anda gündeme oturan projeler kaçmasın)
export const POPULAR_REPO_QUERIES = [
  'topic:ai-agents stars:>20000',
  'topic:mcp stars:>10000',
  'topic:claude-code stars:>5000',
  'topic:agent-skills stars:>5000',
  'topic:llm stars:>40000',
]

export const GITHUB_QUERIES = [
  'mcp',
  'claude OR "claude code" OR codex OR cursor',
  'ollama OR "llama.cpp" OR gguf OR "local llm"',
  'langchain OR langgraph OR crewai',
  'llm OR agent OR agents OR rag',
]

// İsteğe bağlı: YOUTUBE_API_KEY tanımlıysa bu aramalarla son 3 günün en çok izlenen videoları alınır
export const YOUTUBE_QUERIES = ['claude code', 'MCP server', 'AI agents']
export const YOUTUBE_MIN_VIEWS = 20000
