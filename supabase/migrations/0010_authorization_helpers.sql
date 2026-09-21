-- ---------------------------------------------------------------------------
-- 0010 · Funciones de autorización
--
-- household_id es la frontera de autorización de todo el producto (§9).
-- Estas funciones son SECURITY DEFINER para poder leer household_members sin
-- entrar en recursión con sus propias políticas RLS.
-- ---------------------------------------------------------------------------

-- Perfil de aplicación del usuario autenticado.
create or replace function app.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.id from public.profiles p where p.auth_user_id = auth.uid();
$$;

-- Rol activo del usuario en un hogar (null si no es miembro activo).
create or replace function app.household_role(p_household_id uuid)
returns public.member_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select hm.role
  from public.household_members hm
  join public.profiles p on p.id = hm.profile_id
  where hm.household_id = p_household_id
    and p.auth_user_id = auth.uid()
    and hm.status = 'active';
$$;

-- Miembro activo con cualquier rol (incluido profesional de solo lectura).
create or replace function app.is_household_member(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app.household_role(p_household_id) is not null;
$$;

-- Responsable o madre/padre: gestiona el hogar y los datos clínicos.
create or replace function app.is_household_manager(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app.household_role(p_household_id) in ('owner', 'parent');
$$;

-- Puede crear eventos de rutina: responsable, madre/padre o cuidador.
create or replace function app.can_log_events(p_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app.household_role(p_household_id) in ('owner', 'parent', 'caregiver');
$$;

-- Anulación excepcional almacenada en household_members.permissions.
create or replace function app.has_permission_override(p_household_id uuid, p_key text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select (hm.permissions ->> p_key)::boolean
      from public.household_members hm
      join public.profiles p on p.id = hm.profile_id
      where hm.household_id = p_household_id
        and p.auth_user_id = auth.uid()
        and hm.status = 'active'
    ),
    false
  );
$$;

-- Ventana durante la cual un cuidador puede corregir lo que él mismo registró.
create or replace function app.caregiver_edit_window()
returns interval
language sql
immutable
as $$
  select interval '24 hours';
$$;

-- ¿Puede este usuario editar una fila de evento concreta?
--   * responsable / madre / padre: sí
--   * cuidador: solo lo que creó él y dentro de la ventana de corrección
--   * profesional de solo lectura: nunca
create or replace function app.can_edit_event(
  p_household_id uuid,
  p_created_by uuid,
  p_created_at timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when app.is_household_manager(p_household_id) then true
    when app.household_role(p_household_id) = 'caregiver' then
      p_created_by is not distinct from app.current_profile_id()
      and p_created_at > now() - app.caregiver_edit_window()
    else false
  end;
$$;

-- Comprueba la pertenencia a partir de un baby_id (para tablas puente).
create or replace function app.baby_household_id(p_baby_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select b.household_id from public.babies b where b.id = p_baby_id;
$$;

create or replace function app.episode_household_id(p_episode_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select e.household_id from public.reaction_episodes e where e.id = p_episode_id;
$$;

-- Crea un hogar con su responsable en una sola operación atómica.
-- Es el único camino para crear un hogar: no hay política de INSERT directa.
create or replace function public.create_household(p_name text, p_locale text default 'es')
returns public.households
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_profile_id uuid;
  v_household public.households;
begin
  v_profile_id := app.current_profile_id();

  if v_profile_id is null then
    raise exception 'No hay un perfil autenticado' using errcode = 'insufficient_privilege';
  end if;

  insert into public.households (name, locale)
  values (p_name, coalesce(p_locale, 'es'))
  returning * into v_household;

  insert into public.household_members (household_id, profile_id, role, status)
  values (v_household.id, v_profile_id, 'owner', 'active');

  return v_household;
end;
$$;

revoke all on function public.create_household(text, text) from public;
grant execute on function public.create_household(text, text) to authenticated;
