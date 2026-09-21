-- ---------------------------------------------------------------------------
-- 0001 · Extensiones y convenciones comunes
--
-- AliApp guarda observaciones y patrones temporales. Ninguna tabla, función o
-- vista de este esquema debe inferir causalidad ni un diagnóstico.
--
-- Convenciones aplicadas en todo el esquema:
--   * ids uuid generables en el cliente (arquitectura offline-ready)
--   * occurred_at = cuándo pasó en la vida real (timestamptz, UTC)
--   * created_at / updated_at = auditoría de la fila
--   * deleted_at = borrado lógico para datos de salud
--   * household_id = frontera de autorización
-- ---------------------------------------------------------------------------

create extension if not exists pgcrypto with schema public;

-- Esquema privado para funciones auxiliares que no forman parte de la API.
create schema if not exists app;

comment on schema app is
  'Funciones auxiliares internas de AliApp (autorización, triggers). No expuesta vía PostgREST.';

-- Mantiene updated_at sincronizado sin depender del cliente.
create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function app.touch_updated_at() is
  'Trigger BEFORE UPDATE: refresca updated_at. Nunca toca occurred_at.';
