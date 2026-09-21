-- ---------------------------------------------------------------------------
-- 0009 · Adjuntos (tabla central)
--
-- Bucket privado + URLs firmadas. La ruta siempre empieza por el household id
-- para que la política de Storage pueda comprobar la pertenencia (§9, §17).
-- ---------------------------------------------------------------------------

create type public.media_entity_type as enum (
  'symptom',
  'reaction_episode',
  'diaper_event',
  'food_entry',
  'journey',
  'baby'
);

create type public.media_type as enum ('photo', 'document');

create type public.media_category as enum ('skin', 'diaper', 'food', 'plan', 'other');

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  entity_type public.media_entity_type not null,
  entity_id uuid not null,
  -- Siempre '<household_id>/<entity_type>/<entity_id>/<fichero>'
  storage_path text not null unique,
  media_type public.media_type not null default 'photo',
  category public.media_category,
  captured_at timestamptz,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint media_assets_path_scoped_to_household
    check (storage_path like (household_id::text || '/%'))
);

create index media_assets_entity_idx
  on public.media_assets (entity_type, entity_id) where deleted_at is null;
create index media_assets_household_idx
  on public.media_assets (household_id, created_at desc) where deleted_at is null;
