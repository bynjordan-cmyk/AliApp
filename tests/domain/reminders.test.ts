import { decideDelivery } from '@/features/notifications/delivery';
import {
  isWithinQuietHours,
  nextAllowedTime,
  snoozeTo,
} from '@/features/notifications/quiet-hours';

/**
 * Los avisos tocan a una familia que duerme poco. Estas pruebas defienden que
 * nadie reciba algo que desactivó, y que nada suene de madrugada.
 */

const NOCHE = { start: '22:00', end: '07:00' };
const TARDE = { start: '14:00', end: '16:00' };

describe('horas de silencio', () => {
  it('reconoce un intervalo que cruza la medianoche', () => {
    expect(isWithinQuietHours(new Date('2026-03-01T23:30:00'), NOCHE)).toBe(true);
    expect(isWithinQuietHours(new Date('2026-03-01T03:00:00'), NOCHE)).toBe(true);
    expect(isWithinQuietHours(new Date('2026-03-01T12:00:00'), NOCHE)).toBe(false);
  });

  it('reconoce un intervalo dentro del mismo día', () => {
    expect(isWithinQuietHours(new Date('2026-03-01T15:00:00'), TARDE)).toBe(true);
    expect(isWithinQuietHours(new Date('2026-03-01T16:00:00'), TARDE)).toBe(false);
  });

  it('sin horas configuradas no silencia nada', () => {
    expect(isWithinQuietHours(new Date(), { start: null, end: null })).toBe(false);
  });

  it('retrasa el aviso en lugar de perderlo', () => {
    const madrugada = new Date('2026-03-01T03:00:00');
    const entrega = nextAllowedTime(madrugada, NOCHE);

    expect(entrega.getHours()).toBe(7);
    expect(entrega.getDate()).toBe(1);
    expect(entrega.getTime()).toBeGreaterThan(madrugada.getTime());
  });

  it('un aviso fuera del silencio se queda a su hora', () => {
    const mediodia = new Date('2026-03-01T12:00:00');
    expect(nextAllowedTime(mediodia, NOCHE).getTime()).toBe(mediodia.getTime());
  });

  it('posponer respeta las horas de silencio', () => {
    // 21:45 + 30 min caería a las 22:15, dentro del silencio.
    const pospuesto = snoozeTo(new Date('2026-03-01T21:45:00'), 30, NOCHE);
    expect(pospuesto.getHours()).toBe(7);
    expect(pospuesto.getDate()).toBe(2);
  });
});

describe('decisión de entrega', () => {
  const base = { pushEnabled: true, quietHours: NOCHE, disabledCategories: [] };

  it('entrega cuando todo está activo y no es hora de silencio', () => {
    expect(decideDelivery('feeding', new Date('2026-03-01T12:00:00'), base)).toEqual({
      deliver: true,
    });
  });

  it('el interruptor general manda sobre todo lo demás', () => {
    expect(
      decideDelivery('feeding', new Date('2026-03-01T12:00:00'), { ...base, pushEnabled: false }),
    ).toEqual({ deliver: false, reason: 'push_disabled' });
  });

  it('respeta una categoría desactivada', () => {
    expect(
      decideDelivery('medication', new Date('2026-03-01T12:00:00'), {
        ...base,
        disabledCategories: ['medication'],
      }),
    ).toEqual({ deliver: false, reason: 'category_disabled' });
  });

  it('no suena durante las horas de silencio', () => {
    expect(decideDelivery('feeding', new Date('2026-03-01T03:00:00'), base)).toEqual({
      deliver: false,
      reason: 'quiet_hours',
    });
  });
});
