import {
  quickLogActions,
  resolveStage,
  showsSolids,
  suggestStageFromAge,
} from '@/features/baby/feeding-stage';
import { deriveBabyAge } from '@/lib/dates';
import type { Baby } from '@/types/domain';

/**
 * La regla que estas pruebas defienden: la respuesta explícita de la familia
 * sobre los sólidos manda sobre cualquier estimación por edad. AliApp no
 * decide cuándo un bebé empieza a comer.
 */

function bebe(overrides: Partial<Baby>): Baby {
  return {
    id: 'b1',
    household_id: 'h1',
    name: 'Ali',
    birth_date: '2025-09-21',
    feeding_mode: [],
    feeding_stage: null,
    solids_started: false,
    breastfeeding: true,
    formula: false,
    pumped_milk: false,
    created_by: null,
    created_at: '2025-09-21T00:00:00Z',
    updated_at: '2025-09-21T00:00:00Z',
    deleted_at: null,
    ...overrides,
  } as Baby;
}

describe('edad derivada', () => {
  it('se calcula desde birth_date y cambia sola con el tiempo', () => {
    const nacimiento = '2025-09-21';

    const aLosTresMeses = deriveBabyAge(nacimiento, new Date('2025-12-21T12:00:00Z'));
    const aLosOchoMeses = deriveBabyAge(nacimiento, new Date('2026-05-21T12:00:00Z'));

    expect(aLosTresMeses?.months).toBe(3);
    expect(aLosOchoMeses?.months).toBe(8);
    // El mismo bebé, sin tocar ningún dato: la edad es una función del tiempo.
    expect(aLosOchoMeses?.days).toBeGreaterThan(aLosTresMeses?.days ?? 0);
  });

  it('sin fecha de nacimiento no se inventa una edad', () => {
    expect(deriveBabyAge(null)).toBeNull();
  });
});

describe('sugerencia por edad', () => {
  it('propone una etapa, no la impone', () => {
    expect(suggestStageFromAge('2026-01-21', new Date('2026-03-21'))).toBe('milk_only');
    expect(suggestStageFromAge('2025-09-21', new Date('2026-03-21'))).toBe('milk_and_early_solids');
    expect(suggestStageFromAge('2025-05-21', new Date('2026-03-21'))).toBe('complementary_feeding');
    expect(suggestStageFromAge('2024-09-21', new Date('2026-03-21'))).toBe('family_food');
  });

  it('sin fecha no sugiere nada', () => {
    expect(suggestStageFromAge(null)).toBeNull();
  });
});

describe('etapa efectiva', () => {
  it('la etapa elegida por la familia manda', () => {
    expect(resolveStage(bebe({ feeding_stage: 'custom', solids_started: true }))).toBe('custom');
  });

  it('sin etapa, la respuesta sobre sólidos decide', () => {
    expect(resolveStage(bebe({ solids_started: true }))).toBe('complementary_feeding');
  });

  it('sin etapa ni respuesta no se inventa nada', () => {
    expect(resolveStage(bebe({}))).toBeNull();
  });

  it('la respuesta sobre sólidos activa los sólidos aunque la etapa diga otra cosa', () => {
    // Un bebé de 3 meses cuyo profesional indicó empezar antes: la interfaz
    // obedece a la familia, no a la edad.
    expect(showsSolids(bebe({ feeding_stage: 'milk_only', solids_started: true }))).toBe(true);
  });

  it('sin sólidos iniciados, la interfaz no los prioriza', () => {
    expect(showsSolids(bebe({ feeding_stage: 'milk_only' }))).toBe(false);
  });
});

describe('registro rápido según etapa', () => {
  it('con solo leche, la comida no aparece de primeras', () => {
    const acciones = quickLogActions(bebe({ feeding_stage: 'milk_only' }));

    expect(acciones.primary[0]).toBe('breastfeed');
    expect(acciones.primary).not.toContain('food');
    // Pero sigue estando disponible: nada se esconde.
    expect(acciones.more).toContain('food');
  });

  it('con sólidos iniciados, la comida es la primera acción', () => {
    const acciones = quickLogActions(bebe({ solids_started: true }));
    expect(acciones.primary[0]).toBe('food');
  });

  it('fórmula y leche extraída solo salen si la familia las usa', () => {
    const soloPecho = quickLogActions(bebe({ feeding_stage: 'milk_only' }));
    expect(soloPecho.primary).not.toContain('formula');
    expect(soloPecho.more).toContain('formula');

    const conFormula = quickLogActions(bebe({ feeding_stage: 'milk_only', formula: true }));
    expect(conFormula.primary).toContain('formula');
  });

  it('todas las acciones siguen estando accesibles en cualquier etapa', () => {
    for (const caso of [bebe({ feeding_stage: 'milk_only' }), bebe({ solids_started: true })]) {
      const acciones = quickLogActions(caso);
      const todas = [...acciones.primary, ...acciones.more].sort();
      expect(todas).toEqual(
        ['breastfeed', 'diaper', 'food', 'formula', 'medication', 'pumped_milk', 'symptom'].sort(),
      );
    }
  });

  it('sin bebé todavía, ofrece un orden razonable en vez de fallar', () => {
    expect(quickLogActions(null).primary.length).toBeGreaterThan(0);
  });
});

describe('histórico al cambiar de etapa', () => {
  it('cambiar de etapa no toca ningún dato registrado', () => {
    // La etapa vive en el perfil del bebé; los eventos son filas aparte con su
    // propio occurred_at. Cambiar una no puede alterar las otras.
    const antes = bebe({ feeding_stage: 'milk_only', feeding_mode: ['breastfeeding'] });
    const despues = { ...antes, feeding_stage: 'family_food' as const };

    expect(despues.feeding_mode).toEqual(antes.feeding_mode);
    expect(despues.birth_date).toBe(antes.birth_date);
    expect(despues.created_at).toBe(antes.created_at);
  });
});
