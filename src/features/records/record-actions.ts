import type { TimelineItemType } from '@/types/timeline';
import {
  createBabyFoodEntry,
  createBreastfeed,
  softDeleteBreastfeed,
  softDeleteFoodEntry,
} from '@/features/feeding/feeding.service';
import { createDiaperEvent, softDeleteDiaperEvent } from '@/features/diapers/diaper.service';
import { createSymptom, softDeleteSymptom } from '@/features/symptoms/symptom.service';
import {
  createMedicationEvent,
  softDeleteMedicationEvent,
} from '@/features/medication/medication.service';
import { softDeleteEpisode } from '@/features/reactions/reaction.service';

import type { RecordDetail } from './useRecord';

/**
 * Acciones sobre un registro ya guardado.
 *
 * Duplicar existe porque la vida se repite: la misma papilla, el mismo
 * biberón, tres veces al día. Rehacer el formulario entero para eso es tiempo
 * que nadie tiene.
 *
 * Eliminar es SIEMPRE borrado lógico: un historial de salud no se destruye,
 * deja de mostrarse (§9).
 */

export type ActionContext = { householdId: string; createdBy: string };

/**
 * Crea un registro igual con la hora actual.
 *
 * La copia nace limpia: no arrastra `edited_at` ni el historial del original,
 * porque es un evento nuevo que ocurrió ahora.
 */
export async function duplicateRecord(
  detail: RecordDetail,
  context: ActionContext,
  occurredAt: string = new Date().toISOString(),
): Promise<void> {
  switch (detail.type) {
    case 'food_entry': {
      if (!detail.row.baby_id) {
        throw new Error('[AliApp] duplicateRecord: una comida de cuidador no se duplica aquí');
      }
      await createBabyFoodEntry(
        {
          babyId: detail.row.baby_id,
          occurredAt,
          mealType: detail.row.meal_type ?? undefined,
          notes: detail.row.notes ?? undefined,
          items: detail.items.map((item) => ({
            foodId: item.food_id,
            amountText: item.amount_text ?? undefined,
            // Una repetición nunca es una primera exposición.
            isFirstExposure: false,
          })),
        },
        context,
      );
      return;
    }

    case 'breastfeed': {
      await createBreastfeed(
        {
          babyId: detail.row.baby_id,
          startedAt: occurredAt,
          feedKind: detail.row.feed_kind,
          side: detail.row.side ?? undefined,
          amountMl: detail.row.amount_ml ?? undefined,
          brand: detail.row.brand ?? undefined,
          notes: detail.row.notes ?? undefined,
        },
        context,
      );
      return;
    }

    case 'diaper_event': {
      await createDiaperEvent(
        {
          babyId: detail.row.baby_id,
          occurredAt,
          diaperType: detail.row.diaper_type,
          stoolConsistency: detail.row.stool_consistency ?? undefined,
          stoolColor: detail.row.stool_color ?? undefined,
          stoolAmount: detail.row.stool_amount ?? undefined,
          mucus: detail.row.mucus ?? undefined,
          bloodObserved: detail.row.blood_observed ?? undefined,
          visibleFoodResidue: detail.row.visible_food_residue ?? undefined,
          straining: detail.row.straining ?? undefined,
          unusualOdor: detail.row.unusual_odor ?? undefined,
          notes: detail.row.notes ?? undefined,
        },
        context,
      );
      return;
    }

    case 'symptom': {
      await createSymptom(
        {
          babyId: detail.row.baby_id,
          symptomType: detail.row.symptom_type,
          startedAt: occurredAt,
          severity: (detail.row.severity as 1 | 2 | 3 | null) ?? undefined,
          notes: detail.row.notes ?? undefined,
        },
        context,
      );
      return;
    }

    case 'medication_event': {
      await createMedicationEvent(
        {
          babyId: detail.row.baby_id,
          name: detail.row.name,
          doseText: detail.row.dose_text ?? undefined,
          occurredAt,
          reasonText: detail.row.reason_text ?? undefined,
          notes: detail.row.notes ?? undefined,
        },
        context,
      );
      return;
    }

    case 'reaction_episode':
      // Un episodio agrupa síntomas concretos: duplicarlo no significa nada.
      throw new Error('[AliApp] duplicateRecord: un episodio no se duplica');

    default:
      throw new Error('[AliApp] duplicateRecord: tipo desconocido');
  }
}

/** ¿Tiene sentido duplicar este tipo? */
export function canDuplicate(type: TimelineItemType): boolean {
  return type !== 'reaction_episode';
}

/** Borrado lógico. El registro deja de aparecer, pero sigue en el historial. */
export async function softDeleteRecord(type: TimelineItemType, id: string): Promise<void> {
  switch (type) {
    case 'food_entry':
      return softDeleteFoodEntry(id);
    case 'breastfeed':
      return softDeleteBreastfeed(id);
    case 'diaper_event':
      return softDeleteDiaperEvent(id);
    case 'symptom':
      return softDeleteSymptom(id);
    case 'reaction_episode':
      return softDeleteEpisode(id);
    case 'medication_event':
      return softDeleteMedicationEvent(id);
    default:
      throw new Error('[AliApp] softDeleteRecord: tipo desconocido');
  }
}

/** Tipos que admiten fotos, según el enum `media_entity_type` de la base. */
const CON_FOTOS = ['symptom', 'reaction_episode', 'diaper_event', 'food_entry'] as const;

export function supportsPhotos(
  type: TimelineItemType,
): type is (typeof CON_FOTOS)[number] {
  return (CON_FOTOS as readonly string[]).includes(type);
}
