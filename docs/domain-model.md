# Modelo de dominio

Todas las tablas viven en `public` y cuelgan de `household_id`, que es la
frontera de autorización.

## Identidad

| Tabla | Qué es |
| --- | --- |
| `households` | Familia / espacio de trabajo |
| `profiles` | Perfil de aplicación ligado a `auth.users` (lo crea un trigger) |
| `household_members` | Quién pertenece a un hogar, con qué rol y estado |

Roles: `owner`, `parent`, `caregiver`, `professional_viewer`.
Estados: `invited`, `active`, `revoked`.
`permissions` (jsonb) existe solo para excepciones puntuales, como dar a un
cuidador permiso explícito sobre procesos.

## Bebé

`babies` guarda `birth_date`, nunca la edad. La edad se deriva siempre en el
cliente con `deriveBabyAge()`.

## Catálogo de alimentos

`foods` tiene `canonical_key` estable (`cow_milk`, `hen_egg`…) e independiente
del idioma. `food_translations` guarda el nombre visible por idioma. Añadir un
idioma no cambia ningún identificador ni ningún dato histórico.

## Eventos

| Tabla | Nota |
| --- | --- |
| `food_entries` + `food_entry_items` | Comida del bebé **o** de la madre/cuidador; una restricción garantiza que el sujeto sea coherente |
| `breastfeeds` | Toma de leche: `feed_kind` distingue pecho, fórmula y leche extraída. Lado solo para pecho; cantidad y marca opcionales |
| `diaper_events` | Descriptivo: consistencia, color, cantidad, mucosidad, sangre observada, restos de alimento, esfuerzo, olor |
| `symptoms` | Observación **autónoma**; sin alimento sospechoso encima |
| `reaction_episodes` + `episode_symptoms` | Un episodio **agrupa** síntomas |
| `medication_events` | Registro factual; AliApp nunca sugiere dosis |

Todos tienen `occurred_at` (cuándo pasó), `created_at`/`updated_at`
(auditoría), `edited_at` (alguien lo corrigió después) y `deleted_at` (borrado
lógico).

Todos son **editables**, incluido `occurred_at`. `created_at` y `created_by` no
se tocan nunca: quien corrige la hora está ordenando la historia real, no
falseando cuándo se registró.

## Grafo de exposiciones

`exposures` es el nodo factual del grafo:

```
comida de la madre → alimento → toma de pecho → bebé → síntoma → episodio
comida del bebé    → alimento → exposición directa      → síntoma → episodio
leche extraída (futuro) → lote → consumo → línea de tiempo del bebé
```

`source_type` ∈ {`baby_food`, `maternal_food`, `breastfeed`, `pumped_milk`,
`unknown`} y `source_id` apunta a la fila de origen: **no se duplica nada**.

`episode_exposures` relaciona episodio y exposición con:
- `relation_type`: `manual` (lo decidió una persona) o `temporal_candidate`
  (lo ofreció una consulta por ventana temporal),
- `confidence_label`: `insufficient_data`, `under_observation`,
  `temporally_consistent`, `inconsistent`.

**La etiqueta es descriptiva.** No hay columna de causa, ni de culpabilidad, ni
puntuación de riesgo — y hay una prueba que lo comprueba.

## Procesos

`journeys` (tipo, estado, fechas, quién lo indicó) y `journey_targets`
(alimento + sujeto afectado + acción). Un proceso de exclusión que afecta a la
madre y al bebé son dos filas objetivo. No hay duraciones clínicas codificadas.

## Estado de alimento

`baby_food_status` guarda **una fila de estado actual** por (bebé, alimento):
estado, origen del estado, contador de exposiciones y fechas primera/última.

Dos garantías escritas en la base:
1. Un trigger mantiene contador y fechas desde `exposures` — y **solo** eso.
2. Otro trigger rechaza cualquier fila con `status_source = 'system_summary'` y
   estado `avoid` o `professional_supervision`: esos estados los fija una persona.

## Adjuntos

`media_assets` centraliza fotos y documentos. `storage_path` empieza siempre
por el household id y hay una restricción CHECK que lo exige.

## Historial de correcciones

`event_revisions` guarda la diferencia de cada actualización de las seis tablas
de evento: qué columna cambió, de qué a qué, quién y cuándo.

La escribe el trigger `app.track_event_edit()`, que es `SECURITY DEFINER`. El
cliente no puede insertar ahí (no hay política de INSERT para `authenticated`),
así que el historial no depende de que la aplicación se acuerde de anotarlo ni
se puede falsear desde fuera. Los miembros del hogar sí pueden leerlo.

Un borrado lógico se guarda con `kind = 'delete'` y **no** marca `edited_at`:
retirar un registro no es haberlo corregido.

## Vistas y funciones

- `timeline_events`: línea de tiempo normalizada (§16), ordenable por
  `occurred_at`, `security_invoker = on`.
- `allergen_board`: estado actual por alimento, incluidos los alérgenos mayores
  aún sin introducir.
- `build_report(baby, desde, hasta)`: capa de informes, devuelve hechos del
  periodo en JSON.
