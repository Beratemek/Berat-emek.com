-- ============================================================
-- İÇERİK ÇEVİRİLERİ — Supabase → SQL Editor'de bir kez çalıştır.
-- Yazı ve projelerin 9 dildeki çevirileri. Çeviri betiği (bot/translate.js)
-- Türkçe içerik değiştikçe çevirileri yeniler; site seçili dildeki çeviriyi gösterir.
-- ============================================================

create table if not exists post_translations (
  post_id uuid not null references posts(id) on delete cascade,
  lang text not null check (lang in ('en', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'zh', 'ja')),
  title text,
  excerpt text,
  tags text[] default '{}',
  content jsonb,
  source_hash text not null,          -- çevrilen Türkçe içeriğin özeti; değişince yeniden çevrilir
  updated_at timestamptz not null default now(),
  primary key (post_id, lang)
);

alter table post_translations enable row level security;

-- Herkes yalnızca yayındaki içeriklerin çevirilerini okuyabilir
drop policy if exists "translations_public_read" on post_translations;
create policy "translations_public_read"
  on post_translations for select
  using (exists (select 1 from posts p where p.id = post_id and p.published));

-- Admin her şeyi yapabilir (bot service role ile yazar, RLS'e takılmaz)
drop policy if exists "translations_admin_all" on post_translations;
create policy "translations_admin_all"
  on post_translations for all
  to authenticated
  using ((auth.jwt() ->> 'email') = 'emekberat19@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'emekberat19@gmail.com');
