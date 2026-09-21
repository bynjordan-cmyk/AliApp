-- ---------------------------------------------------------------------------
-- 0016 · Recordatorios y preferencias de notificación
--
-- Regla de producto: AliApp NO impone horarios. No existe un "cada 3 horas"
-- por defecto, ni intervalos clínicos sugeridos. Cada recordatorio lo crea una
-- persona, con la fecha y la repetición que ella decide.
--
-- Las preferencias son POR CUIDADOR: dos personas del mismo hogar pueden
-- querer avisos distintos, y cada una manda sobre las suyas.
-- ---------------------------------------------------------------------------

create type public.reminder_category as enum (
  'feeding',
  'breastfeeding',
  'symptom_followup',
  'open_episode',
  'medication',
  'journey_review',
  'reintroduction',
  'daily_summary',
  'household_updates'
);

create type public.reminder_status as enum ('scheduled', 'done', 'snoozed', 'cancelled');

-- --------------------------------------------------------------------------
-- Preferencias por cuidador y categoría
-- --------------------------------------------------------------------------
create table public.notification_preferences (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  category public.reminder_category not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, household_id, category)
);

comment on table public.notification_preferences is
  'Qué avisos quiere recibir cada cuidador. Nadie puede cambiar las preferencias de otra persona.';

-- --------------------------------------------------------------------------
-- Ajustes globales de avisos de una persona en un hogar
-- --------------------------------------------------------------------------
create table public.notification_settings (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  -- Interruptor general: si está apagado, no se envía nada.
  push_enabled boolean not null default false,
  -- Horas de silencio en hora local del dispositivo, formato HH:MM.
  quiet_hours_start time,
  quiet_hours_end time,
  device_timezone text,
  -- Token del dispositivo (Expo). Puede faltar: los recordatorios locales
  -- funcionan sin él.
  push_token text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, household_id)
);

-- --------------------------------------------------------------------------
-- Recordatorios concretos
-- --------------------------------------------------------------------------
create table public.reminders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  baby_id uuid references public.babies (id) on delete cascade,
  -- Dueño del recordatorio: solo esta persona lo ve y lo gestiona.
  profile_id uuid not null references public.profiles (id) on delete cascade,
  category public.reminder_category not null,
  -- Texto que escribe la familia. AliApp no redacta indicaciones clínicas.
  title text not null check (length(btrim(title)) between 1 and 160),
  notes text,
  scheduled_for timestamptz not null,
  -- Repetición elegida por la persona, en minutos. Sin valor por defecto:
  -- un recordatorio no se repite salvo que alguien lo pida.
  repeat_minutes integer check (repeat_minutes is null or repeat_minutes between 5 and 20160),
  status public.reminder_status not null default 'scheduled',
  -- Evento que lo originó (un síntoma que se quiere revisar, un episodio…).
  related_entity_type text,
  related_entity_id uuid,
  -- Identificador de la notificación local programada en el dispositivo.
  local_notification_id text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index reminders_profile_time_idx
  on public.reminders (profile_id, scheduled_for)
  where deleted_at is null and status = 'scheduled';
create index reminders_household_idx
  on public.reminders (household_id, scheduled_for desc) where deleted_at is null;

create trigger notification_preferences_touch_updated_at
  before update on public.notification_preferences
  for each row execute function app.touch_updated_at();
create trigger notification_settings_touch_updated_at
  before update on public.notification_settings
  for each row execute function app.touch_updated_at();
create trigger reminders_touch_updated_at
  before update on public.reminders
  for each row execute function app.touch_updated_at();

-- --------------------------------------------------------------------------
-- RLS: los avisos son personales
-- --------------------------------------------------------------------------
alter table public.notification_preferences enable row level security;
alter table public.notification_settings enable row level security;
alter table public.reminders enable row level security;

grant select, insert, update, delete
  on public.notification_preferences, public.notification_settings, public.reminders
  to authenticated;

-- Preferencias: cada persona gestiona las suyas, y solo mientras sea miembro
-- activo del hogar.
create policy notification_preferences_own on public.notification_preferences
  for all to authenticated
  using (
    profile_id = app.current_profile_id()
    and app.is_household_member(household_id)
  )
  with check (
    profile_id = app.current_profile_id()
    and app.is_household_member(household_id)
  );

create policy notification_settings_own on public.notification_settings
  for all to authenticated
  using (
    profile_id = app.current_profile_id()
    and app.is_household_member(household_id)
  )
  with check (
    profile_id = app.current_profile_id()
    and app.is_household_member(household_id)
  );

-- Recordatorios: también personales. Un responsable no ve ni edita los avisos
-- privados de otro cuidador.
create policy reminders_own on public.reminders
  for all to authenticated
  using (
    profile_id = app.current_profile_id()
    and app.is_household_member(household_id)
  )
  with check (
    profile_id = app.current_profile_id()
    and app.can_log_events(household_id)
  );
