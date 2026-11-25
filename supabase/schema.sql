-- College Connect server-side storage.
-- Apply this once in Supabase SQL Editor before adding keys to the local .env.

create table if not exists public.cc_users (
  id text primary key,
  email text not null unique,
  name text not null,
  role text not null check (role in ('junior', 'senior', 'alumni', 'admin')),
  active boolean not null default true,
  verified boolean not null default false,
  password_salt text not null,
  password_hash text not null,
  profile jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cc_community_state (
  key text primary key check (key = 'main'),
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.cc_users enable row level security;
alter table public.cc_community_state enable row level security;

revoke all on table public.cc_users from anon, authenticated;
revoke all on table public.cc_community_state from anon, authenticated;
grant select, insert, update, delete on table public.cc_users to service_role;
grant select, insert, update, delete on table public.cc_community_state to service_role;
