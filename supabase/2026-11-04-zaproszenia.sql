-- =====================================================================
-- Struktura Grupy VIZJA – aktualizacja z 4.11.2026: zaproszenia (linki logowania ważne 7 dni)
-- Uruchom raz: Supabase → SQL Editor → New query → wklej CAŁOŚĆ → Run.
-- Nie zmienia ani nie usuwa istniejących danych. Można uruchomić ponownie.
-- =====================================================================
do $upd$
begin
  execute $s$
    create table if not exists public.invites (
      token_hash text primary key,
      email      text not null,
      created_by text not null default '',
      created_at timestamptz not null default now(),
      expires_at timestamptz not null,
      used_at    timestamptz
    )
  $s$;
  -- tabela tylko dla serwera (klucz serwisowy); przeglądarki nie mają do niej dostępu
  execute 'alter table public.invites enable row level security';
  execute 'revoke all on public.invites from anon, authenticated';
  execute 'grant all on public.invites to service_role';
  execute 'create index if not exists invites_email_idx on public.invites(email)';
  perform pg_notify('pgrst', 'reload schema');
end
$upd$;
