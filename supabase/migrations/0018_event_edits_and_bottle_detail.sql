-- ---------------------------------------------------------------------------
-- 0018 · Editar lo registrado, y que quede constancia
--
-- Premisa de producto: nadie registra perfecto a las cuatro de la mañana. Un
-- padre debe poder volver sobre cualquier evento y corregirlo —incluida la
-- hora en que ocurrió— sin perder nada de lo anterior.
--
-- Por eso este bloque hace tres cosas:
--
--   1. `edited_at`: marca discreta de "esto se editó después". No sustituye a
--      `updated_at` (que también cambia con el borrado lógico): solo se pone
--      cuando una persona cambia un dato visible.
--   2. `event_revisions`: historial de cambios de los registros clínicamente
--      relevantes. Lo escribe un trigger, no el cliente, así que no depende de
--      que la app se acuerde.
--   3. Biberón: `breastfeeds` pasa a cubrir también fórmula y leche extraída
--      con cantidad y marca. Se amplía la tabla existente en lugar de crear
--      otra: los datos ya registrados siguen valiendo tal cual.
--
-- Lo que NO hace: tocar las políticas RLS de los eventos. Ya permitían editar
-- (app.can_edit_event) y esa frontera se queda como está.
-- ---------------------------------------------------------------------------

-- --------------------------------------------------------------------------
-- 1 · Marca de edición
-- --------------------------------------------------------------------------
alter table public.food_entries add column edited_at timestamptz;
alter table public.breastfeeds add column edited_at timestamptz;
alter table public.diaper_events add column edited_at timestamptz;
alter table public.symptoms add column edited_at timestamptz;
alter table public.reaction_episodes add column edited_at timestamptz;
alter table public.medication_events add column edited_at timestamptz;

comment on column public.symptoms.edited_at is
  'Momento de la última corrección hecha por una persona. Null = tal como se registró.';

-- --------------------------------------------------------------------------
-- 2 · Historial de cambios
--
-- Guarda el antes y el después de cada campo que cambió. No guarda una copia
-- entera de la fila: solo la diferencia, que es lo que se quiere poder leer
-- («la hora pasó de 03:10 a 02:40»).
-- --------------------------------------------------------------------------
create table public.event_revisions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  baby_id uuid references public.babies (id) on delete cascade,
  -- Nombre de la tabla de origen ('symptoms', 'diaper_events'…).
  entity_type text not null,
  entity_id uuid not null,
  -- 'edit' para una corrección, 'delete' para un borrado lógico.
  kind text not null default 'edit' check (kind in ('edit', 'delete')),
  -- { "occurred_at": { "from": …, "to": … }, … }
  changes jsonb not null default '{}'::jsonb,
  changed_by uuid references public.profiles (id),
  changed_at timestamptz not null default now()
);

comment on table public.event_revisions is
  'Historial de correcciones de los eventos. Lo escribe un trigger: el cliente no puede falsearlo ni olvidarlo.';

create index event_revisions_entity_idx
  on public.event_revisions (entity_type, entity_id, changed_at desc);
create index event_revisions_household_idx
  on public.event_revisions (household_id, changed_at desc);

-- Campos que no cuentan como "cambio visible": son fontanería.
create or replace function app.revision_ignored_keys()
returns text[]
language sql
immutable
as $$
  select array['updated_at', 'edited_at', 'created_at', 'created_by', 'id', 'household_id'];
$$;

/**
 * Registra la diferencia de una actualización.
 *
 * Es SECURITY DEFINER a propósito: el historial no debe depender de que quien
 * edita tenga permiso de escritura sobre `event_revisions`. Nadie puede
 * insertar ahí a mano (no hay política de INSERT para authenticated).
 */
create or replace function app.track_event_edit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_old jsonb := to_jsonb(old);
  v_new jsonb := to_jsonb(new);
  v_changes jsonb := '{}'::jsonb;
  v_key text;
  v_ignored text[] := app.revision_ignored_keys();
  v_is_delete boolean;
  v_is_restore boolean;
