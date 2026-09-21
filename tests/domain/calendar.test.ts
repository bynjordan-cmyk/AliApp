import { buildMonth, journeyMilestones, layerOf } from '@/features/calendar/calendar-model';
import { buildHighlight } from '@/features/today/highlight';
import type { Journey } from '@/types/domain';
import type { TimelineItem } from '@/types/timeline';

function item(
  id: string,
  type: TimelineItem['type'],
  occurredAt: string,
  metadata: TimelineItem['metadata'] = {},
): TimelineItem {
  return {
    id,
    type,
    occurredAt,
    title: 'timeline.symptom',
    subtitle: null,
    actor: null,
    metadata,
    sourceTable: 'x',
  };
}

function journey(overrides: Partial<Journey>): Journey {
  return {
    id: 'j1',
    household_id: 'h',
    baby_id: 'b',
    journey_type: 'observation',
    status: 'active',
    started_on: '2026-03-05',
    review_on: null,
    completed_on: null,
    indicated_by: 'family',
    professional_name: null,
    notes: null,
    created_by: null,
    created_at: '2026-03-05T00:00:00Z',
    updated_at: '2026-03-05T00:00:00Z',
    ...overrides,
  } as Journey;
}

describe('capas del calendario', () => {
  it('separa la comida del bebé de la de la madre', () => {
    expect(layerOf(item('1', 'food_entry', '2026-03-01T10:00:00Z', { subjectType: 'baby' }))).toBe(
      'babyFood',
    );
    expect(
      layerOf(item('2', 'food_entry', '2026-03-01T10:00:00Z', { subjectType: 'caregiver' })),
    ).toBe('caregiverFood');
  });

  it('agrupa síntomas y episodios en la misma capa', () => {
    expect(layerOf(item('3', 'symptom', '2026-03-01T10:00:00Z'))).toBe('symptoms');
    expect(layerOf(item('4', 'reaction_episode', '2026-03-01T10:00:00Z'))).toBe('symptoms');
  });
});

describe('rejilla mensual', () => {
  const marzo = new Date(2026, 2, 15);

  it('cubre el mes completo en semanas enteras', () => {
    const dias = buildMonth(marzo, [], []);
    expect(dias.length % 7).toBe(0);
    expect(dias.filter((d) => d.inMonth)).toHaveLength(31);
  });

  it('cuenta los registros de cada día', () => {
    const dias = buildMonth(marzo, [
      item('a', 'symptom', '2026-03-10T10:00:00Z'),
      item('b', 'diaper_event', '2026-03-10T12:00:00Z'),
    ], []);

    const dia10 = dias.find((d) => d.dayKey === '2026-03-10');
    expect(dia10?.total).toBe(2);
    expect(dia10?.counts.symptoms).toBe(1);
    expect(dia10?.counts.diapers).toBe(1);
  });

  it('apagar una capa la quita del recuento', () => {
    const dias = buildMonth(
      marzo,
      [item('a', 'symptom', '2026-03-10T10:00:00Z'), item('b', 'diaper_event', '2026-03-10T12:00:00Z')],
      [],
      ['symptoms'],
    );

    const dia10 = dias.find((d) => d.dayKey === '2026-03-10');
    expect(dia10?.total).toBe(1);
    expect(dia10?.counts.diapers).toBe(0);
  });
});

describe('hitos de proceso', () => {
  it('marca solo las fechas registradas', () => {
    const hitos = journeyMilestones([
      journey({ started_on: '2026-03-05', review_on: '2026-03-08' }),
    ]);

    expect(hitos.get('2026-03-05')).toContain('start');
    expect(hitos.get('2026-03-08')).toContain('review');
    expect(hitos.get('2026-03-06')).toEqual(['active']);
    // Sin fecha de cierre no se inventa ningún final.
    expect(hitos.get('2026-03-20')).toBeUndefined();
  });

  it('un proceso sin revisión ni cierre no genera periodo activo', () => {
    const hitos = journeyMilestones([journey({ review_on: null, completed_on: null })]);
    expect([...hitos.keys()]).toEqual(['2026-03-05']);
  });
});

describe('lo importante hoy', () => {
  const hoy = new Date(2026, 2, 5);

  it('un episodio abierto manda sobre lo demás', () => {
    const destacado = buildHighlight({
      items: [item('e', 'reaction_episode', '2026-03-05T10:00:00Z', { status: 'open' })],
      journeys: [journey({ review_on: '2026-03-05' })],
      today: hoy,
    });
    expect(destacado.titleKey).toBe('today.highlight.openEpisodeTitle');
  });

  it('avisa de una revisión próxima con los días que faltan', () => {
    const destacado = buildHighlight({
      items: [],
      journeys: [journey({ review_on: '2026-03-08' })],
      today: hoy,
    });
    expect(destacado.titleKey).toBe('today.highlight.reviewTitle');
    expect(destacado.params?.days).toBe(3);
  });

  it('un día sin síntomas se cuenta con calma y sin conclusiones', () => {
    const destacado = buildHighlight({
      items: [item('f', 'food_entry', '2026-03-05T10:00:00Z')],
      journeys: [],
      today: hoy,
    });
    expect(destacado.titleKey).toBe('today.highlight.calmTitle');
    expect(destacado.tone).toBe('neutral');
  });

  it('nunca destaca un alimento como sospechoso', () => {
    const destacado = buildHighlight({
      items: [item('s', 'symptom', '2026-03-05T10:00:00Z')],
      journeys: [],
      today: hoy,
    });
    expect(destacado.titleKey).toBe('today.highlight.symptomsTitle');
    expect(JSON.stringify(destacado)).not.toMatch(/caus|food|alimento/i);
  });
});
