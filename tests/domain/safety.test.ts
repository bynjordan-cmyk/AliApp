import { findSafetyViolations, isSafeStatement } from '@/lib/safety';
import { describeExposureCount, medianIntervalMinutes } from '@/features/reports/descriptions';

/**
 * Límites de seguridad del producto (§10). Esta prueba existe para que la regla
 * no dependa de que alguien recuerde aplicarla al escribir una pantalla.
 */

describe('frases que AliApp SÍ puede decir', () => {
  const allowed = [
    'Se registraron síntomas después de 4 de 6 exposiciones registradas.',
    'Intervalo mediano entre estos eventos: 3 h 10 min.',
    'Este patrón se ha repetido en el periodo seleccionado.',
    'Todavía hay pocos datos registrados.',
  ];

  it.each(allowed)('acepta: %s', (statement) => {
    expect(isSafeStatement(statement)).toBe(true);
  });
});

describe('frases que AliApp NUNCA debe decir', () => {
  const forbidden: [string, string][] = [
    ['La leche causó esta reacción.', 'atribución de causalidad'],
    ['Tu bebé tiene alergia a la proteína de leche de vaca.', 'diagnóstico'],
    ['Retira el huevo de la dieta.', 'indicación de tratamiento'],
    ['Dale 5 mg cada 8 horas.', 'indicación de dosis'],
    ['Este alimento es seguro.', 'declaración de seguridad'],
    ['Reintroduce este alimento mañana.', 'indicación clínica'],
    ['Riesgo de alergia: 72 %', 'puntuación de riesgo'],
  ];

  it.each(forbidden)('rechaza "%s" por %s', (statement, reason) => {
    const violations = findSafetyViolations(statement);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations.map((violation) => violation.reason)).toContain(reason);
  });
});

describe('textos descriptivos generados por la capa de informes', () => {
  it('describe recuentos sin atribuir causa', () => {
    const statement = describeExposureCount(6, 4);
    expect(statement).toBe('Se registraron síntomas después de 4 de 6 exposiciones registradas.');
    expect(isSafeStatement(statement)).toBe(true);
  });

  it('calcula la mediana de intervalos', () => {
    expect(medianIntervalMinutes([])).toBeNull();
    expect(medianIntervalMinutes([190])).toBe(190);
    expect(medianIntervalMinutes([60, 180, 240])).toBe(180);
    expect(medianIntervalMinutes([60, 120, 180, 240])).toBe(150);
  });
});
