-- ---------------------------------------------------------------------------
-- 0015 · Detalle de deposición
--
-- Amplía diaper_events con lo que una familia observa de verdad al cambiar un
-- pañal. Todo es OPCIONAL y todo es DESCRIPTIVO: describe lo visto, no lo
-- interpreta. Ninguna combinación de estos campos implica un diagnóstico.
-- ---------------------------------------------------------------------------

create type public.stool_amount as enum ('scant', 'moderate', 'large');

alter table public.diaper_events
  add column stool_amount public.stool_amount,
  -- Restos de alimento reconocibles. Es una observación, no una relación causal
  -- con ningún alimento concreto.
  add column visible_food_residue boolean,
  -- Esfuerzo o molestia aparente durante la deposición.
  add column straining boolean,
  add column unusual_odor boolean;

comment on column public.diaper_events.visible_food_residue is
  'Observación de restos visibles. Relacionarla con alimentos concretos es tarea de quien consulta, no del sistema.';
comment on column public.diaper_events.straining is
  'Esfuerzo o molestia observados por la familia. No es una valoración clínica.';

-- Índice para el cruce "qué comió antes": se consulta por bebé y momento.
create index diaper_events_baby_occurred_idx
  on public.diaper_events (baby_id, occurred_at desc)
  where deleted_at is null;
