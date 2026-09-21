-- ---------------------------------------------------------------------------
-- 0005 · Eventos factuales
--
-- Reglas de este bloque (§8, §27):
--   * occurred_at / started_at guardan cuándo pasó en la vida real,
--   * se permite registrar en diferido (fecha pasada),
--   * los síntomas NO llevan el alimento sospechoso encima,
--   * síntoma y episodio de reacción son objetos distintos,
--   * las filas de salud se borran de forma lógica (deleted_at).
-- ---------------------------------------------------------------------------

create type public.food_subject_type as enum ('baby', 'caregiver');
create type public.meal_type as enum ('breakfast', 'lunch', 'snack', 'dinner', 'other');
create type public.diaper_type as enum ('urine', 'stool', 'both');
create type public.breast_side as enum ('left', 'right', 'both');
create type public.episode_status as enum ('open', 'resolved');

-- --------------------------------------------------------------------------
-- Comidas: del bebé o de la madre/cuidador (vía lactancia el alimento materno
-- puede ser relevante, pero eso se modela como exposición, no como causa).
-- --------------------------------------------------------------------------
create table public.food_entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  subject_type public.food_subject_type not null,
  baby_id uuid references public.babies (id) on delete cascade,
  caregiver_profile_id uuid references public.profiles (id) on delete set null,
  occurred_at timestamptz not null,
  meal_type public.meal_type,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint food_entries_subject_consistent check (
    (subject_type = 'baby' and baby_id is not null and caregiver_profile_id is null)
    or (subject_type = 'caregiver' and caregiver_profile_id is not null and baby_id is null)
  )
);

create index food_entries_household_time_idx
  on public.food_entries (household_id, occurred_at desc) where deleted_at is null;
create index food_entries_baby_time_idx
  on public.food_entries (baby_id, occurred_at desc) where deleted_at is null;

create table public.food_entry_items (
  id uuid primary key default gen_random_uuid(),
  food_entry_id uuid not null references public.food_entries (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete restrict,
  amount_text text,
  is_first_exposure boolean not null default false,
  created_at timestamptz not null default now()
);

create index food_entry_items_entry_idx on public.food_entry_items (food_entry_id);
create index food_entry_items_food_idx on public.food_entry_items (food_id);

-- --------------------------------------------------------------------------
-- Lactancia
-- --------------------------------------------------------------------------
create table public.breastfeeds (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  baby_id uuid not null references public.babies (id) on delete cascade,
  feeding_parent_profile_id uuid references public.profiles (id) on delete set null,
  started_at timestamptz not null,
  ended_at timestamptz,
  side public.breast_side,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint breastfeeds_interval_valid check (ended_at is null or ended_at >= started_at)
);

create index breastfeeds_baby_time_idx
  on public.breastfeeds (baby_id, started_at desc) where deleted_at is null;

-- --------------------------------------------------------------------------
-- Pañales. Describe lo observado; no deduce ningún diagnóstico.
-- --------------------------------------------------------------------------
create table public.diaper_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  baby_id uuid not null references public.babies (id) on delete cascade,
  occurred_at timestamptz not null,
  diaper_type public.diaper_type not null,
  stool_consistency text,
  stool_color text,
  mucus boolean,
  blood_observed boolean,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.diaper_events is
  'Observación de pañal. Las propiedades son descriptivas: no implican diagnóstico.';

create index diaper_events_baby_time_idx
  on public.diaper_events (baby_id, occurred_at desc) where deleted_at is null;

-- --------------------------------------------------------------------------
-- Síntomas: observación independiente de cualquier sospecha de causa.
-- --------------------------------------------------------------------------
create table public.symptoms (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  baby_id uuid not null references public.babies (id) on delete cascade,
  -- Clave estable ('skin_rash', 'vomiting'…); el texto visible vive en el cliente.
  symptom_type text not null check (symptom_type ~ '^[a-z0-9_]+$'),
  started_at timestamptz not null,
  ended_at timestamptz,
  -- Intensidad observada por la familia, 1..3. No es una escala clínica.
  severity smallint check (severity is null or severity between 1 and 3),
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint symptoms_interval_valid check (ended_at is null or ended_at >= started_at)
);

comment on table public.symptoms is
  'Observación de síntoma. Nunca almacena el alimento sospechoso: eso se modela con exposures/episode_exposures.';

create index symptoms_baby_time_idx
  on public.symptoms (baby_id, started_at desc) where deleted_at is null;

-- --------------------------------------------------------------------------
-- Episodios de reacción: agrupan uno o varios síntomas.
-- --------------------------------------------------------------------------
create table public.reaction_episodes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  baby_id uuid not null references public.babies (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  status public.episode_status not null default 'open',
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint reaction_episodes_interval_valid check (ended_at is null or ended_at >= started_at)
);

create index reaction_episodes_baby_time_idx
  on public.reaction_episodes (baby_id, started_at desc) where deleted_at is null;

create table public.episode_symptoms (
  episode_id uuid not null references public.reaction_episodes (id) on delete cascade,
  symptom_id uuid not null references public.symptoms (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (episode_id, symptom_id)
);

create index episode_symptoms_symptom_idx on public.episode_symptoms (symptom_id);

-- --------------------------------------------------------------------------
-- Medicación: registro factual. AliApp nunca calcula ni sugiere dosis.
-- --------------------------------------------------------------------------
create table public.medication_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  baby_id uuid not null references public.babies (id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 160),
  dose_text text,
  occurred_at timestamptz not null,
  reason_text text,
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on column public.medication_events.dose_text is
  'Texto libre introducido por la familia. AliApp nunca genera ni sugiere dosis.';

create index medication_events_baby_time_idx
  on public.medication_events (baby_id, occurred_at desc) where deleted_at is null;

create trigger food_entries_touch_updated_at
  before update on public.food_entries
  for each row execute function app.touch_updated_at();
create trigger breastfeeds_touch_updated_at
  before update on public.breastfeeds
  for each row execute function app.touch_updated_at();
create trigger diaper_events_touch_updated_at
  before update on public.diaper_events
  for each row execute function app.touch_updated_at();
create trigger symptoms_touch_updated_at
  before update on public.symptoms
  for each row execute function app.touch_updated_at();
create trigger reaction_episodes_touch_updated_at
  before update on public.reaction_episodes
  for each row execute function app.touch_updated_at();
create trigger medication_events_touch_updated_at
  before update on public.medication_events
  for each row execute function app.touch_updated_at();
