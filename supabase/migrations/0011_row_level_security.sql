-- ---------------------------------------------------------------------------
-- 0011 · Row Level Security
--
-- Resumen de permisos (§9):
--
--   owner / parent          CRUD completo sobre los datos del hogar,
--                           gestionan invitaciones y ajustes del hogar.
--   caregiver               lee lo básico del bebé y el estado de alimentos,
--                           crea eventos de rutina, corrige SOLO lo suyo y
--                           dentro de la ventana de corrección; no toca roles,
--                           ni estados de alimento, ni borra historial clínico.
--   professional_viewer     solo lectura mientras su membresía esté activa.
--   miembro revocado        pierde todo el acceso.
--
-- El borrado de filas de salud es lógico (deleted_at). Solo owner/parent
-- conservan DELETE físico, y la app no lo usa.
-- ---------------------------------------------------------------------------

alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.household_members enable row level security;
alter table public.babies enable row level security;
alter table public.foods enable row level security;
alter table public.food_translations enable row level security;
alter table public.food_entries enable row level security;
alter table public.food_entry_items enable row level security;
alter table public.breastfeeds enable row level security;
alter table public.diaper_events enable row level security;
alter table public.symptoms enable row level security;
alter table public.reaction_episodes enable row level security;
alter table public.episode_symptoms enable row level security;
alter table public.medication_events enable row level security;
alter table public.exposures enable row level security;
alter table public.episode_exposures enable row level security;
alter table public.journeys enable row level security;
alter table public.journey_targets enable row level security;
alter table public.baby_food_status enable row level security;
alter table public.media_assets enable row level security;

-- Permisos de tabla. RLS es lo que realmente acota cada fila.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.foods, public.food_translations to anon;

-- ---------------------------------------------------------------------------
-- households
-- ---------------------------------------------------------------------------
create policy households_select_members on public.households
  for select to authenticated
  using (app.is_household_member(id));

create policy households_update_managers on public.households
  for update to authenticated
  using (app.is_household_manager(id))
  with check (app.is_household_manager(id));

-- Sin política de INSERT: los hogares se crean con public.create_household().

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create policy profiles_select_self_or_household on public.profiles
  for select to authenticated
  using (
    auth_user_id = auth.uid()
    or exists (
      select 1
      from public.household_members mine
      join public.household_members theirs on theirs.household_id = mine.household_id
      where mine.profile_id = app.current_profile_id()
        and mine.status = 'active'
        and theirs.profile_id = public.profiles.id
        and theirs.status = 'active'
    )
  );

create policy profiles_update_self on public.profiles
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- household_members · solo owner/parent gestionan roles e invitaciones
-- ---------------------------------------------------------------------------
create policy household_members_select on public.household_members
  for select to authenticated
  using (app.is_household_member(household_id));

create policy household_members_insert_managers on public.household_members
  for insert to authenticated
  with check (app.is_household_manager(household_id));

create policy household_members_update_managers on public.household_members
  for update to authenticated
  using (app.is_household_manager(household_id))
  with check (app.is_household_manager(household_id));

create policy household_members_delete_managers on public.household_members
  for delete to authenticated
  using (app.is_household_manager(household_id));

-- ---------------------------------------------------------------------------
-- babies · el cuidador lee lo básico, no edita
-- ---------------------------------------------------------------------------
create policy babies_select_members on public.babies
  for select to authenticated
  using (app.is_household_member(household_id));

create policy babies_insert_managers on public.babies
  for insert to authenticated
  with check (app.is_household_manager(household_id));

create policy babies_update_managers on public.babies
  for update to authenticated
  using (app.is_household_manager(household_id))
  with check (app.is_household_manager(household_id));

create policy babies_delete_managers on public.babies
  for delete to authenticated
  using (app.is_household_manager(household_id));

-- ---------------------------------------------------------------------------
-- Catálogo de alimentos · lectura global, escritura solo desde el servidor
-- ---------------------------------------------------------------------------
create policy foods_select_all on public.foods
  for select to authenticated, anon
  using (true);

create policy food_translations_select_all on public.food_translations
  for select to authenticated, anon
  using (true);

-- ---------------------------------------------------------------------------
-- Eventos de rutina y de salud
-- ---------------------------------------------------------------------------
create policy food_entries_select on public.food_entries
  for select to authenticated
  using (app.is_household_member(household_id));

create policy food_entries_insert on public.food_entries
  for insert to authenticated
  with check (
    app.can_log_events(household_id)
    and created_by = app.current_profile_id()
  );

