-- ============================================================
-- beratemek.com — Supabase şeması (idempotent / migration-safe)
-- Mevcut tablolar varsa DROP ETMEZ, sadece eksik kolonları ekler.
-- Supabase Dashboard → SQL Editor → yapıştır → Run.
-- ============================================================

-- 1) POSTS (blog + proje)
create table if not exists posts (id uuid primary key default gen_random_uuid());

alter table posts add column if not exists kind text;
alter table posts add column if not exists title text;
alter table posts add column if not exists slug text;
alter table posts add column if not exists excerpt text;
alter table posts add column if not exists content jsonb;
alter table posts add column if not exists tags text[] default '{}';
alter table posts add column if not exists cover text;
alter table posts add column if not exists gallery text[] default '{}';
alter table posts add column if not exists published boolean default false;
alter table posts add column if not exists created_at timestamptz default now();
alter table posts add column if not exists updated_at timestamptz default now();

-- kind için check constraint (yoksa ekle)
do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'posts_kind_check'
  ) then
    alter table posts add constraint posts_kind_check check (kind in ('blog','project'));
  end if;
end $$;

-- slug unique (yoksa ekle)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'posts_slug_key') then
    begin
      alter table posts add constraint posts_slug_key unique (slug);
    exception when others then null;
    end;
  end if;
end $$;

create index if not exists posts_kind_idx on posts(kind);
create index if not exists posts_published_idx on posts(published);

-- 2) PROFILE (tekil)
create table if not exists profile (id int primary key default 1);

alter table profile add column if not exists kicker text;
alter table profile add column if not exists body text;
alter table profile add column if not exists highlights text[] default '{}';
alter table profile add column if not exists updated_at timestamptz default now();

-- id = 1 constraint (yoksa ekle)
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'profile_id_singleton') then
    alter table profile add constraint profile_id_singleton check (id = 1);
  end if;
end $$;

insert into profile (id, kicker, body, highlights)
values (
  1,
  'Senior · Front & Full-Stack',
  'Erciyes Üniversitesi Bilgisayar Mühendisliği 6. dönem öğrencisiyim...',
  array['Erciyes Üniversitesi — Bilgisayar Mühendisliği','Full-Stack · MERN','WebGL · R3F · AI']
)
on conflict (id) do nothing;

-- 3) CONTACT LINKS
create table if not exists contact_links (id uuid primary key default gen_random_uuid());

alter table contact_links add column if not exists label text;
alter table contact_links add column if not exists value text;
alter table contact_links add column if not exists href text;
alter table contact_links add column if not exists icon text;
alter table contact_links add column if not exists position int default 0;
alter table contact_links add column if not exists created_at timestamptz default now();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table posts enable row level security;
alter table profile enable row level security;
alter table contact_links enable row level security;

drop policy if exists "public_read_published_posts" on posts;
create policy "public_read_published_posts"
  on posts for select
  using (published = true);

drop policy if exists "public_read_profile" on profile;
create policy "public_read_profile"
  on profile for select using (true);

drop policy if exists "public_read_contact" on contact_links;
create policy "public_read_contact"
  on contact_links for select using (true);

drop policy if exists "auth_all_posts" on posts;
create policy "auth_all_posts"
  on posts for all
  to authenticated
  using (true) with check (true);

drop policy if exists "auth_all_profile" on profile;
create policy "auth_all_profile"
  on profile for all
  to authenticated
  using (true) with check (true);

drop policy if exists "auth_all_contact" on contact_links;
create policy "auth_all_contact"
  on contact_links for all
  to authenticated
  using (true) with check (true);

-- ============================================================
-- updated_at otomatik güncelleme trigger'ı
-- ============================================================
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists posts_updated_at on posts;
create trigger posts_updated_at
  before update on posts
  for each row execute procedure set_updated_at();

drop trigger if exists profile_updated_at on profile;
create trigger profile_updated_at
  before update on profile
  for each row execute procedure set_updated_at();