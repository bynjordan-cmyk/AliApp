# Notas para quien siga desarrollando AliApp

## Reglas que no se negocian

1. **AliApp no diagnostica.** Antes de escribir un texto generado por el
   producto, lee `docs/safety-boundaries.md`. Nada de causalidad, diagnóstico,
   tratamiento, dosis, «es seguro» ni puntuaciones de riesgo.
2. **Un síntoma no lleva el alimento sospechoso encima.** Síntoma, episodio y
   exposición son objetos distintos, y así deben seguir.
3. **La seguridad vive en la base.** Todo cambio de esquema es una migración en
   `supabase/migrations/`; nunca cambios manuales desde el panel. RLS no se
   desactiva «temporalmente».
4. **`occurred_at` nunca se sustituye por `created_at`.**
5. **La edad no se almacena.** Se deriva de `birth_date`.

## Flujo de trabajo

```bash
npm run db:start      # base local con migraciones y seed
npm run db:types      # tras cualquier migración
npm run typecheck && npm run lint && npm run test:all
```

## Dónde va cada cosa

- Acceso a datos → `src/features/<dominio>/<dominio>.service.ts`
- Lógica pura y comprobable → módulos sin I/O (`timeline.mapper`,
  `allergen-board`, `permissions`, `safety`, `descriptions`)
- Texto visible → `src/lib/i18n/locales/` (el español es la referencia; el
  inglés se comprueba contra él en las pruebas)
- Color, espaciado y tipografía → `src/design-system/tokens.ts`
