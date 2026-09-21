import {
  babyFoodEntrySchema,
  createJourneySchema,
  setFoodStatusSchema,
  symptomSchema,
} from '@/lib/validation';

const BABY_ID = '11111111-1111-4111-8111-111111111111';
const FOOD_ID = '22222222-2222-4222-8222-222222222222';
const HOUSEHOLD_ID = '33333333-3333-4333-8333-333333333333';

describe('validación de eventos', () => {
  it('un síntoma no admite ningún campo de alimento sospechoso', () => {
    const parsed = symptomSchema.parse({
      babyId: BABY_ID,
      symptomType: 'skin_rash',
      startedAt: '2026-03-01T10:00:00.000Z',
      severity: 2,
    });

    expect(parsed).not.toHaveProperty('foodId');
    expect(Object.keys(parsed)).toEqual(
      expect.not.arrayContaining(['foodId', 'suspectedFood', 'cause']),
    );
  });

  it('acepta registros en diferido', () => {
    expect(() =>
      symptomSchema.parse({
        babyId: BABY_ID,
        symptomType: 'vomiting',
        startedAt: '2024-01-01T10:00:00.000Z',
      }),
    ).not.toThrow();
  });

  it('rechaza un evento en el futuro', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    expect(() =>
      symptomSchema.parse({ babyId: BABY_ID, symptomType: 'vomiting', startedAt: future }),
    ).toThrow();
  });

  it('una comida necesita al menos un alimento', () => {
    expect(() =>
      babyFoodEntrySchema.parse({
        babyId: BABY_ID,
        occurredAt: '2026-03-01T10:00:00.000Z',
        items: [],
      }),
    ).toThrow();
  });
});

describe('estado de alimento', () => {
  it('el sistema no puede figurar como origen de un estado', () => {
    expect(() =>
      setFoodStatusSchema.parse({
        babyId: BABY_ID,
        foodId: FOOD_ID,
        status: 'avoid',
        statusSource: 'system_summary',
      }),
    ).toThrow();
  });

  it('una persona sí puede marcar "evitar"', () => {
    const parsed = setFoodStatusSchema.parse({
      babyId: BABY_ID,
      foodId: FOOD_ID,
      status: 'avoid',
      statusSource: 'family',
    });
    expect(parsed.status).toBe('avoid');
  });
});

describe('procesos', () => {
  it('un proceso de exclusión necesita al menos un alimento objetivo', () => {
    expect(() =>
      createJourneySchema.parse({
        householdId: HOUSEHOLD_ID,
        babyId: BABY_ID,
        journeyType: 'exclusion',
        startedOn: '2026-03-01',
        indicatedBy: 'pediatrician',
        targets: [],
      }),
    ).toThrow();
  });

  it('registra a quién afecta la exclusión y quién la indicó', () => {
    const parsed = createJourneySchema.parse({
      householdId: HOUSEHOLD_ID,
      babyId: BABY_ID,
      journeyType: 'exclusion',
      startedOn: '2026-03-01',
      reviewOn: '2026-04-01',
      indicatedBy: 'allergist',
      professionalName: 'Dra. Ruiz',
      targets: [
        { foodId: FOOD_ID, targetSubject: 'baby', action: 'avoid' },
        { foodId: FOOD_ID, targetSubject: 'caregiver', action: 'avoid' },
      ],
    });

    expect(parsed.targets).toHaveLength(2);
    expect(parsed.indicatedBy).toBe('allergist');
    expect(parsed.reviewOn).toBe('2026-04-01');
  });
});
