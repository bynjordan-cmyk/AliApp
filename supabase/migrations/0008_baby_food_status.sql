-- ---------------------------------------------------------------------------
-- 0008 · Estado actual por bebé y alimento
--
-- Una única fila de ESTADO ACTUAL por (bebé, alimento). El historial de
-- eventos vive en las tablas de eventos; aquí no se duplica nada (§5, §13).
--
-- Regla de seguridad: el sistema puede mantener contadores y fechas, pero
-- NUNCA puede poner por su cuenta 'avoid' ni 'professional_supervision' a
-- partir de una inferencia algorítmica. Esos estados los decide una persona.
-- ---------------------------------------------------------------------------

create type public.food_status as enum (
  'unknown',
  'introducing',
  'observing',
  'tolerated',
  'avoid',
  'professional_supervision'
);

create type public.food_status_source as enum ('family', 'professional_plan', 'system_summary');

create table public.baby_food_status (
  baby_id uuid not null references public.babies (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete cascade,
  status public.food_status not null default 'unknown',
  first_exposure_at timestamptz,
  last_exposure_at timestamptz,
  exposure_count integer not null default 0 check (exposure_count >= 0),
  status_updated_at timestamptz not null default now(),
  status_updated_by uuid references public.profiles (id),
  status_source public.food_status_source not null default 'family',
  created_at timestamptz not null default now(),
  primary key (baby_id, food_id)
);

comment on table public.baby_food_status is
  'Estado actual (bebé, alimento). Los contadores los mantiene el sistema; el estado lo decide una persona.';

create index baby_food_status_status_idx on public.baby_food_status (baby_id, status);

-- Barrera dura: un resumen del sistema no puede declarar restricciones.
create or replace function app.guard_food_status_source()
returns trigger
language plpgsql
as $$
begin
  if new.status_source = 'system_summary'
     and new.status in ('avoid', 'professional_supervision') then
    raise exception
      'AliApp no puede establecer "%" de forma automática: ese estado lo decide una persona.',
      new.status
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger baby_food_status_guard_source
  before insert or update on public.baby_food_status
  for each row execute function app.guard_food_status_source();

-- Mantiene contadores y fechas a partir de las exposiciones factuales.
-- Solo toca contadores/fechas: jamás el estado.
create or replace function app.sync_baby_food_status_from_exposure()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.food_id is null then
    return new;
  end if;

  insert into public.baby_food_status as bfs (
    baby_id, food_id, status, first_exposure_at, last_exposure_at, exposure_count, status_source
  )
  values (new.baby_id, new.food_id, 'unknown', new.occurred_at, new.occurred_at, 1, 'family')
  on conflict (baby_id, food_id) do update
  set
    first_exposure_at = least(coalesce(bfs.first_exposure_at, new.occurred_at), new.occurred_at),
    last_exposure_at = greatest(coalesce(bfs.last_exposure_at, new.occurred_at), new.occurred_at),
    exposure_count = bfs.exposure_count + 1;

  return new;
end;
$$;

comment on function app.sync_baby_food_status_from_exposure() is
  'Actualiza contador y fechas de exposición. Nunca modifica el estado del alimento.';

create trigger exposures_sync_food_status
  after insert on public.exposures
  for each row execute function app.sync_baby_food_status_from_exposure();
