-- ---------------------------------------------------------------------------
-- 0002 · Identidad, hogares y membresía
--
-- `households` es el espacio de trabajo familiar y la frontera de autorización
-- de todo el producto. `profiles` es el perfil de aplicación ligado a
-- auth.users. `household_members` define quién puede hacer qué.
-- ---------------------------------------------------------------------------

create type public.member_role as enum ('owner', 'parent', 'caregiver', 'professional_viewer');
create type public.member_status as enum ('invited', 'active', 'revoked');

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  locale text not null default 'es',
  country_code text check (country_code is null or length(country_code) = 2),
  plan text not null default 'free',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_path text,
  locale text not null default 'es',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role public.member_role not null default 'caregiver',
  status public.member_status not null default 'invited',
  -- Solo para excepciones puntuales. El rol es la fuente principal de permisos.
  permissions jsonb not null default '{}'::jsonb,
  invited_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (household_id, profile_id)
);

comment on column public.household_members.permissions is
  'Anulaciones excepcionales. El rol manda; esto es la excepción documentada, no la regla.';

create index household_members_profile_idx on public.household_members (profile_id, status);
create index household_members_household_idx on public.household_members (household_id, status);

create trigger households_touch_updated_at
  before update on public.households
  for each row execute function app.touch_updated_at();

create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function app.touch_updated_at();

create trigger household_members_touch_updated_at
  before update on public.household_members
  for each row execute function app.touch_updated_at();

-- Crea el perfil de aplicación en cuanto Supabase Auth crea el usuario.
create or replace function app.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (auth_user_id, display_name, locale)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'locale', 'es')
  )
  on conflict (auth_user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_auth_user();