create policy food_entries_update on public.food_entries
  for update to authenticated
  using (app.can_edit_event(household_id, created_by, created_at))
  with check (app.can_edit_event(household_id, created_by, created_at));

create policy food_entries_delete_managers on public.food_entries
  for delete to authenticated
  using (app.is_household_manager(household_id));

create policy food_entry_items_select on public.food_entry_items
  for select to authenticated
  using (
    exists (
      select 1 from public.food_entries fe
      where fe.id = food_entry_id and app.is_household_member(fe.household_id)
    )
  );

create policy food_entry_items_insert on public.food_entry_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.food_entries fe
      where fe.id = food_entry_id and app.can_log_events(fe.household_id)
    )
  );

create policy food_entry_items_update on public.food_entry_items
  for update to authenticated
  using (
    exists (
      select 1 from public.food_entries fe
      where fe.id = food_entry_id
        and app.can_edit_event(fe.household_id, fe.created_by, fe.created_at)
    )
  )
  with check (
    exists (
      select 1 from public.food_entries fe
      where fe.id = food_entry_id
        and app.can_edit_event(fe.household_id, fe.created_by, fe.created_at)
    )
  );

create policy food_entry_items_delete on public.food_entry_items
  for delete to authenticated
  using (
    exists (
      select 1 from public.food_entries fe
      where fe.id = food_entry_id
        and app.can_edit_event(fe.household_id, fe.created_by, fe.created_at)
    )
  );

create policy breastfeeds_select on public.breastfeeds
  for select to authenticated
  using (app.is_household_member(household_id));

create policy breastfeeds_insert on public.breastfeeds
  for insert to authenticated
  with check (app.can_log_events(household_id) and created_by = app.current_profile_id());

create policy breastfeeds_update on public.breastfeeds
  for update to authenticated
  using (app.can_edit_event(household_id, created_by, created_at))
  with check (app.can_edit_event(household_id, created_by, created_at));

create policy breastfeeds_delete_managers on public.breastfeeds
  for delete to authenticated
  using (app.is_household_manager(household_id));

create policy diaper_events_select on public.diaper_events
  for select to authenticated
  using (app.is_household_member(household_id));

create policy diaper_events_insert on public.diaper_events
  for insert to authenticated
  with check (app.can_log_events(household_id) and created_by = app.current_profile_id());

create policy diaper_events_update on public.diaper_events
  for update to authenticated
  using (app.can_edit_event(household_id, created_by, created_at))
  with check (app.can_edit_event(household_id, created_by, created_at));

create policy diaper_events_delete_managers on public.diaper_events
  for delete to authenticated
  using (app.is_household_manager(household_id));

create policy symptoms_select on public.symptoms
  for select to authenticated
  using (app.is_household_member(household_id));

create policy symptoms_insert on public.symptoms
  for insert to authenticated
  with check (app.can_log_events(household_id) and created_by = app.current_profile_id());

create policy symptoms_update on public.symptoms
  for update to authenticated
  using (app.can_edit_event(household_id, created_by, created_at))
  with check (app.can_edit_event(household_id, created_by, created_at));

create policy symptoms_delete_managers on public.symptoms
  for delete to authenticated
  using (app.is_household_manager(household_id));

create policy reaction_episodes_select on public.reaction_episodes
  for select to authenticated
  using (app.is_household_member(household_id));

create policy reaction_episodes_insert on public.reaction_episodes
  for insert to authenticated
  with check (app.can_log_events(household_id) and created_by = app.current_profile_id());

create policy reaction_episodes_update on public.reaction_episodes
  for update to authenticated
  using (app.can_edit_event(household_id, created_by, created_at))
  with check (app.can_edit_event(household_id, created_by, created_at));

create policy reaction_episodes_delete_managers on public.reaction_episodes
  for delete to authenticated
  using (app.is_household_manager(household_id));

create policy episode_symptoms_select on public.episode_symptoms
  for select to authenticated
  using (app.is_household_member(app.episode_household_id(episode_id)));

create policy episode_symptoms_insert on public.episode_symptoms
  for insert to authenticated
  with check (app.can_log_events(app.episode_household_id(episode_id)));

create policy episode_symptoms_delete on public.episode_symptoms
  for delete to authenticated
  using (app.is_household_manager(app.episode_household_id(episode_id)));

create policy medication_events_select on public.medication_events
  for select to authenticated
  using (app.is_household_member(household_id));

create policy medication_events_insert on public.medication_events
  for insert to authenticated
  with check (app.can_log_events(household_id) and created_by = app.current_profile_id());

create policy medication_events_update on public.medication_events
  for update to authenticated
  using (app.can_edit_event(household_id, created_by, created_at))
  with check (app.can_edit_event(household_id, created_by, created_at));

