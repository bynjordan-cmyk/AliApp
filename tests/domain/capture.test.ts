import { parseEntry, ruleBasedInterpreter } from '@/features/capture/parse-entry';

/**
 * Ali Capture estructura lo que dicta una persona. Estas pruebas defienden que
 * proponga, nunca que decida: ni guarda sola, ni inventa lo que no reconoce.
 */

const VOCABULARIO = [
  { foodId: 'f-arroz', canonicalKey: 'rice', terms: ['arroz', 'rice'] },
  { foodId: 'f-pollo', canonicalKey: 'chicken', terms: ['pollo', 'chicken'] },
  { foodId: 'f-manzana', canonicalKey: 'apple', terms: ['manzana', 'apple'] },
  { foodId: 'f-leche', canonicalKey: 'cow_milk', terms: ['leche de vaca', 'leche'] },
];

const AHORA = new Date('2026-03-01T20:00:00');

function analizar(frase: string) {
  return parseEntry(frase, { vocabulary: VOCABULARIO, babyNames: ['Alicia'], now: AHORA });
}

describe('interpretación de una frase de registro', () => {
  it('reconoce bebé, hora y alimentos del ejemplo del encargo', () => {
    const resultado = analizar('Alicia comió arroz pollo y manzana a la 1:15');

    expect(resultado.babyNameGuess).toBe('Alicia');
    expect(resultado.foods.map((f) => f.canonicalKey).sort()).toEqual([
      'apple',
      'chicken',
      'rice',
    ]);
    expect(resultado.timeText).toContain('1:15');
    expect(new Date(resultado.occurredAt as string).getHours()).toBe(1);
  });

  it('siempre exige confirmación', () => {
    expect(analizar('arroz').requiresConfirmation).toBe(true);
    expect(analizar('').requiresConfirmation).toBe(true);
  });

  it('sin hora en la frase no se inventa ninguna', () => {
    const resultado = analizar('Alicia comió manzana');
    expect(resultado.occurredAt).toBeNull();
    expect(resultado.timeText).toBeNull();
  });

  it('devuelve lo que no reconoce en lugar de descartarlo en silencio', () => {
    const resultado = analizar('Alicia comió quinoa y arroz');
    expect(resultado.foods.map((f) => f.canonicalKey)).toEqual(['rice']);
    expect(resultado.unmatchedTerms).toContain('quinoa');
  });

  it('no confunde un alimento con otro que lo contiene', () => {
    const resultado = analizar('tomó leche a las 9');
    expect(resultado.foods).toHaveLength(1);
    expect(resultado.foods[0]?.canonicalKey).toBe('cow_milk');
  });

  it('una hora futura se entiende como del día anterior, no del futuro', () => {
    // Son las 20:00 y la frase dice "a las 22:30".
    const resultado = analizar('arroz a las 22:30');
    const fecha = new Date(resultado.occurredAt as string);
    expect(fecha.getDate()).toBe(28);
    expect(fecha.getHours()).toBe(22);
  });

  it('nunca deduce síntomas ni causas', () => {
    const resultado = analizar('Alicia comió manzana y le salió una erupción');
    expect(JSON.stringify(resultado)).not.toMatch(/symptom|caus|alerg/i);
    expect(resultado.foods.map((f) => f.canonicalKey)).toEqual(['apple']);
  });
});

describe('interfaz de interpretación', () => {
  it('el analizador de reglas cumple el contrato', async () => {
    const resultado = await ruleBasedInterpreter.interpret('arroz a la 1:15', {
      vocabulary: VOCABULARIO,
      babyNames: [],
      now: AHORA,
    });

    expect(ruleBasedInterpreter.name).toBe('rules');
    expect(resultado.requiresConfirmation).toBe(true);
    expect(resultado.foods).toHaveLength(1);
  });
});
