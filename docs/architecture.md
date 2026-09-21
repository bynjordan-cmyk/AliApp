# Arquitectura de AliApp

AliApp es un producto de registro de alimentación, procesos de alergia
alimentaria y observación de síntomas. **No es una herramienta diagnóstica.**

## Pila

| Capa | Elección | Motivo |
| --- | --- | --- |
| App | Expo SDK 57 + React Native 0.86 + TypeScript estricto | Un solo código para iOS/Android/web |
| Navegación | Expo Router (rutas por ficheros) | La arquitectura de información se lee en el árbol de ficheros |
| Backend | Supabase (Postgres + Auth + Storage) | RLS en la base: la seguridad no depende del cliente |
| Estado de servidor | TanStack Query | Caché, reintentos e invalidación en un solo sitio |
| Formularios | React Hook Form + Zod | Validación compartida entre formulario y servicio |
| Fechas | date-fns | Ligera y tree-shakeable |
| Pruebas | Jest (dominio) + Jest sobre Postgres real (RLS y esquema) | Las políticas se prueban de verdad, sin simulacros |

No hay Redux (no ha aparecido un caso que lo justifique), ni ORM sobre
Postgres, ni dependencias de IA, ni SDK de analítica.

## Mapa del repositorio

```
app/                     rutas (Expo Router)
  (auth)/                acceso
  (tabs)/                Hoy · Alimentación · Salud · Procesos · Perfil
  onboarding/            alta de hogar y bebé
  quick-log.tsx          hoja de registro rápido (modal)
src/
  design-system/         tokens aprobados y componentes base
  features/<dominio>/    servicio + hooks + componentes de cada dominio
  lib/                   supabase, i18n, fechas, validación, ids, seguridad
  services/              servicios transversales (timeline, informes, media)
  types/                 tipos de dominio derivados de la base
supabase/
  migrations/            esquema, RLS, vistas (orden numérico)
  seed.sql               datos ficticios de desarrollo
tests/
  domain/                pruebas unitarias puras
  rls/                   pruebas contra Postgres real
docs/                    esta documentación
scripts/                 base local y generación de tipos
```

## Reglas de capas

1. **Las pantallas no hablan con Supabase.** Solo usan hooks o servicios.
2. **La lógica de dominio no vive en pantallas.** Vive en `features/*/*.service.ts`
   y en módulos puros (`timeline.mapper`, `allergen-board`, `permissions`,
   `safety`, `descriptions`).
3. **Nada de `any` en código de dominio.** TypeScript estricto, con
   `noUncheckedIndexedAccess`.
4. **La seguridad vive en la base.** El módulo `features/caregivers/permissions`
   es un espejo para la interfaz, nunca la barrera.

## Flujo de datos

```
pantalla → hook (TanStack Query) → servicio → cliente Supabase → Postgres (RLS)
                                                        ↓
                                       vistas: timeline_events, allergen_board
                                       función: build_report(...)
```

## Decisiones tomadas y sus motivos

- **Ids generados en el cliente** (`src/lib/ids.ts`). Toda fila conoce su id
  antes de llegar al servidor, que es lo que permitirá una cola offline sin
  rehacer la capa de datos (ver `offline-plan.md`).
- **La línea de tiempo es una vista, no una tabla.** No se duplican datos; si
  algún día el rendimiento lo exige, se decidirá con medidas.
- **Los informes pasan por una sola función** (`build_report`). El futuro PDF
  consumirá esa capa, nunca tablas sueltas desde la interfaz.
- **`security_invoker = on` en las vistas**, para que respeten el RLS de quien
  consulta en lugar de saltárselo.
- **La edad nunca se almacena**: se deriva de `birth_date`.

## Desviaciones respecto de la especificación inicial

1. **Expo SDK 57 y React Native 0.86**, que son las versiones actuales; el
   documento no fijaba versión.
2. **Sin NativeWind.** La especificación lo dejaba opcional. Un conjunto de
   tokens tipados (`src/design-system/tokens.ts`) da el mismo control con una
   dependencia menos.
3. **Nombres de alimentos en tabla `food_translations`** en lugar de campos
   traducidos dentro de `foods`. Añadir un idioma no toca ningún id canónico.
4. **`npm run db:types` usa un generador propio** (`scripts/gen-db-types.mjs`)
   que lee el catálogo de Postgres. `supabase gen types` necesita descargar una
   imagen Docker, bloqueada en el entorno donde se construyó esto; la salida es
   equivalente e intercambiable.
5. **`scripts/db-local.sh`** levanta un Postgres local sin Docker para poder
   ejecutar de verdad las pruebas de RLS. `supabase start` sigue siendo el
   camino recomendado cuando hay Docker disponible.
6. **Sin `react-native-reanimated` ni `gesture-handler`** por ahora: no hacen
   falta para esta navegación y son dependencias nativas pesadas.
7. **Tablas de V2.5 (leche extraída, notificaciones, informes guardados) no
   creadas.** La arquitectura las admite sin cambios: `exposure_source_type` ya
   incluye `pumped_milk` y los informes pasan por `build_report`.
