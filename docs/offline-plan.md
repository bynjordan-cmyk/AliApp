# Plan para el trabajo sin conexión

No hay motor de sincronización en esta fase. Lo que sí hay son las decisiones
que permiten añadirlo **sin rehacer la capa de datos**.

## Ya resuelto

1. **Ids generados en el cliente.** `newId()` produce UUID v4 antes de llamar al
   servidor. Ninguna entidad depende de una secuencia del servidor.
2. **Mutaciones aisladas en servicios.** Toda escritura pasa por
   `features/*/*.service.ts`. Ahí es donde se interpondrá la cola.
3. **`occurred_at` separado de `created_at`.** Un evento sincronizado horas
   después conserva el momento real en que ocurrió.
4. **Registro en diferido aceptado** por esquema y validación.
5. **Borrado lógico.** Un borrado es una actualización más, que la cola puede
   reproducir sin ambigüedad.

## Sprint futuro: la cola

1. **Almacén local.** Tabla de mutaciones pendientes en SQLite (expo-sqlite) o
   AsyncStorage: `{ id, tabla, operación, carga, creadoEn, intentos }`.
2. **Interposición.** Un envoltorio sobre los servicios que, sin red, encola la
   mutación y aplica una actualización optimista en la caché de TanStack Query.
3. **Vaciado.** Al recuperar conexión, se envían en orden de creación. Como los
   ids vienen del cliente, un reenvío es idempotente con `upsert`.
4. **Conflictos.** Orden esperado: última escritura gana por fila, salvo en
   contadores, que ya los mantiene la base desde `exposures`.
5. **Lecturas.** `gcTime` amplio en TanStack Query y, si hace falta,
   persistencia de la caché con `@tanstack/query-async-storage-persister`.

## Lo que hay que evitar

- Ids autoincrementales o generados por el servidor en tablas de dominio.
- Lógica de escritura dentro de componentes: rompería la interposición.
- Usar `created_at` como si fuera el momento del evento.