begin
  for v_key in select jsonb_object_keys(v_new) loop
    continue when v_key = any (v_ignored);
    if v_old -> v_key is distinct from v_new -> v_key then
      v_changes := v_changes || jsonb_build_object(
        v_key,
        jsonb_build_object('from', v_old -> v_key, 'to', v_new -> v_key)
      );
    end if;
  end loop;

  -- Nada visible cambió: ni marca de edición ni fila de historial.
  if v_changes = '{}'::jsonb then
    return new;
  end if;

  v_is_delete := (v_changes ? 'deleted_at') and (v_new ->> 'deleted_at') is not null;
  v_is_restore := (v_changes ? 'deleted_at') and (v_new ->> 'deleted_at') is null;

  -- Un borrado lógico no es una "edición": no debe pintar el sello "Editado".
  if not v_is_delete and not v_is_restore then
    new.edited_at := now();
  end if;

  insert into public.event_revisions (
    household_id, baby_id, entity_type, entity_id, kind, changes, changed_by
  )
  values (
    new.household_id,
    case when v_new ? 'baby_id' then (v_new ->> 'baby_id')::uuid else null end,
    tg_table_name,
    new.id,
    case when v_is_delete then 'delete' else 'edit' end,
    v_changes,
    app.current_profile_id()
  );

  return new;
end;
$$;

-- El orden importa: `touch_updated_at` ya corre BEFORE UPDATE. Los nombres
-- hacen que `track_event_edit` se ejecute después (PostgreSQL ordena los
-- triggers del mismo evento por nombre), de modo que updated_at no se cuela
-- como diferencia… y aunque se colara, está en la lista de ignorados.
create trigger food_entries_track_edit
  before update on public.food_entries
  for each row execute function app.track_event_edit();
create trigger breastfeeds_track_edit
  before update on public.breastfeeds
  for each row execute function app.track_event_edit();
create trigger diaper_events_track_edit
  before update on public.diaper_events
  for each row execute function app.track_event_edit();
create trigger symptoms_track_edit
  before update on public.symptoms
  for each row execute function app.track_event_edit();
create trigger reaction_episodes_track_edit
  before update on public.reaction_episodes
  for each row execute function app.track_event_edit();
create trigger medication_events_track_edit
  before update on public.medication_events
  for each row execute function app.track_event_edit();

-- RLS: el historial se lee, no se escribe desde el cliente.
alter table public.event_revisions enable row level security;

grant select on public.event_revisions to authenticated;

create policy event_revisions_read on public.event_revisions
  for select to authenticated
  using (app.is_household_member(household_id));

-- --------------------------------------------------------------------------
-- 3 · Biberón: fórmula y leche extraída con cantidad y marca
--
-- `breastfeeds` pasa a ser "toma de leche". Lo ya registrado es 'breast', que
-- es exactamente lo que era.
-- --------------------------------------------------------------------------
create type public.feed_kind as enum ('breast', 'formula', 'pumped_milk');

-- La fórmula pasa a ser una vía de exposición con nombre propio. Sigue siendo
-- un hecho ("el bebé tomó fórmula a esta hora"), nunca una causa (§11).
alter type public.exposure_source_type add value if not exists 'formula';

alter table public.breastfeeds
  add column feed_kind public.feed_kind not null default 'breast',
  -- Cantidad tomada, en mililitros. Opcional: se puede completar después.
  add column amount_ml integer check (amount_ml is null or amount_ml between 1 and 1000),
  -- Marca del preparado, tal como la escribe la familia.
  add column brand text check (brand is null or length(btrim(brand)) between 1 and 120);

comment on column public.breastfeeds.feed_kind is
  'Vía de la toma. AliApp no valora ninguna por encima de otra: solo registra cuál fue.';
comment on column public.breastfeeds.amount_ml is
  'Cantidad observada. AliApp nunca sugiere cuánto debe tomar un bebé (§10).';

-- El lado solo tiene sentido en una toma de pecho.
alter table public.breastfeeds
  add constraint breastfeeds_side_only_for_breast
  check (side is null or feed_kind = 'breast');

