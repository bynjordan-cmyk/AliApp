-- ---------------------------------------------------------------------------
-- 0004 · Catálogo canónico de alimentos
--
-- El id y `canonical_key` son estables e independientes del idioma. Los nombres
-- visibles viven en food_translations, de modo que añadir un idioma no cambia
-- ningún identificador ni ningún dato histórico (§20).
-- ---------------------------------------------------------------------------

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  -- Clave estable legible: 'cow_milk', 'hen_egg', 'peanut'…
  canonical_key text not null unique check (canonical_key ~ '^[a-z0-9_]+$'),
  canonical_name text not null,
  category text,
  is_major_allergen boolean not null default false,
  -- Código de alérgeno descriptivo (p. ej. 'milk', 'egg'). No es regulación.
  allergen_code text,
  -- Alias de búsqueda por idioma: {"es": ["leche de vaca"], "en": ["cow milk"]}
  aliases jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.food_translations (
  food_id uuid not null references public.foods (id) on delete cascade,
  locale text not null,
  display_name text not null,
  created_at timestamptz not null default now(),
  primary key (food_id, locale)
);

comment on table public.food_translations is
  'Nombres visibles por idioma. Los ids canónicos nunca cambian al traducir.';

create index foods_allergen_idx on public.foods (is_major_allergen) where is_major_allergen;
create index foods_category_idx on public.foods (category);

create trigger foods_touch_updated_at
  before update on public.foods
  for each row execute function app.touch_updated_at();
