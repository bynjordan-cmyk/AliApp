import { boardSummary, foodsToAvoid, groupBoardByStatus } from '@/features/food/allergen-board';
import type { AllergenBoardRow } from '@/types/domain';

function row(overrides: Partial<AllergenBoardRow>): AllergenBoardRow {
  return {
    baby_id: 'baby',
    household_id: 'household',
    food_id: 'food',
    canonical_key: 'apple',
    canonical_name: 'Apple',
    category: 'fruit',
    is_major_allergen: false,
    allergen_code: null,
    status: 'unknown',
    exposure_count: 0,
    first_exposure_at: null,
    last_exposure_at: null,
    status_updated_at: null,
    status_updated_by: null,
    status_source: 'family',
    ...overrides,
  } as AllergenBoardRow;
}

describe('panel de alimentos', () => {
  const rows = [
    row({ canonical_key: 'hen_egg', status: 'observing', exposure_count: 3 }),
    row({ canonical_key: 'cow_milk', status: 'avoid', exposure_count: 5 }),
    row({ canonical_key: 'rice', status: 'tolerated', exposure_count: 12 }),
    row({ canonical_key: 'peanut', status: 'unknown' }),
    row({ canonical_key: 'wheat', status: 'professional_supervision' }),
  ];

  it('agrupa por estado actual', () => {
    const groups = groupBoardByStatus(rows);
    const byStatus = Object.fromEntries(groups.map((group) => [group.status, group.items.length]));

    expect(byStatus).toMatchObject({
      unknown: 1,
      observing: 1,
      tolerated: 1,
      avoid: 1,
      professional_supervision: 1,
      introducing: 0,
    });
  });

  it('destaca lo que no se debe ofrecer, que es lo que un cuidador necesita ver', () => {
    const avoid = foodsToAvoid(rows).map((item) => item.canonical_key);
    expect(avoid).toEqual(['cow_milk', 'wheat']);
  });

  it('resume recuentos sin puntuaciones ni rachas', () => {
    const summary = boardSummary(rows);
    expect(summary.avoid).toBe(1);
    expect(summary.tolerated).toBe(1);
    expect(Object.values(summary).reduce((total, value) => total + value, 0)).toBe(rows.length);
  });
});
