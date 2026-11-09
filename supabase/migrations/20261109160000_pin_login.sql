-- Username + 4-digit PIN sign-in for Y.E.S. Lemonade Startup.
-- Apply this file AFTER 20261105200000_end_early.sql. It does not change
-- public.scores, public.games, or rows in the auth schema, so old leaderboard rows stay.
-- Existing accounts get login_method 'email' and keep their password.
--
-- The browser never reads or writes the tables below. The pin-auth Edge Function
-- uses the service role. Deploy that function and set the PIN_PEPPER secret
-- before shipping a client that calls it. Do not put the service-role key in the client.

alter table public.users
  add column if not exists login_method text not null default 'email';

alter table public.users drop constraint if exists users_login_method_check;
alter table public.users
  add constraint users_login_method_check check (login_method in ('email', 'pin'));

alter table public.users
  add column if not exists username_lower text generated always as (lower(username)) stored;

create unique index if not exists users_username_lower_lookup on public.users (username_lower);

comment on column public.users.login_method is
  'email: signed up with email and password. pin: username and 4-digit PIN. Clients cannot change this.';

-- A signed-in player cannot change their role or their login method, and cannot
-- insert an account as anything but a player with email login.
-- service_role (the Edge Function) and dashboard SQL (no user JWT) still can.
-- This function must stay SECURITY INVOKER. A definer would run as the owner and
-- the current_user check would let every caller through.
create or replace function public.lock_account_flags()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  jwt_role text := coalesce(auth.role(), '');
  db_role text := coalesce(current_user, '');
begin
  if jwt_role = 'service_role' then
    return new;
  end if;
  if auth.uid() is null and db_role in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.role := 'player';
    new.login_method := 'email';
    return new;
  end if;
  new.role := old.role;
  new.login_method := old.login_method;
  return new;
end;
$$;

drop trigger if exists users_lock_account_flags on public.users;
create trigger users_lock_account_flags
  before insert or update on public.users
  for each row execute function public.lock_account_flags();

-- PIN hashes and the encrypted Auth password. No policies: default deny.
-- anon and authenticated have no grants. service_role bypasses RLS and is granted below.
create table public.pin_credentials (
  user_id uuid primary key references public.users (id) on delete cascade,
  pin_hash text not null,
  auth_secret text not null,
  failed_attempts integer not null default 0,
  lockouts integer not null default 0,
  locked_until timestamptz,
  held boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint pin_credentials_hash_shape check (char_length(pin_hash) >= 50 and pin_hash !~ '^[0-9]{4}$'),
  constraint pin_credentials_secret_shape check (char_length(auth_secret) >= 20 and auth_secret !~ '^[0-9]{4}$'),
  constraint pin_credentials_counts check (failed_attempts >= 0 and lockouts >= 0)
);

comment on table public.pin_credentials is
  'PIN verifiers. Only the pin-auth Edge Function (service role) may read or write. Do not grant this table to anon or authenticated.';

create table public.pin_attempt_buckets (
  bucket_key text primary key,
  attempts integer not null,
  window_started_at timestamptz not null,
  constraint pin_attempt_buckets_key_len check (char_length(bucket_key) between 8 and 128),
  constraint pin_attempt_buckets_attempts check (attempts >= 0)
);

comment on table public.pin_attempt_buckets is
  'Coarse network rate limits. Keys are hashes, not raw IP addresses. Clients cannot read this table.';

create table public.pin_reset_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.users (id) on delete cascade,
  target_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index pin_reset_log_created on public.pin_reset_log (created_at desc);

comment on table public.pin_reset_log is
  'Who reset a PIN. Clients cannot read it. The reset does not change anyone''s role.';

alter table public.pin_credentials enable row level security;
alter table public.pin_attempt_buckets enable row level security;
alter table public.pin_reset_log enable row level security;

alter table public.pin_credentials force row level security;
alter table public.pin_attempt_buckets force row level security;
alter table public.pin_reset_log force row level security;

revoke all on table public.pin_credentials from public, anon, authenticated;
revoke all on table public.pin_attempt_buckets from public, anon, authenticated;
revoke all on table public.pin_reset_log from public, anon, authenticated;

grant select, insert, update, delete on table public.pin_credentials to service_role;
grant select, insert, update, delete on table public.pin_attempt_buckets to service_role;
grant select, insert on table public.pin_reset_log to service_role;
