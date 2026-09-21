-- ---------------------------------------------------------------------------
-- Seed de DESARROLLO de AliApp.
--
-- Datos ficticios. Nunca datos reales de personas (§22).
-- Idempotente: se puede aplicar varias veces sobre la misma base.
--
-- Usuarios de ejemplo (contraseña en Supabase local: aliapp-dev)
--   parent@aliapp.test        → responsable del hogar
--   caregiver@aliapp.test     → cuidador
--   professional@aliapp.test  → profesional (solo lectura)
-- ---------------------------------------------------------------------------

-- --- Usuarios de autenticación ---------------------------------------------
insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111111', 'parent@aliapp.test',
   '{"display_name":"Lucía (madre)","locale":"es"}'::jsonb),
  ('22222222-2222-4222-8222-222222222222', 'caregiver@aliapp.test',
   '{"display_name":"Marta (cuidadora)","locale":"es"}'::jsonb),
  ('33333333-3333-4333-8333-333333333333', 'professional@aliapp.test',
   '{"display_name":"Dra. Ruiz","locale":"es"}'::jsonb)
on conflict (id) do nothing;

-- En un Supabase real, deja la contraseña lista para poder entrar en local.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'encrypted_password'
  ) then
    execute $sql$
      update auth.users
      set encrypted_password = crypt('aliapp-dev', gen_salt('bf')),
          email_confirmed_at = coalesce(email_confirmed_at, now()),
          aud = 'authenticated',
          role = 'authenticated'
      where email in ('parent@aliapp.test', 'caregiver@aliapp.test', 'professional@aliapp.test')
    $sql$;
  end if;
end;
$$;

-- El trigger on_auth_user_created ya ha creado los perfiles.

-- --- Hogar y membresía ------------------------------------------------------
insert into public.households (id, name, locale, country_code, plan)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'Familia Demo', 'es', 'ES', 'free')
on conflict (id) do nothing;

insert into public.household_members (household_id, profile_id, role, status)
select 'aaaaaaaa-0000-4000-8000-000000000001', p.id, v.role::public.member_role, 'active'
from (values
  ('parent@aliapp.test', 'owner'),
  ('caregiver@aliapp.test', 'caregiver'),
  ('professional@aliapp.test', 'professional_viewer')
) as v(email, role)
join auth.users u on u.email = v.email
join public.profiles p on p.auth_user_id = u.id
on conflict (household_id, profile_id) do nothing;

-- --- Bebé -------------------------------------------------------------------
insert into public.babies (id, household_id, name, birth_date, feeding_mode, created_by)
select
  'bbbbbbbb-0000-4000-8000-000000000001',
  'aaaaaaaa-0000-4000-8000-000000000001',
  'Bebé Demo',
  current_date - interval '8 months',
  array['breastfeeding', 'solids'],
  p.id
from public.profiles p
join auth.users u on u.id = p.auth_user_id and u.email = 'parent@aliapp.test'
on conflict (id) do nothing;

