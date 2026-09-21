-- ---------------------------------------------------------------------------
-- 0014 · Panel de alimentos y capa de informes
--
-- Panel de alimentos (§13): agrupa alimentos por estado actual y muestra
-- hechos (número de exposiciones, primera y última, quién fijó el estado).
-- Sin rachas, sin gamificación sobre restricciones, sin puntuaciones.
--
-- Capa de informes (§18): un único punto de entrada por rango de fechas. El
-- futuro PDF consumirá esta capa, nunca las tablas sueltas desde la UI.
-- ---------------------------------------------------------------------------

create view public.allergen_board
with (security_invoker = on)
as
  select
    b.id as baby_id,
    b.household_id,
    f.id as food_id,
    f.canonical_key,
    f.canonical_name,
    f.category,
    f.is_major_allergen,
    f.allergen_code,
    coalesce(bfs.status, 'unknown'::public.food_status) as status,
    coalesce(bfs.exposure_count, 0) as exposure_count,
    bfs.first_exposure_at,
    bfs.last_exposure_at,
    bfs.status_updated_at,
    bfs.status_updated_by,
    coalesce(bfs.status_source, 'family'::public.food_status_source) as status_source
  from public.babies b
  cross join public.foods f
  left join public.baby_food_status bfs
    on bfs.baby_id = b.id and bfs.food_id = f.id
  where b.deleted_at is null
    and (bfs.baby_id is not null or f.is_major_allergen);

comment on view public.allergen_board is
  'Estado actual por alimento. Incluye los alérgenos mayores aunque no tengan historial, para que "sin introducir" sea visible.';

grant select on public.allergen_board to authenticated;

-- ---------------------------------------------------------------------------
-- Informe por rango de fechas.
-- SECURITY INVOKER (por defecto): respeta las políticas RLS de quien llama.
-- Devuelve HECHOS. No calcula causalidad, ni riesgo, ni recomendaciones.
-- ---------------------------------------------------------------------------
create or replace function public.build_report(
  p_baby_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'generatedAt', now(),
    'range', jsonb_build_object('from', p_from, 'to', p_to),
    'baby', (
      select jsonb_build_object(
        'id', b.id,
        'name', b.name,
        'birthDate', b.birth_date,
        'householdId', b.household_id,
        'feedingMode', to_jsonb(b.feeding_mode)
      )
      from public.babies b
      where b.id = p_baby_id and b.deleted_at is null
    ),
    'journeys', coalesce((
      select jsonb_agg(to_jsonb(j) order by j.started_on desc)
      from public.journeys j
      where j.baby_id = p_baby_id
        and j.status in ('active', 'paused', 'draft')
    ), '[]'::jsonb),
    'timeline', coalesce((
      select jsonb_agg(to_jsonb(t) order by t.occurred_at)
      from public.timeline_events t
      where t.baby_id = p_baby_id
        and t.occurred_at >= p_from
        and t.occurred_at < p_to
    ), '[]'::jsonb),
    'exposures', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'sourceType', e.source_type,
          'sourceId', e.source_id,
          'foodId', e.food_id,
          'canonicalKey', f.canonical_key,
          'occurredAt', e.occurred_at
        )
        order by e.occurred_at
      )
      from public.exposures e
      left join public.foods f on f.id = e.food_id
      where e.baby_id = p_baby_id
        and e.occurred_at >= p_from
        and e.occurred_at < p_to
    ), '[]'::jsonb),
    'episodes', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', re.id,
          'startedAt', re.started_at,
          'endedAt', re.ended_at,
          'status', re.status,
          'notes', re.notes,
          'symptomIds', coalesce((
            select jsonb_agg(es.symptom_id)
            from public.episode_symptoms es
            where es.episode_id = re.id
          ), '[]'::jsonb),
          'exposureIds', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'exposureId', ee.exposure_id,
                'relationType', ee.relation_type,
                'confidenceLabel', ee.confidence_label
              )
            )
            from public.episode_exposures ee
            where ee.episode_id = re.id
          ), '[]'::jsonb)
        )
        order by re.started_at
      )
      from public.reaction_episodes re
      where re.baby_id = p_baby_id
        and re.deleted_at is null
        and re.started_at >= p_from
        and re.started_at < p_to
    ), '[]'::jsonb),
    'media', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'entityType', m.entity_type,
          'entityId', m.entity_id,
          'storagePath', m.storage_path,
          'mediaType', m.media_type,
          'category', m.category,
          'capturedAt', m.captured_at
        )
        order by coalesce(m.captured_at, m.created_at)
      )
      from public.media_assets m
      join public.babies b on b.id = p_baby_id and b.household_id = m.household_id
      where m.deleted_at is null
        and coalesce(m.captured_at, m.created_at) >= p_from
        and coalesce(m.captured_at, m.created_at) < p_to
    ), '[]'::jsonb),
    'foodStatus', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'foodId', ab.food_id,
          'canonicalKey', ab.canonical_key,
          'status', ab.status,
          'exposureCount', ab.exposure_count,
          'firstExposureAt', ab.first_exposure_at,
          'lastExposureAt', ab.last_exposure_at,
          'statusSource', ab.status_source
        )
        order by ab.canonical_key
      )
      from public.allergen_board ab
      where ab.baby_id = p_baby_id
    ), '[]'::jsonb)
  );
$$;

comment on function public.build_report(uuid, timestamptz, timestamptz) is
  'Capa de informes: devuelve hechos del periodo. No infiere causalidad ni genera recomendaciones.';

grant execute on function public.build_report(uuid, timestamptz, timestamptz) to authenticated;
