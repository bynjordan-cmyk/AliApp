# AliApp

Registro de alimentación, procesos de alergia alimentaria y observación de
síntomas para familias con bebés.

> AliApp guarda observaciones y patrones temporales. **No es una herramienta
> diagnóstica**: no diagnostica alergia, APLV/CMPA ni intolerancia, no atribuye
> causas y no indica tratamientos ni dosis.

El backend puede ser complejo. La madre debe sentir que pulsó tres botones.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local     # rellena URL y clave anónima de Supabase
npm start                      # abre Expo
```

### Base de datos

Con Docker disponible, el camino recomendado es Supabase local:

```bash
npx supabase start
npx supabase db reset          # aplica supabase/migrations + seed.sql
```

Sin Docker, hay un Postgres local que aplica las mismas migraciones:

```bash
npm run db:start               # initdb + migraciones + seed
npm run db:reset               # desde cero
npm run db:types               # regenera src/lib/supabase/database.types.ts
npm run db:stop
```

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm start` | Servidor de desarrollo de Expo |
| `npm run typecheck` | TypeScript estricto, sin emitir |
| `npm run lint` | ESLint (configuración de Expo) |
| `npm test` | Pruebas de dominio (sin red ni base de datos) |
| `npm run test:rls` | Pruebas de RLS y esquema contra Postgres real |
| `npm run test:all` | Ambas suites |
| `npm run db:start` / `db:reset` / `db:stop` / `db:psql` | Base local |
| `npm run db:types` | Regenera los tipos de la base |

## Variables de entorno

| Variable | Para qué |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clave anónima (pública por diseño; RLS protege los datos) |
| `EXPO_PUBLIC_SUPABASE_MEDIA_BUCKET` | Bucket privado de adjuntos (`aliapp-media`) |
| `ALIAPP_TEST_DATABASE_URL` | Solo para `npm run test:rls` |

Ninguna clave de servicio entra en la aplicación.

## Usuarios del seed

Datos ficticios. Contraseña en Supabase local: `aliapp-dev`.

| Correo | Rol |
| --- | --- |
| `parent@aliapp.test` | Responsable del hogar |
| `caregiver@aliapp.test` | Cuidador |
| `professional@aliapp.test` | Profesional (solo lectura) |

## Documentación

- [`docs/architecture.md`](docs/architecture.md) — pila, capas y decisiones
- [`docs/domain-model.md`](docs/domain-model.md) — entidades y grafo de exposiciones
- [`docs/security.md`](docs/security.md) — roles, RLS y almacenamiento
- [`docs/safety-boundaries.md`](docs/safety-boundaries.md) — qué puede y qué no puede decir AliApp
- [`docs/offline-plan.md`](docs/offline-plan.md) — estrategia de cola sin conexión
