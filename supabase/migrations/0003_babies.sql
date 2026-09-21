-- ---------------------------------------------------------------------------
-- 0003 · Bebés
--
-- La edad NO se almacena: se deriva siempre de birth_date (§5).
-- ---------------------------------------------------------------------------

create table public.babies (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 80),
  birth_date date check (birth_date is null or birth_date <= current_date),
  -- p. ej. {'breastfeeding','formula','solids'}: modos activos, no diagnóstico.
  feeding_mode text[] not null default '{}'::text[],
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.babies is
  'Bebé dentro de un hogar. La edad se deriva de birth_date; nunca se guarda.';

create index babies_household_idx on public.babies (household_id) where deleted_at is null;

create trigger babies_touch_updated_at
  before update on public.babies
  for each row execute function app.touch_updated_at();