-- --- Catálogo de alimentos --------------------------------------------------
insert into public.foods (canonical_key, canonical_name, category, is_major_allergen, allergen_code, aliases)
values
  ('cow_milk',    'Cow milk',     'dairy',     true,  'milk',      '{"es":["leche de vaca","lácteos"],"en":["cow milk","dairy"]}'::jsonb),
  ('hen_egg',     'Hen egg',      'protein',   true,  'egg',       '{"es":["huevo"],"en":["egg"]}'::jsonb),
  ('peanut',      'Peanut',       'legume',    true,  'peanut',    '{"es":["cacahuete","maní"],"en":["peanut"]}'::jsonb),
  ('tree_nut',    'Tree nuts',    'nut',       true,  'tree_nuts', '{"es":["frutos secos"],"en":["tree nuts"]}'::jsonb),
  ('wheat',       'Wheat',        'cereal',    true,  'gluten',    '{"es":["trigo","gluten"],"en":["wheat","gluten"]}'::jsonb),
  ('soy',         'Soy',          'legume',    true,  'soy',       '{"es":["soja"],"en":["soy"]}'::jsonb),
  ('fish',        'Fish',         'fish',      true,  'fish',      '{"es":["pescado"],"en":["fish"]}'::jsonb),
  ('shellfish',   'Shellfish',    'shellfish', true,  'crustacea', '{"es":["marisco"],"en":["shellfish"]}'::jsonb),
  ('sesame',      'Sesame',       'seed',      true,  'sesame',    '{"es":["sésamo"],"en":["sesame"]}'::jsonb),
  ('rice',        'Rice',         'cereal',    false, null,        '{"es":["arroz"],"en":["rice"]}'::jsonb),
  ('oat',         'Oat',          'cereal',    false, null,        '{"es":["avena"],"en":["oat"]}'::jsonb),
  ('banana',      'Banana',       'fruit',     false, null,        '{"es":["plátano","banana"],"en":["banana"]}'::jsonb),
  ('apple',       'Apple',        'fruit',     false, null,        '{"es":["manzana"],"en":["apple"]}'::jsonb),
  ('pear',        'Pear',         'fruit',     false, null,        '{"es":["pera"],"en":["pear"]}'::jsonb),
  ('carrot',      'Carrot',       'vegetable', false, null,        '{"es":["zanahoria"],"en":["carrot"]}'::jsonb),
  ('zucchini',    'Zucchini',     'vegetable', false, null,        '{"es":["calabacín"],"en":["zucchini"]}'::jsonb),
  ('potato',      'Potato',       'vegetable', false, null,        '{"es":["patata"],"en":["potato"]}'::jsonb),
  ('chicken',     'Chicken',      'protein',   false, null,        '{"es":["pollo"],"en":["chicken"]}'::jsonb),
  ('lentil',      'Lentils',      'legume',    false, null,        '{"es":["lentejas"],"en":["lentils"]}'::jsonb),
  ('olive_oil',   'Olive oil',    'fat',       false, null,        '{"es":["aceite de oliva"],"en":["olive oil"]}'::jsonb)
on conflict (canonical_key) do nothing;

insert into public.food_translations (food_id, locale, display_name)
select f.id, t.locale, t.display_name
from (values
  ('cow_milk',  'es', 'Leche de vaca'), ('cow_milk',  'en', 'Cow milk'),
  ('hen_egg',   'es', 'Huevo'),          ('hen_egg',   'en', 'Hen egg'),
  ('peanut',    'es', 'Cacahuete'),      ('peanut',    'en', 'Peanut'),
  ('tree_nut',  'es', 'Frutos secos'),   ('tree_nut',  'en', 'Tree nuts'),
  ('wheat',     'es', 'Trigo'),          ('wheat',     'en', 'Wheat'),
  ('soy',       'es', 'Soja'),           ('soy',       'en', 'Soy'),
  ('fish',      'es', 'Pescado'),        ('fish',      'en', 'Fish'),
  ('shellfish', 'es', 'Marisco'),        ('shellfish', 'en', 'Shellfish'),
  ('sesame',    'es', 'Sésamo'),         ('sesame',    'en', 'Sesame'),
  ('rice',      'es', 'Arroz'),          ('rice',      'en', 'Rice'),
  ('oat',       'es', 'Avena'),          ('oat',       'en', 'Oat'),
  ('banana',    'es', 'Plátano'),        ('banana',    'en', 'Banana'),
  ('apple',     'es', 'Manzana'),        ('apple',     'en', 'Apple'),
  ('pear',      'es', 'Pera'),           ('pear',      'en', 'Pear'),
  ('carrot',    'es', 'Zanahoria'),      ('carrot',    'en', 'Carrot'),
  ('zucchini',  'es', 'Calabacín'),      ('zucchini',  'en', 'Zucchini'),
  ('potato',    'es', 'Patata'),         ('potato',    'en', 'Potato'),
  ('chicken',   'es', 'Pollo'),          ('chicken',   'en', 'Chicken'),
  ('lentil',    'es', 'Lentejas'),       ('lentil',    'en', 'Lentils'),
  ('olive_oil', 'es', 'Aceite de oliva'),('olive_oil', 'en', 'Olive oil')
) as t(canonical_key, locale, display_name)
join public.foods f on f.canonical_key = t.canonical_key
on conflict (food_id, locale) do nothing;

