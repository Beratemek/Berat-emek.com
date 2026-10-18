-- ============================================================
--  AJANLAR — Supabase → SQL Editor'de bir kez çalıştır (tekrar çalıştırmak zararsız).
--
--  agent_settings     ajanı aç/kapat + aylık yapay zeka bütçesi
--  agent_runs         her çalışmanın kaydı: ne yaptı, ne harcadı
--  agent_suggestions  öneri kutusu: ajanlar öneri bırakır, yönetici Tamam/Reddet der
--
--  Yalnızca yönetici okur/yazar. Ajanlar (GitHub Actions, Vercel fonksiyonları)
--  service role anahtarıyla yazar; RLS'e takılmaz.
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'emekberat19@gmail.com'
$$;

create table if not exists agent_settings (
  agent text primary key,
  enabled boolean not null default true,
  monthly_budget_usd numeric(8, 2) not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists agent_runs (
  id bigint generated always as identity primary key,
  agent text not null,
  started_at timestamptz not null default now(),
  ok boolean not null default true,
  summary text,
  cost_usd numeric(10, 5) not null default 0,
  details jsonb not null default '{}'
);
create index if not exists agent_runs_agent_idx on agent_runs (agent, started_at desc);

create table if not exists agent_suggestions (
  id uuid primary key default gen_random_uuid(),
  agent text not null,
  kind text not null,
  title text not null,
  body text,
  data jsonb not null default '{}',
  status text not null default 'yeni' check (status in ('yeni', 'onaylandi', 'reddedildi')),
  dedupe_key text unique,                -- aynı öneri iki kez düşmesin
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists agent_suggestions_status_idx on agent_suggestions (status, created_at desc);

alter table agent_settings enable row level security;
alter table agent_runs enable row level security;
alter table agent_suggestions enable row level security;

drop policy if exists "admin_all_agent_settings" on agent_settings;
create policy "admin_all_agent_settings"
  on agent_settings for all
  to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_all_agent_runs" on agent_runs;
create policy "admin_all_agent_runs"
  on agent_runs for all
  to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin_all_agent_suggestions" on agent_suggestions;
create policy "admin_all_agent_suggestions"
  on agent_suggestions for all
  to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Başlangıç ayarları (bütçe: yapay zeka kullanan ajanların aylık üst sınırı, dolar)
insert into agent_settings (agent, enabled, monthly_budget_usd) values
  ('gundem', true, 2.00),
  ('ceviri', true, 0.50),
  ('analiz', true, 0.20),
  ('kalite', true, 0.20),
  ('demo',   true, 0),
  ('butce',  true, 0)
on conflict (agent) do nothing;
