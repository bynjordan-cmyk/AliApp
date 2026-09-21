-- ---------------------------------------------------------------------------
-- 0017 · Etapa alimentaria del bebé
--
-- AliApp adapta la interfaz a la etapa real del bebé, pero NO decide cuándo
-- empezar con sólidos. Esa decisión es clínica y familiar.
--
-- Por eso manda `solids_started`, que responde una persona a una pregunta
-- explícita. La edad derivada de birth_date solo sirve para SUGERIR una etapa
-- en la interfaz; nunca la cambia sola ni la impone.
--
-- `feeding_mode` (text[]) se conserva tal cual: los datos existentes siguen
-- siendo válidos y nada de lo registrado se pierde al cambiar de etapa.
-- ---------------------------------------------------------------------------

create type public.feeding_stage as enum (
  'milk_only',
  'milk_and_early_solids',
  'complementary_feeding',
  'family_food',
  'custom'
);

alter table public.babies
  -- Etapa elegida por la familia. Null = todavía no la han indicado.
  add column feeding_stage public.feeding_stage,
  -- Respuesta explícita a "¿Ya comenzó alimentos sólidos?".
  add column solids_started boolean not null default false,
  add column breastfeeding boolean not null default false,
  add column formula boolean not null default false,
  add column pumped_milk boolean not null default false;

comment on column public.babies.feeding_stage is
  'Etapa indicada por la familia. La edad puede sugerirla en la interfaz, nunca fijarla.';
comment on column public.babies.solids_started is
  'Respuesta explícita de la familia. Prevalece sobre cualquier estimación por edad.';

-- Traslada la información que ya existía en feeding_mode, sin perder nada.
update public.babies
set
  breastfeeding = 'breastfeeding' = any (feeding_mode),
  formula = 'formula' = any (feeding_mode),
  pumped_milk = 'pumped_milk' = any (feeding_mode),
  solids_started = 'solids' = any (feeding_mode)
where array_length(feeding_mode, 1) is not null;

-- Etapa de partida coherente con lo anterior. Quien no tenía nada registrado
-- se queda sin etapa hasta que la familia responda.
update public.babies
set feeding_stage = case
  when solids_started then 'complementary_feeding'::public.feeding_stage
  when breastfeeding or formula or pumped_milk then 'milk_only'::public.feeding_stage
  else null
end
where feeding_stage is null;