-- --- Eventos de ejemplo -----------------------------------------------------
-- Comida del bebé (primera exposición al huevo), ayer por la mañana.
insert into public.food_entries (id, household_id, subject_type, baby_id, occurred_at, meal_type, notes, created_by)
select
  'cccccccc-0000-4000-8000-000000000001',
  'aaaaaaaa-0000-4000-8000-000000000001',
  'baby',
  'bbbbbbbb-0000-4000-8000-000000000001',
  date_trunc('day', now()) - interval '1 day' + interval '9 hours',
  'breakfast',
  'Media cucharadita de huevo cocido.',
  p.id
from public.profiles p
join auth.users u on u.id = p.auth_user_id and u.email = 'parent@aliapp.test'
on conflict (id) do nothing;

insert into public.food_entry_items (id, food_entry_id, food_id, amount_text, is_first_exposure)
select
  'cccccccc-1000-4000-8000-000000000001',
  'cccccccc-0000-4000-8000-000000000001',
  f.id,
  '1/2 cucharadita',
  true
from public.foods f where f.canonical_key = 'hen_egg'
on conflict (id) do nothing;

-- Comida de la madre (lácteos), el mismo día.
insert into public.food_entries (id, household_id, subject_type, caregiver_profile_id, occurred_at, meal_type, created_by)
select
  'cccccccc-0000-4000-8000-000000000002',
  'aaaaaaaa-0000-4000-8000-000000000001',
  'caregiver',
  p.id,
  date_trunc('day', now()) - interval '1 day' + interval '14 hours',
  'lunch',
  p.id
from public.profiles p
join auth.users u on u.id = p.auth_user_id and u.email = 'parent@aliapp.test'
on conflict (id) do nothing;

insert into public.food_entry_items (id, food_entry_id, food_id, amount_text)
select
  'cccccccc-1000-4000-8000-000000000002',
  'cccccccc-0000-4000-8000-000000000002',
  f.id,
  'Un vaso'
from public.foods f where f.canonical_key = 'cow_milk'
on conflict (id) do nothing;

-- Toma de pecho después de la comida materna.
insert into public.breastfeeds (id, household_id, baby_id, feeding_parent_profile_id, started_at, ended_at, side, created_by)
select
  'dddddddd-0000-4000-8000-000000000001',
  'aaaaaaaa-0000-4000-8000-000000000001',
  'bbbbbbbb-0000-4000-8000-000000000001',
  p.id,
  date_trunc('day', now()) - interval '1 day' + interval '15 hours 30 minutes',
  date_trunc('day', now()) - interval '1 day' + interval '15 hours 50 minutes',
  'left',
  p.id
from public.profiles p
join auth.users u on u.id = p.auth_user_id and u.email = 'parent@aliapp.test'
on conflict (id) do nothing;

-- Exposiciones factuales derivadas de esos eventos (nodo del grafo, no causa).
insert into public.exposures (id, household_id, baby_id, source_type, source_id, food_id, occurred_at)
select
  'eeeeeeee-0000-4000-8000-000000000001',
  'aaaaaaaa-0000-4000-8000-000000000001',
  'bbbbbbbb-0000-4000-8000-000000000001',
  'baby_food',
  'cccccccc-0000-4000-8000-000000000001',
  f.id,
  date_trunc('day', now()) - interval '1 day' + interval '9 hours'
from public.foods f where f.canonical_key = 'hen_egg'
on conflict (id) do nothing;

insert into public.exposures (id, household_id, baby_id, source_type, source_id, food_id, occurred_at)
select
  'eeeeeeee-0000-4000-8000-000000000002',
  'aaaaaaaa-0000-4000-8000-000000000001',
  'bbbbbbbb-0000-4000-8000-000000000001',
  'maternal_food',
  'dddddddd-0000-4000-8000-000000000001',
  f.id,
  date_trunc('day', now()) - interval '1 day' + interval '15 hours 30 minutes'
from public.foods f where f.canonical_key = 'cow_milk'
on conflict (id) do nothing;

-- Síntoma observado, registrado por separado (sin alimento sospechoso encima).
insert into public.symptoms (id, household_id, baby_id, symptom_type, started_at, severity, notes, created_by)
select
  'ffffffff-0000-4000-8000-000000000001',
  'aaaaaaaa-0000-4000-8000-000000000001',
  'bbbbbbbb-0000-4000-8000-000000000001',
  'skin_rash',
  date_trunc('day', now()) - interval '1 day' + interval '18 hours',
  2,
  'Rojez en mejillas, sin fiebre.',
  p.id
