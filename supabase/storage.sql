-- ============================================================
-- beratemek.com — Supabase Storage (cover görselleri için)
-- Bir kere çalıştırman yeter. Public bucket + RLS policy'ler.
-- SQL Editor → yapıştır → Run.
-- ============================================================

-- 1) Public bucket oluştur
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'covers',
  'covers',
  true,
  5242880,  -- 5 MB limit
  array['image/png','image/jpeg','image/jpg','image/webp','image/gif','image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- 2) Eski policy'leri temizle (idempotent olması için)
drop policy if exists "covers_public_read"   on storage.objects;
drop policy if exists "covers_auth_insert"   on storage.objects;
drop policy if exists "covers_auth_update"   on storage.objects;
drop policy if exists "covers_auth_delete"   on storage.objects;

-- 3) Public (herkes) görselleri okuyabilir
create policy "covers_public_read"
  on storage.objects for select
  using (bucket_id = 'covers');

-- 4) Sadece giriş yapmış admin yükleyebilir/günceller/silebilir
create policy "covers_auth_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'covers');

create policy "covers_auth_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'covers')
  with check (bucket_id = 'covers');

create policy "covers_auth_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'covers');