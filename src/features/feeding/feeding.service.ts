import { newId } from '@/lib/ids';
import { getSupabaseClient, type AliappClient } from '@/lib/supabase';
import type { TablesUpdate } from '@/lib/supabase/database.types';
import {
  toColumnPatch,
  type BabyFoodEntryInput,
  type BreastfeedInput,
  type BreastfeedPatch,
  type CaregiverFoodEntryInput,
  type FoodEntryPatch,
} from '@/lib/validation';
import type {
  Breastfeed,
  ExposureSourceType,
  FeedKind,
  FoodEntry,
  FoodEntryItem,
} from '@/types/domain';
import { unwrap } from '@/services/errors';
import {
  clearExposuresForSource,
  moveExposuresForSource,
  recordExposures,
  type ExposureDraft,
} from '@/services/exposures.service';
import { buildSoftDeletePatch } from '@/services/soft-delete';

/**
 * Vía de exposición según cómo llegó la leche. Es una descripción del camino,
 * no una valoración: AliApp no prefiere una vía sobre otra.
 */
const EXPOSURE_SOURCE_BY_FEED_KIND = {
  breast: 'breastfeed',
  formula: 'formula',
  pumped_milk: 'pumped_milk',
} as const satisfies Record<FeedKind, ExposureSourceType>;

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
        feed_kind: input.feedKind,
        side: input.side ?? null,
        amount_ml: input.amountMl ?? null,
        brand: input.brand?.trim() ? input.brand.trim() : null,
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
        sourceType: EXPOSURE_SOURCE_BY_FEED_KIND[input.feedKind],
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

/**
 * Corrige una comida ya registrada.
 *
 * Solo viajan los campos que alguien tocó. Si se cambia la hora, las
 * exposiciones derivadas se mueven con ella: el grafo y la línea de tiempo
 * deben contar lo mismo.
 */
export async function updateFoodEntry(
  id: string,
  patch: FoodEntryPatch,
  client: AliappClient = getSupabaseClient(),
): Promise<FoodEntry> {
  const row = toColumnPatch<FoodEntryPatch, TablesUpdate<'food_entries'>>(patch, {
    occurredAt: 'occurred_at',
    mealType: 'meal_type',
    notes: 'notes',
  });

  const [entry] = unwrap(
    'updateFoodEntry',
    await client.from('food_entries').update(row).eq('id', id).select('*'),
  );

  if (!entry) throw new Error('[AliApp] updateFoodEntry: sin fila devuelta');

  // Rehacer la lista de alimentos: se sustituye entera, con sus exposiciones.
  if (patch.items) {
    unwrap(
      'updateFoodEntry.clearItems',
      await client.from('food_entry_items').delete().eq('food_entry_id', id).select('id'),
    );

    unwrap(
      'updateFoodEntry.items',
      await client
        .from('food_entry_items')
        .insert(
          patch.items.map((item) => ({
            id: newId(),
            food_entry_id: id,
            food_id: item.foodId,
            amount_text: item.amountText ?? null,
            is_first_exposure: item.isFirstExposure,
          })),
        )
        .select('id'),
    );

    await clearExposuresForSource(id, client);

    if (entry.baby_id) {
      await recordExposures(
        patch.items.map((item) => ({
          householdId: entry.household_id,
          babyId: entry.baby_id as string,
          sourceType: entry.subject_type === 'baby' ? 'baby_food' : 'maternal_food',
          sourceId: id,
          foodId: item.foodId,
          occurredAt: entry.occurred_at,
        })),
        client,
      );
    }
  } else if (patch.occurredAt) {
    await moveExposuresForSource(id, entry.occurred_at, client);
  }

  return entry;
}

/**
 * Corrige una toma de leche.
 *
 * Aquí es donde se completa lo que no se pudo registrar en su momento: la hora
 * de fin de una toma que se cerró a ojo, la cantidad del biberón o la marca.
 */
export async function updateBreastfeed(
  id: string,
  patch: BreastfeedPatch,
  client: AliappClient = getSupabaseClient(),
): Promise<Breastfeed> {
  const row = toColumnPatch<BreastfeedPatch, TablesUpdate<'breastfeeds'>>(patch, {
    startedAt: 'started_at',
    endedAt: 'ended_at',
    feedKind: 'feed_kind',
    side: 'side',
    amountMl: 'amount_ml',
    brand: 'brand',
    notes: 'notes',
  });

  // Cambiar a fórmula o leche extraída deja sin sentido el lado del pecho.
  if (patch.feedKind && patch.feedKind !== 'breast') {
    row.side = null;
  }

  const [entry] = unwrap(
    'updateBreastfeed',
    await client.from('breastfeeds').update(row).eq('id', id).select('*'),
  );

  if (!entry) throw new Error('[AliApp] updateBreastfeed: sin fila devuelta');

  if (patch.startedAt) {
    await moveExposuresForSource(id, entry.started_at, client);
  }

  return entry;
}

/** Cierra una toma que se abrió con un toque. El fin por defecto es ahora. */
export async function endBreastfeed(
  id: string,
  endedAt: string = new Date().toISOString(),
  client: AliappClient = getSupabaseClient(),
): Promise<Breastfeed> {
  return updateBreastfeed(id, { endedAt }, client);
}

/**
 * Toma abierta: empezada y sin cerrar.
 *
 * Se limita a las últimas horas porque una toma "abierta" de anteayer es casi
 * siempre un olvido, no una toma en curso. Se puede completar después desde su
 * detalle.
 */
export async function findOpenBreastfeed(
  babyId: string,
  withinHours = 6,
  client: AliappClient = getSupabaseClient(),
): Promise<Breastfeed | null> {
  const desde = new Date(Date.now() - withinHours * 60 * 60 * 1000).toISOString();

  const rows = unwrap(
    'findOpenBreastfeed',
    await client
      .from('breastfeeds')
      .select('*')
      .eq('baby_id', babyId)
      .is('ended_at', null)
      .is('deleted_at', null)
      .gte('started_at', desde)
      .order('started_at', { ascending: false })
      .limit(1),
  );

  return rows[0] ?? null;
}

export async function getFoodEntry(
  id: string,
  client: AliappClient = getSupabaseClient(),
): Promise<{ entry: FoodEntry; items: FoodEntryItem[] }> {
  const [entry] = unwrap(
    'getFoodEntry',
    await client.from('food_entries').select('*').eq('id', id),
  );

  if (!entry) throw new Error('[AliApp] getFoodEntry: no encontrado');

  const items = unwrap(
    'getFoodEntry.items',
    await client
      .from('food_entry_items')
      .select('*')
      .eq('food_entry_id', id)
      .order('created_at', { ascending: true }),
  );

  return { entry, items };
}

export async function getBreastfeed(
  id: string,
  client: AliappClient = getSupabaseClient(),
): Promise<Breastfeed> {
  const [row] = unwrap('getBreastfeed', await client.from('breastfeeds').select('*').eq('id', id));
  if (!row) throw new Error('[AliApp] getBreastfeed: no encontrado');
  return row;
}