from public.profiles p
join auth.users u on u.id = p.auth_user_id and u.email = 'parent@aliapp.test'
on conflict (id) do nothing;

-- Episodio de reacción que agrupa ese síntoma.
insert into public.reaction_episodes (id, household_id, baby_id, started_at, status, created_by)
select
  'ffffffff-1000-4000-8000-000000000001',
  'aaaaaaaa-0000-4000-8000-000000000001',
  'bbbbbbbb-0000-4000-8000-000000000001',
  date_trunc('day', now()) - interval '1 day' + interval '18 hours',
  'open',
  p.id
from public.profiles p
join auth.users u on u.id = p.auth_user_id and u.email = 'parent@aliapp.test'
on conflict (id) do nothing;

insert into public.episode_symptoms (episode_id, symptom_id)
values ('ffffffff-1000-4000-8000-000000000001', 'ffffffff-0000-4000-8000-000000000001')
on conflict do nothing;

-- Asociación episodio ↔ exposiciones: descriptiva, sin causalidad.
insert into public.episode_exposures (episode_id, exposure_id, relation_type, confidence_label)
values
  ('ffffffff-1000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-000000000001',
   'temporal_candidate', 'insufficient_data'),
  ('ffffffff-1000-4000-8000-000000000001', 'eeeeeeee-0000-4000-8000-000000000002',
   'temporal_candidate', 'insufficient_data')
on conflict do nothing;

-- Pañal de ejemplo.
insert into public.diaper_events (id, household_id, baby_id, occurred_at, diaper_type, stool_consistency, stool_color, mucus, created_by)
select
  '99999999-0000-4000-8000-000000000001',
  'aaaaaaaa-0000-4000-8000-000000000001',
  'bbbbbbbb-0000-4000-8000-000000000001',
  date_trunc('day', now()) - interval '1 day' + interval '20 hours',
  'stool',
  'loose',
  'green',
  true,
  p.id
from public.profiles p
join auth.users u on u.id = p.auth_user_id and u.email = 'caregiver@aliapp.test'
on conflict (id) do nothing;

-- Proceso de observación indicado por la familia.
insert into public.journeys (id, household_id, baby_id, journey_type, status, started_on, review_on, indicated_by, notes, created_by)
select
  '88888888-0000-4000-8000-000000000001',
  'aaaaaaaa-0000-4000-8000-000000000001',
  'bbbbbbbb-0000-4000-8000-000000000001',
  'observation',
  'active',
  current_date - 7,
  current_date + 14,
  'family',
  'Observando huevo y lácteos tras la introducción.',
  p.id
from public.profiles p
join auth.users u on u.id = p.auth_user_id and u.email = 'parent@aliapp.test'
on conflict (id) do nothing;

insert into public.journey_targets (journey_id, food_id, target_subject, action)
select '88888888-0000-4000-8000-000000000001', f.id, t.subject::public.journey_target_subject, t.action::public.journey_target_action
from (values
  ('hen_egg', 'baby', 'observe'),
  ('cow_milk', 'caregiver', 'observe')
) as t(canonical_key, subject, action)
join public.foods f on f.canonical_key = t.canonical_key
on conflict (journey_id, food_id, target_subject) do nothing;

-- Estados actuales de alimento fijados por una persona (nunca por el sistema).
insert into public.baby_food_status (baby_id, food_id, status, status_source, status_updated_by)
select
  'bbbbbbbb-0000-4000-8000-000000000001',
  f.id,
  t.status::public.food_status,
  'family',
  p.id
from (values
  ('hen_egg', 'observing'),
  ('rice', 'tolerated'),
  ('banana', 'tolerated'),
  ('peanut', 'unknown')
) as t(canonical_key, status)
join public.foods f on f.canonical_key = t.canonical_key
cross join (
  select p2.id from public.profiles p2
  join auth.users u on u.id = p2.auth_user_id and u.email = 'parent@aliapp.test'
) p
on conflict (baby_id, food_id) do update
set status = excluded.status,
    status_source = excluded.status_source,
    status_updated_by = excluded.status_updated_by,
    status_updated_at = now();
