import {
  breastfeedPatchSchema,
  diaperEventPatchSchema,
  foodEntryPatchSchema,
  medicationEventPatchSchema,
  symptomPatchSchema,
  toColumnPatch,
} from '@/lib/validation';

/**
 * Esquemas de corrección.
 *
 * La regla que fijan estas pruebas: un parche solo lleva lo que alguien tocó.
 * `undefined` es "no lo toques", `null` es "bórralo". Confundirlos sería pisar
 * el dato de otra persona del hogar.
 */

describe('un parche solo lleva lo que se tocó', () => {
  it('acepta un parche vacío: abrir el formulario y no cambiar nada es válido', () => {
    expect(symptomPatchSchema.parse({})).toEqual({});
  });

  it('corrige solo la hora sin arrastrar el resto', () => {
    const patch = symptomPatchSchema.parse({ startedAt: '2026-09-21T02:40:00.000Z' });
    expect(patch).toEqual({ startedAt: '2026-09-21T02:40:00.000Z' });
    expect('severity' in patch).toBe(false);
  });

  it('null borra un dato que se puso por error', () => {
    const patch = symptomPatchSchema.parse({ severity: null });
    expect(patch.severity).toBeNull();
  });

  it('una nota vaciada a mano se guarda como null, no como cadena vacía', () => {
    expect(diaperEventPatchSchema.parse({ notes: '   ' }).notes).toBeNull();
  });
});

describe('occurred_at se puede corregir, con límites', () => {
  it('admite una fecha pasada: registrar en diferido es normal', () => {
    expect(() =>
      diaperEventPatchSchema.parse({ occurredAt: '2026-09-20T03:10:00.000Z' }),
    ).not.toThrow();
  });

  it('rechaza una fecha futura', () => {
    const manana = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    expect(() => diaperEventPatchSchema.parse({ occurredAt: manana })).toThrow();
  });

  it('una toma no puede terminar antes de empezar', () => {
    expect(() =>
      breastfeedPatchSchema.parse({
        startedAt: '2026-09-21T03:00:00.000Z',
        endedAt: '2026-09-21T02:00:00.000Z',
      }),
    ).toThrow();
  });

  it('se puede reabrir una toma que se cerró por error', () => {
    expect(breastfeedPatchSchema.parse({ endedAt: null }).endedAt).toBeNull();
  });
});

describe('biberón', () => {
  it('acepta cantidad y marca', () => {
    const patch = breastfeedPatchSchema.parse({
      feedKind: 'formula',
      amountMl: 120,
      brand: 'Marca X',
    });
    expect(patch.amountMl).toBe(120);
    expect(patch.brand).toBe('Marca X');
  });

  it('el lado solo describe una toma de pecho', () => {
    expect(() => breastfeedPatchSchema.parse({ feedKind: 'formula', side: 'left' })).toThrow();
  });

  it('no admite una cantidad absurda', () => {
    expect(() => breastfeedPatchSchema.parse({ amountMl: 5000 })).toThrow();
  });
});

describe('comida', () => {
  it('sustituir la lista de alimentos exige dejar al menos uno', () => {
    expect(() => foodEntryPatchSchema.parse({ items: [] })).toThrow();
  });

  it('se puede añadir la cantidad de un alimento después', () => {
    const patch = foodEntryPatchSchema.parse({
      items: [{ foodId: '11111111-1111-4111-8111-111111111111', amountText: 'media papilla' }],
    });
    expect(patch.items?.[0]?.amountText).toBe('media papilla');
  });
});

describe('medicación', () => {
  it('la dosis sigue siendo texto libre y se puede borrar', () => {
    expect(medicationEventPatchSchema.parse({ doseText: '' }).doseText).toBeNull();
    expect(medicationEventPatchSchema.parse({ doseText: '2,5 ml' }).doseText).toBe('2,5 ml');
  });

  it('el nombre no puede quedarse vacío si se toca', () => {
    expect(() => medicationEventPatchSchema.parse({ name: '  ' })).toThrow();
  });
});

describe('traducción a columnas de la base', () => {
  it('omite las claves que nadie tocó', () => {
    const row = toColumnPatch<{ occurredAt?: string; notes?: string | null }>(
      { occurredAt: '2026-09-21T02:40:00.000Z' },
      { occurredAt: 'occurred_at', notes: 'notes' },
    );

    expect(row).toEqual({ occurred_at: '2026-09-21T02:40:00.000Z' });
    expect('notes' in row).toBe(false);
  });

  it('deja pasar el null, que significa "bórralo"', () => {
    const row = toColumnPatch({ notes: null }, { notes: 'notes' });
    expect(row).toEqual({ notes: null });
  });

  it('nunca escribe created_at ni created_by: eso no se corrige', () => {
    const row = toColumnPatch(
      { occurredAt: '2026-09-21T02:40:00.000Z' },
      { occurredAt: 'occurred_at' },
    );

    expect(Object.keys(row)).toEqual(['occurred_at']);
  });
});
