import { missingDetails, pendingRecords } from '@/features/records/completeness';
import {
  isFutureInstant,
  joinLocalInstant,
  shiftMinutes,
  splitLocalInstant,
} from '@/features/records/occurred-at';
import { describeRevision, revisionFieldLabelKey, wasEdited } from '@/features/records/revisions';
import type { EventRevision } from '@/types/domain';
import type { TimelineItem, TimelineItemType } from '@/types/timeline';

/**
 * "Registra ahora, completa después."
 *
 * Estas pruebas fijan la regla de producto: guardar con lo mínimo es correcto,
 * y lo que falte se ofrece sin regañar a nadie.
 */

const AHORA = new Date('2026-09-21T12:00:00.000Z');

function item(
  type: TimelineItemType,
  metadata: Record<string, unknown>,
  occurredAt = '2026-09-21T09:00:00.000Z',
): TimelineItem {
  return {
    id: `${type}-1`,
    type,
    occurredAt,
    title: 'timeline.symptom',
    subtitle: null,
    actor: null,
    metadata: metadata as TimelineItem['metadata'],
    sourceTable: type,
  };
}

describe('qué se le puede añadir a un registro', () => {
  it('una toma de pecho sin cerrar ofrece la hora de fin y el lado', () => {
    expect(missingDetails(item('breastfeed', { feedKind: 'breast' }))).toEqual([
      'endedAt',
      'side',
    ]);
  });

  it('un biberón ofrece cantidad y marca, nunca el lado del pecho', () => {
    const faltan = missingDetails(
      item('breastfeed', { feedKind: 'formula', endedAt: '2026-09-21T09:10:00.000Z' }),
    );
    expect(faltan).toEqual(['amountMl', 'brand']);
    expect(faltan).not.toContain('side');
  });

  it('una toma completa no ofrece nada', () => {
    expect(
      missingDetails(
        item('breastfeed', {
          feedKind: 'breast',
          side: 'left',
          endedAt: '2026-09-21T09:15:00.000Z',
        }),
      ),
    ).toEqual([]);
  });

  it('un pañal de solo pipí no pregunta por la consistencia', () => {
    expect(missingDetails(item('diaper_event', { diaperType: 'urine' }))).toEqual([]);
  });

  it('una deposición sí ofrece el detalle descriptivo', () => {
    expect(missingDetails(item('diaper_event', { diaperType: 'stool' }))).toEqual([
      'stoolConsistency',
      'stoolColor',
      'stoolAmount',
    ]);
  });

  it('una comida ofrece el momento del día y la cantidad', () => {
    expect(
      missingDetails(item('food_entry', { foods: [{ canonicalKey: 'rice', amountText: null }] })),
    ).toEqual(['mealType', 'amountText']);
  });

  it('un síntoma ofrece intensidad y hora de fin', () => {
    expect(missingDetails(item('symptom', { symptomType: 'cough' }))).toEqual([
      'severity',
      'endedAt',
    ]);
  });

  it('un episodio abierto no es algo que completar: está abierto a propósito', () => {
    expect(missingDetails(item('reaction_episode', { status: 'open' }))).toEqual([]);
  });
});

describe('registros pendientes de completar', () => {
  it('solo mira lo reciente: lo de hace semanas ya no se ofrece', () => {
    const viejo = item('symptom', { symptomType: 'cough' }, '2026-08-01T09:00:00.000Z');
    const reciente = item('symptom', { symptomType: 'cough' }, '2026-09-21T08:00:00.000Z');

    const pendientes = pendingRecords([viejo, reciente], { now: AHORA });

    expect(pendientes).toHaveLength(1);
    expect(pendientes[0]?.occurredAt).toBe('2026-09-21T08:00:00.000Z');
  });

  it('deja fuera lo que ya está completo', () => {
    const completo = item('diaper_event', { diaperType: 'urine' });
    expect(pendingRecords([completo], { now: AHORA })).toEqual([]);
  });

  it('ordena de lo más reciente a lo más antiguo y respeta el límite', () => {
    const items = [
      item('symptom', { symptomType: 'cough' }, '2026-09-21T06:00:00.000Z'),
      item('symptom', { symptomType: 'cough' }, '2026-09-21T10:00:00.000Z'),
      item('symptom', { symptomType: 'cough' }, '2026-09-21T08:00:00.000Z'),
    ].map((registro, indice) => ({ ...registro, id: `s-${indice}` }));

    const pendientes = pendingRecords(items, { now: AHORA, limit: 2 });

    expect(pendientes).toHaveLength(2);
    expect(pendientes.map((p) => p.occurredAt)).toEqual([
      '2026-09-21T10:00:00.000Z',
      '2026-09-21T08:00:00.000Z',
    ]);
  });

  it('no incluye registros con hora futura', () => {
    const futuro = item('symptom', { symptomType: 'cough' }, '2026-09-22T09:00:00.000Z');
    expect(pendingRecords([futuro], { now: AHORA })).toEqual([]);
  });
});

