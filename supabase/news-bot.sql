-- ============================================================
-- HABER BOTU — günlük özet tablosu
-- Supabase Dashboard → SQL Editor'de bir kez çalıştır.
-- ============================================================

create table if not exists daily_briefs (
  id uuid primary key default gen_random_uuid(),
  brief_date date not null unique,                 -- Türkiye saatine göre gün
  decision text not null check (decision in ('paylas', 'paylasma')),
  score int,                                       -- editörün 1-10 puanı
  reason text,                                     -- "Bugün paylaş çünkü…"
  best_time text,                                  -- önerilen paylaşım saati
  headline text,                                   -- seçilen konu
  linkedin_text text,                              -- kontrol edilmiş LinkedIn metni
  linkedin_comment text,                           -- ilk yoruma konacak kaynak linkleri
  check_notes jsonb default '[]',                  -- kontrolcünün bulduğu sorunlar
  facts jsonb default '[]',                        -- doğrulanmış bilgiler + kaynakları
  ideas jsonb default '[]',                        -- haber zayıfsa: bilgilendirici yazı fikirleri
  topics jsonb default '[]',                       -- günün gündemi (puan, pay, kaynaklar)
  stats jsonb default '{}',                        -- haber sayısı, maliyet, hatalı kaynaklar
  post_id uuid references posts(id) on delete set null,  -- blog taslağı
  status text not null default 'bekliyor' check (status in ('bekliyor', 'paylasildi', 'atlandi')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tablo daha önce oluşturulduysa yeni sütunu ekle
alter table daily_briefs add column if not exists ideas jsonb default '[]';

create index if not exists daily_briefs_date_idx on daily_briefs (brief_date desc);

-- Sadece admin e-postası okuyup güncelleyebilir. Bot "service role" anahtarıyla
-- yazdığı için RLS'ye takılmaz; ziyaretçiler bu tabloyu hiç göremez.
alter table daily_briefs enable row level security;

drop policy if exists "admin_all_daily_briefs" on daily_briefs;
create policy "admin_all_daily_briefs"
  on daily_briefs for all
  to authenticated
  using ((auth.jwt() ->> 'email') = 'emekberat19@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'emekberat19@gmail.com');

drop trigger if exists daily_briefs_updated_at on daily_briefs;
create trigger daily_briefs_updated_at
  before update on daily_briefs
  for each row execute procedure set_updated_at();

