import { getSupabaseClient, type AliappClient } from '@/lib/supabase';
import type { SupportedLocale } from '@/lib/i18n';
import type { AllergenBoardRow, Food, LocalizedFood } from '@/types/domain';
import type { SetFoodStatusInput } from '@/lib/validation';
import { unwrap } from '@/services/errors';

/**
 * Catálogo de alimentos y panel de estados.
 *
 * El nombre visible se resuelve por idioma sin tocar los ids canónicos (§20).
 */

type FoodWithTranslations = Food & {
  food_translations: { locale: string; display_name: string }[] | null;
};

export function resolveFoodName(
  food: FoodWithTranslations,
  locale: SupportedLocale,
): string {
  const translations = food.food_translations ?? [];
  const exact = translations.find((row) => row.locale === locale);
  if (exact) return exact.display_name;

  const spanish = translations.find((row) => row.locale === 'es');
  return spanish?.display_name ?? food.canonical_name;
}

export async function listFoods(
  locale: SupportedLocale,
  client: AliappClient = getSupabaseClient(),
): Promise<LocalizedFood[]> {
  const rows = unwrap(
    'listFoods',
    await client
      .from('foods')
      .select('*, food_translations(locale, display_name)')
      .order('canonical_key', { ascending: true }),
  ) as unknown as FoodWithTranslations[];

  return rows.map((row) => ({
    ...row,
    displayName: resolveFoodName(row, locale),
  }));
}

/**
 * Panel de alimentos (§13): hechos por alimento, agrupables por estado.
 * Sin rachas ni puntuaciones.
 */
export async function getAllergenBoard(
  babyId: string,
  client: AliappClient = getSupabaseClient(),
): Promise<AllergenBoardRow[]> {
  return unwrap(
    'getAllergenBoard',
    await client
      .from('allergen_board')
      .select('*')
      .eq('baby_id', babyId)
      .order('canonical_key', { ascending: true }),
  );
}

/**
 * Fija el estado de un alimento. Siempre lo hace una persona: el esquema de
 * validación no admite 'system_summary' y la base lo bloquea con un trigger.
 */
export async function setFoodStatus(
  input: SetFoodStatusInput,
  updatedBy: string,
  client: AliappClient = getSupabaseClient(),
): Promise<void> {
  const { error } = await client.from('baby_food_status').upsert(
    {
      baby_id: input.babyId,
      food_id: input.foodId,
      status: input.status,
      status_source: input.statusSource,
      status_updated_by: updatedBy,
      status_updated_at: new Date().toISOString(),
    },
    { onConflict: 'baby_id,food_id' },
  );

  if (error) throw new Error(`[AliApp] setFoodStatus: ${error.message}`);
}
