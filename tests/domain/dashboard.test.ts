import { buildDailySummary } from '@/features/dashboard/daily-summary';
import { buildHighlight } from '@/features/today/highlight';
import type { Journey, Reminder } from '@/types/domain';
import type { TimelineItem } from '@/types/timeline';

/**
 * El resumen del día es el objeto que consume el dashboard y que algún día
 * consumirá Ali Insights. Estas pruebas defienden que cuente hechos y que no
 * se deslice hacia la interpretación.
 */

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

function reminder(overrides: Partial<Reminder>): Reminder {
  return {
    id: 'r1',
    household_id: 'h',
    baby_id: 'b',
    profile_id: 'p',
    category: 'symptom_followup',
    title: 'Revisar erupción',
    notes: null,
    scheduled_for: '2026-03-01T14:00:00.000Z',
    repeat_minutes: null,
    status: 'scheduled',
    related_entity_type: null,
    related_entity_id: null,
    local_notification_id: null,
    created_by: 'p',
    created_at: '2026-03-01T10:00:00.000Z',
    updated_at: '2026-03-01T10:00:00.000Z',
    deleted_at: null,
    ...overrides,
  } as Reminder;
}

const AHORA = new Date('2026-03-01T13:00:00.000Z');

const EVENTOS = [
  item('t1', 'breastfeed', '2026-03-01T07:00:00.000Z', { durationMinutes: 18 }),
  item('t2', 'breastfeed', '2026-03-01T10:00:00.000Z', { durationMinutes: 22 }),
  item('t3', 'food_entry', '2026-03-01T09:00:00.000Z', {
    subjectType: 'baby',
    foods: [{ canonicalKey: 'hen_egg', isFirstExposure: true }],
  }),
  item('t4', 'food_entry', '2026-03-01T11:00:00.000Z', { subjectType: 'caregiver' }),
  item('t5', 'diaper_event', '2026-03-01T08:00:00.000Z', { diaperType: 'stool', mucus: true }),
  item('t6', 'diaper_event', '2026-03-01T12:00:00.000Z', { diaperType: 'urine' }),
  item('t7', 'symptom', '2026-03-01T12:30:00.000Z', { severity: 2 }),
  item('t8', 'reaction_episode', '2026-03-01T12:30:00.000Z', { status: 'open' }),
];

describe('resumen del día', () => {
  const resumen = buildDailySummary({
    dayKey: '2026-03-01',
    items: EVENTOS,
    journeys: [],
    reminders: [],
    now: AHORA,
  });

  it('cuenta la alimentación con su contexto', () => {
    expect(resumen.feeding.breastfeeds).toBe(2);
    expect(resumen.feeding.breastfeedMinutes).toBe(40);
    expect(resumen.feeding.babyMeals).toBe(1);
    expect(resumen.feeding.caregiverMeals).toBe(1);
    expect(resumen.feeding.firstExposures).toBe(1);
    expect(resumen.feeding.lastFeedAt).toBe('2026-03-01T10:00:00.000Z');
  });

  it('separa las observaciones de salud', () => {
    expect(resumen.health.symptoms).toBe(1);
    expect(resumen.health.openEpisodes).toBe(1);
    expect(resumen.health.lastSymptomAt).toBe('2026-03-01T12:30:00.000Z');
  });

  it('desglosa los pañales sin interpretarlos', () => {
    expect(resumen.diapers.total).toBe(2);
    expect(resumen.diapers.stool).toBe(1);
    expect(resumen.diapers.urine).toBe(1);
    expect(resumen.diapers.withMucus).toBe(1);
    expect(resumen.diapers.withBlood).toBe(0);
  });

  it('no emite ningún juicio sobre el día', () => {
    const texto = JSON.stringify(resumen);
    expect(texto).not.toMatch(/normal|anormal|bien|mal|riesgo|alerta|caus/i);
  });

  it('un día sin registros da ceros, no huecos', () => {
    const vacio = buildDailySummary({
      dayKey: '2026-03-02',
      items: [],
      journeys: [],
      reminders: [],
      now: AHORA,
    });

    expect(vacio.totalRecords).toBe(0);
    expect(vacio.feeding.lastFeedAt).toBeNull();
    expect(vacio.diapers.total).toBe(0);
  });
});

describe('recordatorios del resumen', () => {
  it('solo trae los futuros y programados, en orden', () => {
    const resumen = buildDailySummary({
      dayKey: '2026-03-01',
      items: [],
      journeys: [],
      reminders: [
        reminder({ id: 'pasado', scheduled_for: '2026-03-01T09:00:00.000Z' }),
        reminder({ id: 'tarde', scheduled_for: '2026-03-01T18:00:00.000Z' }),
        reminder({ id: 'pronto', scheduled_for: '2026-03-01T13:30:00.000Z' }),
        reminder({ id: 'hecho', scheduled_for: '2026-03-01T15:00:00.000Z', status: 'done' }),
      ],
      now: AHORA,
    });

    expect(resumen.upcomingReminders.map((r) => r.id)).toEqual(['pronto', 'tarde']);
  });
});

describe('lo importante ahora', () => {
  it('un recordatorio inminente pesa más que un proceso activo', () => {
    const journey = {
      id: 'j',
      status: 'active',
      journey_type: 'observation',
      started_on: '2026-02-20',
      review_on: null,
    } as Journey;

    const destacado = buildHighlight({
      items: [],
      journeys: [journey],
      reminders: [reminder({ scheduled_for: '2026-03-01T13:45:00.000Z' })],
      today: AHORA,
    });

    expect(destacado.titleKey).toBe('today.highlight.reminderTitle');
    expect(destacado.params?.minutes).toBe(45);
  });

  it('un episodio abierto pesa más que un recordatorio', () => {
    const destacado = buildHighlight({
      items: [item('e', 'reaction_episode', '2026-03-01T12:00:00.000Z', { status: 'open' })],
      journeys: [],
      reminders: [reminder({ scheduled_for: '2026-03-01T13:10:00.000Z' })],
      today: AHORA,
    });

    expect(destacado.titleKey).toBe('today.highlight.openEpisodeTitle');
  });
});