describe('corregir cuándo ocurrió', () => {
  it('parte y vuelve a juntar un instante sin perderlo', () => {
    const partes = splitLocalInstant(AHORA.toISOString());
    const rehecho = joinLocalInstant(partes.date, partes.time);

    expect(rehecho).not.toBeNull();
    // Se pierden los segundos a propósito: nadie escribe segundos a mano.
    expect(new Date(rehecho as string).getMinutes()).toBe(AHORA.getMinutes());
  });

  it('rechaza lo que no es una fecha', () => {
    expect(joinLocalInstant('ayer', '10:00')).toBeNull();
    expect(joinLocalInstant('2026-09-21', 'tarde')).toBeNull();
  });

  it('admite una hora escrita sin el cero inicial', () => {
    expect(joinLocalInstant('2026-09-21', '9:05')).not.toBeNull();
  });

  it('desplaza hacia atrás para "hace 30 min"', () => {
    expect(shiftMinutes(AHORA.toISOString(), -30)).toBe('2026-09-21T11:30:00.000Z');
  });

  it('tolera un reloj ligeramente adelantado pero no una fecha futura', () => {
    expect(isFutureInstant('2026-09-21T12:02:00.000Z', AHORA)).toBe(false);
    expect(isFutureInstant('2026-09-21T13:00:00.000Z', AHORA)).toBe(true);
  });
});

describe('historial de correcciones', () => {
  const revision = (changes: Record<string, unknown>, kind = 'edit'): EventRevision =>
    ({
      id: 'rev-1',
      household_id: 'h',
      baby_id: 'b',
      entity_type: 'symptoms',
      entity_id: 's',
      kind,
      changes,
      changed_by: 'p',
      changed_at: '2026-09-21T12:00:00.000Z',
    }) as EventRevision;

  it('describe el antes y el después de cada campo', () => {
    const entrada = describeRevision(
      revision({
        started_at: { from: '2026-09-21T03:10:00.000Z', to: '2026-09-21T02:40:00.000Z' },
        severity: { from: null, to: 2 },
      }),
    );

    expect(entrada.kind).toBe('edit');
    expect(entrada.fields.map((campo) => campo.column)).toEqual(['severity', 'started_at']);
    expect(entrada.fields[1]?.to).toBe('2026-09-21T02:40:00.000Z');
    expect(entrada.fields[1]?.labelKey).toBe('record.field.startedAt');
  });

  it('no enseña fontanería ni el borrado lógico', () => {
    const entrada = describeRevision(
      revision({
        deleted_at: { from: null, to: '2026-09-21T12:00:00.000Z' },
        updated_at: { from: 'a', to: 'b' },
      }),
    );

    expect(entrada.fields).toEqual([]);
  });

  it('cada columna editable tiene nombre visible', () => {
    expect(revisionFieldLabelKey('occurred_at')).toBe('record.field.occurredAt');
    expect(revisionFieldLabelKey('amount_ml')).toBe('record.field.amountMl');
    expect(revisionFieldLabelKey('columna_inventada')).toBeNull();
  });

  it('el sello "Editado" solo aparece si alguien editó', () => {
    expect(wasEdited({ edited_at: null })).toBe(false);
    expect(wasEdited({ edited_at: '2026-09-21T12:00:00.000Z' })).toBe(true);
    expect(wasEdited(null)).toBe(false);
  });
});
