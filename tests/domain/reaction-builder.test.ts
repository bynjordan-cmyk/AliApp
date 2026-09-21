import {
  candidatesWithinWindow,
  describeInterval,
} from '@/features/reactions/exposure-window';
import { buildCrossLog, groupBySubject } from '@/features/diapers/cross-log';
import type { Exposure } from '@/types/domain';
import type { TimelineItem } from '@/types/timeline';

/**
 * El Reaction Builder y el cruce del pañal comparten una regla: describen el
 * orden en el tiempo y NUNCA afirman que una cosa causara la otra.
 */

function exposicion(id: string, occurredAt: string): Exposure {
  return {
    id,
    household_id: 'h',
    baby_id: 'b',
    source_type: 'baby_food',
    source_id: null,
    food_id: 'f',
    occurred_at: occurredAt,
    created_at: occurredAt,
  };
}

const SINTOMA = '2026-03-01T18:00:00.000Z';

describe('candidatos por ventana temporal', () => {
  const exposiciones = [
    exposicion('3h', '2026-03-01T15:00:00.000Z'),
    exposicion('9h', '2026-03-01T09:00:00.000Z'),
    exposicion('20h', '2026-02-28T22:00:00.000Z'),
    exposicion('posterior', '2026-03-01T19:00:00.000Z'),
  ];

  it('solo incluye lo anterior al síntoma', () => {
    const seis = candidatesWithinWindow(exposiciones, SINTOMA, 6);
    expect(seis.map((c) => c.exposure.id)).toEqual(['3h']);
  });

  it('una ventana más amplia incluye más registros, sin reordenar por sospecha', () => {
    const doce = candidatesWithinWindow(exposiciones, SINTOMA, 12);
    expect(doce.map((c) => c.exposure.id)).toEqual(['3h', '9h']);

    const veinticuatro = candidatesWithinWindow(exposiciones, SINTOMA, 24);
    expect(veinticuatro.map((c) => c.exposure.id)).toEqual(['3h', '9h', '20h']);
  });

  it('ordena por cercanía temporal, que es un hecho, no una probabilidad', () => {
    const candidatos = candidatesWithinWindow(exposiciones, SINTOMA, 24);
    const minutos = candidatos.map((c) => c.minutesBefore);
    expect(minutos).toEqual([...minutos].sort((a, b) => a - b));
    expect(candidatos[0]?.minutesBefore).toBe(180);
  });

  it('describe el intervalo sin insinuar causa', () => {
    const frase = describeInterval(200, {
      hoursShort: 'h',
      minutesShort: 'min',
      before: 'antes del síntoma',
    });
    expect(frase).toBe('3 h 20 min antes del síntoma');
    expect(frase).not.toMatch(/caus|provoc|por culpa/i);
  });
});

describe('cruce del pañal con lo comido antes', () => {
  function item(id: string, occurredAt: string, subject: 'baby' | 'caregiver'): TimelineItem {
    return {
      id,
      type: 'food_entry',
      occurredAt,
      title: 'timeline.foodEntry',
      subtitle: null,
      actor: null,
      metadata: { subjectType: subject },
      sourceTable: 'food_entries',
    };
  }

  const deposicion = '2026-03-01T18:00:00.000Z';
  const items = [
    item('bebe-5h', '2026-03-01T13:00:00.000Z', 'baby'),
    item('mama-2h', '2026-03-01T16:00:00.000Z', 'caregiver'),
    item('bebe-30h', '2026-02-28T12:00:00.000Z', 'baby'),
  ];

  it('separa lo que comió el bebé de lo que comió la madre', () => {
    const grupos = groupBySubject(buildCrossLog(items, deposicion, 24));
    expect(grupos.baby.map((e) => e.item.id)).toEqual(['bebe-5h']);
    expect(grupos.caregiver.map((e) => e.item.id)).toEqual(['mama-2h']);
  });

  it('calcula cuánto antes ocurrió cada registro', () => {
    const cruce = buildCrossLog(items, deposicion, 24);
    expect(cruce[0]).toMatchObject({ minutesBefore: 120 });
    expect(cruce[1]).toMatchObject({ minutesBefore: 300 });
  });

  it('la ventana recorta de verdad', () => {
    expect(buildCrossLog(items, deposicion, 6).map((e) => e.item.id)).toEqual([
      'mama-2h',
      'bebe-5h',
    ]);
  });
});
