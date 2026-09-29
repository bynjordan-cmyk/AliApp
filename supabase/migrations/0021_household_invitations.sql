-- Invitations are single-use bearer codes, stored only as hashes.
create table public.household_invitations (
 id uuid primary key default gen_random_uuid(),
 household_id uuid not null references public.households(id) on delete cascade,
 role public.member_role not null check(role in ('caregiver','professional_viewer')),
 token_hash text not null unique,
 expires_at timestamptz not null default now()+interval '7 days',
 created_by uuid references public.profiles(id),
 accepted_by uuid references public.profiles(id),
 accepted_at timestamptz,
 revoked_at timestamptz,
 created_at timestamptz not null default now()
);
alter table public.household_invitations enable row level security;
grant select on public.household_invitations to authenticated;
create policy invitations_managers_read on public.household_invitations for select to authenticated using(app.is_household_manager(household_id));

create function app.issue_household_invite(p_household uuid,p_role public.member_role)
returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare code text; invite public.household_invitations;
begin
 if not coalesce(app.is_household_manager(p_household),false) or p_role is null or p_role not in ('caregiver','professional_viewer') then raise exception 'Not allowed' using errcode='42501'; end if;
 code:=gen_random_uuid()::text || gen_random_uuid()::text;
 insert into public.household_invitations(household_id,role,token_hash,created_by)
 values(p_household,p_role,encode(digest(code,'sha256'),'hex'),app.current_profile_id()) returning * into invite;
 return jsonb_build_object('id',invite.id,'code',code,'expiresAt',invite.expires_at);
end $$;
create function app.accept_household_invite(p_code text)
returns uuid language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare invite public.household_invitations; person uuid:=app.current_profile_id();
begin
 if person is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select * into invite from public.household_invitations where token_hash=encode(digest(p_code,'sha256'),'hex') for update;
 if invite.id is null or invite.expires_at<=now() or invite.revoked_at is not null or invite.accepted_at is not null then raise exception 'Invalid invitation' using errcode='42501'; end if;
 if exists(select 1 from public.household_members where household_id=invite.household_id and profile_id=person and status='active') then raise exception 'Already a member' using errcode='23505'; end if;
 insert into public.household_members(household_id,profile_id,role,status,invited_by)
 values(invite.household_id,person,invite.role,'active',invite.created_by)
 on conflict(household_id,profile_id) do update set role=excluded.role,status='active',permissions='{}',invited_by=excluded.invited_by;
 update public.household_invitations set accepted_at=now(),accepted_by=person where id=invite.id;
 return invite.household_id;
end $$;
create function app.revoke_household_invite(p_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 update public.household_invitations set revoked_at=now() where id=p_id and accepted_at is null and app.is_household_manager(household_id);
 if not found then raise exception 'Not allowed' using errcode='42501'; end if;
end $$;
revoke all on function app.issue_household_invite(uuid,public.member_role), app.accept_household_invite(text),app.revoke_household_invite(uuid) from public,anon;
grant execute on function app.issue_household_invite(uuid,public.member_role), app.accept_household_invite(text),app.revoke_household_invite(uuid) to authenticated;
create function public.issue_household_invite(p_household uuid,p_role public.member_role) returns jsonb language sql security invoker set search_path=public,pg_temp as $$select app.issue_household_invite(p_household,p_role)$$;
create function public.accept_household_invite(p_code text) returns uuid language sql security invoker set search_path=public,pg_temp as $$select app.accept_household_invite(p_code)$$;
create function public.revoke_household_invite(p_id uuid) returns void language sql security invoker set search_path=public,pg_temp as $$select app.revoke_household_invite(p_id)$$;
revoke all on function public.issue_household_invite(uuid,public.member_role),public.accept_household_invite(text),public.revoke_household_invite(uuid) from public,anon;
grant execute on function public.issue_household_invite(uuid,public.member_role),public.accept_household_invite(text),public.revoke_household_invite(uuid) to authenticated;
