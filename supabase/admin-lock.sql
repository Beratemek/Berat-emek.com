-- ============================================================
--  Yazma yetkisini yalnızca yöneticiye kilitle
--  Supabase → SQL Editor'de bir kez çalıştır (tekrar çalıştırmak zararsız).
--
--  Neden: projede herkese açık kayıt açık. Eski kurallar "giriş yapmış HERKES"
--  yazıları, profili, bağlantıları ve kapak görsellerini değiştirebilir diyordu;
--  yani biri kayıt olup e-postasını onaylasa tüm siteyi düzenleyebilirdi.
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'emekberat19@gmail.com'
$$;

-- Yazılar / projeler
drop policy if exists "auth_all_posts" on posts;
drop policy if exists "admin_all_posts" on posts;
create policy "admin_all_posts"
  on posts for all
  to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Profil
drop policy if exists "auth_all_profile" on profile;
drop policy if exists "admin_all_profile" on profile;
create policy "admin_all_profile"
  on profile for all
  to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- İletişim bağlantıları
drop policy if exists "auth_all_contact" on contact_links;
drop policy if exists "admin_all_contact" on contact_links;
create policy "admin_all_contact"
  on contact_links for all
  to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Kapak görselleri (okuma herkese açık kalır)
drop policy if exists "covers_auth_insert" on storage.objects;
drop policy if exists "covers_auth_update" on storage.objects;
drop policy if exists "covers_auth_delete" on storage.objects;
drop policy if exists "covers_admin_insert" on storage.objects;
drop policy if exists "covers_admin_update" on storage.objects;
drop policy if exists "covers_admin_delete" on storage.objects;
create policy "covers_admin_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'covers' and public.is_admin());
create policy "covers_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'covers' and public.is_admin())
  with check (bucket_id = 'covers' and public.is_admin());
create policy "covers_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'covers' and public.is_admin());

-- Kontrol: yönetici dışında birine yazma izni veren kural kaldı mı?
-- Sonuç tablosu BOŞ gelmeli (ziyaretçi analitiği kaydı bilerek hariç).
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where ('authenticated' = any (roles) or 'anon' = any (roles) or 'public' = any (roles))
  and cmd <> 'SELECT'
  and coalesce(qual, '') || coalesce(with_check, '') !~ '(is_admin|emekberat19@gmail\.com)'
  and policyname <> 'analytics_insert_anyone';
