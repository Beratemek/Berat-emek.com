-- ============================================================
-- ZİYARETÇİ ANALİTİĞİ — Supabase → SQL Editor'de bir kez çalıştır.
-- Çerez yok, IP yok: her tarayıcı rastgele bir kimlikle sayılır.
-- Ziyaretçiler yalnızca kayıt EKLEYEBİLİR; okumayı sadece admin yapar.
-- ============================================================

create table if not exists analytics_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  visitor_id text not null,          -- tarayıcıda üretilen rastgele kimlik
  session_id text not null,          -- sekme oturumu
  type text not null,                -- pageview | read | engaged | listen | share | contact | outbound
  path text not null,
  post_kind text,                    -- blog | project (yazı/proje sayfasıysa)
  post_slug text,
  value int,                         -- read: okunan yüzde · engaged: saniye
  referrer text,                     -- yalnızca alan adı (linkedin.com, google.com…)
  lang text,                         -- sitenin seçili dili
  device text,                       -- mobile | tablet | desktop
  tz text                            -- saat dilimi (ülke/şehir tahmini için, IP tutulmaz)
);

create index if not exists analytics_events_created_idx on analytics_events (created_at desc);
create index if not exists analytics_events_slug_idx on analytics_events (post_slug) where post_slug is not null;

alter table analytics_events enable row level security;

drop policy if exists "analytics_insert_anyone" on analytics_events;
create policy "analytics_insert_anyone"
  on analytics_events for insert
  to anon, authenticated
  with check (
    type in ('pageview', 'read', 'engaged', 'listen', 'share', 'contact', 'outbound')
    and char_length(visitor_id) <= 64
    and char_length(session_id) <= 64
    and char_length(path) <= 300
    and char_length(coalesce(post_slug, '')) <= 200
    and char_length(coalesce(referrer, '')) <= 200
    and char_length(coalesce(tz, '')) <= 64
    and coalesce(value, 0) between 0 and 86400
  );

drop policy if exists "analytics_admin_read" on analytics_events;
create policy "analytics_admin_read"
  on analytics_events for select
  to authenticated
  using ((auth.jwt() ->> 'email') = 'emekberat19@gmail.com');

drop policy if exists "analytics_admin_delete" on analytics_events;
create policy "analytics_admin_delete"
  on analytics_events for delete
  to authenticated
  using ((auth.jwt() ->> 'email') = 'emekberat19@gmail.com');