create policy medication_events_delete_managers on public.medication_events
  for delete to authenticated
  using (app.is_household_manager(household_id));

-- ---------------------------------------------------------------------------
-- Grafo de exposiciones
-- ---------------------------------------------------------------------------
create policy exposures_select on public.exposures
  for select to authenticated
  using (app.is_household_member(household_id));

create policy exposures_insert on public.exposures
  for insert to authenticated
  with check (app.can_log_events(household_id));

create policy exposures_update_managers on public.exposures
  for update to authenticated
  using (app.is_household_manager(household_id))
  with check (app.is_household_manager(household_id));

create policy exposures_delete_managers on public.exposures
  for delete to authenticated
  using (app.is_household_manager(household_id));

create policy episode_exposures_select on public.episode_exposures
  for select to authenticated
  using (app.is_household_member(app.episode_household_id(episode_id)));

create policy episode_exposures_insert on public.episode_exposures
  for insert to authenticated
  with check (app.can_log_events(app.episode_household_id(episode_id)));

create policy episode_exposures_update_managers on public.episode_exposures
  for update to authenticated
  using (app.is_household_manager(app.episode_household_id(episode_id)))
  with check (app.is_household_manager(app.episode_household_id(episode_id)));

create policy episode_exposures_delete_managers on public.episode_exposures
  for delete to authenticated
  using (app.is_household_manager(app.episode_household_id(episode_id)));

-- ---------------------------------------------------------------------------
-- Procesos · un cuidador no crea ni cambia planes salvo permiso explícito
-- ---------------------------------------------------------------------------
create policy journeys_select on public.journeys
  for select to authenticated
  using (app.is_household_member(household_id));

create policy journeys_insert on public.journeys
  for insert to authenticated
  with check (
    app.is_household_manager(household_id)
    or app.has_permission_override(household_id, 'manage_journeys')
  );

create policy journeys_update on public.journeys
  for update to authenticated
  using (
    app.is_household_manager(household_id)
    or app.has_permission_override(household_id, 'manage_journeys')
  )
  with check (
    app.is_household_manager(household_id)
    or app.has_permission_override(household_id, 'manage_journeys')
  );

create policy journeys_delete_managers on public.journeys
  for delete to authenticated
  using (app.is_household_manager(household_id));

create policy journey_targets_select on public.journey_targets
  for select to authenticated
  using (
    exists (
      select 1 from public.journeys j
      where j.id = journey_id and app.is_household_member(j.household_id)
    )
  );

create policy journey_targets_write on public.journey_targets
  for all to authenticated
  using (
    exists (
      select 1 from public.journeys j
      where j.id = journey_id
        and (
          app.is_household_manager(j.household_id)
          or app.has_permission_override(j.household_id, 'manage_journeys')
        )
    )
  )
  with check (
    exists (
      select 1 from public.journeys j
      where j.id = journey_id
        and (
          app.is_household_manager(j.household_id)
          or app.has_permission_override(j.household_id, 'manage_journeys')
        )
    )
  );

-- ---------------------------------------------------------------------------
-- baby_food_status · el cuidador LEE, nunca escribe el estado
-- ---------------------------------------------------------------------------
create policy baby_food_status_select on public.baby_food_status
  for select to authenticated
  using (app.is_household_member(app.baby_household_id(baby_id)));

create policy baby_food_status_insert_managers on public.baby_food_status
  for insert to authenticated
  with check (app.is_household_manager(app.baby_household_id(baby_id)));

create policy baby_food_status_update_managers on public.baby_food_status
  for update to authenticated
  using (app.is_household_manager(app.baby_household_id(baby_id)))
  with check (app.is_household_manager(app.baby_household_id(baby_id)));

create policy baby_food_status_delete_managers on public.baby_food_status
  for delete to authenticated
  using (app.is_household_manager(app.baby_household_id(baby_id)));

-- ---------------------------------------------------------------------------
-- media_assets
-- ---------------------------------------------------------------------------
create policy media_assets_select on public.media_assets
  for select to authenticated
  using (app.is_household_member(household_id));

create policy media_assets_insert on public.media_assets
  for insert to authenticated
  with check (app.can_log_events(household_id) and created_by = app.current_profile_id());

create policy media_assets_update on public.media_assets
  for update to authenticated
  using (app.can_edit_event(household_id, created_by, created_at))
  with check (app.can_edit_event(household_id, created_by, created_at));

create policy media_assets_delete_managers on public.media_assets
  for delete to authenticated
  using (app.is_household_manager(household_id));
