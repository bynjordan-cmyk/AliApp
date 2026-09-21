import { timelineSubtitle } from '@/features/timeline/timeline-labels';
import { translate, type TranslationKey } from '@/lib/i18n';
import type { TimelineItem } from '@/types/timeline';

/**
 * Ningún texto visible puede quedarse en la clave técnica que guarda la base
 * ('urine', 'skin_rash', 'hen_egg'). Esa clave es correcta como dato; como
 * texto para una madre, no (§20).
 */

const t = (key: TranslationKey) => translate('es', key);
const foodName = (key: string) => ({ hen_egg: 'Huevo', cow_milk: 'Leche de vaca' })[key] ?? key;

function item(type: TimelineItem['type'], metadata: TimelineItem['metadata']): TimelineItem {
  return {
    id: 'id',
    type,
    occurredAt: '2026-03-01T10:00:00.000Z',
    title: 'timeline.symptom',
    subtitle: null,
    actor: null,
    metadata,
    sourceTable: 'x',
  };
}

describe('subtítulos de la línea de tiempo', () => {
  it('traduce el tipo de pañal', () => {
    expect(timelineSubtitle(item('diaper_event', { diaperType: 'urine' }), t, foodName)).toBe(
      'Pipí',
    );
  });

  it('traduce el síntoma y añade la intensidad observada', () => {
    expect(
      timelineSubtitle(item('symptom', { symptomType: 'skin_rash', severity: 2 }), t, foodName),
    ).toBe('Erupción en la piel · Moderada');
  });

  it('usa el nombre de alimento del idioma activo, no la clave canónica', () => {
    const subtitle = timelineSubtitle(
      item('food_entry', { foods: [{ canonicalKey: 'hen_egg' }, { canonicalKey: 'cow_milk' }] }),
      t,
      foodName,
    );
    expect(subtitle).toBe('Huevo, Leche de vaca');
  });

  it('muestra el estado del episodio en texto', () => {
    expect(timelineSubtitle(item('reaction_episode', { status: 'open' }), t, foodName)).toBe(
      'Abierto',
    );
  });

  it('prefiere mostrar el dato crudo antes que ocultar lo registrado', () => {
    expect(
      timelineSubtitle(item('symptom', { symptomType: 'sintoma_no_catalogado' }), t, foodName),
    ).toBe('sintoma_no_catalogado');
  });
});