-- --------------------------------------------------------------------------
-- 4 · La vista de línea de tiempo cuenta lo que ahora sabemos
--
-- Mismas columnas que antes (así `build_report` sigue funcionando sin tocar):
-- lo que crece es el jsonb de metadatos. Añade la marca de edición, el detalle
-- de deposición de 0015 y el detalle de biberón.
-- --------------------------------------------------------------------------
create or replace view public.timeline_events
with (security_invoker = on)
as
  select
    fe.id,
    'food_entry'::text as type,
    fe.household_id,
    fe.baby_id,
    fe.occurred_at,
    'timeline.foodEntry'::text as title_key,
    fe.created_by as actor_profile_id,
    'food_entries'::text as source_table,
    jsonb_build_object(
      'subjectType', fe.subject_type,
      'mealType', fe.meal_type,
      'caregiverProfileId', fe.caregiver_profile_id,
      'notes', fe.notes,
      'createdAt', fe.created_at,
      'editedAt', fe.edited_at,
      'foods', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'foodId', fi.food_id,
              'canonicalKey', f.canonical_key,
              'isFirstExposure', fi.is_first_exposure,
              'amountText', fi.amount_text
            )
            order by fi.created_at
          )
          from public.food_entry_items fi
          join public.foods f on f.id = fi.food_id
          where fi.food_entry_id = fe.id
        ),
        '[]'::jsonb
      )
    ) as metadata
  from public.food_entries fe
  where fe.deleted_at is null

  union all

  select
    bf.id,
    'breastfeed'::text,
    bf.household_id,
    bf.baby_id,
    bf.started_at,
    'timeline.breastfeed'::text,
    bf.created_by,
    'breastfeeds'::text,
    jsonb_build_object(
      'feedKind', bf.feed_kind,
      'side', bf.side,
      'amountMl', bf.amount_ml,
      'brand', bf.brand,
      'endedAt', bf.ended_at,
      'durationMinutes',
        case
          when bf.ended_at is null then null
          else round(extract(epoch from (bf.ended_at - bf.started_at)) / 60)
        end,
      'feedingParentProfileId', bf.feeding_parent_profile_id,
      'notes', bf.notes,
      'createdAt', bf.created_at,
      'editedAt', bf.edited_at
    )
  from public.breastfeeds bf
  where bf.deleted_at is null

  union all

  select
    de.id,
    'diaper_event'::text,
    de.household_id,
    de.baby_id,
    de.occurred_at,
    'timeline.diaper'::text,
    de.created_by,
    'diaper_events'::text,
    jsonb_build_object(
      'diaperType', de.diaper_type,
      'stoolConsistency', de.stool_consistency,
      'stoolColor', de.stool_color,
      'stoolAmount', de.stool_amount,
      'mucus', de.mucus,
      'bloodObserved', de.blood_observed,
      'visibleFoodResidue', de.visible_food_residue,
      'straining', de.straining,
      'unusualOdor', de.unusual_odor,
      'notes', de.notes,
      'createdAt', de.created_at,
      'editedAt', de.edited_at
    )
  from public.diaper_events de
  where de.deleted_at is null

  union all

  select
    s.id,
    'symptom'::text,
    s.household_id,
    s.baby_id,
    s.started_at,
    'timeline.symptom'::text,
    s.created_by,
    'symptoms'::text,
    jsonb_build_object(
      'symptomType', s.symptom_type,
      'severity', s.severity,
      'endedAt', s.ended_at,
      'notes', s.notes,
      'createdAt', s.created_at,
      'editedAt', s.edited_at,
      'episodeIds', coalesce(
        (
          select jsonb_agg(es.episode_id)
          from public.episode_symptoms es
          where es.symptom_id = s.id
        ),
        '[]'::jsonb
      )
    )
  from public.symptoms s
  where s.deleted_at is null

  union all

  select
    re.id,
    'reaction_episode'::text,
    re.household_id,
    re.baby_id,
    re.started_at,
    'timeline.episode'::text,
    re.created_by,
    'reaction_episodes'::text,
    jsonb_build_object(
      'status', re.status,
      'endedAt', re.ended_at,
      'notes', re.notes,
      'createdAt', re.created_at,
      'editedAt', re.edited_at,
      'symptomCount', (
        select count(*) from public.episode_symptoms es where es.episode_id = re.id
      )
    )
  from public.reaction_episodes re
  where re.deleted_at is null

  union all

  select
    me.id,
    'medication_event'::text,
    me.household_id,
    me.baby_id,
    me.occurred_at,
    'timeline.medication'::text,
    me.created_by,
    'medication_events'::text,
    jsonb_build_object(
      'name', me.name,
      'doseText', me.dose_text,
      'reasonText', me.reason_text,
      'notes', me.notes,
      'createdAt', me.created_at,
      'editedAt', me.edited_at
    )
  from public.medication_events me
  where me.deleted_at is null;
