-- Atomic creation: a failed target must not leave an orphan process.
-- Invoker RPCs resolve authorization helpers in this unexposed schema.
grant usage on schema app to authenticated;
create or replace function public.create_journey(p_input jsonb)
returns public.journeys language plpgsql security invoker set search_path = public, pg_temp
as $$
declare j public.journeys; target jsonb;
begin
  if not exists (select 1 from public.babies b where b.id=(p_input->>'babyId')::uuid and b.household_id=(p_input->>'householdId')::uuid) then
    raise exception 'Invalid baby or household' using errcode='42501';
  end if;
  if p_input->>'journeyType'='exclusion' and jsonb_array_length(coalesce(p_input->'targets','[]'::jsonb))=0 then
    raise exception 'An exclusion process requires a target' using errcode='23514';
  end if;
  insert into public.journeys(household_id,baby_id,journey_type,status,started_on,review_on,indicated_by,professional_name,notes,created_by)
  values((p_input->>'householdId')::uuid,(p_input->>'babyId')::uuid,(p_input->>'journeyType')::public.journey_type,
    coalesce(p_input->>'status','draft')::public.journey_status,(p_input->>'startedOn')::date,(p_input->>'reviewOn')::date,
    (p_input->>'indicatedBy')::public.journey_indicated_by,p_input->>'professionalName',p_input->>'notes',app.current_profile_id()) returning * into j;
  for target in select * from jsonb_array_elements(coalesce(p_input->'targets','[]'::jsonb)) loop
    insert into public.journey_targets(journey_id,food_id,target_subject,action)
    values(j.id,(target->>'foodId')::uuid,(target->>'targetSubject')::public.journey_target_subject,(target->>'action')::public.journey_target_action);
  end loop;
  return j;
end $$;
revoke all on function public.create_journey(jsonb) from public, anon;
grant execute on function public.create_journey(jsonb) to authenticated;
