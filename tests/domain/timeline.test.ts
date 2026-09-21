import { groupByDay, mapTimelineRow, sortByOccurredAt } from '@/features/timeline/timeline.mapper';
import type { TimelineEventRow } from '@/types/domain';
import type { TimelineItem } from '@/types/timeline';

/**
 * Prueba 10 del plan: los eventos registrados en diferido se ordenan por
 * `occurred_at`, no por `created_at`.
 */

function item(id: string, occurredAt: string, type: TimelineItem['type']): TimelineItem {
  return {
    id,
    type,
    occurredAt,
    title: 'timeline.symptom',
    subtitle: null,
    actor: null,
    metadata: {},
    sourceTable: 'symptoms',
  };
}

describe('línea de tiempo', () => {
  it('ordena por occurred_at aunque se haya registrado más tarde', () => {
    // El evento "b" ocurrió antes pero se introdujo después.
    const backdated = item('b', '2026-03-01T08:00:00.000Z', 'food_entry');
    const liveLogged = item('a', '2026-03-01T20:00:00.000Z', 'symptom');

    const ordered = sortByOccurredAt([liveLogged, backdated], 'asc');

    expect(ordered.map((row) => row.id)).toEqual(['b', 'a']);
  });

  it('agrupa por día local y devuelve los días más recientes primero', () => {
    const days = groupByDay([
      item('1', '2026-03-01T10:00:00.000Z', 'symptom'),
      item('2', '2026-03-02T10:00:00.000Z', 'diaper_event'),
      item('3', '2026-03-02T18:00:00.000Z', 'breastfeed'),
    ]);

    expect(days).toHaveLength(2);
    expect(days[0]?.items).toHaveLength(2);
    expect(days[1]?.items).toHaveLength(1);
  });

  it('normaliza una fila de la vista al contrato del producto', () => {
    const row: TimelineEventRow = {
      id: '7f3d0c6e-2c17-4a49-9f6b-2f9a4c1d5e10',
      type: 'symptom',
      household_id: 'h',
      baby_id: 'b',
      occurred_at: '2026-03-01T10:00:00.000Z',
      title_key: 'timeline.symptom',
      actor_profile_id: 'p',
      source_table: 'symptoms',
      metadata: { symptomType: 'skin_rash', severity: 2 },
    };

    const mapped = mapTimelineRow(row);

    expect(mapped).toMatchObject({
      id: row.id,
      type: 'symptom',
      title: 'timeline.symptom',
      subtitle: 'skin_rash',
      actor: 'p',
      sourceTable: 'symptoms',
    });
  });

  it('descarta filas incompletas en lugar de inventar datos', () => {
    const row = {
      id: null,
      type: 'symptom',
      household_id: null,
      baby_id: null,
      occurred_at: null,
      title_key: null,
      actor_profile_id: null,
      source_table: null,
      metadata: null,
    } as TimelineEventRow;

    expect(mapTimelineRow(row)).toBeNull();
  });
});
