import { deriveBabyAge, localDayKey, minutesBetween, toIsoInstant } from '@/lib/dates';
import { isUuid, newId } from '@/lib/ids';
import { buildSoftDeletePatch, isSoftDeletable } from '@/services/soft-delete';

describe('edad derivada', () => {
  it('se calcula desde birth_date y nunca se almacena', () => {
    const age = deriveBabyAge('2025-09-21', new Date('2026-03-21T12:00:00.000Z'));
    expect(age).toEqual({ days: 181, months: 6 });
  });

  it('devuelve null si no hay fecha de nacimiento', () => {
    expect(deriveBabyAge(null)).toBeNull();
    expect(deriveBabyAge(undefined)).toBeNull();
  });
});

describe('instantes', () => {
  it('serializa en UTC', () => {
    expect(toIsoInstant(new Date('2026-03-01T10:30:00.000Z'))).toBe('2026-03-01T10:30:00.000Z');
  });

  it('mide intervalos en minutos', () => {
    expect(minutesBetween('2026-03-01T10:00:00.000Z', '2026-03-01T13:10:00.000Z')).toBe(190);
  });

  it('agrupa por día local', () => {
    expect(localDayKey('2026-03-01T10:00:00.000Z')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('identificadores generados en cliente', () => {
  it('produce UUID válidos y únicos', () => {
    const ids = new Set(Array.from({ length: 500 }, () => newId()));
    expect(ids.size).toBe(500);
    for (const id of ids) {
      expect(isUuid(id)).toBe(true);
    }
  });
});

describe('borrado lógico', () => {
  it('marca deleted_at en lugar de borrar', () => {
    const patch = buildSoftDeletePatch(new Date('2026-03-01T10:00:00.000Z'));
    expect(patch).toEqual({ deleted_at: '2026-03-01T10:00:00.000Z' });
  });

  it('reconoce las tablas de salud que nunca se borran físicamente', () => {
    expect(isSoftDeletable('symptoms')).toBe(true);
    expect(isSoftDeletable('reaction_episodes')).toBe(true);
    expect(isSoftDeletable('exposures')).toBe(false);
  });
});
