-- ---------------------------------------------------------------------------
-- 0012 · Storage privado para adjuntos
--
-- Bucket PRIVADO. El acceso es siempre por URL firmada y la primera carpeta de
-- la ruta es el household id, para que la política pueda comprobar pertenencia.
--
-- El bloque está guardado por `to_regclass` para que las migraciones se puedan
-- aplicar en una base limpia sin el esquema `storage` (entorno de tests).
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'Esquema storage no disponible: se omiten bucket y políticas de Storage.';
    return;
  end if;

  insert into storage.buckets (id, name, public)
  values ('aliapp-media', 'aliapp-media', false)
  on conflict (id) do update set public = false;

  execute $policy$
    create policy aliapp_media_select on storage.objects
      for select to authenticated
      using (
        bucket_id = 'aliapp-media'
        and app.is_household_member(((storage.foldername(name))[1])::uuid)
      );
  $policy$;

  execute $policy$
    create policy aliapp_media_insert on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'aliapp-media'
        and app.can_log_events(((storage.foldername(name))[1])::uuid)
      );
  $policy$;

  execute $policy$
    create policy aliapp_media_update on storage.objects
      for update to authenticated
      using (
        bucket_id = 'aliapp-media'
        and app.is_household_manager(((storage.foldername(name))[1])::uuid)
      );
  $policy$;

  execute $policy$
    create policy aliapp_media_delete on storage.objects
      for delete to authenticated
      using (
        bucket_id = 'aliapp-media'
        and app.is_household_manager(((storage.foldername(name))[1])::uuid)
      );
  $policy$;
exception
  when duplicate_object then
    raise notice 'Las políticas de Storage de AliApp ya existían.';
end;
$$;
