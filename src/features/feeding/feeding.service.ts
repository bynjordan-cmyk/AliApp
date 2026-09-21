import { newId } from '@/lib/ids';
import { getSupabaseClient, type AliappClient } from '@/lib/supabase';
import type {
  BabyFoodEntryInput,
  BreastfeedInput,
  CaregiverFoodEntryInput,
} from '@/lib/validation';
import type { Breastfeed, FoodEntry } from '@/types/domain';
import { unwrap } from '@/services/errors';
import { recordExposures, type ExposureDraft } from '@/services/exposures.service';
import { buildSoftDeletePatch } from '@/services/soft-delete';

/**
 * Comidas y lactancia.
 *
 * Al registrar una comida se crean además los nodos de exposición
 * correspondientes: son hechos derivados del mismo evento, no una copia de los
 * datos (§11).
 */

export async function createBabyFoodEntry(
  input: BabyFoodEntryInput,
  context: { householdId: string; createdBy: string },
  client: AliappClient = getSupabaseClient(),
): Promise<FoodEntry> {
  const entryId = newId();

  const [entry] = unwrap(
    'createBabyFoodEntry',
    await client
      .from('food_entries')
      .insert({
        id: entryId,
        household_id: context.householdId,
        subject_type: 'baby',
        baby_id: input.babyId,
        occurred_at: input.occurredAt,
        meal_type: input.mealType ?? null,
        notes: input.notes ?? null,
        created_by: context.createdBy,
      })
      .select('*'),
  );

  if (!entry) throw new Error('[AliApp] createBabyFoodEntry: sin fila devuelta');

  unwrap(
    'createBabyFoodEntry.items',
    await client
      .from('food_entry_items')
      .insert(
        input.items.map((item) => ({
          id: newId(),
          food_entry_id: entryId,
          food_id: item.foodId,
          amount_text: item.amountText ?? null,
          is_first_exposure: item.isFirstExposure,
        })),
      )
      .select('id'),
  );

  const exposures: ExposureDraft[] = input.items.map((item) => ({
    householdId: context.householdId,
    babyId: input.babyId,
    sourceType: 'baby_food',
    sourceId: entryId,
    foodId: item.foodId,
    occurredAt: input.occurredAt,
  }));

  await recordExposures(exposures, client);

  return entry;
}

/**
 * Comida de la madre o de un cuidador.
 *
 * Solo se registra una exposición del bebé si quien registra indica
 * explícitamente a qué bebé se refiere (lactancia en curso). AliApp no deduce
 * por su cuenta que una comida materna llegó al bebé.
 */
export async function createCaregiverFoodEntry(
  input: CaregiverFoodEntryInput,
  context: { householdId: string; createdBy: string },
  client: AliappClient = getSupabaseClient(),
): Promise<FoodEntry> {
  const entryId = newId();

  const [entry] = unwrap(
    'createCaregiverFoodEntry',
    await client
      .from('food_entries')
      .insert({
        id: entryId,
        household_id: context.householdId,
        subject_type: 'caregiver',
        caregiver_profile_id: input.caregiverProfileId,
        occurred_at: input.occurredAt,
        meal_type: input.mealType ?? null,
        notes: input.notes ?? null,
        created_by: context.createdBy,
      })
      .select('*'),
  );

  if (!entry) throw new Error('[AliApp] createCaregiverFoodEntry: sin fila devuelta');

  unwrap(
    'createCaregiverFoodEntry.items',
    await client
      .from('food_entry_items')
      .insert(
        input.items.map((item) => ({
          id: newId(),
          food_entry_id: entryId,
          food_id: item.foodId,
          amount_text: item.amountText ?? null,
          is_first_exposure: item.isFirstExposure,
        })),
      )
      .select('id'),
  );

  if (input.babyId) {
    await recordExposures(
      input.items.map((item) => ({
        householdId: context.householdId,
        babyId: input.babyId as string,
        sourceType: 'maternal_food' as const,
        sourceId: entryId,
        foodId: item.foodId,
        occurredAt: input.occurredAt,
      })),
      client,
    );
  }

  return entry;
}

export async function createBreastfeed(
  input: BreastfeedInput,
  context: { householdId: string; createdBy: string },
  client: AliappClient = getSupabaseClient(),
): Promise<Breastfeed> {
  const id = newId();

  const [row] = unwrap(
    'createBreastfeed',
    await client
      .from('breastfeeds')
      .insert({
        id,
        household_id: context.householdId,
        baby_id: input.babyId,
        feeding_parent_profile_id: input.feedingParentProfileId ?? null,
        started_at: input.startedAt,
        ended_at: input.endedAt ?? null,
        side: input.side ?? null,
        notes: input.notes ?? null,
        created_by: context.createdBy,
      })
      .select('*'),
  );

  if (!row) throw new Error('[AliApp] createBreastfeed: sin fila devuelta');

  // La toma en sí es una exposición (sin alimento concreto asociado).
  await recordExposures(
    [
      {
        householdId: context.householdId,
        babyId: input.babyId,
        sourceType: 'breastfeed',
        sourceId: id,
        foodId: null,
        occurredAt: input.startedAt,
      },
    ],
    client,
  );

  return row;
}

export async function listFoodEntries(
  babyId: string,
  client: AliappClient = getSupabaseClient(),
): Promise<FoodEntry[]> {
  return unwrap(
    'listFoodEntries',
    await client
      .from('food_entries')
      .select('*, food_entry_items(*)')
      .eq('baby_id', babyId)
      .is('deleted_at', null)
      .order('occurred_at', { ascending: false }),
  );
}

export async function listBreastfeeds(
  babyId: string,
  client: AliappClient = getSupabaseClient(),
): Promise<Breastfeed[]> {
  return unwrap(
    'listBreastfeeds',
    await client
      .from('breastfeeds')
      .select('*')
      .eq('baby_id', babyId)
      .is('deleted_at', null)
      .order('started_at', { ascending: false }),
  );
}

export async function softDeleteFoodEntry(
  id: string,
  client: AliappClient = getSupabaseClient(),
): Promise<void> {
  const { error } = await client.from('food_entries').update(buildSoftDeletePatch()).eq('id', id);
  if (error) throw new Error(`[AliApp] softDeleteFoodEntry: ${error.message}`);
}

export async function softDeleteBreastfeed(
  id: string,
  client: AliappClient = getSupabaseClient(),
): Promise<void> {
  const { error } = await client.from('breastfeeds').update(buildSoftDeletePatch()).eq('id', id);
  if (error) throw new Error(`[AliApp] softDeleteBreastfeed: ${error.message}`);
}
