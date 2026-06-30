-- ============================================================
-- /sevgilim oyunu — test soruları için bulut tablosu (idempotent)
-- Supabase Dashboard → SQL Editor → yapıştır → Run.
-- Mevcut "posts/profile/contact_links" şemasına dokunmaz.
-- ============================================================

create table if not exists public.tests (
  id text primary key,
  questions jsonb not null default '[]'::jsonb,
  updated_at timestamptz default now()
);

alter table public.tests enable row level security;

-- Linki bilen herkes okuyabilir/yazabilir (hediye sayfası için yeterli)
drop policy if exists "okuma_herkes"      on public.tests;
drop policy if exists "ekleme_herkes"     on public.tests;
drop policy if exists "guncelleme_herkes" on public.tests;

create policy "okuma_herkes"      on public.tests for select using (true);
create policy "ekleme_herkes"     on public.tests for insert with check (true);
create policy "guncelleme_herkes" on public.tests for update using (true);

-- Anlık senkron (realtime) — tablo zaten eklenmişse hatayı yok say
do $$
begin
  alter publication supabase_realtime add table public.tests;
exception when duplicate_object then null;
end $$;
