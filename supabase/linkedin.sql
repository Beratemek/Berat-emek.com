-- ============================================================
-- LINKEDIN BAĞLANTISI — Supabase → SQL Editor'de bir kez çalıştır.
-- Panelden "LinkedIn'de paylaş" için erişim anahtarı burada tutulur.
-- Bilerek HİÇBİR okuma/yazma kuralı yok: tarayıcı (admin oturumu dahil) bu tabloyu
-- göremez; yalnızca sitenin sunucu fonksiyonları (service role) erişir.
-- ============================================================

create table if not exists linkedin_auth (
  id int primary key default 1 check (id = 1),   -- tek satır
  access_token text,
  expires_at timestamptz,                         -- LinkedIn anahtarı 60 gün geçerli
  member_urn text,                                -- urn:li:person:…
  name text,
  state text,                                     -- bağlanırken tek kullanımlık doğrulama
  state_expires timestamptz,
  updated_at timestamptz default now()
);

alter table linkedin_auth enable row level security;
