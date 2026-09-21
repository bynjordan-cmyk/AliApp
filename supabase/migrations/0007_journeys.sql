-- ---------------------------------------------------------------------------
-- 0007 · Procesos (journeys)
--
-- Un proceso ORGANIZA datos; no sustituye a los eventos (§12). Durante un
-- proceso el registro diario sigue siendo exactamente el mismo.
-- No se codifican duraciones ni calendarios clínicos.
-- ---------------------------------------------------------------------------

create type public.journey_type as enum (
  'tracking',
  'introduction',
  'observation',
  'exclusion',
  'reintroduction',
  'known_allergy'
);

create type public.journey_status as enum ('draft', 'active', 'paused', 'completed', 'cancelled');

create type public.journey_indicated_by as enum (
  'family',
  'pediatrician',
  'allergist',
  'dietitian',
  'other'
);

create type public.journey_target_subject as enum ('baby', 'caregiver');
create type public.journey_target_action as enum ('avoid', 'introduce', 'maintain', 'observe');

create table public.journeys (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  baby_id uuid not null references public.babies (id) on delete cascade,
  journey_type public.journey_type not null,
  status public.journey_status not null default 'draft',
  started_on date not null default current_date,
  review_on date,
  completed_on date,
  indicated_by public.journey_indicated_by not null default 'family',
  professional_name text,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint journeys_review_after_start check (review_on is null or review_on >= started_on),
  constraint journeys_completed_after_start check (completed_on is null or completed_on >= started_on)
);

create index journeys_baby_status_idx on public.journeys (baby_id, status, started_on desc);

create table public.journey_targets (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.journeys (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete restrict,
  -- Un proceso de exclusión puede afectar al bebé, a la madre/cuidador o a ambos
  -- (dos filas, una por sujeto).
  target_subject public.journey_target_subject not null,
  action public.journey_target_action not null,
  created_at timestamptz not null default now(),
  unique (journey_id, food_id, target_subject)
);

create index journey_targets_food_idx on public.journey_targets (food_id);

create trigger journeys_touch_updated_at
  before update on public.journeys
  for each row execute function app.touch_updated_at();
