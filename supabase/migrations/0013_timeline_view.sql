-- ---------------------------------------------------------------------------
-- 0013 · Línea de tiempo unificada
--
-- Una sola vista que normaliza todos los eventos (§16). NO existe una tabla
-- duplicada de timeline: esto se deriva de las tablas de origen.
--
-- `title_key` es una clave estable de traducción, no texto visible: el idioma
-- lo resuelve el cliente (§20). Se ordena por occurred_at (no por created_at),
-- de modo que un registro en diferido cae en su lugar real.
--
-- security_invoker = on → la vista respeta las políticas RLS de quien consulta.
-- ---------------------------------------------------------------------------

create view public.timeline_events
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
      'side', bf.side,
      'endedAt', bf.ended_at,
      'durationMinutes',
        case
          when bf.ended_at is null then null
          else round(extract(epoch from (bf.ended_at - bf.started_at)) / 60)
        end,
      'feedingParentProfileId', bf.feeding_parent_profile_id,
      'notes', bf.notes
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
      'mucus', de.mucus,
      'bloodObserved', de.blood_observed,
      'notes', de.notes
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
      'notes', me.notes
    )
  from public.medication_events me
  where me.deleted_at is null;

comment on view public.timeline_events is
  'Línea de tiempo normalizada por occurred_at. Deriva de las tablas de origen: no se duplica nada.';

grant select on public.timeline_events to authenticated;
