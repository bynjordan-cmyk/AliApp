# Seguridad y control de acceso

`household_id` es la frontera de autorización de todo el producto. RLS está
activo en **todas** las tablas de `public` y ninguna ruta de la aplicación lo
desactiva.

## Resumen por rol

| Capacidad | owner / parent | caregiver | professional_viewer | revocado |
| --- | --- | --- | --- | --- |
| Leer datos del hogar | ✅ | ✅ | ✅ | ❌ |
| Crear eventos de rutina | ✅ | ✅ | ❌ | ❌ |
| Editar cualquier evento | ✅ | ❌ | ❌ | ❌ |
| Editar lo propio y reciente (24 h) | ✅ | ✅ | ❌ | ❌ |
| Cambiar roles / invitar | ✅ | ❌ | ❌ | ❌ |
| Fijar estado de alimento (`avoid`…) | ✅ | ❌ | ❌ | ❌ |
| Crear o cambiar procesos | ✅ | solo con permiso explícito | ❌ | ❌ |
| Borrado físico de historial | ✅ (la app no lo usa) | ❌ | ❌ | ❌ |

## Cómo está implementado

Funciones auxiliares en el esquema `app` (todas `SECURITY DEFINER` con
`search_path` fijado, para leer la membresía sin recursión de políticas):

- `app.current_profile_id()`
- `app.household_role(household)` — devuelve el rol solo si la membresía está
  **activa**; de ahí que un miembro revocado pierda todo el acceso
- `app.is_household_member()` / `app.is_household_manager()` / `app.can_log_events()`
- `app.has_permission_override(household, clave)` — excepciones puntuales
- `app.can_edit_event(household, created_by, created_at)` — la regla de la
  ventana de corrección del cuidador (`app.caregiver_edit_window()`, 24 h)

Los hogares **no tienen política de INSERT**: se crean con el RPC
`public.create_household(nombre, idioma)`, que crea el hogar y a su responsable
en una sola operación atómica.

## Borrado

El historial clínico se borra de forma **lógica** (`deleted_at`). Las consultas
y la vista de línea de tiempo lo excluyen. El DELETE físico queda reservado a
owner/parent y la aplicación no lo emite nunca.

## Almacenamiento

- Bucket `aliapp-media`, **privado**. No existe URL pública.
- La ruta es `<household_id>/<entidad>/<id>/<fichero>`; una restricción CHECK en
  `media_assets` lo exige.
- Las políticas de `storage.objects` comprueban la pertenencia leyendo la
  primera carpeta de la ruta.
- El acceso se hace siempre con URL firmada de vida corta (10 minutos).

## Secretos

La app solo lee variables `EXPO_PUBLIC_*`. La clave anónima es pública por
diseño: quien protege los datos es RLS. **Ninguna clave de servicio entra en el
cliente**, y `.env*.local` está en `.gitignore`.

## Pruebas

`tests/rls/rls.test.ts` ejecuta contra Postgres real, adoptando el rol
`authenticated` y fijando los claims del JWT igual que hace Supabase:

1. una persona ajena no lee ni escribe nada del hogar,
2. madre/padre lee y escribe en su hogar y gestiona la membresía,
3. el cuidador crea eventos de rutina y lee el estado de alimentos,
4. el cuidador no toca estados de alergia, ni roles, ni borra historial,
5. un miembro revocado pierde todo el acceso,
6. el profesional solo lee y no puede modificar eventos de la familia.

`npm run test:rls`.
