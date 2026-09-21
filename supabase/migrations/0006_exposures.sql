-- ---------------------------------------------------------------------------
-- 0006 · Grafo de exposiciones
--
-- Una exposición es un NODO FACTUAL: "este bebé estuvo expuesto a este
-- alimento por esta vía en este momento". No afirma causalidad (§11).
-- Los datos no se duplican: `source_id` apunta a la fila de origen.
-- ---------------------------------------------------------------------------

create type public.exposure_source_type as enum (
  'baby_food',
  'maternal_food',
  'breastfeed',
  'pumped_milk',
  'unknown'
);

create type public.episode_exposure_relation as enum ('manual', 'temporal_candidate');

-- Etiqueta DESCRIPTIVA sobre la consistencia temporal observada.
-- Nunca es un juicio médico ni una puntuación de riesgo (§10).
create type public.exposure_confidence_label as enum (
  'insufficient_data',
  'under_observation',
  'temporally_consistent',
  'inconsistent'
);

create table public.exposures (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  baby_id uuid not null references public.babies (id) on delete cascade,
  source_type public.exposure_source_type not null,
  -- Id de la fila de origen (food_entry, breastfeed, …). Sin FK porque puede
  -- apuntar a varias tablas; la integridad se mantiene desde los servicios.
  source_id uuid,
  food_id uuid references public.foods (id) on delete restrict,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

comment on table public.exposures is
  'Nodo factual del grafo longitudinal. No establece causalidad ni diagnóstico.';

create index exposures_baby_time_idx on public.exposures (baby_id, occurred_at desc);
create index exposures_food_idx on public.exposures (food_id, occurred_at desc);
create index exposures_source_idx on public.exposures (source_type, source_id);

create table public.episode_exposures (
  episode_id uuid not null references public.reaction_episodes (id) on delete cascade,
  exposure_id uuid not null references public.exposures (id) on delete cascade,
  relation_type public.episode_exposure_relation not null default 'manual',
  confidence_label public.exposure_confidence_label,
  created_at timestamptz not null default now(),
  primary key (episode_id, exposure_id)
);

comment on column public.episode_exposures.confidence_label is
  'Etiqueta descriptiva de consistencia temporal. No es una valoración médica ni un porcentaje de riesgo.';

create index episode_exposures_exposure_idx on public.episode_exposures (exposure_id);
