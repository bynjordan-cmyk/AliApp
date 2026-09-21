import { z } from 'zod';

/** Piezas de validación compartidas por todos los formularios de eventos. */

export const uuidSchema = z.string().uuid();

/**
 * Instante en el que ocurrió algo en la vida real.
 *
 * Se acepta cualquier fecha pasada (registro en diferido, §8) y un pequeño
 * margen hacia el futuro para tolerar relojes ligeramente desajustados.
 */
export const occurredAtSchema = z
  .string()
  .datetime({ offset: true })
  .refine(
    (value) => new Date(value).getTime() <= Date.now() + 5 * 60 * 1000,
    { message: 'La fecha no puede estar en el futuro' },
  );

/**
 * Notas libres. Se normaliza la cadena vacía a `undefined` antes de validar,
 * para que un campo que la usuaria abrió y dejó en blanco no se guarde como "".
 */
export const optionalNotesSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().max(2000).optional(),
);

export const nonEmptyText = (max: number) => z.string().trim().min(1).max(max);
